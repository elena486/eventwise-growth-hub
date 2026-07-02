import React, { useState } from 'react';
import { X, Link2, MoreHorizontal, ExternalLink, Trash2, Pencil } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { base44 } from '@/api/base44Client';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function TechScoreChip({ score }) {
  if (score == null || score === '') return <span className="text-[#9CA3AF]">—</span>;
  const n = Number(score);
  let cls = '';
  if (n <= 4) cls = 'bg-[#FEF2F2] text-[#DC2626]';
  else if (n <= 7) cls = 'bg-[#FFFBEB] text-[#A16207]';
  else cls = 'bg-[#E8F7F2] text-[#1D9E75]';
  return <span className={`text-sm font-bold px-3 py-1 rounded-full ${cls}`}>{n}/10</span>;
}

function StatusPill({ status }) {
  if (status === 'Attached') {
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#E8F7F2] text-[#1D9E75]">Attached</span>;
  }
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#8403C5]">New</span>;
}

function FieldRow({ label, value, large }) {
  return (
    <div className="py-3 border-b border-[#F2F2F4] last:border-0">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{label}</p>
      {large
        ? <p className="text-sm text-[#242450] leading-relaxed whitespace-pre-wrap">{value || '—'}</p>
        : <p className="text-sm font-medium text-[#242450]">{value || '—'}</p>
      }
    </div>
  );
}

// Editable field for the edit modal
function EditField({ label, value, onChange, large }) {
  return (
    <div className="mb-4">
      <label className="block text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{label}</label>
      {large ? (
        <textarea
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          rows={3}
          className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5] resize-none"
        />
      ) : (
        <input
          type="text"
          value={value || ''}
          onChange={e => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]"
        />
      )}
    </div>
  );
}

export default function DemoResponseDetailPanel({ record, onClose, onAttach, onUpdated, onDeleted, onNavigateToPipeline }) {
  const isAttached = record.status === 'Attached';

  // Overflow menu
  const [menuOpen, setMenuOpen] = useState(false);

  // Edit modal
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete confirm
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleEditOpen = () => {
    setMenuOpen(false);
    setEditData({
      name: record.name,
      company: record.company,
      accountingPlatform: record.accountingPlatform,
      usesPOs: record.usesPOs,
      ticketingPlatforms: record.ticketingPlatforms,
      ticketsSoldAnnually: record.ticketsSoldAnnually,
      techForwardScore: record.techForwardScore != null ? String(record.techForwardScore) : '',
      financeTeamDescription: record.financeTeamDescription,
    });
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const payload = {
        ...editData,
        techForwardScore: editData.techForwardScore !== '' ? Number(editData.techForwardScore) : null,
      };
      await base44.entities.DemoFormResponse.update(record.id, payload);
      onUpdated?.({ ...record, ...payload });
      setEditing(false);
    } catch {}
    setSaving(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await base44.entities.DemoFormResponse.delete(record.id);
      onDeleted?.(record.id);
      onClose();
    } catch {}
    setDeleting(false);
  };

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-[#EBEBF5] z-50 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5] bg-[#242450]">
          <h2 className="text-sm font-bold text-white">Response Detail</h2>
          <div className="flex items-center gap-1">
            {/* ⋮ Overflow menu */}
            <div className="relative">
              <button
                onClick={() => setMenuOpen(o => !o)}
                className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                title="More options"
              >
                <MoreHorizontal className="w-4 h-4 text-white/70" />
              </button>
              {menuOpen && (
                <>
                  <div className="fixed inset-0 z-[55]" onClick={() => setMenuOpen(false)} />
                  <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-xl z-[60] w-44 py-1">
                    <button
                      onClick={handleEditOpen}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#242450] hover:bg-[#F6F6FB] transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5 text-[#5777AB]" /> Edit response
                    </button>
                    <button
                      onClick={() => { setMenuOpen(false); setConfirmDelete(true); }}
                      className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2] transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Delete response
                    </button>
                  </div>
                </>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
              <X className="w-4 h-4 text-white/70" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary section */}
          <div className="px-6 py-5 border-b border-[#EBEBF5]">
            <h3 className="text-xl font-bold text-[#242450]">{record.name}</h3>
            {/* Fix #1 — company as plain text, not a link */}
            {record.company && (
              <p className="text-sm font-medium text-[#242450] mt-0.5">{record.company}</p>
            )}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusPill status={record.status} />
              <span className="text-xs text-[#9CA3AF]">Submitted {fmtDate(record.dateSubmitted)}</span>
            </div>
            {/* Fix #2 — show Attached To link clearly below the status */}
            {isAttached && record.attachedToName && (
              <div className="mt-3">
                {onNavigateToPipeline ? (
                  <button
                    onClick={() => onNavigateToPipeline(record.attachedToId)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:underline"
                  >
                    <Link2 className="w-3 h-3" />
                    Attached to: {record.attachedToName}
                    <ExternalLink className="w-3 h-3" />
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-[#5777AB]">
                    <Link2 className="w-3 h-3" />
                    <span>Attached to: <span className="font-semibold text-[#242450]">{record.attachedToName}</span></span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Fix #3 — Attach button state */}
          <div className="px-6 py-4 border-b border-[#EBEBF5]">
            {isAttached ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-4 py-2.5 bg-[#E8F7F2] rounded-lg flex-1">
                  <Link2 className="w-4 h-4 text-[#1D9E75]" />
                  <span className="text-sm font-semibold text-[#1D9E75]">Attached ✓</span>
                  {record.attachedToName && (
                    <span className="text-sm text-[#242450] ml-1 truncate">— {record.attachedToName}</span>
                  )}
                </div>
                <button
                  onClick={() => onAttach(record)}
                  className="px-3 py-2.5 text-xs font-semibold border border-[#D8D8EE] text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors whitespace-nowrap"
                >
                  Change
                </button>
              </div>
            ) : (
              <button
                onClick={() => onAttach(record)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white text-sm font-semibold rounded-lg transition-colors">
                <Link2 className="w-4 h-4" /> Attach to Pipeline Item
              </button>
            )}
          </div>

          {/* Form responses */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-3">Pre-Demo Questionnaire Responses</p>
            <div>
              <FieldRow label="Accounting Platform" value={record.accountingPlatform} />
              <FieldRow label="Uses POs (Purchase Orders)" value={record.usesPOs} />
              <FieldRow label="Ticketing Platform(s)" value={record.ticketingPlatforms} />
              <FieldRow label="Tickets Sold Annually" value={record.ticketsSoldAnnually} />
              <div className="py-3 border-b border-[#F2F2F4]">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5">Tech-Forward Score</p>
                <TechScoreChip score={record.techForwardScore} />
              </div>
              <FieldRow label="Describe your finance team" value={record.financeTeamDescription} large />
            </div>
          </div>
        </div>
      </div>

      {/* Fix #4 — Edit modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setEditing(false)}>
          <div className="bg-white rounded-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="px-6 py-4 border-b border-[#EBEBF5] flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#242450]">Edit Response</h3>
              <button onClick={() => setEditing(false)} className="p-1 rounded hover:bg-[#F6F6FB]">
                <X className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            </div>
            <div className="px-6 py-5">
              <EditField label="Respondent Name" value={editData.name} onChange={v => setEditData(p => ({ ...p, name: v }))} />
              <EditField label="Company" value={editData.company} onChange={v => setEditData(p => ({ ...p, company: v }))} />
              <EditField label="Accounting Platform" value={editData.accountingPlatform} onChange={v => setEditData(p => ({ ...p, accountingPlatform: v }))} />
              <EditField label="Uses POs" value={editData.usesPOs} onChange={v => setEditData(p => ({ ...p, usesPOs: v }))} />
              <EditField label="Ticketing Platform(s)" value={editData.ticketingPlatforms} onChange={v => setEditData(p => ({ ...p, ticketingPlatforms: v }))} />
              <EditField label="Tickets Sold Annually" value={editData.ticketsSoldAnnually} onChange={v => setEditData(p => ({ ...p, ticketsSoldAnnually: v }))} />
              <EditField label="Tech-Forward Score (1–10)" value={editData.techForwardScore} onChange={v => setEditData(p => ({ ...p, techForwardScore: v }))} />
              <EditField label="Finance Team Description" value={editData.financeTeamDescription} onChange={v => setEditData(p => ({ ...p, financeTeamDescription: v }))} large />
            </div>
            <div className="px-6 py-4 border-t border-[#EBEBF5] flex justify-end gap-2">
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleSaveEdit} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:opacity-60 text-white rounded-lg transition-colors">
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fix #4 — Delete confirmation */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 z-[70] flex items-center justify-center p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-2">Delete response?</h3>
            <p className="text-sm text-[#5777AB] mb-5">This will permanently remove the form response. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={deleting}
                className="px-4 py-2 text-sm font-semibold bg-[#DC2626] hover:bg-[#B91C1C] disabled:opacity-60 text-white rounded-lg transition-colors flex items-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" /> {deleting ? 'Deleting…' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}