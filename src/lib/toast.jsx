import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, Check, Trash2, AlertTriangle, Send } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef({});

  const dismiss = useCallback((id) => {
    clearTimeout(timers.current[id]);
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const show = useCallback((type, message, opts = {}) => {
    const id = Date.now() + Math.random();
    setToasts(prev => {
      const next = [...prev, { id, type, message, ...opts }];
      // Max 3 — drop oldest
      return next.slice(-3);
    });

    const duration = opts.duration;
    if (duration && duration !== Infinity) {
      timers.current[id] = setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const toast = {
    saved: (msg = '✓ Saved') => show('success', msg, { duration: 3000 }),
    sent: (msg = '✓ Sent') => show('success', msg, { duration: 3000 }),
    submitted: (msg = '✓ Request submitted') => show('success', msg, { duration: 3000 }),
    statusUpdated: (msg = '✓ Status updated') => show('success', msg, { duration: 2000 }),
    error: (msg = '⚠ Error — please try again') => show('error', msg, { duration: Infinity }),
    deleted: (msg = '🗑 Deleted', onUndo) => show('deleted', msg, { duration: 8000, onUndo }),
    custom: (type, msg, opts) => show(type, msg, opts),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismiss} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, onDismiss }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
      {toasts.map(t => (
        <ToastItem key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

function ToastItem({ toast, onDismiss }) {
  const { id, type, message, onUndo } = toast;

  const bg = type === 'success' ? '#15803D'
    : type === 'error' ? '#B91C1C'
    : type === 'deleted' ? '#1F2937'
    : '#1F2937';

  return (
    <div
      className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-2xl text-white text-sm font-medium"
      style={{ background: bg, minWidth: 260, maxWidth: 420, animation: 'slideUpFade 0.25s ease-out' }}
    >
      <span className="flex-1">{message}</span>
      {type === 'deleted' && onUndo && (
        <button
          onClick={onUndo}
          className="text-white underline text-xs font-bold hover:no-underline shrink-0"
        >
          Undo
        </button>
      )}
      {type === 'error' && (
        <button onClick={() => onDismiss(id)} className="shrink-0 hover:opacity-70 transition-opacity">
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}