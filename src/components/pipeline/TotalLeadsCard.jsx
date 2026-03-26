import React, { useState } from 'react';
import StageBadge from './Stagebadge';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_DOT = {
  'Contacted': 'bg-gray-400',
  'Discovery Call': 'bg-blue-500',
  'Proposal Sent': 'bg-amber-500',
  'In Negotiation': 'bg-purple-500',
  'Closed Won': 'bg-green',
  'Closed Lost': 'bg-red-400',
};

export default function TotalLeadsCard({ leads, stageFilter, onStageFilter }) {
  const [expanded, setExpanded] = useState(false);

  const total = leads.length;

  const stageCounts = STAGE_ORDER.reduce((acc, s) => {
    const count = leads.filter(l => l.stage === s).length;
    if (count > 0) acc[s] = count;
    return acc;
  }, {});

  const handleStageClick = (e, stage) => {
    e.stopPropagation();
    onStageFilter(stageFilter === stage ? null : stage);
  };

  return (
    <div
      className="bg-white border border-ew-border rounded-xl p-5 cursor-pointer select-none transition-shadow hover:shadow-md"
      onClick={() => setExpanded(v => !v)}
    >
      <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Total leads</p>
      <p className="text-2xl font-bold text-navy mb-3">{total}</p>

      {/* Dot summary — always visible */}
      {!expanded && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5">
          {Object.entries(stageCounts).map(([stage, count]) => (
            <span key={stage} className="flex items-center gap-1 text-[11px] text-ew-body">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${STAGE_DOT[stage] || 'bg-gray-400'}`} />
              {stage.split(' ')[0]} {count}
            </span>
          ))}
        </div>
      )}

      {/* Expanded breakdown */}
      {expanded && (
        <div className="mt-1 space-y-1.5" onClick={e => e.stopPropagation()}>
          {Object.entries(stageCounts).map(([stage, count]) => (
            <div
              key={stage}
              onClick={(e) => handleStageClick(e, stage)}
              className={`flex items-center justify-between px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors ${
                stageFilter === stage ? 'bg-navy/5 ring-1 ring-navy/20' : 'hover:bg-ew-bg'
              }`}
            >
              <StageBadge stage={stage} />
              <span className="text-sm font-semibold text-navy ml-2">{count}</span>
            </div>
          ))}
          <p className="text-[11px] text-ew-muted pt-1 text-center">Click to filter · click card to close</p>
        </div>
      )}
    </div>
  );
}