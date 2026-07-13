import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Upload, Download, Trash2, FileText, X, AlertTriangle } from 'lucide-react';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const ACCEPTED = '.pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document';

function fmtDate(iso) {
  try { return format(new Date(iso), 'd MMM yyyy'); } catch { return iso; }
}

function fileIcon(name) {
  if (name?.toLowerCase().endsWith('.pdf')) return '📄';
  if (name?.toLowerCase().endsWith('.docx')) return '📝';
  return '📎';
}

export default function ContractDocuments({ client, onUpdated }) {
  const [uploading, setUploading] = useState(false);
  const [uploadedBy, setUploadedBy] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null); // file id to confirm
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const docs = (() => {
    try { return JSON.parse(client.contractDocuments || '[]'); } catch { return []; }
  })();

  const saveDocs = async (updated) => {
    await base44.entities.Client.update(client.id, { contractDocuments: JSON.stringify(updated) });
    onUpdated({ ...client, contractDocuments: JSON.stringify(updated) });
  };

  const handleFiles = async (files) => {
    if (!files?.length) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      const ext = file.name.split('.').pop().toLowerCase();
      if (!['pdf', 'docx'].includes(ext)) continue;
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const newDoc = {
        id: Date.now() + Math.random(),
        name: file.name,
        url: file_url,
        uploadedAt: new Date().toISOString(),
        uploadedBy: uploadedBy || 'Unknown',
      };
      // Re-fetch latest docs to avoid stale state in loop
      const latest = await base44.entities.Client.get(client.id);
      const existing = (() => { try { return JSON.parse(latest.contractDocuments || '[]'); } catch { return []; } })();
      await saveDocs([...existing, newDoc]);
    }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDelete = async (id) => {
    const updated = docs.filter(d => d.id !== id);
    await saveDocs(updated);
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.14em]">
          {docs.length} document{docs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Uploader */}
      <div className="mb-5 space-y-3">
        <div className="flex items-center gap-2">
          <label className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] whitespace-nowrap">Uploaded by</label>
          <select
            className="text-sm border border-[#E5E7EB] rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white"
            value={uploadedBy}
            onChange={e => setUploadedBy(e.target.value)}
          >
            <option value="">Select name…</option>
            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>

        <div
          className={`border-2 border-dashed rounded-xl p-6 text-center transition-colors cursor-pointer ${
            dragOver ? 'border-[#8403C5] bg-[#F3E8FF]/40' : 'border-[#E5E7EB] hover:border-[#8403C5]/50 hover:bg-[#F9FAFB]'
          } ${!uploadedBy ? 'opacity-50 pointer-events-none' : ''}`}
          onClick={() => uploadedBy && inputRef.current?.click()}
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
        >
          {uploading ? (
            <div className="flex flex-col items-center gap-2">
              <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
              <p className="text-sm text-[#6B7280]">Uploading…</p>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Upload className="w-6 h-6 text-[#9CA3AF]" />
              <p className="text-sm font-medium text-[#374151]">
                {dragOver ? 'Drop to upload' : 'Drag & drop or click to browse'}
              </p>
              <p className="text-xs text-[#9CA3AF]">PDF or DOCX only</p>
              {!uploadedBy && <p className="text-xs text-amber-600 font-medium">Select "Uploaded by" first</p>}
            </div>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED}
          className="hidden"
          onChange={e => handleFiles(e.target.files)}
        />
      </div>

      {/* Document list */}
      {docs.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-[#E5E7EB] rounded-xl">
          <FileText className="w-8 h-8 text-[#D1D5DB] mx-auto mb-2" />
          <p className="text-sm text-[#9CA3AF]">No documents uploaded yet.</p>
          <p className="text-xs text-[#9CA3AF] mt-1">Upload the signed contract or any amendments here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docs.map(doc => (
            <div key={doc.id} className="flex items-center gap-3 border border-[#E5E7EB] rounded-xl px-4 py-3 bg-white hover:border-[#8403C5]/30 transition-colors group">
              <span className="text-xl shrink-0">{fileIcon(doc.name)}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-[#111827] truncate">{doc.name}</p>
                <p className="text-xs text-[#9CA3AF]">
                  {fmtDate(doc.uploadedAt)}{doc.uploadedBy ? ` · ${doc.uploadedBy}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  download={doc.name}
                  className="p-1.5 text-[#9CA3AF] hover:text-[#8403C5] hover:bg-[#F3E8FF] rounded-lg transition-colors"
                  title="Download"
                >
                  <Download className="w-4 h-4" />
                </a>
                <button
                  onClick={() => setDeleteConfirm(doc.id)}
                  className="p-1.5 text-[#9CA3AF] hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <AlertTriangle className="w-5 h-5 text-red-500 shrink-0" />
              <h3 className="text-base font-bold text-[#111827]">Delete this document?</h3>
            </div>
            <p className="text-sm text-[#6B7280] mb-5">
              <strong>{docs.find(d => d.id === deleteConfirm)?.name}</strong> will be permanently removed.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}