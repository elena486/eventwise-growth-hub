import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Trash2 } from 'lucide-react';

const ToastContext = createContext(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const undoRefs = useRef({});

  const dismiss = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (undoRefs.current[id]) {
      clearTimeout(undoRefs.current[id].timer);
      delete undoRefs.current[id];
    }
  }, []);

  const addToast = useCallback((toast) => {
    const id = Date.now() + Math.random();
    setToasts(prev => {
      const next = [...prev, { ...toast, id, removing: false }];
      return next.slice(-3); // max 3
    });
    return id;
  }, []);

  const toast = {
    saved: () => {
      const id = addToast({ type: 'saved', message: 'Saved' });
      setTimeout(() => dismiss(id), 3000);
    },
    sent: (msg = 'Sent') => {
      const id = addToast({ type: 'saved', message: msg });
      setTimeout(() => dismiss(id), 3000);
    },
    submitted: (msg = 'Request submitted') => {
      const id = addToast({ type: 'saved', message: msg });
      setTimeout(() => dismiss(id), 3000);
    },
    statusUpdated: (msg = 'Status updated') => {
      const id = addToast({ type: 'saved', message: msg });
      setTimeout(() => dismiss(id), 2000);
    },
    deleted: (msg = 'Deleted', onUndo) => {
      const id = addToast({ type: 'deleted', message: msg, onUndo: onUndo || null });
      const timer = setTimeout(() => {
        dismiss(id);
        // onUndo not called = deletion is permanent (already happened)
      }, 8000);
      if (onUndo) undoRefs.current[id] = { timer, onUndo };
      return id;
    },
    error: (msg = 'Something went wrong — please try again') => {
      addToast({ type: 'error', message: msg, persistent: true });
    },
  };

  const handleUndo = (id) => {
    const ref = undoRefs.current[id];
    if (ref) {
      clearTimeout(ref.timer);
      ref.onUndo?.();
      delete undoRefs.current[id];
    }
    dismiss(id);
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast container */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col items-center gap-2 pointer-events-none">
        {toasts.map(t => (
          <div
            key={t.id}
            className="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl text-sm font-medium min-w-[260px] max-w-sm animate-toast-in"
            style={{
              background: t.type === 'error' ? '#B91C1C' : t.type === 'deleted' ? '#1F2937' : '#15803D',
              color: '#fff',
            }}
          >
            {t.type === 'saved' && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {t.type === 'deleted' && <Trash2 className="w-4 h-4 shrink-0" />}
            {t.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">{t.type === 'saved' ? '✓ ' : ''}{t.message}</span>
            {t.type === 'deleted' && t.onUndo && (
              <button
                onClick={() => handleUndo(t.id)}
                className="text-xs font-bold underline opacity-90 hover:opacity-100 whitespace-nowrap"
              >
                Undo
              </button>
            )}
            {(t.type === 'error' || t.type === 'deleted') && (
              <button onClick={() => dismiss(t.id)} className="opacity-70 hover:opacity-100 ml-1">
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}