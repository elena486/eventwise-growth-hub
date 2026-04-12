import React, { useState } from 'react';
import { X } from 'lucide-react';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

export default function ContentItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    status: item?.status || 'Ideas',
    format: item?.format || '',
    platform: 'LinkedIn',
    pagePostedOn: item?.pagePostedOn || '',
    publishDate: item?.publishDate || '',
    publishedUrl: item?.publishedUrl || '',
    performance: item?.performance || '',
    notes: item?.notes || '',
  });

  const set = (k, v) => setForm(prev => ({ ...prev, [k]: v }));

  const togglePage = (page) => {
    const pages = form.pagePostedOn ? form.pagePostedOn.split(', ').filter(Boolean) : [];
    const idx = pages.indexOf(page);
    if (idx > -1) pages.splice(idx, 1);
    else pages.push(page);
    set('pagePostedOn', pages.join(', '));
  };

  const selectedPages = form.pagePostedOn ? form.pagePostedOn.split(', ').filter(Boolean) : [];

  const handleSave = () => {
    if (!form.title.trim()) return;
    onSave({ ...(item || {}), ...form });
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-ew-border">
          <h2 className="font-bold text-navy">{item ? 'Edit content' : 'New content item'}</h2>
          <button onClick={onClose} className="text-ew-muted hover:text-navy p-1"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Title *</label>
            <input className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy" value={form.title} onChange={e => set('title', e.target.value)} placeholder="Post topic or working title" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Status</label>
              <select className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Format</label>
              <select className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.format} onChange={e => set('format', e.target.value)}>
                <option value="">Select…</option>
                {FORMATS.map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Page Posted On</label>
            <div className="flex gap-2">
              {PAGES.map(p => (
                <button
                  key={p}
                  onClick={() => togglePage(p)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${selectedPages.includes(p) ? 'bg-navy text-white border-navy' : 'border-ew-border text-ew-body hover:bg-ew-bg'}`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Publish Date</label>
            <input type="date" className="border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.publishDate} onChange={e => set('publishDate', e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Published URL</label>
            <input className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.publishedUrl} onChange={e => set('publishedUrl', e.target.value)} placeholder="https://…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Performance</label>
            <input className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.performance} onChange={e => set('performance', e.target.value)} placeholder="Impressions, engagement notes…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Notes / Draft</label>
            <textarea className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Copy drafts, ideas, briefing notes…" />
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-ew-border">
          <button onClick={handleSave} className="flex-1 bg-navy text-white rounded-lg py-2 text-sm font-semibold hover:bg-navy/90 transition-colors">Save</button>
          <button onClick={onClose} className="px-4 py-2 border border-ew-border rounded-lg text-sm text-ew-body hover:bg-ew-bg transition-colors">Cancel</button>
        </div>
      </div>
    </div>
  );
}