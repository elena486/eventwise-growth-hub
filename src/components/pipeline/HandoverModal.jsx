import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { initTasks } from '@/lib/csData';
import { addMonths, addDays, format } from 'date-fns';
import { X, Check, ChevronRight, ChevronLeft } from 'lucide-react';

const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
const CONTRACT_LENGTHS = ['Monthly rolling', '6 months', '12 months', '24 months'];
const ONBOARDING_PLANS = ['Basic', 'Standard', 'Enterprise', 'Option 1'];
const CS_OWNERS = ['Martinique', 'Chris'];
const CS_OWNER_EMAILS = { Martinique: 'martinique@eventwise.com', Chris: 'chris@eventwise.com' };
const CLOSERS = ['Chris', 'Ramesh', 'George'];
const PRIORITY_TIERS = ['High', 'Medium', 'Low'];

function fmtGBP(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function today() { return format(new Date(), 'yyyy-MM-dd'); }

function calcEndDate(startDate, contractLength) {
  if (!startDate) return '';
  try {
    const start = new Date(startDate);
    const months = contractLength === '6 months' ? 6 : contractLength === '24 months' ? 24 : contractLength === '12 months' ? 12 : 0;
    if (months === 0) return format(addMonths(start, 1), 'yyyy-MM-dd'); // monthly rolling = 1mo ahead for display
    return format(addMonths(start, months), 'yyyy-MM-dd');
  } catch { return ''; }
}

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-xs font-semibold text-ew-body mb-1.5';

function Toggle({ value, onChange }) {
  return (
    <button type="button" onClick={() => onChange(!value)}
      className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${value ? 'bg-[#8403C5]' : 'bg-gray-200'}`}>
      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-1'}`} />
    </button>
  );
}

function ProgressBar({ step }) {
  const steps = ['Deal Details', 'Handover Notes', 'Confirm'];
  return (
    <div className="flex items-center gap-0 mb-8">
      {steps.map((label, i) => (
        <React.Fragment key={i}>
          <div className="flex flex-col items-center">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold border-2 transition-all ${i < step ? 'bg-[#8403C5] border-[#8403C5] text-white' : i === step ? 'border-[#8403C5] text-[#8403C5]' : 'border-ew-border text-ew-muted'}`}>
              {i < step ? <Check className="w-4 h-4" /> : i + 1}
            </div>
            <span className={`text-[11px] font-semibold mt-1.5 whitespace-nowrap ${i === step ? 'text-[#8403C5]' : i < step ? 'text-navy' : 'text-ew-muted'}`}>{label}</span>
          </div>
          {i < steps.length - 1 && (
            <div className={`flex-1 h-0.5 mx-2 mb-5 transition-colors ${i < step ? 'bg-[#8403C5]' : 'bg-ew-border'}`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

function SectionHeading({ children }) {
  return <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-4 mt-6 first:mt-0 border-t border-ew-border pt-4 first:border-0 first:pt-0">{children}</p>;
}

function ReadRow({ label, value }) {
  if (!value && value !== 0) return null;
  return (
    <div className="flex gap-4 py-1.5 border-b border-ew-border/50 last:border-0">
      <span className="text-xs text-ew-muted w-40 shrink-0">{label}</span>
      <span className="text-sm text-navy font-medium">{String(value)}</span>
    </div>
  );
}

export default function HandoverModal({ lead, onClose, onConverted }) {
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [createdClientId, setCreatedClientId] = useState(null);
  const [createdClientName, setCreatedClientName] = useState('');

  const [s1, setS1] = useState({
    companyName: lead.companyName || '',
    contactName: lead.contactName || '',
    contactEmail: lead.email || '',
    contactPhone: lead.phone || '',
    plan: lead.plan || 'Starter',
    monthlyValue: lead.dealValueMonthly || '',
    setupFee: lead.setupFee || '',
    accountingAddon: !!lead.accountingAddon,
    onboardingPlan: lead.onboardingPlan || 'Basic',
    startDate: lead.proposedStartDate || today(),
    contractLength: lead.contractLength || '12 months',
    contractEndDate: '',
    closedBy: lead.leadOwner || 'Chris',
  });

  const [s2, setS2] = useState({
    csNotes: '',
    csOwner: 'Martinique',
    priorityTier: 'Medium',
    eventRange: '',
    budgetHolders: '',
    xeroSetUp: 'No',
  });

  useEffect(() => {
    const end = calcEndDate(s1.startDate, s1.contractLength);
    setS1(prev => ({ ...prev, contractEndDate: end }));
  }, [s1.startDate, s1.contractLength]);

  const up1 = (k, v) => setS1(prev => ({ ...prev, [k]: v }));
  const up2 = (k, v) => setS2(prev => ({ ...prev, [k]: v }));

  const annual = (parseFloat(s1.monthlyValue) || 0) * 12;

  const handleConfirm = async () => {
    setSaving(true);
    try {
      // Action 1: Create Client
      const client = await base44.entities.Client.create({
        name: s1.companyName,
        contactName: s1.contactName,
        contactEmail: s1.contactEmail,
        contactPhone: s1.contactPhone,
        owner: s2.csOwner === 'Chris' ? 'Chris Carter' : 'Martinique Keeler',
        secondaryOwner: 'None',
        status: 'Onboarding',
        plan: s1.plan,
        trialStartDate: s1.startDate,
        renewalDate: s1.contractEndDate,
        priorityTier: s2.priorityTier,
        notes: `📋 Sales Handover Notes:\n${s2.csNotes}`,
        handoffIncomplete: true,
      });

      // Action 2: Create Deal
      const deal = await base44.entities.Deal.create({
        clientId: client.id,
        clientName: s1.companyName,
        leadId: lead.id,
        plan: s1.plan,
        subscriptionStartDate: s1.startDate,
        subscriptionEndDate: s1.contractEndDate,
        monthlyValue: parseFloat(s1.monthlyValue) || 0,
        annualValue: annual,
        accountingServiceIncluded: s1.accountingAddon,
        onboardingPackage: s1.onboardingPlan,
        onboardingFee: parseFloat(s1.setupFee) || 0,
        totalFirstYearValue: annual + (parseFloat(s1.setupFee) || 0),
        status: 'Active',
        notes: `Closed by: ${s1.closedBy}`,
      });

      // Action 3: Create Onboarding Record
      await base44.entities.OnboardingRecord.create({
        clientId: client.id,
        clientName: s1.companyName,
        tasks: JSON.stringify(initTasks()),
        lastUpdated: new Date().toISOString(),
      });

      // Action 4: Send notification email
      const emailBody = `A deal has been closed and handed over to you.\n\nClient: ${s1.companyName}\nContact: ${s1.contactName} | ${s1.contactEmail}${s1.contactPhone ? ' | ' + s1.contactPhone : ''}\nPlan: ${s1.plan} | Onboarding Plan: ${s1.onboardingPlan}\nMonthly: ${fmtGBP(parseFloat(s1.monthlyValue) || 0)} | Annual: ${fmtGBP(annual)}\nStart date: ${s1.startDate} | Contract end: ${s1.contractEndDate}\nCS Owner: ${s2.csOwner}\nPriority: ${s2.priorityTier}\n${s2.eventRange ? 'Event range: ' + s2.eventRange + '\n' : ''}${s2.budgetHolders ? 'Budget holders: ' + s2.budgetHolders + '\n' : ''}Xero set up: ${s2.xeroSetUp}\n\nSales handover notes:\n${s2.csNotes}\n\nClosed by: ${s1.closedBy}\n\nView client record and onboarding checklist in Eventwise HQ → Customer Success`;

      await base44.integrations.Core.SendEmail({
        to: CS_OWNER_EMAILS[s2.csOwner] || 'martinique@eventwise.com',
        subject: `New client handed over: ${s1.companyName} — ${s1.plan} — starts ${s1.startDate}`,
        body: emailBody,
      });

      // Action 5: Update Lead
      await base44.entities.Lead.update(lead.id, {
        converted: true,
        convertedDate: new Date().toISOString().slice(0, 10),
        dealId: deal.id,
        stage: 'Closed Won',
      });

      setCreatedClientId(client.id);
      setCreatedClientName(s1.companyName);
      setDone(true);
    } catch (err) {
      console.error('Handover failed:', err);
    } finally {
      setSaving(false);
    }
  };

  // Success screen
  if (done) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-10 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-navy mb-2">Handover complete!</h2>
          <p className="text-ew-body mb-8">{createdClientName} has been added to Customer Success.</p>
          <div className="flex gap-3 justify-center">
            <button onClick={() => onConverted(createdClientId)} className="px-5 py-2.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
              View client record →
            </button>
            <button onClick={() => { onConverted(null); onClose(); }} className="px-5 py-2.5 text-sm font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg">
              Back to pipeline
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[150] p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[95vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-ew-border shrink-0">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-navy">🎉 Deal Won!</h2>
              <p className="text-sm text-ew-muted mt-1">Complete the handover to Customer Success — this information flows directly into the client record and onboarding checklist.</p>
            </div>
            <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg ml-4 shrink-0"><X className="w-5 h-5" /></button>
          </div>
          <ProgressBar step={step} />
        </div>

        {/* Step content */}
        <div className="flex-1 overflow-y-auto px-8 py-6">

          {/* ── STEP 1: Deal Details ── */}
          {step === 0 && (
            <div className="space-y-0">
              <SectionHeading>Client Information</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Company name *</label>
                  <input className={ic} value={s1.companyName} onChange={e => up1('companyName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Primary contact name *</label>
                  <input className={ic} value={s1.contactName} onChange={e => up1('contactName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Primary contact email *</label>
                  <input type="email" className={ic} value={s1.contactEmail} onChange={e => up1('contactEmail', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Primary contact phone</label>
                  <input className={ic} value={s1.contactPhone} onChange={e => up1('contactPhone', e.target.value)} placeholder="+44 …" />
                </div>
              </div>

              <SectionHeading>Financial</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Plan</label>
                  <select className={ic} value={s1.plan} onChange={e => up1('plan', e.target.value)}>
                    {PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Monthly value (£)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                    <input type="number" className={ic + ' pl-7'} value={s1.monthlyValue} onChange={e => up1('monthlyValue', e.target.value)} placeholder="0" />
                  </div>
                  <p className="text-xs text-ew-muted mt-1">{fmtGBP(annual)} / year</p>
                </div>
                <div>
                  <label className={labelCls}>Setup fee (£)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                    <input type="number" className={ic + ' pl-7'} value={s1.setupFee} onChange={e => up1('setupFee', e.target.value)} placeholder="0" />
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Includes accounting add-on?</label>
                  <div className="flex items-center gap-3 mt-2">
                    <Toggle value={s1.accountingAddon} onChange={v => up1('accountingAddon', v)} />
                    <span className="text-sm text-ew-body">{s1.accountingAddon ? 'Yes' : 'No'}</span>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Onboarding plan</label>
                  <select className={ic} value={s1.onboardingPlan} onChange={e => up1('onboardingPlan', e.target.value)}>
                    {ONBOARDING_PLANS.map(p => <option key={p}>{p}</option>)}
                  </select>
                </div>
              </div>

              <SectionHeading>Dates & Contract</SectionHeading>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Subscription start date *</label>
                  <input type="date" className={ic} value={s1.startDate} onChange={e => up1('startDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Contract length</label>
                  <select className={ic} value={s1.contractLength} onChange={e => up1('contractLength', e.target.value)}>
                    {CONTRACT_LENGTHS.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Contract end date</label>
                  <input type="date" className={ic + ' bg-gray-50 text-ew-muted'} value={s1.contractEndDate} onChange={e => up1('contractEndDate', e.target.value)} />
                  <p className="text-xs text-ew-muted mt-1">Auto-calculated from start + length</p>
                </div>
              </div>

              <SectionHeading>Deal Ownership</SectionHeading>
              <div className="w-1/2">
                <label className={labelCls}>Closed by</label>
                <select className={ic} value={s1.closedBy} onChange={e => up1('closedBy', e.target.value)}>
                  {CLOSERS.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
          )}

          {/* ── STEP 2: Handover Notes ── */}
          {step === 1 && (
            <div className="space-y-5">
              <div>
                <label className={labelCls}>Notes for CS *</label>
                <textarea
                  className={ic + ' h-36 resize-none'}
                  value={s2.csNotes}
                  onChange={e => up2('csNotes', e.target.value)}
                  placeholder="Tell Martinique everything she needs to know — what was promised, client concerns, key contacts, preferred communication method, how many events they run, number of budget holders, Xero setup status, any special requirements..."
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelCls}>Assign CS owner</label>
                  <select className={ic} value={s2.csOwner} onChange={e => up2('csOwner', e.target.value)}>
                    {CS_OWNERS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Client priority tier</label>
                  <select className={ic} value={s2.priorityTier} onChange={e => up2('priorityTier', e.target.value)}>
                    {PRIORITY_TIERS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Event range</label>
                  <input className={ic} value={s2.eventRange} onChange={e => up2('eventRange', e.target.value)} placeholder="e.g. 3–5 festivals per year, 2,000–10,000 capacity" />
                </div>
                <div>
                  <label className={labelCls}>Number of budget holders</label>
                  <input type="number" className={ic} value={s2.budgetHolders} onChange={e => up2('budgetHolders', e.target.value)} placeholder="e.g. 4" />
                </div>
                <div>
                  <label className={labelCls}>Xero already set up?</label>
                  <select className={ic} value={s2.xeroSetUp} onChange={e => up2('xeroSetUp', e.target.value)}>
                    <option>Yes</option>
                    <option>No</option>
                    <option>Not applicable</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* ── STEP 3: Review & Confirm ── */}
          {step === 2 && (
            <div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 mb-6">
                Review everything before confirming — this cannot be easily undone.
              </div>

              <p className="text-sm font-bold text-navy mb-3">Client Information</p>
              <ReadRow label="Company" value={s1.companyName} />
              <ReadRow label="Contact" value={s1.contactName} />
              <ReadRow label="Email" value={s1.contactEmail} />
              <ReadRow label="Phone" value={s1.contactPhone} />

              <p className="text-sm font-bold text-navy mt-5 mb-3">Financial</p>
              <ReadRow label="Plan" value={s1.plan} />
              <ReadRow label="Monthly value" value={fmtGBP(parseFloat(s1.monthlyValue) || 0)} />
              <ReadRow label="Annual value" value={fmtGBP(annual)} />
              <ReadRow label="Setup fee" value={s1.setupFee ? fmtGBP(parseFloat(s1.setupFee)) : null} />
              <ReadRow label="Accounting add-on" value={s1.accountingAddon ? 'Yes' : 'No'} />
              <ReadRow label="Onboarding plan" value={s1.onboardingPlan} />

              <p className="text-sm font-bold text-navy mt-5 mb-3">Contract</p>
              <ReadRow label="Start date" value={s1.startDate} />
              <ReadRow label="Contract length" value={s1.contractLength} />
              <ReadRow label="End date" value={s1.contractEndDate} />
              <ReadRow label="Closed by" value={s1.closedBy} />

              <p className="text-sm font-bold text-navy mt-5 mb-3">CS Handover</p>
              <ReadRow label="CS owner" value={s2.csOwner} />
              <ReadRow label="Priority tier" value={s2.priorityTier} />
              <ReadRow label="Event range" value={s2.eventRange} />
              <ReadRow label="Budget holders" value={s2.budgetHolders} />
              <ReadRow label="Xero set up" value={s2.xeroSetUp} />
              {s2.csNotes && (
                <div className="mt-3 bg-[#FEF9C3] border border-amber-200 rounded-lg p-4">
                  <p className="text-xs font-bold text-amber-700 mb-2">📋 Sales Handover Notes</p>
                  <p className="text-sm text-amber-900 whitespace-pre-wrap">{s2.csNotes}</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer buttons */}
        <div className="px-8 py-5 border-t border-ew-border shrink-0 flex justify-between items-center">
          <div>
            {step > 0 && (
              <button onClick={() => step === 2 ? setStep(0) : setStep(step - 1)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                <ChevronLeft className="w-4 h-4" />
                {step === 2 ? 'Edit details' : 'Back'}
              </button>
            )}
          </div>
          <div>
            {step < 2 && (
              <button
                onClick={() => setStep(step + 1)}
                disabled={step === 0 && (!s1.companyName || !s1.contactName || !s1.startDate)}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            )}
            {step === 2 && (
              <button
                onClick={handleConfirm}
                disabled={saving || !s2.csNotes.trim()}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40"
              >
                {saving ? 'Saving…' : <><Check className="w-4 h-4" /> Confirm Handover</>}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}