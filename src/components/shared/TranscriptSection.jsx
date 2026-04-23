import React, { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import {
  ChevronDown, ChevronRight, Upload, FileText, File, Trash2,
  ChevronUp, Sparkles, RotateCcw, X, Plus, Eye, EyeOff
} from 'lucide-react';
import { format } from 'date-fns';

const ACCEPTED = '.txt,.pdf,.docx,.vtt';
const ACCEPTED_MIME = [
  'text/plain', 'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/vtt',
];

const AI_PROMPT = `You are summarising a meeting transcript for a B2B SaaS company called Eventwise. Extract the 3–5 most important points from this transcript — include any decisions made, concerns raised, agreed next steps, and anything the customer success or sales team needs to follow up on. Be concise and use bullet points.\n\n`;

function getIcon(fileType) {
  if (!fileType || fileType === 'text') return <FileText className="w-4 h-4 text-[#8403C5]" />;
  if (fileType === 'pdf') return <FileText className="w-4 h-4 text-red-500" />;
  if (fileType === 'docx') return <FileText className="w-4 h-4 text-blue-500" />;
  if (fileType === 'vtt') return <File className="w-4 h-4 text-amber-500" />;
  return <FileText className="w-4 h-4 text-[#8403C5]" />;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

function fmtDate(d) {
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

/**
 * TranscriptSection — reusable meeting transcript log.
 *
 * Props:
 *   transcripts   — array of transcript objects (controlled)
 *   onChange      — (newTranscripts) => void — called whenever transcripts change
 */
export default function TranscriptSection({ transcripts = [], onChange }) {
  const [open, setOpen] = useState(transcripts.length > 0);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteTitle, setPasteTitle] = useState('');
  const [pasteText, setPasteText] = useState('');
  const [uploading, setUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [previewing, setPreviewing] = useState({});
  const [summarising, setSummarising] = useState({});
  const fileRef = useRef(null);

  const save = (updated) => onChange(updated);

  // File upload
  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    let content = '';
    const ext = file.name.split('.').pop().toLowerCase();

    // For text/vtt files, read content directly
    if (ext === 'txt' || ext === 'vtt') {
      content = await file.text();
    }

    let fileUrl = null;
    if (ext === 'pdf' || ext === 'docx') {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      fileUrl = file_url;
    }

    const entry = {
      id: Date.now(),
      title: file.name.replace(/\.[^.]+$/, ''),
      date: todayStr(),
      fileType: ext,
      content,
      fileUrl,
      summary: null,
    };
    save([entry, ...transcripts]);
    setUploading(false);
  };

  // Paste save
  const handlePasteSave = () => {
    if (!pasteText.trim()) return;
    const entry = {
      id: Date.now(),
      title: pasteTitle.trim() || `Transcript — ${fmtDate(todayStr())}`,
      date: todayStr(),
      fileType: 'text',
      content: pasteText.trim(),
      fileUrl: null,
      summary: null,
    };
    save([entry, ...transcripts]);
    setPasteTitle('');
    setPasteText('');
    setShowPaste(false);
  };

  // Delete
  const confirmDelete = (id) => setDeleteConfirm(id);
  const doDelete = () => {
    save(transcripts.filter(t => t.id !== deleteConfirm));
    setDeleteConfirm(null);
  };

  // Toggle preview
  const togglePreview = (id) => setPreviewing(p => ({ ...p, [id]: !p[id] }));

  // AI summarise
  const handleSummarise = async (transcript) => {
    const text = transcript.content;
    if (!text) return;
    setSummarising(s => ({ ...s, [transcript.id]: true }));
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: AI_PROMPT + text,
    });
    const updated = transcripts.map(t =>
      t.id === transcript.id ? { ...t, summary: result } : t
    );
    save(updated);
    setSummarising(s => ({ ...s, [transcript.id]: false }));
  };

  // Parse summary bullets
  const parseSummary = (text) => {
    if (!text) return [];
    return text
      .split('\n')
      .map(l => l.replace(/^[-•*]\s*/, '').trim())
      .filter(Boolean);
  };

  return (
    <div className="mt-4 border border-ew-border rounded-xl overflow-hidden">
      {/* Header toggle */}
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-[#F7F8FC] hover:bg-ew-bg transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4 text-ew-muted" /> : <ChevronRight className="w-4 h-4 text-ew-muted" />}
          <span className="text-sm font-semibold text-navy">Meeting Transcripts</span>
          {transcripts.length > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">
              {transcripts.length}
            </span>
          )}
        </div>
      </button>

      {open && (
        <div className="px-4 py-3 space-y-3 bg-white">
          {/* Actions row */}
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ew-border rounded-lg text-ew-body hover:bg-ew-bg transition-colors disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {uploading ? 'Uploading…' : 'Upload file'}
            </button>
            <button
              onClick={() => setShowPaste(v => !v)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ew-border rounded-lg text-ew-body hover:bg-ew-bg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Paste transcript
            </button>
            <input ref={fileRef} type="file" accept={ACCEPTED} className="hidden" onChange={handleFileChange} />
          </div>

          {/* Paste form */}
          {showPaste && (
            <div className="border border-ew-border rounded-xl p-4 space-y-3 bg-[#F7F8FC]">
              <div>
                <label className="block text-[11px] font-medium text-ew-muted mb-1">Title</label>
                <input
                  className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white"
                  placeholder="e.g. Discovery call — 22 Apr 2026"
                  value={pasteTitle}
                  onChange={e => setPasteTitle(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ew-muted mb-1">Transcript text</label>
                <textarea
                  className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white h-36 resize-none"
                  placeholder="Paste your transcript here…"
                  value={pasteText}
                  onChange={e => setPasteText(e.target.value)}
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => { setShowPaste(false); setPasteTitle(''); setPasteText(''); }}
                  className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handlePasteSave}
                  disabled={!pasteText.trim()}
                  className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40"
                >
                  Save
                </button>
              </div>
            </div>
          )}

          {/* Transcript list */}
          {transcripts.length === 0 && !showPaste && (
            <p className="text-sm text-ew-muted italic text-center py-3">No transcripts yet — upload a file or paste text above.</p>
          )}

          <div className="space-y-2">
            {transcripts.map(t => (
              <div key={t.id} className="border border-ew-border rounded-xl overflow-hidden">
                {/* Entry header */}
                <div className="flex items-center gap-2 px-3 py-2.5 bg-[#FAFBFE]">
                  <div className="shrink-0">{getIcon(t.fileType)}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-navy truncate">{t.title}</p>
                    <p className="text-[11px] text-ew-muted">{fmtDate(t.date)} · {t.fileType?.toUpperCase()}</p>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {/* AI Summarise */}
                    {t.content && (
                      <button
                        onClick={() => handleSummarise(t)}
                        disabled={summarising[t.id]}
                        title="AI Summarise"
                        className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#7E22CE] bg-[#F3E8FF] hover:bg-[#E9D5FF] rounded-lg transition-colors disabled:opacity-50"
                      >
                        <Sparkles className="w-3 h-3" />
                        {summarising[t.id] ? '…' : '✨'}
                      </button>
                    )}
                    {/* Preview toggle */}
                    {t.content && (
                      <button
                        onClick={() => togglePreview(t.id)}
                        title={previewing[t.id] ? 'Hide' : 'Preview'}
                        className="p-1.5 text-ew-muted hover:text-navy rounded-lg hover:bg-ew-bg transition-colors"
                      >
                        {previewing[t.id] ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    )}
                    {/* External file link */}
                    {t.fileUrl && (
                      <a
                        href={t.fileUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-ew-muted hover:text-navy rounded-lg hover:bg-ew-bg transition-colors"
                        title="Open file"
                      >
                        <FileText className="w-3.5 h-3.5" />
                      </a>
                    )}
                    {/* Delete */}
                    <button
                      onClick={() => confirmDelete(t.id)}
                      className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Preview */}
                {previewing[t.id] && t.content && (
                  <div className="px-3 py-3 border-t border-ew-border bg-white">
                    <pre className="text-xs text-ew-body whitespace-pre-wrap font-mono max-h-48 overflow-y-auto leading-relaxed">
                      {t.content}
                    </pre>
                  </div>
                )}

                {/* AI Summary */}
                {t.summary && (
                  <div className="px-3 py-3 border-t border-ew-border bg-[#F3E8FF]">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] font-bold text-[#7E22CE] uppercase tracking-[0.12em]">✨ AI Summary</span>
                      <button
                        onClick={() => handleSummarise(t)}
                        disabled={summarising[t.id]}
                        className="flex items-center gap-1 text-[11px] text-[#9CA3AF] hover:text-[#7E22CE] transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        Regenerate
                      </button>
                    </div>
                    <ul className="space-y-1.5">
                      {parseSummary(t.summary).map((bullet, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm text-[#374151]">
                          <span className="text-[#8403C5] mt-0.5 shrink-0">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Delete this transcript?</p>
            <p className="text-xs text-ew-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={doDelete} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}