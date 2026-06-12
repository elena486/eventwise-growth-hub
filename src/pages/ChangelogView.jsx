import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Sparkles } from 'lucide-react';

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

export default function ChangelogView() {
  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    base44.entities.ChangelogEntry.list('-created_date').then(data => {
      setEntries(data);
      setLoaded(true);
    });
  }, []);

  if (!loaded) return (
    <div className="flex-1 flex items-center justify-center bg-[#F7F7F8] dark:bg-[#0F0F1A]">
      <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F8] dark:bg-[#0F0F1A] p-8 font-dm">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-6">
          <Sparkles className="w-5 h-5 text-[#8403C5]" />
          <h1 className="text-xl font-bold text-[#111827] dark:text-white">What's new in Eventwise HQ</h1>
        </div>
        <p className="text-sm text-gray-400 -mt-4 mb-6">All updates, fixes, and improvements</p>

        {entries.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No updates yet.</p>
        ) : (
          <div className="space-y-3">
            {entries.map(entry => {
              const tc = TYPE_COLORS[entry.type] || TYPE_COLORS['Coming Soon'];
              const affects = (() => { try { return JSON.parse(entry.affects || '[]'); } catch { return []; } })();
              return (
                <div key={entry.id} className="bg-white dark:bg-[#1E1E2E] border border-gray-200 dark:border-[#2E2E4E] rounded-xl p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${tc.bg} ${tc.text}`}>
                      {entry.type}
                    </span>
                    <span className="text-xs text-[#9CA3AF]">{entry.date}</span>
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
            })}
          </div>
        )}
      </div>
    </div>
  );
}