import React, { useState } from 'react';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import { TEAM_MEMBERS, NEW_CATEGORIES, PRIORITIES } from './requestStyles';

const PRIORITY_PILL_STYLES = {
  Low: 'bg-[#EBEBF5] text-[#242450] border-[#D8D8EE]',
  Medium: 'bg-[#EEF2F8] text-[#5777AB] border-[#C4D2E8]',
  High: 'bg-[#FFFBEB] text-[#A16207] border-[#FDE68A]',
  Urgent: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
};

export default function AddTaskModal({ onClose, onSubmit }) {
  const [recipient, setRecipient] = useState('');
  const [requestedBy, setRequestedBy] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [priority, setPriority] = useState('Medium');
  const [deadline, setDeadline] = useState('');
  const [description, setDescription] = useState('');
  const [descOpen, setDescOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !recipient || !requestedBy || !category) return;
    setSubmitting(true);
    try {
      await onSubmit({
        title,
        recipient,
        requestedBy,
        assignedTo: recipient,
        category,
        priority,
        deadline,
        description,
        status: 'To Do',
        submittedAt: new Date().toISOString(),
        archived: false,
      });
      onClose();
    } catch {
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-3 h-10 border border-[#EBEBF5] bg-white rounded-lg text-sm text-[#242450] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto animate-modal-in" onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit}>
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5]">
            <h2 className="text-lg font-bold text-[#242450]">Add Task</h2>
            <button type="button" onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] text-[#5777AB] hover:text-[#242450] transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5 space-y-5">
            {/* Who is this for */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Who is this request for? <span className="text-[#DC2626]">*</span></label>
              <select value={recipient} onChange={e => setRecipient(e.target.value)} required className={inputCls}>
                <option value="">Select a person…</option>
                {TEAM_MEMBERS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Your name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Your name / Requested by <span className="text-[#DC2626]">*</span></label>
              <select value={requestedBy} onChange={e => setRequestedBy(e.target.value)} required className={inputCls}>
                <option value="">Select your name…</option>
                {TEAM_MEMBERS.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>

            {/* Title */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Request title <span className="text-[#DC2626]">*</span></label>
              <input value={title} onChange={e => setTitle(e.target.value)} required placeholder="e.g. Update sales deck" className={inputCls} />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Category <span className="text-[#DC2626]">*</span></label>
              <select value={category} onChange={e => setCategory(e.target.value)} required className={inputCls}>
                <option value="">Select a category…</option>
                {NEW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Description — expandable */}
            <div className="flex flex-col gap-1.5">
              <button
                type="button"
                onClick={() => setDescOpen(o => !o)}
                className="flex items-center gap-1.5 text-sm font-semibold text-[#5777AB] hover:text-[#242450] transition-colors"
              >
                {descOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                Add description +
              </button>
              {descOpen && (
                <textarea
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="Describe what you need and any relevant context..."
                  rows={4}
                  className={inputCls + ' h-auto py-2.5 resize-none'}
                />
              )}
            </div>

            {/* Priority — pill selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Priority</label>
              <div className="flex gap-2 flex-wrap">
                {PRIORITIES.map(p => (
                  <button
                    type="button"
                    key={p}
                    onClick={() => setPriority(p)}
                    className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${PRIORITY_PILL_STYLES[p]} ${priority === p ? 'ring-2 ring-offset-1 ring-[#8403C5]/40' : 'opacity-60 hover:opacity-100'}`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Due date */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-semibold text-[#242450]">Due date <span className="font-normal text-[#5777AB]">(optional)</span></label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-[#EBEBF5]">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={submitting}
              className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] transition-colors disabled:opacity-60">
              {submitting ? 'Submitting…' : 'Submit Request'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}