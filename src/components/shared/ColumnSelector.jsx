import React, { useState, useRef, useEffect } from 'react';
import { Columns3, RotateCcw } from 'lucide-react';

/**
 * Dropdown column-visibility selector.
 * @param columns      [{ key, label, locked }]
 * @param visible      array of visible keys
 * @param onToggle(key)
 * @param onReset()
 */
export default function ColumnSelector({ columns, visible, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-lg border border-[#EBEBF5] bg-white text-[#5777AB] hover:bg-[#F6F6FB] hover:border-[#D8D8EE] transition-colors">
        <Columns3 className="w-3.5 h-3.5" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-xl shadow-lg z-50 w-60 py-2 animate-modal-in">
          <p className="px-3 pb-1.5 text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Show / hide columns</p>
          <div className="px-1.5 max-h-72 overflow-y-auto">
            {columns.map(col => {
              const isOn = visible.includes(col.key);
              const locked = !!col.locked;
              return (
                <button
                  key={col.key}
                  type="button"
                  disabled={locked}
                  onClick={() => !locked && onToggle(col.key)}
                  className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg hover:bg-[#F6F6FB] disabled:opacity-70 disabled:cursor-not-allowed transition-colors text-left">
                  <span className="flex items-center gap-1.5 text-xs font-medium text-[#242450]">
                    {col.label}
                    {locked && <span className="text-[9px] font-bold text-[#9CA3AF] uppercase tracking-wide">locked</span>}
                  </span>
                  <span className={`relative inline-flex w-8 h-4 rounded-full transition-colors shrink-0 ${isOn ? 'bg-[#8403C5]' : 'bg-[#D8D8EE]'}`}>
                    <span className={`absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full shadow-sm transition-transform ${isOn ? 'translate-x-4' : 'translate-x-0'}`} />
                  </span>
                </button>
              );
            })}
          </div>
          <div className="border-t border-[#EBEBF5] mt-1.5 pt-1.5 px-3">
            <button
              type="button"
              onClick={() => { onReset(); }}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#5777AB] hover:text-[#8403C5] transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}