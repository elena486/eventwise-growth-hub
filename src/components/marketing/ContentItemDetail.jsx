import React, { useState, useRef } from 'react';
import { ArrowLeft, Trash2, Upload, X, BarChart2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5]";

function numVal(v) { return v === '' || v == null ? '' : Number(v); }

function PerformanceSection({ form, f }) {
  const imp = parseFloat(form.impressions) || 0;
  const reach = parseFloat(form.reach) || 0;
  const eng = (parseFloat(form.reactions) || 0) + (parseFloat(form.comments) || 0) + (parseFloat(form.reposts) || 0);
  const engRate = imp > 0 ? ((eng / imp) * 100).toFixed(1) : null;
  const engRateReach = reach > 0 ? ((eng / reach) * 100).toFixed(1) : null;

  return (
    <div className="border border-[#8403C5]/20 rounded-xl p-4 bg-[#FAFBFE] space-y-3">
      <p className="text-xs font-bold text-[#8403C5] uppercase tracking-wide flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Performance Data</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Topic / Angle</label>
          <input className={inputCls} value={form.topicAngle || ''} onChange={e => f('topicAngle', e.target.value)} placeholder="e.g. Festival finance crisis" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Impressions</label>
          <input type="number" className={inputCls} value={form.impressions ?? ''} onChange={e => f('impressions', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reactions (likes + other)</label>
          <input type="number" className={inputCls} value={form.reactions ?? ''} onChange={e => f('reactions', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Comments</label>
          <input type="number" className={inputCls} value={form.comments ?? ''} onChange={e => f('comments', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reposts</label>
          <input type="number" className={inputCls} value={form.reposts ?? ''} onChange={e => f('reposts', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Reach (unique accounts)</label>
          <input type="number" className={inputCls} value={form.reach ?? ''} onChange={e => f('reach', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Link clicks (if link in post)</label>
          <input type="number" className={inputCls} value={form.linkClicks ?? ''} onChange={e => f('linkClicks', numVal(e.target.value))} placeholder="0" />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Profile visits generated</label>
          <input type="number" className={inputCls} value={form.profileVisits ?? ''} onChange={e => f('profileVisits', numVal(e.target.value))} placeholder="0" />
        </div>
      </div>
      {(engRate || engRateReach) && (
        <div className="flex gap-4 pt-1 border-t border-[#8403C5]/10">
          {engRate && (
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Engagement rate</p>
              <p className="text-lg font-bold text-[#8403C5]">{engRate}%</p>
            </div>
          )}
          {engRateReach && (
            <div className="bg-white rounded-lg px-3 py-2 border border-gray-200">
              <p className="text-[10px] text-gray-400 uppercase tracking-wide">Eng. per reach</p>
              <p className="text-lg font-bold text-[#8403C5]">{engRateReach}%</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const isVideo = (url) => url && (url.includes('.mp4') || url.includes('.mov') || url.match(/video/i));

function AssetPreview({ url, onRemove }) {
  if (!url) return null;
  return (
    <div className="relative mt-2 inline-block">
      {isVideo(url)
        ? <video src={url} controls className="max-h-48 rounded-lg border border-gray-200" />
        : <img src={url} alt="Asset" className="max-h-48 rounded-lg border border-gray-200 object-contain" />
      }
      <button onClick={onRemove} className="absolute -top-2 -right-2 bg-white border border-gray-200 rounded-full p-0.5 shadow hover:bg-red-50 hover:border-red-300 transition-colors">
        <X className="w-3.5 h-3.5 text-gray-500 hover:text-red-500" />
      </button>
    </div>
  );
}

export default function ContentItemDetail({ item, onSave, onBack, onDelete }) {
  const [form, setForm] = useState(item ? { ...item } : {
    title: '', status: 'Ideas', format: 'Written', platform: 'LinkedIn',
    pagePostedOn: '', publishDate: '', timePublished: '', publishedUrl: '',
    performance: '', notes: '', assetUrl: '', assetName: '',
    impressions: '', reactions: '', comments: '', reposts: '',
    linkClicks: '', profileVisits: '', reach: '', topicAngle: '',
  });
  const [uploading, setUploading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [perfPrompt, setPerfPrompt] = useState(false); // show "add performance?" banner
  const prevStatus = React.useRef(form.status);

  const f = (k, v) => {
    setForm(p => {
      const next = { ...p, [k]: v };
      // Show performance prompt when status changes to Published for the first time
      if (k === 'status' && v === 'Published' && prevStatus.current !== 'Published') {
        const hasPerf = p.impressions || p.reactions || p.reach;
        if (!hasPerf) setPerfPrompt(true);
      }
      if (k === 'status') prevStatus.current = v;
      return next;
    });
  };

  const togglePage = (page) => {
    const current = (form.pagePostedOn || '').split(',').map(s => s.trim()).filter(Boolean);
    const idx = current.indexOf(page);
    if (idx === -1) current.push(page);
    else current.splice(idx, 1);
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

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      <div className="flex items-center justify-between mb-5">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800">
          <ArrowLeft className="w-4 h-4" /> Back
        </button>
        <div className="flex gap-2">
          {item && (
            <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-2 text-red-400 hover:text-red-600 border border-gray-200 rounded-lg text-sm bg-white">
              <Trash2 className="w-4 h-4" /> Delete
            </button>
          )}
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
        {/* Performance prompt banner */}
        {perfPrompt && (
          <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 gap-3">
            <p className="text-sm text-green-800 font-medium">Add performance data for this post?</p>
            <div className="flex gap-2 shrink-0">
              <button onClick={() => setPerfPrompt(false)} className="text-xs text-green-600 hover:underline">Skip for now</button>
              <button onClick={() => setPerfPrompt(false)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700 transition-colors">Add now ↓</button>
            </div>
          </div>
        )}

        {/* Structured performance section — always visible for Published, otherwise collapsible */}
        {form.status === 'Published' ? (
          <PerformanceSection form={form} f={f} />
        ) : (
          <details className="group">
            <summary className="cursor-pointer text-xs font-medium text-ew-muted hover:text-navy list-none flex items-center gap-1.5">
              <BarChart2 className="w-3.5 h-3.5" /> Performance data (optional)
            </summary>
            <div className="mt-3">
              <PerformanceSection form={form} f={f} />
            </div>
          </details>
        )}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Notes</label>
          <textarea rows={4} className={inputCls} value={form.notes || ''} onChange={e => f('notes', e.target.value)} placeholder="Copy drafts, ideas, briefing notes..." />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Asset</label>
          {form.assetUrl ? (
            <AssetPreview url={form.assetUrl} onRemove={() => { f('assetUrl', ''); f('assetName', ''); }} />
          ) : (
            <label className={`flex items-center gap-2 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors ${uploading ? 'opacity-60 pointer-events-none' : ''}`}>
              <Upload className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-400">{uploading ? 'Uploading…' : 'Upload image or video (jpg, png, gif, webp, mp4, mov)'}</span>
              <input type="file" className="hidden" accept="image/jpeg,image/png,image/gif,image/webp,video/mp4,video/quicktime" onChange={handleAssetUpload} />
            </label>
          )}
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
          <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl">
            <p className="text-sm text-gray-800 mb-5">Are you sure you want to delete this post? This cannot be undone.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">Cancel</button>
              <button onClick={() => { setConfirmDelete(false); onDelete(item.id); }} className="px-4 py-2 text-sm text-white bg-red-500 rounded-lg hover:bg-red-600 transition-colors">Confirm Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}