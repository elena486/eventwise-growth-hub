import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Download, Upload, FileText, Loader2, X, AlertCircle, Check } from 'lucide-react';
import { format } from 'date-fns';

const PDF_ADMINS = ['chris@eventwise.com', 'elena@eventwise.com'];

export default function HandbookPdfBlock() {
  const { user } = useAuth();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  const canUpload = PDF_ADMINS.includes(user?.email?.toLowerCase());

  useEffect(() => { loadRecord(); }, []);

  const loadRecord = async () => {
    setLoading(true);
    try {
      const all = await base44.entities.CompanyHandbook.filter({ is_active: true });
      setRecord(all[0] || null);
    } catch (e) { console.error('Handbook PDF load failed', e); }
    setLoading(false);
  };

  const handleDownload = async () => {
    if (!record?.file_uri) return;
    setDownloading(true);
    try {
      const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({
        file_uri: record.file_uri, expires_in: 300,
      });
      const a = document.createElement('a');
      a.href = signed_url;
      a.download = record.file_name || 'handbook.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) { console.error('Download failed', e); }
    setDownloading(false);
  };

  const handleUploaded = () => {
    setShowUpload(false);
    loadRecord();
  };

  return (
    <>
      <div className="bg-white rounded-xl border border-ew-border shadow-sm p-4 mb-4 flex items-center gap-4">
        <div className="w-11 h-11 bg-[#F3E8FF] rounded-lg flex items-center justify-center shrink-0">
          <FileText className="w-5 h-5 text-[#8403C5]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#242450]">Designed PDF version</p>
          {loading ? (
            <p className="text-xs text-ew-muted">Loading…</p>
          ) : record ? (
            <p className="text-xs text-ew-muted">
              Uploaded {format(new Date(record.uploaded_date), 'd MMM yyyy')}
              {record.uploaded_by ? ` by ${record.uploaded_by}` : ''}
            </p>
          ) : (
            <p className="text-xs text-ew-muted">
              {canUpload ? 'No PDF uploaded yet.' : 'No PDF uploaded yet — check back soon.'}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {canUpload && (
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] border border-ew-border rounded-lg hover:bg-ew-bg transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              {record ? 'Replace PDF' : 'Upload PDF'}
            </button>
          )}
          {record && (
            <button
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-50 transition-colors"
            >
              {downloading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
              Download Handbook (PDF)
            </button>
          )}
        </div>
      </div>

      {showUpload && (
        <HandbookPdfUploadModal
          hasExisting={!!record}
          currentUser={user}
          onClose={() => setShowUpload(false)}
          onUploaded={handleUploaded}
        />
      )}
    </>
  );
}

// ── Upload modal with confirmation ──

function HandbookPdfUploadModal({ hasExisting, currentUser, onClose, onUploaded }) {
  const [file, setFile] = useState(null);
  const [step, setStep] = useState('form'); // 'form' | 'confirm' | 'done'
  const [uploading, setUploading] = useState(false);
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

  const handleConfirm = async () => {
    setUploading(true);
    setError('');
    try {
      // 1. Upload the file to private storage
      const { file_uri } = await base44.integrations.Core.UploadPrivateFile({ file });

      // 2. Replace the existing active record, or create one
      const existing = await base44.entities.CompanyHandbook.filter({ is_active: true });
      const today = new Date().toISOString().split('T')[0];
      const payload = {
        file_uri,
        file_name: file.name,
        uploaded_date: today,
        uploaded_by: currentUser?.full_name || currentUser?.email || '',
        is_active: true,
      };
      if (existing.length > 0) {
        await base44.entities.CompanyHandbook.update(existing[0].id, payload);
      } else {
        payload.version_label = 'Employee Handbook';
        await base44.entities.CompanyHandbook.create(payload);
      }
      setStep('done');
    } catch (e) {
      setError(e.message || 'Upload failed. Please try again.');
      setStep('form');
    }
    setUploading(false);
  };

  if (step === 'done') {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onUploaded}>
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
          <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-base font-bold text-navy mb-1">PDF updated!</h2>
          <p className="text-sm text-ew-muted mb-4">The download button now serves the new file.</p>
          <button onClick={onUploaded} className="btn-primary">Done</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => !uploading && onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-navy">
            {step === 'confirm' ? 'Confirm replacement' : hasExisting ? 'Replace handbook PDF' : 'Upload handbook PDF'}
          </h2>
          {!uploading && <button onClick={onClose} className="text-ew-muted hover:text-navy"><X className="w-5 h-5" /></button>}
        </div>

        {error && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-4 text-sm text-red-700">
            <AlertCircle className="w-4 h-4 shrink-0" /> {error}
          </div>
        )}

        {step === 'confirm' && (
          <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-sm text-amber-800">
              This will replace the current PDF. Employees will download the new file from the handbook page.
            </p>
          </div>
        )}

        {/* File info / picker */}
        {step === 'form' && (
          <label className="flex items-center gap-3 border-2 border-dashed border-ew-border rounded-xl px-4 py-4 cursor-pointer hover:border-[#8403C5]/40 hover:bg-[#FAFBFE] transition-colors mb-4">
            <div className="w-9 h-9 bg-[#F3E8FF] rounded-lg flex items-center justify-center shrink-0">
              {file ? <FileText className="w-4 h-4 text-[#8403C5]" /> : <Upload className="w-4 h-4 text-[#8403C5]" />}
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
        )}

        {step === 'confirm' && (
          <div className="flex items-center gap-2 text-sm text-ew-body mb-4">
            <FileText className="w-4 h-4 text-ew-muted" />
            <span className="font-medium">{file?.name}</span>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          {step === 'confirm' ? (
            <>
              <button onClick={() => setStep('form')} disabled={uploading} className="btn-secondary">Back</button>
              <button onClick={handleConfirm} disabled={uploading} className="btn-primary">
                {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> Uploading…</> : 'Confirm & Replace'}
              </button>
            </>
          ) : (
            <>
              <button onClick={onClose} className="btn-secondary">Cancel</button>
              <button
                onClick={() => file && setStep('confirm')}
                disabled={!file}
                className="btn-primary disabled:opacity-40"
              >
                Continue
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}