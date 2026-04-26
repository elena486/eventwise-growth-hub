import React, { useState, useRef } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
const STATUS_COLORS = {
  'Ideas': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Ready to Publish': 'bg-purple-50 text-[#8403C5]',
  'Scheduled': 'bg-amber-50 text-amber-700',
  'Published': 'bg-green-50 text-green-700',
  'Cancelled': 'bg-red-50 text-red-500',
};

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';

export default function ContentItemSidePanel({ item, onClose, onSave, onDelete }) {
  const isNew = !item;
  const [form, setForm] = useState(item || { title: '', status: 'Ideas', format: 'Written', platform: 'LinkedIn', pagePostedOn: '', publishDate: '', publishedUrl: '', performance: '', notes: '', assetUrl: '', assetName: '' });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const fileRef = useRef();

  const up = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  const handleAssetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    up('assetUrl', file_url);
    up('assetName', file.name);
    setUploading(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl flex flex-col pointer-events-auto font-dm overflow-hidden">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 shrink-0">
          <div>
            <h2 className="text-base font-bold text-gray-900">{isNew ? 'New Content' : (form.title || 'Untitled')}</h2>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full mt-1 inline-block ${STATUS_COLORS[form.status] || 'bg-gray-100 text-gray-600'}`}>{form.status}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-50 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input className={ic} value={form.title || ''} onChange={e => up('title', e.target.value)} placeholder="Content title…" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select className={ic} value={form.status || 'Ideas'} onChange={e => up('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select className={ic} value={form.format || ''} onChange={e => up('format', e.target.value)}>
                <option value="">— Select —</option>
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={labelCls}>Page Posted On</label>
            <input className={ic} value={form.pagePostedOn || ''} onChange={e => up('pagePostedOn', e.target.value)} placeholder="Eventwise Page, Personal Chris" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Publish Date</label>
              <input type="date" className={ic} value={form.publishDate || ''} onChange={e => up('publishDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Published URL</label>
              <input className={ic} value={form.publishedUrl || ''} onChange={e => up('publishedUrl', e.target.value)} placeholder="https://…" />
            </div>
          </div>

          <div>
            <label className={labelCls}>Performance Notes</label>
            <textarea className={ic + ' min-h-[60px] resize-none'} value={form.performance || ''} onChange={e => up('performance', e.target.value)} placeholder="Impressions, likes, comments…" />
          </div>

          <div>
            <label className={labelCls}>Notes / Copy Draft</label>
            <textarea className={ic + ' min-h-[100px] resize-none'} value={form.notes || ''} onChange={e => up('notes', e.target.value)} placeholder="Full post copy, draft notes…" />
          </div>

          {/* Asset */}
          <div>
            <label className={labelCls}>Asset (Image / Video)</label>
            {form.assetUrl ? (
              <div className="relative">
                {form.assetUrl.match(/\.(mp4|mov)/i)
                  ? <video src={form.assetUrl} className="w-full rounded-lg max-h-48 object-cover" muted controls />
                  : <img src={form.assetUrl} alt="" className="w-full rounded-lg max-h-48 object-cover" />}
                <button
                  onClick={() => { up('assetUrl', ''); up('assetName', ''); }}
                  className="absolute top-2 right-2 p-1 bg-white/90 rounded-lg text-red-500 hover:bg-red-50"
                ><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                className="w-full border-2 border-dashed border-gray-200 rounded-lg p-4 text-sm text-gray-400 hover:border-[#8403C5]/40 hover:text-[#8403C5] transition-colors flex items-center justify-center gap-2"
              >
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading…' : 'Upload image or video'}
              </button>
            )}
            <input ref={fileRef} type="file" accept="image/*,video/*" className="hidden" onChange={handleAssetUpload} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-100 flex items-center justify-between shrink-0">
          <div>
            {!isNew && (
              deleteConfirm ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Delete?</span>
                  <button onClick={() => onDelete(form.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Yes</button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.title} className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}