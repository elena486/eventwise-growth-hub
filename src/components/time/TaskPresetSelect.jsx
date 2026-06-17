import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { TASK_PRESETS } from './taskPresets';

const OTHER_OPTION = 'Other (type your own)';

export default function TaskPresetSelect({ category, value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState('');
  const [customInput, setCustomInput] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);

  const presets = category && TASK_PRESETS[category] ? TASK_PRESETS[category] : [];

  const options = useMemo(() => {
    const filtered = filter
      ? presets.filter(p => p.toLowerCase().includes(filter.toLowerCase()))
      : presets;
    return [...filtered, OTHER_OPTION];
  }, [presets, filter]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  if (!category || presets.length === 0) {
    return (
      <input
        type="text" value={value} onChange={e => onChange(e.target.value)}
        placeholder={placeholder || 'What are you working on?'}
        className={className}
      />
    );
  }

  const handleSelect = (opt) => {
    if (opt === OTHER_OPTION) {
      setCustomInput(true);
      onChange('');
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setCustomInput(false);
      onChange(opt);
      setFilter('');
    }
    setOpen(false);
  };

  const isSelectedPreset = presets.includes(value);

  return (
    <div className="relative" ref={ref}>
      {customInput || (!isSelectedPreset && value && !presets.includes(value)) ? (
        <input
          ref={inputRef}
          type="text" value={value} onChange={e => onChange(e.target.value)}
          placeholder="Type your task…"
          className={className}
          onBlur={() => { if (!value) setCustomInput(false); }}
        />
      ) : (
        <button
          type="button"
          onClick={() => { setOpen(o => !o); setFilter(''); }}
          className={`flex items-center justify-between text-left ${className}`}
        >
          <span className={value ? 'text-[#242450]' : 'text-[#9CA3AF]'}>{value || placeholder || 'Select a task…'}</span>
          <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
        </button>
      )}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-[100] max-h-56 overflow-hidden flex flex-col">
          <div className="p-2 border-b border-[#EBEBF5]">
            <input
              type="text" value={filter}
              onChange={e => setFilter(e.target.value)}
              placeholder="Filter tasks…"
              className="w-full px-2 py-1.5 text-xs border border-[#EBEBF5] rounded bg-[#F6F6FB]"
              autoFocus
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="overflow-y-auto">
            {options.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(opt)}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F6F6FB] transition-colors ${
                  opt === OTHER_OPTION ? 'text-[#8403C5] font-medium border-t border-[#EBEBF5]' : 'text-[#242450]'
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}