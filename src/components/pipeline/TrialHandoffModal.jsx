import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format, addDays, parseISO } from 'date-fns';
import { X, ArrowRight, ArrowLeft, Rocket } from 'lucide-react';

const PLANS = ['Starter', 'Professional', 'Business'];
const CS_OWNERS = ['Chris Carter', 'Martinique Keeler', 'Eleanor'];
const TRIAL_LENGTHS = ['7 days', '14 days', '30 days', 'Custom'];
const ACCOUNTANT_STATUS_OPTIONS = ['Internal', 'External', 'Eventwise'];
const PRIORITY_TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];
const CONVERSION_RISKS = ['Low', 'Medium', 'High'];

function calcTrialEnd(startDate, length) {
  if (!startDate || length === 'Custom') return '';
  const days = parseInt(length) || 0;
  if (!days) return '';
  try { return format(addDays(parseISO(startDate), days), 'yyyy-MM-dd'); } catch { return ''; }
}

export default function TrialHandoffModal({ lead, entry, currentUser, onClose, onConverted }) {
  const today = format(new Date(), 'yyyy-MM-dd');

  // Pre-fill contact details from lead
  const primaryContact = (() => {
    try {
      const contacts = JSON.parse(lead.contacts || '[]');
      return contacts.find(c => c.primary) || contacts[0] || {};
    } catch { return {}; }
  })();
  const prefilledContactName = [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ') || lead.contactName || '';

  const [trialForm, setTrialForm] = useState({
    companyName: lead.companyName || '',
    contactName: prefilledContactName,
    contactEmail: primaryContact.email || lead.email || '',
    plan: lead.plan || 'Starter',
    monthlyValue: lead.dealValueMonthly || '',
    owner: (() => {
      const map = { Chris: 'Chris Carter', Martinique: 'Martinique Keeler', Eleanor: 'Eleanor' };
      return map[lead.leadOwner] || map[currentUser] || 'Chris Carter';
    })(),
    trialStartDate: entry?.trialStartDate || today,
    trialLength: entry?.trialLength || '14 days',
    trialEndDate: calcTrialEnd(entry?.trialStartDate || today, entry?.trialLength || '14 days'),
  });

  const [handoverForm, setHandoverForm] = useState({
    business_goals: '',
    accountant_status: '',
    key_pain_points: '',
    objections_raised_addressed: '',
    conversion_risk: '',
    handover_priority_tier: '',
    main_features_demoed: '',
    what_resonated: '',
    uses_xero: false,
    current_budgeting_tool: '',
    tech_admin_contact_name: '',
    what_would_make_them_convert: '',
  });

  const [screen, setScreen] = useState('trial'); // 'trial' | 'handover'
  const [saving, setSaving] = useState(false);

  const up = (k, v) => {
    setTrialForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'trialStartDate' && next.trialLength !== 'Custom') {
        next.trialEndDate = calcTrialEnd(v, next.trialLength);
      }
      if (k === 'trialLength' && v !== 'Custom') {
        next.trialEndDate = calcTrialEnd(next.trialStartDate, v);
      }
      return next;
    });
  };

  const upH = (k, v) => setHandoverForm(prev => ({ ...prev, [k]: v }));

  const canProceedToHandover = () => {
    return !!(
      trialForm.companyName.trim() &&
      trialForm.contactName.trim() &&
      trialForm.plan &&
      trialForm.owner &&
      trialForm.trialStartDate &&
      trialForm.trialEndDate
    );
  };

  const canConfirmTrial = () => {
    return canProceedToHandover() && !!handoverForm.handover_priority_tier;
  };

  const handleConfirm = async () => {
    setSaving(true);

    // Create the Customer Success client record with Trial status
    const client = await base44.entities.Client.create({
      name: trialForm.companyName,
      contactName: trialForm.contactName,
      contactEmail: trialForm.contactEmail,
      status: 'Trial',
      plan: trialForm.plan,
      owner: trialForm.owner,
      secondaryOwner: 'None',
      trialStartDate: trialForm.trialStartDate,
      trialLength: trialForm.trialLength,
      trialEndDate: trialForm.trialEndDate,
      trial_monthly_value: parseFloat(trialForm.monthlyValue) || 0,
      handover_status: 'Completed',
      handover_completed_date: today,
      business_goals: handoverForm.business_goals,
      accountant_status: handoverForm.accountant_status,
      key_pain_points: handoverForm.key_pain_points,
      objections_raised_addressed: handoverForm.objections_raised_addressed,
      conversion_risk: handoverForm.conversion_risk,
      handover_priority_tier: handoverForm.handover_priority_tier,
      main_features_demoed: handoverForm.main_features_demoed,
      what_resonated: handoverForm.what_resonated,
      uses_xero: handoverForm.uses_xero,
      current_budgeting_tool: handoverForm.current_budgeting_tool,
      tech_admin_contact_name: handoverForm.tech_admin_contact_name,
      what_would_make_them_convert: handoverForm.what_would_make_them_convert,
      converted_from_lead_id: lead.id,
      activityLog: lead.activityLog || '[]', // carry over full pipeline history
      lastContacted: today,
      notes: `Converted from pipeline via Trial Kickoff. Trial: ${trialForm.trialStartDate} → ${trialForm.trialEndDate} (${trialForm.trialLength}).`,
    });

    // Mark the original lead as converted to trial
    await base44.entities.Lead.update(lead.id, {
      converted: true,
      convertedDate: new Date().toISOString(),
      converted_to_client_id: client.id,
      stage: 'Closed — Converted to Trial',
      lastActivity: new Date().toISOString(),
    });

    setSaving(false);
    onConverted(client.id);
  };

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
  const labelCls = 'block text-xs font-medium text-ew-body mb-1';
  const hLabel = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';
  const hInput = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Rocket className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy">
                {screen === 'trial' ? `🚀 Trial started — ${trialForm.companyName}` : `Handover details — ${trialForm.companyName}`}
              </h2>
              <p className="text-sm text-ew-muted mt-0.5">
                {screen === 'trial' ? 'Fill in the trial details to create the client record' : 'Capture CS handover information for the trial'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs">
              <span className={`flex items-center gap-1 ${screen === 'trial' ? 'text-[#8403C5] font-semibold' : 'text-ew-muted'}`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${screen === 'trial' ? 'bg-[#8403C5] text-white' : 'bg-emerald-100 text-emerald-700'}`}>{screen === 'trial' ? '1' : '✓'}</span>
                Trial
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

          {screen === 'trial' ? (
            /* ═══ STEP 1 — TRIAL DETAILS ═══ */
            <div className="grid grid-cols-2 gap-4">
              {/* Client details */}
              <div className="col-span-2">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Client details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Company <span className="text-red-400">*</span></label>
                    <input className={inputCls} value={trialForm.companyName} onChange={e => up('companyName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact name <span className="text-red-400">*</span></label>
                    <input className={inputCls} value={trialForm.contactName} onChange={e => up('contactName', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Contact email</label>
                    <input className={inputCls} value={trialForm.contactEmail} onChange={e => up('contactEmail', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Trial details */}
              <div className="col-span-2 border-t border-ew-border pt-4">
                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.18em] mb-3">Trial details</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className={labelCls}>Plan being trialled <span className="text-red-400">*</span></label>
                    <select className={inputCls} value={trialForm.plan} onChange={e => up('plan', e.target.value)}>
                      {PLANS.map(p => <option key={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Monthly value if converted (£)</label>
                    <input type="number" className={inputCls} value={trialForm.monthlyValue} onChange={e => up('monthlyValue', e.target.value)} placeholder="e.g. 499" />
                  </div>
                  <div>
                    <label className={labelCls}>Owner <span className="text-red-400">*</span></label>
                    <select className={inputCls} value={trialForm.owner} onChange={e => up('owner', e.target.value)}>
                      {CS_OWNERS.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Trial start date <span className="text-red-400">*</span></label>
                    <input type="date" className={inputCls} value={trialForm.trialStartDate} onChange={e => up('trialStartDate', e.target.value)} />
                  </div>
                  <div>
                    <label className={labelCls}>Trial length</label>
                    <select className={inputCls} value={trialForm.trialLength} onChange={e => up('trialLength', e.target.value)}>
                      {TRIAL_LENGTHS.map(l => <option key={l}>{l}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className={labelCls}>Trial end date <span className="text-red-400">*</span></label>
                    <input type="date" className={inputCls} value={trialForm.trialEndDate} onChange={e => up('trialEndDate', e.target.value)} disabled={trialForm.trialLength !== 'Custom'} />
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* ═══ STEP 2 — HANDOVER DETAILS ═══ */
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className={hLabel}>Business goals</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.business_goals} onChange={e => upH('business_goals', e.target.value)} placeholder="What are the client's main business goals?" />
                </div>

                <div>
                  <label className={hLabel}>Client's accountant status</label>
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
                  <label className={hLabel}>Key pain points</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.key_pain_points} onChange={e => upH('key_pain_points', e.target.value)} placeholder="What pain points did the client highlight?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Objections raised & how addressed</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.objections_raised_addressed} onChange={e => upH('objections_raised_addressed', e.target.value)} placeholder="What objections have come up and how have they been handled so far?" />
                </div>

                <div>
                  <label className={hLabel}>Conversion risk</label>
                  <select className={hInput} value={handoverForm.conversion_risk} onChange={e => upH('conversion_risk', e.target.value)}>
                    <option value="">— Not set —</option>
                    {CONVERSION_RISKS.map(r => <option key={r}>{r}</option>)}
                  </select>
                </div>
                <div>
                  <label className={hLabel}>Uses Xero already</label>
                  <div className="flex items-center gap-3 mt-1">
                    <button type="button" onClick={() => upH('uses_xero', !handoverForm.uses_xero)}
                      className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${handoverForm.uses_xero ? 'bg-[#8403C5]' : 'bg-gray-200'}`}>
                      <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${handoverForm.uses_xero ? 'translate-x-4' : 'translate-x-1'}`} />
                    </button>
                    <span className="text-sm text-ew-body">{handoverForm.uses_xero ? 'Yes' : 'No'}</span>
                  </div>
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>Main features demoed</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.main_features_demoed} onChange={e => upH('main_features_demoed', e.target.value)} placeholder="Which features were shown in the demo?" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>What resonated with the client</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.what_resonated} onChange={e => upH('what_resonated', e.target.value)} placeholder="What got the client excited?" />
                </div>

                <div>
                  <label className={hLabel}>Current budgeting tool</label>
                  <input className={hInput} value={handoverForm.current_budgeting_tool} onChange={e => upH('current_budgeting_tool', e.target.value)} placeholder="e.g. Excel, Sage, None" />
                </div>
                <div>
                  <label className={hLabel}>Technical / admin contact name <span className="text-ew-muted normal-case">(optional)</span></label>
                  <input className={hInput} value={handoverForm.tech_admin_contact_name} onChange={e => upH('tech_admin_contact_name', e.target.value)} placeholder="Name" />
                </div>

                <div className="col-span-2">
                  <label className={hLabel}>What would make them convert</label>
                  <textarea className={`${hInput} min-h-[80px] resize-none`} value={handoverForm.what_would_make_them_convert} onChange={e => upH('what_would_make_them_convert', e.target.value)} placeholder="What needs to happen for this trial to become a paid deal? This is the single most useful field for CS." />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-between gap-3">
          {screen === 'trial' ? (
            <>
              <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">
                Not yet — keep in pipeline
              </button>
              <button onClick={() => setScreen('handover')} disabled={!canProceedToHandover()}
                className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40 flex items-center gap-1.5">
                Next: Handover Details <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setScreen('trial')} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors flex items-center gap-1.5">
                <ArrowLeft className="w-3.5 h-3.5" /> Back
              </button>
              <button onClick={handleConfirm} disabled={saving || !canConfirmTrial()}
                className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40 flex items-center gap-1.5">
                <Rocket className="w-3.5 h-3.5" /> {saving ? 'Starting trial…' : 'Confirm & Start Trial'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}