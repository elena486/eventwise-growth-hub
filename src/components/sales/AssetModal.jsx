import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { TYPES } from '@/pages/SalesAssets';
import MultiFileUpload from '@/components/shared/MultiFileUpload';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';

const STATUSES = ['Good to Use', 'Needs Update', 'Editing', 'Working on It', 'Chris to Review', 'ON HOLD', 'Needs Creating'];

const EMPTY = {
  title: '', type: 'Video', status: 'Good to Use',
  url: '', fileUrl: '', fileName: '',
  lastUpdated: format(new Date(), 'yyyy-MM-dd'),
  addedBy: 'Chris', notes: '',
};

export default function AssetModal({ asset, onClose, onSaved }) {
  const [form, setForm] = useState(asset ? { ...asset } : { ...EMPTY });
  const [saving, setSaving] = useState(false);

  // files stored as JSON array in fileUrl field
  const getFiles = () => {
    try { const p = JSON.parse(form.fileUrl); if (Array.isArray(p)) return p; } catch {}
    if (form.fileUrl) return [{ name: form.fileName || form.fileUrl, url: form.fileUrl }];
    return [];
  };
  const setFiles = (files) => {
    up('fileUrl', JSON.stringify(files));
    up('fileName', files.map(f => f.name).join(', '));
  };

  const up = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    let saved;
    if (asset?.id) {
      await base44.entities.SalesAsset.update(asset.id, form);
      saved = { ...asset, ...form };
    } else {
      saved = await base44.entities.SalesAsset.create(form);
    }
    setSaving(false);
    onSaved(saved);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <h2 className="text-sm font-bold text-navy">{asset ? 'Edit Asset' : 'Add New Asset'}</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.title} onChange={e => up('title', e.target.value)} placeholder="Asset title…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select className={inputCls} value={form.type} onChange={e => up('type', e.target.value)}>
                {TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => up('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>URL / Link <span className="text-ew-muted font-normal">(Canva, Loom, Google Docs…)</span></label>
            <input className={inputCls} value={form.url} onChange={e => up('url', e.target.value)} placeholder="https://…" />
          </div>

          <div>
            <label className={labelCls}>Download Files <span className="text-ew-muted font-normal">(PDF, DOCX, ZIP…)</span></label>
            <MultiFileUpload files={getFiles()} onChange={setFiles} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Added by</label>
              <input className={inputCls} value={form.addedBy} onChange={e => up('addedBy', e.target.value)} placeholder="e.g. Elena" />
            </div>
            <div>
              <label className={labelCls}>Last updated</label>
              <input type="date" className={inputCls} value={form.lastUpdated} onChange={e => up('lastUpdated', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-ew-muted font-normal">(when / how to use)</span></label>
            <textarea className={inputCls + ' h-20 resize-none'} value={form.notes} onChange={e => up('notes', e.target.value)} placeholder="Optional context…" />
          </div>
        </div>

        <div className="px-5 py-4 border-t border-ew-border shrink-0 flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()}
            className="px-5 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-40">
            {saving ? 'Saving…' : asset ? 'Save changes' : 'Add asset'}
          </button>
        </div>
      </div>
    </div>
  );
}