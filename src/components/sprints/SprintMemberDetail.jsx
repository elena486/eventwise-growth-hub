import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Trash2, ArrowLeft } from 'lucide-react';
import { ragColor, RAG_STYLES, formatKpiValue, weekOfMonth } from '@/lib/sprintConfig';

function generateSummary(member, history) {
  if (!history || history.length < 2) return null;
  const recent = history.slice(-4);

  const kpi1Misses = recent.filter(s => s.kpi1Value != null && ragColor(s.kpi1Value, member.kpi1.target) === 'red').length;
  const kpi2Misses = recent.filter(s => s.kpi2Value != null && ragColor(s.kpi2Value, member.kpi2.target) === 'red').length;
  const kpi1Hits = recent.filter(s => s.kpi1Value != null && ragColor(s.kpi1Value, member.kpi1.target) === 'green').length;

  if (kpi1Misses >= 2) return `${member.name.split(' ')[0]} has been below their ${member.kpi1.label.toLowerCase()} target for ${kpi1Misses} consecutive weeks.`;
  if (kpi2Misses >= 2) return `${member.name.split(' ')[0]} has been below their ${member.kpi2.label.toLowerCase()} target for ${kpi2Misses} consecutive weeks.`;
  if (kpi1Hits >= 3) return `${member.name.split(' ')[0]} has been hitting their ${member.kpi1.label.toLowerCase()} target consistently over the past ${kpi1Hits} weeks.`;
  return `${member.name.split(' ')[0]}'s latest submission is on record. View the chart below for trends.`;
}

export default function SprintMemberDetail({ member, history, onBack, onDelete }) {
  const last8 = history.slice(-8);

  const chartData = last8.map(s => ({
    week: s.weekStart,
    [member.kpi1.label]: s.kpi1Value ?? null,
    [member.kpi2.label]: s.kpi2Value ?? null,
  }));

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const weekNum = latest ? weekOfMonth(latest.weekStart) : null;
  const summary = generateSummary(member, history);

  // Qualitative answers from latest submission
  let latestAnswers = {};
  if (latest) { try { latestAnswers = JSON.parse(latest.answers || '{}'); } catch {} }

  const qualUpdates = member.qualitativeIds
    .map(qid => {
      const q = member.questions.find(q => q.id === qid);
      const val = latestAnswers[qid];
      if (!q || !val) return null;
      return { label: q.label, value: val };
    })
    .filter(Boolean);

  return (
    <div className="p-8 flex-1 overflow-y-auto max-w-4xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy mb-4 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-xl font-bold text-navy">{member.name}</h2>
          <p className="text-sm text-ew-muted">{member.role}</p>
        </div>
        {weekNum && (
          <span className="text-xs bg-ew-bg border border-ew-border rounded-full px-3 py-1 text-ew-body font-medium">Week {weekNum} of 4</span>
        )}
      </div>

      {/* Summary sentence */}
      {summary && <p className="text-sm text-ew-body mb-6 mt-1">{summary}</p>}

      {/* KPI targets row */}
      <div className="flex gap-3 mb-6">
        {[member.kpi1, member.kpi2].map((kpi, i) => {
          const val = latest ? (i === 0 ? latest.kpi1Value : latest.kpi2Value) : null;
          const rag = val != null ? ragColor(val, kpi.target) : null;
          const style = rag ? RAG_STYLES[rag] : null;
          return (
            <div key={i} className={`flex-1 bg-white border border-ew-border rounded-xl p-4 ${style ? style.bg : ''}`}>
              <p className="text-xs text-ew-muted mb-1">{kpi.label}</p>
              <p className="text-2xl font-bold text-navy">{val != null ? formatKpiValue(val, kpi) : '—'}</p>
              <p className="text-xs text-ew-muted mt-0.5">Target: {formatKpiValue(kpi.target, kpi)}</p>
              {style && (
                <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 ${style.text}`}>
                  <span className={`w-2 h-2 rounded-full ${style.dot}`} /> {style.label}
                </span>
              )}
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      {chartData.length > 0 && (
        <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-4">8-Week Trend</p>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E2E5F0" />
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={member.kpi1.label} stroke="#1B2A52" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              <Line type="monotone" dataKey={member.kpi2.label} stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} connectNulls />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Qualitative updates */}
      {qualUpdates.length > 0 && (
        <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-3">Qualitative Updates (latest week)</p>
          <div className="space-y-3">
            {qualUpdates.map((u, i) => (
              <div key={i}>
                <p className="text-xs text-ew-muted mb-0.5">{u.label}</p>
                <p className="text-sm text-navy">{u.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission history */}
      <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-ew-border">
          <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide">Submission History</p>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Week</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">{member.kpi1.label}</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">{member.kpi2.label}</th>
              <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">RAG</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {[...history].reverse().map(sub => {
              const rag1 = sub.kpi1Value != null ? ragColor(sub.kpi1Value, member.kpi1.target) : null;
              const rag2 = sub.kpi2Value != null ? ragColor(sub.kpi2Value, member.kpi2.target) : null;
              const overall = !rag1 && !rag2 ? null : ['red', 'amber', 'green'].find(c => [rag1, rag2].includes(c));
              return (
                <tr key={sub.id} className="border-b border-ew-border last:border-0 hover:bg-navy/[0.02]">
                  <td className="px-4 py-2.5 font-medium text-navy">{sub.weekStart}</td>
                  <td className="px-4 py-2.5 text-ew-body">{formatKpiValue(sub.kpi1Value, member.kpi1)}</td>
                  <td className="px-4 py-2.5 text-ew-body">{formatKpiValue(sub.kpi2Value, member.kpi2)}</td>
                  <td className="px-4 py-2.5">
                    {overall && (
                      <span className={`flex items-center gap-1.5 text-xs font-semibold w-fit px-2 py-0.5 rounded-full ${RAG_STYLES[overall].bg} ${RAG_STYLES[overall].text}`}>
                        <span className={`w-2 h-2 rounded-full ${RAG_STYLES[overall].dot}`} /> {RAG_STYLES[overall].label}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <button onClick={() => onDelete(sub.id)} className="text-ew-muted hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                  </td>
                </tr>
              );
            })}
            {history.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-ew-muted italic">No submissions</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}