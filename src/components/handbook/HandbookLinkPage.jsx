import React, { useState } from 'react';
import { Pencil, Check, X, Trash2, ExternalLink, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { INTERNAL_NAV } from '@/lib/handbookData';

export default function HandbookLinkPage({ section, page, onUpdate, onDelete, onNavigate }) {
  const [editing, setEditing] = useState(false);
  const [editLinks, setEditLinks] = useState([]);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const startEdit = () => { setEditLinks(JSON.parse(JSON.stringify(page.links || []))); setEditing(true); };

  const saveEdit = () => {
    onUpdate({ ...page, links: editLinks, updatedAt: new Date().toISOString().slice(0, 10) });
    setEditing(false);
  };

  const saveTitle = () => { onUpdate({ ...page, title: titleDraft }); setEditingTitle(false); };
  const saveDesc = () => { onUpdate({ ...page, description: descDraft }); setEditingDesc(false); };

  const addLink = () => {
    setEditLinks(prev => [...prev, { id: Date.now(), label: 'New link', url: '', note: '' }]);
  };

  const updateLink = (id, field, val) => {
    setEditLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const removeLink = (id) => {
    setEditLinks(prev => prev.filter(l => l.id !== id));
  };

  const addQuickLink = () => {
    const newLink = { id: Date.now(), label: 'New link', url: '', note: '' };
    const updated = { ...page, links: [...(page.links || []), newLink], updatedAt: new Date().toISOString().slice(0, 10) };
    onUpdate(updated);
  };

  const isInternal = (url) => url?.startsWith('internal:');

  const handleLinkClick = (url) => {
    if (isInternal(url)) {
      const nav = INTERNAL_NAV[url];
      if (nav && onNavigate) onNavigate(nav.tab);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        {/* Breadcrumb */}
        <p className="text-xs text-ew-muted mb-4">{section.label.replace(/^[^\w]+/, '').trim()} › {page.title}</p>

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
                  <p className="text-sm text-ew-muted">{page.description || <span className="italic text-ew-muted/50">Add a description…</span>}</p>
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
              {!editing && (
                <button onClick={startEdit}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                  <Pencil className="w-3 h-3" /> Edit links
                </button>
              )}
              <button onClick={() => setConfirmDelete(true)}
                className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Links area */}
        <div className="bg-white rounded-xl border border-ew-border p-6">
          {editing ? (
            <div className="space-y-3">
              {editLinks.map(link => (
                <div key={link.id} className="border border-ew-border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 text-sm border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5]"
                      placeholder="Button label"
                      value={link.label}
                      onChange={e => updateLink(link.id, 'label', e.target.value)}
                    />
                    <button onClick={() => removeLink(link.id)} className="text-red-400 hover:text-red-600">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    className="w-full text-sm border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5]"
                    placeholder="URL (https://…)"
                    value={link.url}
                    onChange={e => updateLink(link.id, 'url', e.target.value)}
                  />
                  <input
                    className="w-full text-xs border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5] text-ew-muted"
                    placeholder="Note below button (optional)"
                    value={link.note}
                    onChange={e => updateLink(link.id, 'note', e.target.value)}
                  />
                </div>
              ))}
              <button onClick={addLink}
                className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add link
              </button>
              <div className="flex justify-end gap-2 pt-2 border-t border-ew-border">
                <button onClick={() => setEditing(false)}
                  className="px-4 py-2 text-sm text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
                <button onClick={saveEdit}
                  className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {(page.links || []).map(link => (
                <div key={link.id}>
                  {isInternal(link.url) ? (
                    <button
                      onClick={() => handleLinkClick(link.url)}
                      className="flex items-center gap-2 px-5 py-3 border-2 border-[#8403C5] text-[#8403C5] rounded-lg text-sm font-semibold hover:bg-[#8403C5] hover:text-white transition-all w-full sm:w-auto"
                    >
                      {link.label}
                    </button>
                  ) : link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-5 py-3 border-2 border-[#8403C5] text-[#8403C5] rounded-lg text-sm font-semibold hover:bg-[#8403C5] hover:text-white transition-all"
                    >
                      <ExternalLink className="w-4 h-4" /> {link.label}
                    </a>
                  ) : (
                    <button
                      onClick={startEdit}
                      className="inline-flex items-center gap-2 px-5 py-3 border-2 border-dashed border-ew-border text-ew-muted rounded-lg text-sm hover:border-[#8403C5] hover:text-[#8403C5] transition-all"
                    >
                      <Plus className="w-4 h-4" /> {link.label} — click to add URL
                    </button>
                  )}
                  {link.note && (
                    <div className={`mt-2 flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${link.note.startsWith('⚠️') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-ew-bg text-ew-muted'}`}>
                      {link.note.startsWith('⚠️') && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      <span>{link.note.replace(/^⚠️\s*/, '')}</span>
                    </div>
                  )}
                </div>
              ))}

              {page.footerNote && (
                <p className="text-xs text-ew-muted italic pt-2 border-t border-ew-border">{page.footerNote}</p>
              )}

              {page.allowAddLinks && (
                <button
                  onClick={addQuickLink}
                  className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline mt-2"
                >
                  <Plus className="w-3.5 h-3.5" /> Add link
                </button>
              )}

              {(!page.links || page.links.length === 0) && (
                <button onClick={startEdit} className="text-sm text-ew-muted italic hover:text-[#8403C5]">
                  No links yet — click "Edit links" to add some.
                </button>
              )}
            </div>
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