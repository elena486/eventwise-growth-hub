import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, calcRag, ragColor, formatKpiValue, getMonday } from '@/lib/sprintConfig';
import SprintMemberDetail from './SprintMemberDetail';
import { format } from 'date-fns';

function RagDot({ rag }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full shrink-0" style={{ background: ragColor(rag) }} />;
}

export default function SprintDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = async () => {
    const data = await base44.entities.SprintSubmission.list('-weekStart', 200);
    setSubmissions(data);
  };

  useEffect(() => { load(); }, []);

  const getLatest = (memberName) => {
    return submissions
      .filter(s => s.memberName === memberName)
      .sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  };

  const getHistory = (memberName) => {
    let subs = submissions.filter(s => s.memberName === memberName).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    if (dateFrom) subs = subs.filter(s => s.weekStart >= dateFrom);
    if (dateTo) subs = subs.filter(s => s.weekStart <= dateTo);
    return subs.slice(-8);
  };

  const handleDelete = async (id) => {
    await base44.entities.SprintSubmission.delete(id);
    load();
  };

  if (selected) {
    const member = MEMBERS.find(m => m.name === selected);
    const history = getHistory(selected);
    return (
      <SprintMemberDetail
        member={member}
        history={history}
        onBack={() => setSelected(null)}
        onDelete={handleDelete}
      />
    );
  }

  return (
    <div>
      <p className="text-sm text-ew-muted mb-6">Each team member submits a weekly update every Monday. RAG status is calculated automatically based on % of target achieved.</p>

      {/* Date filter */}
      <div className="flex items-center gap-3 mb-6 bg-white border border-ew-border rounded-xl p-4">
        <span className="text-xs font-semibold text-ew-muted uppercase tracking-wide">Date range</span>
        <input type="date" className="border border-ew-border rounded-lg px-2 py-1 text-sm text-navy" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-ew-muted text-sm">to</span>
        <input type="date" className="border border-ew-border rounded-lg px-2 py-1 text-sm text-navy" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-ew-muted hover:text-navy underline">Clear</button>}
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-3 gap-4">
        {MEMBERS.map(member => {
          const latest = getLatest(member.name);
          const answers = latest ? (() => { try { return JSON.parse(latest.answers || '{}'); } catch { return {}; } })() : null;
          const kpi1Val = latest?.kpi1Value ?? null;
          const kpi2Val = latest?.kpi2Value ?? null;
          const rag1 = kpi1Val != null ? calcRag(kpi1Val, member.kpi1) : null;
          const rag2 = kpi2Val != null ? calcRag(kpi2Val, member.kpi2) : null;
          const overallRag = rag1 === 'red' || rag2 === 'red' ? 'red' : rag1 === 'amber' || rag2 === 'amber' ? 'amber' : rag1 === 'green' ? 'green' : null;

          return (
            <div
              key={member.name}
              className="bg-white border border-ew-border rounded-xl p-5 cursor-pointer hover:border-navy/30 hover:shadow-sm transition-all"
              onClick={() => setSelected(member.name)}
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-semibold text-navy text-sm">{member.name}</p>
                  <p className="text-xs text-ew-muted">{member.role}</p>
                </div>
                {overallRag && <RagDot rag={overallRag} />}
              </div>

              {latest ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <RagDot rag={rag1} />
                    <span className="text-xs text-ew-muted">{member.kpi1.label}:</span>
                    <span className="text-xs font-semibold text-navy">{formatKpiValue(kpi1Val, member.kpi1)}</span>
                    <span className="text-xs text-ew-muted">/ {formatKpiValue(member.kpi1.target, member.kpi1)}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <RagDot rag={rag2} />
                    <span className="text-xs text-ew-muted">{member.kpi2.label}:</span>
                    <span className="text-xs font-semibold text-navy">{formatKpiValue(kpi2Val, member.kpi2)}</span>
                    <span className="text-xs text-ew-muted">/ {formatKpiValue(member.kpi2.target, member.kpi2)}</span>
                  </div>
                  <p className="text-[11px] text-ew-muted mt-2">Submitted: {latest.weekStart}</p>
                </div>
              ) : (
                <p className="text-xs text-ew-muted italic">No submission yet</p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}