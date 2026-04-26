import React, { useState } from 'react';
import { X, Check, AlertTriangle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-700',
  Pending:  'bg-amber-50 text-amber-700',
  Declined: 'bg-red-50 text-red-600',
};
const TYPE_STYLES = {
  Vacation:   'bg-emerald-50 text-emerald-700',
  'Sick Day': 'bg-amber-50 text-amber-700',
  Other:      'bg-gray-100 text-gray-600',
};
const MEMBERS = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];
const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-semibold text-ew-muted uppercase tracking-[0.08em] mb-1';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

export default function TimeOffSidePanel({ record, onClose, onUpdated, onDeleted }) {
  const [form, setForm] = useState({ ...record });
  const [saving, setSaving] = useState(false);
  const [declinePrompt, setDeclinePrompt] = useState(false);
  const [declineReason, setDeclineReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isPending = record.status === 'Pending';
  const isLocked = record.status === 'Approved' || record.status === 'Declined';

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.TimeOffRecord.update(form.id, form);
    setSaving(false);
    onUpdated(form);
  };

  const handleApprove = async () => {
    const updated = { ...form, status: 'Approved' };
    await base44.entities.TimeOffRecord.update(form.id, { status: 'Approved' });
    setForm(updated);
    onUpdated(updated);
  };

  const handleDecline = async () => {
    const updated = { ...form, status: 'Declined', declineReason };
    await base44.entities.TimeOffRecord.update(form.id, { status: 'Declined', declineReason });
    setForm(updated);
    onUpdated(updated);
    setDeclinePrompt(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.TimeOffRecord.delete(form.id);
    setDeleting(false);
    onDeleted(form.id);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-md bg-white border-l border-ew-border shadow-2xl flex flex-col pointer-events-auto font-dm">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy">{form.teamMember}</h2>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TYPE_STYLES[form.type] || 'bg-gray-100 text-gray-600'}`}>{form.type}</span>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[form.status] || 'bg-gray-100 text-gray-500'}`}>{form.status}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* Approve / Decline actions */}
          {isPending && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <p className="text-sm font-semibold text-amber-800 mb-3">⏳ Pending approval</p>
              {declinePrompt ? (
                <div className="space-y-2">
                  <input
                    className={inputCls}
                    placeholder="Decline reason…"
                    value={declineReason}
                    onChange={e => setDeclineReason(e.target.value)}
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <button onClick={handleDecline} disabled={!declineReason.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
                      Confirm Decline
                    </button>
                    <button onClick={() => setDeclinePrompt(false)} className="px-3 py-1.5 text-xs font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button onClick={handleApprove}
                    className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors">
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button onClick={() => setDeclinePrompt(true)}
                    className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">
                    Decline
                  </button>
                </div>
              )}
            </div>
          )}

          {isLocked && (
            <div className="bg-[#F7F7F8] border border-ew-border rounded-xl p-3 text-xs text-ew-muted flex items-center gap-2">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              This record is {form.status.toLowerCase()} and cannot be edited.
            </div>
          )}

          {/* Fields */}
          <div>
            <label className={labelCls}>Team Member</label>
            <select className={inputCls} value={form.teamMember} disabled={isLocked} onChange={e => up('teamMember', e.target.value)}>
              {MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} disabled={isLocked} onChange={e => up('type', e.target.value)}>
                {['Vacation', 'Sick Day', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <span className={`inline-block text-[11px] font-semibold px-2.5 py-1.5 rounded-full ${STATUS_STYLES[form.status] || 'bg-gray-100 text-gray-500'}`}>{form.status}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date</label>
              <input type="date" className={inputCls} value={form.startDate || ''} disabled={isLocked} onChange={e => up('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={form.endDate || ''} disabled={isLocked} onChange={e => up('endDate', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Working Days</label>
            <input type="number" className={inputCls} value={form.workingDays || ''} disabled={isLocked} onChange={e => up('workingDays', parseFloat(e.target.value) || 1)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.notes || ''} disabled={isLocked} onChange={e => up('notes', e.target.value)} placeholder="—" />
          </div>
          {form.declineReason && (
            <div>
              <label className={labelCls}>Decline Reason</label>
              <p className="text-sm text-red-600">{form.declineReason}</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ew-border flex items-center justify-between shrink-0">
          <div>
            {!deleteConfirm ? (
              <button onClick={() => setDeleteConfirm(true)} className="text-xs text-red-400 hover:text-red-600 font-medium transition-colors">Delete record</button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-600 font-medium">Sure?</span>
                <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 disabled:opacity-40">{deleting ? '…' : 'Yes, delete'}</button>
                <button onClick={() => setDeleteConfirm(false)} className="px-2 py-1 text-xs text-ew-muted hover:bg-ew-bg rounded-lg">Cancel</button>
              </div>
            )}
          </div>
          {!isLocked && (
            <div className="flex gap-2">
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-40">
                {saving ? 'Saving…' : 'Save'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}