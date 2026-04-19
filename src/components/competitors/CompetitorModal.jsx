import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';
const CATEGORIES = ['Forecasting Tool', 'Event Management', 'Procurement & Approvals', 'Accounting Software', 'Project Management', 'Expense Management', 'Other'];
const THREATS = ['High', 'Medium', 'Low', 'Monitor'];

const EMPTY = {
  companyName: '', url: '', category: 'Other', threatLevel: 'Monitor',
  marketStrategy: '', techStack: '', teamSize: '', pricing: '',
  keyFeatures: '', integrations: '', targetAudience: '',
  platformAdaptability: '', mainDifferences: '', customerSatisfaction: '',
  customerSupport: '', notes: '', lastUpdated: format(new Date(), 'yyyy-MM-dd'), needsResearch: false,
};

export default function CompetitorModal({ competitor, onClose, onSaved }) {
  const [form, setForm] = useState(competitor ? { ...EMPTY, ...competitor } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.companyName.trim()) return;
    setSaving(true);
    let saved;
    if (competitor?.id) {
      await base44.entities.Competitor.update(competitor.id, form);
      saved = { ...competitor, ...form };
    } else {
      saved = await base44.entities.Competitor.create(form);
    }
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  const Field = ({ label, field, type = 'text', rows }) => (
    <div>
      <label className={labelCls}>{label}</label>
      {type === 'textarea' ? (
        <textarea className={`${inputCls} resize-none`} rows={rows || 3} value={form[field] || ''} onChange={e => up(field, e.target.value)} />
      ) : (
        <input type={type} className={inputCls} value={form[field] || ''} onChange={e => up(field, e.target.value)} />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <h2 className="text-sm font-bold text-navy">{competitor ? 'Edit Competitor' : 'Add Competitor'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Company Name *" field="companyName" />
            <Field label="Website URL" field="url" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category} onChange={e => up('category', e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Threat Level</label>
              <select className={inputCls} value={form.threatLevel} onChange={e => up('threatLevel', e.target.value)}>
                {THREATS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Team Size" field="teamSize" />
            <Field label="Last Updated" field="lastUpdated" type="date" />
          </div>

          <Field label="Pricing" field="pricing" />
          <Field label="Market Strategy" field="marketStrategy" />
          <Field label="Tech Stack" field="techStack" />
          <Field label="Key Features" field="keyFeatures" type="textarea" rows={3} />
          <Field label="Integrations" field="integrations" />
          <Field label="Target Audience" field="targetAudience" />
          <Field label="Platform Adaptability" field="platformAdaptability" type="textarea" rows={3} />
          <Field label="Main Differences vs Eventwise" field="mainDifferences" type="textarea" rows={3} />
          <Field label="Customer Satisfaction" field="customerSatisfaction" type="textarea" rows={3} />
          <Field label="Customer Support" field="customerSupport" />
          <Field label="Notes (internal)" field="notes" type="textarea" rows={2} />

          <div className="flex items-center gap-2">
            <input type="checkbox" id="needsResearch" checked={!!form.needsResearch} onChange={e => up('needsResearch', e.target.checked)} className="rounded" />
            <label htmlFor="needsResearch" className="text-sm text-ew-body">Flag as "Needs research"</label>
          </div>
        </div>

        <div className="px-5 py-4 border-t border-ew-border shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.companyName.trim()}
            className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-40">
            {saving ? 'Saving…' : competitor ? 'Save changes' : 'Add competitor'}
          </button>
        </div>
      </div>
    </div>
  );
}