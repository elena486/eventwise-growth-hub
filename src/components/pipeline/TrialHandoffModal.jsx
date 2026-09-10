import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Rocket, ArrowRight } from 'lucide-react';

const CS_OWNERS = ['Chris Carter', 'Martinique Keeler', 'Eleanor'];
const TRIAL_LENGTHS = ['7 days', '14 days', '30 days', 'Custom'];

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-medium text-ew-muted mb-1';

export default function TrialHandoffModal({ lead, entry, currentUser, onClose, onConverted }) {
  const [trialStartDate, setTrialStartDate] = useState(entry.trialStartDate || format(new Date(), 'yyyy-MM-dd'));
  const [trialLength, setTrialLength] = useState(entry.trialLength || '14 days');
  const [owner, setOwner] = useState(() => {
    const map = { Chris: 'Chris Carter', Martinique: 'Martinique Keeler', Eleanor: 'Eleanor' };
    return map[currentUser] || 'Chris Carter';
  });
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    setSaving(true);
    // Pull primary contact details from the lead
    let contactName = lead.contactName || '';
    let contactEmail = lead.email || '';
    let contactPhone = lead.phone || '';
    try {
      const contacts = JSON.parse(lead.contacts || '[]');
      const primary = contacts.find(c => c.primary) || contacts[0];
      if (primary) {
        contactName = [primary.firstName, primary.lastName].filter(Boolean).join(' ') || contactName;
        contactEmail = primary.email || contactEmail;
        contactPhone = primary.phone || contactPhone;
      }
    } catch {}

    // Create the Customer Success client record, pre-filled from the pipeline lead
    const client = await base44.entities.Client.create({
      name: lead.companyName,
      contactName,
      contactEmail,
      contactPhone,
      status: 'Trial',
      plan: lead.plan || '',
      owner,
      secondaryOwner: 'None',
      trialStartDate,
      trialLength,
      converted_from_lead_id: lead.id,
      activityLog: lead.activityLog || '[]', // carry over full pipeline history
      lastContacted: format(new Date(), 'yyyy-MM-dd'),
      notes: `Converted from pipeline via Trial Kickoff. Trial length: ${trialLength}.`,
    });

    // Mark the original lead as converted (not deleted — keeps historical reporting intact)
    await base44.entities.Lead.update(lead.id, {
      converted: true,
      convertedDate: new Date().toISOString(),
      converted_to_client_id: client.id,
      stage: 'Closed Won',
      lastActivity: new Date().toISOString(),
    });

    setSaving(false);
    onConverted(client.id);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <Rocket className="w-4 h-4 text-orange-600" />
            </div>
            <div>
              <h3 className="text-base font-bold text-navy">Trial started for {lead.companyName}</h3>
              <p className="text-xs text-ew-muted">Move this record to Customer Success as a Trial client?</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-3">
          <p className="text-xs text-ew-body bg-ew-bg rounded-lg p-3 leading-relaxed">
            A new Customer Success client record will be created, pre-filled with {lead.companyName}'s contact details and deal info. The full pipeline activity history will be carried over so CS can see everything that led up to the trial.
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Trial start date</label>
              <input type="date" className={ic} value={trialStartDate} onChange={e => setTrialStartDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Trial length</label>
              <select className={ic} value={trialLength} onChange={e => setTrialLength(e.target.value)}>
                {TRIAL_LENGTHS.map(l => <option key={l}>{l}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Owner</label>
            <select className={ic} value={owner} onChange={e => setOwner(e.target.value)}>
              {CS_OWNERS.map(o => <option key={o}>{o}</option>)}
            </select>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ew-border flex justify-between gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">
            Not yet — keep in Pipeline
          </button>
          <button onClick={handleConfirm} disabled={saving || !trialStartDate}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40 transition-colors flex items-center gap-1.5">
            {saving ? 'Moving…' : <>Move to Customer Success <ArrowRight className="w-3.5 h-3.5" /></>}
          </button>
        </div>
      </div>
    </div>
  );
}