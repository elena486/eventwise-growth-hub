import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Trash2, ExternalLink, Pencil, Check, X } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

export default function PRCoverageTab() {
  const [items, setItems] = useState([]);
  const [editId, setEditId] = useState(null);
  const [editData, setEditData] = useState({});
  const [confirmId, setConfirmId] = useState(null);

  const load = () => base44.entities.PRCoverage.list('-date', 200).then(setItems);
  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const item = await base44.entities.PRCoverage.create({ publication: 'New Publication', date: new Date().toISOString().split('T')[0] });
    setItems(prev => [item, ...prev]);
    setEditId(item.id);
    setEditData({ publication: item.publication, date: item.date, headline: '', link: '' });
  };

  const startEdit = (item) => { setEditId(item.id); setEditData({ publication: item.publication, date: item.date, headline: item.headline || '', link: item.link || '' }); };
  const saveEdit = async () => {
    await base44.entities.PRCoverage.update(editId, editData);
    setEditId(null); load();
  };
  const cancelEdit = () => { setEditId(null); load(); };

  const handleDelete = async (id) => {
    await base44.entities.PRCoverage.delete(id);
    setConfirmId(null); load();
  };

  const inputCls = "border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#8403C5] w-full";

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-lg font-bold text-gray-900">PR Coverage</h2>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3]">
          <Plus className="w-4 h-4" /> New PR Coverage
        </button>
      </div>
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Publication</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Date</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Headline</th>
              <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Link</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map(item => (
              <tr key={item.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 cursor-pointer" onClick={() => editId !== item.id && startEdit(item)}>
                {editId === item.id ? (
                  <>
                    <td className="px-3 py-2"><input className={inputCls} value={editData.publication} onChange={e => setEditData(p => ({...p, publication: e.target.value}))} /></td>
                    <td className="px-3 py-2"><input type="date" className={inputCls} value={editData.date} onChange={e => setEditData(p => ({...p, date: e.target.value}))} /></td>
                    <td className="px-3 py-2"><input className={inputCls} value={editData.headline} onChange={e => setEditData(p => ({...p, headline: e.target.value}))} /></td>
                    <td className="px-3 py-2"><input className={inputCls} value={editData.link} onChange={e => setEditData(p => ({...p, link: e.target.value}))} /></td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="p-1 text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{item.publication}</td>
                    <td className="px-4 py-2.5 text-gray-500">{item.date || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-700">{item.headline || '—'}</td>
                    <td className="px-4 py-2.5">
                      {item.link ? <a href={item.link} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-[#8403C5] hover:underline text-xs"><ExternalLink className="w-3 h-3" /> View</a> : <span className="text-gray-400">—</span>}
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
            {items.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-gray-400 italic">No PR coverage yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
      {confirmId && <ConfirmDialog onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />}
    </div>
  );
}