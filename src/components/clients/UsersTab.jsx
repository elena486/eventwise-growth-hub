import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, X, Mail, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';

const EW_USER_STYLES = {
  'Yes': 'bg-[#DCFCE7] text-[#15803D]',
  'No': 'bg-[#F3F4F6] text-[#6B7280]',
  'Invite Pending': 'bg-[#FEF9C3] text-[#A16207]',
};

const EW_USER_OPTIONS = ['Yes', 'No', 'Invite Pending'];
const CATEGORY_SUGGESTIONS = ['Director', 'Bookkeeper', 'Ticket Manager', 'Cost Manager'];

const ic = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';

function fmtDate(d) {
  if (!d) return '—';
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch { return d; }
}

const EMPTY_ROW = {
  full_name: '',
  email_address: '',
  job_title: '',
  ew_user: 'No',
  ew_user_category: '',
  last_active: '',
  notes: '',
};

export default function UsersTab({ client }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [newRow, setNewRow] = useState({ ...EMPTY_ROW });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(null);
  const [sortKey, setSortKey] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await base44.entities.ClientUser.filter({ clientId: client.id });
      setUsers(rows);
    } catch { setUsers([]); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [client.id]);

  // Realtime subscription
  useEffect(() => {
    const unsub = base44.entities.ClientUser.subscribe((event) => {
      if (event.type === 'create' && event.data?.clientId === client.id) {
        setUsers(prev => prev.some(u => u.id === event.data.id) ? prev : [event.data, ...prev]);
      } else if (event.type === 'update' && event.data?.clientId === client.id) {
        setUsers(prev => prev.map(u => u.id === event.data.id ? event.data : u));
      } else if (event.type === 'update' && event.data?.clientId !== client.id) {
        setUsers(prev => prev.filter(u => u.id !== event.data.id));
      } else if (event.type === 'delete') {
        setUsers(prev => prev.filter(u => u.id !== event.id));
      }
    });
    return unsub;
  }, [client.id]);

  const summary = useMemo(() => {
    const total = users.length;
    const active = users.filter(u => u.ew_user === 'Yes').length;
    const pending = users.filter(u => u.ew_user === 'Invite Pending').length;
    return { total, active, pending };
  }, [users]);

  const sorted = useMemo(() => {
    const arr = [...users];
    arr.sort((a, b) => {
      let av, bv;
      if (sortKey === 'last_active') {
        av = a.last_active || '';
        bv = b.last_active || '';
        // empty last_active sorts last when asc
        if (!av && bv) return 1;
        if (av && !bv) return -1;
      } else if (sortKey === 'ew_user_category') {
        av = (a.ew_user_category || '').toLowerCase();
        bv = (b.ew_user_category || '').toLowerCase();
      } else {
        av = (a[sortKey] || '').toLowerCase();
        bv = (b[sortKey] || '').toLowerCase();
      }
      if (av < bv) return sortDir === 'asc' ? -1 : 1;
      if (av > bv) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [users, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const sortIcon = (key) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 text-[#9CA3AF] opacity-40" />;
    return sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-[#8403C5]" /> : <ArrowDown className="w-3 h-3 text-[#8403C5]" />;
  };

  const handleAdd = async () => {
    if (!newRow.full_name.trim()) return;
    const created = await base44.entities.ClientUser.create({
      ...newRow,
      clientId: client.id,
      clientName: client.name,
    });
    setUsers(prev => [created, ...prev]);
    setAdding(false);
    setNewRow({ ...EMPTY_ROW });
  };

  const startEdit = (u) => {
    setEditingId(u.id);
    setEditDraft({ ...u });
  };

  const saveEdit = async () => {
    if (!editDraft?.full_name?.trim()) return;
    await base44.entities.ClientUser.update(editDraft.id, {
      full_name: editDraft.full_name,
      email_address: editDraft.email_address,
      job_title: editDraft.job_title,
      ew_user: editDraft.ew_user,
      ew_user_category: editDraft.ew_user_category,
      last_active: editDraft.last_active,
      notes: editDraft.notes,
    });
    setUsers(prev => prev.map(u => u.id === editDraft.id ? editDraft : u));
    setEditingId(null);
    setEditDraft(null);
  };

  const handleDelete = async () => {
    await base44.entities.ClientUser.delete(deleteId);
    setUsers(prev => prev.filter(u => u.id !== deleteId));
    setDeleteId(null);
  };

  return (
    <div>
      {/* Summary line */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#374151]">
          <span className="font-bold text-[#111827]">{summary.total}</span> user{summary.total !== 1 ? 's' : ''}
          {' · '}
          <span className="font-semibold text-[#15803D]">{summary.active} active</span>
          {' · '}
          <span className="font-semibold text-[#A16207]">{summary.pending} invite pending</span>
        </p>
        {!adding && (
          <button onClick={() => setAdding(true)}
            className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] px-3 py-1.5 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add user
          </button>
        )}
      </div>

      {/* Add row */}
      {adding && (
        <div className="border border-[#8403C5]/30 rounded-xl p-4 mb-3 bg-[#FAFBFF]">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Full name *</label>
              <input className={ic} autoFocus value={newRow.full_name} onChange={e => setNewRow(r => ({ ...r, full_name: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input className={ic} type="email" value={newRow.email_address} onChange={e => setNewRow(r => ({ ...r, email_address: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Job title</label>
              <input className={ic} value={newRow.job_title} onChange={e => setNewRow(r => ({ ...r, job_title: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>EW user</label>
              <select className={ic} value={newRow.ew_user} onChange={e => setNewRow(r => ({ ...r, ew_user: e.target.value }))}>
                {EW_USER_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Category</label>
              <input className={ic} list="ew-category-suggestions-add" value={newRow.ew_user_category} onChange={e => setNewRow(r => ({ ...r, ew_user_category: e.target.value }))} placeholder="e.g. Director" />
              <datalist id="ew-category-suggestions-add">
                {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
              </datalist>
            </div>
            <div>
              <label className={labelCls}>Last active</label>
              <input type="date" className={ic} value={newRow.last_active} onChange={e => setNewRow(r => ({ ...r, last_active: e.target.value }))} />
            </div>
          </div>
          <div className="mt-3">
            <label className={labelCls}>Notes</label>
            <input className={ic} value={newRow.notes} onChange={e => setNewRow(r => ({ ...r, notes: e.target.value }))} />
          </div>
          <div className="flex justify-end gap-2 mt-3">
            <button onClick={() => { setAdding(false); setNewRow({ ...EMPTY_ROW }); }} className="px-3 py-1.5 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg">Cancel</button>
            <button onClick={handleAdd} disabled={!newRow.full_name.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-50 transition-colors">Add</button>
          </div>
        </div>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-24"><div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>
      ) : sorted.length === 0 && !adding ? (
        <div className="text-center py-10 border border-dashed border-[#E5E7EB] rounded-xl">
          <p className="text-sm text-[#6B7280] mb-2">No users added yet.</p>
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add first user
          </button>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <tr>
                  <th onClick={() => handleSort('full_name')} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] cursor-pointer hover:text-[#374151] select-none whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Name {sortIcon('full_name')}</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">Email</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">Job title</th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">EW user</th>
                  <th onClick={() => handleSort('ew_user_category')} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] cursor-pointer hover:text-[#374151] select-none whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Category {sortIcon('ew_user_category')}</span>
                  </th>
                  <th onClick={() => handleSort('last_active')} className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] cursor-pointer hover:text-[#374151] select-none whitespace-nowrap">
                    <span className="inline-flex items-center gap-1">Last active {sortIcon('last_active')}</span>
                  </th>
                  <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">Notes</th>
                  <th className="px-3 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => (
                  <tr key={u.id} className={`border-b border-[#F3F4F6] hover:bg-[#FAFBFF] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    {editingId === u.id ? (
                      <>
                        <td className="px-4 py-2"><input className={ic} value={editDraft.full_name} onChange={e => setEditDraft(d => ({ ...d, full_name: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={ic} type="email" value={editDraft.email_address} onChange={e => setEditDraft(d => ({ ...d, email_address: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={ic} value={editDraft.job_title} onChange={e => setEditDraft(d => ({ ...d, job_title: e.target.value }))} /></td>
                        <td className="px-4 py-2">
                          <select className={ic} value={editDraft.ew_user} onChange={e => setEditDraft(d => ({ ...d, ew_user: e.target.value }))}>
                            {EW_USER_OPTIONS.map(o => <option key={o}>{o}</option>)}
                          </select>
                        </td>
                        <td className="px-4 py-2">
                          <input className={ic} list="ew-category-suggestions-edit" value={editDraft.ew_user_category || ''} onChange={e => setEditDraft(d => ({ ...d, ew_user_category: e.target.value }))} />
                          <datalist id="ew-category-suggestions-edit">
                            {CATEGORY_SUGGESTIONS.map(c => <option key={c} value={c} />)}
                          </datalist>
                        </td>
                        <td className="px-4 py-2"><input type="date" className={ic} value={editDraft.last_active || ''} onChange={e => setEditDraft(d => ({ ...d, last_active: e.target.value }))} /></td>
                        <td className="px-4 py-2"><input className={ic} value={editDraft.notes || ''} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} /></td>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <div className="flex items-center gap-1">
                            <button onClick={saveEdit} className="px-2 py-1 text-xs font-semibold text-white bg-[#8403C5] rounded hover:bg-[#7002A8] transition-colors">Save</button>
                            <button onClick={() => { setEditingId(null); setEditDraft(null); }} className="px-2 py-1 text-xs font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded transition-colors">Cancel</button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-2.5 font-semibold text-[#111827] whitespace-nowrap">{u.full_name}</td>
                        <td className="px-4 py-2.5 text-[#374151]">
                          {u.email_address ? (
                            <a href={`mailto:${u.email_address}`} className="inline-flex items-center gap-1 hover:text-[#8403C5] transition-colors">
                              <Mail className="w-3 h-3 text-[#9CA3AF]" /> <span className="truncate max-w-[180px]">{u.email_address}</span>
                            </a>
                          ) : '—'}
                        </td>
                        <td className="px-4 py-2.5 text-[#374151]">{u.job_title || '—'}</td>
                        <td className="px-4 py-2.5">
                          {u.ew_user && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${EW_USER_STYLES[u.ew_user]}`}>{u.ew_user}</span>}
                        </td>
                        <td className="px-4 py-2.5 text-[#374151]">{u.ew_user_category || '—'}</td>
                        <td className="px-4 py-2.5 text-[#374151] whitespace-nowrap">{fmtDate(u.last_active)}</td>
                        <td className="px-4 py-2.5 text-[#6B7280] max-w-[200px] truncate" title={u.notes || ''}>{u.notes || '—'}</td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          <div className="flex items-center gap-1 opacity-0 hover:opacity-100 group-hover:opacity-100" style={{ opacity: 1 }}>
                            <button onClick={() => startEdit(u)} className="px-2 py-1 text-xs font-medium text-[#5777AB] hover:text-[#8403C5] rounded transition-colors">Edit</button>
                            <button onClick={() => setDeleteId(u.id)} className="p-1 text-[#9CA3AF] hover:text-[#DC2626] rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827] mb-2">Remove user?</h3>
            <p className="text-sm text-[#374151] mb-5">This will permanently remove this user from the client record. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C] transition-colors">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}