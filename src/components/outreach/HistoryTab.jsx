import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FileText, Download, Eye, Sparkles, AlertTriangle } from 'lucide-react';
import { generateAiReportPdf, weeksAgoFromWeekOf } from './weeklyReportPdf';
import { format, parseISO, addDays } from 'date-fns';

const HISTORICAL_WEEK = '2026-01-01';

function fmtDateTime(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy, HH:mm'); } catch { return d; }
}

function fmtPct(val) {
  return val != null ? val.toFixed(1) + '%' : '—';
}

const AUDIENCE_STYLES = {
  Events: 'bg-[#EEF2F8] text-[#5777AB]',
  Agencies: 'bg-[#E8F7F2] text-[#1D9E75]',
  Mixed: 'bg-[#F3E8FF] text-[#8403C5]',
  Suppliers: 'bg-[#FFFBEB] text-[#E8A020]',
};

const STATUS_STYLES = {
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-gray-100 text-gray-500',
  Killed: 'bg-red-100 text-red-600',
};

function HistoricalSection({ historicalSnapshots, showHistorical, setShowHistorical }) {
  const totalSent = historicalSnapshots.reduce((s, c) => s + (c.emailsSent || 0), 0);
  const validOpen = historicalSnapshots.filter(c => c.openRate != null);
  const avgOpen = validOpen.length ? validOpen.reduce((s, c) => s + c.openRate, 0) / validOpen.length : null;
  const campaignCount = new Set(historicalSnapshots.map(c => c.campaignName)).size;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-700">
          <AlertTriangle className="w-3 h-3" /> Historical — cumulative data pre-July 2026
        </span>
        <button
          onClick={() => setShowHistorical(!showHistorical)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-amber-200 bg-white text-amber-700 hover:bg-amber-50 rounded-lg transition-colors"
        >
          {showHistorical ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          {showHistorical ? 'Hide' : 'Show'} {historicalSnapshots.length} campaigns
        </button>
      </div>
      <div className="bg-white border border-amber-200 rounded-xl overflow-hidden">
        <div className="bg-amber-50/50 border-b border-amber-200 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4 text-xs">
            <span className="text-ew-muted">Campaigns: <span className="font-semibold text-navy">{campaignCount}</span></span>
            <span className="text-ew-muted">Emails sent: <span className="font-semibold text-navy">{totalSent.toLocaleString()}</span></span>
            <span className="text-ew-muted">Avg open: <span className="font-semibold text-navy">{fmtPct(avgOpen)}</span></span>
          </div>
          <span className="text-[11px] text-ew-muted italic">Migrated by Elena · cumulative totals, not a single week</span>
        </div>
        {showHistorical && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F6F6FB] border-b border-ew-border">
                <tr>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Campaign</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Audience</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Status</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">TP</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Variant</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Sent</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Open %</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Reply %</th>
                </tr>
              </thead>
              <tbody>
                {historicalSnapshots.map((s, i) => (
                  <tr key={s.id || i} className={`border-b border-ew-border hover:bg-amber-50/30 transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    <td className="px-3 py-2.5 text-xs font-medium text-navy">{s.campaignName || '—'}</td>
                    <td className="px-3 py-2.5">{s.audience && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AUDIENCE_STYLES[s.audience] || 'bg-gray-100 text-gray-500'}`}>{s.audience}</span>}</td>
                    <td className="px-3 py-2.5">{s.status && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-500'}`}>{s.status}</span>}</td>
                    <td className="px-3 py-2.5 text-xs text-ew-body">{s.touchpoint || '—'}</td>
                    <td className="px-3 py-2.5">{s.variant && <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5]">{s.variant}</span>}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{s.emailsSent != null ? s.emailsSent.toLocaleString() : '—'}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{fmtPct(s.openRate)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{fmtPct(s.replyRate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function HistoryTab({ uploads, snapshots, subjectLines }) {
  const [expandedId, setExpandedId] = useState(null);
  const [showHistorical, setShowHistorical] = useState(false);

  const historicalSnapshots = useMemo(() => snapshots.filter(s => s.weekCommencing === HISTORICAL_WEEK), [snapshots]);
  const weeklySnapshots = useMemo(() => snapshots.filter(s => s.weekCommencing !== HISTORICAL_WEEK), [snapshots]);

  const weekStats = useMemo(() => {
    const map = {};
    weeklySnapshots.forEach(s => {
      const week = s.weekCommencing;
      if (!map[week]) map[week] = { count: 0, emailsSent: 0, openRates: [], campaignNames: new Set() };
      map[week].count++;
      map[week].emailsSent += s.emailsSent || 0;
      if (s.openRate != null) map[week].openRates.push(s.openRate);
      if (s.campaignName) map[week].campaignNames.add(s.campaignName);
    });
    return map;
  }, [weeklySnapshots]);

  const handleDownloadPdf = (upload) => {
    try {
      const summary = JSON.parse(upload.aiSummary || '{}');
      const sls = JSON.parse(upload.subjectLines || '[]');
      const weeksAgo = weeksAgoFromWeekOf(upload.weekOf);
      const doc = generateAiReportPdf(summary, sls, upload.georgesNotes || '', weeksAgo);
      const fridayDate = addDays(parseISO(upload.weekOf), 4);
      const fridayFile = format(fridayDate, 'yyyy-MM-dd');
      doc.save(`Outreach_Weekly_Report_w-e_${fridayFile}.pdf`);
    } catch (e) {
      console.error('PDF error:', e);
    }
  };

  const handleDownloadCsv = (upload) => {
    try {
      const fileUrls = JSON.parse(upload.fileUrls || '[]');
      const csvFile = fileUrls.find(f => f.name?.toLowerCase().endsWith('.csv')) || fileUrls[0];
      const url = csvFile?.url || upload.fileUrl;
      if (url) {
        const a = document.createElement('a');
        a.href = url;
        a.download = csvFile?.name || upload.fileName;
        a.target = '_blank';
        a.click();
      }
    } catch (e) {
      console.error('CSV download error:', e);
    }
  };

  if (uploads.length === 0 && historicalSnapshots.length === 0) {
    return (
      <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
        <p className="text-sm text-ew-muted">No uploads yet — generate your first weekly report to get started</p>
      </div>
    );
  }

  if (uploads.length === 0) {
    return (
      <div>
        <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
          <p className="text-sm text-ew-muted">No uploads yet — generate your first weekly report to get started</p>
        </div>
        <HistoricalSection historicalSnapshots={historicalSnapshots} showHistorical={showHistorical} setShowHistorical={setShowHistorical} />
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F6F6FB] border-b border-ew-border">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Week of</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Uploaded by</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Date generated</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Campaigns</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Emails sent</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Avg open</th>
              <th className="px-3 py-3 text-center text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Actions</th>
            </tr>
          </thead>
          <tbody>
            {uploads.map((upload, i) => {
              const stats = weekStats[upload.weekOf] || { count: 0, emailsSent: 0, openRates: [], campaignNames: new Set() };
              const avgOpen = stats.openRates.length > 0 ? stats.openRates.reduce((a, b) => a + b, 0) / stats.openRates.length : null;
              const summary = JSON.parse(upload.aiSummary || '{}');
              const sls = JSON.parse(upload.subjectLines || '[]');
              const weekRange = upload.weekOf ? `${format(parseISO(upload.weekOf), 'd MMM')} – ${format(addDays(parseISO(upload.weekOf), 4), 'd MMM yyyy')}` : '—';
              const isExpanded = expandedId === upload.id;
              const campaignCount = stats.campaignNames.size || stats.count;

              return (
                <React.Fragment key={upload.id || i}>
                  <tr className={`border-b border-ew-border hover:bg-[#F6F6FB] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    <td className="px-3 py-3">
                      <button onClick={() => setExpandedId(isExpanded ? null : upload.id)} className="flex items-center gap-1.5 text-sm font-semibold text-navy hover:text-[#8403C5] transition-colors">
                        {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        {weekRange}
                      </button>
                    </td>
                    <td className="px-3 py-3 text-xs text-ew-body">{upload.uploadedBy || '—'}</td>
                    <td className="px-3 py-3 text-xs text-ew-muted">{fmtDateTime(upload.uploadedAt)}</td>
                    <td className="px-3 py-3 text-right text-xs font-medium text-navy">{campaignCount}</td>
                    <td className="px-3 py-3 text-right text-xs font-medium text-navy">{stats.emailsSent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-xs font-medium text-navy">{fmtPct(avgOpen)}</td>
                    <td className="px-3 py-3">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : upload.id)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#8403C5] hover:bg-[#F3E8FF] rounded-lg transition-colors"
                          title="View summary"
                        >
                          <Eye className="w-3 h-3" /> Summary
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(upload)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors"
                          title="Download PDF"
                        >
                          <FileText className="w-3 h-3" /> PDF
                        </button>
                        <button
                          onClick={() => handleDownloadCsv(upload)}
                          className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors"
                          title="Download CSV"
                        >
                          <Download className="w-3 h-3" /> CSV
                        </button>
                      </div>
                    </td>
                  </tr>

                  {isExpanded && (
                    <tr className="bg-[#F6F6FB]">
                      <td colSpan={7} className="px-6 py-4">
                        {summary.ai_observations && (
                          <div className="mb-4">
                            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1.5 flex items-center gap-1">
                              <Sparkles className="w-3.5 h-3.5 text-[#8403C5]" /> AI Observations
                            </p>
                            <div className="bg-white border border-[#8403C5]/20 rounded-lg p-3">
                              <p className="text-sm text-ew-body leading-relaxed">{summary.ai_observations}</p>
                              {summary.data_quality_note && (
                                <p className="text-[11px] text-amber-700 mt-2 italic">Note: {summary.data_quality_note}</p>
                              )}
                            </div>
                          </div>
                        )}

                        {sls.length > 0 && (
                          <div>
                            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1.5">Subject Lines</p>
                            <div className="bg-white border border-ew-border rounded-lg overflow-hidden">
                              <table className="w-full text-xs">
                                <thead className="bg-[#F6F6FB] border-b border-ew-border">
                                  <tr>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase">Subject Line</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-ew-muted uppercase w-16">Open %</th>
                                    <th className="px-3 py-2 text-right text-[10px] font-semibold text-ew-muted uppercase w-16">Reply %</th>
                                    <th className="px-3 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase w-24">Variant</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {sls.filter(s => s.subject_line).sort((a, b) => (parseFloat(b.open_rate) || 0) - (parseFloat(a.open_rate) || 0)).map((sl, si) => (
                                    <tr key={si} className="border-b border-ew-border last:border-0">
                                      <td className="px-3 py-2 font-medium text-navy">{sl.subject_line}</td>
                                      <td className="px-3 py-2 text-right font-medium text-navy">{sl.open_rate || '—'}{sl.open_rate ? '%' : ''}</td>
                                      <td className="px-3 py-2 text-right font-medium text-navy">{sl.reply_rate || '—'}{sl.reply_rate ? '%' : ''}</td>
                                      <td className="px-3 py-2 text-ew-muted">{sl.variant || '—'}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {upload.georgesNotes && (
                          <div className="mt-3">
                            <p className="text-xs font-bold text-navy uppercase tracking-wide mb-1">George's Notes</p>
                            <p className="text-sm text-ew-body italic">{upload.georgesNotes}</p>
                          </div>
                        )}

                        {upload.status === 'Processing' && (
                          <p className="text-xs text-amber-700 mt-2">Processing...</p>
                        )}
                        {upload.status === 'Failed' && (
                          <p className="text-xs text-red-600 mt-2">Failed to process this upload.</p>
                        )}
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      {historicalSnapshots.length > 0 && (
        <HistoricalSection historicalSnapshots={historicalSnapshots} showHistorical={showHistorical} setShowHistorical={setShowHistorical} />
      )}
    </div>
  );
}