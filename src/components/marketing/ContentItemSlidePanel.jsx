import React, { useState } from 'react';
import { X, Upload, Trash2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

const STATUS_COLORS = {
  'Ideas': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Ready to Publish': 'bg-purple-50 text-[#8403C5]',
  'Scheduled': 'bg-amber-50 text-amber-700',
  'Published': 'bg-green-50 text-green-700',
  'Cancelled': 'bg-red-50 text-red-500',
};

const inputCls = 'w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5]';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';
const isVideo = (url) => url && (url.includes('.mp4') || url.includes('.mov'));

export default function ContentItemSlidePanel({ item, onClose, onSave, onDelete }) {
  const [form, setForm] = useState(item ? { ...item } : {
    title: '', status: 'Ideas', format: 'Written', platform: 'LinkedIn',
    pagePostedOn: '', publishDate: '', timePublished: '', publishedUrl: '',
    performance: '', notes: '', assetUrl: '', assetName: '',
  });
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [saving, setSaving] = useState(false);

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const togglePage = (page) => {
    const current = (form.pagePostedOn || '').split(',').map(s => s.trim()).filter(Boolean);
    const idx = current.indexOf(page);
    if (idx === -1) current.push(page); else current.splice(idx, 1);
    f('pagePostedOn', current.join(', '));
  };
  const selectedPages = (form.pagePostedOn || '').split(',').map(s => s.trim()).filter(Boolean);

  const handleAssetUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    f('assetUrl', file_url);
    f('assetName', file.name);
    setUploading(false);
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-full max-w-lg bg-white border-l border-gray-200 shadow-2xl flex flex-col pointer-events-auto font-dm">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <h2 className="text-base font-bold text-gray-900 truncate">{form.title || 'New Content'}</h2>
            <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[form.status] || 'bg-gray-100 text-gray-600'}`}>{form.status}</span>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors ml-2 shrink-0">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          <div>
            <label className={labelCls}>Title</label>
            <input type="text" className={inputCls} value={form.title} onChange={e => f('title', e.target.value)} placeholder="Post title…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => f('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Format</label>
              <select className={inputCls} value={form.format} onChange={e => f('format', e.target.value)}>
                {FORMATS.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Page Posted On</label>
            <div className="flex gap-2">
              {PAGES.map(p => (
                <button key={p} type="button" onClick={() => togglePage(p)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedPages.includes(p) ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#8403C5]'}`}>
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Publish Date</label>
              <input type="date" className={inputCls} value={form.publishDate || ''} onChange={e => f('publishDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Time Published</label>
              <input type="time" className={inputCls} value={form.timePublished || ''} onChange={e => f('timePublished', e.target.value)} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Published URL</label>
            <input type="url" className={inputCls} value={form.publishedUrl || ''} onChange={e => f('publishedUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className={labelCls}>Performance</label>
            <input type="text" className={inputCls} value={form.performance || ''} onChange={e => f('performance', e.target.value)} placeholder="Impressions, engagement…" />
          </div>
          <div>
            <label className={labelCls}>Notes / Copy Draft</label>
            <textarea rows={4} className={inputCls} value={form.notes || ''} onChange={e => f('notes', e.target.value)} placeholder="Copy drafts, ideas, briefing notes…" />
          </div>
          <div>
            <label className={labelCls}>Asset</label>
            {form.assetUrl ? (
              <div className="relative mt-1 inline-block">
                {isVideo(form.assetUrl)
                  ? <video src={form.assetUrl} controls className="max-h-48 rounded-lg border border-gray-200" />
                  : <img src={form.assetUrl} alt="Asset" className="max-h-48 rounded-lg border border-gray-200 object-contain" />}
                <button onClick={() => { f('assetUrl', ''); f('assetName', ''); }}
                  className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 shadow hover:bg-red-50 hover:border-red-300 transition-colors">
                  <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
                <Upload className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-400">{uploading ? 'Uploading…' : 'Upload image or video'}</span>
                <input type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime" onChange={handleAssetUpload} />
              </label>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-4 border-t border-gray-200 flex items-center justify-between shrink-0">
          <div>
            {item && (
              confirmDelete ? (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-red-600 font-medium">Sure?</span>
                  <button onClick={() => { setConfirmDelete(false); onDelete(item.id); }}
                    className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700">Yes, delete</button>
                  <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                </div>
              ) : (
                <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1 text-xs text-red-400 hover:text-red-600 font-medium transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              )
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={handleSave} disabled={saving}
              className="px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] disabled:opacity-40">
              {saving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}