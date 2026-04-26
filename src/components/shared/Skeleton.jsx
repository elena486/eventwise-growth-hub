import React from 'react';

// Animated skeleton block
export function SkeletonBlock({ className = '' }) {
  return (
    <div className={`bg-gray-200 rounded-lg animate-pulse ${className}`} />
  );
}

// Table skeleton — shows N placeholder rows
export function TableSkeleton({ rows = 6, cols = 5 }) {
  return (
    <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
      <div className="border-b border-[#EBEBEB] px-4 py-3.5 flex gap-6">
        {Array.from({ length: cols }).map((_, i) => (
          <SkeletonBlock key={i} className="h-3 flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="border-b border-[#F2F2F4] last:border-0 px-4 py-4 flex gap-6 items-center">
          {Array.from({ length: cols }).map((_, j) => (
            <SkeletonBlock key={j} className={`h-4 ${j === 0 ? 'w-32' : 'flex-1'}`} />
          ))}
        </div>
      ))}
    </div>
  );
}

// Kanban skeleton
export function KanbanSkeleton({ cols = 6 }) {
  return (
    <div className="flex gap-3 p-4">
      {Array.from({ length: cols }).map((_, i) => (
        <div key={i} className="w-56 shrink-0">
          <SkeletonBlock className="h-5 w-24 mb-3" />
          <div className="space-y-2">
            {Array.from({ length: Math.floor(Math.random() * 3) + 1 }).map((_, j) => (
              <div key={j} className="bg-white border border-gray-200 rounded-xl p-3 space-y-2">
                <SkeletonBlock className="h-3 w-full" />
                <SkeletonBlock className="h-3 w-3/4" />
                <div className="flex gap-2 pt-1">
                  <SkeletonBlock className="h-4 w-12 rounded-full" />
                  <SkeletonBlock className="h-4 w-10 rounded-full" />
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Card grid skeleton
export function CardGridSkeleton({ count = 4 }) {
  return (
    <div className="grid grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white rounded-xl p-6 space-y-2" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <SkeletonBlock className="h-3 w-20" />
          <SkeletonBlock className="h-8 w-16 mt-2" />
        </div>
      ))}
    </div>
  );
}

// Generic spinner with loading text
export function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      <p className="text-sm text-[#9CA3AF]">{text}</p>
    </div>
  );
}

// Empty state component
export function EmptyState({ icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="text-4xl mb-3">{icon}</div>
      <p className="text-sm text-[#6B7280] text-center max-w-xs">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}