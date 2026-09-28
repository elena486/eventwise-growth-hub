/**
 * OutcomePrompt — lightweight modal shown after a task is moved to Done
 * via drag-and-drop or the status dropdown. Asks for an optional one-line
 * outcome. The status change has already been persisted; this only saves
 * the outcome field (or skips).
 *
 * Props:
 *   open       — boolean
 *   taskTitle  — string
 *   onSave     — (outcome?: string) => void  — called with trimmed outcome or undefined
 *   onSkip     — () => void
 */
import React, { useState, useEffect } from 'react';
import { CheckCircle } from 'lucide-react';

export default function OutcomePrompt({ open, taskTitle, onSave, onSkip }) {
  const [outcome, setOutcome] = useState('');

  useEffect(() => {
    if (open) setOutcome('');
  }, [open, taskTitle]);

  if (!open) return null;

  const handleSave = () => {
    onSave(outcome.trim() || undefined);
  };

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[200] p-4 animate-modal-in" onClick={onSkip}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2 mb-2">
          <CheckCircle className="w-5 h-5 text-[#1D9E75]" />
          <p className="text-sm font-semibold text-[#242450]">Task marked done</p>
        </div>
        <p className="text-xs text-[#5777AB] mb-3 truncate pl-7">{taskTitle}</p>
        <div className="mb-4">
          <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">
            What did this achieve or unblock? <span className="font-normal normal-case text-[#9CA3AF]">(optional, one line)</span>
          </label>
          <input
            type="text"
            value={outcome}
            onChange={e => setOutcome(e.target.value)}
            placeholder="e.g. Updated and sent to client"
            autoFocus
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]"
            onKeyDown={e => { if (e.key === 'Enter') handleSave(); }}
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSave}
            className="flex-1 px-3 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg transition-colors"
          >
            Save outcome
          </button>
          <button
            onClick={onSkip}
            className="px-4 py-2 text-sm font-medium text-[#5777AB] border border-[#EBEBF5] rounded-lg hover:bg-[#F6F6FB] transition-colors"
          >
            Skip
          </button>
        </div>
      </div>
    </div>
  );
}