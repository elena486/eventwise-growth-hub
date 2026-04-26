import React from 'react';

/**
 * Skeleton loading state for tables.
 * Props: rows (number, default 5), cols (number, default 5)
 */
export default function SkeletonTable({ rows = 5, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden border border-[#EBEBEB]">
      {/* Header skeleton */}
      <div className="bg-[#F9FAFB] border-b border-[#EBEBEB] px-4 py-3.5 flex items-center gap-4">
        {Array.from({ length: cols }).map((_, i) => (
          <div key={i} className="h-2.5 rounded-full bg-[#E5E7EB] animate-pulse" style={{ width: i === 0 ? 120 : 80 }} />
        ))}
      </div>
      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, ri) => (
        <div key={ri} className="px-4 py-4 flex items-center gap-4 border-b border-[#F3F4F6] last:border-0">
          {Array.from({ length: cols }).map((_, ci) => (
            <div
              key={ci}
              className="h-3 rounded-full animate-pulse"
              style={{
                width: ci === 0 ? 140 : ci === cols - 1 ? 60 : Math.random() > 0.5 ? 100 : 80,
                background: '#F3F4F6',
                animationDelay: `${ri * 80 + ci * 20}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}