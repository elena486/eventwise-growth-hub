import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Debounced autosave hook for Wiki page editing.
 *
 * Watches a snapshot of the editor state (richContent, files, title, description).
 * When the snapshot changes, a 2-second debounce timer starts. When it fires,
 * onUpdate is called with the merged page. If onUpdate returns a promise that
 * rejects, status is set to 'error' so the UI can surface it.
 *
 * @param {Object}   params
 * @param {Function} params.getSnapshot - Returns { richContent, files, title, description }
 * @param {Object}   params.page        - Current page object (spread into save payload)
 * @param {Function} params.onUpdate    - (updatedPage) => Promise<void>
 * @param {boolean}  params.enabled     - Whether autosave is active (edit mode)
 * @returns {{ status: 'idle'|'saving'|'saved'|'error', savedAt: Date|null, flushSave: Function }}
 */
export function useWikiAutosave({ getSnapshot, page, onUpdate, enabled }) {
  const [status, setStatus] = useState('idle');
  const [savedAt, setSavedAt] = useState(null);

  const timerRef = useRef(null);
  const lastSavedRef = useRef('');
  const snapshotRef = useRef({ snapshot: {}, snapshotStr: '{}' });
  const onUpdateRef = useRef(onUpdate);
  const pageRef = useRef(page);

  // Keep refs current without triggering re-renders
  onUpdateRef.current = onUpdate;
  pageRef.current = page;

  // Compute current snapshot on every render
  const snapshot = getSnapshot();
  const snapshotStr = JSON.stringify(snapshot);
  snapshotRef.current = { snapshot, snapshotStr };

  // Reset baseline when entering edit mode
  useEffect(() => {
    if (enabled) {
      lastSavedRef.current = snapshotRef.current.snapshotStr;
      setStatus('idle');
      setSavedAt(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  // Debounced autosave — fires 2s after the last change
  useEffect(() => {
    if (!enabled) return;
    if (snapshotStr === lastSavedRef.current) return;

    setStatus('saving');
    if (timerRef.current) clearTimeout(timerRef.current);

    timerRef.current = setTimeout(async () => {
      const { snapshot: snap, snapshotStr: snapStr } = snapshotRef.current;
      try {
        await onUpdateRef.current({
          ...pageRef.current,
          ...snap,
          updatedAt: new Date().toISOString().slice(0, 10),
        });
        lastSavedRef.current = snapStr;
        setStatus('saved');
        setSavedAt(new Date());
      } catch (e) {
        console.error('Wiki autosave failed', e);
        setStatus('error');
      }
    }, 2000);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [snapshotStr, enabled]);

  // Immediate save — clears debounce timer, saves now
  const flushSave = useCallback(async () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    const { snapshot: snap, snapshotStr: snapStr } = snapshotRef.current;
    if (snapStr === lastSavedRef.current) return;

    setStatus('saving');
    try {
      await onUpdateRef.current({
        ...pageRef.current,
        ...snap,
        updatedAt: new Date().toISOString().slice(0, 10),
      });
      lastSavedRef.current = snapStr;
      setStatus('saved');
      setSavedAt(new Date());
    } catch (e) {
      console.error('Wiki flushSave failed', e);
      setStatus('error');
      throw e;
    }
  }, []);

  // Best-effort flush on unmount (navigating away while editing)
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      const { snapshot: snap, snapshotStr: snapStr } = snapshotRef.current;
      if (snapStr !== lastSavedRef.current) {
        onUpdateRef.current({
          ...pageRef.current,
          ...snap,
          updatedAt: new Date().toISOString().slice(0, 10),
        }).catch(() => {});
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { status, savedAt, flushSave };
}