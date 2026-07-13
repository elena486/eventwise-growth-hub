import React, { useState, useRef } from 'react';
import { X, Mail, Download, Loader2, Check, AlertCircle, Upload, FileText, Plus, Sparkles } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { generateAiReportPdf, getWeekLabel, getWeekOptions } from './weeklyReportPdf';

const RECIPIENTS = ['chris@eventwise.com', 'ramesh@eventwise.com', 'elena@eventwise.com'];
const MAX_FILES = 5;
const ACCEPTED_EXTS = ['.csv', '.xlsx', '.pdf', '.png', '.jpg', '.jpeg'];

export default function WeeklyReportModal({ onClose }) {
  const { user } = useAuth();
  const fileInputRef = useRef(null);
  const [selectedWeek, setSelectedWeek] = useState(1);
  const [files, setFiles] = useState([]);
  const [subjectLines, setSubjectLines] = useState([
    { subject_line: '', open_rate: '', reply_rate: '', variant: '' },
    { subject_line: '', open_rate: '', reply_rate: '', variant: '' },
    { subject_line: '', open_rate: '', reply_rate: '', variant: '' },
  ]);
  const [commentary, setCommentary] = useState('');
  const [showInstructions, setShowInstructions] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [busy, setBusy] = useState(false);
  const [phase, setPhase] = useState('');
  const [done, setDone] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const weekOptions = getWeekOptions(8);
  const { fridayDate, fridayFile, weekOfDate } = getWeekLabel(selectedWeek);
  const filename = `Outreach_Weekly_Report_w-e_${fridayFile}.pdf`;

  const handleFileSelect = (f) => {
    if (!f || files.length >= MAX_FILES) return;
    const ext = '.' + (f.name.split('.').pop() || '').toLowerCase();
    if (!ACCEPTED_EXTS.includes(ext)) return;
    setFiles(prev => [...prev, f]);
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateSubjectLine = (index, field, value) => {
    setSubjectLines(prev => prev.map((row, i) => i === index ? { ...row, [field]: value } : row));
  };

  const addSubjectLine = () => {
    setSubjectLines(prev => [...prev, { subject_line: '', open_rate: '', reply_rate: '', variant: '' }]);
  };

  const removeSubjectLine = (index) => {
    setSubjectLines(prev => prev.length > 1 ? prev.filter((_, i) => i !== index) : prev);
  };

  const processAndGenerate = async (sendEmail) => {
    if (files.length === 0) return;
    setBusy(true);
    setDone(null);
    setErrorMsg('');
    try {
      // 1. Upload all files
      setPhase('Uploading files...');
      const uploadPromises = files.map(f => base44.integrations.Core.UploadFile({ file: f }));
      const uploadResults = await Promise.all(uploadPromises);
      const uploadedFiles = uploadResults.map((res, i) => ({ url: res.file_url, name: files[i].name }));

      // 2. Create record with Processing status
      setPhase('Creating record...');
      const record = await base44.entities.ApolloWeeklyUpload.create({
        weekOf: weekOfDate,
        uploadedBy: user?.full_name || 'George Nell',
        uploadedAt: new Date().toISOString(),
        fileName: uploadedFiles.map(f => f.name).join(', '),
        fileUrl: uploadedFiles[0]?.url || '',
        subjectLines: JSON.stringify(subjectLines),
        aiSummary: '',
        georgesNotes: commentary.trim() || '',
        status: 'Processing',
      });

      // 3. AI analysis via backend function
      setPhase('AI is analyzing your data...');
      const response = await base44.functions.invoke('processApolloUpload', {
        files: uploadedFiles,
        subjectLines,
        commentary,
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
      const doc = generateAiReportPdf(summary, subjectLines, commentary, selectedWeek);

      // 6. Output
      if (sendEmail) {
        setPhase('Uploading PDF & sending email...');
        const pdfBlob = doc.output('blob');
        const pdfFile = new File([pdfBlob], filename, { type: 'application/pdf' });
        const pdfUploadRes = await base44.integrations.Core.UploadFile({ file: pdfFile });
        const pdfUrl = pdfUploadRes.file_url;

        let body = 'Hi all,\n\nPlease find this week\'s outreach report here: ' + pdfUrl + '\n\n';
        if (commentary.trim()) body += commentary.trim() + '\n\n';
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

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => !busy && onClose()}>
      <div
        className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-2xl shadow-2xl animate-modal-in max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {done === 'sent' ? (
          <div className="p-8 text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-lg font-bold text-navy dark:text-white mb-2">Report sent</h2>
            <p className="text-sm text-ew-muted mb-6">Report sent to Chris, Ramesh and Elena.</p>
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
              <div className="flex-1">
                <h2 className="text-lg font-bold text-navy dark:text-white">Generate Weekly Report</h2>
                <p className="text-sm text-ew-muted mt-0.5">Upload your Apollo export and add your subject line results — AI will generate a clean summary report ready to send.</p>
              </div>
              <button onClick={() => !busy && onClose()} className="text-ew-muted hover:text-navy transition-colors shrink-0 ml-3">
                <X className="w-5 h-5" />
              </button>
            </div>

            {done === 'error' && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <p className="text-xs text-red-700 break-words">{errorMsg || 'Something went wrong. Please try again.'}</p>
              </div>
            )}

            {/* STEP 1 — Week selector */}
            <div className="mt-5 mb-1">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">Which week does this cover?</label>
              <select
                value={selectedWeek}
                onChange={e => setSelectedWeek(Number(e.target.value))}
                disabled={busy}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] bg-white transition-colors disabled:opacity-60"
              >
                {weekOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
              </select>
            </div>

            {/* STEP 2 — Upload Apollo export */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-0.5">Upload Apollo sequence analytics export</label>
              <p className="text-xs text-ew-muted mb-2">Apollo → Sequences → Analytics → set date filter to last 7 days → Export CSV</p>
              <div
                onDragOver={e => { e.preventDefault(); setDragOver(true); }}
                onDragLeave={() => setDragOver(false)}
                onDrop={e => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
                onClick={() => !busy && files.length < MAX_FILES && fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-xl p-4 transition-colors ${
                  files.length > 0 ? 'border-[#1D9E75] bg-[#E8F7F2]/30' : dragOver ? 'border-[#8403C5] bg-[#F3E8FF] cursor-pointer' : 'border-ew-border dark:border-gray-600 hover:border-[#8403C5] cursor-pointer'
                } ${busy ? 'opacity-60 pointer-events-none' : ''}`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={ACCEPTED_EXTS.join(',')}
                  className="hidden"
                  onChange={e => { if (e.target.files[0]) handleFileSelect(e.target.files[0]); e.target.value = ''; }}
                />
                {files.length > 0 ? (
                  <div className="space-y-2">
                    {files.map((f, i) => (
                      <div key={i} className="flex items-center justify-between bg-white dark:bg-[#2A2A3E] rounded-lg px-3 py-2 border border-ew-border dark:border-gray-600">
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="w-4 h-4 text-[#1D9E75] shrink-0" />
                          <span className="text-sm font-medium text-navy dark:text-white truncate">{f.name}</span>
                        </div>
                        <button onClick={e => { e.stopPropagation(); removeFile(i); }} className="text-ew-muted hover:text-red-500 transition-colors shrink-0 ml-2">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {files.length < MAX_FILES && (
                      <button onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }} className="text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] transition-colors">
                        + Add another file ({files.length}/{MAX_FILES})
                      </button>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2">
                    <Upload className="w-7 h-7 text-ew-muted mx-auto mb-2" />
                    <p className="text-sm font-medium text-navy dark:text-white">Drop your Apollo export here</p>
                    <p className="text-xs text-ew-muted mt-1">CSV, XLSX, PDF, PNG or JPG · up to {MAX_FILES} files · or click to browse</p>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 3 — Subject lines table */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-0.5">Subject lines tested this week</label>
              <p className="text-xs text-ew-muted mb-2">Find these in Apollo → Sequences → click your sequence → Report tab. Add each subject line you A/B tested this week.</p>
              <div className="border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-[#F6F6FB] dark:bg-[#252535] border-b border-ew-border dark:border-gray-700">
                      <th className="px-3 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase tracking-wider">Subject Line</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase tracking-wider w-16">Open %</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase tracking-wider w-16">Reply %</th>
                      <th className="px-2 py-2 text-left text-[10px] font-semibold text-ew-muted uppercase tracking-wider w-24">Variant/Note</th>
                      <th className="w-8"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {subjectLines.map((row, i) => (
                      <tr key={i} className="border-b border-ew-border dark:border-gray-700 last:border-0">
                        <td className="px-2 py-1.5">
                          <input
                            value={row.subject_line}
                            onChange={e => updateSubjectLine(i, 'subject_line', e.target.value)}
                            disabled={busy}
                            placeholder="Enter subject line..."
                            className="w-full px-2 py-1.5 text-sm border-0 bg-transparent outline-none focus:bg-[#F6F6FB] dark:focus:bg-[#252535] dark:text-gray-200 rounded text-[#242450]"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={row.open_rate}
                            onChange={e => updateSubjectLine(i, 'open_rate', e.target.value)}
                            disabled={busy}
                            placeholder="0.0"
                            className="w-full px-2 py-1.5 text-sm border-0 bg-transparent outline-none focus:bg-[#F6F6FB] dark:focus:bg-[#252535] dark:text-gray-200 rounded text-center text-[#242450]"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input
                            type="number"
                            step="0.1"
                            value={row.reply_rate}
                            onChange={e => updateSubjectLine(i, 'reply_rate', e.target.value)}
                            disabled={busy}
                            placeholder="0.0"
                            className="w-full px-2 py-1.5 text-sm border-0 bg-transparent outline-none focus:bg-[#F6F6FB] dark:focus:bg-[#252535] dark:text-gray-200 rounded text-center text-[#242450]"
                          />
                        </td>
                        <td className="px-1 py-1.5">
                          <input
                            value={row.variant}
                            onChange={e => updateSubjectLine(i, 'variant', e.target.value)}
                            disabled={busy}
                            placeholder="e.g. Variant A"
                            className="w-full px-2 py-1.5 text-sm border-0 bg-transparent outline-none focus:bg-[#F6F6FB] dark:focus:bg-[#252535] dark:text-gray-200 rounded text-[#242450]"
                          />
                        </td>
                        <td className="px-1 py-1.5 text-center">
                          <button onClick={() => removeSubjectLine(i)} disabled={busy} className="text-ew-muted hover:text-red-500 transition-colors p-1 disabled:opacity-50">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button onClick={addSubjectLine} disabled={busy} className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] transition-colors disabled:opacity-50">
                <Plus className="w-3.5 h-3.5" /> Add another subject line
              </button>
              <p className="mt-1.5 text-[11px] text-ew-muted">If left blank, subject line sections will not appear in the report.</p>
            </div>

            {/* STEP 4 — Commentary */}
            <div className="mt-4">
              <label className="block text-sm font-semibold text-navy dark:text-gray-200 mb-1.5">
                Your commentary for this week <span className="text-xs font-normal text-ew-muted">(optional)</span>
              </label>
              <textarea
                rows={3}
                placeholder="e.g. Paused Passed Events campaign, pivoting to Events segment next week, Agencies showing low engagement..."
                value={commentary}
                onChange={e => setCommentary(e.target.value)}
                disabled={busy}
                className="w-full border border-ew-border dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors disabled:opacity-60"
              />
            </div>

            {/* Processing indicator */}
            {busy && (
              <div className="flex items-center gap-2 mt-4 text-sm text-[#8403C5]">
                <Sparkles className="w-4 h-4 animate-pulse" />
                <span>{phase}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-2 flex-wrap mt-5">
              <button
                onClick={() => processAndGenerate(true)}
                disabled={busy || files.length === 0}
                className="flex-1 min-w-[180px] flex items-center justify-center gap-2 py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-semibold hover:bg-[#17a35f] transition-colors disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Mail className="w-4 h-4" />}
                {busy ? 'Processing...' : 'Generate & Send Report'}
              </button>
              <button
                onClick={() => processAndGenerate(false)}
                disabled={busy || files.length === 0}
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