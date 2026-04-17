import React, { useState } from 'react';
import { X } from 'lucide-react';
import { format, addMonths } from 'date-fns';
import { base44 } from '@/api/base44Client';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';

export default function RenewModal({ deal, onClose, onRenewed }) {
  const defaultEnd = deal.subscriptionEndDate
    ? format(addMonths(new Date(deal.subscriptionEndDate), 12), 'yyyy-MM-dd')
    : format(addMonths(new Date(), 12), 'yyyy-MM-dd');

  const [newEndDate, setNewEndDate] = useState(defaultEnd);
  const [newMonthly, setNewMonthly] = useState(deal.monthlyValue || '');
  const [saving, setSaving] = useState(false);

  const handleRenew = async () => {
    setSaving(true);
    const monthly = parseFloat(newMonthly) || deal.monthlyValue || 0;
    const annual = monthly * 12;
    const acctg = deal.accountingServiceIncluded ? (deal.accountingServiceValue || 0) : 0;
    const fee = deal.onboardingFee || 0;
    const updates = {
      subscriptionEndDate: newEndDate,
      monthlyValue: monthly,
      annualValue: annual,
      totalFirstYearValue: annual + acctg + fee,
      status: 'Active',
    };
    await base44.entities.Deal.update(deal.id, updates);
    setSaving(false);
    onRenewed({ ...deal, ...updates });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border">
          <h2 className="text-sm font-bold text-navy">Renew deal — {deal.clientName}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>New end date</label>
            <input type="date" className={inputCls} value={newEndDate} onChange={e => setNewEndDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>New monthly value (£) <span className="text-ew-muted font-normal">— optional, leave to keep current</span></label>
            <input type="number" className={inputCls} value={newMonthly} onChange={e => setNewMonthly(e.target.value)} placeholder={`Current: £${deal.monthlyValue || 0}`} />
          </div>
        </div>
        <div className="px-5 py-4 border-t border-ew-border flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button onClick={handleRenew} disabled={saving || !newEndDate} className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40">
            {saving ? 'Renewing…' : 'Confirm renewal'}
          </button>
        </div>
      </div>
    </div>
  );
}