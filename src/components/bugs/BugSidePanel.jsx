import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Trash2 } from 'lucide-react';
import MultiFileUpload from '@/components/shared/MultiFileUpload';

const REPORTERS = ['Chris', 'Martinique', 'George', 'Sreeja', 'Elena'];
const ASSIGNEES = ['Chris', 'Martinique', 'Sreeja', 'Elena'];
const CATEGORIES = ['Platform Bug', 'Integration Issue', 'Onboarding Issue', 'Data Issue', 'UI Issue', 'Other'];
const STATUSES = ['Open', 'In Progress', 'Waiting on Client', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

const PRIORITY_STYLES = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-blue-50 text-blue-700',
  'High': 'bg-amber-50 text-amber-700',
  'Critical': 'bg-red-100 text-red-700',
};
const STATUS_STYLES = {
  'Open': 'bg-purple-50 text-[#8403C5]',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Waiting on Client': 'bg-amber-50 text-amber-700',
  'Resolved': 'bg-green-50 text-green-700',
  'Closed': 'bg-gray-100 text-gray-500',
};

const sel = 'w-full px-3 py-2 border border-ew-border rounded-lg text-sm text-ew-body bg-white focus:outline-none focus:ring-2 focus:ring-navy/20';
const lbl = 'block text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1';
const ta = 'w-full px-3 py-2 border border-ew-border rounded-lg text-sm text-ew-body bg-white focus:outline-none focus:ring-2 focus:ring-navy/20 resize-none';

export default function BugSidePanel({ bug, clients, onClose, onUpdate, onDelete }) {
  const [form, setForm] = useState({ ...bug });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const up = useCallback((field, value) => {
    setForm(f => {
      const updated = { ...f, [field]: value };
      // Auto-save debounced
      return updated;
    });
  }, []);

  // Auto-save on any form change
  useEffect(() => {
    const timer = setTimeout(() => {
      base44.entities.Bug.update(bug.id, form).then(() => onUpdate(form)).catch(() => {});
    }, 600);
    return () => clearTimeout(timer);
  }, [form]);

  const getBugFiles = () => {
    try { const p = JSON.parse(form.attachmentUrl || '[]'); if (Array.isArray(p)) return p; } catch {}
    if (form.attachmentUrl) return [{ name: form.attachmentName || form.attachmentUrl, url: form.attachmentUrl }];
    return [];
  };

  const setBugFiles = (files) => {
    setForm(f => ({ ...f, attachmentUrl: JSON.stringify(files), attachmentName: files.map(f => f.name).join(', ') }));
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Bug.delete(bug.id);
    onDelete && onDelete(bug.id);
  };

  const showResolution = form.status === 'Resolved' || form.status === 'Closed';

  return (
    <div className="w-[480px] shrink-0 bg-white border-l border-ew-border flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <div className="flex-1 min-w-0 pr-3">
            <p className="text-[11px] font-medium text-ew-muted mb-1">Bug #{form.bugNumber}</p>
            <input
              className="w-full text-base font-bold text-navy bg-transparent border-none focus:outline-none focus:ring-0 p-0"
              value={form.title || ''}
              onChange={e => up('title', e.target.value)}
              placeholder="Bug title"
            />
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <select
                value={form.status || ''}
                onChange={e => up('status', e.target.value)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border-none focus:outline-none cursor-pointer ${STATUS_STYLES[form.status] || 'bg-gray-100 text-gray-500'}`}
              >
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
              <select
                value={form.priority || ''}
                onChange={e => up('priority', e.target.value)}
                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border-none focus:outline-none cursor-pointer ${PRIORITY_STYLES[form.priority] || 'bg-gray-100 text-gray-600'}`}
              >
                {PRIORITIES.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy shrink-0 mt-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Details grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <label className={lbl}>Client</label>
              <select className={sel} value={form.clientId || ''} onChange={e => {
                const cl = clients.find(c => c.id === e.target.value);
                setForm(f => ({ ...f, clientId: e.target.value, clientName: cl?.name || '' }));
              }}>
                <option value="">— No client —</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Reported by</label>
              <select className={sel} value={form.reportedBy || ''} onChange={e => up('reportedBy', e.target.value)}>
                <option value="">—</option>
                {REPORTERS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Assigned to</label>
              <select className={sel} value={form.assignedTo || ''} onChange={e => up('assignedTo', e.target.value)}>
                <option value="">—</option>
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Category</label>
              <select className={sel} value={form.category || ''} onChange={e => up('category', e.target.value)}>
                <option value="">—</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Date logged</label>
              <p className="text-sm text-ew-body px-1 py-1.5">{form.dateLogged || '—'}</p>
            </div>
            {showResolution && (
              <div>
                <label className={lbl}>Date resolved</label>
                <input type="date" className={sel} value={form.dateResolved || ''} onChange={e => up('dateResolved', e.target.value)} />
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <label className={lbl}>Description</label>
            <textarea rows={4} className={ta} value={form.description || ''} onChange={e => up('description', e.target.value)} placeholder="Describe the bug…" />
          </div>

          {/* Steps / Expected / Actual */}
          <div>
            <label className={lbl}>Steps to reproduce</label>
            <textarea rows={3} className={ta} value={form.stepsToReproduce || ''} onChange={e => up('stepsToReproduce', e.target.value)} placeholder="1. Go to… 2. Click… 3. See error" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={lbl}>Expected behaviour</label>
              <textarea rows={2} className={ta} value={form.expectedBehaviour || ''} onChange={e => up('expectedBehaviour', e.target.value)} placeholder="What should happen?" />
            </div>
            <div>
              <label className={lbl}>Actual behaviour</label>
              <textarea rows={2} className={ta} value={form.actualBehaviour || ''} onChange={e => up('actualBehaviour', e.target.value)} placeholder="What actually happened?" />
            </div>
          </div>

          {/* Internal notes */}
          <div>
            <label className={lbl}>Internal notes (visible to team only)</label>
            <textarea rows={3} className={ta} value={form.internalNotes || ''} onChange={e => up('internalNotes', e.target.value)} placeholder="Any context the team needs to know…" />
          </div>

          {/* Resolution notes */}
          {showResolution && (
            <div>
              <label className={lbl}>Resolution notes</label>
              <textarea rows={3} className={ta} value={form.resolutionNotes || ''} onChange={e => up('resolutionNotes', e.target.value)} placeholder="How was this resolved?" />
            </div>
          )}

          {/* Attachments */}
          <div>
            <label className={lbl}>Attachments</label>
            <MultiFileUpload files={getBugFiles()} onChange={setBugFiles} />
          </div>

          {/* Delete */}
          <div className="pt-2 border-t border-ew-border">
            {confirmDelete ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-[#374151] flex-1">Are you sure you want to delete this bug? This cannot be undone.</p>
                <button onClick={handleDelete} disabled={deleting}
                  className="px-3 py-1.5 text-xs font-bold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-60">
                  {deleting ? 'Deleting…' : 'Delete'}
                </button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 text-xs text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg">Cancel</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 text-xs font-semibold text-red-600 hover:text-red-800 transition-colors">
                <Trash2 className="w-3.5 h-3.5" /> Delete bug
              </button>
            )}
          </div>
        </div>

        {/* Footer — auto-save indicator */}
        <div className="px-5 py-3 border-t border-ew-border shrink-0">
          <p className="text-[11px] text-ew-muted">Changes save automatically</p>
        </div>
    </div>
  );
}