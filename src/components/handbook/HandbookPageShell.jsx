import React, { useState } from 'react';
import { Pencil, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

/**
 * Shared shell for custom handbook pages.
 * Handles: breadcrumb, title edit, description edit, updated timestamp, delete confirm.
 * Children = the main content area body.
 */
export default function HandbookPageShell({ section, page, onUpdate, onDelete, children }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const saveTitle = () => { onUpdate({ ...page, title: titleDraft }); setEditingTitle(false); };
  const saveDesc = () => { onUpdate({ ...page, description: descDraft }); setEditingDesc(false); };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs text-ew-muted mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {page.title}
        </p>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-ew-border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editingTitle ? (
                <div className="flex items-center gap-2 mb-2">
                  <input autoFocus
                    className="text-xl font-bold text-navy border-b-2 border-[#8403C5] outline-none bg-transparent flex-1"
                    value={titleDraft} onChange={e => setTitleDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false); }}
                  />
                  <button onClick={saveTitle} className="text-green-500"><Check className="w-4 h-4" /></button>
                  <button onClick={() => setEditingTitle(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group mb-2">
                  <h1 className="text-xl font-bold text-navy">{page.title}</h1>
                  <button onClick={() => { setTitleDraft(page.title); setEditingTitle(true); }}
                    className="opacity-0 group-hover:opacity-100 text-ew-muted hover:text-navy transition-opacity">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
              {editingDesc ? (
                <div className="flex items-center gap-2">
                  <input autoFocus
                    className="text-sm text-ew-muted border-b border-ew-border outline-none bg-transparent flex-1"
                    value={descDraft} onChange={e => setDescDraft(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') saveDesc(); if (e.key === 'Escape') setEditingDesc(false); }}
                  />
                  <button onClick={saveDesc} className="text-green-500"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditingDesc(false)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
                </div>
              ) : (
                <div className="flex items-center gap-2 group">
                  <p className="text-sm text-ew-muted">
                    {page.description || <span className="italic text-ew-muted/50">Add a description…</span>}
                  </p>
                  <button onClick={() => { setDescDraft(page.description || ''); setEditingDesc(true); }}
                    className="opacity-0 group-hover:opacity-100 text-ew-muted hover:text-navy transition-opacity">
                    <Pencil className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && (
                <span className="text-[11px] text-ew-muted hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>
              )}
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-xl border border-ew-border p-6">
          {children}
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