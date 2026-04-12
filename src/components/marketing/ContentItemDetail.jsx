import React, { useState } from 'react';
import { ArrowLeft, Trash2 } from 'lucide-react';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5]";

export default function ContentItemDetail({ item, onSave, onBack, onDelete }) {
  const [form, setForm] = useState(item ? { ...item } : {
    title: '', status: 'Ideas', format: 'Written', platform: 'LinkedIn',
    pagePostedOn: '', publishDate: '', timePublished: '', publishedUrl: '',
    performance: '', notes: '',
  });

  const f = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const togglePage = (page) => {
    const current = (form.pagePostedOn || '').split(',').map(s => s.trim()).filter(Boolean);
    const idx = current.indexOf(page);
    if (idx === -1) current.push(page);
    else current.splice(idx, 1);
    f('pagePostedOn', current.join(', '));
  };

  const selectedPages = (form.pagePostedOn || '').split(',').map(s => s.trim()).filter(Boolean);

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          {item && <button onClick={() => onDelete(item.id)} className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-600 border border-gray-200 rounded-lg text-sm bg-white"><Trash2 className="w-4 h-4" /> Delete</button>}
          <button onClick={() => onSave(form)} className="px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3]">Save</button>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6 max-w-2xl space-y-4">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Title</label>
          <input type="text" className={inputCls} value={form.title} onChange={e => f('title', e.target.value)} placeholder="Post title..." />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Status</label>
            <select className={inputCls} value={form.status} onChange={e => f('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Format</label>
            <select className={inputCls} value={form.format} onChange={e => f('format', e.target.value)}>
              {FORMATS.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Platform</label>
          <input className={`${inputCls} bg-gray-50 text-gray-500`} value="LinkedIn" readOnly />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Page Posted On</label>
          <div className="flex gap-2">
            {PAGES.map(p => (
              <button key={p} type="button" onClick={() => togglePage(p)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${selectedPages.includes(p) ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-gray-600 border-gray-200 hover:border-[#8403C5]'}`}>
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Publish Date</label>
            <input type="date" className={inputCls} value={form.publishDate || ''} onChange={e => f('publishDate', e.target.value)} />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Time Published</label>
            <input type="time" className={inputCls} value={form.timePublished || ''} onChange={e => f('timePublished', e.target.value)} />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Published URL</label>
          <input type="url" className={inputCls} value={form.publishedUrl || ''} onChange={e => f('publishedUrl', e.target.value)} placeholder="https://..." />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Performance</label>
          <input type="text" className={inputCls} value={form.performance || ''} onChange={e => f('performance', e.target.value)} placeholder="Impressions, engagement notes..." />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea rows={4} className={inputCls} value={form.notes || ''} onChange={e => f('notes', e.target.value)} placeholder="Copy drafts, ideas, briefing notes..." />
        </div>
      </div>
    </div>
  );
}