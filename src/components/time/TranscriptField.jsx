import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Link, Upload, X, FileText, Download } from 'lucide-react';

/**
 * A shared Transcript input that supports both a URL link and a file upload.
 * Props:
 *   transcriptLink: string
 *   onTranscriptLinkChange: (val: string) => void
 *   transcriptFileUrl: string   (uploaded file URL, stored on the entry)
 *   transcriptFileName: string
 *   onTranscriptFileChange: ({ url, name }) => void
 */
export default function TranscriptField({
  transcriptLink, onTranscriptLinkChange,
  transcriptFileUrl, transcriptFileName, onTranscriptFileChange,
}) {
  const [mode, setMode] = useState(transcriptFileUrl ? 'file' : 'link');
  const [uploading, setUploading] = useState(false);

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onTranscriptFileChange({ url: file_url, name: file.name });
    } catch {}
    setUploading(false);
    e.target.value = '';
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onTranscriptFileChange({ url: file_url, name: file.name });
    } catch {}
    setUploading(false);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em]">
          Transcript <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span>
        </label>
        <div className="flex items-center border border-[#EBEBF5] rounded-md overflow-hidden text-[10px] font-semibold">
          <button
            onClick={() => setMode('link')}
            className={`flex items-center gap-1 px-2 py-0.5 transition-colors ${mode === 'link' ? 'bg-[#8403C5] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}
          >
            <Link className="w-2.5 h-2.5" /> Link
          </button>
          <button
            onClick={() => setMode('file')}
            className={`flex items-center gap-1 px-2 py-0.5 transition-colors ${mode === 'file' ? 'bg-[#8403C5] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}
          >
            <Upload className="w-2.5 h-2.5" /> Upload
          </button>
        </div>
      </div>

      {mode === 'link' ? (
        <input
          type="url"
          value={transcriptLink}
          onChange={e => onTranscriptLinkChange(e.target.value)}
          placeholder="Fireflies, Otter, Google Doc…"
          className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]"
        />
      ) : (
        <div>
          {transcriptFileUrl ? (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#F3E8FF] border border-[#8403C5]/20 rounded-lg">
              <FileText className="w-3.5 h-3.5 text-[#8403C5] shrink-0" />
              <span className="flex-1 text-xs font-medium text-[#242450] truncate">{transcriptFileName || 'Uploaded file'}</span>
              <a href={transcriptFileUrl} target="_blank" rel="noopener noreferrer" className="p-1 hover:bg-[#8403C5]/10 rounded" title="Download">
                <Download className="w-3 h-3 text-[#8403C5]" />
              </a>
              <button onClick={() => onTranscriptFileChange({ url: '', name: '' })} className="p-1 hover:bg-[#FEF2F2] rounded" title="Remove">
                <X className="w-3 h-3 text-[#DC2626]" />
              </button>
            </div>
          ) : (
            <div
              onDrop={handleDrop}
              onDragOver={e => e.preventDefault()}
              className="border-2 border-dashed border-[#D8D8EE] rounded-lg px-4 py-4 text-center hover:border-[#8403C5] transition-colors cursor-pointer relative"
              onClick={() => document.getElementById('transcript-upload').click()}
            >
              {uploading ? (
                <div className="flex items-center justify-center gap-2">
                  <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
                  <span className="text-xs text-[#5777AB]">Uploading…</span>
                </div>
              ) : (
                <>
                  <Upload className="w-4 h-4 text-[#D8D8EE] mx-auto mb-1" />
                  <p className="text-xs text-[#5777AB]">Click or drag &amp; drop</p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">.txt, .pdf, .docx</p>
                </>
              )}
              <input
                id="transcript-upload"
                type="file"
                accept=".txt,.pdf,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}