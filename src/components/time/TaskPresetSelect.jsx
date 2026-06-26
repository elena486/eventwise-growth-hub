import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown } from 'lucide-react';
import { TASK_PRESETS } from './taskPresets';
import { base44 } from '@/api/base44Client';

// Cache DB presets in module scope so all instances share one fetch
let _dbCache = null;
let _dbFetchPromise = null;

async function loadDbPresets() {
  if (_dbCache) return _dbCache;
  if (_dbFetchPromise) return _dbFetchPromise;
  _dbFetchPromise = base44.entities.TaskTemplate.list().then(rows => {
    const map = {};
    rows.forEach(r => {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push(r.taskName);
    });
    _dbCache = map;
    return map;
  }).catch(() => ({}));
  return _dbFetchPromise;
}

// Allow other components to bust the cache after admin edits
export function bustTaskPresetCache() {
  _dbCache = null;
  _dbFetchPromise = null;
}

export default function TaskPresetSelect({ category, value, onChange, placeholder, className = '' }) {
  const [open, setOpen] = useState(false);
  const [dbPresets, setDbPresets] = useState(null); // null = loading, {} = loaded
  const ref = useRef(null);

  // Load DB templates once
  useEffect(() => {
    loadDbPresets().then(map => setDbPresets(map));
  }, []);

  // Merge: DB rows take precedence if they exist for this category, else fall back to static
  const presets = useMemo(() => {
    if (!category) return [];
    if (dbPresets === null) return TASK_PRESETS[category] || [];
    const dbList = dbPresets[category];
    if (dbList && dbList.length > 0) return dbList;
    return TASK_PRESETS[category] || [];
  }, [category, dbPresets]);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleSelect = (opt) => {
    onChange(opt);
    setOpen(false);
  };

  if (!category) {
    return (
      <button type="button" className={`flex items-center justify-between text-left ${className}`} disabled>
        <span className="text-[#9CA3AF]">Select a category first</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] ml-2 shrink-0" />
      </button>
    );
  }

  if (presets.length === 0) {
    return (
      <button type="button" className={`flex items-center justify-between text-left ${className}`} disabled>
        <span className="text-[#9CA3AF]">No tasks for this category</span>
        <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF] ml-2 shrink-0" />
      </button>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`flex items-center justify-between text-left ${className}`}
      >
        <span className={value ? 'text-[#242450]' : 'text-[#9CA3AF]'}>{value || placeholder || 'Select a task…'}</span>
        <ChevronDown className={`w-3.5 h-3.5 text-[#9CA3AF] transition-transform shrink-0 ml-2 ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-[100] max-h-56 overflow-y-auto">
          {presets.map((opt, i) => (
            <button
              key={i}
              type="button"
              onClick={() => handleSelect(opt)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-[#F6F6FB] transition-colors ${value === opt ? 'bg-[#F3E8FF] text-[#8403C5] font-medium' : 'text-[#242450]'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}