import React, { useState } from 'react';
import { Pencil, Check, X, Trash2, ExternalLink, Plus, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { INTERNAL_NAV } from '@/lib/handbookData';
import { useAuth } from '@/lib/AuthContext';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

export default function HandbookLinkPage({ section, page, onUpdate, onDelete, onNavigate }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const [editing, setEditing] = useState(false);
  const [editLinks, setEditLinks] = useState([]);
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleteLinkConfirm, setDeleteLinkConfirm] = useState(null);

  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const startEdit = () => {
    setEditLinks(JSON.parse(JSON.stringify(page.links || [])));
    setTitleDraft(page.title || '');
    setDescDraft(page.description || '');
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate({
      ...page,
      title: titleDraft,
      description: descDraft,
      links: editLinks,
      updatedAt: new Date().toISOString().slice(0, 10),
    });
    setEditing(false);
  };

  const cancelEdit = () => setEditing(false);

  const addLink = () => {
    setEditLinks(prev => [...prev, { id: Date.now(), label: 'New link', url: '', note: '' }]);
  };

  const updateLink = (id, field, val) => {
    setEditLinks(prev => prev.map(l => l.id === id ? { ...l, [field]: val } : l));
  };

  const confirmRemoveLink = (id) => setDeleteLinkConfirm(id);

  const removeLink = () => {
    setEditLinks(prev => prev.filter(l => l.id !== deleteLinkConfirm));
    setDeleteLinkConfirm(null);
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
                    className="text-[14px] italic text-[#6B7280] border-b border-ew-border outline-none bg-transparent w-full"
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
                  <button onClick={startEdit}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#374151] border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
                    <Pencil className="w-3 h-3" /> Edit links
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

        {/* Links area */}
        <div className="bg-white rounded-xl border border-ew-border shadow-sm p-6">
          {editing ? (
            <div className="space-y-3">
              {editLinks.map(link => (
                <div key={link.id} className="border border-ew-border rounded-xl p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      className="flex-1 text-sm border border-ew-border rounded-lg px-2 py-1.5 outline-none focus:border-[#8403C5]"
                      placeholder="Button label"
                      value={link.label}
                      onChange={e => updateLink(link.id, 'label', e.target.value)}
                    />
                    <button onClick={() => confirmRemoveLink(link.id)} className="text-red-400 hover:text-red-600 shrink-0">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                  <input
                    className="w-full text-sm border border-ew-border rounded-lg px-2 py-1.5 outline-none focus:border-[#8403C5]"
                    placeholder="URL (https://…)"
                    value={link.url}
                    onChange={e => updateLink(link.id, 'url', e.target.value)}
                  />
                  <input
                    className="w-full text-xs border border-ew-border rounded-lg px-2 py-1.5 outline-none focus:border-[#8403C5] text-ew-muted"
                    placeholder="Note below button (optional)"
                    value={link.note || ''}
                    onChange={e => updateLink(link.id, 'note', e.target.value)}
                  />
                </div>
              ))}
              <button onClick={addLink}
                className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
                <Plus className="w-3.5 h-3.5" /> Add link button
              </button>
              <div className="flex justify-end gap-2 pt-2 border-t border-ew-border">
                <button onClick={cancelEdit}
                  className="px-4 py-2 text-sm text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
                <button onClick={saveEdit}
                  className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">Save</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {(!page.links || page.links.length === 0) && (
                <div className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-700 mb-3">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  No links added yet — click "Edit links" to add URLs
                </div>
              )}
              {(page.links || []).map(link => (
                <div key={link.id}>
                  {isInternal(link.url) ? (
                    <button
                      onClick={() => handleLinkClick(link.url)}
                      className="w-full flex items-center justify-between px-4 py-3.5 border border-[#8403C5] text-[#8403C5] rounded-xl text-[14px] font-medium hover:bg-[#8403C5] hover:text-white transition-all group"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </button>
                  ) : link.url ? (
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center justify-between px-4 py-3.5 border border-[#8403C5] text-[#8403C5] rounded-xl text-[14px] font-medium hover:bg-[#8403C5] hover:text-white transition-all group"
                    >
                      <span>{link.label}</span>
                      <ExternalLink className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                    </a>
                  ) : (
                    <button
                      disabled
                      className="w-full flex items-center justify-between px-4 py-3.5 border border-ew-border text-[#9CA3AF] rounded-xl text-[14px] cursor-not-allowed opacity-60"
                    >
                      <span>URL not set — click Edit links to add</span>
                      <ExternalLink className="w-4 h-4 opacity-40" />
                    </button>
                  )}
                  {link.note && (
                    <div className={`mt-1.5 flex items-start gap-2 px-3 py-2 rounded-lg text-xs ${link.note.startsWith('⚠️') ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-ew-bg text-ew-muted'}`}>
                      {link.note.startsWith('⚠️') && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />}
                      <span>{link.note.replace(/^⚠️\s*/, '')}</span>
                    </div>
                  )}
                </div>
              ))}

              {page.footerNote && (
                <p className="text-xs text-ew-muted italic pt-2 border-t border-ew-border">{page.footerNote}</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Delete page confirm */}
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

      {/* Delete link confirm */}
      {deleteLinkConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteLinkConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Remove link?</h3>
            <p className="text-sm text-ew-body mb-5">Remove this link button from the page?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteLinkConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={removeLink} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}