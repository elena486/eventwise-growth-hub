import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight, Layers } from 'lucide-react';
import { calcPerformanceScore, calcPositiveReplyRate, fmtPct } from './OutreachHelpers';
import { format } from 'date-fns';

const STATUS_STYLES = {
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-gray-100 text-gray-500',
  Killed: 'bg-red-100 text-red-600',
};

const STATUS_PRIORITY = { Active: 0, Paused: 1, Completed: 2, Killed: 3 };

function avg(arr, key) {
  const valid = arr.filter(c => c[key] != null && !isNaN(c[key]));
  if (!valid.length) return null;
  return valid.reduce((s, c) => s + parseFloat(c[key]), 0) / valid.length;
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function scoreCls(score) {
  if (score >= 6) return 'bg-green-100 text-green-700';
  if (score >= 4) return 'bg-amber-100 text-amber-700';
  return 'bg-red-100 text-red-600';
}

export default function CampaignView({ campaigns }) {
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [tpFilter, setTpFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [collapsed, setCollapsed] = useState({});

  // Filter at campaign level (audience + status). TP filter applied at child level only.
  const filtered = useMemo(() => {
    return campaigns.filter(c => {
      if (audienceFilter !== 'All' && c.audienceSegment !== audienceFilter) return false;
      if (statusFilter !== 'All' && c.status !== statusFilter) return false;
      return true;
    });
  }, [campaigns, audienceFilter, statusFilter]);

  // Group by campaign name
  const groups = useMemo(() => {
    const map = {};
    filtered.forEach(c => {
      if (!map[c.campaignName]) map[c.campaignName] = [];
      map[c.campaignName].push(c);
    });
    return Object.entries(map).map(([name, touchpoints]) => {
      touchpoints.sort((a, b) => (a.touchPoint || '').localeCompare(b.touchPoint || ''));
      return { name, touchpoints };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  // A/B verdicts per campaign record (same logic as AnalyticsView)
  const abVerdicts = useMemo(() => {
    const map = {};
    campaigns.forEach(c => {
      const key = `${c.campaignName}||${c.touchPoint}`;
      if (!map[key]) map[key] = {};
      const variant = c.variant || 'A';
      if (!map[key][variant]) map[key][variant] = c;
    });
    const verdicts = {};
    Object.entries(map).forEach(([, varMap]) => {
      const variants = Object.values(varMap);
      if (variants.length > 1 && new Set(variants.map(c => c.variant)).size > 1) {
        const scored = variants.map(c => ({ id: c.id, _score: calcPerformanceScore(c) })).sort((a, b) => b._score - a._score);
        const winner = scored[0];
        const loser = scored[scored.length - 1];
        const tied = scored.every(c => c._score === winner._score);
        variants.forEach(c => {
          if (tied) verdicts[c.id] = null;
          else if (c.id === winner.id) verdicts[c.id] = 'winner';
          else if (c.id === loser.id && scored.length > 1) verdicts[c.id] = 'loser';
          else verdicts[c.id] = null;
        });
      }
    });
    return verdicts;
  }, [campaigns]);

  const campaignStats = (touchpoints) => {
    const totalSent = touchpoints.reduce((s, c) => s + (parseFloat(c.emailsSent) || 0), 0);
    const avgOpen = avg(touchpoints, 'openRate');
    const avgClick = avg(touchpoints, 'clickRate');
    const avgReply = touchpoints.length ? touchpoints.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / touchpoints.length : 0;
    const totalMeetings = touchpoints.reduce((s, c) => s + (parseFloat(c.meetingsBooked) || 0), 0);
    const avgScore = touchpoints.length ? touchpoints.reduce((s, c) => s + calcPerformanceScore(c), 0) / touchpoints.length : 0;
    const status = touchpoints.reduce((best, c) => {
      if (!best) return c.status;
      return (STATUS_PRIORITY[c.status] ?? 99) < (STATUS_PRIORITY[best] ?? 99) ? c.status : best;
    }, null);
    const audience = touchpoints[0]?.audienceSegment || '—';
    const launchDate = touchpoints.map(c => c.launchDate).filter(Boolean).sort()[0] || null;
    return { totalSent, avgOpen, avgClick, avgReply, totalMeetings, avgScore, status, audience, launchDate };
  };

  // Summary
  const summary = useMemo(() => {
    const activeCampaigns = groups.filter(g => campaignStats(g.touchpoints).status === 'Active').length;
    const scored = groups.map(g => ({ name: g.name, score: campaignStats(g.touchpoints).avgScore })).filter(s => s.score > 0);
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0] || null;
    const worst = scored[scored.length - 1] || null;
    const overallOpen = avg(filtered, 'openRate');
    const overallReply = filtered.length ? filtered.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / filtered.length : 0;
    return { activeCampaigns, best, worst, overallOpen, overallReply, totalCampaigns: groups.length };
  }, [groups, filtered]);

  const allCollapsed = groups.length > 0 && groups.every(g => collapsed[g.name]);
  const toggleAll = () => {
    if (allCollapsed) setCollapsed({});
    else {
      const next = {};
      groups.forEach(g => { next[g.name] = true; });
      setCollapsed(next);
    }
  };
  const toggleOne = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));

  const visibleTouchpoints = (touchpoints) => {
    if (tpFilter === 'All') return touchpoints;
    return touchpoints.filter(c => c.touchPoint === tpFilter);
  };

  if (campaigns.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-ew-muted text-sm italic">No campaign data yet. George can add campaigns in the Input view.</p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Summary bar */}
      <div className="bg-white border border-ew-border rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <Layers className="w-4 h-4 text-[#8403C5]" />
          <h2 className="text-sm font-bold text-navy">Campaign Summary</h2>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div>
            <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1">Active campaigns</p>
            <p className="text-2xl font-bold text-navy">{summary.activeCampaigns}</p>
            <p className="text-[11px] text-ew-muted">of {summary.totalCampaigns} total</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1">Best performing</p>
            <p className="text-sm font-bold text-green-700 truncate" title={summary.best?.name}>{summary.best?.name || '—'}</p>
            <p className="text-[11px] text-ew-muted">Score {summary.best ? summary.best.score.toFixed(1) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1">Worst performing</p>
            <p className="text-sm font-bold text-red-600 truncate" title={summary.worst?.name}>{summary.worst?.name || '—'}</p>
            <p className="text-[11px] text-ew-muted">Score {summary.worst ? summary.worst.score.toFixed(1) : '—'}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1">Overall avg open</p>
            <p className="text-2xl font-bold text-navy">{fmtPct(summary.overallOpen)}</p>
          </div>
          <div>
            <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1">Overall avg reply</p>
            <p className="text-2xl font-bold text-[#8403C5]">{fmtPct(summary.overallReply)}</p>
          </div>
        </div>
      </div>

      {/* Filters + collapse toggle */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Events', 'Agencies', 'Suppliers', 'Mixed'].map(a => (
            <button key={a} onClick={() => setAudienceFilter(a)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${audienceFilter === a ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {a}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {['All', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6'].map(t => (
            <button key={t} onClick={() => setTpFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${tpFilter === t ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {t}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {['All', 'Active', 'Paused', 'Completed', 'Killed'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${statusFilter === s ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {s}
            </button>
          ))}
        </div>
        <button onClick={toggleAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg transition-colors">
          {allCollapsed ? <><ChevronRight className="w-3.5 h-3.5" /> Expand all</> : <><ChevronDown className="w-3.5 h-3.5" /> Collapse all</>}
        </button>
      </div>

      {/* Campaign table */}
      <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1150px]">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] w-8"></th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Campaign / Touchpoint</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Variant</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Audience</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Status</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Launch date</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Subject line</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Sent</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Open %</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Click %</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">+Reply %</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Meetings</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Score</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">A/B</th>
            </tr>
          </thead>
          <tbody>
            {groups.length === 0 && (
              <tr><td colSpan={14} className="px-4 py-12 text-center text-sm text-ew-muted italic">No campaigns match this filter.</td></tr>
            )}
            {groups.map((g) => {
              const stats = campaignStats(g.touchpoints);
              const isCollapsed = collapsed[g.name];
              const tps = visibleTouchpoints(g.touchpoints);
              return (
                <React.Fragment key={g.name}>
                  {/* Parent row */}
                  <tr className="border-b border-ew-border bg-[#FAFBFE] hover:bg-ew-footer cursor-pointer"
                    onClick={() => toggleOne(g.name)}>
                    <td className="px-3 py-3">
                      {isCollapsed ? <ChevronRight className="w-4 h-4 text-ew-muted" /> : <ChevronDown className="w-4 h-4 text-ew-muted" />}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-navy">{g.name}</p>
                      <p className="text-[10px] text-ew-muted">{g.touchpoints.length} touchpoint{g.touchpoints.length !== 1 ? 's' : ''}{tpFilter !== 'All' ? ` · ${tps.length} shown` : ''}</p>
                    </td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-xs text-ew-body whitespace-nowrap">{stats.audience}</td>
                    <td className="px-3 py-3">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[stats.status] || 'bg-gray-100 text-gray-500'}`}>{stats.status}</span>
                    </td>
                    <td className="px-3 py-3 text-xs text-ew-muted whitespace-nowrap">{fmtDate(stats.launchDate)}</td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy text-right">{stats.totalSent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy text-right">{fmtPct(stats.avgOpen)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy text-right">{fmtPct(stats.avgClick)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-[#8403C5] text-right">{fmtPct(stats.avgReply)}</td>
                    <td className="px-3 py-3 text-xs font-semibold text-navy text-right">{stats.totalMeetings}</td>
                    <td className="px-3 py-3 text-right">
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreCls(stats.avgScore)}`}>{stats.avgScore.toFixed(1)}</span>
                    </td>
                    <td className="px-3 py-3"></td>
                  </tr>

                  {/* Child rows */}
                  {!isCollapsed && tps.map((c, ti) => {
                    const score = calcPerformanceScore(c);
                    const prr = calcPositiveReplyRate(c);
                    const ab = abVerdicts[c.id];
                    return (
                      <tr key={c.id} className={`border-b border-ew-border hover:bg-navy/[0.02] ${ti % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5 pl-8">
                          <span className="text-xs font-semibold text-navy">{c.touchPoint}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">{c.variant}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ew-muted">{c.audienceSegment}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-500'}`}>{c.status}</span>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-ew-muted whitespace-nowrap">{fmtDate(c.launchDate)}</td>
                        <td className="px-3 py-2.5 max-w-[200px]">
                          <p className="text-xs text-ew-body truncate" title={c.subjectLine}>{c.subjectLine || '—'}</p>
                        </td>
                        <td className="px-3 py-2.5 text-xs font-medium text-navy text-right">{c.emailsSent ?? '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-navy text-right">{c.openRate != null ? c.openRate + '%' : '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-navy text-right">{c.clickRate != null ? c.clickRate + '%' : '—'}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-navy text-right">{fmtPct(prr)}</td>
                        <td className="px-3 py-2.5 text-xs font-medium text-navy text-right">{c.meetingsBooked ?? '—'}</td>
                        <td className="px-3 py-2.5 text-right">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${scoreCls(score)}`}>{score.toFixed(1)}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          {ab === 'winner' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-green-100 text-green-700">🏆 Winner</span>}
                          {ab === 'loser' && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">Underperformer</span>}
                        </td>
                      </tr>
                    );
                  })}

                  {/* No matching touchpoints under this campaign (when TP filter active) */}
                  {!isCollapsed && tps.length === 0 && tpFilter !== 'All' && (
                    <tr className="border-b border-ew-border bg-[#FAFBFE]/50">
                      <td colSpan={14} className="px-3 py-2.5 pl-12 text-xs text-ew-muted italic">No {tpFilter} touchpoints in this campaign</td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}