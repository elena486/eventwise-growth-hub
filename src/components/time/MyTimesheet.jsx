import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Grid3X3, Calendar, Pencil, Trash2, Plus } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import QuickEntryModal from './QuickEntryModal';

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

  // Quick‑add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const me = await base44.auth.me().catch(() => null);
      const firstName = me?.full_name?.split(' ')[0] || '';
      setCurrentUser(firstName);
      const data = await base44.entities.TimeEntry.list('-date', 1000);
      setEntries(data.filter(e => e.teamMember === firstName));
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
    CATEGORY_LABELS.forEach(cat => { data[cat] = Array(7).fill(0); });
    weekEntries.forEach(e => {
      const day = parseISO(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
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

  // Get entries for a specific day index (0=Mon..6=Sun)
  const getEntriesForDayIdx = (idx) => {
    return weekEntries.filter(e => {
      const day = parseISO(e.date).getDay();
      const eIdx = day === 0 ? 6 : day - 1;
      return eIdx === idx;
    });
  };

  const handleOpenForDate = (dateStr, category) => {
    setModalInitial({ date: dateStr, category: category || '' });
    setModalOpen(true);
  };

  const handleOpenForEntry = (entry) => {
    setModalInitial(entry);
    setModalOpen(true);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pt-6">
      {/* Summary chips */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        {[
          { label: 'This week', value: fmtHours(weekTotal) },
          { label: 'This month', value: fmtHours(monthTotal) },
          { label: 'Most time on', value: topCategory },
          { label: 'Billable this month', value: fmtHours(billableMonth) },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{s.label}</p>
            <p className="text-xl font-bold text-[#242450] mt-0.5">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Week nav + view toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <button onClick={() => setWeekOffset(o => o - 1)} className="p-2 rounded-lg hover:bg-[#EBEBF5] transition-colors">
            <ChevronLeft className="w-5 h-5 text-[#5777AB]" />
          </button>
          <span className="text-sm font-semibold text-[#242450]">
            {format(weekStart, 'd MMM')} — {format(weekEnd, 'd MMM yyyy')}
          </span>
          <button onClick={() => setWeekOffset(o => o + 1)} className="p-2 rounded-lg hover:bg-[#EBEBF5] transition-colors">
            <ChevronRight className="w-5 h-5 text-[#5777AB]" />
          </button>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">View:</span>
          <div className="flex border-2 border-[#EBEBF5] rounded-lg overflow-hidden bg-white">
            {[
              { id: 'grid', icon: Grid3X3, label: 'Grid' },
              { id: 'list', icon: List, label: 'List' },
              { id: 'calendar', icon: Calendar, label: 'Calendar' },
            ].map(v => (
              <button key={v.id} onClick={() => setView(v.id)}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition-colors ${view === v.id ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
                <v.icon className="w-4 h-4" /> {v.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Category colour legend (shown in calendar + grid views) */}
      {(view === 'calendar' || view === 'grid') && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-4">
          {Object.entries(CATEGORY_COLORS).map(([cat, color]) => (
            <div key={cat} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-[10px] font-medium text-[#5777AB]">{cat}</span>
            </div>
          ))}
        </div>
      )}

      {/* Views */}
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
                    <th key={i} className="px-3 py-3 text-center text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em] cursor-pointer hover:text-[#8403C5]"
                      onClick={() => handleOpenForDate(format(addDays(weekStart, i), 'yyyy-MM-dd'))}>
                      {d}
                    </th>
                  ))}
                  <th className="px-4 py-3 text-right text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Total</th>
                </tr>
              </thead>
              <tbody>
                {CATEGORY_LABELS.map(cat => {
                  const days = gridData[cat] || Array(7).fill(0);
                  const total = categoryTotals[cat] || 0;
                  const color = CATEGORY_COLORS[cat] || '#9CA3AF';
                  return (
                    <tr key={cat} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                      <td className="px-4 py-2.5 text-xs font-medium" style={{ color }}>
                        {cat}
                      </td>
                      {days.map((v, i) => (
                        <td key={i}
                          onClick={() => {
                            if (v > 0) {
                              const entriesForCell = weekEntries.filter(e => {
                                const d = parseISO(e.date).getDay();
                                return e.category === cat && (d === 0 ? 6 : d - 1) === i;
                              });
                              if (entriesForCell.length === 1) handleOpenForEntry(entriesForCell[0]);
                              else handleOpenForDate(format(addDays(weekStart, i), 'yyyy-MM-dd'), cat);
                            } else {
                              handleOpenForDate(format(addDays(weekStart, i), 'yyyy-MM-dd'), cat);
                            }
                          }}
                          className="px-3 py-2.5 text-center text-xs cursor-pointer hover:bg-[#F3E8FF] transition-colors">
                          {v > 0 ? <span className="font-semibold text-[#242450]">{fmtHours(v)}</span> : <span className="text-[#D8D8EE]">—</span>}
                        </td>
                      ))}
                      <td className="px-4 py-2.5 text-right text-xs font-bold text-[#242450]">{total > 0 ? fmtHours(total) : <span className="text-[#D8D8EE]">—</span>}</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-[#EBEBF5] bg-[#FAFAFD] font-bold">
                  <td className="px-4 py-2.5 text-xs font-bold text-[#242450]">Total</td>
                  {dayTotals.map((v, i) => (
                    <td key={i} className="px-3 py-2.5 text-center text-xs font-bold text-[#242450]">{fmtHours(v)}</td>
                  ))}
                  <td className="px-4 py-2.5 text-right text-xs font-bold text-[#8403C5]">{fmtHours(weekTotal)}</td>
                </tr>
              </tbody>
            </table>
          )}
        </div>
      ) : view === 'list' ? (
        <div>
          <div className="flex justify-end mb-3">
            <button onClick={() => handleOpenForDate(format(new Date(), 'yyyy-MM-dd'))}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] transition-colors">
              <Plus className="w-3.5 h-3.5" /> Add entry
            </button>
          </div>
          <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            {weekEntries.length === 0 ? (
              <div className="px-6 py-16 text-center">
                <p className="text-sm text-[#5777AB]">No entries this week</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Click "Add entry" above or use the Log Time tab</p>
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
                    <tr key={e.id} onClick={() => handleOpenForEntry(e)}
                      className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors cursor-pointer group">
                      <td className="px-3 py-2.5 text-xs text-[#242450]">{format(parseISO(e.date), 'd MMM')}</td>
                      <td className="px-3 py-2.5 text-xs text-[#5777AB]">{e.category}</td>
                      <td className="px-3 py-2.5 text-xs text-[#5777AB]">{e.clientName || '—'}</td>
                      <td className="px-3 py-2.5 text-xs text-[#242450] font-medium max-w-[200px] truncate">{e.projectTask}</td>
                      <td className="px-3 py-2.5 text-xs font-semibold text-[#242450]">{fmtHours(e.durationMinutes)}</td>
                      <td className="px-3 py-2.5">{e.billable ? <span className="chip chip-green">Yes</span> : <span className="text-[10px] text-[#9CA3AF]">—</span>}</td>
                      <td className="px-3 py-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Pencil className="w-3 h-3 text-[#9CA3AF]" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      ) : (
        <CalendarView entries={weekEntries} weekStart={weekStart} DAYS={DAYS} onOpenEntry={handleOpenForEntry} onAddForDay={handleOpenForDate} />
      )}

      {/* Quick-add / edit modal */}
      <QuickEntryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setModalInitial(null); }}
        onSaved={load}
        initial={modalInitial}
      />
    </div>
  );
}

// ── Calendar View ──

function CalendarView({ entries, weekStart, DAYS, onOpenEntry, onAddForDay }) {
  const dayEntries = useMemo(() => {
    const map = {};
    entries.forEach(e => {
      const day = parseISO(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      if (idx >= 0 && idx < 7) {
        if (!map[idx]) map[idx] = [];
        map[idx].push(e);
      }
    });
    return map;
  }, [entries]);

  const maxDayMin = useMemo(() => {
    let max = 60;
    DAYS.forEach((_, i) => {
      const total = (dayEntries[i] || []).reduce((s, e) => s + e.durationMinutes, 0);
      if (total > max) max = total;
    });
    return max;
  }, [dayEntries]);

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#EBEBF5]">
        {DAYS.map((d, i) => {
          const date = addDays(weekStart, i);
          const dayTotal = (dayEntries[i] || []).reduce((s, e) => s + e.durationMinutes, 0);
          const dateStr = format(date, 'yyyy-MM-dd');
          return (
            <div key={i} className="px-2 py-2.5 text-center border-r border-[#EBEBF5] last:border-r-0 cursor-pointer hover:bg-[#F6F6FB] transition-colors"
              onClick={() => onAddForDay(dateStr)}>
              <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.06em]">{d}</p>
              <p className="text-[10px] text-[#9CA3AF]">{format(date, 'd MMM')}</p>
              {dayTotal > 0 && <p className="text-[11px] font-bold text-[#242450] mt-0.5">{fmtHours(dayTotal)}</p>}
            </div>
          );
        })}
      </div>

      {/* Day columns */}
      <div className="grid grid-cols-7 min-h-[300px]">
        {DAYS.map((_, i) => {
          const items = dayEntries[i] || [];
          const cellMinHeight = 300 + Math.max(0, items.length - 3) * 80;
          const dateStr = format(addDays(weekStart, i), 'yyyy-MM-dd');
          return (
            <div key={i} className="relative border-r border-[#EBEBF5] last:border-r-0 p-2 space-y-1.5 cursor-cell"
              style={{ minHeight: cellMinHeight }}
              onClick={(e) => {
                if (e.target === e.currentTarget) onAddForDay(dateStr);
              }}>
              {items.length === 0 ? (
                <p className="text-[11px] text-[#D8D8EE] text-center pt-8">—</p>
              ) : (
                items.map(entry => {
                  const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
                  const heightPct = Math.max(10, (entry.durationMinutes / maxDayMin) * 100);
                  return (
                    <div key={entry.id}
                      onClick={(e) => { e.stopPropagation(); onOpenEntry(entry); }}
                      className="relative rounded-md px-2 py-1.5 cursor-pointer transition-all group"
                      style={{
                        minHeight: `${Math.max(heightPct * 0.8, 36)}px`,
                        backgroundColor: `${color}18`,
                        borderLeft: `3px solid ${color}`,
                      }}>
                      <p className="text-[10px] font-semibold text-[#5777AB] leading-tight uppercase tracking-[0.04em]" style={{ color }}>
                        {entry.category}
                      </p>
                      {entry.clientName && (
                        <p className="text-[10px] font-medium text-[#5777AB] truncate mt-0.5">{entry.clientName}</p>
                      )}
                      <p className="text-[11px] font-semibold text-[#242450] leading-tight mt-0.5 line-clamp-2">{entry.projectTask}</p>
                      <p className="text-[10px] font-bold text-[#242450] mt-1">{fmtHours(entry.durationMinutes)}</p>
                    </div>
                  );
                })
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}