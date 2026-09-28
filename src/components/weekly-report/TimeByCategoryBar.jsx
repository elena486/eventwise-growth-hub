import React from 'react';
import { formatDuration } from '@/lib/weeklyReportData';

const BAR_COLORS = ['#8403C5', '#1D9E75', '#5777AB', '#E8A020', '#DC2626', '#7C3AED', '#0EA5E9', '#F59E0B', '#10B981', '#6366F1'];

export default function TimeByCategoryBar({ timeByCategory, totalTime }) {
  if (timeByCategory.length === 0 || totalTime === 0) {
    return <p className="text-sm text-[#9CA3AF] italic">No time logged.</p>;
  }

  return (
    <div>
      <div className="flex h-7 rounded-lg overflow-hidden">
        {timeByCategory.map((c, i) => (
          <div
            key={i}
            style={{ width: `${c.share}%`, backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
            title={`${c.category}: ${formatDuration(c.minutes)} (${c.share}%)`}
          />
        ))}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-2 mt-3">
        {timeByCategory.map((c, i) => (
          <div key={i} className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }} />
            <span className="text-xs text-[#242450] font-medium">{c.category}</span>
            <span className="text-xs text-[#5777AB]">{formatDuration(c.minutes)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}