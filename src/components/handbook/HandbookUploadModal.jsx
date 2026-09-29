import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Upload, FileText, AlertCircle, Check, Loader2 } from 'lucide-react';

export default function HandbookUploadModal({ currentUser, currentVersion, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [versionLabel, setVersionLabel] = useState('');
  const [uploading, setUploading] = useState(false);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'done'
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (f.type !== 'application/pdf' && !f.name.toLowerCase().endsWith('.pdf')) {
      setError('Please select a PDF file');
      return;
    }
    setFile(f);
    setError('');
  };

  const canProceed = file && versionLabel.trim();

  const handleConfirm = async () => {
    setUploading(true);
    setError('');
    try {
      // 1. Upload the file to private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      // 2. Archive the current active handbook(s)
      const active = await base44.entities.CompanyHandbook.filter({ is_active: true });
      if (active.length > 0) {
        const today = new Date().toISOString().split('T')[0];
        await base44.entities.CompanyHandbook.bulkUpdate(
          active.map(h => ({ id: h.id, is_active: false, archived_date: today }))
        );
      }

      // 3. Create the new active handbook
      await base44.entities.CompanyHandbook.create({
        file_uri,
        file_name: file.name,
        version_label: versionLabel.trim(),
        uploaded_date: new Date().toISOString().split('T')[0],
        uploaded_by: currentUser?.full_name || currentUser?.email || '',
        is_active: true,
      });

      setStep('done');
    } catch (e) {
      setError(e.message || 'Upload failed. Please try again.');
      setStep('form');
    }
    setUploading(false);
  };

  // ── Done step ──
  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-7 h-7 text-green-600" />
          </div>
          <h2 className="text-lg font-bold text-navy mb-2">Handbook updated!</h2>
          <p className="text-sm text-ew-muted mb-6">The new version is now live for all employees.</p>
          <button onClick={onUploaded} className="btn-primary">View handbook</button>
        </div>
      </div>
    );
  }

  // ── Confirmation step ──
  if (step === 'confirm') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => !uploading && onClose}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-navy">Confirm replacement</h2>
            {!uploading && <button onClick={onClose} className="text-ew-muted hover:text-navy"><X className="w-5 h-5" /></button>}
          </div>

          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-sm text-amber-800">
              {currentVersion ? (
                <>
                  This will replace the current handbook <strong>"{currentVersion}"</strong>. The old version will be archived (kept for records, but not shown to employees).
                </>
              ) : (
                <>This will set the uploaded PDF as the active company handbook for all employees.</>
              )}
            </div>
          </div>

          <div className="space-y-2 mb-5 text-sm">
            <div className="flex items-center gap-2 text-ew-body">
              <FileText className="w-4 h-4 text-ew-muted" />
              <span className="font-medium">{file?.name}</span>
            </div>
            <div className="text-ew-muted">New version: <strong className="text-navy">{versionLabel}</strong></div>
          </div>

          <div className="flex gap-2 justify-end">
            <button onClick={() => setStep('form')} disabled={uploading}
              className="btn-secondary">Back</button>
            <button onClick={handleConfirm} disabled={uploading}
              className="btn-primary">
              {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : 'Confirm & Upload'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Form step ──
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-lg font-bold text-navy">Upload New Handbook</h2>
          <button onClick={onClose} className="text-ew-muted hover:text-navy"><X className="w-5 h-5" /></button>
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {/* Version label */}
        <div className="mb-4">
          <label className="block text-sm font-semibold text-navy mb-1.5">Version label</label>
          <input
            type="text"
            value={versionLabel}
            onChange={e => setVersionLabel(e.target.value)}
            placeholder="e.g. October 2026"
            className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white"
          />
          <p className="text-xs text-ew-muted mt-1">Employees see this label next to the download button.</p>
        </div>

        {/* File picker */}
        <div className="mb-5">
          <label className="block text-sm font-semibold text-navy mb-1.5">PDF file</label>
          <label className="flex items-center gap-3 border-2 border-dashed border-ew-border rounded-xl px-4 py-5 cursor-pointer hover:border-[#8403C5]/40 hover:bg-[#FAFBFE] transition-colors">
            <div className="w-10 h-10 bg-[#F3E8FF] rounded-lg flex items-center justify-center shrink-0">
              {file ? <FileText className="w-5 h-5 text-[#8403C5]" /> : <Upload className="w-5 h-5 text-[#8403C5]" />}
            </div>
            <div className="min-w-0">
              {file ? (
                <>
                  <p className="text-sm font-medium text-navy truncate">{file.name}</p>
                  <p className="text-xs text-ew-muted">{(file.size / 1024 / 1024).toFixed(1)} MB · Click to change</p>
                </>
              ) : (
                <>
                  <p className="text-sm font-medium text-navy">Click to select a PDF</p>
                  <p className="text-xs text-ew-muted">PDF files only</p>
                </>
              )}
            </div>
            <input type="file" accept=".pdf,application/pdf" className="hidden" onChange={handleFileChange} />
          </label>
        </div>

        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button
            onClick={() => canProceed && setStep('confirm')}
            disabled={!canProceed}
            className="btn-primary disabled:opacity-40"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}