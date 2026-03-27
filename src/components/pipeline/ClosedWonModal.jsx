import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { initTasks } from '@/lib/csData';
import { addMonths, format } from 'date-fns';
import { X, CheckSquare, Square } from 'lucide-react';

const ONBOARDING_FEES = { 'Success Essential': 0, 'Success Plus': 1500, 'Success Premium': 5000 };

const HANDOFF_ITEMS = [
  'Kick-off call booked with client',
  'Client has received welcome email',
  'Xero access confirmed',
  'Ticket seller details collected',
  'Budget template sent to client',
  'Martinique notified and briefed',
];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function calcDeal(form) {
  const monthly = parseFloat(form.monthlyValue) || 0;
  const annual = monthly * 12;
  const acctg = form.accountingServiceIncluded ? (parseFloat(form.accountingServiceValue) || 0) : 0;
  const fee = parseFloat(form.onboardingFee) || 0;
  const total = annual + acctg + fee;
  const year2 = annual + acctg;
  return { monthly, annual, acctg, fee, total, year2 };
}

export default function ClosedWonModal({ lead, onClose, onConverted }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addMonths(new Date(), 12), 'yyyy-MM-dd');

  const [form, setForm] = useState({
    companyName: lead.companyName || '',
    contactName: lead.contactName || '',
    contactEmail: '',
    plan: lead.plan || 'Starter',
    owner: 'Martinique Keeler',
    monthlyValue: lead.dealValueMonthly || '',
    subscriptionStartDate: today,
    subscriptionEndDate: endDate,
    accountingServiceIncluded: false,
    accountingServiceValue: '',
    onboardingPackage: 'Success Essential',
    onboardingFee: '0',
    notes: '',
  });

  const [screen, setScreen] = useState('deal'); // 'deal' | 'handoff'
  const [handoffTicked, setHandoffTicked] = useState([]);
  const [saving, setSaving] = useState(false);
  const [createdClientId, setCreatedClientId] = useState(null);

  const up = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'onboardingPackage') {
        next.onboardingFee = String(ONBOARDING_FEES[v] || 0);
      }
      if (k === 'subscriptionStartDate' && v) {
        try { next.subscriptionEndDate = format(addMonths(new Date(v), 12), 'yyyy-MM-dd'); } catch {}
      }
      return next;
    });
  };

  const calc = calcDeal(form);

  const handleConfirm = async () => {
    setSaving(true);
    // Create client
    const client = await base44.entities.Client.create({
      name: form.companyName,
      contactName: form.contactName,
      contactEmail: form.contactEmail,
      owner: form.owner,
      secondaryOwner: 'None',
      status: 'Onboarding',
      plan: form.plan,
      renewalDate: form.subscriptionEndDate,
      handoffIncomplete: true,
    });

    // Create deal
    const deal = await base44.entities.Deal.create({
      clientId: client.id,
      clientName: form.companyName,
      leadId: lead.id,
      plan: form.plan,
      subscriptionStartDate: form.subscriptionStartDate,
      subscriptionEndDate: form.subscriptionEndDate,
      monthlyValue: calc.monthly,
      annualValue: calc.annual,
      accountingServiceIncluded: form.accountingServiceIncluded,
      accountingServiceValue: form.accountingServiceIncluded ? calc.acctg : 0,
      onboardingPackage: form.onboardingPackage,
      onboardingFee: calc.fee,
      totalFirstYearValue: calc.total,
      status: 'Active',
      notes: form.notes,
    });

    // Create onboarding record
    await base44.entities.OnboardingRecord.create({
      clientId: client.id,
      clientName: form.companyName,
      tasks: JSON.stringify(initTasks()),
      lastUpdated: new Date().toISOString(),
    });

    // Mark lead as converted
    await base44.entities.Lead.update(lead.id, {
      converted: true,
      dealId: deal.id,
      stage: 'Closed Won',
    });

    setCreatedClientId(client.id);
    setSaving(false);
    setScreen('handoff');
  };

  const toggleHandoff = (item) => {
    setHandoffTicked(prev =>
      prev.includes(item) ? prev.filter(i => i !== item) : [...prev, item]
    );
  };

  const handleHandoffDone = async (incomplete) => {
    if (createdClientId) {
      await base44.entities.Client.update(createdClientId, {
        handoffIncomplete: incomplete,
      });
    }
    onConverted();
    onClose();
  };

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
  const labelCls = 'block text-xs font-medium text-ew-body mb-1';

  if (screen === 'handoff') {
    const allTicked = handoffTicked.length === HANDOFF_ITEMS.length;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
          <div className="px-6 py-4 border-b border-ew-border">
            <h2 className="text-base font-bold text-navy">Before handing to CS</h2>
            <p className="text-sm text-ew-muted mt-0.5">Make sure these are done before closing</p>
          </div>
          <div className="px-6 py-4 space-y-2">
            {HANDOFF_ITEMS.map(item => (
              <button
                key={item}
                onClick={() => toggleHandoff(item)}
                className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-ew-bg transition-colors text-left"
              >
                {handoffTicked.includes(item)
                  ? <CheckSquare className="w-5 h-5 text-emerald-500 shrink-0" />
                  : <Square className="w-5 h-5 text-ew-muted shrink-0" />}
                <span className={`text-sm ${handoffTicked.includes(item) ? 'line-through text-ew-muted' : 'text-navy'}`}>{item}</span>
              </button>
            ))}
          </div>
          <div className="px-6 py-4 border-t border-ew-border flex justify-between gap-2">
            <button
              onClick={() => handleHandoffDone(true)}
              className="px-4 py-2 text-sm font-medium text-ew-muted hover:bg-ew-bg rounded-lg transition-colors"
            >
              I'll do these later
            </button>
            <button
              onClick={() => handleHandoffDone(false)}
              disabled={!allTicked}
              className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40"
            >
              All done — close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy">🎉 Confirm deal — {form.companyName}</h2>
            <p className="text-sm text-ew-muted mt-0.5">Fill in the deal details to create the client record</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-2 gap-4">

            {/* Client details */}
            <div className="col-span-2">
              <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Client details</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Company</label>
                  <input className={inputCls} value={form.companyName} onChange={e => up('companyName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Contact name</label>
                  <input className={inputCls} value={form.contactName} onChange={e => up('contactName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Contact email</label>
                  <input className={inputCls} value={form.contactEmail} onChange={e => up('contactEmail', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Deal details */}
            <div className="col-span-2 border-t border-ew-border pt-4">
              <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Deal details</p>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Plan</label>
                  <select className={inputCls} value={form.plan} onChange={e => up('plan', e.target.value)}>
                    {['Starter', 'Professional', 'Business'].map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Monthly value (£)</label>
                  <input type="number" className={inputCls} value={form.monthlyValue} onChange={e => up('monthlyValue', e.target.value)} placeholder="e.g. 499" />
                </div>
                <div>
                  <label className={labelCls}>Owner</label>
                  <select className={inputCls} value={form.owner} onChange={e => up('owner', e.target.value)}>
                    <option>Martinique Keeler</option>
                    <option>Chris Carter</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Subscription start</label>
                  <input type="date" className={inputCls} value={form.subscriptionStartDate} onChange={e => up('subscriptionStartDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Subscription end</label>
                  <input type="date" className={inputCls} value={form.subscriptionEndDate} onChange={e => up('subscriptionEndDate', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Accounting */}
            <div className="col-span-2 border-t border-ew-border pt-4">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em]">Accounting service</p>
                <button
                  onClick={() => up('accountingServiceIncluded', !form.accountingServiceIncluded)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${form.accountingServiceIncluded ? 'bg-navy' : 'bg-gray-200'}`}
                >
                  <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${form.accountingServiceIncluded ? 'translate-x-4' : 'translate-x-1'}`} />
                </button>
              </div>
              {form.accountingServiceIncluded && (
                <div className="w-1/3">
                  <label className={labelCls}>Value (£/yr)</label>
                  <input type="number" className={inputCls} value={form.accountingServiceValue} onChange={e => up('accountingServiceValue', e.target.value)} placeholder="e.g. 7100" />
                </div>
              )}
            </div>

            {/* Onboarding */}
            <div className="col-span-2 border-t border-ew-border pt-4">
              <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Onboarding package</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Package</label>
                  <select className={inputCls} value={form.onboardingPackage} onChange={e => up('onboardingPackage', e.target.value)}>
                    <option>Success Essential</option>
                    <option>Success Plus</option>
                    <option>Success Premium</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Onboarding fee (£)</label>
                  <input type="number" className={inputCls} value={form.onboardingFee} onChange={e => up('onboardingFee', e.target.value)} />
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="col-span-2 border-t border-ew-border pt-4">
              <label className={labelCls}>Notes</label>
              <textarea className={inputCls + ' h-16 resize-none'} value={form.notes} onChange={e => up('notes', e.target.value)} placeholder="Any additional notes…" />
            </div>

            {/* Live summary */}
            <div className="col-span-2 border-t border-ew-border pt-4">
              <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Deal summary</p>
              <div className="bg-ew-bg rounded-xl p-4 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-ew-muted mb-1">Monthly</p>
                  <p className="text-lg font-bold text-navy">{fmt(calc.monthly)}</p>
                </div>
                <div>
                  <p className="text-xs text-ew-muted mb-1">Annual software</p>
                  <p className="text-lg font-bold text-navy">{fmt(calc.annual)}</p>
                </div>
                <div>
                  <p className="text-xs text-ew-muted mb-1">Total year 1</p>
                  <p className="text-lg font-bold text-navy">{fmt(calc.total)}</p>
                </div>
                <div>
                  <p className="text-xs text-ew-muted mb-1">From year 2</p>
                  <p className="text-lg font-bold text-navy">{fmt(calc.year2)}</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Not yet — keep in pipeline</button>
          <button
            onClick={handleConfirm}
            disabled={saving || !form.monthlyValue}
            className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40"
          >
            {saving ? 'Creating…' : 'Confirm deal →'}
          </button>
        </div>
      </div>
    </div>
  );
}