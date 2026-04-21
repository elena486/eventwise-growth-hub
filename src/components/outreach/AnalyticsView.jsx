import React, { useState, useMemo } from 'react';
import { Download } from 'lucide-react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import {
  calcPerformanceScore, calcPositiveReplyRate, calcMeetingConversionRate,
  getVerdict, getAssetVerdict, fmtPct, exportCSV
} from './OutreachHelpers';
import { format, subDays, subMonths, startOfYear } from 'date-fns';

const COLORS = { navy: '#242450', purple: '#8403C5', steel: '#5777AB', green: '#1D9E75' };

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-ew-border rounded-xl p-5">
      <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-1">{label}</p>
      <p className="text-3xl font-bold text-navy">{value}</p>
      {sub && <p className="text-xs text-ew-muted mt-0.5">{sub}</p>}
    </div>
  );
}

function SortableTh({ children, onClick, sorted, dir }) {
  return (
    <th onClick={onClick}
      className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] cursor-pointer hover:text-navy select-none whitespace-nowrap">
      {children}{sorted ? (dir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  );
}

function avg(arr, key) {
  const valid = arr.filter(c => c[key] != null && !isNaN(c[key]));
  if (!valid.length) return null;
  return valid.reduce((s, c) => s + parseFloat(c[key]), 0) / valid.length;
}

const DATE_PRESETS = ['Last 30 days', 'Last 90 days', 'This year', 'All time'];

export default function AnalyticsView({ campaigns }) {
  const [datePreset, setDatePreset] = useState('All time');
  const [subjectSort, setSubjectSort] = useState('score');
  const [subjectSortDir, setSubjectSortDir] = useState(-1);
  const [subjectFilter, setSubjectFilter] = useState('All');
  const [assetSort, setAssetSort] = useState('avgClick');
  const [assetSortDir, setAssetSortDir] = useState(-1);

  const sortSubject = (col) => {
    if (subjectSort === col) setSubjectSortDir(d => d * -1);
    else { setSubjectSort(col); setSubjectSortDir(-1); }
  };
  const sortAsset = (col) => {
    if (assetSort === col) setAssetSortDir(d => d * -1);
    else { setAssetSort(col); setAssetSortDir(-1); }
  };

  const filtered = useMemo(() => {
    const now = new Date();
    return campaigns.filter(c => {
      if (!c.launchDate || datePreset === 'All time') return true;
      const d = new Date(c.launchDate);
      if (datePreset === 'Last 30 days') return d >= subDays(now, 30);
      if (datePreset === 'Last 90 days') return d >= subDays(now, 90);
      if (datePreset === 'This year') return d >= startOfYear(now);
      return true;
    });
  }, [campaigns, datePreset]);

  const totalSent = filtered.reduce((s, c) => s + (parseFloat(c.emailsSent) || 0), 0);
  const avgOpen = avg(filtered, 'openRate');
  const avgPRR = filtered.length ? filtered.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / filtered.length : null;
  const totalMeetings = filtered.reduce((s, c) => s + (parseFloat(c.meetingsBooked) || 0), 0);

  // Subject line leaderboard
  const subjectRows = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const key = c.subjectLine || '(no subject)';
      if (!map[key]) {
        map[key] = { subjectLine: key, audience: c.audienceSegment, campaigns: [] };
      }
      map[key].campaigns.push(c);
    });
    return Object.values(map).map(g => {
      const cs = g.campaigns;
      const openRate = avg(cs, 'openRate') ?? 0;
      const clickRate = avg(cs, 'clickRate') ?? 0;
      const prr = cs.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / cs.length;
      const mcr = cs.reduce((s, c) => s + calcMeetingConversionRate(c), 0) / cs.length;
      const synthetic = { openRate, clickRate, emailsSent: 100, positiveReplies: prr, meetingsBooked: mcr };
      const score = calcPerformanceScore(synthetic);
      return { ...g, openRate, clickRate, prr, mcr, score };
    });
  }, [filtered]);

  let sortedSubjects = [...subjectRows];
  if (subjectFilter === 'Winners only') sortedSubjects = sortedSubjects.filter(s => s.score >= 8);
  if (subjectFilter === 'Kill list') sortedSubjects = sortedSubjects.filter(s => s.score < 4);
  sortedSubjects = sortedSubjects.sort((a, b) => subjectSortDir * ((b[subjectSort] ?? 0) - (a[subjectSort] ?? 0)));

  // Asset performance
  const assetRows = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const key = c.assetUsed || 'None';
      if (!map[key]) map[key] = { asset: key, campaigns: [] };
      map[key].campaigns.push(c);
    });
    return Object.values(map).map(g => {
      const cs = g.campaigns;
      const avgOpen = avg(cs, 'openRate') ?? 0;
      const avgClick = avg(cs, 'clickRate') ?? 0;
      const avgPRR = cs.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / cs.length;
      const avgMeetings = avg(cs, 'meetingsBooked') ?? 0;
      const avgMCR = cs.reduce((s, c) => s + calcMeetingConversionRate(c), 0) / cs.length;
      return { asset: g.asset, timesUsed: cs.length, avgOpen, avgClick, avgPRR, avgMeetings, verdict: getAssetVerdict(avgClick, avgMCR) };
    });
  }, [filtered]);

  let sortedAssets = [...assetRows].sort((a, b) => assetSortDir * ((b[assetSort] ?? 0) - (a[assetSort] ?? 0)));

  // Trend chart data
  const trendData = useMemo(() => {
    return filtered
      .filter(c => c.launchDate)
      .sort((a, b) => a.launchDate > b.launchDate ? 1 : -1)
      .map(c => ({
        date: c.launchDate,
        label: format(new Date(c.launchDate), 'd MMM'),
        openRate: parseFloat(c.openRate) || null,
        prr: calcPositiveReplyRate(c),
        meetings: parseFloat(c.meetingsBooked) || null,
        campaignName: c.campaignName,
        subjectLine: c.subjectLine,
        audience: c.audienceSegment,
      }));
  }, [filtered]);

  const avgOpenLine = trendData.filter(d => d.openRate != null).reduce((s, d) => s + d.openRate, 0) / (trendData.filter(d => d.openRate != null).length || 1);

  // Audience comparison
  const audienceRows = ['Events', 'Agencies', 'Suppliers', 'Mixed'].map(seg => {
    const cs = filtered.filter(c => c.audienceSegment === seg);
    if (!cs.length) return null;
    return {
      segment: seg,
      count: cs.length,
      avgOpen: avg(cs, 'openRate'),
      avgClick: avg(cs, 'clickRate'),
      avgPRR: cs.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / cs.length,
      totalMeetings: cs.reduce((s, c) => s + (parseFloat(c.meetingsBooked) || 0), 0),
    };
  }).filter(Boolean);

  // A/B test groups
  const abGroups = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const key = `${c.campaignName}||${c.touchPoint}`;
      if (!map[key]) map[key] = [];
      map[key].push(c);
    });
    return Object.values(map).filter(g => g.length > 1);
  }, [filtered]);

  const csvCols = [
    { label: 'Subject Line', key: 'subjectLine' },
    { label: 'Audience', key: 'audience' },
    { label: 'Open Rate %', key: 'openRate' },
    { label: 'Click Rate %', key: 'clickRate' },
    { label: 'Positive Reply Rate %', key: 'prr' },
    { label: 'Meeting Conv %', key: 'mcr' },
    { label: 'Score', key: 'score' },
  ];

  const CustomTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const d = payload[0]?.payload;
    return (
      <div className="bg-white border border-ew-border rounded-lg shadow-lg p-3 text-xs max-w-[200px]">
        <p className="font-bold text-navy mb-1">{d.campaignName}</p>
        {d.subjectLine && <p className="text-ew-muted mb-1 italic">"{d.subjectLine}"</p>}
        <p className="text-ew-muted">{d.audience}</p>
        {payload.map((p, i) => (
          <p key={i} className="font-semibold mt-1" style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}{p.name?.includes('%') || p.name?.includes('rate') ? '%' : ''}</p>
        ))}
      </div>
    );
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ew-muted text-sm italic">No campaign data yet. George can add campaigns in the Input view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Date filter */}
      <div className="flex items-center gap-2">
        {DATE_PRESETS.map(p => (
          <button key={p} onClick={() => setDatePreset(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${datePreset === p ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
            {p}
          </button>
        ))}
      </div>

      {/* SECTION 1 — Overview */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Overview</h2>
        <div className="grid grid-cols-4 gap-4">
          <StatCard label="Total emails sent" value={totalSent.toLocaleString('en-GB')} />
          <StatCard label="Avg open rate" value={avgOpen != null ? fmtPct(avgOpen) : '—'} />
          <StatCard label="Avg positive reply rate" value={avgPRR != null ? fmtPct(avgPRR) : '—'} />
          <StatCard label="Total meetings booked" value={totalMeetings} />
        </div>
      </div>

      {/* SECTION 2 — Subject Line Leaderboard */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-navy">Subject Line Leaderboard</h2>
          <div className="flex items-center gap-2">
            {['All','Winners only','Kill list'].map(f => (
              <button key={f} onClick={() => setSubjectFilter(f)}
                className={`px-3 py-1 text-xs font-medium rounded-lg border transition-colors ${subjectFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
                {f}
              </button>
            ))}
            <button onClick={() => exportCSV(sortedSubjects, csvCols, 'subject-leaderboard.csv')}
              className="flex items-center gap-1 px-3 py-1 text-xs font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Rank</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Subject line</th>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Audience</th>
                <SortableTh onClick={() => sortSubject('openRate')} sorted={subjectSort === 'openRate'} dir={subjectSortDir}>Open %</SortableTh>
                <SortableTh onClick={() => sortSubject('clickRate')} sorted={subjectSort === 'clickRate'} dir={subjectSortDir}>Click %</SortableTh>
                <SortableTh onClick={() => sortSubject('prr')} sorted={subjectSort === 'prr'} dir={subjectSortDir}>+Reply %</SortableTh>
                <SortableTh onClick={() => sortSubject('mcr')} sorted={subjectSort === 'mcr'} dir={subjectSortDir}>Meeting %</SortableTh>
                <SortableTh onClick={() => sortSubject('score')} sorted={subjectSort === 'score'} dir={subjectSortDir}>Score</SortableTh>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sortedSubjects.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-sm text-ew-muted italic">No subject lines match this filter.</td></tr>
              )}
              {sortedSubjects.map((s, i) => {
                const verdict = getVerdict(s.score);
                return (
                  <tr key={s.subjectLine} className={`border-b border-ew-border ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    <td className="px-3 py-3 text-xs font-bold text-ew-muted">#{i + 1}</td>
                    <td className="px-3 py-3 max-w-[260px]">
                      <p className="text-sm font-semibold text-navy">{s.subjectLine}</p>
                    </td>
                    <td className="px-3 py-3 text-xs text-ew-body">{s.audience || '—'}</td>
                    <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(s.openRate)}</td>
                    <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(s.clickRate)}</td>
                    <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(s.prr)}</td>
                    <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(s.mcr)}</td>
                    <td className="px-3 py-3">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${verdict.cls}`}>{s.score.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${verdict.cls}`}>{verdict.label}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3 — Asset Performance */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Asset Performance</h2>
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Asset</th>
                <SortableTh onClick={() => sortAsset('timesUsed')} sorted={assetSort === 'timesUsed'} dir={assetSortDir}>Times used</SortableTh>
                <SortableTh onClick={() => sortAsset('avgOpen')} sorted={assetSort === 'avgOpen'} dir={assetSortDir}>Avg open %</SortableTh>
                <SortableTh onClick={() => sortAsset('avgClick')} sorted={assetSort === 'avgClick'} dir={assetSortDir}>Avg click %</SortableTh>
                <SortableTh onClick={() => sortAsset('avgPRR')} sorted={assetSort === 'avgPRR'} dir={assetSortDir}>Avg +reply %</SortableTh>
                <SortableTh onClick={() => sortAsset('avgMeetings')} sorted={assetSort === 'avgMeetings'} dir={assetSortDir}>Avg meetings</SortableTh>
                <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {sortedAssets.map((a, i) => (
                <tr key={a.asset} className={`border-b border-ew-border ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                  <td className="px-3 py-3 font-semibold text-navy">{a.asset}</td>
                  <td className="px-3 py-3 text-xs text-ew-body">{a.timesUsed}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(a.avgOpen)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(a.avgClick)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(a.avgPRR)}</td>
                  <td className="px-3 py-3 text-xs font-medium text-navy">{a.avgMeetings.toFixed(1)}</td>
                  <td className="px-3 py-3">
                    <span className={`text-[11px] font-semibold px-2 py-1 rounded-lg ${a.verdict.cls}`}>{a.verdict.label}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4 — Trend Charts */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-4">Trend Charts</h2>
        {trendData.length < 2 ? (
          <p className="text-sm text-ew-muted italic">Need at least 2 campaigns with launch dates to show trends.</p>
        ) : (
          <div className="space-y-5">
            {[
              { title: 'Open Rate % over time', key: 'openRate', color: COLORS.navy, showAvg: true },
              { title: 'Positive Reply Rate % over time', key: 'prr', color: COLORS.purple },
              { title: 'Meetings booked per campaign', key: 'meetings', color: COLORS.green },
            ].map(chart => (
              <div key={chart.key} className="bg-white border border-ew-border rounded-xl p-5">
                <p className="text-xs font-semibold text-ew-body mb-4">{chart.title}</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    {chart.showAvg && <ReferenceLine y={avgOpenLine} stroke={COLORS.steel} strokeDasharray="6 3" label={{ value: 'avg', fontSize: 10, fill: COLORS.steel }} />}
                    <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={{ r: 3, fill: chart.color }} connectNulls name={chart.title} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}

        {/* Audience comparison */}
        {audienceRows.length > 0 && (
          <div className="mt-5">
            <h3 className="text-xs font-bold text-navy mb-3">Audience Comparison</h3>
            <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-ew-footer border-b border-ew-border">
                  <tr>
                    {['Audience', 'Campaigns', 'Avg open %', 'Avg click %', 'Avg +reply %', 'Total meetings'].map(h => (
                      <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {audienceRows.map((r, i) => (
                    <tr key={r.segment} className={`border-b border-ew-border ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                      <td className="px-3 py-3 font-semibold text-navy">{r.segment}</td>
                      <td className="px-3 py-3 text-xs text-ew-body">{r.count}</td>
                      <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(r.avgOpen)}</td>
                      <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(r.avgClick)}</td>
                      <td className="px-3 py-3 text-xs font-medium text-navy">{fmtPct(r.avgPRR)}</td>
                      <td className="px-3 py-3 text-xs font-medium text-navy">{r.totalMeetings}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 5 — A/B Test Comparison */}
      {abGroups.length > 0 && (
        <div>
          <h2 className="text-sm font-bold text-navy mb-4">A/B Test Comparison</h2>
          <div className="space-y-4">
            {abGroups.map((group, gi) => {
              const sorted = [...group].sort((a, b) => calcPositiveReplyRate(b) - calcPositiveReplyRate(a));
              const winner = sorted[0];
              return (
                <div key={gi} className="bg-white border border-ew-border rounded-xl p-5">
                  <p className="text-xs font-bold text-navy mb-4">{group[0].campaignName} — {group[0].touchPoint}</p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${sorted.length}, 1fr)` }}>
                    {sorted.map(c => {
                      const prr = calcPositiveReplyRate(c);
                      const mcr = calcMeetingConversionRate(c);
                      const score = calcPerformanceScore(c);
                      const isWinner = c.id === winner.id;
                      return (
                        <div key={c.id} className={`rounded-xl p-4 border-2 relative ${isWinner ? 'border-green-400 bg-green-50' : 'border-ew-border bg-[#FAFBFE]'}`}>
                          {isWinner && (
                            <span className="absolute -top-2.5 left-4 text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">🏆 Winner</span>
                          )}
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">Variant {c.variant}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${score >= 6 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{score.toFixed(1)}/10</span>
                          </div>
                          <p className="text-sm font-semibold text-navy mb-3">"{c.subjectLine || '(no subject)'}"</p>
                          {c.subjectLineNotes && <p className="text-xs text-ew-muted mb-3 italic">{c.subjectLineNotes}</p>}
                          <div className="space-y-1 text-xs">
                            <div className="flex justify-between"><span className="text-ew-muted">Open rate</span><span className="font-medium text-navy">{fmtPct(c.openRate)}</span></div>
                            <div className="flex justify-between"><span className="text-ew-muted">Click rate</span><span className="font-medium text-navy">{fmtPct(c.clickRate)}</span></div>
                            <div className="flex justify-between"><span className="text-ew-muted">+Reply rate</span><span className="font-bold text-[#8403C5]">{fmtPct(prr)}</span></div>
                            <div className="flex justify-between"><span className="text-ew-muted">Meeting conv.</span><span className="font-medium text-navy">{fmtPct(mcr)}</span></div>
                            <div className="flex justify-between"><span className="text-ew-muted">Meetings booked</span><span className="font-medium text-navy">{c.meetingsBooked ?? '—'}</span></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}