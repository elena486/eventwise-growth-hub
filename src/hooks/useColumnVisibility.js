import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';

/**
 * Per-user, per-view column visibility with cross-device persistence.
 *
 * - localStorage (keyed by viewKey + userId) gives instant per-browser recall.
 * - The user's `columnPreferences` field on their record syncs across devices.
 * - localStorage wins when present on this device (most recent local change);
 *   the DB value is only applied when localStorage has no entry for this view
 *   (first visit on a new device), so unsynced local changes are never clobbered.
 *
 * @param {Object}   opts
 * @param {string}   opts.viewKey        stable id for this list view (e.g. "clients")
 * @param {Array}    opts.columns       [{ key, label, locked }]
 * @param {string[]} opts.defaultVisible keys shown by default
 */
export function useColumnVisibility({ viewKey, columns, defaultVisible }) {
  const lockedKeys = columns.filter(c => c.locked).map(c => c.key);
  const validKeys = new Set(columns.map(c => c.key));

  const buildDefault = useCallback(() => {
    return [...new Set([...lockedKeys, ...defaultVisible.filter(k => validKeys.has(k))])];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lockedKeys.join(','), defaultVisible.join(','), columns.length]);

  const [userId, setUserId] = useState(null);
  const [userResolved, setUserResolved] = useState(false);
  const [visible, setVisible] = useState(() => buildDefault());
  const [loaded, setLoaded] = useState(false);

  // Resolve current user id (async) — localStorage key is namespaced per user.
  useEffect(() => {
    let cancelled = false;
    base44.auth.me()
      .then(me => { if (!cancelled) setUserId(me?.id || 'anon'); })
      .catch(() => { if (!cancelled) setUserId('anon'); })
      .finally(() => { if (!cancelled) setUserResolved(true); });
    return () => { cancelled = true; };
  }, []);

  const storageKey = `colvis_${viewKey}_${userId}`;

  // Load preferences once the user is known.
  useEffect(() => {
    if (!userResolved) return;
    let cancelled = false;
    (async () => {
      // 1. localStorage (per-browser)
      try {
        const stored = localStorage.getItem(storageKey);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed)) {
            const valid = parsed.filter(k => validKeys.has(k));
            setVisible([...new Set([...lockedKeys, ...valid])]);
            setLoaded(true);
            return;
          }
        }
      } catch {}
      // 2. DB (cross-device) — only when no local preference exists
      try {
        const me = await base44.auth.me();
        if (cancelled) return;
        if (me?.columnPreferences) {
          const allPrefs = JSON.parse(me.columnPreferences);
          const viewPrefs = allPrefs[viewKey];
          if (Array.isArray(viewPrefs) && viewPrefs.length) {
            const valid = viewPrefs.filter(k => validKeys.has(k));
            const merged = [...new Set([...lockedKeys, ...valid])];
            setVisible(merged);
            localStorage.setItem(storageKey, JSON.stringify(merged));
          }
        }
      } catch {}
      setLoaded(true);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userResolved, viewKey, storageKey]);

  // Persist changes (debounced) to localStorage (instant) + DB (cross-device).
  useEffect(() => {
    if (!loaded) return;
    localStorage.setItem(storageKey, JSON.stringify(visible));
    const t = setTimeout(async () => {
      try {
        const me = await base44.auth.me();
        if (!me) return;
        const existing = me.columnPreferences ? JSON.parse(me.columnPreferences) : {};
        existing[viewKey] = visible;
        await base44.auth.updateMe({ columnPreferences: JSON.stringify(existing) });
      } catch {}
    }, 700);
    return () => clearTimeout(t);
  }, [visible, loaded, viewKey, storageKey]);

  const toggle = useCallback((key) => {
    setVisible(prev => (prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]));
  }, []);

  const reset = useCallback(() => setVisible(buildDefault()), [buildDefault]);

  const isVisible = useCallback((key) => visible.includes(key), [visible]);

  return { visible, isVisible, toggle, reset, loaded };
}