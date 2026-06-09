import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Download, Calendar, Sparkles, RefreshCw, ChevronDown, ChevronUp, Search } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, LineChart, Line
} from 'recharts';
import {
  calcPerformanceScore, calcPositiveReplyRate, calcMeetingConversionRate,
  getVerdict, getAssetVerdict, fmtPct, exportCSV
} from './OutreachHelpers';
import { format, subDays, startOfYear } from 'date-fns';
import { base44 } from '@/api/base44Client';

const COLORS = { navy: '#242450', purple: '#8403C5', steel: '#5777AB', green: '#1D9E75' };
const MEDAL_COLORS = ['#F59E0B', '#9CA3AF', '#CD7F32'];

function StatCard({ label, value, sub, badge }) {
  return (
    <div className="bg-white border border-ew-border rounded-xl p-5">
      <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-1">{label}</p>
      <p className="text-3xl font-bold text-navy">{value}</p>
      {badge && (
        <span className={`inline-block mt-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${badge.cls}`}>{badge.label}</span>
      )}
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

// ─── AI Insights Panel ───────────────────────────────────────────────────────
function AIInsightsPanel({ campaigns }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(false);
  const fetchedRef = useRef(false);

  const fetchInsights = async () => {
    if (!campaigns.length) return;
    setLoading(true);
    try {
      const summary = campaigns.map(c => ({
        name: c.campaignName,
        audience: c.audienceSegment,
        tp: c.touchPoint,
        variant: c.variant,
        sent: c.emailsSent,
        open: c.openRate,
        click: c.clickRate,
        replies: c.positiveReplies,
        meetings: c.meetingsBooked,
        subject: c.subjectLine,
        asset: c.assetUsed,
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an outreach analytics expert. Analyse this cold email campaign data and return exactly 4 concise, actionable insights. Focus on patterns between audience segments, subject line formats, touch points, and assets. Be specific with numbers where possible.

Campaign data: ${JSON.stringify(summary)}

Return a JSON object with key "insights" containing an array of exactly 4 objects, each with:
- "icon": one emoji
- "headline": bold 6-10 word summary
- "detail": 1-2 sentences of specific actionable analysis with numbers

Focus on: audience segment differences, subject line patterns, TP sequence performance, asset effectiveness, and gaps between open/click rates vs reply rates.`,
        response_json_schema: {
          type: 'object',
          properties: {
            insights: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  icon: { type: 'string' },
                  headline: { type: 'string' },
                  detail: { type: 'string' },
                },
              },
            },
          },
        },
      });
      setInsights(result.insights || []);
    } catch (e) {
      setInsights([]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (!fetchedRef.current && campaigns.length > 0) {
      fetchedRef.current = true;
      fetchInsights();
    }
  }, [campaigns.length]);

  return (
    <div className="bg-gradient-to-br from-[#F3E8FF] to-[#EEF2FF] border border-[#8403C5]/20 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-navy flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[#8403C5]" /> Campaign Intelligence
          </h2>
          <p className="text-[11px] text-ew-muted mt-0.5">✨ AI analysis — based on {campaigns.length} campaign{campaigns.length !== 1 ? 's' : ''}</p>
        </div>
        <button onClick={fetchInsights} disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#8403C5]/30 text-[#8403C5] rounded-lg hover:bg-[#F3E8FF] transition-colors disabled:opacity-50">
          <RefreshCw className={`w-3 h-3 ${loading ? 'animate-spin' : ''}`} />
          Regenerate insights
        </button>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white/70 rounded-xl p-4 animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
              <div className="h-3 bg-gray-100 rounded w-full mb-1" />
              <div className="h-3 bg-gray-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      )}

      {!loading && insights && insights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {insights.map((ins, i) => (
            <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
              <p className="text-2xl mb-2">{ins.icon}</p>
              <p className="text-sm font-bold text-navy mb-1 leading-snug">{ins.headline}</p>
              <p className="text-xs text-ew-body leading-relaxed">{ins.detail}</p>
            </div>
          ))}
        </div>
      )}

      {!loading && insights && insights.length === 0 && (
        <p className="text-sm text-ew-muted italic">Could not generate insights. Try again.</p>
      )}

      {!loading && !insights && (
        <p className="text-sm text-ew-muted italic">Loading analysis…</p>
      )}
    </div>
  );
}

// ─── Subject Line Leaderboard ────────────────────────────────────────────────
function SubjectLeaderboard({ rows, onExport }) {
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [tpFilter, setTpFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [expandedRow, setExpandedRow] = useState(null);
  const [sortCol, setSortCol] = useState('score');
  const [sortDir, setSortDir] = useState(-1);

  const sortToggle = (col) => {
    if (sortCol === col) setSortDir(d => d * -1);
    else { setSortCol(col); setSortDir(-1); }
  };

  const filtered = useMemo(() => {
    let r = [...rows];
    if (audienceFilter !== 'All') r = r.filter(s => s.campaigns.some(c => c.audienceSegment === audienceFilter));
    if (tpFilter !== 'All') r = r.filter(s => s.campaigns.some(c => c.touchPoint === tpFilter));
    if (search.trim()) r = r.filter(s => s.subjectLine.toLowerCase().includes(search.toLowerCase()));
    r.sort((a, b) => sortDir * ((b[sortCol] ?? 0) - (a[sortCol] ?? 0)));
    return r;
  }, [rows, audienceFilter, tpFilter, search, sortCol, sortDir]);

  const maxOpen = Math.max(...filtered.map(s => s.openRate), 1);

  const getBestMetric = (s) => {
    const metrics = [
      { label: `Open ${fmtPct(s.openRate)}`, val: s.openRate / 80 },
      { label: `Click ${fmtPct(s.clickRate)}`, val: s.clickRate / 40 },
      { label: `Reply ${fmtPct(s.prr)}`, val: s.prr / 5 },
    ];
    return metrics.sort((a, b) => b.val - a.val)[0].label;
  };

  const allTPs = ['All', ...Array.from(new Set(rows.flatMap(r => r.campaigns.map(c => c.touchPoint)).filter(Boolean))).sort()];

  return (
    <div>
      {/* Filters */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3 h-3 text-ew-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search subject lines…"
            className="w-full pl-7 pr-3 py-1.5 text-xs border border-ew-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20" />
        </div>
        <div className="flex items-center gap-1">
          {['All', 'Events', 'Agencies'].map(f => (
            <button key={f} onClick={() => setAudienceFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${audienceFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {allTPs.map(f => (
            <button key={f} onClick={() => setTpFilter(f)}
              className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${tpFilter === f ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
        </div>
        <button onClick={() => onExport(filtered)} className="ml-auto flex items-center gap-1 px-3 py-1.5 text-xs font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg">
          <Download className="w-3 h-3" /> CSV
        </button>
      </div>

      <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
        {filtered.length === 0 ? (
          <p className="px-4 py-12 text-center text-sm text-ew-muted italic">No subject lines match this filter.</p>
        ) : (
          <div>
            {/* Header */}
            <div className="grid grid-cols-[28px_1fr_90px_100px_100px_90px_80px_90px] gap-0 bg-ew-footer border-b border-ew-border px-4 py-2">
              <span className="text-[10px] font-semibold text-ew-muted uppercase">#</span>
              <span className="text-[10px] font-semibold text-ew-muted uppercase">Subject line</span>
              <button onClick={() => sortToggle('emailsSent')} className="text-[10px] font-semibold text-ew-muted uppercase text-right hover:text-navy">Sent {sortCol==='emailsSent' ? (sortDir===-1?'↓':'↑') : ''}</button>
              <button onClick={() => sortToggle('openRate')} className="text-[10px] font-semibold text-ew-muted uppercase text-right hover:text-navy">Open % {sortCol==='openRate' ? (sortDir===-1?'↓':'↑') : ''}</button>
              <button onClick={() => sortToggle('clickRate')} className="text-[10px] font-semibold text-ew-muted uppercase text-right hover:text-navy">Click % {sortCol==='clickRate' ? (sortDir===-1?'↓':'↑') : ''}</button>
              <button onClick={() => sortToggle('prr')} className="text-[10px] font-semibold text-ew-muted uppercase text-right hover:text-navy">+Reply {sortCol==='prr' ? (sortDir===-1?'↓':'↑') : ''}</button>
              <button onClick={() => sortToggle('score')} className="text-[10px] font-semibold text-ew-muted uppercase text-right hover:text-navy">Score {sortCol==='score' ? (sortDir===-1?'↓':'↑') : ''}</button>
              <span className="text-[10px] font-semibold text-ew-muted uppercase text-right">Verdict</span>
            </div>

            {filtered.map((s, i) => {
              const verdict = getVerdict(s.score);
              const barPct = (s.openRate / maxOpen) * 100;
              const bestMetric = getBestMetric(s);
              const medalColor = i < 3 ? MEDAL_COLORS[i] : null;
              const isExpanded = expandedRow === s.subjectLine;
              const totalSent = s.campaigns.reduce((sum, c) => sum + (parseFloat(c.emailsSent) || 0), 0);

              return (
                <div key={s.subjectLine} className="border-b border-ew-border last:border-0">
                  {/* Main row */}
                  <div
                    onClick={() => setExpandedRow(isExpanded ? null : s.subjectLine)}
                    className={`grid grid-cols-[28px_1fr_90px_100px_100px_90px_80px_90px] gap-0 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'} relative`}
                    style={medalColor ? { borderLeft: `3px solid ${medalColor}` } : { paddingLeft: '19px' }}
                  >
                    <span className="text-xs font-bold text-ew-muted self-center">{i + 1}</span>
                    <div className="min-w-0 pr-4 self-center">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-navy truncate">{s.subjectLine}</p>
                        <span className="shrink-0 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1D4ED8]">Best: {bestMetric}</span>
                      </div>
                      {/* Open rate bar */}
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden max-w-[180px]">
                          <div className="h-full rounded-full bg-[#8403C5] transition-all" style={{ width: `${barPct}%` }} />
                        </div>
                        <span className="text-[10px] text-ew-muted">{s.audience || '—'}</span>
                      </div>
                    </div>
                    <span className="text-xs text-ew-muted self-center text-right">{totalSent.toLocaleString()}</span>
                    <span className="text-xs font-semibold text-navy self-center text-right">{fmtPct(s.openRate)}</span>
                    <span className="text-xs font-semibold text-navy self-center text-right">{fmtPct(s.clickRate)}</span>
                    <span className="text-xs font-semibold text-navy self-center text-right">{fmtPct(s.prr)}</span>
                    <span className={`text-xs font-bold self-center text-right px-1.5 py-0.5 rounded-full ${verdict.cls}`}>{s.score.toFixed(1)}</span>
                    <div className="self-center text-right">
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-lg ${verdict.cls}`}>{verdict.label.split(' ').slice(0, 2).join(' ')}</span>
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="px-4 py-4 bg-[#F3E8FF]/30 border-t border-[#8403C5]/10">
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                        {s.campaigns.map((c, ci) => (
                          <div key={ci} className="bg-white rounded-lg border border-ew-border p-3 text-xs">
                            <p className="font-semibold text-navy mb-1">{c.campaignName}</p>
                            <div className="space-y-0.5 text-ew-muted">
                              <p>Audience: <span className="text-navy">{c.audienceSegment}</span></p>
                              <p>TP: <span className="text-navy">{c.touchPoint}</span> · Variant: <span className="text-navy">{c.variant}</span></p>
                              {c.launchDate && <p>Launched: <span className="text-navy">{format(new Date(c.launchDate), 'd MMM yyyy')}</span></p>}
                              <p>Sent: <span className="text-navy">{(parseFloat(c.emailsSent) || 0).toLocaleString()}</span></p>
                            </div>
                            {/* Mini metric bar chart */}
                            <div className="mt-2 space-y-1">
                              {[
                                { label: 'Open', val: parseFloat(c.openRate) || 0, max: 80, color: '#8403C5' },
                                { label: 'Click', val: parseFloat(c.clickRate) || 0, max: 40, color: '#5777AB' },
                                { label: '+Reply', val: calcPositiveReplyRate(c), max: 5, color: '#1D9E75' },
                              ].map(m => (
                                <div key={m.label} className="flex items-center gap-2">
                                  <span className="w-10 text-[10px] text-ew-muted">{m.label}</span>
                                  <div className="flex-1 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full" style={{ width: `${Math.min(m.val / m.max * 100, 100)}%`, background: m.color }} />
                                  </div>
                                  <span className="text-[10px] font-medium text-navy w-10 text-right">{m.val.toFixed(1)}%</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Asset Performance ───────────────────────────────────────────────────────
function AssetTable({ campaigns, salesAssets }) {
  const [sortCol, setSortCol] = useState('avgClick');
  const [sortDir, setSortDir] = useState(-1);

  const sortToggle = (col) => {
    if (sortCol === col) setSortDir(d => d * -1);
    else { setSortCol(col); setSortDir(-1); }
  };

  // Resolve asset name from URL using salesAssets list
  const resolveAssetName = (rawValue) => {
    if (!rawValue || rawValue === 'None') return rawValue;
    // Try to match by URL
    const match = salesAssets?.find(a => a.url === rawValue || a.fileUrl === rawValue || (a.fileUrl && JSON.parse(a.fileUrl || '[]').some?.((f) => f.url === rawValue)));
    if (match) return match.title;
    return rawValue;
  };

  const rows = useMemo(() => {
    const map = {};
    campaigns.forEach(c => {
      const rawKey = c.assetUsed || 'None';
      const resolvedName = resolveAssetName(rawKey);
      // Deduplicate by resolved name
      if (!map[resolvedName]) map[resolvedName] = { asset: resolvedName, rawKey, campaigns: [] };
      map[resolvedName].campaigns.push(c);
    });
    return Object.values(map).map(g => {
      const cs = g.campaigns;
      const avgOpenV = avg(cs, 'openRate') ?? 0;
      const avgClick = avg(cs, 'clickRate') ?? 0;
      const avgPRR = cs.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / cs.length;
      const avgMeetings = avg(cs, 'meetingsBooked') ?? 0;
      const avgMCR = cs.reduce((s, c) => s + calcMeetingConversionRate(c), 0) / cs.length;
      const isUrl = g.asset.startsWith('http');
      return { asset: g.asset, rawKey: g.rawKey, isUrl, timesUsed: cs.length, avgOpen: avgOpenV, avgClick, avgPRR, avgMeetings, verdict: getAssetVerdict(avgClick, avgMCR) };
    }).sort((a, b) => sortDir * ((b[sortCol] ?? 0) - (a[sortCol] ?? 0)));
  }, [campaigns, salesAssets, sortCol, sortDir]);

  const Th = ({ label, col }) => (
    <th onClick={() => col && sortToggle(col)}
      className={`px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] whitespace-nowrap ${col ? 'cursor-pointer hover:text-navy select-none' : ''}`}>
      {label}{col && sortCol === col ? (sortDir === -1 ? ' ↓' : ' ↑') : ''}
    </th>
  );

  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ew-footer border-b border-ew-border">
          <tr>
            <Th label="Asset" />
            <Th label="Times used" col="timesUsed" />
            <Th label="Avg open %" col="avgOpen" />
            <Th label="Avg click %" col="avgClick" />
            <Th label="Avg +reply %" col="avgPRR" />
            <Th label="Avg meetings" col="avgMeetings" />
            <Th label="Verdict" />
          </tr>
        </thead>
        <tbody>
          {rows.map((a, i) => (
            <tr key={a.asset} className={`border-b border-ew-border ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
              <td className="px-3 py-3 font-semibold text-navy max-w-[220px]">
                {a.isUrl ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-ew-muted truncate max-w-[160px]" title={a.asset}>{a.asset.replace(/^https?:\/\//, '').slice(0, 40)}…</span>
                    <a href={a.asset} target="_blank" rel="noopener noreferrer" className="text-[#8403C5] hover:underline text-[10px] shrink-0">↗</a>
                  </div>
                ) : a.asset}
              </td>
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
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function AnalyticsView({ campaigns, salesAssets }) {
  const [datePreset, setDatePreset] = useState('All time');

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
  const meetingConvPct = totalSent > 0 ? (totalMeetings / totalSent * 100).toFixed(2) : '0.00';

  // Subject line leaderboard
  const subjectRows = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const key = c.subjectLine || '(no subject)';
      if (!map[key]) map[key] = { subjectLine: key, audience: c.audienceSegment, campaigns: [] };
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
  const allMeetingsZero = trendData.every(d => !d.meetings);

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

  // A/B test groups — group by campaignName + touchPoint, only where different variants exist
  const abGroups = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      const key = `${c.campaignName}||${c.touchPoint}`;
      if (!map[key]) map[key] = {};
      const variant = c.variant || 'A';
      // Keep one campaign per variant slot (prefer first seen)
      if (!map[key][variant]) map[key][variant] = c;
    });
    return Object.entries(map)
      .map(([key, varMap]) => ({ key, variants: Object.values(varMap) }))
      .filter(g => g.variants.length > 1 && new Set(g.variants.map(c => c.variant)).size > 1);
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
          <p key={i} className="font-semibold mt-1" style={{ color: p.color }}>{p.name}: {p.value?.toFixed(1)}%</p>
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

      {/* SECTION 0 — AI Insights */}
      <AIInsightsPanel campaigns={filtered} />

      {/* SECTION 1 — Overview */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Overview</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            label="Total emails sent"
            value={totalSent.toLocaleString('en-GB')}
            sub={`across ${filtered.length} campaign${filtered.length !== 1 ? 's' : ''}`}
          />
          <StatCard
            label="Avg open rate"
            value={avgOpen != null ? fmtPct(avgOpen) : '—'}
            badge={avgOpen != null ? (avgOpen >= 30 ? { label: 'Above average ✓', cls: 'bg-green-100 text-green-700' } : { label: 'Below average', cls: 'bg-amber-100 text-amber-700' }) : null}
            sub="Industry avg cold: 20–30%"
          />
          <StatCard
            label="Avg positive reply rate"
            value={avgPRR != null ? fmtPct(avgPRR) : '—'}
            badge={avgPRR != null ? (avgPRR >= 1 ? { label: 'On track ✓', cls: 'bg-green-100 text-green-700' } : { label: 'Below average', cls: 'bg-amber-100 text-amber-700' }) : null}
            sub="Industry avg: 1–5%"
          />
          <StatCard
            label="Total meetings booked"
            value={totalMeetings}
            sub={`from ${totalSent.toLocaleString()} emails (${meetingConvPct}% conv.)`}
          />
        </div>
      </div>

      {/* SECTION 2 — Subject Line Leaderboard */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Subject Line Leaderboard</h2>
        <SubjectLeaderboard
          rows={subjectRows}
          onExport={(rows) => exportCSV(rows, csvCols, 'subject-leaderboard.csv')}
        />
      </div>

      {/* SECTION 3 — Asset Performance */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Asset Performance</h2>
        <AssetTable campaigns={filtered} salesAssets={salesAssets} />
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

            {/* Meetings chart — only if non-zero */}
            {allMeetingsZero ? (
              <div className="bg-white border border-ew-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
                <Calendar className="w-8 h-8 text-ew-muted opacity-40" />
                <p className="text-sm font-semibold text-navy">No meetings booked yet</p>
                <p className="text-xs text-ew-muted max-w-sm">When meetings are logged against campaigns, they'll appear here as a trend chart.</p>
              </div>
            ) : (
              <div className="bg-white border border-ew-border rounded-xl p-5">
                <p className="text-xs font-semibold text-ew-body mb-4">Meetings booked per campaign</p>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Line type="monotone" dataKey="meetings" stroke={COLORS.green} strokeWidth={2} dot={{ r: 3, fill: COLORS.green }} connectNulls name="Meetings booked" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
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
            {abGroups.map(({ key, variants }) => {
              // Sort by composite score
              const scored = variants.map(c => ({ ...c, _score: calcPerformanceScore(c) })).sort((a, b) => b._score - a._score);
              const winner = scored[0];
              const loser = scored[scored.length - 1];
              const tiedScore = scored.every(c => c._score === winner._score);

              const openDiff = ((winner.openRate || 0) - (loser.openRate || 0)).toFixed(1);
              const clickDiff = ((winner.clickRate || 0) - (loser.clickRate || 0)).toFixed(1);

              return (
                <div key={key} className="bg-white border border-ew-border rounded-xl p-5">
                  <p className="text-xs font-bold text-navy mb-4">{variants[0].campaignName} — {variants[0].touchPoint}</p>
                  <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(${scored.length}, 1fr)` }}>
                    {scored.map(c => {
                      const prr = calcPositiveReplyRate(c);
                      const mcr = calcMeetingConversionRate(c);
                      const isWin = c.id === winner.id && !tiedScore;
                      const isLose = c.id === loser.id && !tiedScore && scored.length > 1;
                      return (
                        <div key={c.id} className={`rounded-xl p-4 border-2 relative ${isWin ? 'border-green-400 bg-green-50' : isLose ? 'border-red-300 bg-red-50/40' : 'border-ew-border bg-[#FAFBFE]'}`}>
                          {isWin && <span className="absolute -top-2.5 left-4 text-xs font-bold bg-green-500 text-white px-2 py-0.5 rounded-full">🏆 Winner</span>}
                          {isLose && <span className="absolute -top-2.5 left-4 text-xs font-bold bg-red-500 text-white px-2 py-0.5 rounded-full">❌ Underperformer</span>}
                          <div className="flex items-center gap-2 mb-3 mt-1">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">Variant {c.variant}</span>
                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${c._score >= 5 ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>{c._score.toFixed(1)}/10</span>
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

                  {/* Summary */}
                  <div className="mt-4 px-4 py-3 rounded-xl bg-gray-50 border border-ew-border text-xs text-ew-body">
                    {tiedScore ? (
                      <p>⚠️ <span className="font-semibold">Insufficient data to determine a winner</span> — both variants need more sends before a meaningful comparison can be made.</p>
                    ) : (
                      <p>
                        <span className="font-semibold">Variant {winner.variant}</span> outperformed Variant {loser.variant} by{' '}
                        <span className="font-semibold text-navy">{openDiff}%</span> on open rate and{' '}
                        <span className="font-semibold text-navy">{clickDiff}%</span> on click rate.{' '}
                        Recommend using <span className="font-semibold">Variant {winner.variant}</span> going forward.
                      </p>
                    )}
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