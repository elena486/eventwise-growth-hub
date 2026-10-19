import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileSpreadsheet, ExternalLink, Check, AlertTriangle, Sparkles } from 'lucide-react';
import { parseLinkedinFile, matchPosts, titleFromUrl, shortSlugPreview, timeBucket } from '@/lib/linkedinImport';

const PAGES = ['Personal Chris', 'Eventwise Page'];

function fmt(n) { return n != null ? Number(n).toLocaleString('en-GB') : '—'; }

const STATUS_BADGE = {
  matched: 'bg-emerald-50 text-emerald-700',
  create_new: 'bg-blue-50 text-blue-700',
  needs_choice: 'bg-amber-50 text-amber-700',
};

export default function ImportLinkedinAnalyticsModal({ onClose, onSaved }) {
  const [step, setStep] = useState('upload');
  const [page, setPage] = useState('Personal Chris');
  const [fileName, setFileName] = useState('');
  const [parsing, setParsing] = useState(false);
  const [error, setError] = useState('');
  const [contentItems, setContentItems] = useState([]);
  const [rows, setRows] = useState([]);
  const [periodTotals, setPeriodTotals] = useState({});
  const [periodMonth, setPeriodMonth] = useState(null);
  const [periodYear, setPeriodYear] = useState(null);
  const [saving, setSaving] = useState(false);
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    base44.entities.ContentItem.list('-publishDate', 500).then(setContentItems).catch(() => {});
  }, []);

  const handleFile = async (file) => {
    if (!file) return;
    if (!/\.xlsx$/i.test(file.name)) { setError('Please upload an .xlsx LinkedIn analytics export.'); return; }
    setParsing(true); setError(''); setFileName(file.name);
    try {
      const buf = await file.arrayBuffer();
      const { posts, periodTotals: pt, periodMonth: pm, periodYear: py } = parseLinkedinFile(buf, file.name);
      if (!posts.length) { setError('No posts found in the file. Check the sheet names (TOP POSTS, MOST RECENT POSTS).'); setParsing(false); return; }
      const matched = matchPosts(posts, contentItems, page);
      setRows(matched);
      setPeriodTotals(pt);
      setPeriodMonth(pm);
      setPeriodYear(py);
      setStep('review');
    } catch (e) {
      setError('Could not parse the file: ' + (e?.message || 'unknown error'));
    } finally {
      setParsing(false);
    }
  };

  const setChoice = (idx, value) => {
    setRows(prev => prev.map((r, i) => i === idx ? { ...r, choice: value, status: value === 'new' ? 'create_new' : 'matched' } : r));
  };

  const unresolved = rows.some(r => !r.choice);

  const handleSave = async () => {
    if (unresolved) return;
    setSaving(true);
    let savedCount = 0, createdCount = 0;
    const updatedItems = [];
    const numFields = ['impressions', 'engagements', 'reactions', 'comments', 'reposts', 'reach', 'saves', 'followersGained'];
    for (const r of rows) {
      const nums = { publishedUrl: r.url };
      numFields.forEach(f => { if (r[f] != null) nums[f] = r[f]; });
      if (r.choice === 'new') {
        await base44.entities.ContentItem.create({
          title: titleFromUrl(r.url),
          status: 'Published',
          platform: 'LinkedIn',
          pagePostedOn: page,
          publishDate: r.date,
          ...nums,
        });
        createdCount++;
      } else {
        await base44.entities.ContentItem.update(r.choice, nums);
        savedCount++;
        const it = contentItems.find(c => c.id === r.choice);
        if (it) updatedItems.push({ ...it, ...nums });
      }
    }
    // Save period totals into MarketingReport
    if (periodMonth && periodYear) {
      try {
        const existing = await base44.entities.MarketingReport.filter({ month: periodMonth, year: periodYear });
        const data = {
          totalImpressions: periodTotals.totalImpressions || null,
          uniqueMembersReached: periodTotals.membersReached || null,
          totalFollowers: periodTotals.totalFollowers || null,
          newFollowers: periodTotals.newFollowers || null,
          periodStart: periodTotals.periodStart || null,
          periodEnd: periodTotals.periodEnd || null,
          importedDate: new Date().toISOString().slice(0, 10),
          page,
        };
        Object.keys(data).forEach(k => data[k] == null && delete data[k]);
        if (existing.length > 0) {
          const r = existing[0];
          let prev = {}; try { prev = JSON.parse(r.chrisLinkedInData || '{}'); } catch {}
          await base44.entities.MarketingReport.update(r.id, { chrisLinkedInData: JSON.stringify({ ...prev, ...data }) });
        } else {
          await base44.entities.MarketingReport.create({ month: periodMonth, year: periodYear, status: 'Draft', chrisLinkedInData: JSON.stringify(data) });
        }
      } catch {}
    }
    // Summary
    const totalImpressions = periodTotals.totalImpressions || rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const postImpressions = rows.reduce((s, r) => s + (r.impressions || 0), 0);
    const avg = rows.length ? Math.round(postImpressions / rows.length) : 0;
    const top5 = [...rows].filter(r => r.impressions).sort((a, b) => b.impressions - a.impressions).slice(0, 5);
    const fmtMap = {};
    updatedItems.forEach(it => { if (it.format && it.impressions) { (fmtMap[it.format] ||= []).push(it.impressions); } });
    const bestFormat = Object.entries(fmtMap).map(([f, arr]) => ({ f, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) })).sort((a, b) => b.avg - a.avg)[0]?.f;
    const timeMap = {};
    updatedItems.forEach(it => { const b = timeBucket(it.timePublished); if (b && it.impressions) { (timeMap[b] ||= []).push(it.impressions); } });
    const bestTimeWindow = Object.entries(timeMap).map(([b, arr]) => ({ b, avg: Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) })).sort((a, b) => b.avg - a.avg)[0]?.b;
    setSummary({ totalImpressions, avg, postCount: rows.length, top5, bestFormat, bestTimeWindow, savedCount, createdCount });
    setStep('summary');
    setSaving(false);
    onSaved?.();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-[#8403C5]" />
            <h2 className="text-base font-bold text-[#242450]">Import LinkedIn analytics</h2>
            {periodMonth && <span className="text-xs text-gray-400">· {periodMonth} {periodYear}</span>}
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {step === 'upload' && (
            <div className="max-w-xl mx-auto py-8">
              <label className="block text-sm font-medium text-[#242450] mb-1">Page</label>
              <p className="text-xs text-gray-400 mb-2">Which profile/page is this export for?</p>
              <div className="flex gap-2 mb-6">
                {PAGES.map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-colors ${page === p ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                    {p}
                  </button>
                ))}
              </div>

              <label className="block text-sm font-medium text-[#242450] mb-1">LinkedIn analytics export (.xlsx)</label>
              <p className="text-xs text-gray-400 mb-3">From Chris's profile → Analytics → Export data. File name like <code className="text-[11px] bg-gray-100 px-1 rounded">AggregateAnalytics_Chris_Carter_2026-09-01_2026-09-30.xlsx</code></p>
              <label className="flex flex-col items-center justify-center gap-2 border-2 border-dashed border-gray-300 rounded-xl py-10 cursor-pointer hover:border-[#8403C5] hover:bg-purple-50/30 transition-colors">
                <Upload className="w-8 h-8 text-gray-400" />
                <span className="text-sm font-medium text-[#242450]">{parsing ? 'Parsing…' : 'Click to upload .xlsx'}</span>
                <span className="text-xs text-gray-400">Parsed in your browser — nothing uploaded to a server</span>
                <input type="file" accept=".xlsx" className="hidden" onChange={e => handleFile(e.target.files[0])} disabled={parsing} />
              </label>
              {parsing && <div className="mt-4 flex justify-center"><div className="w-5 h-5 border-2 border-purple-200 border-t-[#8403C5] rounded-full animate-spin" /></div>}
              {error && <p className="mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>}
            </div>
          )}

          {step === 'review' && (
            <div>
              <div className="flex items-center gap-3 mb-4 text-xs text-gray-500 flex-wrap">
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Matched</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Will create new</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Needs choice</span>
                <span className="ml-auto">{rows.length} posts found</span>
              </div>
              <div className="border border-gray-200 rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200">
                    <tr>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Post</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Impr.</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Eng.</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">React.</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Comm.</th>
                      <th className="px-3 py-2.5 text-right text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Repost</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Match</th>
                      <th className="px-3 py-2.5 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Assign to</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r, i) => (
                      <tr key={i} className="border-b border-gray-100 hover:bg-gray-50/50">
                        <td className="px-3 py-2.5 max-w-[220px]">
                          <a href={r.url} target="_blank" rel="noreferrer" className="text-[#8403C5] hover:underline flex items-center gap-1 text-xs font-medium">
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{shortSlugPreview(r.url)}</span>
                          </a>
                        </td>
                        <td className="px-3 py-2.5 text-xs text-gray-600 whitespace-nowrap">{r.date || '—'}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-medium text-gray-800">{fmt(r.impressions)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmt(r.engagements)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmt(r.reactions)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmt(r.comments)}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-600">{fmt(r.reposts)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_BADGE[r.status] || 'bg-gray-100 text-gray-600'}`}>
                            {r.status === 'matched' ? 'Matched' : r.status === 'create_new' ? 'New' : 'Needs choice'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5">
                          <select value={r.choice} onChange={e => setChoice(i, e.target.value)}
                            className="text-xs border border-gray-200 rounded-lg px-2 py-1 max-w-[200px] bg-white">
                            <option value="">— pick —</option>
                            <option value="new">➕ Create new</option>
                            {contentItems.map(it => (
                              <option key={it.id} value={it.id}>{(it.title || 'Untitled').slice(0, 40)}{it.publishDate ? ` (${it.publishDate})` : ''}</option>
                            ))}
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {unresolved && (
                <p className="mt-3 text-xs text-amber-700 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5" /> Resolve all "Needs choice" rows (pick a content item or create new) before saving.
                </p>
              )}
            </div>
          )}

          {step === 'summary' && summary && (
            <div className="max-w-2xl mx-auto py-4">
              <div className="flex items-center gap-2 mb-5">
                <div className="w-9 h-9 rounded-full bg-emerald-100 flex items-center justify-center"><Check className="w-5 h-5 text-emerald-600" /></div>
                <div>
                  <h3 className="text-base font-bold text-[#242450]">Import complete</h3>
                  <p className="text-xs text-gray-500">{summary.savedCount} updated · {summary.createdCount} created · {periodMonth} {periodYear}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Total impressions</p>
                  <p className="text-2xl font-bold text-[#242450]">{fmt(summary.totalImpressions)}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Avg / post</p>
                  <p className="text-2xl font-bold text-[#242450]">{fmt(summary.avg)}</p>
                  <p className="text-[10px] text-gray-400">{summary.postCount} posts</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Best format</p>
                  <p className="text-lg font-bold text-[#8403C5]">{summary.bestFormat || '—'}</p>
                </div>
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
                  <p className="text-[10px] font-medium text-gray-500 uppercase tracking-wide mb-1">Best time window</p>
                  <p className="text-lg font-bold text-[#8403C5]">{summary.bestTimeWindow || '—'}</p>
                </div>
              </div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1"><Sparkles className="w-3.5 h-3.5" /> Top 5 posts by impressions</p>
              <div className="border border-gray-200 rounded-xl divide-y divide-gray-100">
                {summary.top5.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                    <span className="text-xs font-bold text-gray-400 w-4">{i + 1}</span>
                    <a href={r.url} target="_blank" rel="noreferrer" className="text-xs text-[#8403C5] hover:underline flex-1 truncate flex items-center gap-1">
                      <ExternalLink className="w-3 h-3 shrink-0" /> {shortSlugPreview(r.url)}
                    </a>
                    <span className="text-xs font-semibold text-gray-700">{fmt(r.impressions)}</span>
                  </div>
                ))}
                {summary.top5.length === 0 && <p className="px-4 py-3 text-xs text-gray-400">No impression data.</p>}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 shrink-0">
          <button onClick={onClose} className="text-sm font-medium text-gray-500 hover:text-gray-700">Close</button>
          {step === 'review' && (
            <button onClick={handleSave} disabled={saving || unresolved}
              className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] disabled:opacity-40 transition-colors">
              {saving ? <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" /> Saving…</> : <><Check className="w-4 h-4" /> Save all</>}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}