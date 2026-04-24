import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X } from 'lucide-react';
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

const ic = 'w-full px-3 py-2 border border-ew-border rounded-lg text-sm text-ew-body bg-white focus:outline-none focus:ring-2 focus:ring-navy/20';
const lbl = 'block text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-1';

export default function BugSidePanel({ bug, clients, onClose, onUpdate }) {
  const [form, setForm] = useState({ ...bug });
  const [saving, setSaving] = useState(false);

  const up = (field, value) => setForm(f => ({ ...f, [field]: value }));

  const getBugFiles = () => {
    try { const p = JSON.parse(form.attachmentUrl || '[]'); if (Array.isArray(p)) return p; } catch {}
    if (form.attachmentUrl) return [{ name: form.attachmentName || form.attachmentUrl, url: form.attachmentUrl }];
    return [];
  };
  const setBugFiles = (files) => {
    up('attachmentUrl', JSON.stringify(files));
    up('attachmentName', files.map(f => f.name).join(', '));
  };

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.Bug.update(bug.id, form);
    setSaving(false);
    onUpdate(form);
  };

  return (
    <div className="w-[420px] bg-white border-l border-ew-border flex flex-col h-full shadow-xl">
      {/* Header */}
      <div className="flex items-start justify-between px-5 py-4 border-b border-ew-border shrink-0">
        <div>
          <p className="text-xs text-ew-muted font-medium mb-0.5">Bug #{form.bugNumber}</p>
          <div className="flex items-center gap-2 flex-wrap">
            {form.priority && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[form.priority]}`}>{form.priority}</span>}
            {form.status && <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[form.status]}`}>{form.status}</span>}
          </div>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
        <div>
          <label className={lbl}>Title</label>
          <input className={ic} value={form.title || ''} onChange={e => up('title', e.target.value)} placeholder="Bug title" />
        </div>
        <div>
          <label className={lbl}>Client</label>
          <select className={ic} value={form.clientId || ''} onChange={e => {
            const cl = clients.find(c => c.id === e.target.value);
            up('clientId', e.target.value);
            up('clientName', cl?.name || '');
          }}>
            <option value="">— No client —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={lbl}>Priority</label>
            <select className={ic} value={form.priority || ''} onChange={e => up('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Status</label>
            <select className={ic} value={form.status || ''} onChange={e => up('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Reported by</label>
            <select className={ic} value={form.reportedBy || ''} onChange={e => up('reportedBy', e.target.value)}>
              <option value="">—</option>
              {REPORTERS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Assigned to</label>
            <select className={ic} value={form.assignedTo || ''} onChange={e => up('assignedTo', e.target.value)}>
              <option value="">—</option>
              {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Category</label>
            <select className={ic} value={form.category || ''} onChange={e => up('category', e.target.value)}>
              <option value="">—</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Date logged</label>
            <input type="date" className={ic} value={form.dateLogged || ''} onChange={e => up('dateLogged', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Date resolved</label>
            <input type="date" className={ic} value={form.dateResolved || ''} onChange={e => up('dateResolved', e.target.value)} />
          </div>
        </div>
        <div>
          <label className={lbl}>Description</label>
          <textarea
            rows={4}
            className={ic + ' resize-none'}
            value={form.description || ''}
            onChange={e => up('description', e.target.value)}
            placeholder="Describe the bug…"
          />
        </div>
        <div>
          <label className={lbl}>Resolution notes</label>
          <textarea
            rows={3}
            className={ic + ' resize-none'}
            value={form.resolutionNotes || ''}
            onChange={e => up('resolutionNotes', e.target.value)}
            placeholder="How was this resolved?"
          />
        </div>
        <div>
          <label className={lbl}>Attachments</label>
          <MultiFileUpload files={getBugFiles()} onChange={setBugFiles} />
        </div>
      </div>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-ew-border shrink-0 flex justify-end gap-2">
        <button onClick={onClose} className="px-4 py-2 text-sm text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
        <button onClick={handleSave} disabled={saving}
          className="px-4 py-2 text-sm font-bold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : 'Save bug'}
        </button>
      </div>
    </div>
  );
}