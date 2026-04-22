import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { ChevronLeft } from 'lucide-react';
import MultiFileUpload from '@/components/shared/MultiFileUpload';
import MentionTextarea, { sendMentionNotifications } from '@/components/shared/MentionTextarea';

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

const inputCls = 'w-full px-3 py-2 border border-ew-border rounded-lg text-sm text-ew-body bg-white focus:outline-none focus:ring-2 focus:ring-navy/20';
const selectCls = inputCls;
const labelCls = 'block text-xs font-semibold text-ew-muted uppercase tracking-[0.1em] mb-1';

export default function BugDetail({ bug, clients, onBack, onUpdate }) {
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
    const updated = { ...form };
    await base44.entities.Bug.update(bug.id, updated);
    setSaving(false);
    onUpdate(updated);
    onBack();
  };

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy mb-6 transition-colors">
        <ChevronLeft className="w-4 h-4" /> Back to Bug Tracker
      </button>

      <div className="bg-white border border-ew-border rounded-xl p-6 max-w-3xl">
        <div className="flex items-start justify-between mb-6">
          <div>
            <p className="text-xs text-ew-muted font-medium mb-1">Bug #{form.bugNumber}</p>
            <h2 className="text-xl font-bold text-navy">{form.title || 'Untitled bug'}</h2>
          </div>
          <div className="flex items-center gap-2">
            {form.priority && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[form.priority]}`}>{form.priority}</span>}
            {form.status && <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[form.status]}`}>{form.status}</span>}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title || ''} onChange={e => up('title', e.target.value)} placeholder="Short bug title" />
          </div>
          <div>
            <label className={labelCls}>Client</label>
            <select className={selectCls} value={form.clientId || ''} onChange={e => {
              const cl = clients.find(c => c.id === e.target.value);
              up('clientId', e.target.value);
              up('clientName', cl?.name || '');
            }}>
              <option value="">— No client —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Reported by</label>
            <select className={selectCls} value={form.reportedBy || ''} onChange={e => up('reportedBy', e.target.value)}>
              <option value="">—</option>
              {REPORTERS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Assigned to</label>
            <select className={selectCls} value={form.assignedTo || ''} onChange={e => up('assignedTo', e.target.value)}>
              <option value="">—</option>
              {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <select className={selectCls} value={form.category || ''} onChange={e => up('category', e.target.value)}>
              <option value="">—</option>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Priority</label>
            <select className={selectCls} value={form.priority || ''} onChange={e => up('priority', e.target.value)}>
              {PRIORITIES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Status</label>
            <select className={selectCls} value={form.status || ''} onChange={e => up('status', e.target.value)}>
              {STATUSES.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Date logged</label>
            <input type="date" className={inputCls} value={form.dateLogged || ''} onChange={e => up('dateLogged', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Date resolved</label>
            <input type="date" className={inputCls} value={form.dateResolved || ''} onChange={e => up('dateResolved', e.target.value)} />
          </div>
        </div>

        <div className="mb-4">
          <label className={labelCls}>Description</label>
          <MentionTextarea
            rows={5}
            className={inputCls + ' resize-none'}
            value={form.description || ''}
            onChange={v => up('description', v)}
            placeholder="Describe the bug, steps to reproduce, what was expected vs what happened..."
            author={form.reportedBy}
            section={`Bug Tracker / #${form.bugNumber}`}
            appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=bugs"
          />
        </div>

        <div className="mb-4">
          <label className={labelCls}>Resolution notes</label>
          <MentionTextarea
            rows={3}
            className={inputCls + ' resize-none'}
            value={form.resolutionNotes || ''}
            onChange={v => up('resolutionNotes', v)}
            placeholder="How was this resolved?"
            author={form.assignedTo}
            section={`Bug Tracker / #${form.bugNumber} / Resolution`}
            appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=bugs"
          />
        </div>

        <div className="mb-6">
          <label className={labelCls}>Attachments</label>
          <MultiFileUpload files={getBugFiles()} onChange={setBugFiles} />
        </div>

        <div className="flex justify-end gap-2">
          <button onClick={onBack} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-5 py-2 text-sm font-bold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-60">
            {saving ? 'Saving…' : 'Save bug'}
          </button>
        </div>
      </div>
    </div>
  );
}