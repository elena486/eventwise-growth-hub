import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';
import { CONSENT_FIELDS } from '../consentFields';

const ic = 'w-full text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] bg-white';

export default function ConsentFormModal({ initial, onSave, onClose }) {
  const [form, setForm] = useState(() => ({
    employee_name: '',
    preferred_times: '',
    additional_comments: '',
    restrictions_notes: '',
    ...Object.fromEntries(CONSENT_FIELDS.map(f => [f.key, ''])),
    ...(initial || {}),
  }));
  const [teamMembers, setTeamMembers] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    base44.entities.TeamMember.list()
      .then(list => setTeamMembers(list.map(m => m.name).filter(Boolean)))
      .catch(() => {});
  }, []);

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const submit = async () => {
    if (!form.employee_name?.trim()) return;
    setSaving(true);
    const payload = {
      ...form,
      date_submitted: initial?.date_submitted || new Date().toISOString().slice(0, 10),
      submission_time: initial?.submission_time || new Date().toISOString(),
    };
    await onSave(payload);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5] sticky top-0 bg-white z-10">
          <h3 className="text-base font-bold text-[#242450]">{initial ? 'Edit consent response' : 'New consent response'}</h3>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#242450]"><X className="w-4 h-4" /></button>
        </div>

        <div className="px-6 py-5 space-y-5">
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1">Employee name *</label>
            <input className={ic} list="consent-team-members" value={form.employee_name || ''} onChange={e => set('employee_name', e.target.value)} placeholder="Type a name…" />
            <datalist id="consent-team-members">
              {teamMembers.map(n => <option key={n} value={n} />)}
            </datalist>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {CONSENT_FIELDS.map(f => (
              <div key={f.key}>
                <label className="block text-xs font-semibold text-[#5777AB] mb-1">{f.label}</label>
                <select className={ic} value={form[f.key] || ''} onChange={e => set(f.key, e.target.value)}>
                  <option value="">— Select —</option>
                  {f.options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </div>
            ))}
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1">Preferred times</label>
            <input className={ic} value={form.preferred_times || ''} onChange={e => set('preferred_times', e.target.value)} placeholder="e.g. Weekday afternoons" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1">Additional comments</label>
            <textarea className={`${ic} min-h-[80px] resize-y`} value={form.additional_comments || ''} onChange={e => set('additional_comments', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1">Restrictions / notes</label>
            <textarea className={`${ic} min-h-[100px] resize-y`} value={form.restrictions_notes || ''} onChange={e => set('restrictions_notes', e.target.value)} placeholder="Consolidated notes — restrictions, conditions, anything to flag" />
          </div>
        </div>

        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#EBEBF5] sticky bottom-0 bg-white">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F9FAFB] rounded-lg">Cancel</button>
          <button onClick={submit} disabled={saving || !form.employee_name?.trim()}
            className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:opacity-40">
            {saving ? 'Saving…' : initial ? 'Save changes' : 'Submit response'}
          </button>
        </div>
      </div>
    </div>
  );
}