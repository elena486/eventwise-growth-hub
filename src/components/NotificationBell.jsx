import React, { useState, useRef, useEffect } from 'react';
import { Bell } from 'lucide-react';
import NotificationPanel from './NotificationPanel';

export default function NotificationBell({ unreadCount, entries, onOpenPanel, onMarkAllRead, onViewAll }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleToggle = () => {
    const willOpen = !open;
    setOpen(willOpen);
    if (willOpen && onOpenPanel) onOpenPanel();
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={handleToggle}
        className="relative p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-[#242450]" />
        )}
      </button>
      {open && (
        <NotificationPanel
          entries={entries}
          onClose={() => setOpen(false)}
          onMarkAllRead={() => { onMarkAllRead(); setOpen(false); }}
          onViewAll={() => { onViewAll(); setOpen(false); }}
        />
      )}
    </div>
  );
}