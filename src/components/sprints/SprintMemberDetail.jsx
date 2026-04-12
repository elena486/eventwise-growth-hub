import React, { useState } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Trash2 } from 'lucide-react';
import { ragColor, RAG_STYLES, formatKpiValue, weekOfMonth } from '@/lib/sprintConfig';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

function generateSummary(member, history) {
  if (!history || history.length < 2) return null;
  const recent = history.slice(-4);
  const kpi1Misses = recent.filter(s => s.kpi1Value != null && ragColor(s.kpi1Value, member.kpi1.target) === 'red').length;
  const kpi2Misses = recent.filter(s => s.kpi2Value != null && ragColor(s.kpi2Value, member.kpi2.target) === 'red').length;
  const kpi1Hits = recent.filter(s => s.kpi1Value != null && ragColor(s.kpi1Value, member.kpi1.target) === 'green').length;
  const first = member.name.split(' ')[0];
  if (kpi1Misses >= 2) return `${first} has been below their ${member.kpi1.label.toLowerCase()} target for ${kpi1Misses} consecutive weeks.`;
  if (kpi2Misses >= 2) return `${first} has been below their ${member.kpi2.label.toLowerCase()} target for ${kpi2Misses} consecutive weeks.`;
  if (kpi1Hits >= 3) return `${first} has been consistently hitting their ${member.kpi1.label.toLowerCase()} target over the past ${kpi1Hits} weeks.`;
  return `${first}'s latest submission is on record. View the chart below for trends.`;
}

export default function SprintMemberDetail({ member, history, allHistory, onBack, onDelete }) {
  const [confirmId, setConfirmId] = useState(null);
  const last8 = (allHistory || history).slice(-8);

  const chartData = last8.map(s => ({
    week: s.weekStart?.slice(5),
    [member.kpi1.label]: s.kpi1Value ?? null,
    [member.kpi2.label]: s.kpi2Value ?? null,
  }));

  const latest = history.length > 0 ? history[history.length - 1] : null;
  const weekNum = latest ? weekOfMonth(latest.weekStart) : null;
  const summary = generateSummary(member, allHistory || history);

  let latestAnswers = {};
  if (latest) { try { latestAnswers = JSON.parse(latest.answers || '{}'); } catch {} }

  const qualUpdates = member.qualitativeIds
    .map(qid => {
      const q = member.questions.find(q => q.id === qid);
      const val = latestAnswers[qid];
      if (!q || !val) return null;
      return { label: q.label, value: val };
    }).filter(Boolean);

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm bg-[#f5f6fa]">
      <div className="flex-1 overflow-y-auto p-6 max-w-4xl w-full">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4 transition-colors">
          <ArrowLeft className="w-4 h-4" /> Back to dashboard
        </button>

        <div className="flex items-start justify-between mb-2">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{member.name}</h2>
            <p className="text-sm text-gray-500">{member.role}</p>
          </div>
          {weekNum && (
            <span className="text-xs bg-white border border-gray-200 rounded-full px-3 py-1 text-gray-600 font-medium">
              Week {weekNum} of 4
            </span>
          )}
        </div>

        {summary && <p className="text-sm text-gray-600 mb-5 mt-1">{summary}</p>}

        {/* KPI cards */}
        <div className="flex gap-3 mb-5">
          {[member.kpi1, member.kpi2].map((kpi, i) => {
            const val = latest ? (i === 0 ? latest.kpi1Value : latest.kpi2Value) : null;
            const rag = val != null ? ragColor(val, kpi.target) : null;
            const s = rag ? RAG_STYLES[rag] : null;
            return (
              <div key={i} className={`flex-1 bg-white rounded-xl p-4 border ${s ? s.border : 'border-gray-200'}`}>
                <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
                <p className="text-2xl font-bold text-gray-900">{val != null ? formatKpiValue(val, kpi) : '—'}</p>
                <p className="text-xs text-gray-400 mt-0.5">Target: {formatKpiValue(kpi.target, kpi)}</p>
                {s && <span className={`inline-flex items-center gap-1 text-xs font-semibold mt-2 ${s.text}`}><span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}</span>}
              </div>
            );
          })}
        </div>

        {/* Chart */}
        {chartData.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-200 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-4">8-Week Trend</p>
            <ResponsiveContainer width="100%" height={200}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="week" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey={member.kpi1.label} stroke="#8403C5" strokeWidth={2} dot={{ r: 3 }} connectNulls />
                <Line type="monotone" dataKey={member.kpi2.label} stroke="#5777AB" strokeWidth={2} dot={{ r: 3 }} connectNulls />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Qualitative updates */}
        {qualUpdates.length > 0 && (
          <div className="bg-white rounded-xl p-5 border border-gray-200 mb-5">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">Qualitative Updates (latest week)</p>
            <div className="space-y-3">
              {qualUpdates.map((u, i) => (
                <div key={i}>
                  <p className="text-xs text-gray-400 mb-0.5">{u.label}</p>
                  <p className="text-sm text-gray-800">{u.value}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* History table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Submission History</p>
          </div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">Week</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">{member.kpi1.label}</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">{member.kpi2.label}</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-4 py-2">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {[...(allHistory || history)].reverse().map(sub => {
                const r1 = sub.kpi1Value != null ? ragColor(sub.kpi1Value, member.kpi1.target) : null;
                const r2 = sub.kpi2Value != null ? ragColor(sub.kpi2Value, member.kpi2.target) : null;
                const overall = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : null;
                const s = overall ? RAG_STYLES[overall] : null;
                return (
                  <tr key={sub.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{sub.weekStart}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatKpiValue(sub.kpi1Value, member.kpi1)}</td>
                    <td className="px-4 py-2.5 text-gray-600">{formatKpiValue(sub.kpi2Value, member.kpi2)}</td>
                    <td className="px-4 py-2.5">
                      {s && <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full ${s.bg} ${s.text}`}><span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}</span>}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => setConfirmId(sub.id)} className="text-gray-300 hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                    </td>
                  </tr>
                );
              })}
              {history.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-gray-400 italic">No submissions</td></tr>
              )}
            </tbody>
          </table>
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