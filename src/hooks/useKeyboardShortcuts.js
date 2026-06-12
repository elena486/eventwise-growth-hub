import { useEffect, useState, useCallback, useRef } from 'react';

/**
 * Centralized keyboard shortcut handler.
 * @param {Object} opts
 * @param {boolean} opts.searchOpen - whether global search is open
 * @param {Function} opts.onToggleSearch - toggle (open/close) global search
 * @param {boolean} opts.notificationPanelOpen - whether notification panel is open
 * @param {Function} opts.onCloseNotificationPanel - close notification panel
 * @param {boolean} opts.fullPanelOpen - whether client full panel is open
 * @param {Function} opts.onCloseFullPanel - close client full panel
 * @param {boolean} opts.detailClientOpen - whether client detail panel is open
 * @param {Function} opts.onCloseDetailClient - close client detail panel
 * @returns {{ shortcutsModalOpen: boolean, setShortcutsModalOpen: Function }}
 */
export default function useKeyboardShortcuts({
  searchOpen,
  onToggleSearch,
  notificationPanelOpen,
  onCloseNotificationPanel,
  fullPanelOpen,
  onCloseFullPanel,
  detailClientOpen,
  onCloseDetailClient,
}) {
  const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);

  // Use refs to avoid stale closures
  const refs = useRef({
    searchOpen,
    notificationPanelOpen,
    fullPanelOpen,
    detailClientOpen,
    shortcutsModalOpen,
  });

  // Keep refs in sync
  useEffect(() => { refs.current.searchOpen = searchOpen; }, [searchOpen]);
  useEffect(() => { refs.current.notificationPanelOpen = notificationPanelOpen; }, [notificationPanelOpen]);
  useEffect(() => { refs.current.fullPanelOpen = fullPanelOpen; }, [fullPanelOpen]);
  useEffect(() => { refs.current.detailClientOpen = detailClientOpen; }, [detailClientOpen]);
  useEffect(() => { refs.current.shortcutsModalOpen = shortcutsModalOpen; }, [shortcutsModalOpen]);

  const isTyping = useCallback(() => {
    const el = document.activeElement;
    if (!el) return false;
    const tag = el.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea' || tag === 'select') return true;
    if (el.isContentEditable) return true;
    return false;
  }, []);

  useEffect(() => {
    const handler = (e) => {
      const r = refs.current;
      const metaKey = e.metaKey || e.ctrlKey;

      // ── Cmd+K / Ctrl+K — Toggle search ──
      if (metaKey && e.key === 'k') {
        e.preventDefault();
        if (!isTyping()) onToggleSearch();
        return;
      }

      // ── Cmd+/ / Ctrl+/ — Show shortcuts modal ──
      if (metaKey && e.key === '/') {
        e.preventDefault();
        if (!isTyping()) setShortcutsModalOpen(prev => !prev);
        return;
      }

      // ── Cmd+N / Ctrl+N — Context-aware new entry ──
      if (metaKey && e.key === 'n') {
        e.preventDefault();
        if (!isTyping()) {
          window.dispatchEvent(new CustomEvent('ew-new-entry'));
        }
        return;
      }

      // ── Escape — Close panels/modals in priority order ──
      if (e.key === 'Escape') {
        // Always allow Escape, even when typing in a field
        // 1. Shortcuts modal
        if (r.shortcutsModalOpen) {
          e.preventDefault();
          setShortcutsModalOpen(false);
          return;
        }

        // 2. Search overlay
        if (r.searchOpen) {
          e.preventDefault();
          onToggleSearch();
          return;
        }

        // 3. Notification panel
        if (r.notificationPanelOpen) {
          e.preventDefault();
          onCloseNotificationPanel();
          return;
        }

        // 4. Full panel (modal)
        if (r.fullPanelOpen) {
          e.preventDefault();
          onCloseFullPanel();
          return;
        }

        // 5. Detail client (side panel in AppShell)
        if (r.detailClientOpen) {
          e.preventDefault();
          onCloseDetailClient();
          return;
        }

        // 6. Dispatch to child components
        window.dispatchEvent(new CustomEvent('ew-escape'));
      }
    };

    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onToggleSearch, onCloseNotificationPanel, onCloseFullPanel, onCloseDetailClient, isTyping]);

  return { shortcutsModalOpen, setShortcutsModalOpen };
}