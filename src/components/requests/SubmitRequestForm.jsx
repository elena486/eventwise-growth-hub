import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';
import { TEAM_MEMBERS, NEW_CATEGORIES, PRIORITIES } from './requestStyles';

const PRIORITY_PILL_STYLES = {
  Low: 'bg-[#EBEBF5] text-[#242450] border-[#D8D8EE]',
  Medium: 'bg-[#EEF2F8] text-[#5777AB] border-[#C4D2E8]',
  High: 'bg-[#FFFBEB] text-[#A16207] border-[#FDE68A]',
  Urgent: 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]',
};

const DEFAULT = { requestedBy: '', recipient: '', title: '', category: '', priority: 'Medium', description: '', deadline: '' };
const inputCls = 'w-full px-3 h-10 border border-[#EBEBF5] bg-white rounded-lg text-sm text-[#242450] placeholder-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] transition-colors';

export default function SubmitRequestForm({ onSubmitted }) {
  const [form, setForm] = useState(DEFAULT);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.recipient || !form.requestedBy || !form.category) return;
    setSubmitting(true);

    const existing = await base44.entities.Request.list('-requestNumber', 1);
    const nextNum = existing.length > 0 ? (existing[0].requestNumber || 0) + 1 : 1;
    const submittedAt = new Date().toISOString();

    await base44.entities.Request.create({
      ...form,
      requestNumber: nextNum,
      assignedTo: form.recipient,
      status: 'To Do',
      submittedAt,
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
      submittedAt,
    }).catch(() => {});

    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setForm(DEFAULT);
      if (onSubmitted) onSubmitted();
    }, 2500);
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <CheckCircle2 className="w-12 h-12 text-green-500" />
        <p className="text-lg font-bold text-[#242450]">Thanks — {form.recipient} will pick this up soon.</p>
        <p className="text-sm text-[#5777AB]">Your task has been added to the Company Board.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <form onSubmit={handleSubmit} className="max-w-xl mx-auto py-10 px-4 pb-16 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold text-[#242450] mb-1">Submit a Request</h2>
          <p className="text-sm text-[#5777AB]">Fill in the details below and the right person will action it.</p>
        </div>

        {/* Who is this for */}
        <Field label="Who is this request for?" required>
          <select value={form.recipient} onChange={e => set('recipient', e.target.value)} required className={inputCls}>
            <option value="">Select a person…</option>
            {TEAM_MEMBERS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        {/* Your name */}
        <Field label="Your name / Requested by" required>
          <select value={form.requestedBy} onChange={e => set('requestedBy', e.target.value)} required className={inputCls}>
            <option value="">Select your name…</option>
            {TEAM_MEMBERS.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
        </Field>

        {/* Title */}
        <Field label="Request title" required>
          <input value={form.title} onChange={e => set('title', e.target.value)} required placeholder="e.g. Update sales deck" className={inputCls} />
        </Field>

        {/* Category */}
        <Field label="Category" required>
          <select value={form.category} onChange={e => set('category', e.target.value)} required className={inputCls}>
            <option value="">Select a category…</option>
            {NEW_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </Field>

        {/* Description */}
        <Field label="Description">
          <textarea
            value={form.description}
            onChange={e => set('description', e.target.value)}
            placeholder="Describe what you need and any relevant context"
            rows={4}
            className={inputCls + ' h-auto py-2.5 resize-none'}
          />
        </Field>

        {/* Priority */}
        <Field label="Priority">
          <div className="flex gap-2 flex-wrap">
            {PRIORITIES.map(p => (
              <button type="button" key={p} onClick={() => set('priority', p)}
                className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition-all ${PRIORITY_PILL_STYLES[p]} ${form.priority === p ? 'ring-2 ring-offset-1 ring-[#8403C5]/40' : 'opacity-60 hover:opacity-100'}`}>
                {p}
              </button>
            ))}
          </div>
        </Field>

        {/* Due date */}
        <Field label="Do you need this by a specific date?" hint="optional">
          <input type="date" value={form.deadline} onChange={e => set('deadline', e.target.value)} className={inputCls} />
        </Field>

        <button type="submit" disabled={submitting}
          className="self-start px-5 py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white text-sm font-semibold rounded-lg transition-colors disabled:opacity-60">
          {submitting ? 'Submitting…' : 'Submit Request'}
        </button>
      </form>
    </div>
  );
}

function Field({ label, required, hint, children }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-[#242450]">
        {label}{required && <span className="text-[#DC2626] ml-0.5">*</span>}
        {hint && <span className="text-[#5777AB] font-normal ml-1.5">({hint})</span>}
      </label>
      {children}
    </div>
  );
}