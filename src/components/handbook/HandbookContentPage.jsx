import React, { useState, useEffect } from 'react';
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

export default function HandbookContentPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const startEdit = () => {
    setDraft(page.richContent || (isHtml(page.content) ? page.content : convertToHtml(page.content || '')));
    setTitleDraft(page.title || '');
    setDescDraft(page.description || '');
    setEditing(true);
  };

  // Keyboard shortcut: press E to edit
  useEffect(() => {
    const handler = (e) => {
      if (editing) return;
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (e.key === 'e' || e.key === 'E') { e.preventDefault(); if (canEdit) startEdit(); }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [editing, canEdit]);

  const cancelEdit = () => setEditing(false);

  const saveEdit = () => {
    onUpdate({
      ...page,
      richContent: draft,
      title: titleDraft,
      description: descDraft,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEditing(false);
  };

  // Convert old plain-text content to basic HTML for display
  const displayHtml = page.richContent || (isHtml(page.content) ? page.content : convertToHtml(page.content || ''));

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-xs text-[#9CA3AF] mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {editing ? titleDraft : page.title}
        </p>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-ew-border shadow-sm p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editing ? (
                <>
                  <input
                    autoFocus
                    className="text-2xl font-bold text-[#242450] border-b-2 border-[#8403C5] outline-none bg-transparent w-full mb-2"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    placeholder="Page title…"
                  />
                  <input
                    className="text-sm italic text-[#6B7280] border-b border-ew-border outline-none bg-transparent w-full"
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    placeholder="Add a description…"
                  />
                </>
              ) : (
                <>
                  <h1 className="text-2xl font-bold text-[#242450] mb-1">{page.title}</h1>
                  {page.description
                    ? <p className="text-[14px] italic text-[#6B7280]">{page.description}</p>
                    : <p className="text-[14px] italic text-[#9CA3AF]">No description</p>}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && !editing && (
                <span className="text-[12px] text-[#9CA3AF] hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>
              )}
              {canEdit && (editing ? (
                <>
                  <button onClick={saveEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">
                    <Check className="w-3 h-3" /> Save
                  </button>
                  <button onClick={cancelEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                    <X className="w-3 h-3" /> Cancel
                  </button>
                </>
              ) : (
                <>
                  <button onClick={startEdit} title="Edit (E)"
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#374151] border border-ew-border rounded-lg hover:bg-ew-bg transition-colors group/editbtn">
                    <Pencil className="w-3 h-3" /> Edit
                    <span className="ml-1 text-[10px] text-[#9CA3AF] group-hover/editbtn:text-[#8403C5] font-mono">(E)</span>
                  </button>
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ))}
            </div>
          </div>
          <hr className="border-ew-border mt-4" />
        </div>

        {/* Content area */}
        <div className="bg-white rounded-xl border border-ew-border shadow-sm overflow-hidden">
          {editing ? (
            <div className="handbook-quill">
              <ReactQuill
                theme="snow"
                value={draft}
                onChange={setDraft}
                modules={QUILL_MODULES}
                formats={QUILL_FORMATS}
                placeholder="Write content here…"
                style={{ minHeight: 320 }}
              />
            </div>
          ) : (
            <div
              className="p-6 handbook-content"
              style={{ fontSize: 15, lineHeight: 1.7, color: '#374151' }}
              dangerouslySetInnerHTML={{ __html: displayHtml || '<p style="color:#9CA3AF;font-style:italic;font-size:14px">No content yet — click Edit to add some.</p>' }}
            />
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

// Detect if content is already HTML
function isHtml(text) {
  return text && /<[a-z][\s\S]*>/i.test(text);
}

// Convert old plain-text format to basic HTML
function convertToHtml(text) {
  if (!text) return '';
  return text
    .split('\n')
    .map(line => {
      if (!line.trim()) return '';
      // Bold **text**
      const bolded = line.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
      // Auto-link
      const linked = bolded.replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer">$1</a>');
      return `<p>${linked}</p>`;
    })
    .join('');
}