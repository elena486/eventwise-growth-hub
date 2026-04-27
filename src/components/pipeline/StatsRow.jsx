import React, { useState, useEffect, useRef } from 'react';
import TotalLeadsCard from './TotalLeadsCard';
import { ChevronUp, ChevronDown } from 'lucide-react';

// Format value: full or abbreviated depending on compact mode
function fmt(n, compact = false) {
  const v = Math.round(n || 0);
  if (!compact) return '£' + v.toLocaleString('en-GB');
  if (v >= 1000000) return '£' + (v / 1000000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (v >= 1000) return '£' + (v / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
  return '£' + v;
}

const STATS_COLLAPSED_KEY = 'pipeline_stats_collapsed_v1';

function useClickOutside(ref, onClose) {
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
}

function ExpandableCard({ title, value, sub, children, accentColor = 'text-navy', compact = false }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useClickOutside(ref, () => setOpen(false));

  return (
    <div ref={ref} className="relative flex-1 min-w-[140px]">
      <div
        onClick={() => setOpen(v => !v)}
        className={`bg-white border border-ew-border rounded-xl p-4 flex flex-col justify-between cursor-pointer select-none transition-shadow hover:shadow-md h-full ${open ? 'ring-2 ring-[#8403C5]/20' : ''}`}
      >
        <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.12em] mb-1 whitespace-nowrap overflow-hidden text-ellipsis">{title}</p>
        <div>
          <p className={`font-bold ${accentColor} ${compact ? 'text-xl' : 'text-2xl'}`}>{value}</p>
          {sub && <p className="text-xs text-ew-muted mt-0.5 whitespace-nowrap">{sub}</p>}
        </div>
      </div>
      {open && (
        <div className="absolute top-full left-0 mt-2 bg-white border border-ew-border rounded-xl shadow-xl z-40 p-4 min-w-[240px]" onClick={e => e.stopPropagation()}>
          {children}
        </div>
      )}
    </div>
  );
}

export default function StatsRow({ leads, stageFilter, onStageFilter, panelOpen = false }) {
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem(STATS_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });

  const toggleCollapsed = () => {
    setCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(STATS_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  };

  // Use compact formatting when panel is open or viewport < 1200px
  const compact = panelOpen;

  const activeLeads = leads.filter(l => !l.converted);
  const pipeline = activeLeads.reduce((s, l) => s + (l.dealValueMonthly || 0), 0);
  const avg = activeLeads.length > 0 ? pipeline / activeLeads.length : 0;
  const weighted = activeLeads.reduce((s, l) => s + ((l.dealValueMonthly || 0) * ((l.probability || 0) / 100)), 0);

  const proposalsSent = activeLeads.filter(l => l.proposalStatus === 'Sent').length;
  const proposalsAccepted = activeLeads.filter(l => l.proposalStatus === 'Accepted').length;
  const proposalsDeclined = activeLeads.filter(l => l.proposalStatus === 'Declined').length;
  const proposalsSentStage = activeLeads.filter(l => l.stage === 'Proposal Sent').length;
  const totalProposals = proposalsSent + proposalsAccepted + proposalsDeclined;
  const conversionRate = totalProposals > 0 ? Math.round((proposalsAccepted / totalProposals) * 100) : 0;

  const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
  const byPlan = PLANS.map(p => ({
    plan: p,
    value: activeLeads.filter(l => l.plan === p).reduce((s, l) => s + (l.dealValueMonthly || 0), 0),
    count: activeLeads.filter(l => l.plan === p).length,
  })).filter(p => p.count > 0);

  const probBands = [
    { label: '0–25%', min: 0, max: 25 },
    { label: '25–50%', min: 25, max: 50 },
    { label: '50–75%', min: 50, max: 75 },
    { label: '75–100%', min: 75, max: 101 },
  ].map(band => ({
    label: band.label,
    weighted: activeLeads
      .filter(l => (l.probability || 0) >= band.min && (l.probability || 0) < band.max)
      .reduce((s, l) => s + ((l.dealValueMonthly || 0) * ((l.probability || 0) / 100)), 0),
    count: activeLeads.filter(l => (l.probability || 0) >= band.min && (l.probability || 0) < band.max).length,
  })).filter(b => b.count > 0);

  const OWNERS = ['Chris', 'Ramesh', 'George'];
  const byOwner = OWNERS.map(o => {
    const ownerLeads = activeLeads.filter(l => l.leadOwner === o && l.dealValueMonthly);
    return {
      owner: o,
      avg: ownerLeads.length > 0 ? ownerLeads.reduce((s, l) => s + (l.dealValueMonthly || 0), 0) / ownerLeads.length : 0,
      count: ownerLeads.length,
    };
  }).filter(o => o.count > 0);

  const leadsWithValue = activeLeads.filter(l => l.dealValueMonthly);
  const highest = leadsWithValue.length > 0 ? leadsWithValue.reduce((a, b) => (a.dealValueMonthly > b.dealValueMonthly ? a : b)) : null;
  const lowest = leadsWithValue.length > 0 ? leadsWithValue.reduce((a, b) => (a.dealValueMonthly < b.dealValueMonthly ? a : b)) : null;

  return (
    <div className="mb-6">
      {/* Toggle control */}
      <div className="flex justify-end mb-2">
        <button
          onClick={toggleCollapsed}
          className="flex items-center gap-1.5 text-xs text-ew-muted hover:text-navy transition-colors font-medium"
        >
          {collapsed ? (
            <><ChevronDown className="w-3.5 h-3.5" /> Show stats</>
          ) : (
            <><ChevronUp className="w-3.5 h-3.5" /> Hide stats</>
          )}
        </button>
      </div>

      {collapsed ? (
        /* Compact bar */
        <button
          onClick={toggleCollapsed}
          className="w-full flex items-center gap-4 bg-white border border-ew-border rounded-xl px-5 py-3 text-sm text-ew-body hover:border-[#8403C5]/30 hover:shadow-sm transition-all"
        >
          <span className="font-semibold text-navy">{activeLeads.length} leads</span>
          <span className="w-px h-4 bg-ew-border" />
          <span><span className="font-semibold text-navy">{fmt(pipeline)}</span><span className="text-ew-muted">/mo</span></span>
          <span className="w-px h-4 bg-ew-border" />
          <span className="text-ew-muted">Weighted: </span><span className="font-semibold text-[#8403C5]">{fmt(weighted)}</span>
          <span className="w-px h-4 bg-ew-border" />
          <span className="text-ew-muted">Proposals: </span><span className="font-semibold text-navy">{proposalsSentStage}</span>
          <ChevronDown className="w-3.5 h-3.5 text-ew-muted ml-auto" />
        </button>
      ) : (
        /* Full stats */
        <div className="flex gap-3 items-stretch">
          <TotalLeadsCard leads={activeLeads} stageFilter={stageFilter} onStageFilter={onStageFilter} compact={compact} />

          {/* Pipeline Value */}
          <ExpandableCard
            title="Pipeline value"
            value={<>{fmt(pipeline, compact)}<span className="text-sm font-medium text-ew-muted">/mo</span></>}
            sub={`${fmt(pipeline * 12, compact)}/yr`}
            compact={compact}
          >
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-2">By plan</p>
            {byPlan.length === 0 && <p className="text-xs text-ew-muted">No data</p>}
            {byPlan.map(p => (
              <div key={p.plan} className="flex items-center justify-between py-1">
                <span className="text-xs text-ew-body">{p.plan} <span className="text-ew-muted">({p.count})</span></span>
                <span className="text-xs font-semibold text-navy">{fmt(p.value)}/mo</span>
              </div>
            ))}
          </ExpandableCard>

          {/* Weighted Pipeline */}
          <ExpandableCard
            title="Weighted pipeline"
            value={<><span className="text-[#8403C5]">{fmt(weighted, compact)}</span><span className="text-sm font-medium text-ew-muted">/mo</span></>}
            sub="Prob-adjusted value"
            accentColor="text-[#8403C5]"
            compact={compact}
          >
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-2">By probability band</p>
            {probBands.length === 0 && <p className="text-xs text-ew-muted">No data</p>}
            {probBands.map(b => (
              <div key={b.label} className="flex items-center justify-between py-1">
                <span className="text-xs text-ew-body">{b.label} <span className="text-ew-muted">({b.count})</span></span>
                <span className="text-xs font-semibold text-[#8403C5]">{fmt(b.weighted)}/mo</span>
              </div>
            ))}
          </ExpandableCard>

          {/* Proposals Sent */}
          <ExpandableCard
            title="Proposals sent"
            value={proposalsSentStage}
            sub={totalProposals > 0 ? `${conversionRate}% conversion` : 'No status data'}
            compact={compact}
          >
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-2">Breakdown</p>
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs"><span className="text-ew-body">In Proposal Sent stage</span><span className="font-semibold text-navy">{proposalsSentStage}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ew-body">Status: Sent</span><span className="font-semibold text-navy">{proposalsSent}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ew-body">Status: Accepted</span><span className="font-semibold text-green-600">{proposalsAccepted}</span></div>
              <div className="flex justify-between text-xs"><span className="text-ew-body">Status: Declined</span><span className="font-semibold text-red-500">{proposalsDeclined}</span></div>
              {totalProposals > 0 && (
                <div className="border-t border-ew-border pt-1.5 flex justify-between text-xs">
                  <span className="text-ew-muted font-medium">Conversion rate</span>
                  <span className="font-bold text-navy">{conversionRate}%</span>
                </div>
              )}
            </div>
          </ExpandableCard>

          {/* Avg Deal Value */}
          <ExpandableCard
            title="Avg deal value"
            value={<>{fmt(avg, compact)}<span className="text-sm font-medium text-ew-muted">/mo</span></>}
            sub={`${fmt(avg * 12, compact)}/yr`}
            compact={compact}
          >
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-2">By owner</p>
            {byOwner.map(o => (
              <div key={o.owner} className="flex items-center justify-between py-1">
                <span className="text-xs text-ew-body">{o.owner} <span className="text-ew-muted">({o.count})</span></span>
                <span className="text-xs font-semibold text-navy">{fmt(o.avg)}/mo</span>
              </div>
            ))}
            {(highest || lowest) && (
              <div className="border-t border-ew-border pt-2 mt-1 space-y-1">
                {highest && <div className="flex justify-between text-xs"><span className="text-green-600 font-medium">↑ Highest</span><span className="text-navy font-semibold truncate max-w-[130px]">{highest.companyName} — {fmt(highest.dealValueMonthly)}/mo</span></div>}
                {lowest && <div className="flex justify-between text-xs"><span className="text-red-500 font-medium">↓ Lowest</span><span className="text-navy font-semibold truncate max-w-[130px]">{lowest.companyName} — {fmt(lowest.dealValueMonthly)}/mo</span></div>}
              </div>
            )}
          </ExpandableCard>
        </div>
      )}
    </div>
  );
}