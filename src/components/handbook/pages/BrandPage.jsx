import React, { useState } from 'react';
import { Pencil, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactQuill from 'react-quill';
import { useAuth } from '@/lib/AuthContext';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

const DEFAULT_CONTENT = `
<h2>Brand Assets</h2>
<p>Link to brand assets folder (Canva / Google Drive): <a href="#" target="_blank">Add link here</a></p>

<h2>Colours</h2>
<ul>
  <li><strong>Navy</strong> — #242450 (primary brand colour)</li>
  <li><strong>Purple</strong> — #8403C5 (accent / CTA)</li>
  <li><strong>Steel Blue</strong> — #5777AB</li>
  <li><strong>Green</strong> — #1D9E75</li>
  <li><strong>Off-white</strong> — #F6F6FB (backgrounds)</li>
</ul>

<h2>Typography</h2>
<p><strong>Primary font:</strong> DM Sans. <strong>Fallback:</strong> Arial. Usage: DM Sans for all headings and body text. Never use serif fonts.</p>

<h2>Logo</h2>
<ul>
  <li><strong>White version</strong> — use on dark/navy backgrounds</li>
  <li><strong>Dark version</strong> — use on light/white backgrounds</li>
</ul>
<p>CSS dark mode conversion: filter: brightness(0) invert(1)</p>

<h2>Tone of Voice</h2>
<p><strong>Direct. Warm. Honest. Not corporate. Not salesy. Always specific over vague.</strong></p>
<p><strong>Avoid:</strong> ecosystem, stakeholders, scalable solutions, game-changing, exciting, passionate about</p>
<p><strong>Use:</strong> Real numbers, Specific scenarios, Plain language, Industry-specific context</p>
`.trim();

export default function BrandPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayHtml = page.richContent || DEFAULT_CONTENT;
  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const startEdit = () => {
    setDraft(displayHtml);
    setTitleDraft(page.title || '');
    setDescDraft(page.description || '');
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate({ ...page, richContent: draft, title: titleDraft, description: descDraft, updatedAt: new Date().toISOString().slice(0, 10) });
    setEditing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs text-ew-muted mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {editing ? titleDraft : page.title}
        </p>

        <div className="bg-white rounded-xl border border-ew-border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editing ? (
                <>
                  <input autoFocus
                    className="text-xl font-bold text-navy border-b-2 border-[#8403C5] outline-none bg-transparent w-full mb-2"
                    value={titleDraft} onChange={e => setTitleDraft(e.target.value)} placeholder="Page title…" />
                  <input
                    className="text-sm text-ew-muted border-b border-ew-border outline-none bg-transparent w-full"
                    value={descDraft} onChange={e => setDescDraft(e.target.value)} placeholder="Add a description…" />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-navy mb-1">{page.title}</h1>
                  {page.description ? <p className="text-sm text-ew-muted">{page.description}</p> : <p className="text-sm text-ew-muted/40 italic">No description</p>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && !editing && <span className="text-[11px] text-ew-muted hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>}
              {canEdit && (editing ? (
                <>
                  <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]"><Check className="w-3 h-3" /> Save</button>
                  <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg"><X className="w-3 h-3" /> Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg"><Pencil className="w-3 h-3" /> Edit</button>
                  <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ew-border overflow-hidden">
          {editing ? (
            <div className="handbook-quill">
              <ReactQuill theme="snow" value={draft} onChange={setDraft} modules={QUILL_MODULES} formats={QUILL_FORMATS} placeholder="Write content here…" style={{ minHeight: 320 }} />
            </div>
          ) : (
            <div className="p-6 prose prose-sm max-w-none handbook-content" dangerouslySetInnerHTML={{ __html: displayHtml }} />
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete page?</h3>
            <p className="text-sm text-ew-body mb-5">Delete <strong>{page.title}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={onDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}