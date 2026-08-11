import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, Loader2, FileText, AlertCircle, Sparkles } from 'lucide-react';

const ACCEPT = '.pdf,.docx,.doc,.png,.jpg,.jpeg,.webp';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB

export default function UploadReportModal({ onClose, onExtracted }) {
  const [file, setFile] = useState(null); // { name, size, uploadedUrl }
  const [uploading, setUploading] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const handleFile = async (f) => {
    if (!f) return;
    setError('');
    if (f.size > MAX_BYTES) {
      setError('File is too large (25 MB max).');
      return;
    }
    setFile({ name: f.name, size: f.size, uploadedUrl: null });
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: f });
      setFile(prev => ({ ...prev, uploadedUrl: file_url }));
    } catch (e) {
      setError('Upload failed: ' + (e.message || 'unknown error'));
      setFile(null);
    }
    setUploading(false);
  };

  const handleExtract = async () => {
    if (!file?.uploadedUrl) { setError('File is still uploading…'); return; }
    setExtracting(true);
    setError('');
    try {
      const res = await base44.functions.invoke('extractMarketingReport', { file_url: file.uploadedUrl });
      const data = res.data;
      if (!data || data.error) throw new Error(data?.error || 'Extraction failed');
      if (!data.success) throw new Error('Extraction failed');
      onExtracted({
        ...data.extracted,
        sourceFileUrl: file.uploadedUrl,
        sourceFileName: file.name,
      });
    } catch (e) {
      setError('AI extraction failed: ' + (e.message || 'unknown error') + '. You can still close and create the report manually.');
    }
    setExtracting(false);
  };

  const fmtSize = (b) => {
    if (b < 1024) return b + ' B';
    if (b < 1024 * 1024) return (b / 1024).toFixed(1) + ' KB';
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#8403C5]" />
            <h2 className="text-base font-bold text-[#242450]">Upload existing report</h2>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700 rounded"><X className="w-5 h-5" /></button>
        </div>

        {/* Body */}
        <div className="px-6 py-5">
          <p className="text-sm text-gray-500 mb-4">
            Upload an old marketing report (PDF, Word, or image) and AI will read it and pre-fill a new Monthly Report. You'll review everything before it's saved.
          </p>

          {!file ? (
            <div
              className={`w-full h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-2 text-center p-4 cursor-pointer transition-colors ${dragOver ? 'border-[#8403C5] bg-purple-50/50' : 'border-gray-300 hover:border-[#8403C5]/50 hover:bg-gray-50'}`}
              onClick={() => inputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
            >
              <Upload className="w-7 h-7 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Click to upload or drag & drop</p>
              <p className="text-xs text-gray-400">PDF, DOCX, or image — up to 25 MB</p>
            </div>
          ) : (
            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-[#8403C5]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{file.name}</p>
                <p className="text-xs text-gray-400">{fmtSize(file.size)} {file.uploadedUrl ? '· uploaded' : uploading ? '· uploading…' : '· waiting'}</p>
              </div>
              <button onClick={() => { setFile(null); setError(''); }} className="p-1 text-gray-400 hover:text-red-500 rounded">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={e => handleFile(e.target.files[0])} />

          {error && (
            <div className="mt-3 flex items-start gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {extracting && (
            <div className="mt-3 flex items-center gap-2 text-sm text-[#8403C5]">
              <Loader2 className="w-4 h-4 animate-spin" /> Reading the document with AI… this can take 20–30 seconds.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-gray-100 bg-gray-50">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">Cancel</button>
          <button
            onClick={handleExtract}
            disabled={!file?.uploadedUrl || uploading || extracting}
            className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {extracting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {extracting ? 'Extracting…' : 'Extract with AI'}
          </button>
        </div>
      </div>
    </div>
  );
}