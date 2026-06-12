import React from 'react';
import { ExternalLink, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const TYPE_COLORS = {
  'New Feature': { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300' },
  'Improvement': { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300' },
  'Bug Fix': { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300' },
  'Coming Soon': { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-600 dark:text-gray-400' },
};

const AFFECTS_TAGS = {
  'Sales': 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300',
  'Customer Success': 'bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-300',
  'Operations': 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-300',
  'Marketing': 'bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-300',
  'Wiki': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  'All': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300',
};

export default function NotificationPanel({ entries, onClose, onMarkAllRead, onViewAll }) {
  const unread = entries.filter(e => e._unread);
  const display = entries.slice(0, 10);

  return (
    <div className="absolute right-0 top-full mt-2 w-96 bg-white dark:bg-[#1E1E2E] rounded-xl shadow-2xl border border-[#EBEBEB] dark:border-[#2E2E4E] overflow-hidden z-50">
      {/* Header */}
      <div className="px-4 py-3.5 border-b border-[#EBEBEB] dark:border-[#2E2E4E] flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-[#111827] dark:text-white">What's new in Eventwise HQ</h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Recent updates, fixes, and improvements</p>
        </div>
        {unread.length > 0 && (
          <button
            onClick={onMarkAllRead}
            className="text-xs text-[#8403C5] hover:underline font-medium shrink-0 ml-3"
          >
            Mark all as read
          </button>
        )}
      </div>

      {/* Entries */}
      <div className="max-h-[420px] overflow-y-auto">
        {display.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] text-center py-8">No updates yet</p>
        ) : (
          display.map(entry => {
            const tc = TYPE_COLORS[entry.type] || TYPE_COLORS['Coming Soon'];
            const affects = (() => { try { return JSON.parse(entry.affects || '[]'); } catch { return []; } })();
            return (
              <div
                key={entry.id}
                className={`px-4 py-3 border-b border-[#EBEBEB] dark:border-[#2E2E4E] hover:bg-[#F9FAFB] dark:hover:bg-[#252535] transition-colors ${
                  entry._unread ? 'bg-[#FAF5FF] dark:bg-[#1a1028]' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                    {entry.type}
                  </span>
                  <span className="text-[10px] text-[#9CA3AF] shrink-0">{entry.date}</span>
                </div>
                <p className="text-sm font-semibold text-[#111827] dark:text-white mb-1">{entry.title}</p>
                <p className="text-xs text-[#6B7280] dark:text-[#9090B0] leading-relaxed mb-2">{entry.description}</p>
                {affects.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {affects.map(a => (
                      <span key={a} className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${AFFECTS_TAGS[a] || 'bg-gray-100 text-gray-600'}`}>
                        {a}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-[#EBEBEB] dark:border-[#2E2E4E] bg-[#F9FAFB] dark:bg-[#1a1a2a]">
        <button
          onClick={onViewAll}
          className="w-full text-center text-xs text-[#8403C5] font-medium hover:underline"
        >
          View all updates
        </button>
      </div>
    </div>
  );
}