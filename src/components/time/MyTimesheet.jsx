import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, isSameDay, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Grid3X3, Calendar, Pencil, Trash2, X, Check } from 'lucide-react';

const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function fmtHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '—';
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function fmtDecimal(minutes) {
  return (minutes / 60).toFixed(1);
}

export default function MyTimesheet({ refresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [view, setView] = useState('grid');
  const [weekOffset, setWeekOffset] = useState(0);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [deleteId, setDeleteId] = useState(null);
  const [clients, setClients] = useState([]);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const firstName = me?.full_name?.split(' ')[0] || '';
      setCurrentUser(firstName);

      const data = await base44.entities.TimeEntry.list('-date', 1000);
      setEntries(data.filter(e => e.teamMember === firstName));
      base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const weekStart = useMemo(() => startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);
  const weekEnd = useMemo(() => endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 }), [weekOffset]);

  const weekEntries = useMemo(() =>
    entries.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: weekStart, end: weekEnd });
    }), [entries, weekStart, weekEnd]
  );

  // Summary stats
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);
  const weekTotal = weekEntries.reduce((s, e) => s + e.durationMinutes, 0);
  const monthEntries = entries.filter(e => isWithinInterval(parseISO(e.date), { start: monthStart, end: monthEnd }));
  const monthTotal = monthEntries.reduce((s, e) => s + e.durationMinutes, 0);
  const billableMonth = monthEntries.filter(e => e.billable).reduce((s, e) => s + e.durationMinutes, 0);

  const topCategory = useMemo(() => {
    const catMap = {};
    monthEntries.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.durationMinutes; });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '—';
  }, [monthEntries]);

  // Grid data
  const gridData = useMemo(() => {
    const data = {};
    CATEGORIES.forEach(cat => { data[cat] = Array(7).fill(0); });
    weekEntries.forEach(e => {
      const day = parseISO(e.date).getDay(); // 0=Sun, 6=Sat
      const idx = day === 0 ? 6 : day - 1; // Mon=0...Sun=6
      if (idx >= 0 && idx < 7) {
        data[e.category] = data[e.category] || Array(7).fill(0);
        data[e.category][idx] += e.durationMinutes;
      }
    });
    return data;
  }, [weekEntries]);

  const categoryTotals = useMemo(() => {
    const totals = {};
    Object.entries(gridData).forEach(([cat, days]) => {
      totals[cat] = days.reduce((s, v) => s + v, 0);
    });
    return totals;
  }, [gridData]);

  const dayTotals = useMemo(() => {
    const totals = Array(7).fill(0);
    Object.values(gridData).forEach(days => {
      days.forEach((v, i) => { totals[i] += v; });
    });
    return totals;
  }, [gridData]);

  const handleEdit = (entry) => {
    const h = Math.floor(entry.durationMinutes / 60);
    const m = entry.durationMinutes % 60;
    setEditId(entry.id);
    setEditData({ ...entry, hours: String(h), minutes: String(m) });
  };

  const handleSaveEdit = async () => {
    const h = parseInt(editData.hours) || 0;
    const m = parseInt(editData.minutes) || 0;
    await base44.entities.TimeEntry.update(editId, {
      date: editData.date,
      category: editData.category,
      projectTask: editData.projectTask,
      durationMinutes: h * 60 + m,
      billable: editData.billable,
      notes: editData.notes || '',
      ...(editData.clientId ? { clientId: editData.clientId, clientName: editData.clientName } : {}),
    });
    setEditId(null);
    load();
  };

  const handleDelete = async () => {
    await base44.entities.TimeEntry.delete(deleteId);
    setDeleteId(null);
    load();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pt-6">
      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'This week', value: fmtHours(weekTotal), sub: `${fmtDecimal(weekTotal)}h` },
          { label: 'This month', value: fmtHours(monthTotal), sub: `${fmtDecimal(monthTotal)}h` },
          { label: 'Most time on', value: topCategory, sub: null },
          { label: 'Billable this month', value: fmtHours(billableMonth), sub: `${fmtDecimal(billableMonth)}h` },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{s.label}</p>
            <p className="text-xl font-bold text-[#242450] mt-0.5">{s.value}</p>
            {s.sub && <p className="text-[11px] text-[#5777AB]">{s.sub}</p>}
          </div>
        ))}
      </div>

      {/* Week nav + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-[#EBEBF5] transition-colors">
            <ChevronLeft className="w-4 h-4 text-[#5777AB]" />
          </button>
          <span className="text-sm font-semibold text-[#242450]">
            {format(weekStart, 'd MMM')} — {format(weekEnd, 'd MMM yyyy')}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-[#EBEBF5] transition-colors">
            <ChevronRight className="w-4 h-4 text-[#5777AB]" />
          </button>
        </div>
        <div className="flex items-center border border-[#EBEBF5] rounded-lg overflow-hidden bg-white">
          <button onClick={() => setView('grid')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'grid' ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            <Grid3X3 className="w-3.5 h-3.5" /> Grid
          </button>
          <button onClick={() => setView('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'list' ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setView('calendar')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            <Calendar className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      {/* View content */}
      {view === 'grid' ? (
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          {Object.values(categoryTotals).every(v => v === 0) ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-[#5777AB]">No time logged yet this week</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Add your first entry in the Log Time tab above</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Category</th>
                  {DAYS.map((d, i) => (
                    <th key={i} className="px-3 py-3 text-center text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{d}</th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Total</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORIES.map(cat => {
                  const days = gridData[cat] || Array(7).fill(0);
                  const total = categoryTotals[cat] || 0;
                  if (total === 0) return null;
                  return (
                    <tr key={cat} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                      <td className="px-4 py-2.5 text-xs font-medium text-[#242450]">{cat}</td>
                      {days.map((v, i) => (
                        <td key={i} className="px-3 py-2.5 text-center text-xs text-[#5777AB]">
                          {v > 0 ? <span className="font-semibold text-[#242450]">{fmtDecimal(v)}</span> : <span className="text-[#D8D8EE]">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-[#242450]">{fmtDecimal(total)}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#EBEBF5] bg-[#FAFAFD] font-bold">
                  <td className="px-4 py-2.5 text-xs font-bold text-[#242450]">Total</td>
                  {dayTotals.map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-center text-xs font-bold text-[#242450]">{fmtDecimal(v)}</td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[#8403C5]">{fmtDecimal(weekTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : (
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          {weekEntries.length === 0 ? (
            <div className="px-6 py-16 text-center">
              <p className="text-sm text-[#5777AB]">No entries this week</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Add your first entry in the Log Time tab above</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Date', 'Category', 'Client', 'Project / Task', 'Duration', 'Billable', ''].map(h => (
                    <th key={h} className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {weekEntries.map(e => (
                  <tr key={e.id} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors group">
                    <td className="px-3 py-2.5 text-xs text-[#242450]">{format(parseISO(e.date), 'd MMM')}</td>
                    <td className="px-3 py-2.5 text-xs text-[#5777AB]">{e.category}</td>
                    <td className="px-3 py-2.5 text-xs text-[#5777AB]">{e.clientName || '—'}</td>
                    <td className="px-3 py-2.5 text-xs text-[#242450] font-medium max-w-[200px] truncate">{e.projectTask}</td>
                    <td className="px-3 py-2.5 text-xs font-semibold text-[#242450]">{fmtHours(e.durationMinutes)}</td>
                    <td className="px-3 py-2.5">{e.billable ? <span className="text-[10px] font-semibold bg-[#E8F7F2] text-[#1D9E75] px-2 py-0.5 rounded-full">Yes</span> : <span className="text-[10px] text-[#9CA3AF]">—</span>}</td>
                    <td className="px-3 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleEdit(e)} className="p-1 text-[#9CA3AF] hover:text-[#8403C5] rounded"><Pencil className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(e.id)} className="p-1 text-[#9CA3AF] hover:text-[#DC2626] rounded"><Trash2 className="w-3 h-3" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Edit modal */}
      {editId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setEditId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-4">Edit entry</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Date</label>
                <input type="date" value={editData.date} onChange={e => setEditData({ ...editData, date: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Category</label>
                <select value={editData.category} onChange={e => setEditData({ ...editData, category: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg">
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Project / Task</label>
                <input type="text" value={editData.projectTask} onChange={e => setEditData({ ...editData, projectTask: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Hours</label>
                  <input type="number" min="0" value={editData.hours} onChange={e => setEditData({ ...editData, hours: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Minutes</label>
                  <input type="number" min="0" max="59" value={editData.minutes} onChange={e => setEditData({ ...editData, minutes: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <label className="text-sm text-[#242450]">Billable?</label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="editBillable" checked={!editData.billable} onChange={() => setEditData({ ...editData, billable: false })}
                    className="accent-[#8403C5]" />
                  <span className="text-sm">No</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input type="radio" name="editBillable" checked={editData.billable} onChange={() => setEditData({ ...editData, billable: true })}
                    className="accent-[#8403C5]" />
                  <span className="text-sm">Yes</span>
                </label>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#EBEBF5]">
              <button onClick={() => setEditId(null)} className="px-4 py-2 text-sm text-[#5777AB] hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveEdit} className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0]">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#242450] mb-1">Delete this entry?</p>
            <p className="text-xs text-[#5777AB] mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteId(null)} className="px-3 py-1.5 text-sm text-[#5777AB] hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}