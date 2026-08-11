import React, { useState } from 'react';
import { ArrowLeft, Send, Download, Globe, BarChart2, Building2, Mail, Pencil, FileText } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateReportPDF } from './reportPdfUtils';

// ─── Helpers ───────────────────────────────────────────────────────────────────
function parse(report, key) {
  try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; }
}

function fmt(n, suffix = '') {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  const num = Number(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M' + suffix;
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K' + suffix;
  return num.toLocaleString() + suffix;
}

function momCalc(curr, prev) {
  const c = parseFloat(curr), p = parseFloat(prev);
  if (!p || isNaN(c) || isNaN(p)) return null;
  const pct = ((c - p) / Math.abs(p)) * 100;
  return { pct: Math.abs(pct).toFixed(1), up: c >= p };
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function MoMTag({ curr, prev }) {
  const m = momCalc(curr, prev);
  if (!m) return null;
  return (
    <span className={`text-[11px] font-semibold ${m.up ? 'text-[#15803D]' : 'text-[#B91C1C]'}`}>
      {m.up ? '↑' : '↓'} {m.pct}% vs prev
    </span>
  );
}

function StatChip({ label, value, curr, prev }) {
  return (
    <div className="bg-[#F9FAFB] rounded-xl p-4 flex flex-col gap-1 min-w-0">
      <p className="text-[28px] font-bold text-[#242450] leading-none truncate">{value}</p>
      <p className="text-[12px] text-[#6B7280]">{label}</p>
      <MoMTag curr={curr} prev={prev} />
    </div>
  );
}

function Narrative({ text }) {
  if (!text) return null;
  return (
    <div className="mt-4 p-4 bg-[#F9FAFB] rounded-lg border-l-[3px] border-[#8403C5]">
      <p className="text-[14px] text-[#374151] leading-relaxed whitespace-pre-wrap">{text}</p>
    </div>
  );
}

function SectionCard({ icon, title, children }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-5">
        <span className="text-xl">{icon}</span>
        <h3 className="text-[18px] font-bold text-[#242450]">{title}</h3>
      </div>
      {children}
    </div>
  );
}

function SubDivider({ label }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-gray-100" />
      <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-widest">{label}</span>
      <div className="flex-1 h-px bg-gray-100" />
    </div>
  );
}

function MetaChip({ label, value }) {
  if (!value) return null;
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{label}</span>
      <span className="text-[13px] font-semibold text-[#242450]">{value}</span>
    </div>
  );
}

function NewsletterBar({ label, value, benchmarkLabel, benchmarkValue, isGood }) {
  const pct = Math.min(100, Math.max(0, parseFloat(value) || 0));
  const benchPct = Math.min(100, benchmarkValue);
  return (
    <div className="mb-3">
      <div className="flex items-center justify-between mb-1">
        <span className="text-[12px] text-[#6B7280]">{label}</span>
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isGood === true ? 'bg-green-50 text-green-700' : isGood === false ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700'}`}>
          {isGood === true ? '✓ Above average' : isGood === false ? '↓ Below average' : '~ Average'}
        </span>
      </div>
      <div className="relative h-2.5 bg-gray-100 rounded-full overflow-visible">
        {/* Benchmark line */}
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-gray-400 rounded z-10" style={{ left: `${benchPct}%` }} title={benchmarkLabel} />
        {/* Fill */}
        <div className="h-full rounded-full bg-[#8403C5] transition-all" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[10px] text-gray-400">0%</span>
        <span className="text-[10px] text-gray-400">{benchmarkLabel} benchmark: {benchmarkValue}%</span>
        <span className="text-[10px] text-gray-400">100%</span>
      </div>
    </div>
  );
}

const STATUS_STYLES = {
  Draft: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  Ready: 'bg-blue-50 text-blue-700 border-blue-200',
  Sent: 'bg-green-50 text-green-700 border-green-200',
};

// ─── Main component ────────────────────────────────────────────────────────────
export default function ReportView({ report, prevReport, onBack, onEdit, onSent }) {
  const [sending, setSending] = useState(false);

  const w  = parse(report, 'websiteData');
  const li = parse(report, 'chrisLinkedInData');
  const cp = parse(report, 'companyPageData');
  const nl = parse(report, 'newsletterData');

  const pw  = parse(prevReport, 'websiteData');
  const pli = parse(prevReport, 'chrisLinkedInData');
  const pcp = parse(prevReport, 'companyPageData');
  const pnl = parse(prevReport, 'newsletterData');

  const hasNl = nl.openRate || nl.clickRate || nl.listSize || nl.unsubscribes || nl.sendDate || nl.subjectLine;
  const extra = (() => { try { return JSON.parse(report?.additionalMetrics || '[]'); } catch { return []; } })();

  // Calculated metrics
  const gscCtr = w.gscImpressions && w.gscClicks
    ? ((parseFloat(w.gscClicks) / parseFloat(w.gscImpressions)) * 100).toFixed(2) + '%'
    : null;
  const gscPos = parseFloat(w.gscAvgPosition);
  const gscPage = !isNaN(gscPos) ? (gscPos <= 10 ? 'Page 1' : gscPos <= 20 ? 'Page 2' : 'Page 3+') : null;

  const liReactions = parseFloat(li.reactions) || 0;
  const liComments  = parseFloat(li.comments) || 0;
  const liReposts   = parseFloat(li.reposts) || 0;
  const liImpressions = parseFloat(li.totalImpressions) || 0;
  const liEngRate = liImpressions > 0
    ? (((liReactions + liComments + liReposts) / liImpressions) * 100).toFixed(2) + '%'
    : null;

  const cpReactions = parseFloat(cp.reactions) || 0;
  const cpClicks    = parseFloat(cp.clicks) || 0;
  const cpImpressions = parseFloat(cp.totalImpressions) || 0;
  const cpEngRate = cpImpressions > 0
    ? (((cpReactions + cpClicks) / cpImpressions) * 100).toFixed(2) + '%'
    : null;

  const openRate  = parseFloat(nl.openRate) || 0;
  const clickRate = parseFloat(nl.clickRate) || 0;
  const openBenchmark  = openRate > 40 ? true : openRate >= 30 ? null : false;
  const clickBenchmark = clickRate > 3  ? true : clickRate >= 1 ? null : false;

  const handleSend = async () => {
    setSending(true);
    await base44.integrations.Core.SendEmail({
      to: 'chris@eventwise.com',
      subject: `Marketing Report — ${report.month} ${report.year}`,
      body: `Hi Chris,\n\nThe ${report.month} ${report.year} marketing report is ready for your review.\n\nKey metrics:\n- Website Sessions: ${w.sessions || '—'}\n- Chris LI Impressions: ${li.totalImpressions || '—'}\n- Company Impressions: ${cp.totalImpressions || '—'}\n- Newsletter Open Rate: ${nl.openRate ? nl.openRate + '%' : '—'}\n\nBest,\nElena`,
    });
    await base44.entities.MarketingReport.update(report.id, { status: 'Sent', sentAt: new Date().toISOString() });
    setSending(false);
    onSent?.();
    onBack();
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F5F6FA] dark:bg-[#0F0F1A] p-6">
      <div className="max-w-5xl mx-auto">

        {/* ── Header ── */}
        <div className="flex items-start justify-between mb-2">
          <div className="flex items-center gap-3">
            <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 transition-colors">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
            <h1 className="text-2xl font-bold text-[#242450] dark:text-white">{report.month} {report.year} Report</h1>
          </div>
          <div className="flex items-center gap-2">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[report.status] || STATUS_STYLES.Draft}`}>
              {report.status || 'Draft'}
            </span>
            <button onClick={() => generateReportPDF(report, prevReport)}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white dark:bg-[#1E1E2E] dark:border-gray-700 dark:text-gray-300 transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
            {onEdit && (
              <button onClick={onEdit}
                className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 bg-white dark:bg-[#1E1E2E] dark:border-gray-700 dark:text-gray-300 transition-colors">
                <Pencil className="w-4 h-4" /> Edit
              </button>
            )}
            {report.status === 'Ready' && (
              <button onClick={handleSend} disabled={sending}
                className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] disabled:opacity-60 transition-colors">
                <Send className="w-4 h-4" /> {sending ? 'Sending…' : 'Send to Chris'}
              </button>
            )}
          </div>
        </div>
        <div className="h-px bg-gray-200 dark:bg-gray-700 mb-6" />

        {(report.imported || report.sourceFileUrl) && (
          <div className="flex flex-wrap items-center gap-3 mb-4">
            {report.imported && <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-purple-50 text-[#8403C5] border-purple-200">Imported</span>}
            {report.sourceFileUrl && (
              <a href={report.sourceFileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
                <FileText className="w-4 h-4" /> {report.sourceFileName || 'Source document'}
              </a>
            )}
          </div>
        )}

        <div className="space-y-6">

          {/* ═══════════════════════════════════════════════════
              SECTION 1 — WEBSITE
          ═══════════════════════════════════════════════════ */}
          <SectionCard icon="🌐" title="Website">
            {/* 4 primary stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatChip label="Active Users"       value={fmt(w.activeUsers)}    curr={w.activeUsers}    prev={pw.activeUsers} />
              <StatChip label="Sessions"           value={fmt(w.sessions)}       curr={w.sessions}       prev={pw.sessions} />
              <StatChip label="New Users"          value={fmt(w.newUsers)}       curr={w.newUsers}       prev={pw.newUsers} />
              <StatChip label="Engaged Sessions"   value={w.engagedSessions ? w.engagedSessions + (String(w.engagedSessions).includes('%') ? '' : '%') : '—'}
                curr={parseFloat(w.engagedSessions)} prev={parseFloat(pw.engagedSessions)} />
            </div>

            {/* Supporting metrics */}
            <div className="grid grid-cols-3 gap-4 mb-2">
              {w.topTrafficSource && (
                <div>
                  <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-1">Top Traffic Source</p>
                  <span className="inline-block bg-purple-50 text-purple-700 text-[12px] font-semibold px-2.5 py-0.5 rounded-full">
                    {w.topTrafficSource}
                  </span>
                </div>
              )}
              <MetaChip label="Avg Engagement Time" value={w.avgEngagementTime} />
              <MetaChip label="Pages Per User" value={w.pagesPerUser} />
            </div>

            {/* GSC sub-section */}
            <>
              <SubDivider label="Google Search Console" />
              {(w.gscImpressions || w.gscClicks || w.gscAvgPosition) ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <StatChip label="Impressions"  value={fmt(w.gscImpressions)} curr={w.gscImpressions} prev={pw.gscImpressions} />
                  <StatChip label="Clicks"       value={fmt(w.gscClicks)}      curr={w.gscClicks}      prev={pw.gscClicks} />
                  <div className="bg-[#F9FAFB] rounded-xl p-4 flex flex-col gap-1">
                    <p className="text-[28px] font-bold text-[#242450] leading-none">{w.gscAvgPosition || '—'}</p>
                    <p className="text-[12px] text-[#6B7280]">Avg Position</p>
                    {gscPage && (
                      <span className={`text-[11px] font-semibold ${gscPos <= 10 ? 'text-[#15803D]' : 'text-[#A16207]'}`}>
                        {gscPage}
                      </span>
                    )}
                  </div>
                  {gscCtr && (
                    <div className="bg-[#F9FAFB] rounded-xl p-4 flex flex-col gap-1">
                      <p className="text-[28px] font-bold text-[#242450] leading-none">{gscCtr}</p>
                      <p className="text-[12px] text-[#6B7280]">Click-through Rate</p>
                      <span className="text-[11px] text-[#9CA3AF]">Clicks ÷ Impressions</span>
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-[13px] text-gray-400 italic py-3">Data not available for this period — check integration connection</p>
              )}
            </>
            <Narrative text={w.notes} />
          </SectionCard>

          {/* ═══════════════════════════════════════════════════
              SECTION 2 — CHRIS LINKEDIN
          ═══════════════════════════════════════════════════ */}
          <SectionCard icon="📊" title="Chris LinkedIn — Personal">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatChip label="Total Impressions"      value={fmt(li.totalImpressions)}    curr={li.totalImpressions}    prev={pli.totalImpressions} />
              <StatChip label="Unique Members Reached" value={fmt(li.uniqueMembersReached)} curr={li.uniqueMembersReached} prev={pli.uniqueMembersReached} />
              <StatChip label="Reactions"              value={fmt(li.reactions)}           curr={li.reactions}           prev={pli.reactions} />
              <StatChip label="Comments"               value={fmt(li.comments)}            curr={li.comments}            prev={pli.comments} />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <MetaChip label="New Connections / Followers" value={fmt(li.newFollowers)} />
              <MetaChip label="Reposts" value={fmt(li.reposts)} />
              {liEngRate && (
                <div>
                  <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-1">Engagement Rate</p>
                  <span className="text-[18px] font-bold text-[#242450]">{liEngRate}</span>
                  <p className="text-[11px] text-[#9CA3AF]">(R+C+Reposts) ÷ Impressions</p>
                </div>
              )}
            </div>
            {li.topPostTitle && (
              <div className="mt-2 p-3 bg-[#F3E8FF] rounded-lg">
                <p className="text-[11px] font-bold text-[#8403C5] uppercase tracking-wide mb-0.5">🏆 Top Post</p>
                <p className="text-[13px] font-semibold text-[#242450]">{li.topPostTitle}</p>
              </div>
            )}
            <Narrative text={li.notes} />
          </SectionCard>

          {/* ═══════════════════════════════════════════════════
              SECTION 3 — EVENTWISE COMPANY PAGE
          ═══════════════════════════════════════════════════ */}
          <SectionCard icon="🏢" title="Eventwise Company Page">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <StatChip label="Page Impressions" value={fmt(cp.totalImpressions)} curr={cp.totalImpressions} prev={pcp.totalImpressions} />
              <StatChip label="New Followers"    value={fmt(cp.newFollowers)}     curr={cp.newFollowers}     prev={pcp.newFollowers} />
              <StatChip label="Reactions"        value={fmt(cp.reactions)}        curr={cp.reactions}        prev={pcp.reactions} />
              <StatChip label="Clicks"           value={fmt(cp.clicks)}           curr={cp.clicks}           prev={pcp.clicks} />
            </div>
            <div className="grid grid-cols-3 gap-4 mb-2">
              <MetaChip label="Unique Visitors"   value={fmt(cp.uniqueVisitors)} />
              <MetaChip label="Posts Published"   value={cp.postsPublished} />
              {cpEngRate && (
                <div>
                  <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide mb-1">Engagement Rate</p>
                  <span className="text-[18px] font-bold text-[#242450]">{cpEngRate}</span>
                  <p className="text-[11px] text-[#9CA3AF]">(Reactions+Clicks) ÷ Impressions</p>
                </div>
              )}
            </div>
            <Narrative text={cp.notes} />
          </SectionCard>

          {/* ═══════════════════════════════════════════════════
              SECTION 4 — NEWSLETTER
          ═══════════════════════════════════════════════════ */}
          <SectionCard icon="✉️" title="Newsletter — Beehiiv">
            {hasNl ? (
              <>
            {(nl.subjectLine || nl.sendDate) && (
              <div className="flex items-center gap-4 mb-4 text-[12px] text-[#9CA3AF]">
                {nl.sendDate && <span>Sent: {nl.sendDate}</span>}
                {nl.subjectLine && <span className="italic">"{nl.subjectLine}"</span>}
              </div>
            )}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
              <div className="bg-[#F9FAFB] rounded-xl p-4 flex flex-col gap-1">
                <p className="text-[28px] font-bold text-[#242450] leading-none">{nl.openRate ? nl.openRate + '%' : '—'}</p>
                <p className="text-[12px] text-[#6B7280]">Open Rate</p>
                {nl.openRate && (
                  <span className={`text-[11px] font-semibold ${openBenchmark === true ? 'text-[#15803D]' : openBenchmark === false ? 'text-[#B91C1C]' : 'text-[#A16207]'}`}>
                    {openBenchmark === true ? '✓ Above average' : openBenchmark === false ? '↓ Below average' : '~ Average'}
                  </span>
                )}
              </div>
              <div className="bg-[#F9FAFB] rounded-xl p-4 flex flex-col gap-1">
                <p className="text-[28px] font-bold text-[#242450] leading-none">{nl.clickRate ? nl.clickRate + '%' : '—'}</p>
                <p className="text-[12px] text-[#6B7280]">Click Rate</p>
                {nl.clickRate && (
                  <span className={`text-[11px] font-semibold ${clickBenchmark === true ? 'text-[#15803D]' : clickBenchmark === false ? 'text-[#B91C1C]' : 'text-[#A16207]'}`}>
                    {clickBenchmark === true ? '✓ Above average' : clickBenchmark === false ? '↓ Below average' : '~ Average'}
                  </span>
                )}
              </div>
              <StatChip label="Total Subscribers" value={fmt(nl.listSize)}      curr={nl.listSize}      prev={pnl.listSize} />
              <StatChip label="Unsubscribes"      value={fmt(nl.unsubscribes)}  curr={nl.unsubscribes}  prev={pnl.unsubscribes} />
            </div>

            {/* Rate benchmark bars */}
            {nl.openRate && (
              <NewsletterBar
                label="Open Rate"
                value={openRate}
                benchmarkLabel="Industry avg"
                benchmarkValue={35}
                isGood={openBenchmark}
              />
            )}
            {nl.clickRate && (
              <NewsletterBar
                label="Click Rate"
                value={Math.min(clickRate * 10, 100)} // scale: 10% = 100%
                benchmarkLabel="Industry avg"
                benchmarkValue={20} // 2% scaled to 20 on the 0-10% range
                isGood={clickBenchmark}
              />
            )}

            <Narrative text={nl.notes} />
              </>
            ) : (
              <p className="text-[13px] text-gray-400 italic py-3">Data not available for this period — check integration connection</p>
            )}
          </SectionCard>

          {/* ═══════════════════════════════════════════════════
              IMPORTED NOTES & ADDITIONAL METRICS
          ═══════════════════════════════════════════════════ */}
          {(report.notes || extra.length > 0) && (
            <SectionCard icon="📎" title="Imported Notes & Additional Metrics">
              {report.notes && <Narrative text={report.notes} />}
              {extra.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {extra.map((m, i) => (
                    <div key={i} className="bg-[#F9FAFB] rounded-xl p-3">
                      <p className="text-[11px] text-[#9CA3AF] font-medium uppercase tracking-wide">{m.label || '—'}</p>
                      <p className="text-[18px] font-bold text-[#242450]">{m.value || '—'}</p>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>
          )}

        </div>
      </div>
    </div>
  );
}