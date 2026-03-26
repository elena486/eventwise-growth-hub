import React, { useState } from 'react';
import { calcHealth } from '@/lib/csData';
import { X } from 'lucide-react';

const FIELDS = [
  { key: 'emails', label: 'QOR – Emails' },
  { key: 'meetings', label: 'QOR – Meetings' },
  { key: 'goals', label: 'ROI – Goals' },
  { key: 'adoption', label: 'ROI – Adoption' },
  { key: 'knowledge', label: 'ROI – Knowledge' },
  { key: 'cx', label: 'ROI – CX' },
  { key: 'issues', label: 'Issue Resolution' },
];

const RATING_STYLES = { Green: 'bg-emerald-50 text-emerald-700', Yellow: 'bg-amber-50 text-amber-700', Red: 'bg-red-50 text-red-600' };

export default function UpdateScoresModal({ client, latestScore, onSave, onClose }) {
  const [scores, setScores] = useState({
    emails: latestScore?.emails || '',
    meetings: latestScore?.meetings || '',
    goals: latestScore?.goals || '',
    adoption: latestScore?.adoption || '',
    knowledge: latestScore?.knowledge || '',
    cx: latestScore?.cx || '',
    issues: latestScore?.issues || '',
  });
  const [saving, setSaving] = useState(false);

  const up = (k, v) => {
    const num = Math.min(5, Math.max(1, parseInt(v) || ''));
    setScores(p => ({ ...p, [k]: num || '' }));
  };

  const allFilled = FIELDS.every(f => scores[f.key] !== '');
  const computed = allFilled ? calcHealth(scores) : null;

  const handleSave = async () => {
    if (!allFilled) return;
    setSaving(true);
    await onSave({ ...scores, ...computed });
    setSaving(false);
  };

  const ScoreInput = ({ field }) => {
    const v = scores[field.key];
    const color = v === '' ? '' : v <= 2 ? 'border-red-300 bg-red-50' : v === 3 ? 'border-amber-300 bg-amber-50' : 'border-emerald-300 bg-emerald-50';
    return (
      <div className="flex items-center justify-between py-2.5 border-b border-ew-border last:border-0">
        <label className="text-sm font-medium text-ew-body">{field.label}</label>
        <div className="flex items-center gap-2">
          <span className="text-[11px] text-ew-muted">1–5</span>
          <input
            type="number" min="1" max="5"
            value={v}
            onChange={e => up(field.key, e.target.value)}
            className={`w-16 text-center text-sm font-bold border rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 transition-colors ${color || 'border-ew-border bg-white'}`}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <h2 className="text-base font-bold text-navy">Update Health — {client.name}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>
        <div className="px-6 py-4">
          {FIELDS.map(f => <ScoreInput key={f.key} field={f} />)}

          {computed && (
            <div className="mt-4 p-4 bg-ew-bg rounded-xl flex items-center justify-between">
              <div>
                <p className="text-xs text-ew-muted mb-1">Total score</p>
                <p className="text-2xl font-bold text-navy">{computed.total}<span className="text-sm font-normal text-ew-muted">/35</span></p>
              </div>
              <div className="text-right">
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${RATING_STYLES[computed.rating]}`}>{computed.rating}</span>
                <p className="text-xs text-ew-muted mt-1.5">{computed.quadrant}</p>
              </div>
            </div>
          )}
        </div>
        <div className="px-6 py-4 border-t border-ew-border flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={!allFilled || saving} className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40">
            {saving ? 'Saving…' : 'Save scores'}
          </button>
        </div>
      </div>
    </div>
  );
}