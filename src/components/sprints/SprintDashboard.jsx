import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, formatKpiValue, currentWeekStart } from '@/lib/sprintConfig';
import SprintMemberDetail from './SprintMemberDetail';

const SELF_RATING_CONFIG = {
  on_track:  { label: 'On track',  emoji: '🟢', color: 'text-green-700', bg: 'bg-green-50' },
  at_risk:   { label: 'At risk',   emoji: '🟡', color: 'text-amber-700', bg: 'bg-amber-50' },
  off_track: { label: 'Off track', emoji: '🔴', color: 'text-red-600',   bg: 'bg-red-50' },
};

export default function SprintDashboard() {
  const [submissions, setSubmissions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const load = () => base44.entities.SprintSubmission.list('-weekStart', 500).then(setSubmissions);
  useEffect(() => { load(); }, []);

  const weekStart = currentWeekStart();

  const getLatest = (member) => {
    const memberSubs = submissions.filter(s => s.memberName === member.name);
    if (!memberSubs.length) return null;
    return memberSubs.sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
  };

  const getHistory = (member) => {
    let subs = submissions.filter(s => s.memberName === member.name);
    if (dateFrom) subs = subs.filter(s => s.weekStart >= dateFrom);
    if (dateTo) subs = subs.filter(s => s.weekStart <= dateTo);
    return subs.sort((a, b) => a.weekStart.localeCompare(b.weekStart));
  };

  if (selected) {
    const member = MEMBERS.find(m => m.id === selected);
    return (
      <SprintMemberDetail
        member={member}
        history={getHistory(member)}
        onBack={() => setSelected(null)}
        onDelete={async (id) => { await base44.entities.SprintSubmission.delete(id); load(); }}
      />
    );
  }

  return (
    <div className="p-8 flex-1 overflow-y-auto">
      <div className="mb-1">
        <h2 className="text-xl font-bold text-navy">Team Sprint Dashboard</h2>
        <p className="text-xs text-ew-muted mt-1">Each team member submits a weekly self-assessment and metrics update.</p>
      </div>

      {/* Date range filter */}
      <div className="flex items-center gap-3 mt-4 mb-6">
        <span className="text-xs text-ew-muted font-medium">Filter history:</span>
        <input type="date" className="border border-ew-border rounded-lg px-2 py-1 text-xs text-navy" value={dateFrom} onChange={e => setDateFrom(e.target.value)} />
        <span className="text-xs text-ew-muted">to</span>
        <input type="date" className="border border-ew-border rounded-lg px-2 py-1 text-xs text-navy" value={dateTo} onChange={e => setDateTo(e.target.value)} />
        {(dateFrom || dateTo) && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-ew-muted hover:text-navy underline">Clear</button>
        )}
      </div>

      {/* Member cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {MEMBERS.map(member => {
          const latest = getLatest(member);
          const isThisWeek = latest?.weekStart === weekStart;
          const srCfg = latest?.selfRating ? SELF_RATING_CONFIG[latest.selfRating] : null;

          return (
            <button
              key={member.id}
              onClick={() => setSelected(member.id)}
              className="bg-white border border-ew-border rounded-xl p-5 text-left hover:border-navy/30 hover:shadow-sm transition-all"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <p className="font-bold text-navy text-sm">{member.name}</p>
                  <p className="text-xs text-ew-muted">{member.role}</p>
                </div>
                {srCfg ? (
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${srCfg.bg} ${srCfg.color}`}>
                    {srCfg.emoji} {srCfg.label}
                  </span>
                ) : (
                  <span className="text-xs text-ew-muted italic">No data</span>
                )}
              </div>

              {latest ? (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ew-muted">{member.kpi1.label}</span>
                    <span className="text-sm font-semibold text-navy">{formatKpiValue(latest.kpi1Value, member.kpi1)}
                      <span className="text-xs font-normal text-ew-muted ml-1">/ {formatKpiValue(member.kpi1.target, member.kpi1)}</span>
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-ew-muted">{member.kpi2.label}</span>
                    <span className="text-sm font-semibold text-navy">{formatKpiValue(latest.kpi2Value, member.kpi2)}
                      <span className="text-xs font-normal text-ew-muted ml-1">/ {formatKpiValue(member.kpi2.target, member.kpi2)}</span>
                    </span>
                  </div>
                  <p className={`text-xs mt-2 ${isThisWeek ? 'text-green-600 font-medium' : 'text-ew-muted'}`}>
                    {isThisWeek ? '✓ Submitted this week' : `Last: ${latest.weekStart}`}
                  </p>
                </div>
              ) : (
                <p className="text-xs text-ew-muted italic mt-2">No submissions yet</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}