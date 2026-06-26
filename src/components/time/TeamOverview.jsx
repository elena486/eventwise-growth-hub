import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, addDays, isWeekend } from 'date-fns';
import { Download, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];
const MEMBER_COLORS = {
  'Chris': '#8403C5', 'Elena': '#1D9E75', 'George': '#E8A020',
  'Martinique': '#0EA5E9', 'Sreeja': '#DC2626', 'Ramesh': '#5777AB',
};
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [showUnlinkedOnly, setShowUnlinkedOnly] = useState(false);
  const [collapsedCategories, setCollapsedCategories] = useState({});

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
      return true;
    });
  }, [entries, dateRange, memberFilter, categoryFilter]);

  // Team summary — always includes all 6 members
  const teamSummary = useMemo(() => {
    const map = {};
    // Initialise all team members with zeros
    TEAM_MEMBERS.forEach(name => { map[name] = { totalMin: 0, count: 0, catMap: {} }; });
    filtered.forEach(e => {
      if (!map[e.teamMember]) map[e.teamMember] = { totalMin: 0, count: 0, catMap: {} };
      map[e.teamMember].totalMin += e.durationMinutes;
      map[e.teamMember].count++;
      map[e.teamMember].catMap[e.category || 'Uncategorised'] = (map[e.teamMember].catMap[e.category || 'Uncategorised'] || 0) + e.durationMinutes;
    });
    return Object.entries(map)
      .map(([name, d]) => {
        const topCat = Object.entries(d.catMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';
        return { name, totalMin: d.totalMin, count: d.count, topCategory: topCat };
      })
      .sort((a, b) => b.totalMin - a.totalMin);
  }, [filtered]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const cat = e.category || 'Uncategorised';
      map[cat] = (map[cat] || 0) + e.durationMinutes;
    });
    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .map(([cat, min]) => ({ category: cat, minutes: min, pct: (min / max) * 100 }));
  }, [filtered]);

  // Team Health — plain English summary
  const teamHealth = useMemo(() => {
    const now = new Date();
    const thisMonthStart = startOfMonth(now);
    const thisMonthEnd = endOfMonth(now);
    const sentences = [];
    let signalCount = 0;
    let critical = false;

    // ── Active / inactive: derive from teamSummary (EXACT same data the cards use) ──
    const activeMemberNames = new Set(teamSummary.filter(m => m.count > 0).map(m => m.name));
    const activeCount = activeMemberNames.size;
    const totalMembers = TEAM_MEMBERS.length;

    const inactiveMembers = [];
    TEAM_MEMBERS.forEach(name => {
      // Only flag as inactive if they have ever logged time AND are absent from teamSummary
      const hasHistory = entries.some(e => e.teamMember === name);
      if (!hasHistory) return;
      if (!activeMemberNames.has(name)) inactiveMembers.push(name);
    });

    // ── Top category ──
    let topCat = '', topCatMin = 0;
    const catMap = {};
    filtered.forEach(e => { catMap[e.category] = (catMap[e.category] || 0) + e.durationMinutes; });
    Object.entries(catMap).forEach(([cat, min]) => { if (min > topCatMin) { topCat = cat; topCatMin = min; } });

    const teamTotal = filtered.reduce((s, e) => s + e.durationMinutes, 0);

    // ── Per-person signals (use ALL entries, not filtered period) ──
    const highLoadNames = [];
    const spikes = [];
    const streakNames = [];

    TEAM_MEMBERS.forEach(name => {
      // High load check (always uses all entries across months)
      const monthlyHours = [];
      for (let i = 0; i < 4; i++) {
        const mStart = startOfMonth(subMonths(now, i));
        const mEnd = endOfMonth(subMonths(now, i));
        const min = entries
          .filter(e => e.teamMember === name && isWithinInterval(parseISO(e.date), { start: mStart, end: mEnd }))
          .reduce((s, e) => s + e.durationMinutes, 0);
        monthlyHours.unshift(min);
      }
      const prevMonths = monthlyHours.slice(0, 3);
      const monthsWithData = prevMonths.filter(m => m > 0).length;
      if (monthsWithData >= 3 && monthlyHours[3] > prevMonths.reduce((s, m) => s + m, 0) / 3 * 1.2 && monthlyHours[3] > 600) {
        highLoadNames.push(name);
      }

      // Category spike (this month vs last month — uses all entries)
      const lastMonthStart = startOfMonth(subMonths(now, 1));
      const lastMonthEnd = endOfMonth(subMonths(now, 1));
      const catThis = {}, catLast = {};
      entries.forEach(e => {
        if (e.teamMember !== name) return;
        const d = parseISO(e.date);
        if (isWithinInterval(d, { start: thisMonthStart, end: thisMonthEnd })) catThis[e.category] = (catThis[e.category] || 0) + e.durationMinutes;
        else if (isWithinInterval(d, { start: lastMonthStart, end: lastMonthEnd })) catLast[e.category] = (catLast[e.category] || 0) + e.durationMinutes;
      });
      Object.entries(catThis).forEach(([cat, thisMin]) => {
        const lastMin = catLast[cat] || 0;
        if (lastMin > 0 && thisMin > lastMin * 1.3 && thisMin > 300) {
          const pctUp = Math.round(((thisMin - lastMin) / lastMin) * 100);
          spikes.push(`${name}'s ${cat.toLowerCase()} activity is up ${pctUp}% vs last month`);
        }
      });

      // No-log streak: only check if person is NOT active in current period
      // If they have entries this period, they're clearly logging — no streak possible
      if (!activeMemberNames.has(name)) {
        const personEntries = entries.filter(e => e.teamMember === name);
        if (personEntries.length > 0) {
          let mostRecentDateStr = '';
          personEntries.forEach(e => { if (e.date > mostRecentDateStr) mostRecentDateStr = e.date; });
          const loggedDays = new Set();
          personEntries.forEach(e => { try { loggedDays.add(e.date); } catch {} });
          let streak = 0;
          let cursor = addDays(now, -1);
          while (streak < 90) {
            const ds = format(cursor, 'yyyy-MM-dd');
            if (!isWeekend(cursor)) {
              if (loggedDays.has(ds)) break;
              streak++;
            }
            cursor = addDays(cursor, -1);
          }
          if (streak >= 5) streakNames.push({ name, days: streak });
        }
      }
    });

    // ── Client-linked time ──
    const clientMin = filtered.filter(e => e.clientId).reduce((s, e) => s + e.durationMinutes, 0);

    // ── Build sentences ──
    const periodLabel = period === 'this_week' ? 'this week' : period === 'this_month' ? 'this month' : period === 'last_month' ? 'last month' : 'this period';

    // SENTENCE 1: Always "X of 6 team members have logged time"
    if (teamTotal === 0) {
      sentences.push(`0 of ${totalMembers} team members have logged time ${periodLabel} — entries will appear once the team starts.`);
    } else {
      sentences.push(`${activeCount} of ${totalMembers} team members have logged time ${periodLabel}.`);
      if (inactiveMembers.length >= totalMembers / 2) critical = true;
      signalCount += inactiveMembers.length;
    }

    // SENTENCE 2: Top category or dominance
    if (teamTotal > 0 && topCat) {
      const topPct = Math.round((topCatMin / teamTotal) * 100);
      if (topPct > 60) {
        sentences.push(`${topCat} is taking up ${topPct}% of total team time ${periodLabel}.`);
      } else {
        sentences.push(`${topCat} had the most hours (${fmtHoursShort(topCatMin)}).`);
      }
    }

    // SENTENCE 3: High load
    if (highLoadNames.length > 0) {
      highLoadNames.forEach(n => {
        sentences.push(`${n}'s hours are significantly higher than their monthly average — worth checking in.`);
      });
      signalCount += highLoadNames.length;
    }

    // SENTENCE 4: Category spikes
    if (spikes.length > 0) {
      sentences.push(spikes[0] + '.');
      signalCount += 1;
    }

    // SENTENCE 5: No-log streaks
    if (streakNames.length > 0) {
      const s = streakNames[0];
      sentences.push(`${s.name} has not logged time in ${s.days} days.`);
      signalCount += streakNames.length;
    }

    // SENTENCE 6: Client-linked time
    if (teamTotal > 0 && clientMin === 0) {
      sentences.push('No time has been logged against any client this month.');
      signalCount += 1;
    }

    // Trim to max 5
    const finalSentences = sentences.slice(0, 5);

    // Status
    let status = 'green';
    if (signalCount >= 3 || critical) status = 'red';
    else if (signalCount >= 1) status = 'amber';

    return { status, sentences: finalSentences };
  }, [entries, filtered, teamSummary, dateRange, period]);

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
    const header = 'Date,Team Member,Category,Client,Project/Task,Duration (hours),Notes,Transcript Link';
    const rows = filtered.map(e =>
      `"${e.date}","${e.teamMember}","${e.category}","${(e.clientName || '').replace(/"/g, '""')}","${(e.projectTask || '').replace(/"/g, '""')}","${fmtDecimal(e.durationMinutes)}","${(e.notes || '').replace(/"/g, '""')}","${(e.transcriptLink || '').replace(/"/g, '""')}"`
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
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${(memberFilter.length > 0 || categoryFilter.length > 0) ? 'bg-[#F3E8FF] text-[#8403C5] border-[#8403C5]/30' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              <Filter className="w-3 h-3" /> Filters
              {(memberFilter.length + categoryFilter.length) > 0 && (
                <span className="bg-[#8403C5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                  {memberFilter.length + categoryFilter.length}
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
              </div>
            )}
          </div>
          <button onClick={exportCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-[#5777AB] border border-[#EBEBF5] rounded-lg hover:border-[#D8D8EE] transition-colors">
            <Download className="w-3 h-3" /> Export CSV
          </button>
        </div>
      </div>

      {/* Team Health Card */}
      <div className={`rounded-xl border px-5 py-4 ${teamHealth.status === 'green' ? 'bg-[#E8F7F2] border-[#1D9E75]/30' : teamHealth.status === 'amber' ? 'bg-[#FFFBEB] border-[#E8A020]/30' : 'bg-[#FEF2F2] border-[#DC2626]/30'}`}>
        <div className="flex items-center gap-2 mb-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center text-lg ${teamHealth.status === 'green' ? 'bg-[#1D9E75]/20 text-[#1D9E75]' : teamHealth.status === 'amber' ? 'bg-[#E8A020]/20 text-[#E8A020]' : 'bg-[#DC2626]/20 text-[#DC2626]'}`}>
            {teamHealth.status === 'green' ? '✓' : teamHealth.status === 'amber' ? '⚠' : '🔴'}
          </span>
          <div>
            <h3 className="text-sm font-bold text-[#242450]">Team Health</h3>
            <p className="text-[10px] text-[#5777AB]">
              {teamHealth.status === 'green' ? 'All clear' : teamHealth.status === 'amber' ? 'Some signals — worth a look' : 'Action needed'}
            </p>
          </div>
        </div>
        {teamHealth.sentences.length > 0 && (
          <div className="space-y-1.5">
            {teamHealth.sentences.map((s, i) => (
              <p key={i} className="text-sm text-[#242450] leading-relaxed">{s}</p>
            ))}
          </div>
        )}
      </div>

      {/* Section 1: Team Summary */}
      <div className="pb-6 border-b border-[#EBEBF5]">
        <h3 className="text-base font-bold text-[#242450] mb-1">Team Summary</h3>
        <p className="text-[11px] text-[#9CA3AF] mb-4">Hours logged per person this period</p>
        {teamSummary.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-12 text-center">
            <p className="text-sm text-[#5777AB]">No time logged yet — entries will appear here once the team starts logging</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {teamSummary.map(m => {
              const teamTotal = teamSummary.reduce((s, x) => s + x.totalMin, 0);
              const pct = teamTotal > 0 ? (m.totalMin / teamTotal) * 100 : 0;
              const color = MEMBER_COLORS[m.name] || '#9CA3AF';
              return (
                <div key={m.name} className={`bg-white border border-[#EBEBF5] rounded-xl p-4 ${m.totalMin === 0 ? 'bg-[#FFFBEB]' : ''}`}>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0" style={{ backgroundColor: color }}>
                      {m.name.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#242450] truncate">{m.name}</p>
                    </div>
                  </div>
                  {m.totalMin === 0 ? (
                    <p className="text-sm font-semibold text-[#A16207]">No time logged</p>
                  ) : (
                    <>
                      <p className="text-2xl font-bold text-[#242450] mb-1">{fmtHours(m.totalMin)}</p>
                      <span className="chip chip-purple text-[10px]">{m.topCategory}</span>
                      <p className="text-[11px] text-[#9CA3AF] mt-2">{m.count} {m.count === 1 ? 'entry' : 'entries'}</p>
                    </>
                  )}
                  <div className="mt-3 bg-[#F6F6FB] rounded-full h-1.5 overflow-hidden">
                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(pct, m.totalMin > 0 ? 2 : 0)}%`, backgroundColor: color }} />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Section 2: Time by Category */}
      <div className="pb-6 border-b border-[#EBEBF5]">
        <h3 className="text-base font-bold text-[#242450] mb-1">Time by Category</h3>
        <p className="text-[11px] text-[#9CA3AF] mb-4">Where the team's time is going</p>
        <div className="bg-white border border-[#EBEBF5] rounded-xl p-5">
          {categoryBreakdown.length === 0 ? (
            <p className="text-sm text-[#5777AB] text-center py-8">No time logged yet — entries will appear here once the team starts logging</p>
          ) : (
            <>
              <p className="text-xs font-semibold text-[#5777AB] mb-4">
                Total team hours this period: {fmtHours(filtered.reduce((s, e) => s + e.durationMinutes, 0))} across {categoryBreakdown.length} {categoryBreakdown.length === 1 ? 'category' : 'categories'}
              </p>
              <div className="space-y-3">
                {categoryBreakdown.map(c => {
                  const color = BAR_COLORS[c.category] || '#9CA3AF';
                  const teamTotalMin = filtered.reduce((s, e) => s + e.durationMinutes, 0);
                  const pctOfTotal = teamTotalMin > 0 ? Math.round((c.minutes / teamTotalMin) * 100) : 0;
                  const maxMinutes = Math.max(...categoryBreakdown.map(x => x.minutes), 1);
                  const barWidth = (c.minutes / maxMinutes) * 80;
                  return (
                    <div key={c.category} className="flex items-center gap-3">
                      <span className="text-xs font-medium text-[#242450] w-44 shrink-0 truncate">{c.category}</span>
                      <div className="flex-1 flex items-center gap-2">
                        <div className="flex-1 bg-[#F6F6FB] rounded-full h-6 overflow-hidden">
                          <div className="h-full rounded-full flex items-center px-2.5 transition-all duration-500" style={{ width: `${Math.max(barWidth, 3)}%`, backgroundColor: color }}>
                            <span className="text-[10px] font-bold text-white whitespace-nowrap">{fmtHoursShort(c.minutes)}</span>
                          </div>
                        </div>
                        <span className="text-[11px] font-medium text-[#9CA3AF] shrink-0 w-9 text-right">{pctOfTotal}%</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Section 3: Project Time Breakdown */}
      <div>
        <h3 className="text-base font-bold text-[#242450] mb-1">Project Time Breakdown</h3>
        <p className="text-[11px] text-[#9CA3AF] mb-4">Time by individual task or project</p>
        <div className="flex items-center justify-end mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={showUnlinkedOnly} onChange={() => setShowUnlinkedOnly(v => !v)}
              className="accent-[#8403C5] w-3.5 h-3.5" />
            <span className="text-xs text-[#5777AB]">No client linked only</span>
          </label>
        </div>
        {projectBreakdown.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-12 text-center">
            <p className="text-sm text-[#5777AB]">No data for this period — entries will appear once the team starts logging</p>
          </div>
        ) : (
          (() => {
            const filteredProjects = showUnlinkedOnly ? projectBreakdown.filter(p => !p.clientName) : projectBreakdown;
            const byCat = {};
            filteredProjects.forEach(p => {
              if (!byCat[p.category]) byCat[p.category] = { totalMin: 0, projects: [] };
              byCat[p.category].totalMin += p.minutes;
              byCat[p.category].projects.push(p);
            });
            const catMax = Math.max(...Object.values(byCat).map(c => c.totalMin), 1);
            return (
              <div className="space-y-3">
                {Object.entries(byCat).map(([cat, group]) => {
                  const color = BAR_COLORS[cat] || '#9CA3AF';
                  const isCollapsed = collapsedCategories[cat];
                  return (
                    <div key={cat} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
                      <button onClick={() => setCollapsedCategories(prev => ({ ...prev, [cat]: !prev[cat] }))}
                        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F6F6FB] transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: color }} />
                          <span className="text-xs font-bold text-[#242450]">{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#5777AB]">{fmtHoursShort(group.totalMin)}</span>
                          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" /> : <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" />}
                        </div>
                      </button>
                      {!isCollapsed && (
                        <div>
                          {group.projects.map((p, i) => {
                            const barW = catMax > 0 ? (p.minutes / catMax) * 60 : 0;
                            return (
                              <div key={i} className="flex items-center gap-3 px-4 py-2 border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors">
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-[#242450] truncate">{p.task}</p>
                                  <div className="flex items-center gap-1.5 mt-0.5">
                                    {p.clientName && <span className="text-[10px] text-[#5777AB] bg-[#EEF2F8] px-1.5 py-0.5 rounded">{p.clientName}</span>}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  <div className="w-16 bg-[#F6F6FB] rounded-full h-1.5 overflow-hidden">
                                    <div className="h-full rounded-full transition-all duration-500" style={{ width: `${Math.max(barW, 2)}%`, backgroundColor: color }} />
                                  </div>
                                  <span className="text-xs font-semibold text-[#242450] w-12 text-right">{fmtHoursShort(p.minutes)}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })()
        )}
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