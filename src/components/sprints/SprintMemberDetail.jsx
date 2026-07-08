import React, { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer
} from 'recharts';
import { ArrowLeft, Trash2, Sparkles, AlertTriangle } from 'lucide-react';
import { ragColor, RAG_STYLES, formatKpiValue } from '@/lib/sprintConfig';
import { base44 } from '@/api/base44Client';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { format } from 'date-fns';

const SELF_RATING_CONFIG = {
  on_track:  { label: 'On track',  emoji: '🟢', color: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200' },
  at_risk:   { label: 'At risk',   emoji: '🟡', color: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200' },
  off_track: { label: 'Off track', emoji: '🔴', color: 'text-red-600',   bg: 'bg-red-50',   border: 'border-red-200' },
};

function calcTrend(vals) {
  const v = vals.filter(x => x != null);
  if (v.length < 3) return 'stable';
  const recent = v.slice(-3);
  if (recent[2] > recent[0]) return 'improving';
  if (recent[2] < recent[0]) return 'declining';
  return 'stable';
}

// Count weeks where self-rating = on_track; only count rows that have a selfRating
function weeksOnTrackSelfRated(subs, n = 8) {
  const rated = subs.slice(-n).filter(s => s.selfRating);
  const onTrack = rated.filter(s => s.selfRating === 'on_track').length;
  return { onTrack, total: rated.length, hasUnrated: subs.slice(-n).length > rated.length };
}

const TREND_CONFIG = {
  improving: { label: '↑ Improving', color: 'text-green-600', bg: 'bg-green-50' },
  stable:    { label: '→ Stable',    color: 'text-amber-600', bg: 'bg-amber-50' },
  declining: { label: '↓ Declining', color: 'text-red-600',   bg: 'bg-red-50' },
};

// Per-metric hit/miss indicator
function NotesCell({ text, expanded, onToggle }) {
  const limit = 60;
  if (expanded || text.length <= limit) {
    return (
      <div className="max-w-[220px]">
        <p className="text-xs text-gray-600 dark:text-gray-300 whitespace-pre-wrap break-words">{text}</p>
        {text.length > limit && (
          <button onClick={onToggle} className="text-[10px] text-[#8403C5] hover:underline mt-0.5">show less</button>
        )}
      </div>
    );
  }
  return (
    <div className="max-w-[220px]">
      <p className="text-xs text-gray-600 dark:text-gray-300">{text.slice(0, limit)}…</p>
      <button onClick={onToggle} className="text-[10px] text-[#8403C5] hover:underline mt-0.5">read more</button>
    </div>
  );
}

function MetricStatus({ value, target }) {
  if (value == null) return <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> No data</span>;
  if (target == null) return <span className="flex items-center gap-1 text-[10px] text-gray-400"><span className="w-2 h-2 rounded-full bg-gray-300 inline-block" /> No target</span>;
  const hit = target === 0 ? value === 0 : value >= target;
  return hit
    ? <span className="flex items-center gap-1 text-[10px] font-semibold text-green-700"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Hit target</span>
    : <span className="flex items-center gap-1 text-[10px] font-semibold text-red-600"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" /> Missed target</span>;
}

function KpiChart({ data, kpiKey, target, label }) {
  if (!data || data.length < 2) {
    return (
      <div className="bg-white dark:bg-[#1E1E2E] rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center justify-center h-40">
        <p className="text-xs text-gray-400 italic text-center">More data needed for trends — keep submitting weekly updates</p>
      </div>
    );
  }
  const vals = data.map(d => d[kpiKey]).filter(v => v != null);
  const lineColor = vals.length > 0 && target != null
    ? ragColor(vals[vals.length - 1], target) === 'green' ? '#15803D'
    : ragColor(vals[vals.length - 1], target) === 'amber' ? '#A16207' : '#B91C1C'
    : '#8403C5';

  return (
    <div className="bg-white dark:bg-[#1E1E2E] rounded-xl p-5 border border-gray-200 dark:border-gray-700">
      <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide mb-4">{label}</p>
      <ResponsiveContainer width="100%" height={180}>
        <LineChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
          <XAxis dataKey="week" tick={{ fontSize: 10, fontFamily: 'var(--font-dm)' }} />
          <YAxis tick={{ fontSize: 10, fontFamily: 'var(--font-dm)' }} />
          <Tooltip
            contentStyle={{ fontFamily: 'var(--font-dm)', fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB' }}
            formatter={(value) => [value, label]}
          />
          {target != null && (
            <ReferenceLine y={target} stroke="#9CA3AF" strokeDasharray="4 3" label={{ value: 'Target', fontSize: 9, fill: '#9CA3AF' }} />
          )}
          <Line
            type="monotone"
            dataKey={kpiKey}
            stroke={lineColor}
            strokeWidth={2}
            dot={{ r: 4, fill: lineColor, strokeWidth: 0 }}
            activeDot={{ r: 6 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export default function SprintMemberDetail({ member, history, allHistory, onBack, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState({});
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiDate, setAiDate] = useState('');

  const all = (allHistory || history);
  const last8 = all.slice(-8);
  const latest = all.length > 0 ? all[all.length - 1] : null;

  const chartData = last8.map(s => ({
    week: s.weekStart ? format(new Date(s.weekStart), 'd MMM') : s.weekStart,
    [member.kpi1.label]: s.kpi1Value ?? null,
    [member.kpi2.label]: s.kpi2Value ?? null,
  }));

  const kpi1Vals = last8.map(s => s.kpi1Value ?? null);
  const kpi2Vals = last8.map(s => s.kpi2Value ?? null);
  const trendOverall = calcTrend(kpi1Vals) === 'improving' || calcTrend(kpi2Vals) === 'improving' ? 'improving'
    : calcTrend(kpi1Vals) === 'declining' || calcTrend(kpi2Vals) === 'declining' ? 'declining' : 'stable';
  const trendCfg = TREND_CONFIG[trendOverall];

  // On track count — self-rated only
  const { onTrack: onTrackCount, total: ratedTotal, hasUnrated } = weeksOnTrackSelfRated(all, 8);

  // Per-metric status for latest
  const rag1 = latest?.kpi1Value != null ? ragColor(latest.kpi1Value, member.kpi1.target) : null;
  const rag2 = latest?.kpi2Value != null ? ragColor(latest.kpi2Value, member.kpi2.target) : null;

  // Self-assessment for latest
  const selfRatingCfg = latest?.selfRating ? SELF_RATING_CONFIG[latest.selfRating] : null;

  // Contradiction flag: self-assessed on_track but metric(s) missed
  const kpi1Missed = latest?.kpi1Value != null && rag1 && rag1 !== 'green';
  const kpi2Missed = latest?.kpi2Value != null && rag2 && rag2 !== 'green';
  const missedCount = [kpi1Missed, kpi2Missed].filter(Boolean).length;
  const showContradiction = latest?.selfRating === 'on_track' && missedCount > 0;

  // Qualitative history
  const qualHistoryItems = [...all].reverse().map(s => {
    let answers = {};
    try { answers = JSON.parse(s.answers || '{}'); } catch {}
    const quals = member.qualitativeIds
      .map(qid => {
        const q = member.questions.find(q => q.id === qid);
        const val = answers[qid];
        return q && val ? { label: q.label, value: val } : null;
      }).filter(Boolean);
    if (quals.length === 0) return null;
    return { weekStart: s.weekStart, quals };
  }).filter(Boolean);

  const generateAISummary = async () => {
    setAiLoading(true);
    const recent4 = all.slice(-4);
    const dataStr = recent4.map(s => {
      let answers = {};
      try { answers = JSON.parse(s.answers || '{}'); } catch {}
      const quals = member.qualitativeIds.map(qid => {
        const q = member.questions.find(q => q.id === qid);
        const val = answers[qid];
        return q && val ? `${q.label}: ${val}` : null;
      }).filter(Boolean).join('; ');
      return `Week ${s.weekStart}: ${member.kpi1.label}=${s.kpi1Value ?? '—'} (target ${member.kpi1.target}), ${member.kpi2.label}=${s.kpi2Value ?? '—'} (target ${member.kpi2.target}). ${quals}`;
    }).join('\n');

    const prompt = `You are analysing the sprint performance for ${member.name} (${member.role}) at Eventwise.

Here is their last 4 weeks of data:
${dataStr}

Write a 3-4 sentence plain English performance summary covering:
1. Overall performance trend
2. What they are doing well
3. What needs attention
4. One specific recommendation

Be specific and actionable. Reference actual numbers and targets. Use a direct, helpful tone.`;

    try {
      const res = await base44.integrations.Core.InvokeLLM({ prompt });
      setAiSummary(res);
      setAiDate(format(new Date(), 'd MMM yyyy, HH:mm'));
    } catch (e) {
      setAiSummary('Unable to generate summary. Please try again.');
    }
    setAiLoading(false);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm bg-[#f5f6fa] dark:bg-[#0F0F1A]">
      <div className="flex-1 overflow-y-auto p-6 max-w-5xl w-full mx-auto">
        {/* Back */}
        <button onClick={onBack}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-white mb-5 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>

        {/* Page header — name, role, self-assessment */}
        <div className="mb-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{member.name}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5">{member.role}</p>
              {latest && (
                <p className="text-xs text-gray-400 mt-1">
                  Last submitted: {format(new Date(latest.weekStart), 'd MMM yyyy')}
                </p>
              )}
            </div>
          </div>

          {/* Self-assessment panel */}
          {selfRatingCfg && (
            <div className={`mt-4 inline-flex flex-col gap-1 px-4 py-3 rounded-xl border ${selfRatingCfg.bg} ${selfRatingCfg.border}`}>
              <span className={`text-sm font-bold ${selfRatingCfg.color}`}>
                This week: {selfRatingCfg.emoji} {selfRatingCfg.label}
              </span>
              {latest.selfRatingReason && (
                <span className="text-xs text-gray-500 italic">{latest.selfRatingReason}</span>
              )}
            </div>
          )}

          {/* Contradiction flag */}
          {showContradiction && (
            <div className="mt-2 flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-lg max-w-lg">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Self-assessed as on track, but {missedCount} metric{missedCount > 1 ? 's' : ''} missed target this week.
              </p>
            </div>
          )}

          {/* Latest week notes */}
          {latest?.notes && (
            <div className="mt-3 bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4 max-w-2xl">
              <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1.5">
                Notes — Week of {format(new Date(latest.weekStart), 'd MMM yyyy')}
              </p>
              <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">{latest.notes}</p>
            </div>
          )}
        </div>

        {/* SECTION 1 — Performance overview */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {/* KPI 1 */}
          <div className={`bg-white dark:bg-[#1E1E2E] rounded-xl p-4 border ${rag1 ? RAG_STYLES[rag1].border : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{member.kpi1.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{latest ? formatKpiValue(latest.kpi1Value, member.kpi1) : '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Target: {formatKpiValue(member.kpi1.target, member.kpi1)}</p>
            <div className="mt-2">
              <MetricStatus value={latest?.kpi1Value} target={member.kpi1.target} />
            </div>
          </div>
          {/* KPI 2 */}
          <div className={`bg-white dark:bg-[#1E1E2E] rounded-xl p-4 border ${rag2 ? RAG_STYLES[rag2].border : 'border-gray-200 dark:border-gray-700'}`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">{member.kpi2.label}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{latest ? formatKpiValue(latest.kpi2Value, member.kpi2) : '—'}</p>
            <p className="text-xs text-gray-400 mt-0.5">Target: {formatKpiValue(member.kpi2.target, member.kpi2)}</p>
            <div className="mt-2">
              <MetricStatus value={latest?.kpi2Value} target={member.kpi2.target} />
            </div>
          </div>
          {/* Trend */}
          <div className={`${trendCfg.bg} rounded-xl p-4 border border-gray-100 dark:border-gray-700`}>
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">Trend</p>
            <p className={`text-xl font-bold ${trendCfg.color}`}>{trendCfg.label}</p>
            <p className="text-xs text-gray-400 mt-0.5">Based on last 4 weeks</p>
          </div>
          {/* Weeks on track — self-rated */}
          <div className="bg-white dark:bg-[#1E1E2E] rounded-xl p-4 border border-gray-200 dark:border-gray-700">
            <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide mb-1">On Track</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {onTrackCount}<span className="text-base font-normal text-gray-400">/{ratedTotal}</span>
            </p>
            <p className="text-xs text-gray-400 mt-0.5">weeks (self-rated)</p>
            {hasUnrated && (
              <p className="text-[10px] text-gray-400 mt-1 italic">Earlier weeks predate self-assessment tracking.</p>
            )}
          </div>
        </div>

        {/* SECTION 2 — Trend charts */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <KpiChart data={chartData} kpiKey={member.kpi1.label} target={member.kpi1.target} label={member.kpi1.label} />
          <KpiChart data={chartData} kpiKey={member.kpi2.label} target={member.kpi2.target} label={member.kpi2.label} />
        </div>

        {/* SECTION 3 — All metrics history table */}
        <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="px-5 py-3.5 border-b border-gray-100 dark:border-gray-700">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">All Metrics History</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 dark:bg-[#252535] border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Week</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{member.kpi1.label}</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{member.kpi2.label}</th>
                  {member.questions.filter(q => q.type === 'number' && q.id !== member.kpi1.questionId && q.id !== member.kpi2.questionId).map(q => (
                    <th key={q.id} className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">{q.label}</th>
                  ))}
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Self-rated</th>
                  <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2.5">Notes</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {[...all].reverse().map(sub => {
                  let answers = {};
                  try { answers = JSON.parse(sub.answers || '{}'); } catch {}
                  const srCfg = sub.selfRating ? SELF_RATING_CONFIG[sub.selfRating] : null;
                  return (
                    <tr key={sub.id} className="border-b border-gray-50 dark:border-gray-700 last:border-0 hover:bg-gray-50 dark:hover:bg-[#252535] transition-colors">
                      <td className="px-4 py-2.5 font-medium text-gray-800 dark:text-gray-200 whitespace-nowrap">
                        {sub.weekStart ? format(new Date(sub.weekStart), 'd MMM yyyy') : sub.weekStart}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatKpiValue(sub.kpi1Value, member.kpi1)}</td>
                      <td className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{formatKpiValue(sub.kpi2Value, member.kpi2)}</td>
                      {member.questions.filter(q => q.type === 'number' && q.id !== member.kpi1.questionId && q.id !== member.kpi2.questionId).map(q => (
                        <td key={q.id} className="px-4 py-2.5 text-gray-600 dark:text-gray-300">{answers[q.id] ?? '—'}</td>
                      ))}
                      <td className="px-4 py-2.5">
                        {srCfg ? (
                          <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-0.5 rounded-full ${srCfg.bg} ${srCfg.color} border ${srCfg.border}`}>
                            {srCfg.emoji} {srCfg.label}
                          </span>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        {sub.notes ? (
                          <NotesCell text={sub.notes} expanded={!!expandedNotes[sub.id]} onToggle={() => setExpandedNotes(prev => ({ ...prev, [sub.id]: !prev[sub.id] }))} />
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <button onClick={() => setConfirmId(sub.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {all.length === 0 && (
                  <tr><td colSpan={10} className="px-4 py-6 text-center text-xs text-gray-400 italic">No submissions yet</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SECTION 4 — Qualitative feed */}
        {qualHistoryItems.length > 0 && (
          <div className="mb-6">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Qualitative Updates</p>
            <div className="space-y-3">
              {qualHistoryItems.map((item, i) => (
                <div key={i} className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                  <p className="text-xs font-bold text-[#8403C5] mb-3">
                    Week of {item.weekStart ? format(new Date(item.weekStart), 'd MMM yyyy') : item.weekStart}
                  </p>
                  <div className="space-y-2.5">
                    {item.quals.map((q, j) => (
                      <div key={j} className="bg-gray-50 dark:bg-[#252535] rounded-lg p-3">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-1">{q.label}</p>
                        <p className="text-sm text-gray-700 dark:text-gray-200 leading-relaxed">"{q.value}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SECTION 5 — AI Summary */}
        <div className="bg-white dark:bg-[#1E1E2E] rounded-xl border border-gray-200 dark:border-gray-700 p-5 mb-6">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">✨ AI Performance Summary</p>
            {aiDate && <p className="text-[10px] text-gray-400">Generated {aiDate} · Refresh to regenerate</p>}
          </div>
          {aiSummary ? (
            <div className="bg-[#F9F5FF] dark:bg-[#2A1F3E] rounded-lg p-4 mb-3">
              <p className="text-sm text-gray-800 dark:text-gray-200 leading-relaxed">{aiSummary}</p>
            </div>
          ) : (
            <p className="text-xs text-gray-400 italic mb-3">
              Generate an AI-powered summary of {member.name.split(' ')[0]}'s last 4 weeks of performance.
            </p>
          )}
          <button
            onClick={generateAISummary}
            disabled={aiLoading || all.length < 1}
            className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] hover:bg-[#6d02a3] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4" />
            {aiLoading ? 'Generating…' : aiSummary ? 'Regenerate summary' : '✨ Generate summary'}
          </button>
        </div>
      </div>

      {confirmId && (
        <ConfirmDialog
          message="Are you sure you want to delete this submission? This cannot be undone."
          onConfirm={() => { onDelete(confirmId); setConfirmId(null); }}
          onCancel={() => setConfirmId(null)}
        />
      )}
    </div>
  );
}