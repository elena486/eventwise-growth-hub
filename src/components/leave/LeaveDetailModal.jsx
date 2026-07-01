import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Pencil, Trash2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const ADMINS = ['Elena', 'Chris'];
const REQUIRES_APPROVAL = ['George', 'Martinique'];
const ALL_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'David'];

const TYPE_STYLES = {
  'Annual Leave': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Sick': 'bg-[#FFFBEB] text-[#A16207]',
  'Other': 'bg-[#EBEBF5] text-[#5777AB]',
};
const STATUS_STYLES = {
  Confirmed: 'bg-[#E8F7F2] text-[#1D9E75]',
  Approved:  'bg-[#EEF2F8] text-[#5777AB]',
  Requested: 'bg-[#FFFBEB] text-[#A16207]',
  Declined:  'bg-[#FEF2F2] text-[#DC2626]',
};
const AVATAR_COLORS = ['#8403C5','#1D4ED8','#15803D','#A16207','#B91C1C','#7E22CE','#0284C7','#0F766E'];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name||'').length; i++) h = name.charCodeAt(i) + ((h<<5)-h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name) {
  return (name||'?').split(' ').map(w=>w[0]).slice(0,2).join('').toUpperCase();
}
function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}
function calcWorkingDays(start, end) {
  if (!start||!end) return 0;
  try {
    let s=new Date(start), e=new Date(end), c=0;
    while(s<=e){ if(s.getDay()!==0&&s.getDay()!==6) c++; s=new Date(s.getTime()+86400000); }
    return Math.max(c,1);
  } catch { return 1; }
}

const ic = 'w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]';
const lbl = 'block text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1';

export default function LeaveDetailModal({ entry, currentUserName, onClose, onUpdated, onDeleted }) {
  const [editing, setEditing] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [form, setForm] = useState({
    personName: entry.personName,
    startDate: entry.startDate,
    endDate: entry.endDate,
    type: entry.type,
    notes: entry.notes || '',
    status: entry.status,
  });
  const [saving, setSaving] = useState(false);

  const isAdmin = ADMINS.includes(currentUserName);
  const isOwn = entry.personName === currentUserName;
  const canDelete = isAdmin || (isOwn && (entry.status === 'Requested' || entry.status === 'Confirmed'));
  const canEdit = isAdmin || isOwn;
  const days = calcWorkingDays(form.startDate, form.endDate);

  const handleSave = async () => {
    setSaving(true);
    const updated = await base44.entities.LeaveEntry.update(entry.id, {
      personName: form.personName,
      startDate: form.startDate,
      endDate: form.endDate,
      type: form.type,
      notes: form.notes.trim() || undefined,
      ...(isAdmin ? { status: form.status } : {}),
    });
    setSaving(false);
    onUpdated?.({ ...entry, ...form, notes: form.notes.trim() || undefined });
    setEditing(false);
  };

  const handleDelete = async () => {
    await base44.entities.LeaveEntry.delete(entry.id);
    onDeleted?.(entry.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBF5]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0"
              style={{ backgroundColor: getAvatarColor(entry.personName) }}>
              {getInitials(entry.personName)}
            </div>
            <div>
              <p className="text-sm font-bold text-[#242450]">{entry.personName}</p>
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[entry.type] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                {entry.type}
              </span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] text-[#9CA3AF]"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-5 py-4">
          {!editing ? (
            /* ── Read view ── */
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={lbl}>Start Date</p>
                  <p className="text-sm text-[#242450] font-medium">{fmtDate(entry.startDate)}</p>
                </div>
                <div>
                  <p className={lbl}>End Date</p>
                  <p className="text-sm text-[#242450] font-medium">{fmtDate(entry.endDate)}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <p className={lbl}>Days</p>
                  <p className="text-sm text-[#242450] font-semibold">{calcWorkingDays(entry.startDate, entry.endDate)} working days</p>
                </div>
                <div>
                  <p className={lbl}>Status</p>
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[entry.status] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                    {entry.status}
                  </span>
                </div>
              </div>
              {entry.notes && (
                <div>
                  <p className={lbl}>Notes</p>
                  <p className="text-sm text-[#5777AB]">{entry.notes}</p>
                </div>
              )}
              {isAdmin && (
                <div className="grid grid-cols-2 gap-3 pt-1 border-t border-[#EBEBF5]">
                  <div>
                    <p className={lbl}>Entry Method</p>
                    <p className="text-xs text-[#9CA3AF]">{entry.entryMethod || '—'}</p>
                  </div>
                  {entry.approvedBy && (
                    <div>
                      <p className={lbl}>Approved By</p>
                      <p className="text-xs text-[#9CA3AF]">{entry.approvedBy}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* ── Edit view ── */
            <div className="space-y-3">
              {isAdmin && (
                <div>
                  <label className={lbl}>Person</label>
                  <select className={ic} value={form.personName} onChange={e => setForm(f=>({...f,personName:e.target.value}))}>
                    {ALL_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
              )}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={lbl}>Start Date *</label>
                  <input type="date" className={ic} value={form.startDate} onChange={e => setForm(f=>({...f,startDate:e.target.value}))} />
                </div>
                <div>
                  <label className={lbl}>End Date *</label>
                  <input type="date" className={ic} value={form.endDate} min={form.startDate} onChange={e => setForm(f=>({...f,endDate:e.target.value}))} />
                </div>
              </div>
              {form.startDate && form.endDate && form.endDate >= form.startDate && (
                <p className="text-xs text-[#1D9E75] font-semibold">{days} working day{days!==1?'s':''}</p>
              )}
              <div>
                <label className={lbl}>Type *</label>
                <select className={ic} value={form.type} onChange={e => setForm(f=>({...f,type:e.target.value}))}>
                  <option value="Annual Leave">Annual Leave</option>
                  <option value="Sick">Sick</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              {isAdmin && (
                <div>
                  <label className={lbl}>Status</label>
                  <select className={ic} value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))}>
                    <option value="Confirmed">Confirmed</option>
                    <option value="Approved">Approved</option>
                    <option value="Requested">Requested</option>
                    <option value="Declined">Declined</option>
                  </select>
                </div>
              )}
              <div>
                <label className={lbl}>Notes</label>
                <textarea className={ic+' h-16 resize-none'} value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Optional notes…" />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-[#EBEBF5] flex items-center justify-between">
          <div className="flex items-center gap-2">
            {canDelete && !editing && (
              <button onClick={() => setDeleteConfirm(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#DC2626] hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="px-4 py-1.5 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
                <button onClick={handleSave} disabled={saving || !form.startDate || !form.endDate || !form.type}
                  className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF]">
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
              </>
            ) : (
              <>
                <button onClick={onClose} className="px-4 py-1.5 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Close</button>
                {canEdit && (
                  <button onClick={() => setEditing(true)}
                    className="flex items-center gap-1.5 px-4 py-1.5 text-sm font-semibold bg-[#242450] text-white rounded-lg hover:bg-[#1A1A3A] transition-colors">
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-60 p-4" onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
            <h3 className="text-base font-bold text-[#242450] mb-2">Delete leave entry?</h3>
            <p className="text-sm text-[#5777AB] mb-5">
              Are you sure you want to delete <strong>{entry.personName}</strong>'s {entry.type} entry ({fmtDate(entry.startDate)} – {fmtDate(entry.endDate)})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}