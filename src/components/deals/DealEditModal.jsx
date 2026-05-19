import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';

export default function DealEditModal({ deal, onClose, onSaved }) {
  const [form, setForm] = useState({
    clientName: deal.clientName || '',
    plan: deal.plan || 'Starter',
    monthlyValue: deal.monthlyValue || '',
    subscriptionStartDate: deal.subscriptionStartDate || '',
    subscriptionEndDate: deal.subscriptionEndDate || '',
    accountingServiceIncluded: deal.accountingServiceIncluded || false,
    accountingServiceValue: deal.accountingServiceValue || '',
    onboardingPackage: deal.onboardingPackage || 'Success Essential',
    onboardingFee: deal.onboardingFee || 0,
    status: deal.status || 'Active',
    notes: deal.notes || '',
    backdated: deal.backdated || false,
    backdatedStartDate: deal.subscriptionStartDate || '',
  });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const monthly = parseFloat(form.monthlyValue) || 0;
  const annual = monthly * 12;
  const acctg = form.accountingServiceIncluded ? (parseFloat(form.accountingServiceValue) || 0) : 0;
  const fee = parseFloat(form.onboardingFee) || 0;
  const total = annual + acctg + fee;

  const handleSave = async () => {
    setSaving(true);
    const updates = {
      ...form,
      monthlyValue: monthly,
      annualValue: annual,
      accountingServiceValue: acctg,
      onboardingFee: fee,
      totalFirstYearValue: total,
      subscriptionStartDate: form.backdated ? form.backdatedStartDate : form.subscriptionStartDate,
    };
    await base44.entities.Deal.update(deal.id, updates);
    setSaving(false);
    onSaved({ ...deal, ...updates });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <h2 className="text-base font-bold text-navy">Edit Deal — {deal.clientName}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Client name</label>
              <input className={inputCls} value={form.clientName} onChange={e => up('clientName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Plan</label>
              <select className={inputCls} value={form.plan} onChange={e => up('plan', e.target.value)}>
                {['Starter', 'Professional', 'Business'].map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => up('status', e.target.value)}>
                {['Active', 'Up for Renewal', 'Churned'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly value (£)</label>
              <input type="number" className={inputCls} value={form.monthlyValue} onChange={e => up('monthlyValue', e.target.value)} />
            </div>
            {!form.backdated && (
              <div>
                <label className={labelCls}>Start date</label>
                <input type="date" className={inputCls} value={form.subscriptionStartDate} onChange={e => up('subscriptionStartDate', e.target.value)} />
              </div>
            )}
            <div>
              <label className={labelCls}>End date</label>
              <input type="date" className={inputCls} value={form.subscriptionEndDate} onChange={e => up('subscriptionEndDate', e.target.value)} />
            </div>
          </div>

          {/* Backdate toggle */}
          <div className="border border-ew-border rounded-xl p-4 bg-ew-bg space-y-3">
            <div className="flex items-center gap-3">
              <button
                onClick={() => up('backdated', !form.backdated)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${form.backdated ? 'bg-navy' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${form.backdated ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
              <div>
                <p className="text-sm font-medium text-ew-body">Backdate this deal</p>
                <p className="text-xs text-ew-muted">Excluded from "added this month" metrics but included in MRR/ARR totals</p>
              </div>
            </div>
            {form.backdated && (
              <div>
                <label className={labelCls}>Actual deal start date</label>
                <input type="date" className={inputCls} value={form.backdatedStartDate} onChange={e => up('backdatedStartDate', e.target.value)} />
              </div>
            )}
          </div>

          <div className="border-t border-ew-border pt-4">
            <div className="flex items-center gap-3 mb-3">
              <p className="text-xs font-medium text-ew-body">Accounting service included</p>
              <button
                onClick={() => up('accountingServiceIncluded', !form.accountingServiceIncluded)}
                className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.accountingServiceIncluded ? 'bg-navy' : 'bg-gray-200'}`}
              >
                <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${form.accountingServiceIncluded ? 'translate-x-4' : 'translate-x-1'}`} />
              </button>
            </div>
            {form.accountingServiceIncluded && (
              <div className="w-1/3">
                <label className={labelCls}>Accounting value (£/yr)</label>
                <input type="number" className={inputCls} value={form.accountingServiceValue} onChange={e => up('accountingServiceValue', e.target.value)} />
              </div>
            )}
          </div>

          <div className="border-t border-ew-border pt-4">
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' h-16 resize-none'} value={form.notes} onChange={e => up('notes', e.target.value)} />
          </div>

          <div className="border-t border-ew-border pt-4">
            <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Deal summary</p>
            <div className="bg-ew-bg rounded-xl p-4 grid grid-cols-4 gap-4 text-center">
              <div><p className="text-xs text-ew-muted mb-1">Monthly</p><p className="text-lg font-bold text-navy">{fmt(monthly)}</p></div>
              <div><p className="text-xs text-ew-muted mb-1">Annual</p><p className="text-lg font-bold text-navy">{fmt(annual)}</p></div>
              <div><p className="text-xs text-ew-muted mb-1">Year 1 total</p><p className="text-lg font-bold text-navy">{fmt(total)}</p></div>
              <div><p className="text-xs text-ew-muted mb-1">Year 2+</p><p className="text-lg font-bold text-navy">{fmt(annual + acctg)}</p></div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}