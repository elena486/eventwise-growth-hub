import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { parseISO } from 'date-fns';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';
const MEMBERS = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];
const STATUSES = ['Approved', 'Pending', 'Declined'];

function calcWorkingDays(start, end) {
  if (!start) return 1;
  try {
    let s = parseISO(start), e = end ? parseISO(end) : parseISO(start), count = 0;
    while (s <= e) {
      const day = s.getDay();
      if (day !== 0 && day !== 6) count++;
      s = new Date(s.getTime() + 86400000);
    }
    return Math.max(count, 1);
  } catch { return 1; }
}

const EMPTY = { teamMember: 'George', type: 'Vacation', startDate: '', endDate: '', workingDays: 1, status: 'Approved', notes: '' };

export default function TimeOffModal({ record, onClose, onSaved }) {
  const [form, setForm] = useState(record ? { ...record } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => {
    setForm(prev => {
      const updated = { ...prev, [k]: v };
      if (k === 'startDate' || k === 'endDate') {
        const s = k === 'startDate' ? v : prev.startDate;
        const e = k === 'endDate' ? v : prev.endDate;
        updated.workingDays = calcWorkingDays(s, e);
        if (s) updated.year = new Date(s).getFullYear();
      }
      return updated;
    });
  };

  const handleSave = async () => {
    if (!form.startDate || !form.teamMember) return;
    setSaving(true);
    const payload = { ...form, year: form.startDate ? new Date(form.startDate).getFullYear() : null };
    let saved;
    if (record?.id) {
      await base44.entities.TimeOffRecord.update(record.id, payload);
      saved = { ...record, ...payload };
    } else {
      saved = await base44.entities.TimeOffRecord.create(payload);
    }
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border">
          <h2 className="text-sm font-bold text-navy">{record ? 'Edit Record' : 'Log Time Off'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Team Member</label>
              <select className={inputCls} value={form.teamMember} onChange={e => up('teamMember', e.target.value)}>
                {MEMBERS.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => up('type', e.target.value)}>
                {['Vacation', 'Sick Day', 'Other'].map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Start Date *</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => up('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End Date</label>
              <input type="date" className={inputCls} value={form.endDate || ''} onChange={e => up('endDate', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Working Days</label>
              <input type="number" min="0.5" step="0.5" className={inputCls} value={form.workingDays} onChange={e => up('workingDays', parseFloat(e.target.value) || 1)} />
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => up('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.notes || ''} onChange={e => up('notes', e.target.value)} placeholder="Optional notes…" />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-ew-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.startDate}
            className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-40">
            {saving ? 'Saving…' : record ? 'Save changes' : 'Log record'}
          </button>
        </div>
      </div>
    </div>
  );
}