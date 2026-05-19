import React, { useState, useRef, useCallback } from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Upload, FileText, Image, Film, FileSpreadsheet, File, X, Download, AlertCircle } from 'lucide-react';
import { PRIORITY_STYLES, STATUS_STYLES, CATEGORY_STYLES } from './requestStyles';
import InlineCell from '@/components/shared/InlineCell';
import { base44 } from '@/api/base44Client';

const STATUSES = ['New', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
const CATEGORIES = ['Marketing', 'Design', 'Content', 'Ops', 'Tech', 'Other', 'Self'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const ACCEPTED = '.pdf,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov,.zip,.csv,.xls,.xlsx';
const MAX_MB = 50;

function getFileIcon(name = '') {
  const ext = name.split('.').pop().toLowerCase();
  if (['png', 'jpg', 'jpeg'].includes(ext)) return <Image className="w-4 h-4 text-blue-500" />;
  if (['mp4', 'mov'].includes(ext)) return <Film className="w-4 h-4 text-purple-500" />;
  if (['xls', 'xlsx', 'csv'].includes(ext)) return <FileSpreadsheet className="w-4 h-4 text-green-600" />;
  if (['pdf', 'doc', 'docx'].includes(ext)) return <FileText className="w-4 h-4 text-red-500" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

function formatBytes(bytes) {
  if (!bytes) return '';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Parse attachments — stored as JSON string in attachmentUrl field, or legacy single url
function parseAttachments(request) {
  const raw = request.attachmentUrl;
  if (!raw) return [];
  // Try JSON array first
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
  } catch {}
  // Legacy: single url
  return [{ url: raw, name: request.attachmentName || 'Attachment', size: null, uploadedAt: null }];
}

function AttachmentZone({ request, onUpdate }) {
  const [attachments, setAttachments] = useState(() => parseAttachments(request));
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [removeConfirm, setRemoveConfirm] = useState(null);
  const inputRef = useRef(null);

  const persist = useCallback(async (updated) => {
    const serialized = JSON.stringify(updated);
    await base44.entities.Request.update(request.id, {
      attachmentUrl: serialized,
      attachmentName: updated.length > 0 ? updated[0].name : '',
    });
    onUpdate({ ...request, attachmentUrl: serialized, attachmentName: updated.length > 0 ? updated[0].name : '' });
  }, [request, onUpdate]);

  const uploadFile = async (file) => {
    if (file.size > MAX_MB * 1024 * 1024) {
      setError(`Upload failed — "${file.name}" exceeds the ${MAX_MB}MB limit.`);
      return;
    }
    setError('');
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const entry = { url: file_url, name: file.name, size: file.size, uploadedAt: new Date().toISOString() };
      const updated = [...attachments, entry];
      setAttachments(updated);
      await persist(updated);
    } catch {
      setError('Upload failed — please check the file size and try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleFiles = (files) => {
    Array.from(files).forEach(uploadFile);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  const doRemove = async (idx) => {
    const updated = attachments.filter((_, i) => i !== idx);
    setAttachments(updated);
    setRemoveConfirm(null);
    await persist(updated);
  };

  return (
    <div className="space-y-3">
      {/* Drop zone */}
      <div
        className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer
          ${dragging ? 'border-[#8403C5] bg-[#F3E8FF]' : 'border-ew-border hover:border-[#8403C5]/40 bg-[#FAFBFE]'}
          ${uploading ? 'opacity-60 pointer-events-none' : ''}`}
        onDragOver={e => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
      >
        <div className="flex flex-col items-center gap-1.5 py-5 px-4">
          <Upload className={`w-5 h-5 ${dragging ? 'text-[#8403C5]' : 'text-ew-muted'}`} />
          <p className="text-sm font-medium text-ew-body">
            {uploading ? 'Uploading…' : <>Drop files here or <span className="text-[#8403C5]">click to browse</span></>}
          </p>
          <p className="text-xs text-ew-muted">PDF, DOC, DOCX, PNG, JPG, MP4, MOV, ZIP, CSV, XLS, XLSX · Max {MAX_MB}MB</p>
        </div>
        <input ref={inputRef} type="file" multiple accept={ACCEPTED} className="hidden" onChange={e => { handleFiles(e.target.files); e.target.value = ''; }} />
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-xs text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0" /> {error}
        </div>
      )}

      {/* File list */}
      {attachments.length > 0 && (
        <div className="space-y-1.5">
          {attachments.map((f, idx) => (
            <div key={idx} className="flex items-center gap-2.5 bg-white border border-ew-border rounded-lg px-3 py-2 group">
              <div className="shrink-0">{getFileIcon(f.name)}</div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-navy truncate">{f.name}</p>
                <div className="flex items-center gap-2 text-[11px] text-ew-muted">
                  {f.size ? <span>{formatBytes(f.size)}</span> : null}
                  {f.uploadedAt ? <span>· {format(new Date(f.uploadedAt), 'd MMM yyyy')}</span> : null}
                </div>
              </div>
              <a href={f.url} target="_blank" rel="noopener noreferrer" download
                className="shrink-0 p-1.5 rounded text-ew-muted hover:text-[#8403C5] hover:bg-purple-50 transition-all" title="Download">
                <Download className="w-3.5 h-3.5" />
              </a>
              <button onClick={() => setRemoveConfirm(idx)}
                className="shrink-0 p-1.5 rounded text-ew-muted hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all" title="Remove">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Remove confirm */}
      {removeConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setRemoveConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-2">Remove this attachment?</p>
            <p className="text-xs text-ew-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setRemoveConfirm(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={() => doRemove(removeConfirm)} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RequestDetail({ request, onBack, onUpdate }) {
  const save = (field) => async (value) => {
    await base44.entities.Request.update(request.id, { [field]: value });
    onUpdate({ ...request, [field]: value });
  };

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to board
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-ew-muted font-medium mb-1">#{request.requestNumber}</p>
          <h2 className="text-xl font-bold text-navy">{request.title}</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[request.priority]}`}>{request.priority}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[request.status]}`}>{request.status}</span>
        </div>
      </div>

      <div className="bg-white border border-ew-border rounded-xl divide-y divide-ew-border mb-6">
        <Row label="Title"><InlineCell value={request.title} onSave={save('title')} className="text-sm text-navy font-semibold" /></Row>
        <Row label="Requested by"><InlineCell value={request.requestedBy} onSave={save('requestedBy')} className="text-sm text-ew-body" /></Row>
        <Row label="Category">
          <InlineCell value={request.category} onSave={save('category')} type="select" options={CATEGORIES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[request.category] || 'bg-gray-100 text-gray-600'}`}>{request.category}</span>} />
        </Row>
        <Row label="Priority">
          <InlineCell value={request.priority} onSave={save('priority')} type="select" options={PRIORITIES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[request.priority]}`}>{request.priority}</span>} />
        </Row>
        <Row label="Status">
          <InlineCell value={request.status} onSave={save('status')} type="select" options={STATUSES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[request.status]}`}>{request.status}</span>} />
        </Row>
        <Row label="Deadline"><InlineCell value={request.deadline || ''} onSave={save('deadline')} type="date" displayEl={<span className="text-sm text-ew-body">{request.deadline ? format(new Date(request.deadline), 'd MMM yyyy') : '—'}</span>} /></Row>
        <Row label="Submitted">{request.submittedAt ? format(new Date(request.submittedAt), 'd MMM yyyy, HH:mm') : '—'}</Row>
        <Row label="Description">
          <InlineCell value={request.description} onSave={save('description')} type="textarea"
            displayEl={<p className="text-sm text-ew-body whitespace-pre-wrap">{request.description || <span className="text-ew-muted italic">No description</span>}</p>} />
        </Row>
        <Row label="Extra context">
          <InlineCell value={request.extraNotes} onSave={save('extraNotes')} type="textarea"
            displayEl={<p className="text-sm text-ew-body whitespace-pre-wrap">{request.extraNotes || <span className="text-ew-muted italic">None</span>}</p>} />
        </Row>
        <Row label="Notes">
          <InlineCell value={request.notes} onSave={save('notes')} type="textarea" placeholder="Add notes…"
            displayEl={request.notes ? <p className="text-sm text-ew-body whitespace-pre-wrap">{request.notes}</p> : null} />
        </Row>
      </div>

      {/* Attachments */}
      <div className="bg-white border border-ew-border rounded-xl p-5">
        <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-3">Attachments</p>
        <AttachmentZone request={request} onUpdate={onUpdate} />
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="px-5 py-4 flex items-start gap-6">
      <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide w-32 shrink-0 pt-0.5">{label}</p>
      <div className="flex-1 min-w-0 text-sm text-ew-body">{children}</div>
    </div>
  );
}