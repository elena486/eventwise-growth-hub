import React, { useState, useRef } from 'react';
import { X, Mail, Download, Loader2, Check, AlertCircle, Upload, FileText, ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { generateAiReportPdf, getWeekLabel, getWeekOptions } from './weeklyReportPdf';

const RECIPIENTS = ['chris@eventwise.com', 'ramesh@eventwise.com', 'elena@eventwise.com'];

export default function WeeklyReportModal({ onClose }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [selectedWeek, setSelectedWeek] = useState(1); // default to last week
  const [file, setFile] = useState(null);
  const [commentary, setCommentary] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [done, setDone] = useState(null); // 'sent' | 'downloaded' | 'error' | null
  const [errorMsg, setErrorMsg] = useState('');

  const weekOptions = getWeekOptions(8);
  const { weekOf, fridayDate, fridayFile, weekOfDate } = getWeekLabel(selectedWeek);
  const filename = `Outreach_Weekly_Report_w-e_${fridayFile}.pdf`;

  const handleFileSelect = (f) => {
    if (!f) return;
    const validTypes = ['.csv', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg'];
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!validTypes.includes(ext)) return;
    setFile(f);
  };

  const processAndGenerate = async (sendEmail) => {
    if (!file) return;
    setBusy(true);
    setDone(null);
    setErrorMsg('');
    try {
      // 1. Upload file
      setPhase('Uploading file...');
      const uploadRes = await base44.integrations.Core.UploadFile({ file });
      const fileUrl = uploadRes.file_url;

      // 2. Create record with Processing status
      setPhase('Creating record...');
      const record = await base44.entities.ApolloWeeklyUpload.create({
        weekOf: weekOfDate,
        uploadedBy: user?.full_name || 'George Nell',
        uploadedAt: new Date().toISOString(),
        fileName: file.name,
        fileUrl,
        aiSummary: '',
        georgesNotes: commentary.trim() || '',
        status: 'Processing',
      });

      // 3. AI analysis via backend function
      setPhase('AI is analyzing your data...');
      const response = await base44.functions.invoke('processApolloUpload', {
        fileUrl,
        fileName: file.name,
      });
      const aiResult = response.data;

      if (aiResult.error) {
        await base44.entities.ApolloWeeklyUpload.update(record.id, {
          status: 'Failed',
          aiSummary: JSON.stringify({ error: aiResult.error }),
        });
        setDone('error');
        setErrorMsg(aiResult.error);
        return;
      }

      const summary = aiResult.summary;

      // 4. Update record to Processed
      setPhase('Saving results...');
      await base44.entities.ApolloWeeklyUpload.update(record.id, {
        aiSummary: JSON.stringify(summary),
        status: 'Processed',
      });

      // 5. Generate PDF
      setPhase('Generating PDF...');
      const doc = generateAiReportPdf(summary, commentary, selectedWeek);

      // 6. Output
      if (sendEmail) {
        setPhase('Uploading PDF & sending email...');
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        const pdfUploadRes = await base44.integrations.Core.UploadFile({ file: pdfFile });
        const pdfUrl = pdfUploadRes.file_url;

        let body = 'Hi all,\n\n';
        body += `Please find this week's outreach report here: ${pdfUrl}\n\n`;
        if (commentary.trim()) {
          body += commentary.trim() + '\n\n';
        }
        body += 'George';

        await base44.integrations.Core.SendEmail({
          to: RECIPIENTS.join(', '),
          subject: `Outreach Weekly Report — w/e ${fridayDate}`,
          body,
          from_name: 'George Nell',
        });
        setDone('sent');
      } else {
        doc.save(filename);
        setDone('downloaded');
      }
    } catch (e) {
      setDone('error');
      setErrorMsg(e.message || 'Unknown error');
    }
    setBusy(false);
    setPhase('');
  };

  const handleClose = () => {
    if (busy) return;
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={handleClose}>
      <div
        className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-lg shadow-2xl animate-modal-in max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {done === 'sent' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy dark:text-white mb-2">Report sent</h2>
            <p className="text-sm text-ew-muted mb-6">Report sent to Chris, Ramesh and Elena ✓</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors">Done</button>
          </div>
        ) : done === 'downloaded' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy dark:text-white mb-2">PDF downloaded</h2>
            <p className="text-sm text-ew-muted mb-6">Your weekly report has been downloaded.</p>
            <button onClick={onClose} className="px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors">Done</button>
          </div>
        ) : (
          <div className="p-6">
            {/* Header */}
            <div className="flex items-start justify-between mb-1">
              <div>
                <h2 className="text-lg font-bold text-navy dark:text-white">Generate Weekly Report</h2>
                <p className="text-sm text-ew-muted mt-0.5">Upload your Apollo analytics export and AI will create a clean summary report ready to send.</p>
              </div>
              <button onClick={onClose} className="text-ew-muted hover:text-navy transition-colors shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {done === 'error' && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 break-words">{errorMsg || 'Something went wrong. Please try again.'}</p>
              </div>
            )}

            {/* Week selector */}
            <div className="mt-5 mb-1">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">Which week does this cover?</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(Number(e.target.value))}
                disabled={busy}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] bg-white transition-colors disabled:opacity-60"
              >
                {weekOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>

            {/* Collapsible instructions */}
            <div className="mt-3 mb-3">
              <button
                onClick={() => setShowInstructions(!showInstructions)}
                className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] transition-colors"
              >
                How do I export from Apollo?
                {showInstructions ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              </button>
              {showInstructions && (
                <div className="mt-2 p-3 bg-[#F6F6FB] dark:bg-[#2A2A3E] rounded-xl text-xs text-ew-body dark:text-gray-300 leading-relaxed">
                  <p>1. Go to Apollo → Sequences → Analytics</p>
                  <p>2. Set the date filter to the past 7 days</p>
                  <p>3. Export as CSV or take a screenshot of the analytics dashboard</p>
                  <p>4. Upload the file below</p>
                </div>
              )}
            </div>

            {/* Upload field */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
              onClick={() => !busy && !file && fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors ${
                file ? 'border-[#1D9E75] bg-[#E8F7F2]' : dragOver ? 'border-[#8403C5] bg-[#F3E8FF] cursor-pointer' : 'border-ew-border dark:border-gray-600 hover:border-[#8403C5] cursor-pointer'
              } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.pdf,.png,.jpg,.jpeg"
                className="hidden"
                onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); }}
              />
              {file ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="w-5 h-5 text-[#1D9E75]" />
                  <span className="text-sm font-medium text-navy dark:text-white">{file.name}</span>
                  <button
                    onClick={e => { e.stopPropagation(); setFile(null); }}
                    className="text-ew-muted hover:text-red-500 transition-colors"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <div>
                  <Upload className="w-8 h-8 text-ew-muted mx-auto mb-2" />
                  <p className="text-sm font-medium text-navy dark:text-white">Drop your Apollo export here</p>
                  <p className="text-xs text-ew-muted mt-1">CSV, XLSX, PDF, PNG or JPG · or click to browse</p>
                </div>
              )}
            </div>

            {/* Notes field */}
            <div className="mt-4 mb-4">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">
                Your commentary for this week <span className="text-xs font-normal text-ew-muted">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Paused two campaigns, focused on Events segment, Agencies showing low engagement..."
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                disabled={busy}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors disabled:opacity-60"
              />
            </div>

            {/* Processing indicator */}
            {busy && (
              <div className="flex items-center gap-2 mb-4 text-sm text-[#8403C5]">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>{phase}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => processAndGenerate(true)}
                disabled={busy || !file}
                className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#17a35f] transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {busy ? 'Processing...' : 'Generate & Send Report'}
              </button>
              <button
                onClick={() => processAndGenerate(false)}
                disabled={busy || !file}
                className="flex items-center justify-center gap-2 px-4 py-2.5 border border-ew-border dark:border-gray-600 text-ew-body dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                Generate PDF only
              </button>
            </div>

            <div className="flex justify-between items-center mt-4">
              <button onClick={onClose} disabled={busy} className="text-xs text-ew-muted hover:text-navy transition-colors disabled:opacity-50">Cancel</button>
              <p className="text-[11px] text-ew-muted">Recipients: Chris, Ramesh, Elena</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}