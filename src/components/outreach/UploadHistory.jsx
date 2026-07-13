import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronUp, Eye, Download, History, X } from 'lucide-react';
import { generateAiReportPdf, weeksAgoFromWeekOf } from './weeklyReportPdf';

export default function UploadHistory() {
  const [uploads, setUploads] = useState([]);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [viewing, setViewing] = useState(null); // record being viewed in summary modal

  useEffect(() => {
    if (!expanded) return;
    loadUploads();
  }, [expanded]);

  const loadUploads = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.ApolloWeeklyUpload.list('-uploadedAt', 20);
      setUploads(data);
    } catch (e) { /* bubble */ }
    setLoading(false);
  };

  const handleDownloadPdf = (record) => {
    try {
      const summary = JSON.parse(record.aiSummary || '{}');
      const weeksAgo = weeksAgoFromWeekOf(record.weekOf);
      const doc = generateAiReportPdf(summary, record.georgesNotes || '', weeksAgo);
      const friday = format(parseISO(record.weekOf), 'yyyy-MM-dd');
      doc.save(`Outreach_Weekly_Report_w-e_${friday}.pdf`);
    } catch (e) { /* bubble */ }
  };

  return (
    <div className="mt-8">
      {/* Collapsible header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors"
      >
        <div className="flex items-center gap-2">
          <History className="w-4 h-4 text-[#8403C5]" />
          <span className="text-sm font-bold text-navy dark:text-white">Previous Reports</span>
        </div>
        {expanded ? <ChevronUp className="w-4 h-4 text-ew-muted" /> : <ChevronDown className="w-4 h-4 text-ew-muted" />}
      </button>

      {expanded && (
        <div className="mt-3 bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
            </div>
          ) : uploads.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-ew-muted">No previous reports yet.</div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-ew-border dark:border-gray-700 bg-[#F6F6FB] dark:bg-[#252535]">
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-wider">Week of</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-wider">Uploaded by</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-wider">Date generated</th>
                  <th className="px-4 py-2.5 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody>
                {uploads.map(rec => (
                  <tr key={rec.id} className="border-b border-ew-border dark:border-gray-700 last:border-0 hover:bg-[#F9FAFB] dark:hover:bg-[#252535] transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-navy dark:text-white">
                      {rec.weekOf ? format(parseISO(rec.weekOf), 'd MMM yyyy') : '—'}
                    </td>
                    <td className="px-4 py-3 text-sm text-ew-body dark:text-gray-300">{rec.uploadedBy || '—'}</td>
                    <td className="px-4 py-3 text-sm text-ew-muted">
                      {rec.uploadedAt ? format(parseISO(rec.uploadedAt), 'd MMM yyyy · HH:mm') : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setViewing(rec)}
                          className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" /> View summary
                        </button>
                        <button
                          onClick={() => handleDownloadPdf(rec)}
                          className="flex items-center gap-1 text-xs font-semibold text-ew-body dark:text-gray-300 hover:text-navy dark:hover:text-white transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download PDF
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Summary modal */}
      {viewing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setViewing(null)}>
          <div
            className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl animate-modal-in p-6"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-white">Report Summary</h2>
                <p className="text-sm text-ew-muted mt-0.5">
                  {viewing.weekOf ? `Week of ${format(parseISO(viewing.weekOf), 'd MMM yyyy')}` : ''}
                  {viewing.uploadedBy ? ` · ${viewing.uploadedBy}` : ''}
                </p>
              </div>
              <button onClick={() => setViewing(null)} className="text-ew-muted hover:text-navy transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {(() => {
              const s = JSON.parse(viewing.aiSummary || '{}');
              const hn = s.headline_numbers || {};
              return (
                <div className="space-y-4">
                  {/* Headline numbers */}
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label: 'Emails Sent', val: hn.emails_sent },
                      { label: 'Avg Open Rate', val: hn.avg_open_rate },
                      { label: 'Avg Reply Rate', val: hn.avg_reply_rate },
                      { label: 'Meetings Booked', val: hn.meetings_booked },
                    ].map((stat, i) => (
                      <div key={i} className="bg-[#F6F6FB] dark:bg-[#252535] rounded-xl p-3">
                        <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-wide">{stat.label}</p>
                        <p className="text-lg font-bold text-navy dark:text-white mt-1">{stat.val != null ? stat.val : '—'}</p>
                      </div>
                    ))}
                  </div>

                  {/* AI observations */}
                  {s.ai_observations && (
                    <div className="bg-[#F3E8FF] dark:bg-[#2e1065] rounded-xl p-4">
                      <p className="text-xs font-bold text-[#8403C5] dark:text-purple-300 uppercase tracking-wide mb-1">✨ This Week at a Glance</p>
                      <p className="text-sm text-navy dark:text-gray-200">{s.ai_observations}</p>
                    </div>
                  )}

                  {/* Data quality note */}
                  {s.data_quality_note && (
                    <div className="bg-[#FFFBEB] dark:bg-[#451a03] rounded-xl p-3">
                      <p className="text-xs text-[#A16207] dark:text-amber-300">⚠ {s.data_quality_note}</p>
                    </div>
                  )}

                  {/* Top performing */}
                  {s.top_performing && s.top_performing.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-navy dark:text-gray-200 uppercase tracking-wide mb-2">Best Performing</p>
                      {s.top_performing.slice(0, 3).map((c, i) => (
                        <div key={i} className="border-l-2 border-[#1D9E75] pl-3 mb-2">
                          <p className="text-sm font-medium text-navy dark:text-white">{c.subject_line}</p>
                          <p className="text-xs text-ew-muted">{c.campaign} · {c.why}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Underperforming */}
                  {s.underperforming && s.underperforming.length > 0 && (
                    <div>
                      <p className="text-xs font-bold text-navy dark:text-gray-200 uppercase tracking-wide mb-2">Needs Attention</p>
                      {s.underperforming.slice(0, 3).map((c, i) => (
                        <div key={i} className="border-l-2 border-[#DC2626] pl-3 mb-2">
                          <p className="text-sm font-medium text-navy dark:text-white">{c.subject_line}</p>
                          <p className="text-xs text-ew-muted">{c.campaign} · {c.issue}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* George's notes */}
                  {viewing.georgesNotes && (
                    <div>
                      <p className="text-xs font-bold text-navy dark:text-gray-200 uppercase tracking-wide mb-1">Notes from George</p>
                      <p className="text-sm text-ew-muted italic">{viewing.georgesNotes}</p>
                    </div>
                  )}
                </div>
              );
            })()}

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => handleDownloadPdf(viewing)}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-xl hover:bg-[#6d02a3] transition-colors"
              >
                <Download className="w-4 h-4" /> Download PDF
              </button>
              <button
                onClick={() => setViewing(null)}
                className="px-4 py-2 text-sm font-medium text-ew-muted hover:text-navy transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}