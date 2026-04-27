import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, currentWeekStart, getWeekNumber } from '@/lib/sprintConfig';
import { X, Copy, Check, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function SprintSubmitModal({ onClose, onSaved }) {
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [answers, setAnswers] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);

  const weekStart = currentWeekStart();
  const weekNum = getWeekNumber(weekStart);
  const year = new Date(weekStart).getFullYear();
  const member = MEMBERS.find(m => m.id === selectedMemberId);

  useEffect(() => {
    if (!member) return;
    setAnswers({});
    setExistingId(null);
    setSubmitted(false);

    // Check for existing submission this week
    base44.entities.SprintSubmission.filter({ memberName: member.name, weekStart }).then(results => {
      if (results.length > 0) {
        setExistingId(results[0].id);
        try { setAnswers(JSON.parse(results[0].answers || '{}')); } catch {}
      }
    });

    // Load last submission for duplicate
    base44.entities.SprintSubmission.filter({ memberName: member.name }).then(all => {
      const sorted = all.filter(s => s.weekStart < weekStart).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      setLastSubmission(sorted[0] || null);
    });
  }, [selectedMemberId]);

  const handleChange = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    setDraftSaved(false);
  };

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
    setSaving(false);
    setSubmitted(true);
  };

  const handleSaveDraft = () => {
    // Save to localStorage as a draft
    if (!member) return;
    localStorage.setItem(`sprint_draft_${member.id}_${weekStart}`, JSON.stringify(answers));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleDuplicate = () => {
    if (!lastSubmission) return;
    try { setAnswers(JSON.parse(lastSubmission.answers || '{}')); } catch {}
  };

  const sections = member ? [...new Set(member.questions.map(q => q.section).filter(Boolean))] : [];
  const hasSections = sections.length > 0;

  // Load draft on member change
  useEffect(() => {
    if (!member) return;
    const draft = localStorage.getItem(`sprint_draft_${member.id}_${weekStart}`);
    if (draft && !existingId) {
      try { setAnswers(JSON.parse(draft)); } catch {}
    }
  }, [selectedMemberId, existingId]);

  const renderQuestion = (q) => {
    // Find target for number fields
    const isKpi1 = q.id === member?.kpi1?.questionId;
    const isKpi2 = q.id === member?.kpi2?.questionId;
    const target = isKpi1 ? member.kpi1.target : isKpi2 ? member.kpi2.target : null;

    return (
      <div key={q.id} className="mb-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5 flex-wrap">
          {q.label}
          {q.targetLabel && <span className="text-xs font-normal text-gray-400">{q.targetLabel}</span>}
          {target != null && !q.targetLabel && (
            <span className="text-xs font-normal text-gray-400">target: {target}{q.suffix || ''}</span>
          )}
        </label>
        {q.type === 'text' ? (
          <textarea rows={2} placeholder={q.placeholder || 'Your answer…'}
            className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors"
            value={answers[q.id] || ''} onChange={e => handleChange(q.id, e.target.value)} />
        ) : q.type === 'confidence' ? (
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button key={n} type="button" onClick={() => handleChange(q.id, n)}
                className={`w-10 h-10 rounded-xl text-sm font-bold transition-colors ${answers[q.id] === n ? 'bg-[#8403C5] text-white' : 'bg-gray-100 dark:bg-[#2A2A3E] text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-[#353545]'}`}>
                {n}
              </button>
            ))}
          </div>
        ) : (
          <div className="relative">
            {q.prefix && <span className="absolute left-3 top-2.5 text-sm text-gray-400">{q.prefix}</span>}
            <input type="number" min={0} placeholder="0"
              className={`w-full border border-gray-300 dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-lg py-2 text-sm outline-none focus:border-[#8403C5] transition-colors ${q.prefix ? 'pl-7 pr-3' : 'px-3'}`}
              value={answers[q.id] ?? ''} onChange={e => handleChange(q.id, e.target.value)} />
            {q.suffix && <span className="absolute right-3 top-2.5 text-sm text-gray-400">{q.suffix}</span>}
          </div>
        )}
      </div>
    );
  };

  if (submitted) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-md shadow-2xl p-8 text-center">
          <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Update submitted!</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
            Week of {format(new Date(weekStart), 'd MMM yyyy')} — thanks {member?.name.split(' ')[0]}!
          </p>
          <div className="flex gap-3 justify-center">
            <button onClick={onSaved}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
              View dashboard <ChevronRight className="w-4 h-4" />
            </button>
            <button onClick={onClose}
              className="px-5 py-2.5 border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 rounded-xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="p-6">
          {/* Header */}
          <div className="flex items-start justify-between mb-1">
            <div>
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Submit Weekly Update</h2>
              <p className="text-sm font-semibold text-[#8403C5] mt-1">
                Week of {format(new Date(weekStart), 'd MMM yyyy')}
              </p>
              <p className="text-xs text-gray-400">W{weekNum} {year}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Existing submission warning */}
          {existingId && (
            <div className="mt-3 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
              <p className="text-xs text-amber-700 dark:text-amber-400 font-semibold">
                You've already submitted for this week. Saving will overwrite your previous entry.
              </p>
            </div>
          )}

          {/* Member selector */}
          <div className="mt-4 mb-5">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">Team Member</label>
            <div className="relative">
              <select
                className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-xl px-4 py-3 text-sm appearance-none outline-none focus:border-[#8403C5] bg-white transition-colors"
                value={selectedMemberId} onChange={e => setSelectedMemberId(e.target.value)}>
                <option value="">Select person</option>
                {MEMBERS.map(m => <option key={m.id} value={m.id}>{m.name} — {m.role}</option>)}
              </select>
              <span className="absolute right-3 top-3.5 text-gray-400 pointer-events-none">▾</span>
            </div>
          </div>

          {member && (
            <>
              {/* Duplicate last entry button */}
              {(member.duplicateLastMonth || true) && lastSubmission && (
                <button onClick={handleDuplicate}
                  className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-1.5 hover:bg-gray-50 dark:hover:bg-[#252535] mb-4 transition-colors">
                  <Copy className="w-3.5 h-3.5" /> Duplicate last entry ({format(new Date(lastSubmission.weekStart), 'd MMM')})
                </button>
              )}

              {/* Questions */}
              {hasSections ? sections.map(sec => (
                <div key={sec} className="mb-4">
                  <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3 border-b border-gray-100 dark:border-gray-700 pb-1">{sec}</p>
                  {member.questions.filter(q => q.section === sec).map(q => renderQuestion(q))}
                </div>
              )) : member.questions.map(q => renderQuestion(q))}
            </>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-2">
            {member && (
              <button onClick={handleSaveDraft}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors ${draftSaved ? 'border-green-500 text-green-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252535]'}`}>
                {draftSaved ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Draft saved</span> : 'Save draft'}
              </button>
            )}
            <button onClick={handleSubmit} disabled={saving || !member}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-[#8403C5] hover:bg-[#6d02a3]">
              {saving ? 'Saving…' : 'Submit Update'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}