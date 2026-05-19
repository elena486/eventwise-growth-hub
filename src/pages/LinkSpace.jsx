import React, { useState } from 'react';
import { ExternalLink, Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const CATEGORIES = ['Booking', 'Calendar', 'Sales', 'CS', 'Marketing', 'Other'];
const OWNERS = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David', 'Shared'];
const CATEGORY_COLORS = {
  Booking: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Calendar: 'bg-[#F3E8FF] text-[#7E22CE]',
  Sales: 'bg-[#DCFCE7] text-[#15803D]',
  CS: 'bg-[#FEF9C3] text-[#A16207]',
  Marketing: 'bg-[#FEE2E2] text-[#B91C1C]',
  Other: 'bg-[#F3F4F6] text-[#6B7280]',
};

const INITIAL_LINKS = [
  { id: 1, name: "Chris's Calendar / Booking Link", url: '', category: 'Booking', owner: 'Chris', description: 'Book a meeting with Chris', visibility: 'Everyone' },
];

const EMPTY_FORM = { name: '', url: '', category: 'Booking', owner: 'Shared', description: '', visibility: 'Everyone' };

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';

function canEdit(user) {
  if (!user) return false;
  const name = (user.full_name || '').toLowerCase();
  const email = (user.email || '').toLowerCase();
  return name.includes('chris') || name.includes('elena') || email.includes('chris') || email.includes('elena') || user.role === 'admin';
}

export default function LinkSpace({ user }) {
  const [links, setLinks] = useState(INITIAL_LINKS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [filterCat, setFilterCat] = useState('All');

  const editable = canEdit(user);

  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = links.filter(l =>
      (filterCat === 'All' || l.category === cat) &&
      l.category === cat &&
      (l.visibility === 'Everyone' || editable)
    );
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});

  const addLink = () => {
    if (!form.name.trim()) return;
    setLinks(prev => [...prev, { ...form, id: Date.now() }]);
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const startEdit = (link) => { setEditingId(link.id); setEditDraft({ ...link }); };
  const saveEdit = () => {
    setLinks(prev => prev.map(l => l.id === editingId ? { ...editDraft } : l));
    setEditingId(null);
  };

  const confirmDelete = (id) => setDeleteConfirm(id);
  const doDelete = () => {
    setLinks(prev => prev.filter(l => l.id !== deleteConfirm));
    setDeleteConfirm(null);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F8] p-8 font-dm">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-7 flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">🔗 Link Space</h1>
            <p className="text-sm text-gray-400 mt-0.5">Central directory of shared team links — booking pages, calendars, and more</p>
          </div>
          <div className="flex items-center gap-2">
            <select
              className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 focus:outline-none"
              value={filterCat}
              onChange={e => setFilterCat(e.target.value)}
            >
              <option value="All">All Categories</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
            {editable && (
              <button
                onClick={() => { setShowForm(v => !v); setEditingId(null); }}
                className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-[#242450] text-white rounded-lg hover:bg-[#1a1a3a] transition-colors"
              >
                <Plus className="w-4 h-4" /> Add Link
              </button>
            )}
          </div>
        </div>

        {/* Add Form */}
        {showForm && editable && (
          <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#242450] mb-4">New Link</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2"><label className={labelCls}>Name *</label><input className={ic} placeholder="e.g. Chris's Calendly" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
              <div className="col-span-2"><label className={labelCls}>URL *</label><input className={ic} placeholder="https://..." value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
              <div><label className={labelCls}>Category</label>
                <select className={ic} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div><label className={labelCls}>Owner</label>
                <select className={ic} value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}>
                  {OWNERS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className={labelCls}>Description</label><input className={ic} placeholder="Short description of what this link is for…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div><label className={labelCls}>Visibility</label>
                <select className={ic} value={form.visibility} onChange={e => setForm(f => ({ ...f, visibility: e.target.value }))}>
                  <option value="Everyone">Everyone</option>
                  <option value="Admin only">Admin only</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={addLink} disabled={!form.name.trim()} className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">Save Link</button>
            </div>
          </div>
        )}

        {/* Grouped Cards */}
        {Object.keys(grouped).length === 0 ? (
          <div className="text-center py-16 border border-dashed border-gray-200 rounded-xl bg-white">
            <p className="text-4xl mb-3">🔗</p>
            <p className="text-sm text-gray-400">No links yet — add the first one above.</p>
          </div>
        ) : (
          Object.entries(grouped).map(([cat, items]) => (
            <div key={cat} className="mb-8">
              <div className="flex items-center gap-2 mb-3">
                <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[cat]}`}>{cat}</span>
                <span className="text-xs text-gray-400">{items.length} link{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {items.map(link => (
                  <div key={link.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:border-gray-300 hover:shadow-sm transition-all group">
                    {editingId === link.id ? (
                      <div className="space-y-2">
                        <input className={ic} placeholder="Name" value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                        <input className={ic} placeholder="URL" value={editDraft.url} onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <select className={ic} value={editDraft.category} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))}>
                            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                          </select>
                          <select className={ic} value={editDraft.owner} onChange={e => setEditDraft(d => ({ ...d, owner: e.target.value }))}>
                            {OWNERS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </div>
                        <input className={ic} placeholder="Description" value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} />
                        <select className={ic} value={editDraft.visibility} onChange={e => setEditDraft(d => ({ ...d, visibility: e.target.value }))}>
                          <option value="Everyone">Everyone</option>
                          <option value="Admin only">Admin only</option>
                        </select>
                        <div className="flex gap-2 justify-end pt-1">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button onClick={saveEdit} className="px-3 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]"><Check className="w-3.5 h-3.5" /></button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-[#111827] text-sm leading-tight">{link.name}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{link.owner} · {link.visibility === 'Admin only' ? '🔒 Admin only' : 'Everyone'}</p>
                          </div>
                          {editable && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                              <button onClick={() => startEdit(link)} className="p-1.5 text-gray-400 hover:text-[#8403C5] rounded-lg hover:bg-purple-50"><Pencil className="w-3.5 h-3.5" /></button>
                              <button onClick={() => confirmDelete(link.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                            </div>
                          )}
                        </div>
                        {link.description && <p className="text-xs text-gray-500 mb-3 leading-relaxed">{link.description}</p>}
                        {link.url ? (
                          <a
                            href={link.url.startsWith('http') ? link.url : `https://${link.url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold bg-[#242450] text-white rounded-lg hover:bg-[#1a1a3a] transition-colors"
                          >
                            Open <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium bg-gray-100 text-gray-400 rounded-lg italic">
                            No URL set yet
                          </span>
                        )}
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Delete confirm modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#111827] mb-2">Delete this link?</p>
            <p className="text-xs text-gray-400 mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}