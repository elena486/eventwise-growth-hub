import React from 'react';
import { X } from 'lucide-react';

export default function PostRefreshBanner({ newCount, onSeeWhatsNew, onDismiss }) {
  if (newCount <= 0) return null;

  return (
    <div className="bg-[#8403C5] px-4 py-2 flex items-center justify-center gap-3 shrink-0">
      <p className="text-sm text-white font-medium">
        ✨ App updated — <span className="font-bold">{newCount}</span> new update{newCount !== 1 ? 's' : ''} since your last visit
      </p>
      <button
        onClick={onSeeWhatsNew}
        className="text-xs text-white/80 hover:text-white underline font-medium"
      >
        See what's new →
      </button>
      <button
        onClick={onDismiss}
        className="p-1 text-white/60 hover:text-white rounded"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}