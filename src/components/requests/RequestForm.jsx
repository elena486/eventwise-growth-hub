import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';
import { useToast } from '@/components/shared/Toast';
import MultiFileUpload from '@/components/shared/MultiFileUpload';
import MentionTextarea from '@/components/shared/MentionTextarea';

const REQUESTERS = ['Chris', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David', 'Elena'];
const RECIPIENTS = ['Elena', 'George', 'Chris', 'Martinique', 'Sreeja', 'Ramesh', 'David'];
const CATEGORIES = ['Marketing', 'Design', 'Content', 'Ops', 'Tech', 'Other'];
const PRIORITIES = [
  { label: 'Low', cls: 'bg-gray-100 text-gray-600 border-gray-300' },
  { label: 'Medium', cls: 'bg-blue-100 text-blue-700 border-blue-300' },
  { label: 'High', cls: 'bg-amber-100 text-amber-700 border-amber-300' },
  { label: 'Urgent', cls: 'bg-red-100 text-red-700 border-red-300' },
];

const DEFAULT = { requestedBy: '', recipient: 'Elena', title: '', category: '', priority: 'Medium', description: '', deadline: '', extraNotes: '' };

export default function RequestForm({ onSubmitted }) {
  const [form, setForm] = useState(DEFAULT);
  const [files, setFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const toast = useToast();

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.requestedBy) return;
    setSubmitting(true);

    const attachmentUrl = files.map(f => f.url).join(',');
    const attachmentName = files.map(f => f.name).join(', ');

    // Get count for request number
    const existing = await base44.entities.Request.list('-requestNumber', 1);
    const nextNum = existing.length > 0 ? (existing[0].requestNumber || 0) + 1 : 1;
    const submittedAt = new Date().toISOString();

    await base44.entities.Request.create({
      ...form,
      requestNumber: nextNum,
      status: 'New',
      assignedTo: form.recipient,
      submittedAt,
      attachmentUrl,
      attachmentName,
      archived: false,
    });

    base44.functions.invoke('notifyNewRequest', {
      requestedBy: form.requestedBy,
      recipient: form.recipient,
      title: form.title,
      category: form.category,
      priority: form.priority,
      deadline: form.deadline,
      description: form.description,
      extraNotes: form.extraNotes,
      submittedAt,
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
    toast.submitted('Request submitted successfully');
    setTimeout(() => {
      setDone(false);
      setForm(DEFAULT);
      setFiles([]);
      if (onSubmitted) onSubmitted();
    }, 2500);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-lg font-bold text-navy">Thanks — {form.recipient} will pick this up soon.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="max-w-xl mx-auto py-10 px-4 pb-16 flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-[#111827] mb-1">Submit a Request</h2>
        <p className="text-sm text-[#9CA3AF]">Fill in the details below and the right person will action it.</p>
      </div>

      {/* Who is this for */}
      <Field label="Who is this request for?" required>
        <select value={form.recipient} onChange={e => set('recipient', e.target.value)} required className={selectCls}>
          <option value="">Select a person…</option>
          {RECIPIENTS.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </Field>

      {/* Your name */}
      <Field label="Your name" required>
        <select value={form.requestedBy} onChange={e => set('requestedBy', e.target.value)} required className={selectCls}>
          <option value="">Select your name…</option>
          {REQUESTERS.map(r => <option key={r}>{r}</option>)}
        </select>
      </Field>

      {/* Title */}
      <Field label="Request title" required>
        <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Update sales deck" className={inputCls} />
      </Field>

      {/* Category */}
      <Field label="Category" required>
        <select value={form.category} onChange={e => set('category', e.target.value)} required className={selectCls}>
          <option value="">Select a category…</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </Field>

      {/* Description */}
      <Field label="Description" required>
        <MentionTextarea
          value={form.description}
          onChange={v => set('description', v)}
          placeholder="Describe what you need and any relevant context..."
          rows={4}
          className={inputCls + ' resize-none'}
          author={form.requestedBy}
          section="Requests"
          appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=requests"
        />
      </Field>

      {/* Priority */}
      <Field label="Priority">
        <div className="flex gap-2 flex-wrap">
          {PRIORITIES.map(p => (
            <button type="button" key={p.label} onClick={() => set('priority', p.label)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${p.cls} ${form.priority === p.label ? 'ring-2 ring-offset-1 ring-[#8403C5]/40 scale-105' : 'opacity-60 hover:opacity-100'}`}>
              {p.label}
            </button>
          ))}
        </div>
      </Field>

      {/* Deadline */}
      <Field label="Do you need this by a specific date?" hint="Optional">
        <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} />
      </Field>

      {/* Attachment */}
      <Field label="Attachments" hint="Optional">
        <MultiFileUpload files={files} onChange={setFiles} />
      </Field>

      {/* Extra notes */}
      <Field label="Anything else they should know?" hint="Optional">
        <MentionTextarea
          value={form.extraNotes}
          onChange={v => set('extraNotes', v)}
          placeholder="Any extra context, links, references…"
          rows={3}
          className={inputCls + ' resize-none'}
          author={form.requestedBy}
          section="Requests"
          appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=requests"
        />
      </Field>

      <button type="submit" disabled={submitting}
        className="self-start px-5 py-2.5 bg-[#8403C5] hover:bg-[#6e02a3] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
        {submitting ? 'Submitting…' : 'Submit Request'}
      </button>
    </form>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-navy">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        {hint && <span className="text-ew-muted font-normal ml-1.5">({hint})</span>}
      </label>
      {children}
    </div>
  );
}

const inputCls = 'w-full px-3 h-10 border bg-white rounded-md text-sm text-[#111827] placeholder-[#9CA3AF] focus:outline-none focus:ring-[3px] focus:ring-[#8403C5]/10 focus:border-[#8403C5] transition-colors';
const selectCls = inputCls;