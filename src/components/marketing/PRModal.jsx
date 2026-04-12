import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X } from 'lucide-react';

export default function PRModal({ onClose }) {
  const [form, setForm] = useState({ publication: '', date: '', headline: '', link: '' });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.publication.trim()) return;
    setSaving(true);
    await base44.entities.PRCoverage.create(form);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-ew-border">
          <h2 className="font-bold text-navy">New PR Coverage</h2>
          <button onClick={onClose} className="text-ew-muted hover:text-navy p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          {[
            { key: 'publication', label: 'Publication *', placeholder: 'e.g. The Stage' },
            { key: 'date', label: 'Date', type: 'date' },
            { key: 'headline', label: 'Headline', placeholder: 'Article headline' },
            { key: 'link', label: 'Link', placeholder: 'https://…' },
          ].map(f => (
            <div key={f.key}>
              <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">{f.label}</label>
              <input
                type={f.type || 'text'}
                className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                value={form[f.key]}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
              />
            </div>
          ))}
        </div>
        <div className="flex gap-3 p-5 border-t border-ew-border">
          <button onClick={handleSave} disabled={saving} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50">
            {saving ? 'Saving…' : 'Save'}
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-ew-border rounded-lg text-sm text-ew-body hover:bg-ew-bg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}