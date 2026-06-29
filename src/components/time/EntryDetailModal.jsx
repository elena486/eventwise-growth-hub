/**
 * EntryDetailModal — view/edit/delete a single TimeEntry
 * Used by: Today calendar view (LogTime), My History grid (MyTimesheet), Team Overview
 */
import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { X, Pencil, Trash2, Link } from 'lucide-react';
import { CATEGORY_LABELS } from './categoryColors';

const CATEGORIES = CATEGORY_LABELS;

function fmtDur(min) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h && !m) return '0m';
  if (!h) return `${m}m`;
  if (!m) return `${h}h`;
  return `${h}h ${m}m`;
}
function fmtTime(iso) { try { return format(new Date(iso), 'HH:mm'); } catch { return ''; } }

export default function EntryDetailModal({ entry, onClose, onUpdated, onDeleted, clients = [] }) {
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  // Edit form state
  const [category, setCategory] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [hours, setHours] = useState('0');
  const [mins, setMins] = useState('0');
  const [notes, setNotes] = useState('');
  const [transcriptLink, setTranscriptLink] = useState('');

  useEffect(() => {
    if (entry) {
      setCategory(entry.category || '');
      setProjectTask(entry.projectTask || '');
      setClientId(entry.clientId || '');
      setClientName(entry.clientName || '');
      setHours(String(Math.floor((entry.durationMinutes || 0) / 60)));
      setMins(String((entry.durationMinutes || 0) % 60));
      setNotes(entry.notes || '');
      setTranscriptLink(entry.transcriptLink || '');
    }
  }, [entry]);

  if (!entry) return null;

  const handleSave = async () => {
    if (!category || !projectTask.trim()) return;
    setSaving(true);
    const durationMinutes = (parseInt(hours) || 0) * 60 + (parseInt(mins) || 0);
    const updated = await base44.entities.TimeEntry.update(entry.id, {
      category, projectTask: projectTask.trim(), clientId: clientId || '',
      clientName: clientName || '', durationMinutes, notes: notes.trim(),
      transcriptLink: transcriptLink.trim(),
    }).catch(() => null);
    setSaving(false);
    setEditing(false);
    onUpdated?.({ ...entry, category, projectTask: projectTask.trim(), clientId, clientName, durationMinutes, notes: notes.trim(), transcriptLink: transcriptLink.trim() });
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.TimeEntry.delete(entry.id).catch(() => {});
    setDeleting(false);
    onDeleted?.(entry.id);
    onClose();
  };

  const hasTimes = entry.timerStartedAt && entry.timerStoppedAt;
  const dateStr = entry.date ? (() => { try { return format(parseISO(entry.date), 'd MMM yyyy'); } catch { return entry.date; } })() : '';

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[14px] w-[480px] max-h-[90vh] overflow-y-auto animate-modal-in" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5]">
          <h2 className="text-base font-bold text-[#242450]">{editing ? 'Edit Entry' : 'Entry Details'}</h2>
          <div className="flex items-center gap-2">
            {!editing && (
              <>
                <button onClick={() => setEditing(true)} className="p-2 rounded-lg hover:bg-[#F3E8FF] text-[#8403C5] transition-colors" title="Edit">
                  <Pencil className="w-4 h-4" />
                </button>
                {!confirmDelete ? (
                  <button onClick={() => setConfirmDelete(true)} className="p-2 rounded-lg hover:bg-[#FEF2F2] text-[#DC2626] transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1">
                    <span className="text-xs text-[#DC2626] font-medium">Delete?</span>
                    <button onClick={handleDelete} disabled={deleting} className="px-2 py-1 text-xs font-bold bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]">
                      {deleting ? '…' : 'Yes'}
                    </button>
                    <button onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-xs text-[#5777AB] border border-[#EBEBF5] rounded-lg hover:bg-[#F6F6FB]">
                      No
                    </button>
                  </div>
                )}
              </>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-[#EBEBF5] text-[#9CA3AF]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {editing ? (
            <>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Category *</label>
                <select value={category} onChange={e => { setCategory(e.target.value); setProjectTask(''); }}
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none ${!category ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}>
                  <option value="">Select…</option>
                  {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Project / Task *</label>
                <input value={projectTask} onChange={e => setProjectTask(e.target.value)}
                  className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none ${!projectTask.trim() ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`} />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Client</label>
                <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white">
                  <option value="">None</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Duration</label>
                <div className="flex items-center gap-2">
                  <input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)}
                    className="w-16 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg" />
                  <span className="text-xs text-[#5777AB]">h</span>
                  <input type="number" min="0" max="59" value={mins} onChange={e => setMins(e.target.value)}
                    className="w-16 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg" />
                  <span className="text-xs text-[#5777AB]">m</span>
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Notes</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg resize-none" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Transcript Link</label>
                <input value={transcriptLink} onChange={e => setTranscriptLink(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" placeholder="https://…" />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#EBEBF5]">
                <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-[#5777AB] border border-[#5777AB] rounded-lg hover:bg-[#EEF2F8]">Cancel</button>
                <button onClick={handleSave} disabled={saving || !category || !projectTask.trim()}
                  className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF]">
                  {saving ? 'Saving…' : 'Save'}
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-4">
                <Detail label="Date" value={dateStr} />
                <Detail label="Duration" value={fmtDur(entry.durationMinutes)} />
                <Detail label="Category" value={entry.category} />
                <Detail label="Client" value={entry.clientName || '—'} />
              </div>
              <Detail label="Project / Task" value={entry.projectTask} />
              {hasTimes && (
                <Detail label="Time range" value={`${fmtTime(entry.timerStartedAt)} – ${fmtTime(entry.timerStoppedAt)}`} />
              )}
              {entry.notes && <Detail label="Notes" value={entry.notes} />}
              {entry.transcriptLink && (
                <div>
                  <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Transcript</p>
                  <a href={entry.transcriptLink} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
                    <Link className="w-3.5 h-3.5" /> View transcript
                  </a>
                </div>
              )}
              {entry.transcriptFileName && (
                <Detail label="Transcript file" value={entry.transcriptFileName} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-0.5">{label}</p>
      <p className="text-sm text-[#242450] font-medium">{value || '—'}</p>
    </div>
  );
}