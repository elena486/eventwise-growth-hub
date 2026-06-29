/**
 * MemberDetailModal — shows a team member's breakdown for the selected period (FIX 7)
 */
import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { CATEGORY_COLORS } from './categoryColors';
import EntryDetailModal from './EntryDetailModal';

const BAR_COLORS = {
  'Sales & Outbound': '#3B82F6',
  'Customer Success & Onboarding': '#22C55E',
  'Marketing & Content': '#A855F7',
  'Operations & Admin': '#F97316',
  'Product & Tech': '#14B8A6',
  'Finance': '#EAB308',
  'Strategy & Planning': '#1E3A5F',
  'Other': '#9CA3AF',
};

function fmtHours(min) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h && !m) return '0h';
  if (!m) return `${h}h`;
  if (!h) return `${m}m`;
  return `${h}h ${m}m`;
}

export default function MemberDetailModal({ member, entries, periodLabel, onClose, clients = [] }) {
  const [selectedEntry, setSelectedEntry] = useState(null);
  const [localEntries, setLocalEntries] = useState(entries);

  if (!member) return null;

  const memberEntries = localEntries.filter(e => e.teamMember === member);
  const totalMin = memberEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);

  // Category breakdown
  const catMap = {};
  memberEntries.forEach(e => { catMap[e.category || 'Uncategorised'] = (catMap[e.category || 'Uncategorised'] || 0) + e.durationMinutes; });
  const catBreakdown = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
  const maxCatMin = Math.max(...catBreakdown.map(([, m]) => m), 1);

  const sorted = [...memberEntries].sort((a, b) => b.date?.localeCompare(a.date));

  return (
    <>
      <div className="fixed inset-0 z-[55] flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
        <div className="bg-white rounded-[14px] w-[560px] max-h-[90vh] overflow-y-auto animate-modal-in" onClick={e => e.stopPropagation()}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5]">
            <div>
              <h2 className="text-base font-bold text-[#242450]">{member}</h2>
              <p className="text-xs text-[#5777AB]">{periodLabel}</p>
            </div>
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#EBEBF5] text-[#9CA3AF]"><X className="w-4 h-4" /></button>
          </div>

          <div className="px-6 py-5 space-y-6">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: 'Total hours', value: fmtHours(totalMin) },
                { label: 'Entries', value: memberEntries.length },
                { label: 'Categories', value: catBreakdown.length },
              ].map(s => (
                <div key={s.label} className="bg-[#F6F6FB] rounded-xl px-3 py-2.5">
                  <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.06em]">{s.label}</p>
                  <p className="text-xl font-bold text-[#242450]">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Category breakdown */}
            {catBreakdown.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#242450] mb-3">Time by Category</p>
                <div className="space-y-2">
                  {catBreakdown.map(([cat, min]) => {
                    const color = BAR_COLORS[cat] || '#9CA3AF';
                    const pct = totalMin > 0 ? Math.round((min / totalMin) * 100) : 0;
                    const barPct = (min / maxCatMin) * 100;
                    return (
                      <div key={cat} className="flex items-center gap-3">
                        <span className="text-xs text-[#242450] w-44 shrink-0 truncate">{cat}</span>
                        <div className="flex-1 bg-[#F6F6FB] rounded-full h-5 overflow-hidden">
                          <div className="h-full rounded-full flex items-center px-2 transition-all duration-300" style={{ width: `${Math.max(barPct, 3)}%`, backgroundColor: color }}>
                            <span className="text-[9px] font-bold text-white whitespace-nowrap">{fmtHours(min)}</span>
                          </div>
                        </div>
                        <span className="text-[11px] text-[#9CA3AF] w-8 text-right">{pct}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Entry list */}
            {sorted.length > 0 && (
              <div>
                <p className="text-xs font-bold text-[#242450] mb-3">All Entries</p>
                <div className="space-y-1">
                  {sorted.map(e => {
                    const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
                    let dateStr = '';
                    try { dateStr = format(parseISO(e.date), 'd MMM'); } catch {}
                    return (
                      <button key={e.id} onClick={() => setSelectedEntry(e)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F6F6FB] transition-colors text-left">
                        <span className="text-[10px] text-[#9CA3AF] w-12 shrink-0">{dateStr}</span>
                        <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                        <span className="flex-1 text-xs text-[#242450] truncate">{e.projectTask}</span>
                        {e.clientName && <span className="text-[10px] text-[#5777AB] bg-[#EEF2F8] px-1.5 py-0.5 rounded shrink-0">{e.clientName}</span>}
                        <span className="text-xs font-bold text-[#242450] shrink-0">{fmtHours(e.durationMinutes)}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {sorted.length === 0 && (
              <p className="text-sm text-[#5777AB] text-center py-8">No entries for this period</p>
            )}
          </div>
        </div>
      </div>

      {selectedEntry && (
        <EntryDetailModal
          entry={selectedEntry}
          clients={clients}
          onClose={() => setSelectedEntry(null)}
          onUpdated={(updated) => {
            setLocalEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            setSelectedEntry(null);
          }}
          onDeleted={(id) => {
            setLocalEntries(prev => prev.filter(e => e.id !== id));
            setSelectedEntry(null);
          }}
        />
      )}
    </>
  );
}