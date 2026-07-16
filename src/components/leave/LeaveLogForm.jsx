import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Paperclip } from 'lucide-react';

const REQUIRES_APPROVAL = ['George', 'Martinique'];
const ADMINS = ['Elena', 'Chris'];
const ALL_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor', 'David'];

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

export default function LeaveLogForm({ currentUserName, onClose, onSaved, inline = false }) {
  const isAdmin = ADMINS.includes(currentUserName);
  const [form, setForm] = useState({ personName: currentUserName, startDate: '', endDate: '', type: '', notes: '' });
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [pendingEntry, setPendingEntry] = useState(null); // used for admin quick-approve prompt
  const [sickNoteFile, setSickNoteFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  const days = calcWorkingDays(form.startDate, form.endDate);
  const targetPerson = form.personName || currentUserName;
  const needsApproval = REQUIRES_APPROVAL.includes(targetPerson);
  const isValid = form.startDate && form.endDate && form.type && form.endDate >= form.startDate && form.personName;

  const handleSubmit = async () => {
    if (!isValid || saving || uploading) return;
    setSaving(true);
    let sickNoteFileUrl;
    let sickNoteFileName;
    if (form.type === 'Sick' && sickNoteFile) {
      setUploading(true);
      try {
        const res = await base44.integrations.Core.UploadFile({ file: sickNoteFile });
        sickNoteFileUrl = res.file_url;
        sickNoteFileName = sickNoteFile.name;
      } catch {
        setUploading(false);
        setSaving(false);
        return;
      }
      setUploading(false);
    }
    const entry = await base44.entities.LeaveEntry.create({
      personName: targetPerson,
      startDate: form.startDate,
      endDate: form.endDate,
      type: form.type,
      notes: form.notes.trim() || undefined,
      entryMethod: needsApproval ? 'Requires Approval' : 'Self-Logged',
      status: needsApproval ? 'Requested' : 'Confirmed',
      ...(sickNoteFileUrl ? { sickNoteFileUrl, sickNoteFileName } : {}),
    });
    setSickNoteFile(null);
    setSaving(false);
    // Admin assigning to George/Martinique → show quick-approve prompt (never for self-submissions)
    if (isAdmin && needsApproval && targetPerson !== currentUserName) {
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

  const resetForm = () => {
    setSubmitted(false);
    setPendingEntry(null);
    setForm({ personName: currentUserName, startDate: '', endDate: '', type: '', notes: '' });
    setSickNoteFile(null);
  };

  // ── Quick-approve prompt (admin only, after submitting for George/Martinique) ──
  if (pendingEntry) {
    return (
      <div className={inline ? "" : "fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"} onClick={e => e.stopPropagation()}>
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
              Send to Approval Requests
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Success screen ──
  if (submitted) {
    const isAwaitingApproval = needsApproval && !isAdmin;
    return (
      <div className={inline ? "" : "fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"} onClick={inline ? undefined : onClose}>
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl ${isAwaitingApproval ? 'bg-[#FFFBEB]' : 'bg-[#E8F7F2]'}`}>{isAwaitingApproval ? '⏳' : '✅'}</div>
          <h3 className="text-base font-bold text-[#242450] mb-2">{isAwaitingApproval ? 'Request submitted' : 'Time off logged'}</h3>
          <p className="text-sm text-[#5777AB] mb-6">
            {isAwaitingApproval
              ? 'Your time off request has been submitted and is awaiting approval.'
              : `${days} working day${days!==1?'s':''} recorded for ${form.personName}.`}
          </p>
          <button onClick={inline ? resetForm : onClose} className="px-6 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6B02A0]">{inline ? 'Log another' : 'Done'}</button>
        </div>
      </div>
    );
  }

  return (
    <div className={inline ? "" : "fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4"} onClick={inline ? undefined : onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-base font-bold text-[#242450]">Log Time Off</h3>
          {!inline && <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] text-[#9CA3AF]"><X className="w-4 h-4" /></button>}
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
          {form.type === 'Sick' && (
            <div>
              <label className={label}>Sick note / supporting document <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
              <p className="text-[10px] text-[#9CA3AF] mb-1.5 -mt-0.5">Upload a sick note or any relevant documentation</p>
              {!sickNoteFile ? (
                <label
                  onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={e => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files?.[0]; if (f) setSickNoteFile(f); }}
                  className={`block cursor-pointer border-2 border-dashed rounded-lg py-4 px-3 text-center transition-colors ${dragOver ? 'border-[#8403C5] bg-[#F3E8FF]' : 'border-[#EBEBF5] hover:border-[#8403C5] hover:bg-[#F6F6FB]'}`}
                >
                  <input type="file" accept=".pdf,.png,.jpg,.jpeg,.docx" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) setSickNoteFile(f); e.target.value = ''; }} />
                  <Paperclip className="w-5 h-5 mx-auto text-[#9CA3AF] mb-1" />
                  <p className="text-xs font-medium text-[#5777AB]">Drag & drop or click to browse</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">PDF, PNG, JPG or DOCX</p>
                </label>
              ) : (
                <div className="flex items-center gap-2 px-3 py-2 bg-[#F3E8FF] border border-[#D8D8EE] rounded-lg">
                  <Paperclip className="w-3.5 h-3.5 text-[#8403C5] shrink-0" />
                  <span className="text-xs font-medium text-[#242450] truncate flex-1">{sickNoteFile.name}</span>
                  <button type="button" onClick={() => setSickNoteFile(null)} className="text-[#9CA3AF] hover:text-[#DC2626] shrink-0">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          )}
          {!isAdmin && needsApproval && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FFFBEB] border border-[#FDE68A] rounded-lg">
              <span className="text-base mt-0.5">ℹ️</span>
              <p className="text-xs text-[#A16207]">Your leave requests require approval from Elena before they're confirmed.</p>
            </div>
          )}
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
          <button onClick={handleSubmit} disabled={!isValid || saving || uploading}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] transition-colors">
            {uploading ? 'Uploading…' : saving ? 'Saving…' : (needsApproval && !isAdmin) ? 'Submit Request' : 'Log Time Off'}
          </button>
        </div>
      </div>
    </div>
  );
}