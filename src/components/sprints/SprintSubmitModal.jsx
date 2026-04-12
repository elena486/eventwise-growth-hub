import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, currentWeekStart, getWeekNumber } from '@/lib/sprintConfig';
import { X, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';

export default function SprintSubmitModal({ onClose, onSaved }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);

  const weekStart = currentWeekStart();
  const weekNum = getWeekNumber(weekStart);
  const year = new Date(weekStart).getFullYear();
  const member = MEMBERS.find(m => m.id === selectedMemberId);

  useEffect(() => {
    if (!member) return;
    setAnswers({});
    setExistingId(null);
    base44.entities.SprintSubmission.filter({ memberName: member.name, weekStart }).then(results => {
      if (results.length > 0) {
        setExistingId(results[0].id);
        try { setAnswers(JSON.parse(results[0].answers || '{}')); } catch {}
      }
    });
    base44.entities.SprintSubmission.filter({ memberName: member.name }).then(all => {
      const sorted = all.filter(s => s.weekStart < weekStart).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      setLastSubmission(sorted[0] || null);
    });
  }, [selectedMemberId]);

  const handleChange = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }));

  const handleSubmit = async () => {
    if (!member) return;
    setSaving(true);
    const kpi1 = answers[member.kpi1.questionId];
    const kpi2 = answers[member.kpi2.questionId];
    const payload = {
      memberName: member.name, weekStart, answers: JSON.stringify(answers),
      kpi1Value: kpi1 != null ? Number(kpi1) : undefined,
      kpi2Value: kpi2 != null ? Number(kpi2) : undefined,
    };
    if (existingId) await base44.entities.SprintSubmission.update(existingId, payload);
    else await base44.entities.SprintSubmission.create(payload);
    setSaving(false); setSaved(true);
    setTimeout(() => onSaved(), 800);
  };

  const handleDuplicate = () => {
    if (!lastSubmission) return;
    try { setAnswers(JSON.parse(lastSubmission.answers || '{}')); } catch {}
  };

  const sections = member ? [...new Set(member.questions.map(q => q.section).filter(Boolean))] : [];
  const hasSections = sections.length > 0;

  const renderQuestion = (q, idx) => (
    <div key={q.id} className="mb-4">
      <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-1.5">
        {q.label}
        {q.targetLabel && <span className="text-xs font-normal text-gray-400">{q.targetLabel}</span>}
      </label>
      {q.type === 'text' ? (
        <textarea rows={2} placeholder={q.placeholder || 'Your answer…'}
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] resize-none"
          value={answers[q.id] || ''} onChange={e => handleChange(q.id, e.target.value)} />
      ) : q.type === 'confidence' ? (
        <div className="flex gap-2">
          {[1,2,3,4,5].map(n => (
            <button key={n} onClick={() => handleChange(q.id, n)}
              className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${answers[q.id] === n ? 'bg-[#8403C5] text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {n}
            </button>
          ))}
        </div>
      ) : (
        <div className="relative">
          <input type="number" min={0} placeholder="0"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5]"
            value={answers[q.id] ?? ''} onChange={e => handleChange(q.id, e.target.value)} />
          {q.suffix && <span className="absolute right-3 top-2.5 text-sm text-gray-400">{q.suffix}</span>}
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900">Submit Weekly Update</h2>
              <p className="text-sm font-semibold text-gray-800 mt-1">Week of {format(new Date(weekStart), 'd MMM yyyy')}</p>
              <p className="text-xs text-gray-400">W{weekNum} {year}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1"><X className="w-5 h-5" /></button>
          </div>

          {existingId && (
            <div className="mt-3 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
              You've already submitted this week — saving will overwrite your previous entry.
            </div>
          )}

          <div className="mt-4 mb-5">
            <label className="block text-sm font-semibold text-gray-800 mb-1.5">Team Member</label>
            <div className="relative">
              <select className="w-full border border-gray-800 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#8403C5] bg-white"
                value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                <option value="">Select person</option>
                {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
              </select>
              <span className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">▾</span>
            </div>
          </div>

          {member && (
            <>
              {member.duplicateLastMonth && lastSubmission && (
                <button onClick={handleDuplicate}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 mb-4 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate last entry
                </button>
              )}

              {hasSections ? sections.map(sec => (
                <div key={sec} className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-100 pb-1">{sec}</p>
                  {member.questions.filter(q => q.section === sec).map((q, i) => renderQuestion(q, i))}
                </div>
              )) : member.questions.map((q, i) => renderQuestion(q, i))}
            </>
          )}

          <button onClick={handleSubmit} disabled={saving || !member}
            className="w-full mt-2 py-3 rounded-xl text-sm font-semibold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            style={{ background: saved ? '#16a34a' : '#8403C5' }}>
            {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Submit Update'}
          </button>
        </div>
      </div>
    </div>
  );
}