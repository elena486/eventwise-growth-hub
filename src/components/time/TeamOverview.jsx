import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths } from 'date-fns';
import { Download, Filter } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];

function fmtHours(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function fmtDecimal(minutes) {
  return (minutes / 60).toFixed(1);
}

function fmtHoursShort(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '—';
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export default function TeamOverview({ refresh }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [memberFilter, setMemberFilter] = useState([]);
  const [categoryFilter, setCategoryFilter] = useState([]);
  const [billableOnly, setBillableOnly] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.TimeEntry.list('-date', 2000);
      setEntries(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  // Date range
  const dateRange = useMemo(() => {
    const now = new Date();
    switch (period) {
      case 'this_week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      case 'custom': return { start: customStart ? parseISO(customStart) : startOfMonth(now), end: customEnd ? parseISO(customEnd) : endOfMonth(now) };
      default: return { start: startOfMonth(now), end: endOfMonth(now) };
    }
  }, [period, customStart, customEnd]);

  // Filtered entries
  const filtered = useMemo(() => {
    return entries.filter(e => {
      const d = parseISO(e.date);
      if (!isWithinInterval(d, { start: dateRange.start, end: dateRange.end })) return false;
      if (memberFilter.length > 0 && !memberFilter.includes(e.teamMember)) return false;
      if (categoryFilter.length > 0 && !categoryFilter.includes(e.category)) return false;
      if (billableOnly && !e.billable) return false;
      return true;
    });
  }, [entries, dateRange, memberFilter, categoryFilter, billableOnly]);

  // Team summary
  const teamSummary = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      if (!map[e.teamMember]) map[e.teamMember] = { totalMin: 0, billableMin: 0, count: 0, catMap: {} };
      map[e.teamMember].totalMin += e.durationMinutes;
      if (e.billable) map[e.teamMember].billableMin += e.durationMinutes;
      map[e.teamMember].count++;
      map[e.teamMember].catMap[e.category] = (map[e.teamMember].catMap[e.category] || 0) + e.durationMinutes;
    });
    return Object.entries(map)
      .map(([name, d]) => {
        const topCat = Object.entries(d.catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        return { name, totalMin: d.totalMin, billableMin: d.billableMin, count: d.count, topCategory: topCat };
      })
      .sort((a, b) => b.totalMin - a.totalMin);
  }, [filtered]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      map[e.category] = (map[e.category] || 0) + e.durationMinutes;
    });
    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, min]) => ({ category: cat, minutes: min, pct: (min / max) * 100 }));
  }, [filtered]);

  // Bottleneck signals
  const bottlenecks = useMemo(() => {
    const catPeople = {};
    const catTotal = {};
    filtered.forEach(e => {
      catTotal[e.category] = (catTotal[e.category] || 0) + e.durationMinutes;
      if (!catPeople[e.category]) catPeople[e.category] = {};
      catPeople[e.category][e.teamMember] = (catPeople[e.category][e.teamMember] || 0) + e.durationMinutes;
    });
    return Object.entries(catTotal).map(([cat, total]) => {
      const people = catPeople[cat] || {};
      const numPeople = Object.keys(people).length;
      const avgPerPerson = numPeople > 0 ? total / numPeople : 0;
      const maxOne = Math.max(...Object.values(people), 0);
      const pctOne = total > 0 ? Math.round((maxOne / total) * 100) : 0;
      // Only flag if: >10h total, >1 contributor, and >70% by one person
      const hasEnoughData = total > 600 && numPeople >= 2;
      const concentrationPerson = hasEnoughData && pctOne > 70 ? Object.entries(people).find(([, v]) => v === maxOne)?.[0] : null;
      return { category: cat, totalMin: total, numPeople, avgMin: avgPerPerson, concentrationPerson, concentrationRisk: !!concentrationPerson, concentrationPct: pctOne };
    }).sort((a, b) => b.totalMin - a.totalMin);
  }, [filtered]);

  // Project breakdown
  const projectBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = `${e.category}|||${e.projectTask}|||${e.clientName || ''}`;
      if (!map[key]) map[key] = { category: e.category, task: e.projectTask, clientName: e.clientName || '', minutes: 0 };
      map[key].minutes += e.durationMinutes;
    });
    return Object.values(map).sort((a, b) => b.minutes - a.minutes);
  }, [filtered]);

  // Estimated vs actual
  const estimatedVsActual = useMemo(() => {
    return filtered
      .filter(e => e.estimatedMinutes != null && e.estimatedMinutes > 0)
      .map(e => ({
        task: e.projectTask,
        estimated: e.estimatedMinutes,
        actual: e.durationMinutes,
        variance: e.durationMinutes - e.estimatedMinutes,
      }));
  }, [filtered]);

  // CSV export
  const exportCSV = () => {
    const header = 'Date,Team Member,Category,Client,Project/Task,Duration (hours),Billable,Notes';
    const rows = filtered.map(e =>
      `"${e.date}","${e.teamMember}","${e.category}","${(e.clientName || '').replace(/"/g, '""')}","${(e.projectTask || '').replace(/"/g, '""')}","${fmtDecimal(e.durationMinutes)}","${e.billable ? 'Yes' : 'No'}","${(e.notes || '').replace(/"/g, '""')}"`
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `time-entries-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleFilter = (setter, arr, val) => setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="pt-6 space-y-8">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-1.5 flex-wrap">
          {[
            { id: 'this_week', label: 'This week' },
            { id: 'this_month', label: 'This month' },
            { id: 'last_month', label: 'Last month' },
            { id: 'custom', label: 'Custom' },
          ].map(p => (
            <button key={p.id} onClick={() => setPeriod(p.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${period === p.id ? 'bg-[#242450] text-white' : 'bg-white text-[#5777AB] border border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              {p.label}
            </button>
          ))}
          {period === 'custom' && (
            <div className="flex items-center gap-2 ml-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg" />
              <span className="text-xs text-[#5777AB]">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg" />
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <button onClick={() => setFilterOpen(o => !o)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${(memberFilter.length > 0 || categoryFilter.length > 0 || billableOnly) ? 'bg-[#F3E8FF] text-[#8403C5] border-[#8403C5]/30' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              <Filter className="w-3 h-3" /> Filters
              {(memberFilter.length + categoryFilter.length + (billableOnly ? 1 : 0)) > 0 && (
                <span className="bg-[#8403C5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {memberFilter.length + categoryFilter.length + (billableOnly ? 1 : 0)}
                </span>
              )}
            </button>
            {filterOpen && (
              <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-64 p-4 space-y-4">
                <div>
                  <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2">Team member</p>
                  <div className="space-y-1">
                    {TEAM_MEMBERS.map(m => (
                      <label key={m} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={memberFilter.includes(m)} onChange={() => toggleFilter(setMemberFilter, memberFilter, m)}
                          className="accent-[#8403C5] w-3.5 h-3.5" />
                        <span className="text-xs text-[#242450]">{m}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2">Category</p>
                  <div className="space-y-1 max-h-36 overflow-y-auto">
                    {CATEGORIES.map(c => (
                      <label key={c} className="flex items-center gap-2 cursor-pointer">
                        <input type="checkbox" checked={categoryFilter.includes(c)} onChange={() => toggleFilter(setCategoryFilter, categoryFilter, c)}
                          className="accent-[#8403C5] w-3.5 h-3.5" />
                        <span className="text-xs text-[#242450]">{c}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-[#EBEBF5]">
                  <input type="checkbox" checked={billableOnly} onChange={() => setBillableOnly(b => !b)}
                    className="accent-[#8403C5] w-3.5 h-3.5" />
                  <span className="text-xs text-[#242450] font-medium">Billable only</span>
                </label>
              </div>
            )}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-[#5777AB] border border-[#EBEBF5] rounded-lg hover:border-[#D8D8EE] transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Section 1: Team Summary */}
      <div>
        <h3 className="text-sm font-bold text-[#242450] mb-3">Team Summary</h3>
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Name', 'Total hours', 'Top category', 'Billable', 'Entries'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {teamSummary.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#5777AB]">No data for this period</td></tr>
              ) : (
                teamSummary.map(m => (
                  <tr key={m.name} className={`border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors ${m.totalMin === 0 ? 'bg-[#FFFBEB]' : ''}`}>
                    <td className="px-4 py-2.5 text-xs font-semibold text-[#242450]">{m.name}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-[#242450]">{fmtHoursShort(m.totalMin)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{m.topCategory}</td>
                    <td className="px-4 py-2.5 text-xs text-[#242450]">{fmtHoursShort(m.billableMin)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{m.count}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 2: Time by Category */}
      <div>
        <h3 className="text-sm font-bold text-[#242450] mb-3">Time by Category</h3>
        <div className="bg-white border border-[#EBEBF5] rounded-xl p-5">
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-[#5777AB] text-center py-8">No data for this period</p>
          ) : (
            <div className="space-y-2.5">
              {categoryBreakdown.map(c => {
                const color = CATEGORY_COLORS[c.category] || '#9CA3AF';
                return (
                <div key={c.category} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#242450] w-44 shrink-0 truncate">{c.category}</span>
                  <div className="flex-1 bg-[#F6F6FB] rounded-full h-6 overflow-hidden">
                    <div className="h-full rounded-full flex items-center justify-end px-2 transition-all duration-500" style={{ width: `${Math.max(c.pct, 2)}%`, backgroundColor: color }}>
                      <span className="text-[10px] font-bold text-white">{fmtHoursShort(c.minutes)}</span>
                    </div>
                  </div>
                </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Section 3: Bottleneck Signals */}
      <div>
        <h3 className="text-sm font-bold text-[#242450] mb-3">Bottleneck Signals</h3>
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Category', 'Total hours', 'Contributors', 'Avg / person', 'Flag'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {bottlenecks.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-[#5777AB]">No data for this period</td></tr>
              ) : (
                bottlenecks.map(b => (
                  <tr key={b.category} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-[#242450]">{b.category}</td>
                    <td className="px-4 py-2.5 text-xs text-[#242450]">{fmtHoursShort(b.totalMin)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{b.numPeople}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{fmtHoursShort(b.avgMin)}</td>
                    <td className="px-4 py-2.5">
                      {b.concentrationRisk ? (
                        <span className="text-[10px] font-semibold bg-[#FFFBEB] text-[#A16207] px-2 py-0.5 rounded-full">
                          {b.concentrationPerson} handles {b.concentrationPct}% — concentration risk
                        </span>
                      ) : (
                        <span className="text-[10px] text-[#9CA3AF]">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 4: Project Time Breakdown */}
      <div>
        <h3 className="text-sm font-bold text-[#242450] mb-3">Project Time Breakdown</h3>
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr>
                {['Category', 'Client', 'Project / Task', 'Total hours'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {projectBreakdown.length === 0 ? (
                <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-[#5777AB]">No data for this period</td></tr>
              ) : (
                projectBreakdown.map((p, i) => (
                  <tr key={i} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{p.category}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{p.clientName || '—'}</td>
                    <td className="px-4 py-2.5 text-xs font-medium text-[#242450] max-w-[300px] truncate">{p.task}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold text-[#242450]">{fmtHoursShort(p.minutes)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Section 5: Estimated vs Actual */}
      {estimatedVsActual.length >= 5 && (
        <div>
          <h3 className="text-sm font-bold text-[#242450] mb-3">Estimated vs Actual</h3>
          <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  {['Task', 'Estimated', 'Actual', 'Variance'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {estimatedVsActual.map((ev, i) => (
                  <tr key={i} className="border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                    <td className="px-4 py-2.5 text-xs font-medium text-[#242450] max-w-[250px] truncate">{ev.task}</td>
                    <td className="px-4 py-2.5 text-xs text-[#5777AB]">{fmtHoursShort(ev.estimated)}</td>
                    <td className="px-4 py-2.5 text-xs text-[#242450]">{fmtHoursShort(ev.actual)}</td>
                    <td className="px-4 py-2.5 text-xs font-semibold">
                      {ev.variance > 0 ? (
                        <span className="text-[#DC2626]">+{fmtHoursShort(ev.variance)} over</span>
                      ) : ev.variance < 0 ? (
                        <span className="text-[#1D9E75]">−{fmtHoursShort(Math.abs(ev.variance))} under</span>
                      ) : (
                        <span className="text-[#9CA3AF]">On track</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {filterOpen && <div className="fixed inset-0 z-40" onClick={() => setFilterOpen(false)} />}
    </div>
  );
}