import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Globe, BarChart2, Building2, Mail } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const TRAFFIC_SOURCES = ['Organic Search','Direct','Referral','Social','Email','Paid Search','Other'];
const YEARS = [2024, 2025, 2026, 2027];
const SECTION_TABS = [
  { id: 'website', label: 'Website', icon: <Globe className="w-4 h-4" /> },
  { id: 'chrisLinkedIn', label: 'Chris LinkedIn', icon: <BarChart2 className="w-4 h-4" /> },
  { id: 'companyPage', label: 'Company Page', icon: <Building2 className="w-4 h-4" /> },
  { id: 'newsletter', label: 'Newsletter', icon: <Mail className="w-4 h-4" /> },
];

function Field({ label, children, half }) {
  return (
    <div className={half ? '' : ''}>
      <label className="block text-xs text-gray-500 mb-1">{label}</label>
      {children}
    </div>
  );
}

const inputCls = "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] bg-white";
const disabledCls = "w-full border border-gray-100 rounded-lg px-3 py-2 text-sm bg-gray-100 text-gray-400";

export default function ReportForm({ report, onBack }) {
  const now = new Date();
  const [month, setMonth] = useState(report?.month || MONTHS[now.getMonth()]);
  const [year, setYear] = useState(report?.year || now.getFullYear());
  const [status, setStatus] = useState(report?.status || 'Draft');
  const [activeTab, setActiveTab] = useState('website');
  const [saving, setSaving] = useState(false);

  const parseSection = (key) => {
    try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; }
  };

  const [website, setWebsite] = useState(parseSection('websiteData'));
  const [chrisLI, setChrisLI] = useState(parseSection('chrisLinkedInData'));
  const [company, setCompany] = useState(parseSection('companyPageData'));
  const [newsletter, setNewsletter] = useState(parseSection('newsletterData'));
  const [prevReport, setPrevReport] = useState(null);

  useEffect(() => {
    // Load previous report for MoM calc
    base44.entities.MarketingReport.list('-year,-month', 100).then(all => {
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

  const prevWebsite = () => { try { return JSON.parse(prevReport?.websiteData || '{}'); } catch { return {}; } };
  const prevLI = () => { try { return JSON.parse(prevReport?.chrisLinkedInData || '{}'); } catch { return {}; } };

  const momSessions = prevWebsite().sessions && website.sessions
    ? (((website.sessions - prevWebsite().sessions) / prevWebsite().sessions) * 100).toFixed(1) + '%'
    : '—';
  const momLI = prevLI().totalImpressions && chrisLI.totalImpressions
    ? (((chrisLI.totalImpressions - prevLI().totalImpressions) / prevLI().totalImpressions) * 100).toFixed(1) + '%'
    : '—';

  const save = async (newStatus) => {
    setSaving(true);
    const s = newStatus || status;
    const payload = {
      month, year: Number(year), status: s,
      websiteData: JSON.stringify(website),
      chrisLinkedInData: JSON.stringify(chrisLI),
      companyPageData: JSON.stringify(company),
      newsletterData: JSON.stringify(newsletter),
    };
    if (report?.id) await base44.entities.MarketingReport.update(report.id, payload);
    else await base44.entities.MarketingReport.create(payload);
    setStatus(s);
    setSaving(false);
    if (newStatus) onBack();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <h2 className="text-xl font-bold text-gray-900">{report ? 'Edit Report' : 'New Report'}</h2>
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

      {/* Month/Year */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 mb-4 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Month:</label>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#8403C5]" value={month} onChange={e => setMonth(e.target.value)}>
            {MONTHS.map(m => <option key={m}>{m}</option>)}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Year:</label>
          <select className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-[#8403C5]" value={year} onChange={e => setYear(e.target.value)}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
      </div>

      {/* Section tabs */}
      <div className="bg-white rounded-xl border border-gray-200 mb-4">
        <div className="flex border-b border-gray-100">
          {SECTION_TABS.map(t => (
            <button key={t.id} onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium border-b-2 transition-colors ${activeTab === t.id ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t.icon}{t.label}
            </button>
          ))}
        </div>

        <div className="p-5">
          {activeTab === 'website' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Active Users"><input type="number" className={inputCls} value={website.activeUsers || ''} onChange={e => wField('activeUsers', e.target.value)} /></Field>
                <Field label="New Users"><input type="number" className={inputCls} value={website.newUsers || ''} onChange={e => wField('newUsers', e.target.value)} /></Field>
                <Field label="Sessions"><input type="number" className={inputCls} value={website.sessions || ''} onChange={e => wField('sessions', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Engaged Sessions (%)"><input type="number" className={inputCls} value={website.engagedSessions || ''} onChange={e => wField('engagedSessions', e.target.value)} /></Field>
                <Field label="Avg Engagement Time (sec)"><input type="number" className={inputCls} value={website.avgEngagementTime || ''} onChange={e => wField('avgEngagementTime', e.target.value)} /></Field>
                <Field label="Pages Per User"><input type="number" className={inputCls} value={website.pagesPerUser || ''} onChange={e => wField('pagesPerUser', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="Top Traffic Source">
                  <select className={inputCls} value={website.topTrafficSource || ''} onChange={e => wField('topTrafficSource', e.target.value)}>
                    <option value="">Select source</option>
                    {TRAFFIC_SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </Field>
                <Field label="Organic Search Users"><input type="number" className={inputCls} value={website.organicSearchUsers || ''} onChange={e => wField('organicSearchUsers', e.target.value)} /></Field>
                <Field label="MoM Sessions Change"><input className={disabledCls} value={momSessions} readOnly /></Field>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-3">Google Search Console</p>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <Field label="Total Impressions"><input type="number" className={inputCls} value={website.gscImpressions || ''} onChange={e => wField('gscImpressions', e.target.value)} /></Field>
                  <Field label="Total Clicks"><input type="number" className={inputCls} value={website.gscClicks || ''} onChange={e => wField('gscClicks', e.target.value)} /></Field>
                  <Field label="Avg Position"><input type="number" step="0.1" className={inputCls} value={website.gscAvgPosition || ''} onChange={e => wField('gscAvgPosition', e.target.value)} /></Field>
                </div>
                <Field label="Notes / Narrative">
                  <textarea rows={4} className={inputCls} placeholder="Key takeaways for this month's website performance..." value={website.notes || ''} onChange={e => wField('notes', e.target.value)} />
                </Field>
              </div>
            </div>
          )}

          {activeTab === 'chrisLinkedIn' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Total Impressions"><input type="number" className={inputCls} value={chrisLI.totalImpressions || ''} onChange={e => lField('totalImpressions', e.target.value)} /></Field>
                <Field label="Unique Members Reached"><input type="number" className={inputCls} value={chrisLI.uniqueMembersReached || ''} onChange={e => lField('uniqueMembersReached', e.target.value)} /></Field>
                <Field label="New Followers"><input type="number" className={inputCls} value={chrisLI.newFollowers || ''} onChange={e => lField('newFollowers', e.target.value)} /></Field>
              </div>
              <Field label="Engagement (Reactions + Comments + Reposts)">
                <input type="number" className={inputCls} placeholder="Total engagement" value={chrisLI.engagement || ''} onChange={e => lField('engagement', e.target.value)} />
              </Field>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Top Post Title"><input type="text" className={inputCls} placeholder="e.g. Our journey building..." value={chrisLI.topPostTitle || ''} onChange={e => lField('topPostTitle', e.target.value)} /></Field>
                <Field label="Top Post Impressions"><input type="number" className={inputCls} value={chrisLI.topPostImpressions || ''} onChange={e => lField('topPostImpressions', e.target.value)} /></Field>
              </div>
              <Field label="MoM Impressions Change"><input className={disabledCls} value={momLI} readOnly /></Field>
              <Field label="Notes / Narrative">
                <textarea rows={4} className={inputCls} placeholder="Key highlights from Chris's LinkedIn activity..." value={chrisLI.notes || ''} onChange={e => lField('notes', e.target.value)} />
              </Field>
            </div>
          )}

          {activeTab === 'companyPage' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Field label="Total Impressions"><input type="number" className={inputCls} value={company.totalImpressions || ''} onChange={e => cField('totalImpressions', e.target.value)} /></Field>
                <Field label="Unique Visitors"><input type="number" className={inputCls} value={company.uniqueVisitors || ''} onChange={e => cField('uniqueVisitors', e.target.value)} /></Field>
                <Field label="New Followers"><input type="number" className={inputCls} value={company.newFollowers || ''} onChange={e => cField('newFollowers', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Posts Published"><input type="number" className={inputCls} value={company.postsPublished || ''} onChange={e => cField('postsPublished', e.target.value)} /></Field>
                <Field label="Engagement (Reactions + Comments + Reposts)">
                  <input type="number" className={inputCls} placeholder="Total engagement" value={company.engagement || ''} onChange={e => cField('engagement', e.target.value)} />
                </Field>
              </div>
              <Field label="Notes / Narrative">
                <textarea rows={4} className={inputCls} placeholder="Summary of company page performance and content themes..." value={company.notes || ''} onChange={e => cField('notes', e.target.value)} />
              </Field>
            </div>
          )}

          {activeTab === 'newsletter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field label="Send Date"><input type="date" className={inputCls} value={newsletter.sendDate || ''} onChange={e => nField('sendDate', e.target.value)} /></Field>
                <Field label="Subject Line"><input type="text" className={inputCls} placeholder="e.g. March Product Updates" value={newsletter.subjectLine || ''} onChange={e => nField('subjectLine', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <Field label="List Size"><input type="number" className={inputCls} value={newsletter.listSize || ''} onChange={e => nField('listSize', e.target.value)} /></Field>
                <Field label="Open Rate (%)"><input type="number" step="0.1" className={inputCls} value={newsletter.openRate || ''} onChange={e => nField('openRate', e.target.value)} /></Field>
                <Field label="Click Rate (%)"><input type="number" step="0.1" className={inputCls} value={newsletter.clickRate || ''} onChange={e => nField('clickRate', e.target.value)} /></Field>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Field label="Unsubscribes"><input type="number" className={inputCls} value={newsletter.unsubscribes || ''} onChange={e => nField('unsubscribes', e.target.value)} /></Field>
              </div>
              <Field label="Notes / Narrative (Beehiiv)">
                <textarea rows={4} className={inputCls} placeholder="Newsletter performance notes, top-clicked links, subscriber trends..." value={newsletter.notes || ''} onChange={e => nField('notes', e.target.value)} />
              </Field>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}