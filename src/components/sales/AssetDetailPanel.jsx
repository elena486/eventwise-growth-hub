import React, { useState, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Pencil, Plus, Trash2, Copy, Check, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { STATUS_STYLES, TYPE_ICONS, TYPE_COLORS } from '@/pages/SalesAssets';
import { File } from 'lucide-react';

const MAX_EMAILS = 3;

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function EmailCard({ email, index, onUpdate, onDelete }) {
  const [editing, setEditing] = useState(!email.subject && !email.body);
  const [draft, setDraft] = useState({ label: email.label, subject: email.subject, body: email.body });
  const [copiedFull, setCopiedFull] = useState(false);
  const [copiedBody, setCopiedBody] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = () => {
    onUpdate({ ...email, ...draft });
    setEditing(false);
  };

  const copyFull = () => {
    const text = `Subject: ${email.subject || ''}\n\n${email.body || ''}`;
    navigator.clipboard.writeText(text);
    setCopiedFull(true);
    setTimeout(() => setCopiedFull(false), 2000);
  };

  const copyBody = () => {
    navigator.clipboard.writeText(email.body || '');
    setCopiedBody(true);
    setTimeout(() => setCopiedBody(false), 2000);
  };

  return (
    <div className="border border-[#E5E7EB] rounded-xl overflow-hidden bg-white">
      {/* Card header */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
        {editing ? (
          <input
            className="text-xs font-semibold text-[#374151] bg-transparent border-b border-[#8403C5] focus:outline-none w-32"
            value={draft.label}
            onChange={e => setDraft(d => ({ ...d, label: e.target.value }))}
            placeholder={`Version ${index + 1}`}
          />
        ) : (
          <span className="text-xs font-semibold text-[#374151]">{email.label || `Version ${index + 1}`}</span>
        )}
        <div className="flex items-center gap-1">
          {!editing && (
            <button onClick={() => { setDraft({ label: email.label, subject: email.subject, body: email.body }); setEditing(true); }}
              className="p-1 rounded text-[#9CA3AF] hover:text-[#374151] transition-colors" title="Edit">
              <Pencil className="w-3 h-3" />
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1 ml-1">
              <span className="text-[10px] text-[#6B7280]">Delete?</span>
              <button onClick={onDelete} className="text-[10px] font-semibold text-red-600 hover:underline px-1">Yes</button>
              <button onClick={() => setConfirmDelete(false)} className="text-[10px] text-[#9CA3AF] hover:underline px-1">No</button>
            </div>
          ) : (
            <button onClick={() => setConfirmDelete(true)} className="p-1 rounded text-[#9CA3AF] hover:text-red-500 transition-colors" title="Delete">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Card body */}
      <div className="p-4 space-y-3">
        {editing ? (
          <>
            <div>
              <label className="block text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">Subject line</label>
              <input
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
                value={draft.subject}
                onChange={e => setDraft(d => ({ ...d, subject: e.target.value }))}
                placeholder="Subject…"
              />
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">Email body</label>
              <textarea
                className="w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] resize-none"
                rows={8}
                value={draft.body}
                onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                placeholder="Hi [First name],&#10;&#10;..."
              />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setEditing(false)} className="px-3 py-1.5 text-xs font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg transition-colors">Cancel</button>
              <button onClick={save} className="px-4 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors">Save</button>
            </div>
          </>
        ) : (
          <>
            {email.subject && (
              <div>
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">Subject</p>
                <p className="text-xs font-medium text-[#374151]">{email.subject}</p>
              </div>
            )}
            {email.body ? (
              <div>
                <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">Body</p>
                <p className="text-xs text-[#374151] whitespace-pre-wrap leading-relaxed max-h-40 overflow-y-auto">{email.body}</p>
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF] italic">No content yet — click the pencil to add.</p>
            )}
            {/* Copy buttons */}
            <div className="flex items-center gap-2 pt-1 border-t border-[#F3F4F6]">
              <button onClick={copyFull}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${copiedFull ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F3E8FF] text-[#8403C5] hover:bg-[#EDE9FE]'}`}>
                {copiedFull ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedFull ? 'Copied!' : 'Copy email'}
              </button>
              <button onClick={copyBody}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${copiedBody ? 'bg-emerald-50 text-emerald-700' : 'bg-[#F9FAFB] text-[#6B7280] hover:bg-[#F3F4F6] border border-[#E5E7EB]'}`}>
                {copiedBody ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                {copiedBody ? 'Copied!' : 'Copy body only'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AssetDetailPanel({ asset, onClose, onUpdated, onEdit }) {
  const Icon = TYPE_ICONS[asset.type] || File;

  const getEmails = useCallback(() => {
    try {
      const parsed = JSON.parse(asset.emailExamples || '[]');
      return Array.isArray(parsed) ? parsed : [];
    } catch { return []; }
  }, [asset.emailExamples]);

  const [emails, setEmailsState] = useState(getEmails);

  const saveEmails = async (updated) => {
    setEmailsState(updated);
    const str = JSON.stringify(updated);
    await base44.entities.SalesAsset.update(asset.id, { emailExamples: str });
    onUpdated({ ...asset, emailExamples: str });
  };

  const addEmail = () => {
    if (emails.length >= MAX_EMAILS) return;
    const newEmail = {
      id: Date.now().toString(),
      label: `Version ${emails.length + 1}`,
      subject: '',
      body: '',
    };
    saveEmails([...emails, newEmail]);
  };

  const updateEmail = (id, updated) => {
    saveEmails(emails.map(e => e.id === id ? updated : e));
  };

  const deleteEmail = (id) => {
    saveEmails(emails.filter(e => e.id !== id));
  };

  const hasLink = asset.url || (asset.fileUrl && !asset.fileUrl.includes('monday.com/protected_static'));

  return (
    <div className="fixed inset-0 z-40 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-[560px] max-w-full h-full bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1 flex-wrap">
                <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[asset.type] || 'bg-gray-100 text-gray-600'}`}>
                  <Icon className="w-3 h-3" />
                  {asset.type}
                </span>
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>{asset.status}</span>
              </div>
              <h2 className="text-lg font-bold text-[#111827] leading-tight">{asset.title}</h2>
              {asset.addedBy && <p className="text-xs text-[#9CA3AF] mt-0.5">Added by {asset.addedBy}{asset.lastUpdated ? ` · Updated ${fmtDate(asset.lastUpdated)}` : ''}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button onClick={onEdit} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151] transition-colors" title="Edit asset">
                <Pencil className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151] transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {/* Asset details */}
          {asset.notes && (
            <div>
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1.5">Notes</p>
              <p className="text-sm text-[#374151] leading-relaxed">{asset.notes}</p>
            </div>
          )}

          {/* Links */}
          <div className="flex items-center gap-3 flex-wrap">
            {asset.url && (
              <a href={asset.url} target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-sm font-medium text-[#8403C5] hover:underline">
                🔗 Open link
              </a>
            )}
            {asset.fileUrl && !asset.fileUrl.includes('monday.com/protected_static') && (
              (() => {
                try {
                  const files = JSON.parse(asset.fileUrl);
                  if (Array.isArray(files)) return files.map((f, i) => (
                    <a key={i} href={f.url} target="_blank" rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-sm font-medium text-[#374151] hover:text-[#8403C5]">
                      📎 {f.name || 'Download'}
                    </a>
                  ));
                } catch {}
                return (
                  <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-[#374151] hover:text-[#8403C5]">
                    📎 {asset.fileName || 'Download file'}
                  </a>
                );
              })()
            )}
            {!hasLink && (
              <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                ⚠ No link added
              </span>
            )}
          </div>

          <hr className="border-[#F3F4F6]" />

          {/* Email Examples section */}
          <div>
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <Mail className="w-4 h-4 text-[#8403C5]" />
                  <h3 className="text-sm font-bold text-[#111827]">Email Examples</h3>
                </div>
                <p className="text-xs text-[#9CA3AF]">Copy and paste these when sending this asset to prospects.</p>
              </div>
              <button
                onClick={addEmail}
                disabled={emails.length >= MAX_EMAILS}
                title={emails.length >= MAX_EMAILS ? 'Maximum 3 versions per asset.' : 'Add email version'}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors shrink-0 ${
                  emails.length >= MAX_EMAILS
                    ? 'bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed'
                    : 'bg-[#8403C5] text-white hover:bg-[#6d02a3]'
                }`}
              >
                <Plus className="w-3 h-3" /> Add email version
              </button>
            </div>

            {emails.length === 0 ? (
              <div className="mt-4 border border-dashed border-[#E5E7EB] rounded-xl flex flex-col items-center justify-center py-10 text-center">
                <Mail className="w-8 h-8 text-[#D1D5DB] mb-2" />
                <p className="text-sm font-medium text-[#9CA3AF]">No email examples yet</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5 mb-3">Add up to 3 ready-to-send email templates for this asset.</p>
                <button onClick={addEmail} className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors">
                  <Plus className="w-3 h-3" /> Add first version
                </button>
              </div>
            ) : (
              <div className="mt-3 space-y-3">
                {emails.map((email, i) => (
                  <EmailCard
                    key={email.id}
                    email={email}
                    index={i}
                    onUpdate={(updated) => updateEmail(email.id, updated)}
                    onDelete={() => deleteEmail(email.id)}
                  />
                ))}
                {emails.length < MAX_EMAILS && (
                  <button onClick={addEmail}
                    className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 text-xs font-semibold text-[#8403C5] border border-dashed border-[#8403C5]/40 rounded-xl hover:bg-[#F9F5FF] transition-colors">
                    <Plus className="w-3 h-3" /> Add email version
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}