import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, ragColor, RAG_STYLES, formatKpiValue, subWeeks } from '@/lib/sprintConfig';
import { format, parseISO } from 'date-fns';
import { Download, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine, CartesianGrid,
} from 'recharts';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function SectionHeading({ children }) {
  return (
    <div className="flex items-center gap-0 mb-5">
      <div className="w-1 h-6 rounded bg-[#8403C5] mr-3 shrink-0" />
      <h2 className="text-lg font-bold text-[#242450] dark:text-white">{children}</h2>
    </div>
  );
}

function StatCard({ label, value, sub, trend, expandable, expanded, onToggle, children }) {
  return (
    <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      <button
        onClick={expandable ? onToggle : undefined}
        className={`w-full text-left p-5 ${expandable ? 'hover:bg-gray-50 dark:hover:bg-[#252535] cursor-pointer' : 'cursor-default'}`}
      >
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
        <p className="text-2xl font-bold text-[#242450] dark:text-white leading-tight">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
        {trend && <p className="text-xs mt-1 font-medium text-gray-500">{trend}</p>}
        {expandable && (
          <span className="text-[11px] text-[#8403C5] flex items-center gap-0.5 mt-2 font-semibold">
            {expanded ? <><ChevronUp className="w-3 h-3" /> Hide detail</> : <><ChevronDown className="w-3 h-3" /> Show breakdown</>}
          </span>
        )}
      </button>
      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700 px-5 pb-5 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function MiniBar({ label, pct, color = 'bg-[#8403C5]' }) {
  return (
    <div className="flex items-center gap-3 py-1">
      <span className="text-xs text-gray-600 dark:text-gray-300 w-24 truncate shrink-0">{label}</span>
      <div className="flex-1 h-2 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 w-8 text-right">{Math.round(pct)}%</span>
    </div>
  );
}

// Get all unique week starts in sorted order from submissions
function getWeeks(subs, effectiveFrom, effectiveTo) {
  const set = new Set(subs.map(s => s.weekStart));
  return [...set].filter(w => w >= effectiveFrom && w <= effectiveTo).sort();
}

// Trend label from values array
function trendLabel(vals, target) {
  if (!vals || vals.filter(v => v != null).length < 2) return null;
  const valid = vals.filter(v => v != null);
  const last3 = valid.slice(-3);
  const allAbove = last3.every(v => ragColor(v, target) === 'green');
  const allBelow = last3.every(v => ragColor(v, target) === 'red');
  const improving = valid.length >= 2 && valid[valid.length - 1] > valid[0];
  const declining = valid.length >= 2 && valid[valid.length - 1] < valid[0];
  if (allAbove) return { text: `Consistent — hitting target ${last3.length} weeks running`, color: 'text-green-600' };
  if (allBelow && declining) return { text: `Declining — ${last3.length} consecutive weeks below target`, color: 'text-red-500' };
  if (improving) return { text: `Improving over ${valid.length} weeks`, color: 'text-[#8403C5]' };
  if (declining) return { text: `Declining over ${valid.length} weeks`, color: 'text-red-500' };
  return { text: 'Mixed — no clear trend yet', color: 'text-gray-500' };
}

// Get RAG per person per week
function getRagGrid(submissions, weeks) {
  const grid = {};
  MEMBERS.forEach(m => {
    grid[m.id] = {};
    weeks.forEach(w => {
      const sub = submissions.find(s => s.memberName === m.name && s.weekStart === w);
      if (!sub) { grid[m.id][w] = 'none'; return; }
      const r1 = sub.kpi1Value != null ? ragColor(sub.kpi1Value, m.kpi1.target) : null;
      const r2 = sub.kpi2Value != null ? ragColor(sub.kpi2Value, m.kpi2.target) : null;
      grid[m.id][w] = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : 'none';
    });
  });
  return grid;
}

const RAG_CELL = {
  green: 'bg-[#15803D]',
  amber: 'bg-[#A16207]',
  red: 'bg-[#B91C1C]',
  none: 'bg-gray-200 dark:bg-gray-600',
};

// ─── Section 1: Overview cards ────────────────────────────────────────────────

function OverviewSection({ submissions, effectiveFrom, effectiveTo, prevSubs, periodWeeks }) {
  const [exp1, setExp1] = useState(false);
  const [exp2, setExp2] = useState(false);
  const weeks = getWeeks(submissions, effectiveFrom, effectiveTo);
  const totalPossible = MEMBERS.length * weeks.length;

  // Submission rate
  const submitted = MEMBERS.reduce((acc, m) => {
    return acc + weeks.filter(w => submissions.some(s => s.memberName === m.name && s.weekStart === w)).length;
  }, 0);
  const subRate = totalPossible > 0 ? Math.round((submitted / totalPossible) * 100) : 0;

  const prevWeeks = prevSubs.length > 0 ? [...new Set(prevSubs.map(s => s.weekStart))].length : 0;
  const prevPossible = MEMBERS.length * prevWeeks;
  const prevSubmitted = prevSubs.length;
  const prevSubRate = prevPossible > 0 ? Math.round((prevSubmitted / prevPossible) * 100) : 0;
  const subTrend = subRate - prevSubRate;

  // On-track rate (per individual KPI measurement)
  let greenCount = 0, totalMeasurements = 0;
  submissions.forEach(s => {
    const m = MEMBERS.find(m => m.name === s.memberName);
    if (!m) return;
    if (s.kpi1Value != null) { totalMeasurements++; if (ragColor(s.kpi1Value, m.kpi1.target) === 'green') greenCount++; }
    if (s.kpi2Value != null) { totalMeasurements++; if (ragColor(s.kpi2Value, m.kpi2.target) === 'green') greenCount++; }
  });
  const onTrackRate = totalMeasurements > 0 ? Math.round((greenCount / totalMeasurements) * 100) : 0;

  let prevGreen = 0, prevTotal = 0;
  prevSubs.forEach(s => {
    const m = MEMBERS.find(m => m.name === s.memberName);
    if (!m) return;
    if (s.kpi1Value != null) { prevTotal++; if (ragColor(s.kpi1Value, m.kpi1.target) === 'green') prevGreen++; }
    if (s.kpi2Value != null) { prevTotal++; if (ragColor(s.kpi2Value, m.kpi2.target) === 'green') prevGreen++; }
  });
  const prevOnTrackRate = prevTotal > 0 ? Math.round((prevGreen / prevTotal) * 100) : 0;
  const onTrackTrend = onTrackRate - prevOnTrackRate;

  // Most improved
  let mostImproved = null;
  MEMBERS.forEach(m => {
    const curr = submissions.filter(s => s.memberName === m.name).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const prev = prevSubs.filter(s => s.memberName === m.name).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    if (curr.length === 0 || prev.length === 0) return;
    const currAvg = curr.reduce((s, x) => s + (x.kpi1Value || 0), 0) / curr.length;
    const prevAvg = prev.reduce((s, x) => s + (x.kpi1Value || 0), 0) / prev.length;
    if (prevAvg === 0) return;
    const pct = Math.round(((currAvg - prevAvg) / prevAvg) * 100);
    if (!mostImproved || pct > mostImproved.pct) mostImproved = { name: m.name.split(' ')[0], pct, kpi: m.kpi1.label };
  });

  // Per-person sub rates for expansion
  const perPersonSub = MEMBERS.map(m => {
    const n = weeks.filter(w => submissions.some(s => s.memberName === m.name && s.weekStart === w)).length;
    return { name: m.name.split(' ')[0], pct: weeks.length > 0 ? (n / weeks.length) * 100 : 0 };
  });

  // Per-person on-track rates
  const perPersonOnTrack = MEMBERS.map(m => {
    let g = 0, t = 0;
    submissions.filter(s => s.memberName === m.name).forEach(s => {
      if (s.kpi1Value != null) { t++; if (ragColor(s.kpi1Value, m.kpi1.target) === 'green') g++; }
      if (s.kpi2Value != null) { t++; if (ragColor(s.kpi2Value, m.kpi2.target) === 'green') g++; }
    });
    return { name: m.name.split(' ')[0], pct: t > 0 ? (g / t) * 100 : 0 };
  });

  return (
    <div className="grid grid-cols-4 gap-4 mb-8">
      <StatCard
        label="Team submission rate"
        value={`${subRate}%`}
        sub={`${submitted} of ${totalPossible} possible submissions`}
        trend={subTrend !== 0 ? `${subTrend > 0 ? '↑' : '↓'} ${Math.abs(subTrend)}% vs previous period` : '→ Same as previous period'}
        expandable onToggle={() => setExp1(v => !v)} expanded={exp1}
      >
        {perPersonSub.map(p => <MiniBar key={p.name} label={p.name} pct={p.pct} color={p.pct >= 80 ? 'bg-[#15803D]' : p.pct >= 50 ? 'bg-[#A16207]' : 'bg-[#B91C1C]'} />)}
      </StatCard>

      <StatCard
        label="Team on-track rate"
        value={`${onTrackRate}%`}
        sub="KPI measurements at or above target"
        trend={onTrackTrend !== 0 ? `${onTrackTrend > 0 ? '↑' : '↓'} ${Math.abs(onTrackTrend)}% vs previous period` : '→ Same as previous period'}
        expandable onToggle={() => setExp2(v => !v)} expanded={exp2}
      >
        {perPersonOnTrack.map(p => <MiniBar key={p.name} label={p.name} pct={p.pct} color={p.pct >= 80 ? 'bg-[#15803D]' : p.pct >= 50 ? 'bg-[#A16207]' : 'bg-[#B91C1C]'} />)}
      </StatCard>

      <StatCard
        label="Most improved (vs prev period)"
        value={mostImproved ? `${mostImproved.name}` : 'Need more data'}
        sub={mostImproved ? `↑ ${mostImproved.pct}% on ${mostImproved.kpi}` : 'Submit more weeks to compare'}
      />

      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-5">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-1">Biggest blocker ✨ AI</p>
        <p className="text-xs text-gray-400 italic">See Section 5 — AI Blocker Analysis below</p>
      </div>
    </div>
  );
}

// ─── Section 2: Individual trend charts ───────────────────────────────────────

const DOT_COLORS = { green: '#15803D', amber: '#A16207', red: '#B91C1C' };

function CustomDot({ cx, cy, payload }) {
  if (!payload || payload.value == null) return null;
  const c = payload.rag ? DOT_COLORS[payload.rag] || '#8403C5' : '#8403C5';
  return <circle cx={cx} cy={cy} r={4} fill={c} stroke="#fff" strokeWidth={1.5} />;
}

function MemberTrendRow({ member, submissions, weeks }) {
  const memberSubs = submissions.filter(s => s.memberName === member.name);

  const buildData = (kpi) => weeks.map(w => {
    const sub = memberSubs.find(s => s.weekStart === w);
    const val = sub ? (kpi.questionId === member.kpi1.questionId ? sub.kpi1Value : sub.kpi2Value) : null;
    const rag = val != null ? ragColor(val, kpi.target) : null;
    return { week: format(parseISO(w), 'd MMM'), value: val, rag, target: kpi.target };
  });

  const data1 = buildData(member.kpi1);
  const data2 = buildData(member.kpi2);
  const vals1 = data1.map(d => d.value);
  const vals2 = data2.map(d => d.value);
  const trend1 = trendLabel(vals1, member.kpi1.target);
  const trend2 = trendLabel(vals2, member.kpi2.target);

  const ChartPanel = ({ data, kpi, trend }) => (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{kpi.label} <span className="text-gray-300 dark:text-gray-600 font-normal">/ target: {formatKpiValue(kpi.target, kpi)}</span></p>
      <ResponsiveContainer width="100%" height={80}>
        <LineChart data={data} margin={{ top: 6, right: 4, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
          <XAxis dataKey="week" tick={{ fontSize: 9, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB', padding: '4px 8px' }}
            formatter={(v, n, props) => [v != null ? formatKpiValue(v, kpi) : 'No submission', kpi.label]}
            labelFormatter={l => `Week of ${l}`}
          />
          <ReferenceLine y={kpi.target} stroke="#9CA3AF" strokeDasharray="4 3" strokeWidth={1} />
          <Line dataKey="value" dot={<CustomDot />} activeDot={{ r: 5 }} stroke="#8403C5" strokeWidth={2} connectNulls={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
      {trend && <p className={`text-[11px] font-medium mt-1 ${trend.color}`}>{trend.text}</p>}
    </div>
  );

  return (
    <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4 flex gap-6 items-start">
      <div className="w-36 shrink-0">
        <p className="font-bold text-[#242450] dark:text-white text-sm">{member.name.split(' ')[0]}</p>
        <p className="text-[11px] text-gray-400 mt-0.5">{member.role}</p>
      </div>
      <ChartPanel data={data1} kpi={member.kpi1} trend={trend1} />
      <ChartPanel data={data2} kpi={member.kpi2} trend={trend2} />
    </div>
  );
}

function TrendsSection({ submissions, weeks }) {
  if (weeks.length < 2) return (
    <div className="text-sm text-gray-400 italic py-4">Not enough weeks of data to show trends. Need at least 2 weeks.</div>
  );
  return (
    <div className="space-y-3 mb-8">
      {MEMBERS.map(m => <MemberTrendRow key={m.id} member={m} submissions={submissions} weeks={weeks} />)}
    </div>
  );
}

// ─── Section 3: Heat map ──────────────────────────────────────────────────────

function HeatMapSection({ submissions, weeks }) {
  const [tooltip, setTooltip] = useState(null);
  if (weeks.length === 0) return <div className="text-sm text-gray-400 italic py-4">No data in this period.</div>;

  const grid = getRagGrid(submissions, weeks);

  const summaries = MEMBERS.map(m => {
    const cells = weeks.map(w => grid[m.id]?.[w] || 'none');
    const submitted = cells.filter(c => c !== 'none').length;
    const green = cells.filter(c => c === 'green').length;
    const amber = cells.filter(c => c === 'amber').length;
    const red = cells.filter(c => c === 'red').length;
    const last3 = cells.slice(-3).filter(c => c !== 'none');
    const trend = last3.length === 0 ? 'no data' : last3.every(c => c === 'green') ? 'stable ✅' : last3.filter(c => c === 'green').length >= last3.length * 0.6 ? 'stable' : last3[last3.length - 1] === 'green' && last3[0] !== 'green' ? 'improving' : 'declining';
    return { name: m.name.split(' ')[0], submitted, green, amber, red, total: weeks.length, trend };
  });

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide w-32">Member</th>
                {weeks.map(w => (
                  <th key={w} className="px-2 py-3 text-center text-[10px] font-semibold text-gray-400 tracking-wide">
                    W{format(parseISO(w), 'ww')}<br />
                    <span className="font-normal">{format(parseISO(w), 'd MMM')}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MEMBERS.map(m => (
                <tr key={m.id} className="border-b border-gray-50 dark:border-gray-800 last:border-0">
                  <td className="px-4 py-3 text-sm font-semibold text-[#242450] dark:text-white">{m.name.split(' ')[0]}</td>
                  {weeks.map(w => {
                    const rag = grid[m.id]?.[w] || 'none';
                    const sub = submissions.find(s => s.memberName === m.name && s.weekStart === w);
                    const tip = sub
                      ? `KPI1: ${formatKpiValue(sub.kpi1Value, m.kpi1)} / ${formatKpiValue(m.kpi1.target, m.kpi1)} — KPI2: ${formatKpiValue(sub.kpi2Value, m.kpi2)} / ${formatKpiValue(m.kpi2.target, m.kpi2)}`
                      : 'No submission';
                    return (
                      <td key={w} className="px-2 py-3 text-center">
                        <div className="relative inline-block">
                          <div
                            className={`w-8 h-8 rounded-[4px] cursor-default ${RAG_CELL[rag]}`}
                            onMouseEnter={() => setTooltip({ id: m.id + w, text: tip })}
                            onMouseLeave={() => setTooltip(null)}
                          />
                          {tooltip?.id === m.id + w && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 bg-[#1a1f3c] text-white text-[10px] rounded-lg px-2 py-1.5 whitespace-nowrap z-20 shadow-xl">
                              {tip}
                            </div>
                          )}
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* Legend */}
        <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#252535]">
          {[['green','bg-[#15803D]','On track'],['amber','bg-[#A16207]','At risk'],['red','bg-[#B91C1C]','Off track'],['none','bg-gray-300 dark:bg-gray-600','No submission']].map(([k, cls, lbl]) => (
            <div key={k} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded-[3px] ${cls}`} />
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{lbl}</span>
            </div>
          ))}
        </div>
      </div>
      {/* Summaries */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        {summaries.map(s => (
          <div key={s.name} className="text-xs text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1E1E2E] rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
            <span className="font-semibold text-[#242450] dark:text-white">{s.name}:</span>{' '}
            {s.submitted}/{s.total} weeks submitted. {s.green} green, {s.amber} amber, {s.red} red. Trend: <span className="font-medium">{s.trend}</span>.
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Section 4: Pipeline funnel ───────────────────────────────────────────────

function FunnelSection({ submissions }) {
  const [leads, setLeads] = useState([]);
  const [deals, setDeals] = useState([]);
  const [loaded, setLoaded] = useState(false);

  React.useEffect(() => {
    Promise.all([
      base44.entities.Lead.list(),
      base44.entities.Deal.list(),
    ]).then(([l, d]) => { setLeads(l); setDeals(d); setLoaded(true); });
  }, []);

  const georgeSubs = submissions.filter(s => s.memberName === 'George');
  const totalLeads = georgeSubs.reduce((acc, s) => {
    try { const a = JSON.parse(s.answers || '{}'); return acc + (Number(a['q1']) || 0); } catch { return acc; }
  }, 0);
  const totalMeetings = georgeSubs.reduce((acc, s) => {
    try { const a = JSON.parse(s.answers || '{}'); return acc + (Number(a['q3']) || 0); } catch { return acc; }
  }, 0);
  const demosCount = loaded ? leads.filter(l => ['Demo Booked', 'Discovery Call'].includes(l.stage)).length : 0;
  const proposalsCount = loaded ? leads.filter(l => l.stage === 'Proposal Sent' || l.proposalStatus === 'Sent').length : 0;
  const dealsWon = loaded ? deals.filter(d => d.status === 'Active').length : 0;

  const rameshSubs = submissions.filter(s => s.memberName === 'Ramesh');
  const pipelineAdded = rameshSubs.reduce((acc, s) => {
    try { const a = JSON.parse(s.answers || '{}'); return acc + (Number(a['q1']) || 0); } catch { return acc; }
  }, 0);

  const stages = [
    { label: 'Leads contacted', value: totalLeads, note: "George's new leads this period" },
    { label: 'Meetings booked', value: totalMeetings, note: "George's meetings booked" },
    { label: 'Demos / Discovery', value: demosCount, note: 'Active in pipeline' },
    { label: 'Proposals sent', value: proposalsCount, note: 'Active in pipeline' },
    { label: 'Deals won', value: dealsWon, note: 'Active deals' },
  ];

  const maxVal = Math.max(...stages.map(s => s.value), 1);

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-6">
        <div className="space-y-3">
          {stages.map((s, i) => {
            const pct = (s.value / maxVal) * 100;
            const convLabel = i > 0 && stages[i - 1].value > 0
              ? `${stages[i - 1].label.split(' ')[0]} → ${s.label.split(' ')[0]}: ${((s.value / stages[i - 1].value) * 100).toFixed(1)}%`
              : null;
            return (
              <div key={s.label}>
                {convLabel && <p className="text-[11px] text-gray-400 text-center mb-1">{convLabel}</p>}
                <div className="flex items-center gap-4">
                  <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 w-36 shrink-0">{s.label}</span>
                  <div className="flex-1 h-9 bg-gray-50 dark:bg-[#252535] rounded-lg overflow-hidden flex items-center">
                    <div
                      className="h-full rounded-lg flex items-center px-3 transition-all duration-500"
                      style={{ width: `${Math.max(pct, 4)}%`, background: `hsl(${260 - i * 18}, 80%, ${45 + i * 6}%)` }}
                    >
                      <span className="text-white text-xs font-bold">{s.value}</span>
                    </div>
                  </div>
                  <span className="text-[11px] text-gray-400 w-32 shrink-0">{s.note}</span>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-5 pt-4 border-t border-gray-100 dark:border-gray-700">
          <p className="text-sm text-gray-600 dark:text-gray-300">
            <span className="font-bold text-[#242450] dark:text-white">£{pipelineAdded.toLocaleString('en-GB')}</span> pipeline value generated this period
            <span className="text-gray-400 text-xs ml-2">(from Ramesh's sprint submissions)</span>
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Section 5: Blocker analysis ──────────────────────────────────────────────

function BlockerSection({ submissions, effectiveTo }) {
  const [aiResult, setAiResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [generatedDate, setGeneratedDate] = useState(null);

  const blockerFields = {
    'Chris Carter': ['q4', 'q5', 'q9'],
    'Ramesh': [],
    'Elena Brouckaert': ['q6'],
    'George': ['q4'],
    'Martinique': ['q4'],
    'Sreeja': ['q4'],
  };

  const allBlockers = [];
  submissions.forEach(s => {
    const fields = blockerFields[s.memberName] || [];
    try {
      const answers = JSON.parse(s.answers || '{}');
      fields.forEach(fid => {
        const val = answers[fid];
        if (val && typeof val === 'string' && val.trim().length > 5) {
          allBlockers.push({ name: s.memberName.split(' ')[0], week: s.weekStart, text: val.trim() });
        }
      });
    } catch {}
  });
  allBlockers.sort((a, b) => b.week.localeCompare(a.week));

  const runAI = async () => {
    if (allBlockers.length === 0) return;
    setLoading(true);
    const prompt = `You are an operations analyst reviewing a team's weekly sprint submissions. Here are all the blocker/notes entries from the team this period:\n\n${allBlockers.map(b => `- ${b.name} (week ${b.week}): "${b.text}"`).join('\n')}\n\nProvide:\n1. Top 2-3 recurring themes across the team (be specific, reference names)\n2. Who has the most unresolved blockers\n3. One concrete recommended action for the CEO\n\nKeep it concise — 3–4 sentences total. Start directly with the analysis.`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setAiResult(result);
    setGeneratedDate(new Date().toLocaleString('en-GB', { dateStyle: 'short', timeStyle: 'short' }));
    setLoading(false);
  };

  return (
    <div className="mb-8 space-y-4">
      {/* Blocker list */}
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-[#252535]">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">Blocker Entries This Period ({allBlockers.length})</p>
        </div>
        {allBlockers.length === 0 ? (
          <p className="px-4 py-4 text-sm text-gray-400 italic">No blocker entries found in this period.</p>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-gray-800 max-h-64 overflow-y-auto">
            {allBlockers.map((b, i) => (
              <div key={i} className="px-4 py-3 flex gap-3">
                <span className="text-[11px] font-bold text-[#8403C5] w-16 shrink-0">{b.name}</span>
                <span className="text-[11px] text-gray-400 w-16 shrink-0">{format(parseISO(b.week), 'd MMM')}</span>
                <p className="text-xs text-gray-600 dark:text-gray-300 flex-1">"{b.text}"</p>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* AI analysis */}
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-[#8403C5]/20 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#8403C5]/10 bg-[#FAFBFE] dark:bg-[#1a1a2e] flex items-center justify-between">
          <p className="text-xs font-bold text-[#8403C5] uppercase tracking-wide">✨ AI Blocker Analysis</p>
          <div className="flex items-center gap-3">
            {generatedDate && <span className="text-[10px] text-gray-400">Generated {generatedDate}</span>}
            <button
              onClick={runAI}
              disabled={loading || allBlockers.length === 0}
              className="flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] disabled:opacity-40"
            >
              <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Analysing…' : aiResult ? 'Regenerate' : 'Generate analysis'}
            </button>
          </div>
        </div>
        <div className="px-4 py-4">
          {!aiResult && !loading && (
            <p className="text-sm text-gray-400 italic">Click "Generate analysis" to get AI-powered insights on team blockers.</p>
          )}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <RefreshCw className="w-4 h-4 animate-spin text-[#8403C5]" />
              Analysing {allBlockers.length} blocker entries…
            </div>
          )}
          {aiResult && !loading && (
            <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">{aiResult}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Section 6: Submission consistency table ──────────────────────────────────

function ConsistencySection({ submissions, weeks }) {
  const rows = MEMBERS.map(m => {
    const memberSubs = submissions.filter(s => s.memberName === m.name);
    const submitted = memberSubs.length;
    const missed = weeks.length - submitted;
    const rate = weeks.length > 0 ? Math.round((submitted / weeks.length) * 100) : 0;

    // Streak: consecutive most-recent weeks submitted
    const sorted = [...weeks].reverse();
    let streak = 0;
    for (const w of sorted) {
      if (memberSubs.some(s => s.weekStart === w)) streak++;
      else break;
    }

    return { name: m.name.split(' ')[0], weeks: weeks.length, submitted, missed, rate, streak };
  }).sort((a, b) => b.rate - a.rate);

  return (
    <div className="mb-8">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-[#252535] border-b border-gray-100 dark:border-gray-700">
            <tr>
              {['Team member', 'Weeks in period', 'Submitted', 'Missed', 'Rate', 'Current streak'].map(h => (
                <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {rows.map(r => (
              <tr key={r.name} className="hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors">
                <td className="px-4 py-3 font-semibold text-[#242450] dark:text-white">{r.name}</td>
                <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{r.weeks}</td>
                <td className="px-4 py-3 text-green-600 font-medium">{r.submitted}</td>
                <td className="px-4 py-3 text-red-500 font-medium">{r.missed}</td>
                <td className="px-4 py-3">
                  <span className={`font-bold ${r.rate >= 80 ? 'text-green-600' : r.rate >= 50 ? 'text-amber-600' : 'text-red-500'}`}>{r.rate}%</span>
                </td>
                <td className="px-4 py-3">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${r.streak >= 3 ? 'bg-green-50 text-green-700' : r.streak >= 1 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                    {r.streak === 0 ? '—' : `${r.streak} week${r.streak !== 1 ? 's' : ''}`}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="px-4 py-3 text-[11px] text-gray-400 bg-gray-50 dark:bg-[#252535] border-t border-gray-100 dark:border-gray-700">
          Updates should be submitted every Monday. Late submissions still count but affect the punctuality score.
        </p>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function SprintAnalytics({ submissions, effectiveFrom, effectiveTo, preset, allSubmissions }) {
  const weeks = getWeeks(submissions, effectiveFrom, effectiveTo);

  const periodLen = parseInt(preset || '4');
  const prevFrom = subWeeks(effectiveFrom, isNaN(periodLen) ? 4 : periodLen);
  const prevSubs = allSubmissions.filter(s => s.weekStart >= prevFrom && s.weekStart < effectiveFrom);

  const exportCSV = () => {
    const rows = [['Member', 'Week', 'KPI1', 'KPI1 Value', 'KPI2', 'KPI2 Value', 'Submitted']];
    MEMBERS.forEach(m => {
      weeks.forEach(w => {
        const sub = submissions.find(s => s.memberName === m.name && s.weekStart === w);
        rows.push([m.name, w, m.kpi1.label, sub?.kpi1Value ?? '', m.kpi2.label, sub?.kpi2Value ?? '', sub ? 'Yes' : 'No']);
      });
    });
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'sprint-analytics.csv'; a.click();
  };

  const hasEnoughData = submissions.length > 0 && weeks.length >= 1;

  if (!hasEnoughData) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="text-5xl mb-4">📊</div>
        <h3 className="text-lg font-bold text-[#242450] dark:text-white mb-2">Not enough data yet</h3>
        <p className="text-sm text-gray-400 max-w-md">Not enough submissions yet to show analytics. Keep submitting weekly updates — analytics become meaningful after 3+ weeks of data.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#242450] dark:text-white">Team Analytics</h1>
          <p className="text-xs text-gray-400 mt-0.5">Performance trends and insights across the team</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-white border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 transition-colors bg-white dark:bg-[#1E1E2E]">
          <Download className="w-3.5 h-3.5" /> Export Analytics CSV
        </button>
      </div>

      {/* S1 */}
      <SectionHeading>Team Performance Overview</SectionHeading>
      <OverviewSection submissions={submissions} effectiveFrom={effectiveFrom} effectiveTo={effectiveTo} prevSubs={prevSubs} periodWeeks={periodLen} />

      {/* S2 */}
      <SectionHeading>Individual Performance Trends</SectionHeading>
      <TrendsSection submissions={submissions} weeks={weeks} />

      {/* S3 */}
      <SectionHeading>KPI Heat Map</SectionHeading>
      <HeatMapSection submissions={submissions} weeks={weeks} />

      {/* S4 */}
      <SectionHeading>Pipeline & Activity Funnel</SectionHeading>
      <FunnelSection submissions={submissions} />

      {/* S5 */}
      <SectionHeading>Blocker Analysis</SectionHeading>
      <BlockerSection submissions={submissions} effectiveTo={effectiveTo} />

      {/* S6 */}
      <SectionHeading>Submission Consistency</SectionHeading>
      <ConsistencySection submissions={submissions} weeks={weeks} />
    </div>
  );
}