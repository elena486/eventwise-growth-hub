import React from 'react';
import { X, Sparkles } from 'lucide-react';

const TYPE_COLORS = {
  'New Feature': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  'Improvement': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  'Bug Fix': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  'Coming Soon': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
};

export default function FirstVisitModal({ entries, onClose, onSeeAll }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EBEBEB] dark:border-[#2E2E4E] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#8403C5]" />
            <h3 className="text-base font-bold text-[#111827] dark:text-white">Here's what's new since you last visited</h3>
          </div>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-[#111827] dark:hover:text-white rounded">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Entries */}
        <div className="px-5 py-3 space-y-3 max-h-[50vh] overflow-y-auto">
          {(entries || []).map(entry => {
            const tc = TYPE_COLORS[entry.type] || TYPE_COLORS['Coming Soon'];
            return (
              <div key={entry.id} className="border border-[#EBEBEB] dark:border-[#2E2E4E] rounded-xl p-3">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                    {entry.type}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF]">{entry.date}</span>
                </div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white mb-1">{entry.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#9090B0] leading-relaxed">{entry.description}</p>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 bg-[#F9FAFB] dark:bg-[#1a1a2a] border-t border-[#EBEBEB] dark:border-[#2E2E4E] flex items-center justify-between">
          <button onClick={onSeeAll} className="text-xs text-[#8403C5] font-medium hover:underline">
            See all updates
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  );
}