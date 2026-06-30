/**
 * LeadSelect — searchable dropdown for Sales pipeline companies.
 * Loads leads once (cached at module level) and filters by search input.
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';

let _cache = null;
let _loading = false;
const _listeners = [];

function getLeads() {
  if (_cache) return Promise.resolve(_cache);
  if (_loading) return new Promise(res => _listeners.push(res));
  _loading = true;
  return base44.entities.Lead.list('-created_date', 500)
    .then(leads => {
      _cache = leads;
      _listeners.forEach(fn => fn(leads));
      _listeners.length = 0;
      return leads;
    })
    .catch(() => { _loading = false; return []; });
}

export default function LeadSelect({ value, onChange, className }) {
  const [leads, setLeads] = useState([]);
  const [search, setSearch] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => { getLeads().then(setLeads); }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (!containerRef.current?.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const selected = value ? leads.find(l => l.id === value) : null;

  const filtered = leads.filter(l =>
    !search || l.companyName?.toLowerCase().includes(search.toLowerCase())
  ).slice(0, 30);

  const handleSelect = (lead) => {
    onChange(lead ? lead.id : '', lead ? lead.companyName : '');
    setSearch('');
    setOpen(false);
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`${className} text-left flex items-center justify-between`}
      >
        {selected ? (
          <span className="truncate">{selected.companyName}</span>
        ) : (
          <span className="text-[#9CA3AF]">None</span>
        )}
        <span className="ml-1 text-[#9CA3AF] shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-[200] top-full mt-1 left-0 right-0 bg-white border border-[#EBEBF5] rounded-lg shadow-lg overflow-hidden">
          <div className="p-1.5 border-b border-[#EBEBF5]">
            <input
              autoFocus
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search prospects…"
              className="w-full px-2 py-1 text-xs border border-[#EBEBF5] rounded focus:outline-none focus:border-[#8403C5]"
              onClick={e => e.stopPropagation()}
            />
          </div>
          <div className="max-h-[180px] overflow-y-auto">
            <button
              type="button"
              onClick={() => handleSelect(null)}
              className="w-full text-left px-3 py-1.5 text-xs text-[#9CA3AF] hover:bg-[#F6F6FB]"
            >
              None
            </button>
            {filtered.map(l => (
              <button
                key={l.id}
                type="button"
                onClick={() => handleSelect(l)}
                className={`w-full text-left px-3 py-1.5 text-xs hover:bg-[#F6F6FB] truncate ${l.id === value ? 'font-semibold text-[#8403C5] bg-[#F3E8FF]' : 'text-[#242450]'}`}
              >
                {l.companyName}
              </button>
            ))}
            {filtered.length === 0 && <p className="px-3 py-2 text-xs text-[#9CA3AF]">No matches</p>}
          </div>
        </div>
      )}
    </div>
  );
}