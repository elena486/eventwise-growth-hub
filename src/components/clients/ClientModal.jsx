import React, { useState, useEffect } from 'react';
import { OWNERS, SECONDARY_OWNERS, STATUSES, STATUS_STYLES } from '@/lib/csData';
import { X } from 'lucide-react';

const EMPTY = {
  name: '', contactName: '', contactEmail: '', owner: 'Martinique Keeler',
  secondaryOwner: 'None', status: 'Trial', trialStartDate: '', renewalDate: '',
  notes: '', plan: '',
};

export default function ClientModal({ client, onSave, onClose }) {
  const [form, setForm] = useState(client ? { ...EMPTY, ...client } : EMPTY);
  const up = (f, v) => setForm(p => ({ ...p, [f]: v }));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave(form);
  };

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
  const labelCls = 'block text-xs font-medium text-ew-body mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <h2 className="text-base font-bold text-navy">{client ? 'Edit Client' : 'Add Client'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Company name *</label>
              <input className={inputCls} value={form.name} onChange={e => up('name', e.target.value)} required />
            </div>
            <div>
              <label className={labelCls}>Contact name</label>
              <input className={inputCls} value={form.contactName} onChange={e => up('contactName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contact email</label>
              <input type="email" className={inputCls} value={form.contactEmail} onChange={e => up('contactEmail', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Owner</label>
              <select className={inputCls} value={form.owner} onChange={e => up('owner', e.target.value)}>
                {OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Secondary owner</label>
              <select className={inputCls} value={form.secondaryOwner} onChange={e => up('secondaryOwner', e.target.value)}>
                {SECONDARY_OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => up('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Plan</label>
              <select className={inputCls} value={form.plan || ''} onChange={e => up('plan', e.target.value)}>
                <option value="">—</option>
                <option>Starter</option>
                <option>Professional</option>
                <option>Business</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Trial start date</label>
              <input type="date" className={inputCls} value={form.trialStartDate || ''} onChange={e => up('trialStartDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Renewal date</label>
              <input type="date" className={inputCls} value={form.renewalDate || ''} onChange={e => up('renewalDate', e.target.value)} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Notes / Next action</label>
              <textarea className={inputCls + ' h-20 resize-none'} value={form.notes || ''} onChange={e => up('notes', e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">Save client</button>
          </div>
        </form>
      </div>
    </div>
  );
}