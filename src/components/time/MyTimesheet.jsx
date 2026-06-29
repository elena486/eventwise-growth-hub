import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek, endOfWeek, addWeeks, subWeeks, addDays, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronLeft, ChevronRight, List, Grid3X3, Calendar, Pencil, Trash2, Plus, CalendarDays, X } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import QuickEntryModal from './QuickEntryModal';
import EntryDetailModal from './EntryDetailModal';

const PERIOD_OPTIONS = [
  { id: 'this_week', label: 'This week' },
  { id: 'last_week', label: 'Last week' },
  { id: 'this_month', label: 'This month' },
  { id: 'last_month', label: 'Last month' },
  { id: 'custom', label: 'Custom' },
];

const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

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
  const [period, setPeriod] = useState('this_week');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Quick‑add/edit modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalInitial, setModalInitial] = useState(null);

  // Category drill-down
  const [catDrillCat, setCatDrillCat] = useState(null);
  const [drillEntry, setDrillEntry] = useState(null);

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

  const now = new Date();

  // Period-aware date range (week nav only used for this_week/last_week)
  const { rangeStart, rangeEnd } = useMemo(() => {
    switch (period) {
      case 'this_week': {
        const s = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
        return { rangeStart: s, rangeEnd: endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 }) };
      }
      case 'last_week': {
        const s = startOfWeek(addWeeks(now, -1 + weekOffset), { weekStartsOn: 1 });
        return { rangeStart: s, rangeEnd: endOfWeek(addWeeks(now, -1 + weekOffset), { weekStartsOn: 1 }) };
      }
      case 'this_month': return { rangeStart: startOfMonth(now), rangeEnd: endOfMonth(now) };
      case 'last_month': {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return { rangeStart: startOfMonth(lm), rangeEnd: endOfMonth(lm) };
      }
      case 'custom': {
        const s = customStart ? parseISO(customStart) : startOfMonth(now);
        const e = customEnd ? parseISO(customEnd) : endOfMonth(now);
        return { rangeStart: s, rangeEnd: e };
      }
      default: {
        const s = startOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 });
        return { rangeStart: s, rangeEnd: endOfWeek(addWeeks(now, weekOffset), { weekStartsOn: 1 }) };
      }
    }
  }, [period, weekOffset, customStart, customEnd]);

  // For backward compat (calendar/grid use these)
  const weekStart = rangeStart;
  const weekEnd = rangeEnd;

  const weekEntries = useMemo(() =>
    entries.filter(e => {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: rangeStart, end: rangeEnd });
    }), [entries, rangeStart, rangeEnd]
  );

  const periodTotal = weekEntries.reduce((s, e) => s + e.durationMinutes, 0);
  // weekTotal alias kept for grid footer
  const weekTotal = periodTotal;

  const topCategory = useMemo(() => {
    const catMap = {};
    weekEntries.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.durationMinutes; });
    const sorted = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
    return sorted[0]?.[0] || '—';
  }, [weekEntries]);

  // Human-readable label for current period
  const periodLabel = useMemo(() => {
    if (period === 'this_week') return weekOffset === 0 ? 'This Week' : `${format(rangeStart, 'd MMM')} – ${format(rangeEnd, 'd MMM')}`;
    if (period === 'last_week') return 'Last Week';
    if (period === 'this_month') return format(rangeStart, 'MMMM yyyy');
    if (period === 'last_month') return format(rangeStart, 'MMMM yyyy');
    if (period === 'custom' && customStart && customEnd) return `${format(rangeStart, 'd MMM')} – ${format(rangeEnd, 'd MMM yyyy')}`;
    return 'Selected Period';
  }, [period, weekOffset, rangeStart, rangeEnd, customStart, customEnd]);

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

  const handleOpenForDate = (dateStr, category, startTime) => {
    setModalInitial({ date: dateStr, category: category || '', startTime: startTime || '' });
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
      {/* Summary chips — reactive to selected period */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        {[
          { label: periodLabel, value: fmtHours(periodTotal) },
          { label: 'Entries', value: weekEntries.length },
          { label: 'Most time on', value: topCategory },
        ].map((s, i) => (
          <div key={i} className="bg-white border border-[#EBEBF5] rounded-xl p-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] truncate">{s.label}</p>
            <p className="text-xl font-bold text-[#242450] mt-0.5 truncate">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Period selector + nav + view toggle */}
      <div className="space-y-3 mb-4">
        {/* Period pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {PERIOD_OPTIONS.map(p => (
            <button key={p.id} onClick={() => { setPeriod(p.id); setWeekOffset(0); }}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${period === p.id ? 'bg-[#242450] text-white' : 'bg-white text-[#5777AB] border border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-1">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg" />
              <span className="text-xs text-[#5777AB]">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg" />
            </div>
          )}
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {(period === 'this_week' || period === 'last_week') && (
              <>
                <button onClick={() => setWeekOffset(o => o - 1)} className="p-1.5 rounded-lg hover:bg-[#EBEBF5] transition-colors">
                  <ChevronLeft className="w-4 h-4 text-[#5777AB]" />
                </button>
                <span className="text-sm font-semibold text-[#242450]">
                  {format(rangeStart, 'd MMM')} — {format(rangeEnd, 'd MMM yyyy')}
                </span>
                <button onClick={() => setWeekOffset(o => o + 1)} className="p-1.5 rounded-lg hover:bg-[#EBEBF5] transition-colors">
                  <ChevronRight className="w-4 h-4 text-[#5777AB]" />
                </button>
              </>
            )}
            {(period === 'this_month' || period === 'last_month') && (
              <span className="text-sm font-semibold text-[#242450]">{format(rangeStart, 'MMMM yyyy')}</span>
            )}
            {period === 'custom' && customStart && customEnd && (
              <span className="text-sm font-semibold text-[#242450]">{format(rangeStart, 'd MMM')} — {format(rangeEnd, 'd MMM yyyy')}</span>
            )}
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
                      <td className="px-4 py-2.5 text-xs font-medium cursor-pointer hover:underline" style={{ color }}
                        onClick={() => total > 0 && setCatDrillCat(cat)}>
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
                    {['Date', 'Category', 'Client', 'Project / Task', 'Duration', ''].map(h => (
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

      {/* Category drill-down modal (FIX 4) */}
      {catDrillCat && (
        <CategoryDrillModal
          category={catDrillCat}
          entries={weekEntries.filter(e => e.category === catDrillCat)}
          periodLabel={periodLabel}
          onClose={() => setCatDrillCat(null)}
          onOpenEntry={(e) => { setDrillEntry(e); }}
        />
      )}

      {/* Entry detail from drill-down */}
      {drillEntry && (
        <EntryDetailModal
          entry={drillEntry}
          onClose={() => setDrillEntry(null)}
          onUpdated={() => { load(); setDrillEntry(null); }}
          onDeleted={() => { load(); setDrillEntry(null); }}
        />
      )}
    </div>
  );
}

// ── Category Drill-Down Modal ──
function CategoryDrillModal({ category, entries, periodLabel, onClose, onOpenEntry }) {
  const color = CATEGORY_COLORS[category] || '#9CA3AF';
  const totalMin = entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const h = Math.floor(totalMin / 60); const m = totalMin % 60;
  const totalStr = !h && !m ? '0h' : !m ? `${h}h` : !h ? `${m}m` : `${h}h ${m}m`;
  const sorted = [...entries].sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[14px] w-[520px] max-h-[85vh] overflow-y-auto animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5]">
          <div>
            <h2 className="text-base font-bold" style={{ color }}>{category}</h2>
            <p className="text-xs text-[#5777AB]">{periodLabel} · {entries.length} entries · {totalStr} total</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#EBEBF5] text-[#9CA3AF]"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4">
          {sorted.length === 0 ? (
            <p className="text-sm text-[#5777AB] text-center py-8">No entries</p>
          ) : (
            <div className="space-y-1">
              {sorted.map(e => {
                let dateStr = ''; try { dateStr = format(parseISO(e.date), 'd MMM'); } catch {}
                const h2 = Math.floor((e.durationMinutes || 0) / 60); const m2 = (e.durationMinutes || 0) % 60;
                const dur = !h2 && !m2 ? '0h' : !m2 ? `${h2}h` : !h2 ? `${m2}m` : `${h2}h ${m2}m`;
                return (
                  <button key={e.id} onClick={() => onOpenEntry(e)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F6F6FB] transition-colors text-left">
                    <span className="text-[10px] text-[#9CA3AF] w-12 shrink-0">{dateStr}</span>
                    <span className="flex-1 text-xs text-[#242450] truncate">{e.projectTask}</span>
                    {e.clientName && <span className="text-[10px] text-[#5777AB] bg-[#EEF2F8] px-1.5 py-0.5 rounded shrink-0">{e.clientName}</span>}
                    {e.notes && <span className="text-[10px] text-[#9CA3AF] shrink-0">📝</span>}
                    {e.transcriptLink && <span className="text-[10px] text-[#9CA3AF] shrink-0">🔗</span>}
                    <span className="text-xs font-bold text-[#242450] shrink-0">{dur}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Calendar View ──

function CalendarView({ entries, weekStart, DAYS, onOpenEntry, onAddForDay }) {
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const showCurrentLine = currentHourDecimal >= 7 && currentHourDecimal <= 22;

  // Group entries by day index
  const entriesByDayIdx = useMemo(() => {
    const map = {};
    DAYS.forEach((_, i) => { map[i] = []; });
    entries.forEach(e => {
      const day = parseISO(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      if (idx >= 0 && idx < 7) map[idx].push(e);
    });
    return map;
  }, [entries]);

  // Position entries that have timer start/stop times
  const positionedEntriesByDayIdx = useMemo(() => {
    const map = {};
    DAYS.forEach((_, i) => { map[i] = []; });
    entries.forEach(e => {
      if (!e.timerStartedAt || !e.timerStoppedAt) return;
      const day = parseISO(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      if (idx < 0 || idx >= 7) return;
      try {
        const start = new Date(e.timerStartedAt);
        const startH = start.getHours() + start.getMinutes() / 60;
        const endH = new Date(e.timerStoppedAt).getHours() + new Date(e.timerStoppedAt).getMinutes() / 60;
        if (startH < 7 || startH > 22) return;
        map[idx].push({ entry: e, startH, endH, top: (startH - 7) * 60, height: Math.max(20, (endH - startH) * 60) });
      } catch {}
    });
    return map;
  }, [entries]);

  // Entries without timer data — show as chips
  const untimedEntriesByDayIdx = useMemo(() => {
    const map = {};
    DAYS.forEach((_, i) => { map[i] = []; });
    entries.forEach(e => {
      if (e.timerStartedAt && e.timerStoppedAt) return;
      const day = parseISO(e.date).getDay();
      const idx = day === 0 ? 6 : day - 1;
      if (idx >= 0 && idx < 7) map[idx].push(e);
    });
    return map;
  }, [entries]);

  const handleCellClick = (dayIdx, hour) => {
    const date = addDays(weekStart, dayIdx);
    const dateStr = format(date, 'yyyy-MM-dd');
    const timeStr = `${String(hour).padStart(2, '0')}:00`;
    onAddForDay(dateStr, '', timeStr);
  };

  const totalHeight = CALENDAR_HOURS.length * 60;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-[#EBEBF5]">
        <div className="border-r border-[#EBEBF5]" />
        {DAYS.map((d, i) => {
          const date = addDays(weekStart, i);
          const dayTotal = (entriesByDayIdx[i] || []).reduce((s, e) => s + e.durationMinutes, 0);
          return (
            <div key={i} className="px-2 py-2.5 text-center border-r border-[#EBEBF5] last:border-r-0">
              <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.06em]">{d}</p>
              <p className="text-[10px] text-[#9CA3AF]">{format(date, 'd MMM')}</p>
              {dayTotal > 0 && <p className="text-[11px] font-bold text-[#242450] mt-0.5">{fmtHours(dayTotal)}</p>}
            </div>
          );
        })}
      </div>

      {/* Time grid */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {CALENDAR_HOURS.map((hour) => {
            const top = (hour - 7) * 60;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: `${top}px`, height: '60px' }}>
                {/* Hour marker label */}
                <div className="absolute left-0 top-0 w-[60px] h-full border-r border-[#EBEBF5] flex items-start justify-end pr-2">
                  <span className="text-[10px] font-bold text-[#5777AB] leading-none mt-0">{String(hour).padStart(2, '0')}:00</span>
                </div>

                {/* Solid hour line across all day columns */}
                <div className="absolute left-[60px] right-0 top-0 border-t border-[#EBEBF5] h-px" />

                {/* Half-hour dotted line */}
                <div className="absolute left-[60px] right-0 top-[30px] border-t border-dashed border-[#D8D8EE] h-px" />

                {/* Clickable day columns */}
                {DAYS.map((_, dayIdx) => (
                  <div key={dayIdx}
                    className="absolute border-r border-[#EBEBF5] last:border-r-0 h-full hover:bg-[#F3E8FF]/30 cursor-pointer transition-colors"
                    style={{ left: `calc(60px + (100% - 60px) / 7 * ${dayIdx})`, width: `calc((100% - 60px) / 7)` }}
                    onClick={() => handleCellClick(dayIdx, hour)}
                    title={`Log at ${String(hour).padStart(2, '0')}:00`}
                  />
                ))}
              </div>
            );
          })}

          {/* Positioned entry blocks (those with timer start/stop) */}
          {DAYS.map((_, dayIdx) => {
            const posEntries = positionedEntriesByDayIdx[dayIdx] || [];
            const colWidth = `calc((100% - 60px) / 7)`;
            return posEntries.map(({ entry, top, height }) => {
              const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
              return (
                <div key={entry.id}
                  className="absolute rounded-md px-2 py-1 overflow-hidden cursor-pointer hover:shadow-md transition-shadow z-10"
                  style={{
                    left: `calc(60px + (100% - 60px) / 7 * ${dayIdx})`,
                    width: colWidth,
                    top: `${top}px`,
                    height: `${Math.min(height, totalHeight - top)}px`,
                    backgroundColor: `${color}18`,
                    borderLeft: `3px solid ${color}`,
                  }}
                  onClick={(e) => { e.stopPropagation(); onOpenEntry(entry); }}
                >
                  <p className="text-[10px] font-semibold leading-tight" style={{ color }}>{entry.category}</p>
                  <p className="text-[10px] font-medium text-[#242450] leading-tight mt-0.5 truncate">{entry.projectTask}</p>
                  <p className="text-[9px] font-bold text-[#242450] mt-0.5">{fmtHours(entry.durationMinutes)}</p>
                </div>
              );
            });
          })}

          {/* Untimed entries — chips at top of each day column */}
          {DAYS.map((_, dayIdx) => {
            const chips = untimedEntriesByDayIdx[dayIdx] || [];
            const colWidth = `calc((100% - 60px) / 7)`;
            return chips.map((e, ci) => {
              const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
              return (
                <div key={e.id}
                  className="absolute px-1.5 py-0.5 rounded cursor-pointer hover:shadow-sm transition-shadow z-10"
                  style={{
                    left: `calc(60px + (100% - 60px) / 7 * ${dayIdx})`,
                    width: colWidth,
                    top: `${ci * 24}px`,
                    backgroundColor: `${color}12`,
                    borderLeft: `2px solid ${color}`,
                  }}
                  onClick={(ev) => { ev.stopPropagation(); onOpenEntry(e); }}
                >
                  <p className="text-[9px] font-medium text-[#242450] truncate leading-tight">{e.projectTask || '—'}</p>
                  <p className="text-[8px] text-[#5777AB]">{fmtHours(e.durationMinutes)}</p>
                </div>
              );
            });
          })}

          {/* Current time line */}
          {showCurrentLine && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentHourDecimal - 7) * 60}px` }}>
              <div className="absolute left-[60px] right-0 h-px bg-[#DC2626]" />
              <div className="absolute left-0 w-[60px] flex items-center justify-end pr-2" style={{ marginTop: '-9px' }}>
                <span className="text-[10px] font-bold text-[#DC2626] bg-white px-1 rounded">{format(now, 'HH:mm')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}