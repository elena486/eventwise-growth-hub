import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Globe, BarChart2, Building2, Mail, Upload, X, Sparkles, Loader2, CheckCircle2 } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TRAFFIC_SOURCES = ['Organic Search','Direct','Referral','Social','Email','Paid Search','Other'];
const YEARS = [2024, 2025, 2026, 2027];
const SECTION_TABS = [
  { id: 'website',       label: 'Website',        icon: <Globe className="w-4 h-4" /> },
  { id: 'chrisLinkedIn', label: 'Chris LinkedIn',  icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'companyPage',   label: 'Company Page',    icon: <Building2 className="w-4 h-4" /> },
  { id: 'newsletter',    label: 'Newsletter',      icon: <Mail className="w-4 h-4" /> },
];

const inputCls  = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] bg-white";
const missingCls = "w-full border border-amber-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] bg-amber-50";
const disabledCls = "w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-400";

const SYSTEM_PROMPT = `You are a marketing analyst assistant for Eventwise, a B2B SaaS company for event financial management. You are reading a screenshot of a marketing analytics dashboard. Extract all visible numeric metrics and return them as a JSON object. Then write a concise 2-3 sentence narrative summary of the key insights — what went well, what needs attention, and one clear focus for next month. Be specific and use the actual numbers. Write in a direct, analytical tone — no corporate fluff.`;

const PLATFORM_CONFIGS = {
  website: {
    icon: '🌐',
    label: 'Website / GA4',
    uploadLabel: 'Upload your GA4 dashboard screenshot',
    prompt: `This is a Google Analytics 4 dashboard screenshot for the Eventwise website. Extract: active users, sessions, new users, engaged sessions %, avg engagement time, pages per user, top traffic source, organic search sessions if visible. Also extract any Google Search Console data visible: impressions, clicks, avg position. Return as JSON with keys: active_users, sessions, new_users, engaged_sessions_pct, avg_engagement_time, top_traffic_source, gsc_impressions, gsc_clicks, gsc_avg_position, narrative.`,
    schema: { type: 'object', properties: { active_users: {type:'number'}, sessions: {type:'number'}, new_users: {type:'number'}, engaged_sessions_pct: {type:'number'}, avg_engagement_time: {type:'string'}, top_traffic_source: {type:'string'}, gsc_impressions: {type:'number'}, gsc_clicks: {type:'number'}, gsc_avg_position: {type:'number'}, narrative: {type:'string'} } },
  },
  chrisLI: {
    icon: '📊',
    label: 'Chris LinkedIn',
    uploadLabel: 'Upload your LinkedIn personal analytics screenshot',
    prompt: `This is a LinkedIn personal analytics screenshot for Chris Carter, CEO of Eventwise. Extract: total impressions, unique members reached, reactions, comments, reposts, new connections, profile views if visible. Return as JSON with keys: impressions, unique_reach, reactions, comments, reposts, new_connections, narrative.`,
    schema: { type: 'object', properties: { impressions: {type:'number'}, unique_reach: {type:'number'}, reactions: {type:'number'}, comments: {type:'number'}, reposts: {type:'number'}, new_connections: {type:'number'}, narrative: {type:'string'} } },
  },
  company: {
    icon: '🏢',
    label: 'Company Page',
    uploadLabel: 'Upload your Eventwise LinkedIn page analytics screenshot',
    prompt: `This is a LinkedIn company page analytics screenshot for Eventwise. Extract: page impressions, new followers, reactions, clicks, engagement rate if visible. Return as JSON with keys: page_impressions, new_followers, reactions, clicks, narrative.`,
    schema: { type: 'object', properties: { page_impressions: {type:'number'}, new_followers: {type:'number'}, reactions: {type:'number'}, clicks: {type:'number'}, narrative: {type:'string'} } },
  },
  newsletter: {
    icon: '✉️',
    label: 'Newsletter',
    uploadLabel: 'Upload your Beehiiv stats screenshot',
    prompt: `This is a Beehiiv newsletter analytics screenshot. Extract: open rate, click rate, total subscribers, new subscribers, unsubscribes, emails sent if visible. Return as JSON with keys: open_rate, click_rate, total_subscribers, new_subscribers, unsubscribes, narrative.`,
    schema: { type: 'object', properties: { open_rate: {type:'number'}, click_rate: {type:'number'}, total_subscribers: {type:'number'}, new_subscribers: {type:'number'}, unsubscribes: {type:'number'}, narrative: {type:'string'} } },
  },
};

// ─── Upload Zone (multi-image per platform) ───────────────────────────────────
function UploadZone({ platform, value, onChange }) {
  const inputRef = useRef(null);
  const cfg = PLATFORM_CONFIGS[platform];
  // value is now an array of { file, previewUrl, uploadedUrl } or null
  const files = value || [];

  const handleFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f => f.type.startsWith('image/'));
    const entries = valid.map(f => ({ file: f, previewUrl: URL.createObjectURL(f), uploadedUrl: null, error: false }));
    onChange([...files, ...entries]);
  };

  const removeFile = (idx) => onChange(files.filter((_, i) => i !== idx));

  const onDrop = (e) => { e.preventDefault(); handleFiles(e.dataTransfer.files); };

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5 text-sm font-semibold text-[#242450]">
        <span>{cfg.icon}</span><span>{cfg.label}</span>
        {files.some(f => f.uploadedUrl) && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 ml-1" />}
        {files.some(f => f.error) && <span className="text-[10px] font-medium text-red-500 ml-1">Read failed</span>}
        {files.length > 0 && <span className="text-[10px] font-medium text-[#8403C5] ml-1">{files.length} image{files.length > 1 ? 's' : ''}</span>}
      </div>

      {/* Thumbnails */}
      {files.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {files.map((f, i) => (
            <div key={i} className="relative w-20 h-16 rounded-lg overflow-hidden border border-gray-200 bg-gray-50 group shrink-0">
              <img src={f.previewUrl} alt="" className="w-full h-full object-cover" />
              <button
                onClick={() => removeFile(i)}
                className="absolute top-0.5 right-0.5 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
          <button
            onClick={() => inputRef.current?.click()}
            className="w-20 h-16 rounded-lg border-2 border-dashed border-gray-200 hover:border-[#8403C5]/50 flex items-center justify-center text-gray-300 hover:text-[#8403C5] transition-colors shrink-0"
          >
            <Upload className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Drop zone (shown when no files yet) */}
      {files.length === 0 && (
        <div
          className="w-full h-40 rounded-xl border-2 border-dashed border-gray-200 hover:border-[#8403C5]/50 hover:bg-purple-50/30 transition-colors cursor-pointer flex flex-col items-center justify-center gap-2 text-center p-3"
          onClick={() => inputRef.current?.click()}
          onDragOver={e => e.preventDefault()}
          onDrop={onDrop}
        >
          <Upload className="w-6 h-6 text-gray-300" />
          <p className="text-[12px] text-gray-400 font-medium leading-tight">{cfg.uploadLabel}</p>
          <p className="text-[11px] text-gray-300">Click to upload or drag and drop</p>
          <p className="text-[10px] text-gray-300">JPG, PNG, WEBP — multiple allowed</p>
        </div>
      )}
      <input ref={inputRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
    </div>
  );
}

// ─── Field with AI badge ──────────────────────────────────────────────────────
function Field({ label, children, aiGenerated, missing }) {
  return (
    <div>
      <div className="flex items-center gap-1.5 mb-1">
        <label className="text-xs text-gray-500">{label}</label>
        {aiGenerated && (
          <span className="flex items-center gap-0.5 text-[10px] font-semibold text-[#8403C5] bg-purple-50 px-1.5 py-0.5 rounded-full">
            <Sparkles className="w-2.5 h-2.5" /> AI
          </span>
        )}
        {missing && <span className="text-[10px] font-medium text-amber-600">⚠ Not found</span>}
      </div>
      {children}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ReportForm({ report, onBack }) {
  const now = new Date();
  const [month,  setMonth]  = useState(report?.month  || MONTHS[now.getMonth()]);
  const [year,   setYear]   = useState(report?.year   || now.getFullYear());
  const [status, setStatus] = useState(report?.status || 'Draft');
  const [activeTab, setActiveTab] = useState('website');
  const [saving,    setSaving]    = useState(false);

  const parseSection = (key) => { try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; } };

  const [website,    setWebsite]    = useState(parseSection('websiteData'));
  const [chrisLI,    setChrisLI]    = useState(parseSection('chrisLinkedInData'));
  const [company,    setCompany]    = useState(parseSection('companyPageData'));
  const [newsletter, setNewsletter] = useState(parseSection('newsletterData'));
  const [prevReport, setPrevReport] = useState(null);

  // AI screenshot state
  const [screenshots, setScreenshots] = useState({ website: null, chrisLI: null, company: null, newsletter: null });
  const [extracting,  setExtracting]  = useState(false);
  const [extractMsg,  setExtractMsg]  = useState('');
  const [extractStep, setExtractStep] = useState(0); // 0-4
  const [aiFields,    setAiFields]    = useState(new Set()); // keys that were AI-populated
  const [aiMissing,   setAiMissing]   = useState(new Set()); // keys that AI couldn't find

  const isDraft = status === 'Draft';
  const hasScreenshots = Object.values(screenshots).some(v => Array.isArray(v) && v.length > 0);
  const uploadedCount  = Object.values(screenshots).filter(v => Array.isArray(v) && v.length > 0).length;

  useEffect(() => {
    base44.entities.MarketingReport.list('-year', 100).then(all => {
      const sorted = all.sort((a, b) => {
        if (b.year !== a.year) return b.year - a.year;
        return MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month);
      });
      const idx = sorted.findIndex(r => r.month === month && r.year === year);
      if (idx !== -1 && idx + 1 < sorted.length) setPrevReport(sorted[idx + 1]);
      else if (sorted.length > 0 && !report) setPrevReport(sorted[0]);
    });
  }, [month, year]);

  const wField = (k, v) => setWebsite(p => ({ ...p, [k]: v }));
  const lField = (k, v) => setChrisLI(p => ({ ...p, [k]: v }));
  const cField = (k, v) => setCompany(p => ({ ...p, [k]: v }));
  const nField = (k, v) => setNewsletter(p => ({ ...p, [k]: v }));

  const setScreenshot = (platform, val) => setScreenshots(p => ({ ...p, [platform]: val }));

  const prevWebsite = () => { try { return JSON.parse(prevReport?.websiteData || '{}'); } catch { return {}; } };
  const prevLI      = () => { try { return JSON.parse(prevReport?.chrisLinkedInData || '{}'); } catch { return {}; } };

  const momSessions = prevWebsite().sessions && website.sessions
    ? (((website.sessions - prevWebsite().sessions) / prevWebsite().sessions) * 100).toFixed(1) + '%' : '—';
  const momLI = prevLI().totalImpressions && chrisLI.totalImpressions
    ? (((chrisLI.totalImpressions - prevLI().totalImpressions) / prevLI().totalImpressions) * 100).toFixed(1) + '%' : '—';

  // ── Convert file to base64 ──────────────────────────────────────────────────
  const fileToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result;
      const base64 = dataUrl.split(',')[1];
      const media_type = file.type || 'image/jpeg';
      resolve({ base64, media_type });
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

  // ── AI Extract ──────────────────────────────────────────────────────────────
  const extractAll = async () => {
    setExtracting(true);
    setExtractMsg('🔍 Reading your screenshots... this takes about 15 seconds');
    setExtractStep(0);

    const newAiFields = new Set();
    const newAiMissing = new Set();
    let successCount = 0;
    const resultSummary = { website: null, chrisLI: null, company: null, newsletter: null };

    const processPlatform = async (key, currentFiles, applyData) => {
      if (!Array.isArray(currentFiles) || currentFiles.length === 0) return;
      try {
        // Convert all images to base64
        const images = await Promise.all(currentFiles.map(f => fileToBase64(f.file)));

        // Call backend function with base64 images
        const res = await base44.functions.invoke('extractMarketingScreenshot', { platform: key, images });
        const data = res.data;

        if (!data.success || !data.extracted) {
          throw new Error(data.error || 'Extraction failed');
        }

        applyData(data.extracted, data.narrative || '', newAiFields, newAiMissing);
        successCount++;
        resultSummary[key] = true;
        setExtractStep(s => s + 1);
      } catch (err) {
        resultSummary[key] = false;
        setScreenshots(p => ({
          ...p,
          [key]: currentFiles.map(f => ({ ...f, error: true }))
        }));
        setExtractStep(s => s + 1);
      }
    };

    await Promise.all([
      processPlatform('website', screenshots.website || [], (d, narrative, af, am) => {
        const map = {
          activeUsers: d.active_users, sessions: d.sessions, newUsers: d.new_users,
          engagedSessions: d.engaged_sessions_pct,
          avgEngagementTime: d.avg_engagement_time_seconds != null ? `${d.avg_engagement_time_seconds}s` : null,
          topTrafficSource: d.top_traffic_source, organicSearchUsers: d.organic_search_sessions,
          gscImpressions: d.gsc_impressions, gscClicks: d.gsc_clicks,
          gscAvgPosition: d.gsc_avg_position,
          notes: narrative || null,
        };
        setWebsite(p => {
          const updated = { ...p };
          Object.entries(map).forEach(([k, v]) => {
            if (v != null && v !== '') { updated[k] = v; af.add('w_' + k); }
            else am.add('w_' + k);
          });
          return updated;
        });
      }),
      processPlatform('chrisLI', screenshots.chrisLI || [], (d, narrative, af, am) => {
        const map = {
          totalImpressions: d.impressions, uniqueMembersReached: d.unique_reach,
          reactions: d.reactions, comments: d.comments, reposts: d.reposts,
          newFollowers: d.new_connections,
          notes: narrative || null,
        };
        setChrisLI(p => {
          const updated = { ...p };
          Object.entries(map).forEach(([k, v]) => {
            if (v != null && v !== '') { updated[k] = v; af.add('li_' + k); }
            else am.add('li_' + k);
          });
          return updated;
        });
      }),
      processPlatform('company', screenshots.company || [], (d, narrative, af, am) => {
        const map = {
          totalImpressions: d.page_impressions, newFollowers: d.new_followers,
          reactions: d.reactions, clicks: d.clicks,
          notes: narrative || null,
        };
        setCompany(p => {
          const updated = { ...p };
          Object.entries(map).forEach(([k, v]) => {
            if (v != null && v !== '') { updated[k] = v; af.add('cp_' + k); }
            else am.add('cp_' + k);
          });
          return updated;
        });
      }),
      processPlatform('newsletter', screenshots.newsletter || [], (d, narrative, af, am) => {
        const map = {
          openRate: d.open_rate, clickRate: d.click_rate, listSize: d.total_subscribers,
          newSubscribers: d.new_subscribers, unsubscribes: d.unsubscribes,
          notes: narrative || null,
        };
        setNewsletter(p => {
          const updated = { ...p };
          Object.entries(map).forEach(([k, v]) => {
            if (v != null && v !== '') { updated[k] = v; af.add('nl_' + k); }
            else am.add('nl_' + k);
          });
          return updated;
        });
      }),
    ]);

    setAiFields(newAiFields);
    setAiMissing(newAiMissing);
    setExtracting(false);

    const labels = { website: 'GA4', chrisLI: 'Chris LinkedIn', company: 'Company Page', newsletter: 'Newsletter' };
    const parts = Object.entries(resultSummary)
      .filter(([k]) => screenshots[k]?.length > 0)
      .map(([k, ok]) => `${labels[k]} ${ok ? '✓' : '✗'}`);
    setExtractMsg(`✨ Extracted from screenshots: ${parts.join(', ')}. Please review and correct anything that looks wrong before saving.`);
    setActiveTab('website');
  };

  // ── Save ────────────────────────────────────────────────────────────────────
  const save = async (newStatus) => {
    setSaving(true);
    const s = newStatus || status;
    const payload = {
      month, year: Number(year), status: s,
      websiteData:      JSON.stringify(website),
      chrisLinkedInData: JSON.stringify(chrisLI),
      companyPageData:   JSON.stringify(company),
      newsletterData:    JSON.stringify(newsletter),
    };
    if (report?.id) await base44.entities.MarketingReport.update(report.id, payload);
    else await base44.entities.MarketingReport.create(payload);
    setStatus(s);
    setSaving(false);
    if (newStatus) onBack();
  };

  const ai = (prefix, key) => aiFields.has(prefix + key);
  const missing = (prefix, key) => aiMissing.has(prefix + key) && aiFields.size > 0;

  const fieldCls = (prefix, key) => missing(prefix, key) ? missingCls : inputCls;
  const fieldPlaceholder = (prefix, key, normal) =>
    missing(prefix, key) ? 'Not found in screenshot — enter manually' : normal;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F6FA] dark:bg-[#0F0F1A] p-6">
      {/* ── Header ── */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">{report ? 'Edit Report' : 'New Report'}</h2>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${status === 'Ready' ? 'bg-blue-50 text-blue-700 border-blue-200' : status === 'Sent' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-yellow-50 text-yellow-700 border-yellow-200'}`}>{status}</span>
        </div>
        <div className="flex gap-2">
          <button onClick={() => save()} disabled={saving} className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors bg-white">
            💾 Save Draft
          </button>
          <button onClick={() => save('Ready')} disabled={saving} className="px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
            Mark Ready
          </button>
        </div>
      </div>

      {/* ── Month / Year ── */}
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl p-4 border border-gray-200 dark:border-gray-700 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Month:</label>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#8403C5] dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Year:</label>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#8403C5] dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600" value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* ════════════════════════════════════════════════════════
          AI IMPORT SECTION — only in Draft mode
      ════════════════════════════════════════════════════════ */}
      {isDraft && (
        <div className="bg-gradient-to-br from-purple-50 to-white dark:from-[#1E1020] dark:to-[#1E1E2E] rounded-xl border border-[#8403C5]/20 p-5 mb-4 shadow-sm">
          <div className="flex items-start gap-2 mb-1">
            <Sparkles className="w-5 h-5 text-[#8403C5] shrink-0 mt-0.5" />
            <div>
              <h3 className="text-[15px] font-bold text-[#242450] dark:text-white">✨ AI Import from Screenshots</h3>
              <p className="text-[13px] text-gray-500 dark:text-gray-400 mt-0.5">
                Upload screenshots from each platform and AI will extract the numbers and write the summaries for you.
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-4">
            {Object.keys(PLATFORM_CONFIGS).map(key => (
              <UploadZone key={key} platform={key} value={screenshots[key]} onChange={v => setScreenshot(key, v)} />
            ))}
          </div>

          {/* Extract button */}
          <div className="mt-4 flex flex-col items-start gap-3">
            <button
              onClick={extractAll}
              disabled={!hasScreenshots || extracting}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] hover:bg-[#6d02a3] disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
            >
              {extracting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Extracting {extractStep}/{uploadedCount} screenshots…</>
                : <><Sparkles className="w-4 h-4" /> Extract data and generate report</>
              }
            </button>

            {extracting && (
              <div className="w-full">
                <div className="flex items-center gap-2 text-sm text-[#8403C5] mb-1.5">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  🔍 Reading your screenshots... this takes about 15 seconds
                </div>
                <div className="h-1.5 bg-purple-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#8403C5] rounded-full transition-all duration-700"
                    style={{ width: `${uploadedCount > 0 ? (extractStep / uploadedCount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            )}

            {extractMsg && !extracting && (
              <div className={`flex items-start gap-2 text-sm px-4 py-3 rounded-xl w-full ${
                extractMsg.includes('extracted')
                  ? 'bg-green-50 border border-green-200 text-green-800'
                  : 'bg-red-50 border border-red-200 text-red-700'
              }`}>
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                {extractMsg}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Section tabs ── */}
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 mb-4">
        <div className="flex border-b border-gray-100 dark:border-gray-700">
          {SECTION_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {/* ── WEBSITE ── */}
          {activeTab === 'website' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Active Users" aiGenerated={ai('w_','activeUsers')} missing={missing('w_','activeUsers')}>
                  <input type="number" className={fieldCls('w_','activeUsers')} placeholder={fieldPlaceholder('w_','activeUsers','e.g. 2000')} value={website.activeUsers || ''} onChange={e => wField('activeUsers', e.target.value)} />
                </Field>
                <Field label="New Users" aiGenerated={ai('w_','newUsers')} missing={missing('w_','newUsers')}>
                  <input type="number" className={fieldCls('w_','newUsers')} placeholder={fieldPlaceholder('w_','newUsers','e.g. 1100')} value={website.newUsers || ''} onChange={e => wField('newUsers', e.target.value)} />
                </Field>
                <Field label="Sessions" aiGenerated={ai('w_','sessions')} missing={missing('w_','sessions')}>
                  <input type="number" className={fieldCls('w_','sessions')} placeholder={fieldPlaceholder('w_','sessions','e.g. 2230')} value={website.sessions || ''} onChange={e => wField('sessions', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Engaged Sessions (%)" aiGenerated={ai('w_','engagedSessions')} missing={missing('w_','engagedSessions')}>
                  <input type="number" className={fieldCls('w_','engagedSessions')} placeholder={fieldPlaceholder('w_','engagedSessions','e.g. 31.4')} value={website.engagedSessions || ''} onChange={e => wField('engagedSessions', e.target.value)} />
                </Field>
                <Field label="Avg Engagement Time" aiGenerated={ai('w_','avgEngagementTime')} missing={missing('w_','avgEngagementTime')}>
                  <input type="text" className={fieldCls('w_','avgEngagementTime')} placeholder={fieldPlaceholder('w_','avgEngagementTime','e.g. 2m 34s')} value={website.avgEngagementTime || ''} onChange={e => wField('avgEngagementTime', e.target.value)} />
                </Field>
                <Field label="Pages Per User" aiGenerated={ai('w_','pagesPerUser')} missing={missing('w_','pagesPerUser')}>
                  <input type="number" step="0.1" className={fieldCls('w_','pagesPerUser')} placeholder={fieldPlaceholder('w_','pagesPerUser','e.g. 2.8')} value={website.pagesPerUser || ''} onChange={e => wField('pagesPerUser', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Top Traffic Source" aiGenerated={ai('w_','topTrafficSource')} missing={missing('w_','topTrafficSource')}>
                  <select className={fieldCls('w_','topTrafficSource')} value={website.topTrafficSource || ''} onChange={e => wField('topTrafficSource', e.target.value)}>
                    <option value="">Select source</option>
                    {TRAFFIC_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Organic Search Users" aiGenerated={ai('w_','organicSearchUsers')} missing={missing('w_','organicSearchUsers')}>
                  <input type="number" className={fieldCls('w_','organicSearchUsers')} value={website.organicSearchUsers || ''} onChange={e => wField('organicSearchUsers', e.target.value)} />
                </Field>
                <Field label="MoM Sessions Change">
                  <input className={disabledCls} value={momSessions} readOnly />
                </Field>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Google Search Console</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Field label="Total Impressions" aiGenerated={ai('w_','gscImpressions')} missing={missing('w_','gscImpressions')}>
                    <input type="number" className={fieldCls('w_','gscImpressions')} placeholder={fieldPlaceholder('w_','gscImpressions','e.g. 1370')} value={website.gscImpressions || ''} onChange={e => wField('gscImpressions', e.target.value)} />
                  </Field>
                  <Field label="Total Clicks" aiGenerated={ai('w_','gscClicks')} missing={missing('w_','gscClicks')}>
                    <input type="number" className={fieldCls('w_','gscClicks')} placeholder={fieldPlaceholder('w_','gscClicks','e.g. 159')} value={website.gscClicks || ''} onChange={e => wField('gscClicks', e.target.value)} />
                  </Field>
                  <Field label="Avg Position" aiGenerated={ai('w_','gscAvgPosition')} missing={missing('w_','gscAvgPosition')}>
                    <input type="number" step="0.1" className={fieldCls('w_','gscAvgPosition')} placeholder={fieldPlaceholder('w_','gscAvgPosition','e.g. 6.0')} value={website.gscAvgPosition || ''} onChange={e => wField('gscAvgPosition', e.target.value)} />
                  </Field>
                </div>
                <Field label="Notes / Narrative" aiGenerated={ai('w_','notes')} missing={missing('w_','notes')}>
                  <textarea rows={4} className={fieldCls('w_','notes')} placeholder="Key takeaways for this month's website performance..." value={website.notes || ''} onChange={e => wField('notes', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {/* ── CHRIS LINKEDIN ── */}
          {activeTab === 'chrisLinkedIn' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Total Impressions" aiGenerated={ai('li_','totalImpressions')} missing={missing('li_','totalImpressions')}>
                  <input type="number" className={fieldCls('li_','totalImpressions')} placeholder={fieldPlaceholder('li_','totalImpressions','e.g. 13307')} value={chrisLI.totalImpressions || ''} onChange={e => lField('totalImpressions', e.target.value)} />
                </Field>
                <Field label="Unique Members Reached" aiGenerated={ai('li_','uniqueMembersReached')} missing={missing('li_','uniqueMembersReached')}>
                  <input type="number" className={fieldCls('li_','uniqueMembersReached')} placeholder={fieldPlaceholder('li_','uniqueMembersReached','e.g. 6221')} value={chrisLI.uniqueMembersReached || ''} onChange={e => lField('uniqueMembersReached', e.target.value)} />
                </Field>
                <Field label="New Followers / Connections" aiGenerated={ai('li_','newFollowers')} missing={missing('li_','newFollowers')}>
                  <input type="number" className={fieldCls('li_','newFollowers')} value={chrisLI.newFollowers || ''} onChange={e => lField('newFollowers', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Reactions" aiGenerated={ai('li_','reactions')} missing={missing('li_','reactions')}>
                  <input type="number" className={fieldCls('li_','reactions')} value={chrisLI.reactions || ''} onChange={e => lField('reactions', e.target.value)} />
                </Field>
                <Field label="Comments" aiGenerated={ai('li_','comments')} missing={missing('li_','comments')}>
                  <input type="number" className={fieldCls('li_','comments')} value={chrisLI.comments || ''} onChange={e => lField('comments', e.target.value)} />
                </Field>
                <Field label="Reposts" aiGenerated={ai('li_','reposts')} missing={missing('li_','reposts')}>
                  <input type="number" className={fieldCls('li_','reposts')} value={chrisLI.reposts || ''} onChange={e => lField('reposts', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Top Post Title">
                  <input type="text" className={inputCls} placeholder="e.g. Our journey building..." value={chrisLI.topPostTitle || ''} onChange={e => lField('topPostTitle', e.target.value)} />
                </Field>
                <Field label="Top Post Impressions">
                  <input type="number" className={inputCls} value={chrisLI.topPostImpressions || ''} onChange={e => lField('topPostImpressions', e.target.value)} />
                </Field>
              </div>
              <Field label="MoM Impressions Change">
                <input className={disabledCls} value={momLI} readOnly />
              </Field>
              <Field label="Notes / Narrative" aiGenerated={ai('li_','notes')} missing={missing('li_','notes')}>
                <textarea rows={4} className={fieldCls('li_','notes')} placeholder="Key highlights from Chris's LinkedIn activity..." value={chrisLI.notes || ''} onChange={e => lField('notes', e.target.value)} />
              </Field>
            </div>
          )}

          {/* ── COMPANY PAGE ── */}
          {activeTab === 'companyPage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Total Impressions" aiGenerated={ai('cp_','totalImpressions')} missing={missing('cp_','totalImpressions')}>
                  <input type="number" className={fieldCls('cp_','totalImpressions')} value={company.totalImpressions || ''} onChange={e => cField('totalImpressions', e.target.value)} />
                </Field>
                <Field label="Unique Visitors" aiGenerated={ai('cp_','uniqueVisitors')} missing={missing('cp_','uniqueVisitors')}>
                  <input type="number" className={fieldCls('cp_','uniqueVisitors')} value={company.uniqueVisitors || ''} onChange={e => cField('uniqueVisitors', e.target.value)} />
                </Field>
                <Field label="New Followers" aiGenerated={ai('cp_','newFollowers')} missing={missing('cp_','newFollowers')}>
                  <input type="number" className={fieldCls('cp_','newFollowers')} placeholder={fieldPlaceholder('cp_','newFollowers','e.g. 12')} value={company.newFollowers || ''} onChange={e => cField('newFollowers', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Reactions" aiGenerated={ai('cp_','reactions')} missing={missing('cp_','reactions')}>
                  <input type="number" className={fieldCls('cp_','reactions')} value={company.reactions || ''} onChange={e => cField('reactions', e.target.value)} />
                </Field>
                <Field label="Clicks" aiGenerated={ai('cp_','clicks')} missing={missing('cp_','clicks')}>
                  <input type="number" className={fieldCls('cp_','clicks')} value={company.clicks || ''} onChange={e => cField('clicks', e.target.value)} />
                </Field>
                <Field label="Posts Published">
                  <input type="number" className={inputCls} value={company.postsPublished || ''} onChange={e => cField('postsPublished', e.target.value)} />
                </Field>
              </div>
              <Field label="Notes / Narrative" aiGenerated={ai('cp_','notes')} missing={missing('cp_','notes')}>
                <textarea rows={4} className={fieldCls('cp_','notes')} placeholder="Summary of company page performance..." value={company.notes || ''} onChange={e => cField('notes', e.target.value)} />
              </Field>
            </div>
          )}

          {/* ── NEWSLETTER ── */}
          {activeTab === 'newsletter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Send Date">
                  <input type="date" className={inputCls} value={newsletter.sendDate || ''} onChange={e => nField('sendDate', e.target.value)} />
                </Field>
                <Field label="Subject Line">
                  <input type="text" className={inputCls} placeholder="e.g. March Product Updates" value={newsletter.subjectLine || ''} onChange={e => nField('subjectLine', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Total Subscribers" aiGenerated={ai('nl_','listSize')} missing={missing('nl_','listSize')}>
                  <input type="number" className={fieldCls('nl_','listSize')} placeholder={fieldPlaceholder('nl_','listSize','e.g. 1240')} value={newsletter.listSize || ''} onChange={e => nField('listSize', e.target.value)} />
                </Field>
                <Field label="Open Rate (%)" aiGenerated={ai('nl_','openRate')} missing={missing('nl_','openRate')}>
                  <input type="number" step="0.1" className={fieldCls('nl_','openRate')} placeholder={fieldPlaceholder('nl_','openRate','e.g. 42.5')} value={newsletter.openRate || ''} onChange={e => nField('openRate', e.target.value)} />
                </Field>
                <Field label="Click Rate (%)" aiGenerated={ai('nl_','clickRate')} missing={missing('nl_','clickRate')}>
                  <input type="number" step="0.1" className={fieldCls('nl_','clickRate')} placeholder={fieldPlaceholder('nl_','clickRate','e.g. 3.2')} value={newsletter.clickRate || ''} onChange={e => nField('clickRate', e.target.value)} />
                </Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unsubscribes" aiGenerated={ai('nl_','unsubscribes')} missing={missing('nl_','unsubscribes')}>
                  <input type="number" className={fieldCls('nl_','unsubscribes')} value={newsletter.unsubscribes || ''} onChange={e => nField('unsubscribes', e.target.value)} />
                </Field>
                <Field label="New Subscribers" aiGenerated={ai('nl_','newSubscribers')} missing={missing('nl_','newSubscribers')}>
                  <input type="number" className={fieldCls('nl_','newSubscribers')} value={newsletter.newSubscribers || ''} onChange={e => nField('newSubscribers', e.target.value)} />
                </Field>
              </div>
              <Field label="Notes / Narrative (Beehiiv)" aiGenerated={ai('nl_','notes')} missing={missing('nl_','notes')}>
                <textarea rows={4} className={fieldCls('nl_','notes')} placeholder="Newsletter performance notes..." value={newsletter.notes || ''} onChange={e => nField('notes', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}