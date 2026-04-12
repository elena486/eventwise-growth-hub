import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { calcRag, ragColor, formatKpiValue, getWeekNumber } from '@/lib/sprintConfig';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

function genSummary(member, history) {
  if (history.length < 2) return null;
  const recent = history.slice(-3);
  const allRed = recent.every(s => calcRag(s.kpi1Value, member.kpi1) === 'red');
  const allGreen = recent.every(s => calcRag(s.kpi1Value, member.kpi1) === 'green');
  const weeksBelow = history.filter(s => calcRag(s.kpi1Value, member.kpi1) === 'red').length;
  if (allRed) return `${member.name.split(' ')[0]} has been below target for ${Math.min(weeksBelow, recent.length)} consecutive weeks.`;
  if (allGreen) return `${member.name.split(' ')[0]} has been consistently hitting targets.`;
  return `${member.name.split(' ')[0]}'s performance is mixed — check trend for details.`;
}

export default function SprintMemberDetail({ member, history, onBack, onDelete }) {
  const chartData = history.map(s => ({
    week: s.weekStart,
    [member.kpi1.label]: s.kpi1Value,
    [member.kpi2.label]: s.kpi2Value,
  }));

  const latest = history[history.length - 1];
  const weekLabel = latest ? getWeekNumber(latest.weekStart) : '';
  const summary = genSummary(member, history);

  const latestAnswers = latest ? (() => { try { return JSON.parse(latest.answers || '{}'); } catch { return {}; } })() : {};

  return (
    <div>
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy mb-5 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to dashboard
      </button>

      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-navy">{member.name}</h2>
          <p className="text-sm text-ew-muted">{member.role}</p>
        </div>
        {weekLabel && <span className="text-xs font-medium bg-navy-tint text-navy px-3 py-1 rounded-full">{weekLabel}</span>}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        {[
          { kpi: member.kpi1, val: latest?.kpi1Value },
          { kpi: member.kpi2, val: latest?.kpi2Value },
        ].map(({ kpi, val }) => {
          const rag = val != null ? calcRag(val, kpi) : null;
          return (
            <div key={kpi.label} className="bg-white border border-ew-border rounded-xl p-5">
              <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-2">{kpi.label}</p>
              <div className="flex items-center gap-2">
                {rag && <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ background: ragColor(rag) }} />}
                <span className="text-2xl font-bold text-navy">{val != null ? formatKpiValue(val, kpi) : '—'}</span>
              </div>
              <p className="text-xs text-ew-muted mt-1">Target: {formatKpiValue(kpi.target, kpi)}</p>
            </div>
          );
        })}
      </div>

      {/* Trend chart */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-4">8-week trend</p>
        {summary && <p className="text-sm text-ew-body mb-3 italic">{summary}</p>}
        {chartData.length > 0 ? (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <XAxis dataKey="week" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Line type="monotone" dataKey={member.kpi1.label} stroke="#1B2A52" strokeWidth={2} dot={{ r: 3 }} />
              <Line type="monotone" dataKey={member.kpi2.label} stroke="#1D9E75" strokeWidth={2} dot={{ r: 3 }} />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <p className="text-sm text-ew-muted italic">No history in selected range.</p>
        )}
      </div>

      {/* Qualitative updates */}
      {member.qualitativeIds.length > 0 && latest && (
        <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
          <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-4">Qualitative updates</p>
          {member.qualitativeIds.map(qid => {
            const q = member.questions.find(x => x.id === qid);
            const val = latestAnswers[qid];
            if (!val) return null;
            return (
              <div key={qid} className="mb-3">
                <p className="text-xs font-medium text-ew-muted mb-1">{q?.label}</p>
                <p className="text-sm text-navy">{val}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Submission history */}
      <div className="bg-white border border-ew-border rounded-xl p-5">
        <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-4">Submission history</p>
        {history.length === 0 ? (
          <p className="text-sm text-ew-muted italic">No submissions in this range.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-ew-border">
                <th className="text-left text-xs font-semibold text-ew-muted py-2 pr-4">Week</th>
                <th className="text-left text-xs font-semibold text-ew-muted py-2 pr-4">{member.kpi1.label}</th>
                <th className="text-left text-xs font-semibold text-ew-muted py-2 pr-4">{member.kpi2.label}</th>
                <th className="text-left text-xs font-semibold text-ew-muted py-2 pr-4">RAG</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...history].reverse().map(s => {
                const r1 = calcRag(s.kpi1Value, member.kpi1);
                const r2 = calcRag(s.kpi2Value, member.kpi2);
                const overall = r1 === 'red' || r2 === 'red' ? 'red' : r1 === 'amber' || r2 === 'amber' ? 'amber' : 'green';
                return (
                  <tr key={s.id} className="border-b border-ew-border last:border-0">
                    <td className="py-2 pr-4 text-navy">{s.weekStart}</td>
                    <td className="py-2 pr-4 text-navy">{formatKpiValue(s.kpi1Value, member.kpi1)}</td>
                    <td className="py-2 pr-4 text-navy">{formatKpiValue(s.kpi2Value, member.kpi2)}</td>
                    <td className="py-2 pr-4">
                      <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: ragColor(overall) }} />
                    </td>
                    <td className="py-2">
                      <button onClick={() => onDelete(s.id)} className="text-ew-muted hover:text-red-500 transition-colors p-1">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}