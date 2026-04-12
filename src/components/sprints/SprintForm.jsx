import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, currentWeekStart } from '@/lib/sprintConfig';
import { Check, Copy } from 'lucide-react';

export default function SprintForm({ currentUser }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);

  const weekStart = currentWeekStart();
  const member = MEMBERS.find(m => m.id === selectedMemberId);

  // Auto-select based on current user name
  useEffect(() => {
    if (currentUser?.full_name) {
      const match = MEMBERS.find(m =>
        m.name.toLowerCase().includes(currentUser.full_name.split(' ')[0].toLowerCase())
      );
      if (match) setSelectedMemberId(match.id);
    }
  }, [currentUser]);

  // Load existing submission for this week
  useEffect(() => {
    if (!member) return;
    setAnswers({});
    setExistingId(null);
    base44.entities.SprintSubmission.filter({ memberName: member.name, weekStart }).then(results => {
      if (results.length > 0) {
        const sub = results[0];
        setExistingId(sub.id);
        try { setAnswers(JSON.parse(sub.answers || '{}')); } catch { setAnswers({}); }
      }
    });
    // Load last submission for duplicate feature
    base44.entities.SprintSubmission.filter({ memberName: member.name }).then(all => {
      const sorted = all.filter(s => s.weekStart < weekStart).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      setLastSubmission(sorted[0] || null);
    });
  }, [selectedMemberId, weekStart]);

  const handleChange = (qid, value) => setAnswers(prev => ({ ...prev, [qid]: value }));

  const getKpiValues = () => {
    if (!member) return {};
    const kpi1 = answers[member.kpi1.questionId];
    const kpi2 = answers[member.kpi2.questionId];
    return { kpi1Value: kpi1 != null ? Number(kpi1) : undefined, kpi2Value: kpi2 != null ? Number(kpi2) : undefined };
  };

  const handleSubmit = async () => {
    if (!member) return;
    setSaving(true);
    const { kpi1Value, kpi2Value } = getKpiValues();
    const payload = { memberName: member.name, weekStart, answers: JSON.stringify(answers), kpi1Value, kpi2Value };
    if (existingId) await base44.entities.SprintSubmission.update(existingId, payload);
    else await base44.entities.SprintSubmission.create(payload);
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const handleDuplicate = () => {
    if (!lastSubmission) return;
    try { setAnswers(JSON.parse(lastSubmission.answers || '{}')); } catch {}
  };

  const renderSection = (sectionLabel, questions) => (
    <div key={sectionLabel} className="mb-6">
      {sectionLabel && (
        <p className="text-xs font-bold text-navy uppercase tracking-wide mb-3 border-b border-ew-border pb-1">{sectionLabel}</p>
      )}
      <div className="space-y-4">
        {questions.map((q, i) => (
          <div key={q.id}>
            <label className="block text-sm font-medium text-ew-body mb-1">
              {i + 1}. {q.label}
              {q.prefix && <span className="ml-1 text-ew-muted text-xs">({q.prefix})</span>}
              {q.suffix && <span className="ml-1 text-ew-muted text-xs">({q.suffix})</span>}
            </label>
            {q.type === 'text' ? (
              <textarea
                className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy resize-none"
                rows={2}
                value={answers[q.id] || ''}
                onChange={e => handleChange(q.id, e.target.value)}
                placeholder="Your answer…"
              />
            ) : (
              <input
                type="number"
                className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                value={answers[q.id] ?? ''}
                onChange={e => handleChange(q.id, e.target.value)}
                placeholder="0"
              />
            )}
          </div>
        ))}
      </div>
    </div>
  );

  // Group Chris's questions by section
  const renderQuestions = () => {
    if (!member) return null;
    const sections = [...new Set(member.questions.map(q => q.section).filter(Boolean))];
    if (sections.length > 1) {
      return sections.map(sec => renderSection(sec, member.questions.filter(q => q.section === sec)));
    }
    return renderSection(null, member.questions);
  };

  return (
    <div className="bg-white border border-ew-border rounded-xl p-6 max-w-xl">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="font-bold text-navy text-base">Weekly Update</h2>
          <p className="text-xs text-ew-muted mt-0.5">Week of {weekStart}</p>
        </div>
        {member?.duplicateLastMonth && lastSubmission && (
          <button
            onClick={handleDuplicate}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-ew-border rounded-lg text-xs text-ew-body hover:bg-ew-bg transition-colors"
          >
            <Copy className="w-3 h-3" /> Duplicate last entry
          </button>
        )}
      </div>

      {/* Member selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide block mb-1">You are</label>
        <select
          className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none"
          value={selectedMemberId}
          onChange={e => setSelectedMemberId(e.target.value)}
        >
          <option value="">Select your name…</option>
          {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
        </select>
      </div>

      {existingId && (
        <div className="mb-4 px-3 py-2 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-700">
          You've already submitted this week — saving will overwrite your previous entry.
        </div>
      )}

      {member && renderQuestions()}

      {member && (
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="w-full mt-2 bg-navy text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saved ? <><Check className="w-4 h-4" /> Saved!</> : saving ? 'Saving…' : 'Submit weekly update'}
        </button>
      )}
    </div>
  );
}