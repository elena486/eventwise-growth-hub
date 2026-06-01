import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addMonths } from 'date-fns';
import { X, Info } from 'lucide-react';

const ic = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';
const lc = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';

const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
const ACCT_OPTIONS = ['Not included', 'Included in plan', 'Included in accounting service fee', 'Separate fee'];
const ONBOARDING_PLANS = ['', 'Basic', 'Standard', 'Enterprise', 'Option 1'];
const CONTRACT_LENGTHS = ['Monthly rolling', '6 months', '12 months', '24 months'];
const CS_OWNERS = ['Martinique Keeler', 'Chris Carter'];
const CLOSED_BY = ['Chris', 'Ramesh', 'George'];

const CS_OWNER_EMAILS = {
  'Martinique Keeler': 'martinique@eventwise.com',
  'Chris Carter': 'chris@eventwise.com',
};

function calcEndDate(startDate, contractLength) {
  if (!startDate || !contractLength) return '';
  try {
    const start = new Date(startDate);
    const monthsMap = { 'Monthly rolling': 1, '6 months': 6, '12 months': 12, '24 months': 24 };
    const months = monthsMap[contractLength];
    if (!months) return '';
    return format(addMonths(start, months), 'yyyy-MM-dd');
  } catch { return ''; }
}

const defaultForm = {
  clientName: '',
  contactName: '',
  contactEmail: '',
  plan: 'Starter',
  monthlyValue: '',
  onboardingFee: '',
  accountingService: 'Not included',
  accountingServiceFee: '',
  accountingCost: '',
  onboardingPackage: '',
  subscriptionStartDate: '',
  contractLength: '12 months',
  subscriptionEndDate: '',
  csOwner: 'Martinique Keeler',
  closedBy: 'Chris',
  notes: '',
};

export default function AddHistoricalDealModal({ onClose, onAdded }) {
  const [form, setForm] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

  // Auto-calc end date when start or contract length changes
  useEffect(() => {
    if (form.subscriptionStartDate && form.contractLength) {
      set('subscriptionEndDate', calcEndDate(form.subscriptionStartDate, form.contractLength));
    }
  }, [form.subscriptionStartDate, form.contractLength]);

  const annualValue = form.monthlyValue ? (parseFloat(form.monthlyValue) || 0) * 12 : null;

  const validate = () => {
    const e = {};
    if (!form.clientName.trim()) e.clientName = 'Required';
    if (!form.plan) e.plan = 'Required';
    if (!form.monthlyValue) e.monthlyValue = 'Required';
    if (!form.subscriptionStartDate) e.subscriptionStartDate = 'Required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = async () => {
    if (!validate()) return;
    setSaving(true);

    const monthly = parseFloat(form.monthlyValue) || 0;
    const annual = monthly * 12;
    const setupFee = parseFloat(form.onboardingFee) || 0;
    const acctFee = parseFloat(form.accountingServiceFee) || 0;
    const acctCost = parseFloat(form.accountingCost) || 0;

    // 1. Create the deal
    const deal = await base44.entities.Deal.create({
      clientName: form.clientName,
      plan: form.plan,
      monthlyValue: monthly,
      annualValue: annual,
      onboardingFee: setupFee || undefined,
      accountingService: form.accountingService,
      accountingServiceFee: form.accountingService === 'Separate fee' ? acctFee : undefined,
      accountingCost: form.accountingService === 'Separate fee' ? acctCost : undefined,
      onboardingPackage: form.onboardingPackage || undefined,
      subscriptionStartDate: form.subscriptionStartDate,
      subscriptionEndDate: form.subscriptionEndDate || undefined,
      contractLength: form.contractLength,
      csOwner: form.csOwner,
      closedBy: form.closedBy,
      notes: form.notes || undefined,
      status: 'Active',
      backdated: true,
      totalFirstYearValue: annual + setupFee,
    });

    // 2. Create client record
    const client = await base44.entities.Client.create({
      name: form.clientName,
      contactName: form.contactName || undefined,
      contactEmail: form.contactEmail || undefined,
      plan: form.plan,
      status: 'Live',
      owner: form.csOwner,
      trialStartDate: form.subscriptionStartDate,
      renewalDate: form.subscriptionEndDate || undefined,
      addedManually: true,
      dealId: deal.id,
    });

    // 3. Link client back to deal
    await base44.entities.Deal.update(deal.id, { clientId: client.id });

    // 4. Send email notification
    const ownerEmail = CS_OWNER_EMAILS[form.csOwner];
    if (ownerEmail) {
      base44.integrations.Core.SendEmail({
        to: ownerEmail,
        subject: `New client record created — ${form.clientName}`,
        body: `A new client record has been created for ${form.clientName} in Eventwise HQ.\n\nPlease open their record and complete their health scores, set their priority tier, and confirm their renewal date.\n\nView in Customer Success → Clients.`,
      }).catch(() => {});
    }

    setSaving(false);
    onAdded({ ...deal, clientId: client.id });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[92vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-[#E5E7EB] px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold text-[#111827]">Add Historical Deal</h2>
            <p className="text-xs text-[#9CA3AF] mt-0.5">Manually add an existing client who wasn't put through the pipeline</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF]"><X className="w-5 h-5" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Notice banner */}
          <div className="flex gap-3 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-800 leading-relaxed">
              <strong>This deal will be marked as Historical</strong> and will not affect this month's MRR/ARR growth figures. It will be included in your total MRR, ARR, and active deal counts.
            </p>
          </div>

          {/* Client details */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">Client Details</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lc}>Company name *</label>
                <input className={`${ic} ${errors.clientName ? 'border-red-400' : ''}`} value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="e.g. Glastonbury Festival Ltd" />
                {errors.clientName && <p className="text-xs text-red-500 mt-0.5">{errors.clientName}</p>}
              </div>
              <div>
                <label className={lc}>Primary contact name</label>
                <input className={ic} value={form.contactName} onChange={e => set('contactName', e.target.value)} placeholder="Full name" />
              </div>
              <div>
                <label className={lc}>Primary contact email</label>
                <input type="email" className={ic} value={form.contactEmail} onChange={e => set('contactEmail', e.target.value)} placeholder="email@company.com" />
              </div>
            </div>
          </div>

          {/* Subscription */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">Subscription</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lc}>Plan *</label>
                <select className={`${ic} ${errors.plan ? 'border-red-400' : ''}`} value={form.plan} onChange={e => set('plan', e.target.value)}>
                  {PLANS.map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div>
                <label className={lc}>Monthly value £ *</label>
                <input type="number" className={`${ic} ${errors.monthlyValue ? 'border-red-400' : ''}`} value={form.monthlyValue} onChange={e => set('monthlyValue', e.target.value)} placeholder="0" min="0" />
                {errors.monthlyValue && <p className="text-xs text-red-500 mt-0.5">{errors.monthlyValue}</p>}
              </div>
              {annualValue !== null && (
                <div>
                  <label className={lc}>Annual value (auto-calculated)</label>
                  <input className={`${ic} bg-[#F9FAFB] text-[#9CA3AF] cursor-not-allowed`} value={`£${Math.round(annualValue).toLocaleString('en-GB')}`} readOnly />
                </div>
              )}
              <div>
                <label className={lc}>Setup fee £ (optional)</label>
                <input type="number" className={ic} value={form.onboardingFee} onChange={e => set('onboardingFee', e.target.value)} placeholder="0" min="0" />
              </div>
            </div>
          </div>

          {/* Accounting */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">Accounting Service</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <label className={lc}>Accounting service</label>
                <select className={ic} value={form.accountingService} onChange={e => set('accountingService', e.target.value)}>
                  {ACCT_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              {form.accountingService === 'Separate fee' && (
                <>
                  <div>
                    <label className={lc}>Accounting fee charged £/month</label>
                    <input type="number" className={ic} value={form.accountingServiceFee} onChange={e => set('accountingServiceFee', e.target.value)} placeholder="0" min="0" />
                  </div>
                  <div>
                    <label className={lc}>Accounting cost £/month</label>
                    <input type="number" className={ic} value={form.accountingCost} onChange={e => set('accountingCost', e.target.value)} placeholder="0 — what Eventwise pays ITLA" min="0" />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Contract */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">Contract</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lc}>Onboarding plan</label>
                <select className={ic} value={form.onboardingPackage} onChange={e => set('onboardingPackage', e.target.value)}>
                  {ONBOARDING_PLANS.map(p => <option key={p} value={p}>{p || '— Not set —'}</option>)}
                </select>
              </div>
              <div>
                <label className={lc}>Contract length</label>
                <select className={ic} value={form.contractLength} onChange={e => set('contractLength', e.target.value)}>
                  {CONTRACT_LENGTHS.map(l => <option key={l}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className={lc}>Subscription start date *</label>
                <input type="date" className={`${ic} ${errors.subscriptionStartDate ? 'border-red-400' : ''}`} value={form.subscriptionStartDate} onChange={e => set('subscriptionStartDate', e.target.value)} />
                {errors.subscriptionStartDate && <p className="text-xs text-red-500 mt-0.5">{errors.subscriptionStartDate}</p>}
              </div>
              <div>
                <label className={lc}>Contract end date (auto-calculated, editable)</label>
                <input type="date" className={ic} value={form.subscriptionEndDate} onChange={e => set('subscriptionEndDate', e.target.value)} />
              </div>
            </div>
          </div>

          {/* Ownership */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.12em] mb-3">Ownership</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={lc}>CS owner</label>
                <select className={ic} value={form.csOwner} onChange={e => set('csOwner', e.target.value)}>
                  {CS_OWNERS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div>
                <label className={lc}>Closed by</label>
                <select className={ic} value={form.closedBy} onChange={e => set('closedBy', e.target.value)}>
                  {CLOSED_BY.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className={lc}>Notes (optional)</label>
            <textarea className={`${ic} h-24 resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Any additional context about this client…" />
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-[#E5E7EB] px-6 py-4 flex justify-end gap-3 rounded-b-2xl">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Add Historical Deal'}
          </button>
        </div>
      </div>
    </div>
  );
}