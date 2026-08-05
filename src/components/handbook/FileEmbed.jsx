import React, { useState, useRef } from 'react';
import { Upload, FileText, Image as ImageIcon, Download, Replace, Trash2, Paperclip } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

function formatSize(bytes) {
  if (!bytes) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isPdf(file) {
  return file.type === 'application/pdf' || file.name?.toLowerCase().endsWith('.pdf');
}

function isImage(file) {
  return file.type?.startsWith('image/') || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(file.name || '');
}

function FileViewer({ file }) {
  if (isPdf(file)) {
    return (
      <iframe
        src={file.url}
        className="w-full rounded-lg border border-ew-border bg-white"
        style={{ height: 600 }}
        title={file.name}
      />
    );
  }
  if (isImage(file)) {
    return (
      <img src={file.url} alt={file.name} className="w-full rounded-lg border border-ew-border" />
    );
  }
  return (
    <a
      href={file.url}
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-2 px-4 py-3 rounded-lg border border-ew-border bg-[#F6F6FB] text-sm text-[#8403C5] hover:bg-[#F3E8FF] transition-colors"
    >
      <Download className="w-4 h-4" /> Download {file.name}
    </a>
  );
}

function fileIcon(file) {
  if (isImage(file)) return ImageIcon;
  if (isPdf(file)) return FileText;
  return Download;
}

export default function FileEmbed({ files, onChange, editing }) {
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [replaceId, setReplaceId] = useState(null);
  const inputRef = useRef(null);

  const fileList = (() => {
    try {
      if (!files) return [];
      return typeof files === 'string' ? JSON.parse(files) : files;
    } catch {
      return [];
    }
  })();

  const updateFiles = (next) => onChange(JSON.stringify(next));

  const doUpload = async (file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateFiles([...fileList, {
        id: `file-${Date.now()}`,
        name: file.name,
        url: file_url,
        type: file.type,
        size: file.size,
        uploadedAt: new Date().toISOString(),
      }]);
    } catch (e) {
      console.error('Upload failed', e);
    } finally {
      setUploading(false);
    }
  };

  const doReplace = async (id, file) => {
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      updateFiles(fileList.map(f => f.id === id
        ? { ...f, name: file.name, url: file_url, type: file.type, size: file.size, uploadedAt: new Date().toISOString() }
        : f));
    } catch (e) {
      console.error('Replace failed', e);
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = Array.from(e.dataTransfer.files);
    if (dropped.length > 0) doUpload(dropped[0]);
  };

  const openPicker = (id = null) => {
    setReplaceId(id);
    inputRef.current?.click();
  };

  const onFileSelected = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    if (replaceId) {
      await doReplace(replaceId, file);
      setReplaceId(null);
    } else {
      await doUpload(file);
    }
  };

  // View mode
  if (!editing) {
    if (fileList.length === 0) return null;
    return (
      <div className="border-t border-ew-border p-6 space-y-6">
        {fileList.map(file => (
          <div key={file.id}>
            <div className="flex items-center gap-2 mb-3 text-xs text-ew-muted flex-wrap">
              <Paperclip className="w-3 h-3 shrink-0" />
              <span className="font-medium text-ew-body">{file.name}</span>
              {file.size ? (<><span>·</span><span>{formatSize(file.size)}</span></>) : null}
              {file.uploadedAt ? (<><span>·</span><span>Uploaded {format(new Date(file.uploadedAt), 'd MMM yyyy')}</span></>) : null}
            </div>
            <FileViewer file={file} />
          </div>
        ))}
      </div>
    );
  }

  // Edit mode
  return (
    <div className="border-t border-ew-border p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-ew-body">Attached files</h3>
        <button
          onClick={() => openPicker(null)}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#8403C5] border border-[#8403C5] rounded-lg hover:bg-[#F3E8FF] disabled:opacity-50 transition-colors"
        >
          <Upload className="w-3 h-3" /> Attach file
        </button>
        <input ref={inputRef} type="file" className="hidden" onChange={onFileSelected} accept="application/pdf,image/*" />
      </div>

      {/* Drag-drop zone */}
      <div
        onDrop={handleDrop}
        onDragOver={e => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${dragOver ? 'border-[#8403C5] bg-[#F3E8FF]' : 'border-ew-border bg-[#F6F6FB]'}`}
      >
        {uploading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-5 h-5 border-2 border-[#8403C5] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-ew-muted">Uploading…</p>
          </div>
        ) : (
          <p className="text-xs text-ew-muted">Drag and drop a file here, or click "Attach file"</p>
        )}
      </div>

      {/* Attached files list */}
      {fileList.map(file => {
        const Icon = fileIcon(file);
        return (
          <div key={file.id} className="flex items-center gap-3 p-3 rounded-lg border border-ew-border bg-[#F6F6FB]">
            <Icon className="w-4 h-4 text-ew-muted shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-ew-body truncate">{file.name}</p>
              <p className="text-xs text-ew-muted">
                {formatSize(file.size)}
                {file.uploadedAt && ` · ${format(new Date(file.uploadedAt), 'd MMM yyyy')}`}
              </p>
            </div>
            <button
              onClick={() => openPicker(file.id)}
              disabled={uploading}
              className="flex items-center gap-1 px-2 py-1 text-xs text-ew-body border border-ew-border rounded hover:bg-white disabled:opacity-50 transition-colors"
            >
              <Replace className="w-3 h-3" /> Replace
            </button>
            <button
              onClick={() => updateFiles(fileList.filter(f => f.id !== file.id))}
              disabled={uploading}
              className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 disabled:opacity-50"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}