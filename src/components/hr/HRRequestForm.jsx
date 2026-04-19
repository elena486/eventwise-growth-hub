import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { CheckCircle2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const MEMBERS = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];
const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
const labelCls = 'block text-xs font-medium text-ew-body mb-1';

function calcWorkingDays(start, end) {
  if (!start) return 1;
  try {
    let s = parseISO(start), e = end ? parseISO(end) : parseISO(start), count = 0;
    while (s <= e) {
      const day = s.getDay();
      if (day !== 0 && day !== 6) count++;
      s = new Date(s.getTime() + 86400000);
    }
    return Math.max(count, 1);
  } catch { return 1; }
}

function fmtDate(d) {
  if (!d) return '';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

export default function HRRequestForm({ onSubmitted }) {
  const [form, setForm] = useState({
    teamMember: 'George', type: 'Vacation', startDate: '', endDate: '', workingDays: 1, notes: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const up = (k, v) => {
    setForm(prev => {
      const updated = { ...prev, [k]: v };
      if (k === 'startDate' || k === 'endDate') {
        const s = k === 'startDate' ? v : prev.startDate;
        const e = k === 'endDate' ? v : prev.endDate;
        updated.workingDays = calcWorkingDays(s, e);
      }
      return updated;
    });
  };

  const handleSubmit = async () => {
    if (!form.teamMember || !form.type || !form.startDate) return;
    setSubmitting(true);

    // Create pending record
    await base44.entities.TimeOffRecord.create({
      teamMember: form.teamMember,
      type: form.type,
      startDate: form.startDate,
      endDate: form.endDate || form.startDate,
      workingDays: form.workingDays,
      status: 'Pending',
      year: new Date(form.startDate).getFullYear(),
      notes: form.notes,
    });

    // Send email to Elena
    const datesStr = form.endDate && form.endDate !== form.startDate
      ? `${fmtDate(form.startDate)} – ${fmtDate(form.endDate)}`
      : fmtDate(form.startDate);

    await base44.integrations.Core.SendEmail({
      to: 'elena@eventwise.com',
      subject: `New time off request from ${form.teamMember}`,
      body: `${form.teamMember} has submitted a time off request.\n\nType: ${form.type}\nDates: ${datesStr}\nWorking days: ${form.workingDays}\nNotes: ${form.notes || 'None'}\n\nReview in Eventwise HQ → Operations → HR`,
    });

    setSubmitting(false);
    setDone(true);
    setTimeout(() => {
      setDone(false);
      setForm({ teamMember: 'George', type: 'Vacation', startDate: '', endDate: '', workingDays: 1, notes: '' });
      if (onSubmitted) onSubmitted();
    }, 2500);
  };

  if (done) {
    return (
      <div className="flex-1 bg-ew-bg flex items-center justify-center p-8">
        <div className="bg-white border border-ew-border rounded-xl p-10 flex flex-col items-center gap-4 max-w-sm w-full text-center shadow-sm">
          <CheckCircle2 className="w-12 h-12 text-emerald-500" />
          <h2 className="text-lg font-bold text-navy">Request submitted!</h2>
          <p className="text-sm text-ew-body">Elena will review and confirm shortly. You'll be redirected to the tracker now.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-navy">Submit a Time Off Request</h1>
          <p className="text-ew-muted text-sm mt-0.5">Elena will review and confirm your request</p>
        </div>

        <div className="bg-white border border-ew-border rounded-xl p-6 space-y-4">
          <div>
            <label className={labelCls}>Your name *</label>
            <select className={inputCls} value={form.teamMember} onChange={e => up('teamMember', e.target.value)}>
              {MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div>
            <label className={labelCls}>Request type *</label>
            <div className="flex gap-2">
              {['Vacation', 'Sick Day', 'Other'].map(t => (
                <button
                  key={t}
                  onClick={() => up('type', t)}
                  className={`flex-1 py-2 text-sm font-medium rounded-lg border transition-colors ${
                    form.type === t
                      ? 'bg-navy text-white border-navy'
                      : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Start date *</label>
              <input type="date" className={inputCls} value={form.startDate} onChange={e => up('startDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>End date</label>
              <input type="date" className={inputCls} value={form.endDate} onChange={e => up('endDate', e.target.value)} />
            </div>
          </div>

          <div>
            <label className={labelCls}>How many working days is this?</label>
            <input type="number" min="0.5" step="0.5" className={inputCls} value={form.workingDays}
              onChange={e => up('workingDays', parseFloat(e.target.value) || 1)} />
          </div>

          <div>
            <label className={labelCls}>Notes <span className="text-ew-muted font-normal">(optional)</span></label>
            <textarea
              className={inputCls + ' h-24 resize-none'}
              value={form.notes}
              onChange={e => up('notes', e.target.value)}
              placeholder="Anything Elena should know — e.g. project handover, cover needed…"
            />
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting || !form.teamMember || !form.type || !form.startDate}
            className="w-full py-2.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40"
          >
            {submitting ? 'Submitting…' : 'Submit Request'}
          </button>
        </div>
      </div>
    </div>
  );
}