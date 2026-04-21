import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const lbl = 'block text-xs font-semibold text-ew-muted mb-1';

const AUDIENCES = ['Events', 'Agencies', 'Suppliers', 'Mixed'];
const TOUCH_POINTS = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6'];
const VARIANTS = ['A', 'B', 'C', 'D'];
const STATUSES = ['Active', 'Paused', 'Completed', 'Killed'];

const EMPTY = {
  campaignName: '', audienceSegment: 'Events', touchPoint: 'TP1', variant: 'A',
  status: 'Active', launchDate: '', endDate: '', assetUsed: '', notes: '',
  subjectLine: '', subjectLineNotes: '',
  emailsSent: '', openRate: '', clickRate: '', replyRate: '',
  positiveReplies: '', meetingsBooked: '', unsubscribes: '', bounces: '',
};

function Field({ label, children, required }) {
  return (
    <div>
      <label className={lbl}>{label}{required && <span className="text-red-400 ml-0.5">*</span>}</label>
      {children}
    </div>
  );
}

function NumInput({ value, onChange, suffix }) {
  return (
    <div className="relative">
      <input type="number" min="0" step="any" className={ic + (suffix ? ' pr-7' : '')} value={value} onChange={onChange} />
      {suffix && <span className="absolute right-3 top-2 text-sm text-ew-muted">{suffix}</span>}
    </div>
  );
}

export default function CampaignForm({ campaign, onClose, onSaved }) {
  const [form, setForm] = useState(campaign ? { ...EMPTY, ...campaign } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const up = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));
  const upVal = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.campaignName.trim()) return;
    setSaving(true);
    const numFields = ['emailsSent','openRate','clickRate','replyRate','positiveReplies','meetingsBooked','unsubscribes','bounces'];
    const payload = { ...form };
    numFields.forEach(k => { payload[k] = payload[k] !== '' ? parseFloat(payload[k]) : null; });
    let saved;
    if (campaign?.id) {
      await base44.entities.ApolloOutreachCampaign.update(campaign.id, payload);
      saved = { ...campaign, ...payload };
    } else {
      saved = await base44.entities.ApolloOutreachCampaign.create(payload);
    }
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <h2 className="text-base font-bold text-navy">{campaign ? 'Edit Campaign' : 'New Campaign'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Campaign Details */}
          <div>
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-3">Campaign Details</p>
            <div className="space-y-3">
              <Field label="Campaign name" required>
                <input className={ic} value={form.campaignName} onChange={up('campaignName')} placeholder="e.g. Festival Finance Q2 2026" />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Audience segment">
                  <select className={ic} value={form.audienceSegment} onChange={up('audienceSegment')}>
                    {AUDIENCES.map(a => <option key={a}>{a}</option>)}
                  </select>
                </Field>
                <Field label="Touch point">
                  <select className={ic} value={form.touchPoint} onChange={up('touchPoint')}>
                    {TOUCH_POINTS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </Field>
                <Field label="Variant (for A/B testing)">
                  <select className={ic} value={form.variant} onChange={up('variant')}>
                    {VARIANTS.map(v => <option key={v}>{v}</option>)}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={ic} value={form.status} onChange={up('status')}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Launch date">
                  <input type="date" className={ic} value={form.launchDate} onChange={up('launchDate')} />
                </Field>
                <Field label="End date (optional)">
                  <input type="date" className={ic} value={form.endDate} onChange={up('endDate')} />
                </Field>
              </div>
              <Field label="Asset used">
                <input className={ic} value={form.assetUsed} onChange={up('assetUsed')} placeholder="e.g. Approval Workflows PDF, Eventwise in 2 mins video, None" />
              </Field>
              <Field label="Notes (optional)">
                <textarea className={ic + ' h-16 resize-none'} value={form.notes} onChange={up('notes')} placeholder="Any context or observations…" />
              </Field>
            </div>
          </div>

          <hr className="border-ew-border" />

          {/* Subject Line */}
          <div>
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-3">Subject Line</p>
            <div className="space-y-3">
              <Field label="Subject line (exact text used)">
                <input className={ic} value={form.subjectLine} onChange={up('subjectLine')} placeholder="e.g. How are you managing event budgets?" />
              </Field>
              <Field label="Subject line notes (optional)">
                <input className={ic} value={form.subjectLineNotes} onChange={up('subjectLineNotes')} placeholder="e.g. Question format, Stat-led, Pain point hook" />
              </Field>
            </div>
          </div>

          <hr className="border-ew-border" />

          {/* Performance Metrics */}
          <div>
            <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-3">Performance Metrics</p>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Emails sent">
                <NumInput value={form.emailsSent} onChange={up('emailsSent')} />
              </Field>
              <Field label="Open rate %">
                <NumInput value={form.openRate} onChange={up('openRate')} suffix="%" />
              </Field>
              <Field label="Click rate %">
                <NumInput value={form.clickRate} onChange={up('clickRate')} suffix="%" />
              </Field>
              <Field label="Reply rate %">
                <NumInput value={form.replyRate} onChange={up('replyRate')} suffix="%" />
              </Field>
              <Field label="Positive replies">
                <NumInput value={form.positiveReplies} onChange={up('positiveReplies')} />
              </Field>
              <Field label="Meetings booked">
                <NumInput value={form.meetingsBooked} onChange={up('meetingsBooked')} />
              </Field>
              <Field label="Unsubscribes">
                <NumInput value={form.unsubscribes} onChange={up('unsubscribes')} />
              </Field>
              <Field label="Bounces">
                <NumInput value={form.bounces} onChange={up('bounces')} />
              </Field>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.campaignName.trim()}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40">
            {saving ? 'Saving…' : campaign ? 'Save changes' : 'Add campaign'}
          </button>
        </div>
      </div>
    </div>
  );
}