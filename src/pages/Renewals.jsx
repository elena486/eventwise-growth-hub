import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { Plus, X } from 'lucide-react';
import SkeletonTable from '@/components/shared/SkeletonTable';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function getRenewalColor(date) {
  if (!date) return { cls: 'text-[#9CA3AF]', label: '—' };
  const diff = differenceInDays(new Date(date), new Date());
  if (diff < 0) return { cls: 'text-red-600 font-bold', label: `${Math.abs(diff)}d overdue` };
  if (diff <= 30) return { cls: 'text-red-500 font-semibold', label: `${diff}d` };
  if (diff <= 60) return { cls: 'text-amber-600 font-semibold', label: `${diff}d` };
  return { cls: 'text-[#15803D] font-medium', label: `${diff}d` };
}

const STATUS_OPTIONS = ['Active', 'At Risk', 'On Hold'];
const STATUS_STYLES = {
  'Active': 'bg-[#DCFCE7] text-[#15803D]',
  'At Risk': 'bg-[#FEE2E2] text-[#B91C1C]',
  'On Hold': 'bg-[#FEF9C3] text-[#A16207]',
};

export default function Renewals({ onOpenClientPanel }) {
  const [clients, setClients] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [renewalNotes, setRenewalNotes] = useState({}); // clientId => note
  const [addingNoteFor, setAddingNoteFor] = useState(null);
  const [noteInput, setNoteInput] = useState('');

  const load = async () => {
    const [cls, ds] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.Deal.list(),
    ]);
    setClients(cls.filter(c => c.status === 'Live' || c.status === 'Onboarding' || c.status === 'Trial'));
    setDeals(ds);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getDeal = (clientId) => deals.find(d => d.clientId === clientId) || null;

  // Sort by renewal date ascending
  let sorted = [...clients].sort((a, b) => {
    if (!a.renewalDate && !b.renewalDate) return 0;
    if (!a.renewalDate) return 1;
    if (!b.renewalDate) return -1;
    return new Date(a.renewalDate) - new Date(b.renewalDate);
  });

  // Filter
  const now = new Date();
  if (filter === '30 days') sorted = sorted.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) >= 0 && differenceInDays(new Date(c.renewalDate), now) <= 30);
  else if (filter === '60 days') sorted = sorted.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) > 30 && differenceInDays(new Date(c.renewalDate), now) <= 60);
  else if (filter === 'Overdue') sorted = sorted.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) < 0);

  // Stat cards
  const due30 = clients.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) >= 0 && differenceInDays(new Date(c.renewalDate), now) <= 30).length;
  const due60 = clients.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) > 30 && differenceInDays(new Date(c.renewalDate), now) <= 60).length;
  const due90 = clients.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) > 60 && differenceInDays(new Date(c.renewalDate), now) <= 90).length;
  const arrAtRisk = clients
    .filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) <= 60)
    .reduce((sum, c) => {
      const deal = getDeal(c.id);
      return sum + ((deal?.monthlyValue || 0) * 12);
    }, 0);

  const saveNote = async (clientId) => {
    setRenewalNotes(prev => ({ ...prev, [clientId]: noteInput }));
    // Append to client notes
    const client = clients.find(c => c.id === clientId);
    const existing = client?.notes || '';
    const entry = `[Renewal note — ${format(now, 'd MMM yyyy')}]: ${noteInput}`;
    await base44.entities.Client.update(clientId, { notes: existing ? `${entry}\n${existing}` : entry });
    setAddingNoteFor(null);
    setNoteInput('');
  };

  return (
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">Renewals</h1>
        <p className="text-[#9CA3AF] text-sm mt-0.5">Client renewal tracking — sorted by soonest renewal</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Due in 30 days', value: due30, color: '#B91C1C' },
          { label: 'Due in 60 days', value: due60, color: '#A16207' },
          { label: 'Due in 90 days', value: due90, color: '#1D4ED8' },
          { label: 'ARR at risk (60d)', value: `£${Math.round(arrAtRisk).toLocaleString('en-GB')}`, color: '#8403C5' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}` }}>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {(() => {
        const overdueCount = clients.filter(c => c.renewalDate && differenceInDays(new Date(c.renewalDate), now) < 0).length;
        return overdueCount > 0 && filter !== 'Overdue' ? (
          <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-[#FEE2E2] border border-[#FCA5A5] rounded-xl">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse flex-shrink-0" />
            <span className="text-sm font-semibold text-[#B91C1C] flex-1">🚨 {overdueCount} renewal{overdueCount !== 1 ? 's' : ''} {overdueCount !== 1 ? 'are' : 'is'} overdue — action required</span>
            <button onClick={() => setFilter('Overdue')} className="text-xs font-bold text-[#B91C1C] underline hover:text-[#991B1B] transition-colors whitespace-nowrap">View overdue →</button>
          </div>
        ) : null;
      })()}

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        <button onClick={() => setFilter('All')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filter === 'All' ? 'bg-[#242450] text-white' : 'bg-white text-[#374151] hover:bg-[#F9FAFB]'}`}
          style={filter !== 'All' ? { border: '1.5px solid #E5E7EB' } : {}}>
          All
        </button>
        <button onClick={() => setFilter('30 days')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filter === '30 days' ? 'bg-[#A16207] text-white' : 'text-[#A16207]'}`}
          style={filter !== '30 days' ? { background: '#FEF9C3', border: '1.5px solid #F59E0B' } : {}}>
          Due in 30 days
        </button>
        <button onClick={() => setFilter('60 days')}
          className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filter === '60 days' ? 'bg-[#C2410C] text-white' : 'text-[#C2410C]'}`}
          style={filter !== '60 days' ? { background: '#FFF7ED', border: '1.5px solid #FB923C' } : {}}>
          Due in 60 days
        </button>
        <button onClick={() => setFilter('Overdue')}
          className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors flex items-center gap-1.5 ${filter === 'Overdue' ? 'bg-[#B91C1C] text-white' : 'text-[#B91C1C]'}`}
          style={filter !== 'Overdue' ? { background: '#FEE2E2', border: '1.5px solid #EF4444' } : {}}>
          {filter !== 'Overdue' && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />}
          Overdue
        </button>
      </div>

      {loading ? (
        <SkeletonTable rows={5} cols={7} />
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table className="w-full text-sm min-w-[800px]">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                {['Client', 'Plan', 'Monthly', 'Annual', 'Renewal Date', 'Days Left', 'CS Owner', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map(c => {
                const deal = getDeal(c.id);
                const rc = getRenewalColor(c.renewalDate);
                const diff = c.renewalDate ? differenceInDays(new Date(c.renewalDate), now) : null;
                return (
                  <React.Fragment key={c.id}>
                    <tr
                      className="border-b border-[#F2F2F4] hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                      onClick={() => onOpenClientPanel && onOpenClientPanel(c)}
                    >
                      <td className="px-4 py-3">
                        <p className="font-semibold text-[#111827] text-sm">{c.name}</p>
                        <p className="text-xs text-[#9CA3AF]">{c.contactName || ''}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#374151]">{c.plan || deal?.plan || '—'}</td>
                      <td className="px-4 py-3 text-sm text-[#374151]">
                        {deal?.monthlyValue ? `£${deal.monthlyValue.toLocaleString('en-GB')}` : '—'}
                      </td>
                      <td className="px-4 py-3 text-sm text-[#374151]">
                        {deal?.monthlyValue ? `£${(deal.monthlyValue * 12).toLocaleString('en-GB')}` : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${rc.cls}`}>{fmtDate(c.renewalDate)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-sm ${rc.cls}`}>{diff !== null ? rc.label : '—'}</span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#374151]">{c.owner || '—'}</td>
                      <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                        <button
                          onClick={() => { setAddingNoteFor(c.id); setNoteInput(''); }}
                          className="flex items-center gap-1 text-xs font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-1.5 hover:bg-[#F9FAFB] transition-colors"
                        >
                          <Plus className="w-3 h-3" /> Add note
                        </button>
                      </td>
                    </tr>
                    {addingNoteFor === c.id && (
                      <tr className="border-b border-[#F2F2F4] bg-[#FAF5FF]">
                        <td colSpan={8} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <input
                              className="flex-1 text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
                              placeholder="Renewal conversation note…"
                              value={noteInput}
                              onChange={e => setNoteInput(e.target.value)}
                              autoFocus
                            />
                            <button onClick={() => saveNote(c.id)} disabled={!noteInput.trim()}
                              className="px-3 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">
                              Save
                            </button>
                            <button onClick={() => setAddingNoteFor(null)} className="p-2 text-[#9CA3AF] hover:text-[#374151]"><X className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-16 text-center">
                  <div className="text-4xl mb-3 opacity-60">📅</div>
                  <p className="text-sm text-[#6B7280]">No renewals in this period.</p>
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}