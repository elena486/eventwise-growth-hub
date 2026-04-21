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
    setDraft(page.richContent || convertToHtml(page.content || ''));
    setTitleDraft(page.title || '');
    setDescDraft(page.description || '');
    setEditing(true);
  };

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
  const displayHtml = page.richContent || convertToHtml(page.content || '');

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-xs text-ew-muted mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {editing ? titleDraft : page.title}
        </p>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-ew-border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editing ? (
                <>
                  <input
                    autoFocus
                    className="text-xl font-bold text-navy border-b-2 border-[#8403C5] outline-none bg-transparent w-full mb-2"
                    value={titleDraft}
                    onChange={e => setTitleDraft(e.target.value)}
                    placeholder="Page title…"
                  />
                  <input
                    className="text-sm text-ew-muted border-b border-ew-border outline-none bg-transparent w-full"
                    value={descDraft}
                    onChange={e => setDescDraft(e.target.value)}
                    placeholder="Add a description…"
                  />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-navy mb-1">{page.title}</h1>
                  {page.description && <p className="text-sm text-ew-muted">{page.description}</p>}
                  {!page.description && <p className="text-sm text-ew-muted/40 italic">No description</p>}
                </>
              )}
            </div>

            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && !editing && (
                <span className="text-[11px] text-ew-muted hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>
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
                  <button onClick={startEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                    <Pencil className="w-3 h-3" /> Edit
                  </button>
                  <button onClick={() => setConfirmDelete(true)}
                    className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </>
              ))}
            </div>
          </div>
        </div>

        {/* Content area */}
        <div className="bg-white rounded-xl border border-ew-border overflow-hidden">
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
              className="p-6 prose prose-sm max-w-none handbook-content"
              dangerouslySetInnerHTML={{ __html: displayHtml || '<p class="text-ew-muted italic text-sm">No content yet — click Edit to add some.</p>' }}
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