import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { Plus, Pencil, Trash2, FileText } from 'lucide-react';
import HandbookPageShell from '../HandbookPageShell';
import ConsentFormModal from './ConsentFormModal';
import { CONSENT_FIELDS } from '../consentFields';

function consentChip(val) {
  if (!val) return <span className="text-[#9CA3AF] text-xs">—</span>;
  const yesLike = val === 'Yes' || val.startsWith('Yes');
  const cls = yesLike ? 'chip-green' : val === 'No' ? 'chip-red' : 'chip-amber';
  return <span className={`chip ${cls}`}>{val}</span>;
}

export default function ConsentResponsesPage({ section, page, onUpdate, onDelete }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(() => {
    base44.entities.ConsentResponse.filter({}, '-submission_time', 200)
      .then(setRows)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (payload) => {
    if (editing?.id) {
      await base44.entities.ConsentResponse.update(editing.id, payload);
    } else {
      await base44.entities.ConsentResponse.create(payload);
    }
    setFormOpen(false);
    setEditing(null);
    load();
  };

  const doDelete = async () => {
    await base44.entities.ConsentResponse.delete(deleteId);
    setDeleteId(null);
    load();
  };

  return (
    <HandbookPageShell section={section} page={page} onUpdate={onUpdate} onDelete={onDelete}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-[#5777AB]">{rows.length} response{rows.length !== 1 ? 's' : ''}</p>
        <button onClick={() => { setEditing(null); setFormOpen(true); }} className="btn-primary">
          <Plus className="w-3.5 h-3.5" /> Add response
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        </div>
      ) : rows.length === 0 ? (
        <div className="empty-state py-12">
          <FileText className="empty-state-icon" />
          <p>No consent responses yet.</p>
        </div>
      ) : (
        <div className="border border-[#EBEBF5] rounded-lg overflow-x-auto">
          <table>
            <thead>
              <tr>
                <th>Employee</th>
                <th>Date</th>
                {CONSENT_FIELDS.map(f => <th key={f.key}>{f.label}</th>)}
                <th>Notes</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => (
                <tr key={r.id}>
                  <td className="font-medium text-[#242450] whitespace-nowrap">{r.employee_name}</td>
                  <td className="whitespace-nowrap">{r.date_submitted ? format(parseISO(r.date_submitted), 'd MMM yyyy') : '—'}</td>
                  {CONSENT_FIELDS.map(f => (
                    <td key={f.key} className="whitespace-nowrap">{consentChip(r[f.key])}</td>
                  ))}
                  <td className="max-w-[200px]">
                    <span className="text-xs text-[#5777AB] line-clamp-2">{r.restrictions_notes || r.additional_comments || '—'}</span>
                  </td>
                  <td>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditing(r); setFormOpen(true); }} className="p-1 text-[#9CA3AF] hover:text-[#242450]"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteId(r.id)} className="p-1 text-[#9CA3AF] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {formOpen && (
        <ConsentFormModal initial={editing} onSave={handleSave} onClose={() => { setFormOpen(false); setEditing(null); }} />
      )}

      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-2">Delete response?</h3>
            <p className="text-sm text-[#5777AB] mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteId(null)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F9FAFB] rounded-lg">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </HandbookPageShell>
  );
}