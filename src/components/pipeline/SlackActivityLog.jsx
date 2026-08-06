import React, { useState } from 'react';
import { Pencil, Trash2 } from 'lucide-react';

/**
 * Display of the `slack_activity_log` field on a Lead.
 * Entries are formatted as: [Date · Time] — Author: message
 * Supports inline editing and deletion of individual entries when `onUpdate` is provided.
 */
export default function SlackActivityLog({ value, onUpdate }) {
  const [editingIdx, setEditingIdx] = useState(null);
  const [editDraft, setEditDraft] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const entries = (value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  const startEdit = (idx) => {
    setEditDraft(entries[idx]);
    setEditingIdx(idx);
  };

  const cancelEdit = () => setEditingIdx(null);

  const commitEdit = (idx) => {
    const trimmed = editDraft.trim();
    if (!trimmed) return;
    const updated = entries.map((e, i) => i === idx ? trimmed : e);
    onUpdate?.(updated.join('\n'));
    setEditingIdx(null);
  };

  const deleteEntry = () => {
    const updated = entries.filter((_, i) => i !== deleteConfirm);
    onUpdate?.(updated.join('\n'));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="mb-1">
        <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em]">Slack Activity Log</p>
        <p className="text-[11px] text-ew-muted mt-0.5">Updates posted in #pipeline-updates on Slack appear here automatically</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[#F7F8FC] border border-dashed border-ew-border rounded-xl px-4 py-6 text-center">
          <p className="text-sm text-ew-muted italic">No Slack updates yet for this lead.</p>
        </div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={`group px-4 py-3 ${i > 0 ? 'border-t border-ew-border' : ''}`}
            >
              {editingIdx === i ? (
                <div className="space-y-2">
                  <textarea
                    autoFocus
                    className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white resize-none"
                    rows={2}
                    value={editDraft}
                    onChange={e => setEditDraft(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Escape') cancelEdit();
                      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commitEdit(i);
                    }}
                  />
                  <div className="flex gap-2 justify-end">
                    <button onClick={cancelEdit}
                      className="px-2 py-1 text-xs text-ew-body hover:bg-ew-bg rounded">Cancel</button>
                    <button onClick={() => commitEdit(i)}
                      className="px-3 py-1 text-xs font-semibold bg-[#8403C5] text-white rounded">Save</button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm text-ew-body whitespace-pre-wrap leading-relaxed flex-1">{entry}</p>
                  {onUpdate && (
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                      <button onClick={() => startEdit(i)}
                        className="p-1 text-ew-muted hover:text-navy rounded" title="Edit"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => setDeleteConfirm(i)}
                        className="p-1 text-ew-muted hover:text-red-500 rounded" title="Delete"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {deleteConfirm !== null && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Delete this activity entry?</p>
            <p className="text-xs text-ew-muted mb-4">This cannot be undone.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={deleteEntry} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}