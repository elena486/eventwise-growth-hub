import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { initTasks } from '@/lib/csData';
import { addMonths, format } from 'date-fns';
import { X, ArrowRight, ArrowLeft } from 'lucide-react';

const ONBOARDING_FEES = { 'Success Essential': 0, 'Success Plus': 1500, 'Success Premium': 5000 };
const ACCOUNTANT_STATUS_OPTIONS = ['Internal', 'External', 'Eventwise'];
const PRIORITY_TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function calcDeal(form) {
  const monthly = parseFloat(form.monthlyValue) || 0;
  const annual = monthly * 12;
  const acctgMonthly = form.accountingService === 'Separate fee' ? (parseFloat(form.accountingServiceFee) || 0) : 0;
  const acctg = acctgMonthly * 12;
  const fee = parseFloat(form.onboardingFee) || 0;
  const total = annual + acctg + fee;
  const year2 = annual + acctg;
  return { monthly, annual, acctg, acctgMonthly, fee, total, year2 };
}

export default function ClosedWonModal({ lead, onClose, onConverted }) {
  const today = format(new Date(), 'yyyy-MM-dd');
  const endDate = format(addMonths(new Date(), 12), 'yyyy-MM-dd');

  const [dealForm, setDealForm] = useState({
    companyName: lead.companyName || '',
    contactName: lead.contactName || '',
    contactEmail: '',
    plan: lead.plan || 'Starter',
    owner: 'Martinique Keeler',
    monthlyValue: lead.dealValueMonthly || '',
    subscriptionStartDate: today,
    subscriptionEndDate: endDate,
    accountingService: lead.accountingService || 'Not included',
    accountingServiceFee: lead.accountingServiceFee || '',
    onboardingPackage: 'Success Essential',
    onboardingFee: '0',
    notes: '',
  });

  const [handoverForm, setHandoverForm] = useState({
    business_goals: '',
    accountant_status: '',
    key_pain_points: '',
    red_flags: '',
    next_steps: '',
    handover_priority_tier: '',
    main_features_demoed: '',
    what_resonated: '',
    features_promised: '',
    uses_xero: false,
    current_budgeting_tool: '',
    tech_admin_contact_name: '',
    expected_go_live_date: '',
  });

  const [screen, setScreen] = useState('deal'); // 'deal' | 'handover'
  const [saving, setSaving] = useState(false);

  const up = (k, v) => {
    setDealForm(prev => {
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

  const upH = (k, v) => setHandoverForm(prev => ({ ...prev, [k]: v }));

  const calc = calcDeal(dealForm);

  const canConfirmHandover = () => {
    return !!(
      handoverForm.business_goals.trim() &&
      handoverForm.accountant_status &&
      handoverForm.key_pain_points.trim() &&
      handoverForm.next_steps.trim() &&
      handoverForm.handover_priority_tier &&
      handoverForm.main_features_demoed.trim() &&
      handoverForm.what_resonated.trim() &&
      handoverForm.features_promised.trim() &&
      handoverForm.expected_go_live_date
    );
  };

  const handleConfirm = async () => {
    setSaving(true);

    // Create client with deal + handover fields
    const client = await base44.entities.Client.create({
      name: dealForm.companyName,
      contactName: dealForm.contactName,
      contactEmail: dealForm.contactEmail,
      owner: dealForm.owner,
      secondaryOwner: 'None',
      status: 'Onboarding',
      plan: dealForm.plan,
      renewalDate: dealForm.subscriptionEndDate,
      handoffIncomplete: false,
      handover_status: 'Completed',
      handover_completed_date: today,
      business_goals: handoverForm.business_goals,
      accountant_status: handoverForm.accountant_status,
      key_pain_points: handoverForm.key_pain_points,
      red_flags: handoverForm.red_flags,
      next_steps: handoverForm.next_steps,
      handover_priority_tier: handoverForm.handover_priority_tier,
      main_features_demoed: handoverForm.main_features_demoed,
      what_resonated: handoverForm.what_resonated,
      features_promised: handoverForm.features_promised,
      uses_xero: handoverForm.uses_xero,
      current_budgeting_tool: handoverForm.current_budgeting_tool,
      tech_admin_contact_name: handoverForm.tech_admin_contact_name,
      expected_go_live_date: handoverForm.expected_go_live_date,
    });

    // Create deal
    const deal = await base44.entities.Deal.create({
      clientId: client.id,
      clientName: dealForm.companyName,
      leadId: lead.id,
      plan: dealForm.plan,
      subscriptionStartDate: dealForm.subscriptionStartDate,
      subscriptionEndDate: dealForm.subscriptionEndDate,
      monthlyValue: calc.monthly,
      annualValue: calc.annual,
      accountingService: dealForm.accountingService,
      accountingServiceFee: dealForm.accountingService === 'Separate fee' ? calc.acctgMonthly : 0,
      accountingServiceIncluded: dealForm.accountingService !== 'Not included',
      accountingServiceValue: calc.acctg,
      onboardingPackage: dealForm.onboardingPackage,
      onboardingFee: calc.fee,
      totalFirstYearValue: calc.total,
      status: 'Active',
      notes: dealForm.notes,
    });

    // Create onboarding record
    await base44.entities.OnboardingRecord.create({
      clientId: client.id,
      clientName: dealForm.companyName,
      tasks: JSON.stringify(initTasks()),
      lastUpdated: new Date().toISOString(),
    });

    // Mark lead as converted
    await base44.entities.Lead.update(lead.id, {
      converted: true,
      dealId: deal.id,
      stage: 'Closed Won',
    });

    setSaving(false);
    onConverted();
    onClose();
  };

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
  const labelCls = 'block text-xs font-medium text-ew-body mb-1';
  const hLabel = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';
  const hInput = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy">
              {screen === 'deal' ? `🎉 Confirm deal — ${dealForm.companyName}` : `Handover details — ${dealForm.companyName}`}
            </h2>
            <p className="text-sm text-ew-muted mt-0.5">
              {screen === 'deal' ? 'Fill in the deal details to create the client record' : 'Capture CS handover information before confirming'}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`flex items-center gap-1 ${screen === 'deal' ? 'text-[#8403C5] font-semibold' : 'text-ew-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${screen === 'deal' ? 'bg-[#8403C5] text-white' : 'bg-emerald-100 text-emerald-700'}`}>{screen === 'deal' ? '1' : '✓'}</span>
                Deal
              </span>
              <span className="w-6 h-px bg-ew-border" />
              <span className={`flex items-center gap-1 ${screen === 'handover' ? 'text-[#8403C5] font-semibold' : 'text-ew-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${screen === 'handover' ? 'bg-[#8403C5] text-white' : 'bg-ew-border text-ew-muted'}`}>2</span>
                Handover
              </span>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors"><X className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {screen === 'deal' ? (
            /* ═══ STEP 1 — DEAL DETAILS ═══ */
            <div className="grid grid-cols-2 gap-4">
              {/* Client details */}
              <div className="col-span-2">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Client details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Company</label>
                    <input className={inputCls} value={dealForm.companyName} onChange={e => up('companyName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact name</label>
                    <input className={inputCls} value={dealForm.contactName} onChange={e => up('contactName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact email</label>
                    <input className={inputCls} value={dealForm.contactEmail} onChange={e => up('contactEmail', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Deal details */}
              <div className="col-span-2 border-t border-ew-border pt-4">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Deal details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Plan</label>
                    <select className={inputCls} value={dealForm.plan} onChange={e => up('plan', e.target.value)}>
                      {['Starter', 'Professional', 'Business'].map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Monthly value (£)</label>
                    <input type="number" className={inputCls} value={dealForm.monthlyValue} onChange={e => up('monthlyValue', e.target.value)} placeholder="e.g. 499" />
                  </div>
                  <div>
                    <label className={labelCls}>Owner</label>
                    <select className={inputCls} value={dealForm.owner} onChange={e => up('owner', e.target.value)}>
                      <option>Martinique Keeler</option>
                      <option>Chris Carter</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Subscription start</label>
                    <input type="date" className={inputCls} value={dealForm.subscriptionStartDate} onChange={e => up('subscriptionStartDate', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Subscription end</label>
                    <input type="date" className={inputCls} value={dealForm.subscriptionEndDate} onChange={e => up('subscriptionEndDate', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Accounting */}
              <div className="col-span-2 border-t border-ew-border pt-4">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Accounting service</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Accounting service</label>
                    <select className={inputCls} value={dealForm.accountingService} onChange={e => up('accountingService', e.target.value)}>
                      {['Not included', 'Included in plan', 'Included in accounting service fee', 'Separate fee'].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  {dealForm.accountingService === 'Separate fee' && (
                    <div>
                      <label className={labelCls}>Accounting fee (£/month)</label>
                      <input type="number" className={inputCls} value={dealForm.accountingServiceFee} onChange={e => up('accountingServiceFee', e.target.value)} placeholder="e.g. 592" />
                    </div>
                  )}
                </div>
              </div>

              {/* Onboarding */}
              <div className="col-span-2 border-t border-ew-border pt-4">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Onboarding package</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls}>Package</label>
                    <select className={inputCls} value={dealForm.onboardingPackage} onChange={e => up('onboardingPackage', e.target.value)}>
                      <option>Success Essential</option>
                      <option>Success Plus</option>
                      <option>Success Premium</option>
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Onboarding fee (£)</label>
                    <input type="number" className={inputCls} value={dealForm.onboardingFee} onChange={e => up('onboardingFee', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="col-span-2 border-t border-ew-border pt-4">
                <label className={labelCls}>Notes</label>
                <textarea className={inputCls + ' h-16 resize-none'} value={dealForm.notes} onChange={e => up('notes', e.target.value)} placeholder="Any additional notes…" />
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
          ) : (
            /* ═══ STEP 2 — HANDOVER DETAILS ═══ */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={hLabel}>Business goals <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.business_goals} onChange={e => upH('business_goals', e.target.value)} placeholder="What are the client's main business goals?" />
                </div>

                <div>
                  <label className={hLabel}>Client's accountant status <span className="text-red-400 normal-case">*</span></label>
                  <div className="flex gap-2">
                    {ACCOUNTANT_STATUS_OPTIONS.map(opt => (
                      <button key={opt} type="button" onClick={() => upH('accountant_status', opt)}
                        className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${handoverForm.accountant_status === opt ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
                        {opt}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={hLabel}>Priority tier <span className="text-red-400 normal-case">*</span></label>
                  <select className={hInput} value={handoverForm.handover_priority_tier} onChange={e => upH('handover_priority_tier', e.target.value)}>
                    <option value="">— Select —</option>
                    {PRIORITY_TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Key pain points <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.key_pain_points} onChange={e => upH('key_pain_points', e.target.value)} placeholder="What pain points did the client highlight?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Red flags <span className="text-ew-muted normal-case">(optional)</span></label>
                  <textarea className={`${hInput} min-h-[60px] resize-none`} value={handoverForm.red_flags} onChange={e => upH('red_flags', e.target.value)} placeholder="Any concerns or risks to watch?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Next steps <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.next_steps} onChange={e => upH('next_steps', e.target.value)} placeholder="What are the immediate next steps?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Main features demoed <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.main_features_demoed} onChange={e => upH('main_features_demoed', e.target.value)} placeholder="Which features were shown in the demo?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>What resonated with the client <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.what_resonated} onChange={e => upH('what_resonated', e.target.value)} placeholder="What got the client excited?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Features promised / included in contract <span className="text-red-400 normal-case">*</span></label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.features_promised} onChange={e => upH('features_promised', e.target.value)} placeholder="What has been promised or is in the contract?" />
                </div>

                <div>
                  <label className={hLabel}>Uses Xero already <span className="text-red-400 normal-case">*</span></label>
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => upH('uses_xero', !handoverForm.uses_xero)}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${handoverForm.uses_xero ? 'bg-[#8403C5]' : 'bg-gray-200'}`}>
                      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${handoverForm.uses_xero ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-ew-body">{handoverForm.uses_xero ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div>
                  <label className={hLabel}>Expected go-live date <span className="text-red-400 normal-case">*</span></label>
                  <input type="date" className={hInput} value={handoverForm.expected_go_live_date} onChange={e => upH('expected_go_live_date', e.target.value)} />
                </div>

                <div>
                  <label className={hLabel}>Current budgeting tool <span className="text-ew-muted normal-case">(optional)</span></label>
                  <input className={hInput} value={handoverForm.current_budgeting_tool} onChange={e => upH('current_budgeting_tool', e.target.value)} placeholder="e.g. Excel, Sage, None" />
                </div>
                <div>
                  <label className={hLabel}>Technical / admin contact name <span className="text-ew-muted normal-case">(optional)</span></label>
                  <input className={hInput} value={handoverForm.tech_admin_contact_name} onChange={e => upH('tech_admin_contact_name', e.target.value)} placeholder="Name" />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-between gap-3">
          {screen === 'deal' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
              <button onClick={() => setScreen('handover')} disabled={!dealForm.monthlyValue}
                className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                Next: Handover Details <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setScreen('deal')} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button onClick={handleConfirm} disabled={saving || !canConfirmHandover()}
                className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40">
                {saving ? 'Confirming…' : 'Confirm & Hand Over'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}