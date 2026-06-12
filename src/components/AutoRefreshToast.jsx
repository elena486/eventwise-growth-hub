import React from 'react';
import { RefreshCw, X } from 'lucide-react';

export default function AutoRefreshToast({ countdown, onRefresh, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] animate-toast-in">
      <div className="bg-[#242450] text-white rounded-xl shadow-2xl px-5 py-3.5 flex items-center gap-4 max-w-md">
        <div className="flex items-center gap-2.5 min-w-0">
          <RefreshCw className="w-4 h-4 text-[#8403C5] shrink-0 animate-spin" />
          <p className="text-sm leading-snug">
            🔄 Refreshing in <span className="font-bold">{countdown}</span> seconds to keep your app up to date...
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onRefresh}
            className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors whitespace-nowrap"
          >
            Refresh now
          </button>
          <button
            onClick={onDismiss}
            className="p-1.5 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}