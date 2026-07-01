import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Bell, CheckCheck, Clock, ListTodo, Activity, Zap, AtSign, CalendarCheck } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { markNotificationRead, markAllNotificationsRead } from '@/lib/notifications';
import { formatDistanceToNow } from 'date-fns';

const TYPE_CONFIG = {
  task_assigned:      { icon: ListTodo,  color: '#8403C5', bg: '#F3E8FF', label: 'Task assigned' },
  task_status_changed:{ icon: Activity,  color: '#5777AB', bg: '#EEF2F8', label: 'Task updated' },
  task_completed:     { icon: CheckCheck,color: '#1D9E75', bg: '#E8F7F2', label: 'Task completed' },
  sprint_submitted:   { icon: Zap,       color: '#E8A020', bg: '#FFFBEB', label: 'Sprint update' },
  sprint_overdue:     { icon: Clock,     color: '#DC2626', bg: '#FEF2F2', label: 'Sprint overdue' },
  time_logged_cs:     { icon: Clock,        color: '#5777AB', bg: '#EEF2F8', label: 'Time logged' },
  mention:            { icon: AtSign,       color: '#8403C5', bg: '#F3E8FF', label: 'Mention' },
  leave_approved:     { icon: CalendarCheck,color: '#1D9E75', bg: '#E8F7F2', label: 'Leave approved' },
  leave_declined:     { icon: CalendarCheck,color: '#DC2626', bg: '#FEF2F2', label: 'Leave declined' },
  leave_requested:    { icon: CalendarCheck,color: '#A16207', bg: '#FFFBEB', label: 'Leave request' },
  leave_today:        { icon: CalendarCheck,color: '#5777AB', bg: '#EEF2F8', label: 'Out today' },
  leave_reminder:     { icon: CalendarCheck,color: '#8403C5', bg: '#F3E8FF', label: 'Leave reminder' },
};

function timeAgo(isoStr) {
  if (!isoStr) return '';
  try {
    return formatDistanceToNow(new Date(isoStr), { addSuffix: true });
  } catch { return ''; }
}

export default function NotificationBell({ currentUserName, onNavigate }) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const ref = useRef(null);

  const load = useCallback(async () => {
    if (!currentUserName) return;
    try {
      const data = await base44.entities.Notification.filter(
        { recipientName: currentUserName },
        '-created_date',
        50
      );
      setNotifications(data);
    } catch {}
  }, [currentUserName]);

  // Load on mount + subscribe to real-time updates
  useEffect(() => {
    load();
    const unsub = base44.entities.Notification.subscribe((event) => {
      if (event.type === 'create' && event.data?.recipientName === currentUserName) {
        setNotifications(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data?.recipientName === currentUserName) {
        setNotifications(prev => prev.map(n => n.id === event.id ? event.data : n));
      } else if (event.type === 'delete') {
        setNotifications(prev => prev.filter(n => n.id !== event.id));
      }
    });
    return unsub;
  }, [currentUserName, load]);

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead(currentUserName);
    setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
  };

  const handleClickNotification = async (notif) => {
    if (!notif.isRead) {
      await markNotificationRead(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, isRead: true } : n));
    }
    if (notif.navigateTo && onNavigate) {
      onNavigate(notif.navigateTo, notif.recordId);
    }
    setOpen(false);
  };

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(o => !o)}
        className="relative p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
        title="Notifications"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] bg-red-500 rounded-full border-2 border-[#0F0F1A] flex items-center justify-center text-[9px] font-bold text-white px-0.5">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-[380px] bg-white rounded-xl shadow-2xl border border-[#EBEBF5] overflow-hidden z-50">
          {/* Header */}
          <div className="px-4 py-3 border-b border-[#EBEBF5] flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827]">Notifications</h3>
              {unreadCount > 0 && (
                <p className="text-xs text-[#9CA3AF] mt-0.5">{unreadCount} unread</p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline font-medium shrink-0 ml-3"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-2">
                <Bell className="w-8 h-8 text-[#D8D8EE]" />
                <p className="text-sm text-[#9CA3AF]">No notifications yet</p>
                <p className="text-xs text-[#9CA3AF]">You'll see activity here when things happen</p>
              </div>
            ) : (
              notifications.map(notif => {
                const cfg = TYPE_CONFIG[notif.type] || TYPE_CONFIG.mention;
                const Icon = cfg.icon;
                return (
                  <button
                    key={notif.id}
                    onClick={() => handleClickNotification(notif)}
                    className={`w-full flex items-start gap-3 px-4 py-3 border-b border-[#EBEBF5] hover:bg-[#F9FAFB] transition-colors text-left ${
                      !notif.isRead ? 'border-l-2 border-l-[#8403C5] bg-[#FAF5FF]' : ''
                    }`}
                  >
                    <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5" style={{ backgroundColor: cfg.bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] text-[#1A1A3A] leading-snug">{notif.message}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">{timeAgo(notif.created_date)}</p>
                    </div>
                    {!notif.isRead && (
                      <div className="w-2 h-2 rounded-full bg-[#8403C5] shrink-0 mt-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}