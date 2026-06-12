import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, X, Check } from 'lucide-react';

const TYPES = ['New Feature', 'Improvement', 'Bug Fix', 'Coming Soon'];
const AFFECTS_OPTIONS = ['Sales', 'Customer Success', 'Operations', 'Marketing', 'Wiki', 'All'];
const ADDED_BY = ['Elena', 'Chris'];

const TYPE_COLORS = {
  'New Feature': 'bg-purple-100 text-purple-700',
  'Improvement': 'bg-blue-100 text-blue-700',
  'Bug Fix': 'bg-green-100 text-green-700',
  'Coming Soon': 'bg-gray-100 text-gray-600',
};

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white dark:bg-[#2A2A3E] dark:border-[#3A3A5E] dark:text-white';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';

const EMPTY = { date: '', type: 'New Feature', title: '', description: '', affects: '[]', addedBy: 'Elena' };

export default function ChangelogAdmin() {
  const [entries, setEntries] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    const data = await base44.entities.ChangelogEntry.list('-created_date');
    setEntries(data);
    setLoaded(true);
  }, []);

  useEffect(() => { load(); }, [load]);

  const toggleAffect = (affect, currentAffectsStr) => {
    try {
      const current = JSON.parse(currentAffectsStr || '[]');
      const updated = current.includes(affect)
        ? current.filter(a => a !== affect)
        : [...current, affect];
      return JSON.stringify(updated);
    } catch { return JSON.stringify([affect]); }
  };

  const addEntry = async () => {
    if (!form.title.trim() || !form.date.trim()) return;
    await base44.entities.ChangelogEntry.create(form);
    setForm(EMPTY);
    setShowForm(false);
    load();
  };

  const startEdit = (entry) => {
    setEditingId(entry.id);
    setEditDraft({ ...entry, affects: entry.affects || '[]' });
  };

  const saveEdit = async () => {
    await base44.entities.ChangelogEntry.update(editingId, editDraft);
    setEditingId(null);
    load();
  };

  const doDelete = async () => {
    await base44.entities.ChangelogEntry.delete(deleteConfirm);
    setDeleteConfirm(null);
    load();
  };

  const AffectsCheckboxes = ({ value, onChange }) => {
    const selected = (() => { try { return JSON.parse(value || '[]'); } catch { return []; } })();
    return (
      <div className="flex flex-wrap gap-2">
        {AFFECTS_OPTIONS.map(a => (
          <label key={a} className="flex items-center gap-1.5 text-xs cursor-pointer">
            <input
              type="checkbox"
              checked={selected.includes(a)}
              onChange={() => onChange(toggleAffect(a, value))}
              className="rounded"
            />
            {a}
          </label>
        ))}
      </div>
    );
  };

  if (!loaded) return <div className="p-8 text-sm text-gray-400">Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F8] dark:bg-[#0F0F1A] p-8 font-dm">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-[#111827] dark:text-white">Changelog Admin</h1>
            <p className="text-sm text-gray-400 mt-0.5">Manage app updates and notifications</p>
          </div>
          <button
            onClick={() => { setShowForm(v => !v); setForm(EMPTY); setEditingId(null); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]"
          >
            <Plus className="w-4 h-4" /> Add Entry
          </button>
        </div>

        {/* New entry form */}
        {showForm && (
          <div className="bg-white dark:bg-[#1E1E2E] border border-gray-200 dark:border-[#2E2E4E] rounded-xl p-5 mb-6 shadow-sm">
            <h3 className="text-sm font-bold text-[#111827] dark:text-white mb-4">New Changelog Entry</h3>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={labelCls}>Date *</label><input className={ic} placeholder="e.g. Jun 2026" value={form.date} onChange={e => setForm(f => ({ ...f, date: e.target.value }))} /></div>
              <div><label className={labelCls}>Type</label>
                <select className={ic} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                  {TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="col-span-2"><label className={labelCls}>Title *</label><input className={ic} placeholder="Short title" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} /></div>
              <div className="col-span-2"><label className={labelCls}>Description</label><textarea className={ic} rows={3} placeholder="What changed..." value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} /></div>
              <div className="col-span-2"><label className={labelCls}>Affects</label><AffectsCheckboxes value={form.affects} onChange={val => setForm(f => ({ ...f, affects: val }))} /></div>
              <div><label className={labelCls}>Added by</label>
                <select className={ic} value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))}>
                  {ADDED_BY.map(a => <option key={a}>{a}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-2 justify-end mt-4">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-[#252535] rounded-lg">Cancel</button>
              <button onClick={addEntry} disabled={!form.title.trim() || !form.date.trim()} className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">Save Entry</button>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="space-y-2">
          {entries.map(entry => {
            const affects = (() => { try { return JSON.parse(entry.affects || '[]'); } catch { return []; } })();
            const isEditing = editingId === entry.id;
            return (
              <div key={entry.id} className="bg-white dark:bg-[#1E1E2E] border border-gray-200 dark:border-[#2E2E4E] rounded-xl p-4">
                {isEditing ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <input className={ic} value={editDraft.date} onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))} placeholder="Date" />
                      <select className={ic} value={editDraft.type} onChange={e => setEditDraft(d => ({ ...d, type: e.target.value }))}>
                        {TYPES.map(t => <option key={t}>{t}</option>)}
                      </select>
                    </div>
                    <input className={ic} value={editDraft.title} onChange={e => setEditDraft(d => ({ ...d, title: e.target.value }))} placeholder="Title" />
                    <textarea className={ic} rows={2} value={editDraft.description} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} placeholder="Description" />
                    <AffectsCheckboxes value={editDraft.affects} onChange={val => setEditDraft(d => ({ ...d, affects: val }))} />
                    <select className={ic} value={editDraft.addedBy} onChange={e => setEditDraft(d => ({ ...d, addedBy: e.target.value }))}>
                      {ADDED_BY.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <div className="flex gap-2 justify-end pt-1">
                      <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-500 hover:bg-gray-100 rounded-lg">Cancel</button>
                      <button onClick={saveEdit} className="px-3 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg"><Check className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${TYPE_COLORS[entry.type] || 'bg-gray-100 text-gray-600'}`}>{entry.type}</span>
                        <span className="text-xs text-gray-400">{entry.date}</span>
                      </div>
                      <p className="text-sm font-semibold text-[#111827] dark:text-white">{entry.title}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{entry.description}</p>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {affects.map(a => <span key={a} className="text-[10px] px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded">{a}</span>)}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => startEdit(entry)} className="p-1.5 text-gray-400 hover:text-[#8403C5] rounded-lg hover:bg-purple-50"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(entry.id)} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          {entries.length === 0 && <p className="text-sm text-gray-400 text-center py-8">No entries yet.</p>}
        </div>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white dark:bg-[#1E1E2E] rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-[#111827] dark:text-white mb-2">Delete entry?</p>
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