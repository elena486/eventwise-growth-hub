/**
 * RunningTaskBadge — small inline badge shown on running timers
 * that have a linked To-Do task. Shows the task title and an
 * "Open" link that navigates to the task on the To-Do Board.
 */
import React from 'react';
import { navigateToTask } from '@/lib/taskTimerLink';

export default function RunningTaskBadge({ linkedTaskId, linkedTaskTitle, className = '' }) {
  if (!linkedTaskId) return null;
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 bg-[#F3E8FF] rounded-full shrink-0 ${className}`}>
      <span className="text-[11px] font-medium text-[#8403C5] truncate max-w-[140px]">{linkedTaskTitle || 'Linked task'}</span>
      <button
        onClick={() => navigateToTask(linkedTaskId)}
        className="text-[10px] text-[#8403C5] underline hover:text-[#6B02A0] transition-colors shrink-0"
        title="Open task on To-Do Board"
      >
        Open
      </button>
    </div>
  );
}