import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const DEFAULT_NOTE = 'Rotate these into post comments and copy after most posts.';

export default function LeadMagnetsTab() {
  const [items, setItems] = useState([]);
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [editingNote, setEditingNote] = useState(false);
  const [noteDraft, setNoteDraft] = useState(DEFAULT_NOTE);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmId, setConfirmId] = useState(null);
  const [initialized, setInitialized] = useState(false);

  const load = async () => {
    const data = await base44.entities.LeadMagnet.list('created_date', 100);
    if (data.length === 0 && !initialized) {
      await base44.entities.LeadMagnet.bulkCreate([
        { name: 'Budget Health Check', description: '1 min quiz. Reducing time to increase completion rate.', status: 'Active', link: '' },
        { name: 'Event Budget Template', description: 'Direct download for FREE from Gumroad.', status: 'Active', link: '' },
      ]);
      setInitialized(true);
      load();
    } else {
      setItems(data);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const item = await base44.entities.LeadMagnet.create({ name: 'New Lead Magnet', description: '', status: 'Active', link: '' });
    setItems(prev => [...prev, item]);
    setEditId(item.id);
    setEditData({ name: item.name, description: '', status: 'Active', link: '' });
  };

  const startEdit = (item) => { setEditId(item.id); setEditData({ name: item.name, description: item.description || '', status: item.status || 'Active', link: item.link || '' }); };
  const saveEdit = async () => {
    await base44.entities.LeadMagnet.update(editId, editData);
    setEditId(null); load();
  };

  const handleDelete = async (id) => {
    await base44.entities.LeadMagnet.delete(id);
    setConfirmId(null); load();
  };

  const inputCls = "border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none focus:border-[#8403C5] w-full";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      {/* Pinned note */}
      <div className="bg-white rounded-xl border border-gray-200 p-4 mb-5 flex items-start justify-between gap-3">
        {editingNote ? (
          <div className="flex-1 flex items-start gap-2">
            <input className={inputCls} value={noteDraft} onChange={e => setNoteDraft(e.target.value)} />
            <button onClick={() => { setNote(noteDraft); setEditingNote(false); }} className="text-green-500 hover:text-green-700 mt-1"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingNote(false)} className="text-gray-400 hover:text-gray-600 mt-1"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic flex-1">{note}</p>
        )}
        {!editingNote && <button onClick={() => { setNoteDraft(note); setEditingNote(true); }} className="text-gray-300 hover:text-gray-600 shrink-0"><Pencil className="w-3.5 h-3.5" /></button>}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold text-gray-900">Lead Magnets</h2>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3]">
          <Plus className="w-4 h-4" /> Add Lead Magnet
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Name</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Description</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Link</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Status</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                {editId === item.id ? (
                  <>
                    <td className="px-3 py-2"><input className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#8403C5] w-full" value={editData.name} onChange={e => setEditData(p => ({...p, name: e.target.value}))} /></td>
                    <td className="px-3 py-2"><input className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#8403C5] w-full" value={editData.description} onChange={e => setEditData(p => ({...p, description: e.target.value}))} /></td>
                    <td className="px-3 py-2"><input className="border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#8403C5] w-full" value={editData.link} onChange={e => setEditData(p => ({...p, link: e.target.value}))} /></td>
                    <td className="px-3 py-2">
                      <select className="border border-gray-200 rounded px-2 py-1 text-xs outline-none" value={editData.status} onChange={e => setEditData(p => ({...p, status: e.target.value}))}>
                        <option>Active</option><option>Paused</option>
                      </select>
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditId(null)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.name}</td>
                    <td className="px-4 py-2.5 text-gray-500 text-xs max-w-xs">{item.description || '—'}</td>
                    <td className="px-4 py-2.5">
                      {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="text-[#8403C5] hover:underline text-xs">Open ↗</a> : <span className="text-gray-400 text-xs italic">Link TBC</span>}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${item.status === 'Active' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#FEF9C3] text-[#A16207]'}`}>{item.status || 'Active'}</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => startEdit(item)} className="p-1 text-gray-300 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setConfirmId(item.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {confirmId && <ConfirmDialog onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  );
}