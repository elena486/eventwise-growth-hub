import React, { useState } from 'react';
import { X, ExternalLink, AlertTriangle, Pencil, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';

const THREAT_STYLES = {
  High:    'bg-red-50 text-red-600 border-red-200',
  Medium:  'bg-amber-50 text-amber-700 border-amber-200',
  Low:     'bg-green-50 text-green-700 border-green-200',
  Monitor: 'bg-gray-100 text-gray-600 border-gray-200',
};
const CAT_STYLES = {
  'Forecasting Tool':         'bg-blue-50 text-blue-700',
  'Event Management':         'bg-purple-50 text-purple-700',
  'Procurement & Approvals':  'bg-orange-50 text-orange-600',
  'Accounting Software':      'bg-teal-50 text-teal-700',
  'Project Management':       'bg-indigo-50 text-indigo-700',
  'Expense Management':       'bg-pink-50 text-pink-700',
  'Other':                    'bg-gray-100 text-gray-600',
};
const CATEGORIES = ['Forecasting Tool', 'Event Management', 'Procurement & Approvals', 'Accounting Software', 'Project Management', 'Expense Management', 'Other'];
const THREATS = ['High', 'Medium', 'Low', 'Monitor'];

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-semibold text-ew-muted uppercase tracking-[0.08em] mb-1';
const taCls = ic + ' min-h-[70px] resize-none';

function Field({ label, value, editing, children }) {
  if (editing) return (
    <div>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  );
  if (!value) return null;
  return (
    <div>
      <p className={labelCls}>{label}</p>
      <p className="text-sm text-ew-body whitespace-pre-wrap leading-relaxed">{value}</p>
    </div>
  );
}

export default function CompetitorSidePanel({ competitor, onClose, onUpdated }) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...competitor });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    const today = new Date().toISOString().slice(0, 10);
    const updated = { ...form, lastUpdated: today };
    await base44.entities.Competitor.update(form.id, updated);
    setSaving(false);
    setEditing(false);
    onUpdated(updated);
  };

  const trust = competitor.customerSatisfaction?.match(/(\d+\.?\d*)\s+on\s+Trustpilot/i)?.[1];
  const needsResearch = !competitor.keyFeatures || !competitor.pricing || !competitor.targetAudience || !competitor.mainDifferences;

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-lg bg-white border-l border-ew-border shadow-2xl flex flex-col pointer-events-auto font-dm overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h2 className="text-base font-bold text-navy">{form.companyName}</h2>
              {needsResearch && !editing && (
                <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                  <AlertTriangle className="w-2.5 h-2.5" /> Needs research
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {form.category && <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${CAT_STYLES[form.category] || 'bg-gray-100 text-gray-600'}`}>{form.category}</span>}
              {form.threatLevel && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${THREAT_STYLES[form.threatLevel]}`}>{form.threatLevel} threat</span>}
              {trust && <span className="text-[11px] font-semibold text-amber-600">★ {trust}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {!editing && (
              <button onClick={() => setEditing(true)} className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {editing ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Company Name</label>
                  <input className={ic} value={form.companyName || ''} onChange={e => up('companyName', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>URL</label>
                  <input className={ic} value={form.url || ''} onChange={e => up('url', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={ic} value={form.category || ''} onChange={e => up('category', e.target.value)}>
                    <option value="">— Select —</option>
                    {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Threat Level</label>
                  <select className={ic} value={form.threatLevel || ''} onChange={e => up('threatLevel', e.target.value)}>
                    {THREATS.map(t => <option key={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelCls}>Pricing</label>
                <input className={ic} value={form.pricing || ''} onChange={e => up('pricing', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Target Audience</label>
                <input className={ic} value={form.targetAudience || ''} onChange={e => up('targetAudience', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Key Features</label>
                <textarea className={taCls} value={form.keyFeatures || ''} onChange={e => up('keyFeatures', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Integrations</label>
                <textarea className={taCls} value={form.integrations || ''} onChange={e => up('integrations', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Main Differences vs Eventwise</label>
                <textarea className={taCls} value={form.mainDifferences || ''} onChange={e => up('mainDifferences', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Platform Adaptability</label>
                <textarea className={taCls} value={form.platformAdaptability || ''} onChange={e => up('platformAdaptability', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Customer Satisfaction</label>
                <textarea className={taCls} value={form.customerSatisfaction || ''} onChange={e => up('customerSatisfaction', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Customer Support</label>
                <textarea className={taCls} value={form.customerSupport || ''} onChange={e => up('customerSupport', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Market Strategy</label>
                <textarea className={taCls} value={form.marketStrategy || ''} onChange={e => up('marketStrategy', e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>Notes</label>
                <textarea className={taCls} value={form.notes || ''} onChange={e => up('notes', e.target.value)} />
              </div>
            </>
          ) : (
            <>
              {form.url && (
                <a href={form.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
                  <ExternalLink className="w-3.5 h-3.5" /> {form.url}
                </a>
              )}
              <Field label="Pricing" value={form.pricing} editing={false} />
              <Field label="Target Audience" value={form.targetAudience} editing={false} />
              <Field label="Key Features" value={form.keyFeatures} editing={false} />
              <Field label="Integrations" value={form.integrations} editing={false} />
              <Field label="Main Differences vs Eventwise" value={form.mainDifferences} editing={false} />
              <Field label="Platform Adaptability" value={form.platformAdaptability} editing={false} />
              <Field label="Customer Satisfaction" value={form.customerSatisfaction} editing={false} />
              <Field label="Customer Support" value={form.customerSupport} editing={false} />
              <Field label="Market Strategy" value={form.marketStrategy} editing={false} />
              <Field label="Notes" value={form.notes} editing={false} />
              {form.lastUpdated && (
                <p className="text-xs text-ew-muted">Last updated: {form.lastUpdated}</p>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {editing && (
          <div className="px-5 py-4 border-t border-ew-border flex justify-end gap-2 shrink-0">
            <button onClick={() => { setEditing(false); setForm({ ...competitor }); }} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}