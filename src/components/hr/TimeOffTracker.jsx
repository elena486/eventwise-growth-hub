import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Check, X, ChevronDown } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import TimeOffModal from './TimeOffModal';
import DeclineModal from './DeclineModal';

const MEMBERS = ['All', 'Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];
const CURRENT_YEAR = new Date().getFullYear();

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-700',
  Pending:  'bg-amber-50 text-amber-700',
  Declined: 'bg-red-50 text-red-600',
};

const TYPE_STYLES = {
  Vacation:  'bg-emerald-50 text-emerald-700',
  'Sick Day':'bg-amber-50 text-amber-700',
  Other:     'bg-gray-100 text-gray-600',
};

const ALLOWANCE_NOTE = `2026 Holiday Allowances (working days):
• Martinique: 20 days
• George: 20 days
• Sreeja: 20 days
• Ramesh: pro-rata (fractional — confirm with Chris)
• Chris / Elena / David: directors — self-managed
Update this note each January.`;

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

function calcWorkingDays(start, end) {
  if (!start || !end) return 1;
  try {
    let s = parseISO(start), e = parseISO(end), count = 0;
    while (s <= e) {
      const day = s.getDay();
      if (day !== 0 && day !== 6) count++;
      s = new Date(s.getTime() + 86400000);
    }
    return Math.max(count, 1);
  } catch { return 1; }
}

export default function TimeOffTracker() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [memberFilter, setMemberFilter] = useState('All');
  const [yearFilter, setYearFilter] = useState(String(CURRENT_YEAR));
  const [typeFilter, setTypeFilter] = useState('All');
  const [showModal, setShowModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [declineRecord, setDeclineRecord] = useState(null);
  const [allowanceNote, setAllowanceNote] = useState(ALLOWANCE_NOTE);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(ALLOWANCE_NOTE);

  const load = async () => {
    const data = await base44.entities.TimeOffRecord.list('-startDate');
    setRecords(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    setRecords(prev => {
      const exists = prev.find(r => r.id === saved.id);
      return exists ? prev.map(r => r.id === saved.id ? saved : r) : [saved, ...prev];
    });
  };

  const handleDelete = async (r) => {
    await base44.entities.TimeOffRecord.delete(r.id);
    setRecords(prev => prev.filter(x => x.id !== r.id));
    setDeleteConfirm(null);
  };

  const handleApprove = async (r) => {
    const updated = { ...r, status: 'Approved' };
    await base44.entities.TimeOffRecord.update(r.id, { status: 'Approved' });
    setRecords(prev => prev.map(x => x.id === r.id ? updated : x));
  };

  const handleDeclined = (updated) => {
    setRecords(prev => prev.map(x => x.id === updated.id ? updated : x));
    setDeclineRecord(null);
  };

  // Filtered
  const filtered = records.filter(r => {
    const mOk = memberFilter === 'All' || r.teamMember === memberFilter;
    const yr = r.year || (r.startDate ? new Date(r.startDate).getFullYear() : null);
    const yOk = yearFilter === 'All' || String(yr) === yearFilter;
    const tOk = typeFilter === 'All' || r.type === typeFilter || (typeFilter === 'Sick' && r.type === 'Sick Day');
    return mOk && yOk && tOk;
  });

  // Stats for the selected year
  const statsYear = yearFilter === 'All' ? CURRENT_YEAR : parseInt(yearFilter);
  const yearRecords = records.filter(r => {
    const yr = r.year || (r.startDate ? new Date(r.startDate).getFullYear() : null);
    return yr === statsYear && r.status === 'Approved';
  });
  const totalVacation = yearRecords.filter(r => r.type === 'Vacation').reduce((s, r) => s + (r.workingDays || 0), 0);
  const totalSick = yearRecords.filter(r => r.type === 'Sick Day').reduce((s, r) => s + (r.workingDays || 0), 0);

  const personStats = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'].map(m => ({
    name: m,
    vacation: yearRecords.filter(r => r.teamMember === m && r.type === 'Vacation').reduce((s, r) => s + (r.workingDays || 0), 0),
    sick: yearRecords.filter(r => r.teamMember === m && r.type === 'Sick Day').reduce((s, r) => s + (r.workingDays || 0), 0),
  })).filter(p => p.vacation > 0 || p.sick > 0);

  const years = ['2025', '2026', 'All'];

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Time Off & Sick Days</h1>
          <p className="text-ew-muted text-sm mt-0.5">Full team record of approved leave and sick days</p>
        </div>
        <button
          onClick={() => { setEditRecord(null); setShowModal(true); }}
          className="h-9 px-4 bg-navy hover:bg-navy/90 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Log Time Off
        </button>
      </div>

      {/* Allowance note */}
      <div className="mb-5 bg-[#F3E8FF] border border-[#8403C5]/20 rounded-xl px-5 py-3">
        {editingNote ? (
          <div className="space-y-2">
            <textarea
              className="w-full text-sm bg-white border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none"
              rows={7}
              value={noteDraft}
              onChange={e => setNoteDraft(e.target.value)}
            />
            <div className="flex gap-2">
              <button onClick={() => { setAllowanceNote(noteDraft); setEditingNote(false); }}
                className="px-3 py-1.5 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/90">Save</button>
              <button onClick={() => { setNoteDraft(allowanceNote); setEditingNote(false); }}
                className="px-3 py-1.5 text-xs font-medium text-ew-body hover:bg-white/60 rounded-lg">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <pre className="text-xs text-[#7E22CE] font-dm whitespace-pre-wrap leading-relaxed">{allowanceNote}</pre>
            <button onClick={() => { setNoteDraft(allowanceNote); setEditingNote(true); }}
              className="shrink-0 p-1.5 rounded-lg hover:bg-white/50 text-[#7E22CE] transition-colors">
              <Pencil className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
        <div className="bg-white border border-ew-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Team vacation ({statsYear})</p>
          <p className="text-2xl font-bold text-navy">{totalVacation}<span className="text-sm font-medium text-ew-muted ml-1">days</span></p>
        </div>
        <div className="bg-white border border-ew-border rounded-xl p-4">
          <p className="text-[11px] font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Team sick days ({statsYear})</p>
          <p className="text-2xl font-bold text-navy">{totalSick}<span className="text-sm font-medium text-ew-muted ml-1">days</span></p>
        </div>
        {personStats.map(p => (
          <div key={p.name} className="bg-white border border-ew-border rounded-xl p-4">
            <p className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] mb-1">{p.name}</p>
            <div className="flex items-center gap-3 text-sm">
              {p.vacation > 0 && <span className="font-medium text-emerald-700">{p.vacation}d vacation</span>}
              {p.sick > 0 && <span className="font-medium text-amber-700">{p.sick}d sick</span>}
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4 items-center">
        {/* Member */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {MEMBERS.map(m => (
            <button key={m} onClick={() => setMemberFilter(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${memberFilter === m ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {m}
            </button>
          ))}
        </div>

        {/* Year */}
        <div className="flex items-center gap-1.5 ml-auto">
          {years.map(y => (
            <button key={y} onClick={() => setYearFilter(y)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${yearFilter === y ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {y}
            </button>
          ))}
        </div>

        {/* Type */}
        <div className="flex items-center gap-1.5">
          {['All', 'Vacation', 'Sick', 'Other'].map(t => (
            <button key={t} onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${typeFilter === t ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['Team Member', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-ew-muted text-sm">No records found.</td></tr>
              ) : filtered.map((r, i) => (
                <tr key={r.id} className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                  <td className="px-4 py-3 font-semibold text-navy whitespace-nowrap">{r.teamMember}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[r.type] || 'bg-gray-100 text-gray-600'}`}>{r.type}</span>
                  </td>
                  <td className="px-4 py-3 text-ew-body whitespace-nowrap">{fmtDate(r.startDate)}</td>
                  <td className="px-4 py-3 text-ew-body whitespace-nowrap">{r.endDate && r.endDate !== r.startDate ? fmtDate(r.endDate) : '—'}</td>
                  <td className="px-4 py-3 font-medium text-navy">{r.workingDays || '—'}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[r.status] || 'bg-gray-100 text-gray-500'}`}>{r.status}</span>
                  </td>
                  <td className="px-4 py-3 text-ew-body text-xs max-w-[200px]">
                    <span className="line-clamp-2">{r.notes || '—'}</span>
                    {r.declineReason && <span className="block text-red-500 mt-0.5">Declined: {r.declineReason}</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      {r.status === 'Pending' && (
                        <>
                          <button onClick={() => handleApprove(r)} title="Approve"
                            className="p-1.5 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"><Check className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeclineRecord(r)} title="Decline"
                            className="p-1.5 rounded-lg text-red-500 hover:bg-red-50 transition-colors"><X className="w-3.5 h-3.5" /></button>
                        </>
                      )}
                      <button onClick={() => { setEditRecord(r); setShowModal(true); }} title="Edit"
                        className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(r)} title="Delete"
                        className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <TimeOffModal
          record={editRecord}
          onClose={() => { setShowModal(false); setEditRecord(null); }}
          onSaved={handleSaved}
        />
      )}

      {declineRecord && (
        <DeclineModal
          record={declineRecord}
          onClose={() => setDeclineRecord(null)}
          onDeclined={handleDeclined}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete record?</h3>
            <p className="text-sm text-ew-body mb-5">Permanently delete the time off record for <strong>{deleteConfirm.teamMember}</strong> ({fmtDate(deleteConfirm.startDate)})?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}