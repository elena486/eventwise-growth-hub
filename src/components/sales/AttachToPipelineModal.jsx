import React, { useState, useEffect, useMemo } from 'react';
import { X, ChevronDown, Search } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AttachToPipelineModal({ record, onClose, onAttached }) {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState('');
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Lead.list('-created_date', 500)
      .then(data => setLeads(data))
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    if (!query.trim()) return leads;
    const q = query.toLowerCase();
    return leads.filter(l =>
      (l.companyName || '').toLowerCase().includes(q) ||
      (l.contactName || '').toLowerCase().includes(q) ||
      (l.firstName || '').toLowerCase().includes(q) ||
      (l.lastName || '').toLowerCase().includes(q)
    );
  }, [leads, query]);

  const displayName = (lead) =>
    lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '—';

  const contactName = (lead) => {
    if (lead.contactName) return lead.contactName;
    const fn = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    return fn || null;
  };

  const handleSelect = (lead) => {
    setSelected(lead);
    setDropdownOpen(false);
    setQuery('');
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.entities.DemoFormResponse.update(record.id, {
        status: 'Attached',
        attachedToId: selected.id,
        attachedToName: displayName(selected),
      });
      onAttached(record.id, selected.id, displayName(selected));
    } catch {}
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBF5]">
          <h3 className="text-base font-bold text-[#242450]">Attach to Pipeline Item</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] transition-colors">
            <X className="w-4 h-4 text-[#9CA3AF]" />
          </button>
        </div>

        <div className="px-5 py-5">
          {confirming && selected ? (
            /* Confirmation step */
            <div>
              <p className="text-sm text-[#5777AB] mb-3">
                Attach <span className="font-semibold text-[#242450]">{record.name}</span> to:
              </p>
              <div className="bg-[#F6F6FB] rounded-lg px-4 py-3 mb-5">
                <p className="text-sm font-bold text-[#242450]">{displayName(selected)}</p>
                {contactName(selected) && (
                  <p className="text-xs text-[#5777AB] mt-0.5">{contactName(selected)}</p>
                )}
                {selected.stage && (
                  <span className="inline-block mt-1.5 text-[10px] font-semibold bg-[#EBEBF5] text-[#242450] px-1.5 py-0.5 rounded">
                    {selected.stage}
                  </span>
                )}
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setConfirming(false)}
                  className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">
                  Back
                </button>
                <button
                  onClick={handleConfirm}
                  disabled={saving}
                  className="px-4 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] text-white rounded-lg transition-colors">
                  {saving ? 'Saving…' : 'Confirm'}
                </button>
              </div>
            </div>
          ) : (
            /* Dropdown select step */
            <div>
              <p className="text-sm text-[#5777AB] mb-3">
                Select a pipeline record to link to <span className="font-semibold text-[#242450]">{record.name}</span>:
              </p>

              {/* Custom searchable dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(o => !o)}
                  className="w-full flex items-center justify-between px-3 py-2.5 text-sm border border-[#EBEBF5] rounded-lg bg-white hover:border-[#D8D8EE] focus:outline-none focus:border-[#8403C5] transition-colors text-left">
                  <span className={selected ? 'text-[#242450] font-medium' : 'text-[#9CA3AF]'}>
                    {selected ? displayName(selected) : 'Select a pipeline record…'}
                  </span>
                  <ChevronDown className={`w-4 h-4 text-[#9CA3AF] shrink-0 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {dropdownOpen && (
                  <>
                    <div className="fixed inset-0 z-10" onClick={() => { setDropdownOpen(false); setQuery(''); }} />
                    <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-xl z-20 overflow-hidden">
                      {/* Search within dropdown */}
                      <div className="px-3 py-2 border-b border-[#F2F2F4]">
                        <div className="relative">
                          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
                          <input
                            autoFocus
                            type="text"
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            placeholder="Filter records…"
                            className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#EBEBF5] rounded-md focus:outline-none focus:border-[#8403C5] transition-colors"
                          />
                        </div>
                      </div>

                      {/* Options list */}
                      <div className="max-h-60 overflow-y-auto">
                        {filtered.length === 0 ? (
                          <p className="text-center text-xs text-[#9CA3AF] py-6">No records found</p>
                        ) : (
                          filtered.map(lead => (
                            <button
                              key={lead.id}
                              onClick={() => handleSelect(lead)}
                              className="w-full flex items-start gap-3 px-4 py-2.5 hover:bg-[#F6F6FB] transition-colors text-left border-b border-[#F2F2F4] last:border-0">
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-semibold text-[#242450] truncate">{displayName(lead)}</p>
                                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                  {contactName(lead) && (
                                    <span className="text-xs text-[#5777AB]">{contactName(lead)}</span>
                                  )}
                                  {lead.stage && (
                                    <span className="text-[10px] font-semibold bg-[#EBEBF5] text-[#242450] px-1.5 py-0.5 rounded">{lead.stage}</span>
                                  )}
                                </div>
                              </div>
                            </button>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}