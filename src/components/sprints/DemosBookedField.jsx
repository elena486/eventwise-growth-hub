import React from 'react';
import { ExternalLink } from 'lucide-react';

export default function DemosBookedField({ count, demos, loading }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-1">
        <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        <span className="text-sm text-ew-muted">Counting demos booked this week…</span>
      </div>
    );
  }

  if (count === 0) {
    return <p className="text-sm text-ew-muted py-1">0 booked this week</p>;
  }

  return (
    <div className="py-1">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="text-xl font-bold text-navy">{count}</span>
        <span className="text-sm text-ew-muted">{count === 1 ? 'demo booked this week' : 'demos booked this week'}</span>
      </div>
      <div className="space-y-1">
        {demos.map(d => (
          <button
            key={d.id}
            onClick={() => window.dispatchEvent(new CustomEvent('ew-focus-navigate', {
              detail: { tab: 'pipeline', focusType: 'lead', focusId: d.id }
            }))}
            className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline"
          >
            <ExternalLink className="w-3 h-3" />
            {d.companyName}
          </button>
        ))}
      </div>
    </div>
  );
}