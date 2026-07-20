import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, currentWeekStart, getWeekNumber, subWeeks } from '@/lib/sprintConfig';
import { X, Copy, Check, ChevronRight, AlertTriangle } from 'lucide-react';
import { format, addDays } from 'date-fns';
import { logActivity } from '@/lib/logActivity';

const SELF_RATINGS = [
  { value: 'on_track',  label: 'On track',  emoji: '🟢', color: 'border-green-400 bg-green-50 text-green-700' },
  { value: 'at_risk',   label: 'At risk',   emoji: '🟡', color: 'border-amber-400 bg-amber-50 text-amber-700' },
  { value: 'off_track', label: 'Off track', emoji: '🔴', color: 'border-red-400 bg-red-50 text-red-700' },
];

function weekRangeLabel(monStr) {
  const mon = new Date(monStr);
  const sun = addDays(mon, 6);
  return `${format(mon, 'd MMM')} – ${format(sun, 'd MMM')}`;
}

export default function SprintSubmitModal({ onClose, onSaved }) {
  const thisWeek = currentWeekStart();
  const [selectedWeek, setSelectedWeek] = useState(thisWeek);
  const prevWeekRef = useRef(thisWeek);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [answers, setAnswers] = useState({});
  const [selfRating, setSelfRating] = useState('');
  const [selfRatingReason, setSelfRatingReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [existingData, setExistingData] = useState(null);
  const [showDuplicateWarning, setShowDuplicateWarning] = useState(false);
  const [lastSubmission, setLastSubmission] = useState(null);
  const [draftSaved, setDraftSaved] = useState(false);
  const [notes, setNotes] = useState('');

  const weekStart = selectedWeek;
  const weekNum = getWeekNumber(weekStart);
  const year = new Date(weekStart).getFullYear();
  const member = MEMBERS.find(m => m.id === selectedMemberId);

  const weekOptions = [
    { value: thisWeek, label: 'This week', sub: weekRangeLabel(thisWeek) },
    { value: subWeeks(thisWeek, 1), label: 'Last week', sub: weekRangeLabel(subWeeks(thisWeek, 1)) },
    { value: subWeeks(thisWeek, 2), label: '2 weeks ago', sub: weekRangeLabel(subWeeks(thisWeek, 2)) },
    { value: subWeeks(thisWeek, 3), label: '3 weeks ago', sub: weekRangeLabel(subWeeks(thisWeek, 3)) },
  ];

  useEffect(() => {
    if (!member) return;
    setAnswers({});
    setExistingId(null);
    setExistingData(null);
    setShowDuplicateWarning(false);
    setSubmitted(false);
    setSelfRating('');
    setSelfRatingReason('');
    setNotes('');

    base44.entities.SprintSubmission.filter({ memberName: member.name, weekStart }).then(results => {
      if (results.length > 0) {
        const existing = results[0];
        setExistingId(existing.id);
        setExistingData(existing);
        setShowDuplicateWarning(true);
        try { setAnswers(JSON.parse(existing.answers || '{}')); } catch {}
        setSelfRating(existing.selfRating || '');
        setSelfRatingReason(existing.selfRatingReason || '');
        setNotes(existing.notes || '');
      }
    });

    base44.entities.SprintSubmission.filter({ memberName: member.name }).then(all => {
      const sorted = all.filter(s => s.weekStart < weekStart).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
      setLastSubmission(sorted[0] || null);
    });
  }, [selectedMemberId, selectedWeek]);

  const handleWeekChange = (newWeek) => {
    if (newWeek === selectedWeek) return;
    prevWeekRef.current = selectedWeek;
    setSelectedWeek(newWeek);
  };

  const handleEditExisting = () => {
    if (!existingData) return;
    try { setAnswers(JSON.parse(existingData.answers || '{}')); } catch {}
    setSelfRating(existingData.selfRating || '');
    setSelfRatingReason(existingData.selfRatingReason || '');
    setNotes(existingData.notes || '');
    setShowDuplicateWarning(false);
  };

  const handleChange = (qid, value) => {
    setAnswers(prev => ({ ...prev, [qid]: value }));
    setDraftSaved(false);
  };

  const needsReason = selfRating === 'at_risk' || selfRating === 'off_track';
  const canSubmit = member && selfRating && (!needsReason || selfRatingReason.trim()) && !showDuplicateWarning;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    const kpi1 = answers[member.kpi1.questionId];
    const kpi2 = answers[member.kpi2.questionId];
    const payload = {
      memberName: member.name, weekStart, answers: JSON.stringify(answers),
      kpi1Value: kpi1 != null ? Number(kpi1) : undefined,
      kpi2Value: kpi2 != null ? Number(kpi2) : undefined,
      selfRating,
      selfRatingReason: needsReason ? selfRatingReason.trim() : '',
      notes: notes.trim(),
    };
    if (existingId) await base44.entities.SprintSubmission.update(existingId, payload);
    else await base44.entities.SprintSubmission.create(payload);
    logActivity({ teamMember: member.name, actionType: existingId ? 'Edited a sprint update' : 'Submitted a sprint update', section: 'Sprints', recordName: `Week of ${format(new Date(weekStart), 'd MMM')}` });
    setSaving(false);
    setSubmitted(true);
  };

  const handleSaveDraft = () => {
    if (!member) return;
    localStorage.setItem(`sprint_draft_${member.id}_${weekStart}`, JSON.stringify({ answers, selfRating, selfRatingReason, notes }));
    setDraftSaved(true);
    setTimeout(() => setDraftSaved(false), 2000);
  };

  const handleDuplicate = () => {
    if (!lastSubmission) return;
    try { setAnswers(JSON.parse(lastSubmission.answers || '{}')); } catch {}
  };

  const sections = member ? [...new Set(member.questions.map(q => q.section).filter(Boolean))] : [];
  const hasSections = sections.length > 0;

  useEffect(() => {
    if (!member) return;
    const draft = localStorage.getItem(`sprint_draft_${member.id}_${weekStart}`);
    if (draft && !existingId) {
      try {
        const parsed = JSON.parse(draft);
        setAnswers(parsed.answers || {});
        setSelfRating(parsed.selfRating || '');
        setSelfRatingReason(parsed.selfRatingReason || '');
        setNotes(parsed.notes || '');
      } catch {}
    }
  }, [selectedMemberId, selectedWeek, existingId]);

  const renderQuestion = (q) => {
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

          {/* ── Week selector — first field ── */}
          <div className="mt-4 mb-5">
            <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-2">Which week is this update for?</label>
            <div className="grid grid-cols-2 gap-2">
              {weekOptions.map(opt => {
                const active = selectedWeek === opt.value;
                return (
                  <button key={opt.value} type="button" onClick={() => handleWeekChange(opt.value)}
                    className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border-2 text-left transition-all ${active ? 'border-[#8403C5] bg-[#F3E8FF] dark:bg-[#2e1065]' : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'}`}>
                    <span className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${active ? 'border-[#8403C5] bg-[#8403C5]' : 'border-gray-300 dark:border-gray-500'}`}>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </span>
                    <span className="min-w-0">
                      <span className={`block text-xs font-semibold ${active ? 'text-[#8403C5] dark:text-[#c084fc]' : 'text-gray-700 dark:text-gray-200'}`}>{opt.label}</span>
                      <span className="block text-[10px] text-gray-400">{opt.sub}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {member && showDuplicateWarning && (
            <div className="mt-3 mb-5 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm text-amber-800 dark:text-amber-300 font-medium">
                    You've already submitted an update for this week.
                  </p>
                  <button onClick={handleEditExisting} className="mt-1.5 flex items-center gap-1 text-sm font-semibold text-[#8403C5] hover:underline">
                    Edit your existing submission →
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Member selector */}
          <div className="mb-5">
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
              {/* ── Self-assessment — required, shown first ── */}
              <div className="mb-5 p-4 bg-gray-50 dark:bg-[#252535] rounded-xl border border-gray-200 dark:border-gray-600">
                <label className="block text-sm font-bold text-gray-800 dark:text-gray-200 mb-3">
                  How would you rate this week? <span className="text-red-500">*</span>
                </label>
                <div className="flex gap-2">
                  {SELF_RATINGS.map(r => (
                    <button key={r.value} type="button" onClick={() => setSelfRating(r.value)}
                      className={`flex-1 flex flex-col items-center gap-1 px-3 py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                        selfRating === r.value
                          ? r.color + ' border-opacity-100'
                          : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-gray-300 dark:hover:border-gray-500'
                      }`}>
                      <span className="text-xl">{r.emoji}</span>
                      <span>{r.label}</span>
                    </button>
                  ))}
                </div>

                {needsReason && (
                  <div className="mt-3">
                    <label className="block text-xs font-semibold text-gray-600 dark:text-gray-400 mb-1.5">
                      What's the reason? <span className="text-red-500">*</span>
                      <span className="font-normal text-gray-400 ml-1">(1–2 sentences)</span>
                    </label>
                    <textarea rows={2} placeholder="Briefly explain what's causing this…"
                      className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors"
                      value={selfRatingReason} onChange={e => setSelfRatingReason(e.target.value)} />
                  </div>
                )}
              </div>

              {/* Duplicate last entry button */}
              {lastSubmission && !showDuplicateWarning && (
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

              {/* ── Notes / Commentary — optional ── */}
              <div className="mb-5">
                <label className="block text-sm font-semibold text-gray-800 dark:text-gray-200 mb-1.5">
                  Notes / Commentary <span className="text-xs font-normal text-gray-400">(optional)</span>
                </label>
                <textarea rows={3} placeholder="Any context, highlights, blockers or additional detail for this week..."
                  className="w-full border border-gray-300 dark:border-gray-600 dark:bg-[#2A2A3E] dark:text-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5] resize-none transition-colors"
                  value={notes} onChange={e => { setNotes(e.target.value); setDraftSaved(false); }} />
              </div>
            </>
          )}

          {/* Actions */}
          {member && (
            <div className="flex gap-2 mt-2">
              <button onClick={handleSaveDraft} disabled={showDuplicateWarning}
                className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${draftSaved ? 'border-green-500 text-green-600' : 'border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-[#252535]'}`}>
                {draftSaved ? <span className="flex items-center gap-1"><Check className="w-3.5 h-3.5" /> Draft saved</span> : 'Save draft'}
              </button>
              <button onClick={handleSubmit} disabled={saving || !canSubmit}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors flex items-center justify-center gap-2 disabled:opacity-50 bg-[#8403C5] hover:bg-[#6d02a3]">
                {saving ? 'Saving…' : (showDuplicateWarning ? 'Submit Update' : (existingId ? 'Update Submission' : 'Submit Update'))}
              </button>
            </div>
          )}
          {member && !showDuplicateWarning && !selfRating && (
            <p className="text-xs text-center text-gray-400 mt-2">Please rate your week before submitting</p>
          )}
          {member && !showDuplicateWarning && needsReason && !selfRatingReason.trim() && (
            <p className="text-xs text-center text-amber-600 mt-2">Please add a reason for your rating</p>
          )}
        </div>
      </div>
    </div>
  );
}