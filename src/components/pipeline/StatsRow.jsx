import React from 'react';
import TotalLeadsCard from './TotalLeadsCard';

function fmt(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

export default function StatsRow({ leads, stageFilter, onStageFilter }) {
  const activeLeads = leads.filter(l => !l.converted);
  const pipeline = activeLeads.reduce((s, l) => s + (l.dealValueMonthly || 0), 0);
  const proposalsSent = activeLeads.filter(l => l.stage === 'Proposal Sent').length;
  const avg = activeLeads.length > 0 ? pipeline / activeLeads.length : 0;

  const cardBase = 'bg-white border border-ew-border rounded-xl p-5 flex flex-col justify-between min-h-[100px]';

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      <TotalLeadsCard leads={activeLeads} stageFilter={stageFilter} onStageFilter={onStageFilter} />

      {/* Pipeline value */}
      <div className={cardBase}>
        <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em]">Pipeline value</p>
        <div>
          <p className="text-2xl font-bold text-navy">{fmt(pipeline)}<span className="text-sm font-medium text-ew-muted">/mo</span></p>
          <p className="text-xs text-ew-muted mt-0.5">{fmt(pipeline * 12)}/yr</p>
        </div>
      </div>

      {/* Proposals sent */}
      <div className={cardBase}>
        <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em]">Proposals sent</p>
        <p className="text-2xl font-bold text-navy">{proposalsSent}</p>
      </div>

      {/* Avg deal value */}
      <div className={cardBase}>
        <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em]">Avg deal value</p>
        <div>
          <p className="text-2xl font-bold text-navy">{fmt(avg)}<span className="text-sm font-medium text-ew-muted">/mo</span></p>
          <p className="text-xs text-ew-muted mt-0.5">{fmt(avg * 12)}/yr</p>
        </div>
      </div>
    </div>
  );
}