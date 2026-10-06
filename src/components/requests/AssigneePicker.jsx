import React, { useState, useRef, useEffect } from 'react';
import { Check, X, ChevronDown } from 'lucide-react';

/**
 * Multi-select assignee picker.
 * value: array of names (ordered — first is the primary assignee).
 * onChange: called with the new array of names.
 * options: full list of selectable names.
 */
export default function AssigneePicker({ value = [], onChange, options, placeholder = 'Select people…', inputCls }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const btnRef = useRef(null);
  const panelRef = useRef(null);

  const selected = (Array.isArray(value) ? value : []).filter(Boolean);

  const handleOpen = () => {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
    }
    setOpen(o => !o);
  };

  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target) && btnRef.current && !btnRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const toggle = (name) => {
    if (selected.includes(name)) {
      onChange(selected.filter(n => n !== name));
    } else {
      onChange([...selected, name]);
    }
  };

  const removeAt = (idx, e) => {
    e.stopPropagation();
    onChange(selected.filter((_, i) => i !== idx));
  };

  const baseCls = inputCls || 'w-full px-3 h-10 border border-[#EBEBF5] bg-white rounded-lg text-sm text-[#242450] flex items-center gap-1.5 cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] transition-colors';

  return (
    <div className="relative w-full">
      <div ref={btnRef} onClick={handleOpen} className={baseCls + ' min-h-[40px] flex-wrap py-1.5'}>
        {selected.length === 0 ? (
          <span className="text-[#9CA3AF] text-sm">{placeholder}</span>
        ) : (
          selected.map((name, idx) => (
            <span key={name} className="inline-flex items-center gap-1 bg-[#F3E8FF] text-[#8403C5] text-xs font-semibold px-2 py-0.5 rounded-full shrink-0">
              {idx === 0 && <span className="text-[8px] font-bold uppercase tracking-wide opacity-60">Lead</span>}
              {name}
              <button type="button" onClick={(e) => removeAt(idx, e)} className="hover:text-[#6B02A0]">
                <X className="w-3 h-3" />
              </button>
            </span>
          ))
        )}
        <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] ml-auto shrink-0" />
      </div>

      {open && (
        <div
          ref={panelRef}
          className="fixed z-[60] bg-white border border-[#EBEBF5] rounded-lg shadow-xl py-1 max-h-56 overflow-y-auto"
          style={{ top: pos.top, left: pos.left, width: Math.max(pos.width, 220) }}
        >
          {options.map(opt => {
            const isSelected = selected.includes(opt);
            const isFirst = selected[0] === opt;
            return (
              <button
                type="button"
                key={opt}
                onClick={() => toggle(opt)}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-[#242450] hover:bg-[#F6F6FB] transition-colors text-left"
              >
                <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${isSelected ? 'bg-[#8403C5] border-[#8403C5]' : 'border-[#D8D8EE]'}`}>
                  {isSelected && <Check className="w-3 h-3 text-white" />}
                </span>
                <span className="flex-1">{opt}</span>
                {isFirst && <span className="text-[9px] font-bold uppercase tracking-wide text-[#8403C5] bg-[#F3E8FF] px-1.5 py-0.5 rounded-full">Lead</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}