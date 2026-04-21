import React, { useState } from 'react';
import { Pencil, Trash2, Plus, Check, X, ExternalLink } from 'lucide-react';
import HandbookPageShell from '../HandbookPageShell';
import { useAuth } from '@/lib/AuthContext';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

const STATUS_STYLES = {
  Active:     'bg-green-50 text-green-700 border-green-200',
  Cancelling: 'bg-amber-50 text-amber-700 border-amber-200',
  Cancelled:  'bg-gray-100 text-gray-500 border-gray-200',
};

const DEFAULT_TOOLS = [
  { id: 1,  tool: 'Eventwise HQ (Base44)', what: 'Internal ops platform — all modules',                           owner: 'Elena',        status: 'Active',     url: '' },
  { id: 2,  tool: 'Apollo.io',             what: 'Outbound CRM, sequences, contact database',                    owner: 'George / Chris', status: 'Active',    url: 'https://apollo.io' },
  { id: 3,  tool: 'Framer',                what: 'Website (eventwise.com)',                                      owner: 'Elena',        status: 'Active',     url: 'https://framer.com' },
  { id: 4,  tool: 'GitHub Pages',          what: 'HTML sales deck + client deck embedded in Framer',             owner: 'Elena',        status: 'Active',     url: 'https://github.com/elena486/eventwise-assets' },
  { id: 5,  tool: 'GA4 + Google Search Console', what: 'Website analytics',                                     owner: 'Elena',        status: 'Active',     url: '' },
  { id: 6,  tool: 'Looker Studio',         what: 'Marketing dashboard',                                          owner: 'Elena',        status: 'Active',     url: '' },
  { id: 7,  tool: 'Beehiiv',               what: 'Client newsletter (replaced Mailchimp)',                       owner: 'Elena',        status: 'Active',     url: 'https://beehiiv.com' },
  { id: 8,  tool: 'Tally',                 what: 'Forms — Form ID: q4W2Gg. Replaced Typeform.',                  owner: 'Elena',        status: 'Active',     url: 'https://tally.so/r/q4W2Gg' },
  { id: 9,  tool: 'Canva',                 what: 'Design assets',                                                owner: 'Elena',        status: 'Active',     url: 'https://canva.com' },
  { id: 10, tool: 'Google Workspace',      what: 'Email, Drive, Docs, Calendar — all team',                     owner: 'All',          status: 'Active',     url: '' },
  { id: 11, tool: 'Claude (claude.ai)',    what: 'AI assistant',                                                 owner: 'Elena',        status: 'Active',     url: 'https://claude.ai' },
  { id: 12, tool: 'Monday.com',            what: 'Being cancelled — replaced by Apollo + Eventwise HQ',         owner: 'Elena',        status: 'Cancelling', url: '' },
  { id: 13, tool: 'Notion',               what: 'Being cancelled — replaced by Eventwise HQ + Google Docs',    owner: 'Elena',        status: 'Cancelling', url: '' },
  { id: 14, tool: 'Typeform',             what: 'Replaced by Tally',                                            owner: 'Elena',        status: 'Cancelled',  url: '' },
  { id: 15, tool: 'Figma',               what: 'Cancelled — not in use',                                       owner: '—',            status: 'Cancelled',  url: '' },
];

const ic = 'w-full text-xs border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5] bg-white';

export default function TechStackPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const tools = page.tools || DEFAULT_TOOLS;

  const setTools = (newTools) => {
    onUpdate({ ...page, tools: newTools, updatedAt: new Date().toISOString().slice(0, 10) });
  };

  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const startEdit = (row) => { setEditId(row.id); setEditRow({ ...row }); };
  const saveEdit = () => {
    setTools(tools.map(t => t.id === editId ? editRow : t));
    setEditId(null);
  };
  const cancelEdit = () => setEditId(null);
  const doDelete = () => {
    setTools(tools.filter(t => t.id !== deleteConfirm));
    setDeleteConfirm(null);
  };
  const addRow = () => {
    const newRow = { id: Date.now(), tool: '', what: '', owner: '', status: 'Active', url: '' };
    setTools([...tools, newRow]);
    setEditId(newRow.id);
    setEditRow(newRow);
  };

  return (
    <HandbookPageShell section={section} page={page} onUpdate={onUpdate} onDelete={onDelete}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              {['Tool', "What it's for", 'Owner', 'Status', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tools.map((row, i) => (
              <tr key={row.id} className={`group border-b border-ew-border last:border-0 hover:bg-ew-bg transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                {editId === row.id ? (
                  <>
                    <td className="px-2 py-1.5">
                      <div className="space-y-1">
                        <input className={ic} value={editRow.tool} onChange={e => setEditRow(r => ({...r, tool: e.target.value}))} placeholder="Tool name" />
                        <input className={ic} value={editRow.url || ''} onChange={e => setEditRow(r => ({...r, url: e.target.value}))} placeholder="URL (optional)" />
                      </div>
                    </td>
                    <td className="px-2 py-1.5"><input className={ic} value={editRow.what} onChange={e => setEditRow(r => ({...r, what: e.target.value}))} placeholder="What it's for" /></td>
                    <td className="px-2 py-1.5"><input className={`${ic} w-24`} value={editRow.owner} onChange={e => setEditRow(r => ({...r, owner: e.target.value}))} placeholder="Owner" /></td>
                    <td className="px-2 py-1.5">
                      <select className={`${ic} w-28`} value={editRow.status} onChange={e => setEditRow(r => ({...r, status: e.target.value}))}>
                        {['Active', 'Cancelling', 'Cancelled'].map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td className="px-2 py-1.5">
                      <div className="flex gap-1">
                        <button onClick={saveEdit} className="text-green-500 hover:text-green-700"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-navy text-xs">{row.tool}</span>
                        {row.url && (
                          <a href={row.url} target="_blank" rel="noopener noreferrer"
                            className="text-ew-muted hover:text-[#8403C5] transition-colors" onClick={e => e.stopPropagation()}>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-ew-body text-xs max-w-[240px]">{row.what}</td>
                    <td className="px-3 py-2.5 text-ew-body text-xs whitespace-nowrap">{row.owner}</td>
                    <td className="px-3 py-2.5">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${STATUS_STYLES[row.status] || 'bg-gray-100 text-gray-500'}`}>
                        {row.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      {canEdit && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={() => startEdit(row)} className="p-1 text-ew-muted hover:text-navy transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => setDeleteConfirm(row.id)} className="p-1 text-ew-muted hover:text-red-500 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
        {canEdit && (
          <button onClick={addRow}
            className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline mt-3 px-3">
            <Plus className="w-3.5 h-3.5" /> Add tool
          </button>
        )}
        <p className="text-xs text-ew-muted italic mt-4 px-3">Credentials are not stored here. See password manager for logins.</p>
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete tool?</h3>
            <p className="text-sm text-ew-body mb-5">Remove <strong>{tools.find(t => t.id === deleteConfirm)?.tool}</strong> from the tech stack?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </HandbookPageShell>
  );
}