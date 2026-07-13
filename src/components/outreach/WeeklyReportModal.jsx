import React, { useState } from 'react';
import { X, Mail, Download, Loader2, Check, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { generateWeeklyReportPdf, getWeekLabel, getWeekOptions } from './weeklyReportPdf';

const RECIPIENTS = ['chris@eventwise.com', 'ramesh@eventwise.com', 'elena@eventwise.com'];

export default function WeeklyReportModal({ campaigns, onClose }) {
  const [commentary, setCommentary] = useState('');
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // 'sent' | 'downloaded' | 'error' | null

  const weekOptions = getWeekOptions(8);
  const { weekOf, fridayDate, fridayFile } = getWeekLabel(selectedWeek);
  const filename = `Outreach_Weekly_Report_w-e_${fridayFile}.pdf`;

  const buildPdf = () => generateWeeklyReportPdf(campaigns, commentary, selectedWeek);

  const handleSend = async () => {
    setBusy(true);
    setDone(null);
    try {
      const doc = buildPdf();
      const pdfBlob = doc.output('blob');
      const file = new File([pdfBlob], filename, { type: 'application/pdf' });
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const file_url = uploadRes.file_url;

      let body = 'Hi all,\n\n';
      body += `Please find this week's outreach report here: ${file_url}\n\n`;
      body += 'All campaign data is available in full in Eventwise HQ under Sales > Outreach Analytics.\n';
      if (commentary.trim()) {
        body += '\n' + commentary.trim() + '\n';
      }
      body += '\nGeorge';

      await base44.integrations.Core.SendEmail({
        to: RECIPIENTS.join(', '),
        subject: `Outreach Weekly Report — w/e ${fridayDate}`,
        body,
        from_name: 'George Nell',
      });

      setDone('sent');
    } catch (e) {
      setDone('error');
    }
    setBusy(false);
  };

  const handleDownload = () => {
    setBusy(true);
    setDone(null);
    try {
      const doc = buildPdf();
      doc.save(filename);
      setDone('downloaded');
    } catch (e) {
      setDone('error');
    }
    setBusy(false);
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-lg shadow-2xl animate-modal-in"
        onClick={e => e.stopPropagation()}
      >
        {done === 'sent' ? (
          // Success — sent
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy dark:text-white mb-2">Report sent</h2>
            <p className="text-sm text-ew-muted mb-6">
              Report sent to Chris, Ramesh and Elena ✓
            </p>
            <button onClick={onClose}
              className="px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
              Done
            </button>
          </div>
        ) : done === 'downloaded' ? (
          // Success — downloaded
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy dark:text-white mb-2">PDF downloaded</h2>
            <p className="text-sm text-ew-muted mb-6">
              Your weekly report has been downloaded.
            </p>
            <button onClick={onClose}
              className="px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
              Done
            </button>
          </div>
        ) : (
          // Form
          <div className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-white">Generate Weekly Report</h2>
              </div>
              <button onClick={onClose} className="text-ew-muted hover:text-navy transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Week selector */}
            <div className="mt-4 mb-1">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">
                Report covers week of:
              </label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(Number(e.target.value))}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] bg-white transition-colors"
              >
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {done === 'error' && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700">Something went wrong. Please try again.</p>
              </div>
            )}

            {/* Commentary field */}
            <div className="mt-5 mb-5">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">
                Your commentary for this week <span className="text-xs font-normal text-ew-muted">(optional)</span>
              </label>
              <textarea
                rows={4}
                placeholder="e.g. Agencies segment showing strong open rates, pivoting TP3 subject line next week, pausing Passed Events campaign..."
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors"
              />
              <p className="text-[11px] text-ew-muted mt-1.5">
                If entered, this will appear in a "Notes from George" section of the report.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={handleSend}
                disabled={busy}
                className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#17a35f] transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {busy ? 'Generating & sending...' : 'Generate & Send Report'}
              </button>
              <button
                onClick={handleDownload}
                disabled={busy}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-ew-border dark:border-gray-600 text-ew-body dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Generate PDF only
              </button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button
                onClick={onClose}
                disabled={busy}
                className="text-xs text-ew-muted hover:text-navy transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <p className="text-[11px] text-ew-muted">
                Recipients: Chris, Ramesh, Elena
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}