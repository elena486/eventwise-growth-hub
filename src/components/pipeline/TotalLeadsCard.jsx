import React, { useState } from 'react';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];

const STAGE_COLORS = {
  'Contacted':       { bar: 'bg-gray-400',   pill: 'bg-gray-100 text-gray-600' },
  'Discovery Call':  { bar: 'bg-blue-500',   pill: 'bg-blue-50 text-blue-700' },
  'Proposal Sent':   { bar: 'bg-amber-400',  pill: 'bg-amber-50 text-amber-700' },
  'In Negotiation':  { bar: 'bg-purple-500', pill: 'bg-purple-50 text-purple-700' },
  'Closed Won':      { bar: 'bg-emerald-500',pill: 'bg-emerald-50 text-emerald-700' },
  'Closed Lost':     { bar: 'bg-red-400',    pill: 'bg-red-50 text-red-600' },
};

export default function TotalLeadsCard({ leads, stageFilter, onStageFilter }) {
  const [expanded, setExpanded] = useState(false);
  const total = leads.length;

  const stageCounts = STAGE_ORDER.reduce((acc, s) => {
    const count = leads.filter(l => l.stage === s).length;
    if (count > 0) acc.push({ stage: s, count });
    return acc;
  }, []);

  const handleStageClick = (e, stage) => {
    e.stopPropagation();
    onStageFilter(stageFilter === stage ? null : stage);
  };

  return (
    <div
      className="bg-white border border-ew-border rounded-xl p-5 cursor-pointer select-none transition-shadow hover:shadow-md"
      onClick={() => setExpanded(v => !v)}
    >
      {/* Header */}
      <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Total leads</p>
      <p className="text-2xl font-bold text-navy mb-4">{total}</p>

      {total > 0 && (
        <>
          {/* Segmented progress bar */}
          <div className="flex h-2 rounded-full overflow-hidden gap-px mb-3">
            {stageCounts.map(({ stage, count }) => (
              <div
                key={stage}
                className={`${STAGE_COLORS[stage]?.bar || 'bg-gray-300'} transition-all`}
                style={{ width: `${(count / total) * 100}%` }}
                title={`${stage}: ${count}`}
              />
            ))}
          </div>

          {/* Collapsed: pill badges */}
          {!expanded && (
            <div className="flex flex-wrap gap-1.5">
              {stageCounts.map(({ stage, count }) => (
                <span
                  key={stage}
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${STAGE_COLORS[stage]?.pill || 'bg-gray-100 text-gray-600'}`}
                >
                  {stage} <span className="font-bold">{count}</span>
                </span>
              ))}
            </div>
          )}

          {/* Expanded: breakdown rows */}
          {expanded && (
            <div className="space-y-2 mt-1" onClick={e => e.stopPropagation()}>
              {stageCounts.map(({ stage, count }) => (
                <div
                  key={stage}
                  onClick={(e) => handleStageClick(e, stage)}
                  className={`flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer transition-colors ${
                    stageFilter === stage ? 'bg-navy/5 ring-1 ring-navy/15' : 'hover:bg-ew-bg'
                  }`}
                >
                  {/* Pill */}
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full whitespace-nowrap flex-shrink-0 ${STAGE_COLORS[stage]?.pill || 'bg-gray-100 text-gray-600'}`}>
                    {stage}
                  </span>
                  {/* Thin bar */}
                  <div className="flex-1 h-1.5 bg-ew-bg rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${STAGE_COLORS[stage]?.bar || 'bg-gray-300'}`}
                      style={{ width: `${(count / total) * 100}%` }}
                    />
                  </div>
                  {/* Count */}
                  <span className="text-sm font-bold text-navy w-4 text-right flex-shrink-0">{count}</span>
                </div>
              ))}
              <p className="text-[11px] text-ew-muted text-center pt-1">Click a row to filter · click card to close</p>
            </div>
          )}
        </>
      )}
    </div>
  );
}