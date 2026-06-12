import React from 'react';
import { X } from 'lucide-react';

const SHORTCUTS = [
  { key: '⌘K', action: 'Open search' },
  { key: '⌘N', action: 'New entry (context-aware)' },
  { key: 'Esc', action: 'Close panel / modal' },
  { key: '⌘/', action: 'Show keyboard shortcuts' },
];

export default function KeyboardShortcutsModal({ open, onClose }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBEB]">
          <h3 className="text-sm font-bold text-[#111827]">Keyboard shortcuts</h3>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-[#111827] hover:bg-[#F3F4F6] rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 space-y-3">
          {SHORTCUTS.map(s => (
            <div key={s.action} className="flex items-center justify-between">
              <span className="text-sm text-[#374151]">{s.action}</span>
              <kbd className="inline-flex items-center px-2 py-0.5 text-[11px] font-semibold text-[#6B7280] bg-[#F3F4F6] border border-[#D1D5DB] rounded-md font-mono">
                {s.key}
              </kbd>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 bg-[#F9FAFB] border-t border-[#EBEBEB] text-[11px] text-[#9CA3AF]">
          Tip: Press <kbd className="inline-flex items-center px-1 py-0.5 text-[10px] font-semibold bg-[#E5E7EB] rounded font-mono">Esc</kbd> to dismiss
        </div>
      </div>
    </div>
  );
}