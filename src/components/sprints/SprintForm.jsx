import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, getMonday } from '@/lib/sprintConfig';

export default function SprintForm({ user }) {
  const [selectedMember, setSelectedMember] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [existingId, setExistingId] = useState(null);

  const member = MEMBERS.find(m => m.name === selectedMember);
  const weekStart = getMonday();

  // Auto-select member based on logged-in user
  useEffect(() => {
    if (!user) return;
    const match = MEMBERS.find(m =>
      m.name.toLowerCase().includes((user.full_name || '').toLowerCase().split(' ')[0].toLowerCase()) ||
      (user.full_name || '').toLowerCase().includes(m.name.toLowerCase().split(' ')[0].toLowerCase())
    );
    if (match) setSelectedMember(match.name);
  }, [user]);

  // Load existing submission for this week
  useEffect(() => {
    if (!selectedMember) return;
    base44.entities.SprintSubmission.filter({ memberName: selectedMember, weekStart })
      .then(data => {
        if (data.length > 0) {
          setExistingId(data[0].id);
          try { setAnswers(JSON.parse(data[0].answers || '{}')); } catch { setAnswers({}); }
        } else {
          setExistingId(null);
          setAnswers({});
        }
      });
  }, [selectedMember]);

  const handleDuplicateLast = async () => {
    const all = await base44.entities.SprintSubmission.filter({ memberName: selectedMember });
    const sorted = all.sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const last = sorted.find(s => s.weekStart !== weekStart);
    if (last) {
      try { setAnswers(JSON.parse(last.answers || '{}')); } catch {}
    }
  };

  const handleSave = async () => {
    if (!member) return;
    setSaving(true);
    const numericAnswers = {};
    member.questions.forEach(q => {
      numericAnswers[q.id] = q.type === 'number' ? (parseFloat(answers[q.id]) || 0) : (answers[q.id] || '');
    });
    const kpi1Val = parseFloat(numericAnswers[member.kpi1.id]) || 0;
    const kpi2Val = parseFloat(numericAnswers[member.kpi2.id]) || 0;
    const payload = {
      memberName: selectedMember,
      weekStart,
      answers: JSON.stringify(numericAnswers),
      kpi1Value: kpi1Val,
      kpi2Value: kpi2Val,
    };
    if (existingId) {
      await base44.entities.SprintSubmission.update(existingId, payload);
    } else {
      await base44.entities.SprintSubmission.create(payload);
    }
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Member selector */}
      <div className="bg-white border border-ew-border rounded-xl p-6 mb-6">
        <label className="block text-xs font-semibold text-ew-muted uppercase tracking-wide mb-2">Who are you?</label>
        <select
          className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy"
          value={selectedMember}
          onChange={e => setSelectedMember(e.target.value)}
        >
          <option value="">Select your name…</option>
          {MEMBERS.map(m => <option key={m.name} value={m.name}>{m.name} — {m.role}</option>)}
        </select>
      </div>

      {member && (
        <div className="bg-white border border-ew-border rounded-xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-base font-bold text-navy">{member.name}</h2>
              <p className="text-xs text-ew-muted">{member.role} · Week of {weekStart}</p>
            </div>
            <div className="flex gap-2 items-center">
              {member.allowDuplicateLast && (
                <button
                  onClick={handleDuplicateLast}
                  className="text-xs px-3 py-1.5 border border-ew-border rounded-lg text-ew-body hover:bg-ew-bg transition-colors"
                >
                  Duplicate last month
                </button>
              )}
              {existingId && <span className="text-xs text-green-600 font-medium bg-green-50 px-2.5 py-1 rounded-full">Already submitted this week</span>}
            </div>
          </div>

          <div className="space-y-5">
            {member.questions.map((q, i) => (
              <div key={q.id}>
                <label className="block text-sm font-medium text-navy mb-1.5">
                  {i + 1}. {q.label}
                  {q.prefix && <span className="ml-1 text-xs text-ew-muted">({q.prefix})</span>}
                  {q.suffix && <span className="ml-1 text-xs text-ew-muted">({q.suffix})</span>}
                </label>
                {q.type === 'text' ? (
                  <textarea
                    className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy resize-none"
                    rows={2}
                    value={answers[q.id] || ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="Type here…"
                  />
                ) : (
                  <input
                    type="number"
                    className="w-48 border border-ew-border rounded-lg px-3 py-2 text-sm text-navy focus:outline-none focus:border-navy"
                    value={answers[q.id] ?? ''}
                    onChange={e => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                    placeholder="0"
                  />
                )}
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving…' : existingId ? 'Update submission' : 'Submit update'}
            </button>
            {saved && <span className="text-sm text-green-600 font-medium">✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}