import React, { useState, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Upload, X, FileText, Image, Film, FileSpreadsheet, File, AlertCircle } from 'lucide-react';

const ACCEPTED_TYPES = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp,.mp4,.mov,.zip,.csv';
const ACCEPTED_MIME = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png','image/jpeg','image/gif','image/webp',
  'video/mp4','video/quicktime',
  'application/zip','application/x-zip-compressed',
  'text/csv','application/csv',
];
const MAX_FILE_MB = 50;
const MAX_TOTAL_MB = 200;

function getFileIcon(name) {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (['png','jpg','jpeg','gif','webp'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
  if (['mp4','mov'].includes(ext)) return <Film className="w-4 h-4 text-purple-500" />;
  if (['xls','xlsx','csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  if (['pdf','doc','docx'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

function formatBytes(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

/**
 * MultiFileUpload — reusable drag-and-drop multi-file uploader.
 *
 * Props:
 *   files       — array of {name, url, size, uploadedAt} (controlled)
 *   onChange    — (newFiles) => void — called after upload/remove
 *   label       — optional label string
 *   disabled    — bool
 */
export default function MultiFileUpload({ files = [], onChange, label = 'Files', disabled = false }) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const validateFile = (file) => {
    const sizeMB = file.size / (1024 * 1024);
    if (sizeMB > MAX_FILE_MB) return `${file.name} exceeds ${MAX_FILE_MB}MB limit`;
    if (!ACCEPTED_MIME.includes(file.type) && file.type !== '') {
      const ext = file.name.split('.').pop().toLowerCase();
      const allowedExts = ACCEPTED_TYPES.split(',').map(t => t.replace('.',''));
      if (!allowedExts.includes(ext)) return `${file.name}: unsupported file type`;
    }
    return null;
  };

  const processFiles = useCallback(async (rawFiles) => {
    const fileList = Array.from(rawFiles);
    const errs = [];
    const valid = [];

    // Check total
    const currentTotalMB = files.reduce((s, f) => s + (f.size || 0), 0) / (1024 * 1024);
    const newTotalMB = fileList.reduce((s, f) => s + f.size / (1024 * 1024), 0);
    if (currentTotalMB + newTotalMB > MAX_TOTAL_MB) {
      errs.push(`Total upload size would exceed ${MAX_TOTAL_MB}MB limit`);
      setErrors(errs);
      return;
    }

    for (const file of fileList) {
      const err = validateFile(file);
      if (err) { errs.push(err); continue; }
      valid.push(file);
    }

    setErrors(errs);
    if (valid.length === 0) return;

    setUploading(true);
    const newEntries = [];
    for (let i = 0; i < valid.length; i++) {
      setProgress(Math.round(((i) / valid.length) * 100));
      const file = valid[i];
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      newEntries.push({
        name: file.name,
        url: file_url,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      });
    }
    setProgress(100);
    setTimeout(() => { setProgress(0); setUploading(false); }, 500);
    onChange([...files, ...newEntries]);
  }, [files, onChange]);

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    processFiles(e.dataTransfer.files);
  };

  const handleInputChange = (e) => {
    if (e.target.files?.length) processFiles(e.target.files);
    e.target.value = '';
  };

  const removeFile = (idx) => {
    const updated = files.filter((_, i) => i !== idx);
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {/* Drop zone */}
      <div
        className={`relative border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${dragging ? 'border-[#8403C5] bg-[#F3E8FF]' : 'border-ew-border hover:border-[#8403C5]/40 bg-white'}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !disabled && !uploading && inputRef.current?.click()}
      >
        <div className="flex flex-col items-center justify-center gap-1.5 py-5 px-4">
          <Upload className={`w-5 h-5 ${dragging ? 'text-[#8403C5]' : 'text-ew-muted'}`} />
          <p className="text-sm font-medium text-ew-body">Drop files here or <span className="text-[#8403C5] hover:underline">click to browse</span></p>
          <p className="text-xs text-ew-muted">PDF, DOC, DOCX, XLS, XLSX, PNG, JPG, GIF, WEBP, MP4, MOV, ZIP, CSV · Max {MAX_FILE_MB}MB per file</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_TYPES}
          className="hidden"
          onChange={handleInputChange}
          disabled={disabled || uploading}
        />
      </div>

      {/* Progress bar */}
      {uploading && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-[#8403C5] rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
      {uploading && (
        <p className="text-xs text-ew-muted">Uploading… {progress}%</p>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((e, i) => (
            <div key={i} className="flex items-center gap-1.5 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-1.5">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />
              {e}
            </div>
          ))}
        </div>
      )}

      {/* File list */}
      {files.length > 0 && (
        <div className="space-y-1.5">
          {files.map((file, idx) => (
            <div key={idx} className="flex items-center gap-2.5 bg-[#F7F8FC] border border-ew-border rounded-lg px-3 py-2 group">
              <div className="shrink-0">{getFileIcon(file.name)}</div>
              <div className="flex-1 min-w-0">
                <a
                  href={file.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-navy hover:text-[#8403C5] hover:underline truncate block"
                >
                  {file.name}
                </a>
                <div className="flex items-center gap-2 text-[11px] text-ew-muted">
                  {file.size ? <span>{formatBytes(file.size)}</span> : null}
                  {file.uploadedAt ? (
                    <span>· {new Date(file.uploadedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                  ) : null}
                </div>
              </div>
              {!disabled && (
                <button
                  onClick={() => removeFile(idx)}
                  className="shrink-0 p-1 rounded text-ew-muted hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                  title="Remove file"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}