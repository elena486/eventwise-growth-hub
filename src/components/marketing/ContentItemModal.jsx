import React, { useState, useRef } from 'react';
import { X, Upload, FileText, Download, BarChart2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const FORMATS = ['Written', 'Video', 'Carousel', 'Poll', 'Single Image', 'Repost'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

function numVal(v) { return v === '' || v == null ? '' : Number(v); }

export default function ContentItemModal({ item, onSave, onClose }) {
  const [form, setForm] = useState({
    title: item?.title || '',
    status: item?.status || 'Ideas',
    format: item?.format || '',
    platform: 'LinkedIn',
    pagePostedOn: item?.pagePostedOn || '',
    publishDate: item?.publishDate || '',
    timePublished: item?.timePublished || '',
    publishedUrl: item?.publishedUrl || '',
    performance: item?.performance || '',
    notes: item?.notes || '',
    fileUrl: item?.fileUrl || '',
    fileName: item?.fileName || '',
    impressions: item?.impressions ?? '',
    reactions: item?.reactions ?? '',
    comments: item?.comments ?? '',
    reposts: item?.reposts ?? '',
    linkClicks: item?.linkClicks ?? '',
    profileVisits: item?.profileVisits ?? '',
    reach: item?.reach ?? '',
    topicAngle: item?.topicAngle || '',
  });
  const [uploadingFile, setUploadingFile] = useState(false);
  const [perfPrompt, setPerfPrompt] = useState(false);
  const prevStatus = useRef(form.status);

  const set = (k, v) => {
    setForm(prev => {
      const next = { ...prev, [k]: v };
      if (k === 'status' && v === 'Published' && prevStatus.current !== 'Published') {
        const hasPerf = prev.impressions || prev.reactions || prev.reach;
        if (!hasPerf) setPerfPrompt(true);
      }
      if (k === 'status') prevStatus.current = v;
      return next;
    });
  };

  const togglePage = (page) => {
    const pages = form.pagePostedOn ? form.pagePostedOn.split(', ').filter(Boolean) : [];
    const idx = pages.indexOf(page);
    if (idx > -1) pages.splice(idx, 1);
    else pages.push(page);
    set('pagePostedOn', pages.join(', '));
  };

  const selectedPages = form.pagePostedOn ? form.pagePostedOn.split(', ').filter(Boolean) : [];

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setUploadingFile(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    set('fileUrl', file_url);
    set('fileName', file.name);
    setUploadingFile(false);
  };

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
          {/* Performance prompt */}
          {perfPrompt && (
            <div className="flex items-center justify-between bg-green-50 border border-green-200 rounded-xl px-4 py-3 gap-3">
              <p className="text-sm text-green-800 font-medium">Add performance data for this post?</p>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => setPerfPrompt(false)} className="text-xs text-green-600 hover:underline">Skip for now</button>
                <button onClick={() => setPerfPrompt(false)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs font-semibold hover:bg-green-700">Add now ↓</button>
              </div>
            </div>
          )}
          {/* Structured performance */}
          <div className="border border-[#8403C5]/20 rounded-xl p-4 bg-[#FAFBFE] space-y-3">
            <p className="text-xs font-bold text-[#8403C5] uppercase tracking-wide flex items-center gap-1.5"><BarChart2 className="w-3.5 h-3.5" /> Performance Data</p>
            <div>
              <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Topic / Angle</label>
              <input className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form.topicAngle} onChange={e => set('topicAngle', e.target.value)} placeholder="e.g. Festival finance crisis" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'impressions', label: 'Impressions' },
                { key: 'reactions', label: 'Reactions (likes + other)' },
                { key: 'comments', label: 'Comments' },
                { key: 'reposts', label: 'Reposts' },
                { key: 'reach', label: 'Reach (unique accounts)' },
                { key: 'linkClicks', label: 'Link clicks (if link in post)' },
                { key: 'profileVisits', label: 'Profile visits generated' },
              ].map(({ key, label }) => (
                <div key={key}>
                  <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">{label}</label>
                  <input type="number" className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none" value={form[key] ?? ''} onChange={e => set(key, numVal(e.target.value))} placeholder="0" />
                </div>
              ))}
            </div>
            {/* Auto-calculated */}
            {(() => {
              const imp = parseFloat(form.impressions) || 0;
              const reach = parseFloat(form.reach) || 0;
              const eng = (parseFloat(form.reactions) || 0) + (parseFloat(form.comments) || 0) + (parseFloat(form.reposts) || 0);
              const er = imp > 0 ? ((eng / imp) * 100).toFixed(1) : null;
              const err = reach > 0 ? ((eng / reach) * 100).toFixed(1) : null;
              if (!er && !err) return null;
              return (
                <div className="flex gap-3 pt-1 border-t border-[#8403C5]/10">
                  {er && <div className="bg-white rounded-lg px-3 py-2 border border-ew-border"><p className="text-[10px] text-ew-muted uppercase">Engagement rate</p><p className="text-base font-bold text-[#8403C5]">{er}%</p></div>}
                  {err && <div className="bg-white rounded-lg px-3 py-2 border border-ew-border"><p className="text-[10px] text-ew-muted uppercase">Eng. per reach</p><p className="text-base font-bold text-[#8403C5]">{err}%</p></div>}
                </div>
              );
            })()}
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">Notes / Draft</label>
            <textarea className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none resize-none" rows={3} value={form.notes} onChange={e => set('notes', e.target.value)} placeholder="Copy drafts, ideas, briefing notes…" />
          </div>
          <div>
            <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">File Attachment</label>
            {form.fileUrl ? (
              <div className="flex items-center gap-3 p-3 border border-ew-border rounded-lg bg-ew-bg">
                <FileText className="w-5 h-5 text-navy shrink-0" />
                <span className="text-sm text-ew-body flex-1 truncate">{form.fileName || 'Uploaded file'}</span>
                <a href={form.fileUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs font-semibold text-navy hover:underline shrink-0">
                  <Download className="w-3.5 h-3.5" /> Download
                </a>
                <button type="button" onClick={() => { set('fileUrl', ''); set('fileName', ''); }} className="text-ew-muted hover:text-red-500 transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <label className={`flex items-center gap-2 border border-dashed border-ew-border rounded-lg px-4 py-3 cursor-pointer hover:bg-ew-bg transition-colors ${uploadingFile ? 'opacity-60 pointer-events-none' : ''}`}>
                <Upload className="w-4 h-4 text-ew-muted" />
                <span className="text-sm text-ew-muted">{uploadingFile ? 'Uploading…' : 'Click to upload a file (jpg, png, pdf, mp4, etc.)'}</span>
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*,video/*,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx" />
              </label>
            )}
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