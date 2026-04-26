import React, { useState } from 'react';
import { X, ExternalLink } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-[11px] font-bold text-ew-muted uppercase tracking-[0.08em] mb-1';

const THREAT_LEVELS = ['High', 'Medium', 'Low', 'Monitor'];
const CATEGORIES = ['Forecasting Tool', 'Event Management', 'Procurement & Approvals', 'Accounting Software', 'Project Management', 'Expense Management', 'Other'];

export default function CompetitorSlidePanel({ competitor, onClose, onUpdated }) {
  const [form, setForm] = useState({ ...competitor });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Competitor.update(form.id, form);
    setSaving(false);
    onUpdated(form);
  };

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-lg bg-white border-l border-ew-border shadow-2xl flex flex-col pointer-events-auto font-dm">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy">{form.companyName}</h2>
            {form.url && (
              <a href={form.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-[#8403C5] hover:underline mt-0.5">
                <ExternalLink className="w-3 h-3" /> {form.url}
              </a>
            )}
          </div>
          <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Company Name</label>
              <input className={inputCls} value={form.companyName || ''} onChange={e => up('companyName', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>URL</label>
              <input className={inputCls} value={form.url || ''} onChange={e => up('url', e.target.value)} placeholder="https://…" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={inputCls} value={form.category || ''} onChange={e => up('category', e.target.value)}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Threat Level</label>
              <select className={inputCls} value={form.threatLevel || ''} onChange={e => up('threatLevel', e.target.value)}>
                <option value="">—</option>
                {THREAT_LEVELS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Pricing</label>
            <textarea className={inputCls + ' h-16 resize-none'} value={form.pricing || ''} onChange={e => up('pricing', e.target.value)} placeholder="Pricing model…" />
          </div>
          <div>
            <label className={labelCls}>Target Audience</label>
            <input className={inputCls} value={form.targetAudience || ''} onChange={e => up('targetAudience', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Key Features</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.keyFeatures || ''} onChange={e => up('keyFeatures', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Integrations</label>
            <textarea className={inputCls + ' h-16 resize-none'} value={form.integrations || ''} onChange={e => up('integrations', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Main Differences vs Eventwise</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.mainDifferences || ''} onChange={e => up('mainDifferences', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Platform Adaptability</label>
            <textarea className={inputCls + ' h-16 resize-none'} value={form.platformAdaptability || ''} onChange={e => up('platformAdaptability', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Customer Satisfaction (Trustpilot)</label>
            <input className={inputCls} value={form.customerSatisfaction || ''} onChange={e => up('customerSatisfaction', e.target.value)} placeholder="e.g. 4.2 on Trustpilot" />
          </div>
          <div>
            <label className={labelCls}>Customer Support</label>
            <input className={inputCls} value={form.customerSupport || ''} onChange={e => up('customerSupport', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Market Strategy</label>
            <textarea className={inputCls + ' h-16 resize-none'} value={form.marketStrategy || ''} onChange={e => up('marketStrategy', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Tech Stack</label>
            <input className={inputCls} value={form.techStack || ''} onChange={e => up('techStack', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Team Size</label>
            <input className={inputCls} value={form.teamSize || ''} onChange={e => up('teamSize', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Notes</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.notes || ''} onChange={e => up('notes', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Last Updated</label>
            <input type="date" className={inputCls} value={form.lastUpdated || ''} onChange={e => up('lastUpdated', e.target.value)} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-ew-border flex justify-end gap-2 shrink-0">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-40">
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>
    </div>
  );
}