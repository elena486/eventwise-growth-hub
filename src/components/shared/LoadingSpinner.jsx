import React from 'react';

export default function LoadingSpinner({ text = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <div className="w-7 h-7 border-3 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" style={{ borderWidth: 3 }} />
      {text && <p className="text-sm text-[#9CA3AF]">{text}</p>}
    </div>
  );
}

export function LoadingError({ onRefresh }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-3">
      <p className="text-sm text-[#6B7280]">Something went wrong. Refresh the page to try again.</p>
      <button
        onClick={onRefresh || (() => window.location.reload())}
        className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors"
      >
        Refresh
      </button>
    </div>
  );
}