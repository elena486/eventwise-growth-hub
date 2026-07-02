import React, { useState, useEffect, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { CATEGORY_COLORS } from './categoryColors';

const MEMBER_COLORS = {
  'Chris': '#8403C5', 'Elena': '#1D9E75', 'George': '#E8A020',
  'Martinique': '#0EA5E9', 'Sreeja': '#DC2626', 'Ramesh': '#5777AB',
};

function computeElapsed(entry) {
  // Parse pause intervals
  let pausedMs = 0;
  try {
    const intervals = JSON.parse(entry.timerPauseIntervals || '[]');
    intervals.forEach(interval => {
      if (interval.pausedAt && interval.resumedAt) {
        pausedMs += new Date(interval.resumedAt) - new Date(interval.pausedAt);
      } else if (interval.pausedAt && !interval.resumedAt && entry.timerStatus === 'paused') {
        // Currently paused — count up to now
        pausedMs += Date.now() - new Date(interval.pausedAt);
      }
    });
  } catch {}

  const startedAt = entry.timerStartedAt ? new Date(entry.timerStartedAt).getTime() : Date.now();
  const now = entry.timerStatus === 'paused'
    ? (() => {
        // If paused, elapsed is frozen at the last pause point
        try {
          const intervals = JSON.parse(entry.timerPauseIntervals || '[]');
          const lastInterval = intervals[intervals.length - 1];
          if (lastInterval?.pausedAt && !lastInterval?.resumedAt) {
            return new Date(lastInterval.pausedAt).getTime();
          }
        } catch {}
        return Date.now();
      })()
    : Date.now();

  const rawMs = now - startedAt - pausedMs;
  return Math.max(0, rawMs);
}

function formatHMS(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function LiveTimer({ entry }) {
  const [elapsed, setElapsed] = useState(() => computeElapsed(entry));
  const entryRef = useRef(entry);
  entryRef.current = entry;

  useEffect(() => {
    if (entry.timerStatus === 'paused') {
      setElapsed(computeElapsed(entry));
      return;
    }
    const tick = () => setElapsed(computeElapsed(entryRef.current));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [entry.id, entry.timerStatus, entry.timerPauseIntervals]);

  const isRunning = entry.timerStatus === 'running';

  return (
    <span className={`font-mono text-sm font-bold tabular-nums ${isRunning ? 'text-[#242450]' : 'text-[#9CA3AF]'}`}>
      {formatHMS(elapsed)}
    </span>
  );
}

export default function LiveNowSection() {
  const [liveEntries, setLiveEntries] = useState([]);
  const [collapsed, setCollapsed] = useState(false);

  const load = async () => {
    try {
      const running = await base44.entities.TimeEntry.filter({ timerStatus: 'running' });
      const paused = await base44.entities.TimeEntry.filter({ timerStatus: 'paused' });
      setLiveEntries([...running, ...paused]);
    } catch {}
  };

  useEffect(() => {
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  const activeCount = liveEntries.length;
  const hasAny = activeCount > 0;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden mb-6">
      {/* Header */}
      <button
        onClick={() => setCollapsed(c => !c)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-[#F6F6FB] transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Pulsing / static dot */}
          {hasAny ? (
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#1D9E75] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#1D9E75]" />
            </span>
          ) : (
            <span className="h-2.5 w-2.5 rounded-full bg-[#D8D8EE] shrink-0" />
          )}
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-[#242450]">⏱ Live Now</span>
            {collapsed && activeCount > 0 && (
              <span className="text-[10px] font-bold bg-[#E8F7F2] text-[#1D9E75] px-2 py-0.5 rounded-full">
                {activeCount} active
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {!collapsed && (
            <span className="text-[11px] text-[#9CA3AF]">Team members currently tracking time</span>
          )}
          {collapsed
            ? <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />
            : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
          }
        </div>
      </button>

      {/* Body */}
      {!collapsed && (
        <div className="border-t border-[#EBEBF5]">
          {!hasAny ? (
            <div className="px-5 py-10 text-center">
              <p className="text-sm font-medium text-[#5777AB]">No one is currently tracking time</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Active timers will appear here in real time</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F2F4]">
              {liveEntries.map(entry => {
                const isRunning = entry.timerStatus === 'running';
                const memberColor = MEMBER_COLORS[entry.teamMember] || '#9CA3AF';
                const catColor = CATEGORY_COLORS[entry.category] || '#9CA3AF';
                return (
                  <div key={entry.id} className="flex items-center gap-4 px-5 py-3.5">
                    {/* Avatar */}
                    <div
                      className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                      style={{ backgroundColor: memberColor }}
                    >
                      {(entry.teamMember || '?').charAt(0)}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-bold text-[#242450]">{entry.teamMember}</span>
                        <span
                          className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
                          style={{ backgroundColor: `${catColor}18`, color: catColor }}
                        >
                          {entry.category || 'Uncategorised'}
                        </span>
                      </div>
                      <p className="text-xs text-[#5777AB] truncate mt-0.5">{entry.projectTask || '—'}</p>
                    </div>

                    {/* Elapsed time */}
                    <div className="shrink-0 text-right">
                      <LiveTimer entry={entry} />
                    </div>

                    {/* Badge */}
                    <div className="shrink-0">
                      {isRunning ? (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#1D9E75] bg-[#E8F7F2] px-2.5 py-1 rounded-full">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#1D9E75] inline-block" />
                          Live
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-[11px] font-bold text-[#9CA3AF] bg-[#F2F2F4] px-2.5 py-1 rounded-full">
                          ⏸ Paused
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}