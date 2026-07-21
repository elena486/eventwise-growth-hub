import React from 'react';
import { RefreshCw } from 'lucide-react';

export default function GlobalRefreshButton() {
  return (
    <button
      onClick={() => window.location.reload()}
      className="fixed top-3 right-3 z-[60] flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white dark:bg-[#171730] border border-[#EBEBF5] dark:border-[#242450] text-[#5777AB] hover:text-[#242450] dark:hover:text-white hover:border-[#D8D8EE] shadow-sm text-sm font-medium transition-colors"
      title="Refresh"
    >
      <RefreshCw className="w-4 h-4" />
      <span>Refresh</span>
    </button>
  );
}