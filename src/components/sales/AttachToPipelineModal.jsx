import React, { useState, useEffect, useMemo } from 'react';
import { Search, X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function AttachToPipelineModal({ record, onClose, onAttached }) {
  const [leads, setLeads] = useState([]);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(null);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.Lead.list('-created_date', 500)
      .then(data => setLeads(data))
      .catch(() => {});
  }, []);

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return leads.filter(l =>
      (l.companyName || '').toLowerCase().includes(q) ||
      (l.contactName || '').toLowerCase().includes(q) ||
      (l.firstName || '').toLowerCase().includes(q) ||
      (l.lastName || '').toLowerCase().includes(q)
    ).slice(0, 20);
  }, [leads, query]);

  const handleSelect = (lead) => {
    setSelected(lead);
    setConfirming(true);
  };

  const handleConfirm = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.entities.DemoFormResponse.update(record.id, {
        status: 'Attached',
        attachedToId: selected.id,
        attachedToName: selected.companyName || `${selected.firstName || ''} ${selected.lastName || ''}`.trim(),
      });
      onAttached(
        record.id,
        selected.id,
        selected.companyName || `${selected.firstName || ''} ${selected.lastName || ''}`.trim()
      );
    } catch {}
    setSaving(false);
  };

  const displayName = (lead) =>
    lead.companyName || `${lead.firstName || ''} ${lead.lastName || ''}`.trim() || '—';

  const contactName = (lead) => {
    if (lead.contactName) return lead.contactName;
    const fn = `${lead.firstName || ''} ${lead.lastName || ''}`.trim();
    return fn || '—';
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

        {confirming && selected ? (
          /* Confirmation step */
          <div className="px-5 py-6">
            <p className="text-sm text-[#242450] mb-1">Attach this response to:</p>
            <div className="bg-[#F6F6FB] rounded-lg px-4 py-3 mb-5">
              <p className="text-sm font-bold text-[#242450]">{displayName(selected)}</p>
              <p className="text-xs text-[#5777AB] mt-0.5">{contactName(selected)} · {selected.stage || 'Unknown stage'}</p>
            </div>
            <p className="text-sm text-[#5777AB] mb-5">
              Attach <span className="font-semibold text-[#242450]">{record.name}</span> to <span className="font-semibold text-[#242450]">{displayName(selected)}</span>?
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirming(false)}
                className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">
                Cancel
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
          /* Search step */
          <div>
            <div className="px-5 py-3 border-b border-[#EBEBF5]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
                <input
                  autoFocus
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  placeholder="Search pipeline..."
                  className="w-full pl-9 pr-3 py-2 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/20 transition-colors"
                />
              </div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {query.trim() === '' ? (
                <p className="text-center text-xs text-[#9CA3AF] py-8">Start typing to search pipeline records</p>
              ) : results.length === 0 ? (
                <p className="text-center text-xs text-[#9CA3AF] py-8">No matching pipeline records found</p>
              ) : (
                results.map(lead => (
                  <button
                    key={lead.id}
                    onClick={() => handleSelect(lead)}
                    className="w-full flex items-start gap-3 px-5 py-3 border-b border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors text-left last:border-0">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-[#242450] truncate">{displayName(lead)}</p>
                      <p className="text-xs text-[#5777AB] mt-0.5">{contactName(lead)}</p>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {lead.stage && (
                          <span className="text-[10px] font-semibold bg-[#EBEBF5] text-[#242450] px-1.5 py-0.5 rounded">{lead.stage}</span>
                        )}
                        {lead.dealValueMonthly && (
                          <span className="text-[10px] text-[#5777AB]">£{lead.dealValueMonthly}/mo</span>
                        )}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}