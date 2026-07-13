import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, FileText, Download, Eye, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateAiReportPdf, weeksAgoFromWeekOf } from './weeklyReportPdf';
import { format, parseISO, addDays } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

function fmtDateTime(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy, HH:mm'); } catch { return d; }
}

function fmtPct(val) {
  return val != null ? val.toFixed(1) + '%' : '—';
}

export default function HistoryTab({ uploads, snapshots, subjectLines }) {
  const [expandedId, setExpandedId] = useState(null);

  // Group snapshots by weekCommencing for aggregation
  const weekStats = useMemo(() => {
    const map = {};
    snapshots.forEach(s => {
      const week = s.weekCommencing;
      if (!map[week]) map[week] = { count: 0, emailsSent: 0, openRates: [], campaignNames: new Set() };
      map[week].count++;
      map[week].emailsSent += s.emailsSent || 0;
      if (s.openRate != null) map[week].openRates.push(s.openRate);
      if (s.campaignName) map[week].campaignNames.add(s.campaignName);
    });
    return map;
  }, [snapshots]);

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

  if (uploads.length === 0) {
    return (
      <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
        <p className="text-sm text-ew-muted">No uploads yet — generate your first weekly report to get started</p>
      </div>
    );
  }

  return (
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

                {/* Expanded summary */}
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
  );
}