import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

const REQUIRES_APPROVAL = ['George', 'Martinique'];
const ADMINS = ['Elena', 'Chris'];
const ALL_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'David'];

function calcWorkingDays(start, end) {
  if (!start || !end) return 0;
  try {
    let s = new Date(start), e = new Date(end), c = 0;
    while (s <= e) { if (s.getDay()!==0&&s.getDay()!==6) c++; s = new Date(s.getTime()+86400000); }
    return Math.max(c, 1);
  } catch { return 1; }
}

const ic = 'w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]';
const label = 'block text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1';

export default function LeaveLogForm({ currentUserName, onClose, onSaved }) {
  const isAdmin = ADMINS.includes(currentUserName);
  const [form, setForm] = useState({ personName: currentUserName, startDate: '', endDate: '', type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null); // used for admin quick-approve prompt

  const days = calcWorkingDays(form.startDate, form.endDate);
  const targetPerson = form.personName || currentUserName;
  const needsApproval = REQUIRES_APPROVAL.includes(targetPerson);
  const isValid = form.startDate && form.endDate && form.type && form.endDate >= form.startDate && form.personName;

  const handleSubmit = async () => {
    if (!isValid || saving) return;
    setSaving(true);
    const entry = await base44.entities.LeaveEntry.create({
      personName: targetPerson,
      startDate: form.startDate,
      endDate: form.endDate,
      type: form.type,
      notes: form.notes.trim() || undefined,
      entryMethod: needsApproval ? 'Requires Approval' : 'Self-Logged',
      status: needsApproval ? 'Requested' : 'Confirmed',
    });
    setSaving(false);
    // Admin assigning to George/Martinique → show quick-approve prompt
    if (isAdmin && needsApproval) {
      setPendingEntry(entry);
      return;
    }
    onSaved?.(entry);
    setSubmitted(true);
  };

  const handleApproveNow = async () => {
    const approved = await base44.entities.LeaveEntry.update(pendingEntry.id, {
      status: 'Approved',
      approvedBy: currentUserName,
    });
    onSaved?.({ ...pendingEntry, status: 'Approved', approvedBy: currentUserName });
    setSubmitted(true);
    setPendingEntry(null);
  };

  const handleSendToQueue = () => {
    onSaved?.(pendingEntry);
    setSubmitted(true);
    setPendingEntry(null);
  };

  // ── Quick-approve prompt (admin only, after submitting for George/Martinique) ──
  if (pendingEntry) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={e => e.stopPropagation()}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center">
          <div className="w-12 h-12 rounded-full bg-[#FFFBEB] flex items-center justify-center mx-auto mb-4 text-2xl">⏳</div>
          <h3 className="text-base font-bold text-[#242450] mb-2">This request requires approval</h3>
          <p className="text-sm text-[#5777AB] mb-6">
            Leave for <strong>{pendingEntry.personName}</strong> has been submitted. Would you like to approve it now?
          </p>
          <div className="flex flex-col gap-2">
            <button onClick={handleApproveNow}
              className="w-full py-2.5 text-sm font-semibold bg-[#1D9E75] hover:bg-[#17856A] text-white rounded-lg transition-colors">
              ✓ Approve now
            </button>
            <button onClick={handleSendToQueue}
              className="w-full py-2.5 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] border border-[#EBEBF5] rounded-lg transition-colors">
              Send to approval queue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 rounded-full bg-[#E8F7F2] flex items-center justify-center mx-auto mb-4 text-2xl">✅</div>
          <h3 className="text-base font-bold text-[#242450] mb-2">Leave logged</h3>
          <p className="text-sm text-[#5777AB] mb-6">
            {days} working day{days!==1?'s':''} recorded for {form.personName}.
          </p>
          <button onClick={onClose} className="px-6 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6B02A0]">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#242450]">Log Leave</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] text-[#9CA3AF]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-4">
          {/* Admin: person selector */}
          {isAdmin && (
            <div>
              <label className={label}>Who is this leave for?</label>
              <select className={ic} value={form.personName} onChange={e => setForm(f=>({...f,personName:e.target.value}))}>
                {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}{m===currentUserName?' (me)':''}</option>)}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={label}>Start Date *</label>
              <input type="date" className={ic} value={form.startDate} onChange={e => setForm(f=>({...f,startDate:e.target.value}))} />
            </div>
            <div>
              <label className={label}>End Date *</label>
              <input type="date" className={ic} value={form.endDate} min={form.startDate} onChange={e => setForm(f=>({...f,endDate:e.target.value}))} />
            </div>
          </div>
          {form.startDate && form.endDate && form.endDate >= form.startDate && (
            <p className="text-xs text-[#1D9E75] font-semibold -mt-2">{days} working day{days!==1?'s':''}</p>
          )}
          <div>
            <label className={label}>Type *</label>
            <select className={ic} value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
              <option value="">Select type…</option>
              <option value="Annual Leave">Annual Leave</option>
              <option value="Sick">Sick</option>
              <option value="Other">Other</option>
            </select>
          </div>
          <div>
            <label className={label}>Notes <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <textarea className={ic+' h-20 resize-none'} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Any additional context…" />
          </div>
          {!isAdmin && needsApproval && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
              <span className="text-base mt-0.5">ℹ️</span>
              <p className="text-xs text-[#A16207]">Your leave requests require approval from Elena before they're confirmed.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!isValid || saving}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] transition-colors">
            {saving ? 'Saving…' : (needsApproval && !isAdmin) ? 'Submit Request' : 'Log Leave'}
          </button>
        </div>
      </div>
    </div>
  );
}