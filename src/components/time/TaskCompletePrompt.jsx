/**
 * TaskCompletePrompt — modal shown after stopping a timer that has
 * a linked To-Do task. Asks the user whether to mark the task Done.
 *
 * Props:
 *   open            — boolean
 *   taskTitle       — string
 *   onMarkComplete  — () => void  (called when user clicks "Mark task complete")
 *   onNotYet        — () => void  (called when user clicks "Not yet" or backdrop)
 */
import React from 'react';
import { CheckCircle } from 'lucide-react';

export default function TaskCompletePrompt({ open, taskTitle, onMarkComplete, onNotYet }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] p-4 animate-modal-in" onClick={onNotYet}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-[#1D9E75]" />
          <p className="text-sm font-semibold text-[#242450]">Is this task done?</p>
        </div>
        <p className="text-xs text-[#5777AB] mb-4 truncate pl-7">{taskTitle}</p>
        <div className="flex gap-2">
          <button
            onClick={onMarkComplete}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#1D9E75] hover:bg-[#17856A] text-white rounded-lg transition-colors"
          >
            ✓ Mark task complete
          </button>
          <button
            onClick={onNotYet}
            className="px-4 py-2 text-sm font-medium text-[#5777AB] border border-[#EBEBF5] rounded-lg hover:bg-[#F6F6FB] transition-colors"
          >
            Not yet
          </button>
        </div>
      </div>
    </div>
  );
}