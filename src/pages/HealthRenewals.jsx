import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { calcHealth, HEALTH_DOT } from '@/lib/csData';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SCORE_CHIP = (v) => {
  if (!v) return 'bg-[#F3F4F6] text-[#9CA3AF]';
  if (v <= 2) return 'bg-[#FEE2E2] text-[#B91C1C]';
  if (v === 3) return 'bg-[#FEF9C3] text-[#A16207]';
  return 'bg-[#DCFCE7] text-[#15803D]';
};

const RATING_BADGE = { Green: 'bg-[#DCFCE7] text-[#15803D]', Yellow: 'bg-[#FEF9C3] text-[#A16207]', Red: 'bg-[#FEE2E2] text-[#B91C1C]' };

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function RenewalCell({ date }) {
  if (!date) return <span className="text-ew-muted text-sm">—</span>;
  const d = new Date(date);
  const diff = differenceInDays(d, new Date());
  if (diff < 0) return <span className="text-red-500 font-semibold text-xs">⚠ Overdue</span>;
  if (diff <= 30) return <span className="text-red-500 font-semibold text-sm">{fmtDate(date)}</span>;
  if (diff <= 60) return <span className="text-amber-600 font-semibold text-sm">{fmtDate(date)}</span>;
  return <span className="text-sm text-ew-body">{fmtDate(date)}</span>;
}

const SUB_FIELDS = [
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'goals', label: 'Goals' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'cx', label: 'CX' },
  { key: 'issues', label: 'Issues' },
];

export default function HealthRenewals({ focusClientId }) {
  const [clients, setClients] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState(null); // { clientId, field }
  const [flashedScore, setFlashedScore] = useState(null); // { clientId, field }

  const load = async () => {
    const [cls, hs] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.HealthScore.list('-created_date'),
    ]);
    setClients(cls.filter(c => c.status === 'Live' || c.status === 'Onboarding'));
    setHealthScores(hs);
    setLoading(false);
  };

  useEffect(() => { load(); }, [focusClientId]);

  const getLatestScore = (clientId) => healthScores.find(h => h.clientId === clientId) || null;
  const getPrevScore = (clientId) => {
    const all = healthScores.filter(h => h.clientId === clientId);
    return all.length >= 2 ? all[1] : null;
  };

  const handleUpdateSubScore = async (clientId, scoreKey, rawVal) => {
    const intVal = Math.min(5, Math.max(1, parseInt(rawVal) || 1));
    const latest = getLatestScore(clientId);
    const client = clients.find(c => c.id === clientId);

    const baseScores = { emails: 0, meetings: 0, goals: 0, adoption: 0, knowledge: 0, cx: 0, issues: 0 };
    const existing = latest ? { emails: latest.emails || 0, meetings: latest.meetings || 0, goals: latest.goals || 0, adoption: latest.adoption || 0, knowledge: latest.knowledge || 0, cx: latest.cx || 0, issues: latest.issues || 0 } : baseScores;
    const updatedScores = { ...existing, [scoreKey]: intVal };
    const { total, rating, quadrant } = calcHealth(updatedScores);

    if (latest) {
      await Promise.all([
        base44.entities.HealthScore.update(latest.id, { ...updatedScores, totalScore: total, rating, quadrant }),
        base44.entities.Client.update(clientId, { healthScore: total, healthRating: rating, healthQuadrant: quadrant }),
      ]);
      setHealthScores(prev => prev.map(h => h.id === latest.id ? { ...h, ...updatedScores, totalScore: total, rating, quadrant } : h));
    } else {
      const newScore = await base44.entities.HealthScore.create({
        clientId, clientName: client?.name || '',
        ...updatedScores, totalScore: total, rating, quadrant,
      });
      await base44.entities.Client.update(clientId, { healthScore: total, healthRating: rating, healthQuadrant: quadrant });
      setHealthScores(prev => [newScore, ...prev]);
    }

    setClients(prev => prev.map(c => c.id === clientId ? { ...c, healthScore: total, healthRating: rating, healthQuadrant: quadrant } : c));
    setEditingScore(null);
    setFlashedScore({ clientId, field: scoreKey });
    setTimeout(() => setFlashedScore(null), 500);
  };

  const liveClients = clients.filter(c => c.status === 'Live');
  const greenCount = liveClients.filter(c => c.healthRating === 'Green').length;
  const yellowCount = liveClients.filter(c => c.healthRating === 'Yellow').length;
  const redCount = liveClients.filter(c => c.healthRating === 'Red').length;
  const avgScore = liveClients.length > 0 ? Math.round(liveClients.reduce((s, c) => s + (c.healthScore || 0), 0) / liveClients.length) : 0;
  const allCls = [...clients.filter(c => c.status === 'Live'), ...clients.filter(c => c.status === 'Onboarding')];
  const renewalSoon = allCls.filter(c => {
    if (!c.renewalDate) return false;
    const diff = differenceInDays(new Date(c.renewalDate), new Date());
    return diff >= 0 && diff <= 60;
  }).length;

  const atRisk = allCls.filter(c => {
    const latest = getLatestScore(c.id);
    return c.healthRating === 'Red' || !latest || (c.renewalDate && differenceInDays(new Date(c.renewalDate), new Date()) <= 30 && differenceInDays(new Date(c.renewalDate), new Date()) >= 0);
  });

  return (
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold text-[#111827]">Health & Renewals</h1>
        <p className="text-[#9CA3AF] text-sm mt-0.5">Live client health scores — click any score chip to edit inline</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Avg health score', value: `${avgScore}/35`, color: '#8403C5' },
          { label: 'Green', value: greenCount, color: '#15803D' },
          { label: 'Yellow', value: yellowCount, color: '#A16207' },
          { label: 'Red', value: redCount, color: '#B91C1C' },
          { label: 'Renewals in 60 days', value: renewalSoon, color: '#1D4ED8' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-5" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', borderLeft: `4px solid ${c.color}` }}>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>
      ) : (
        <>
          <div className="bg-white rounded-xl overflow-x-auto mb-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#EBEBEB]">
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Client</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Tier</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Score</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Quadrant</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] min-w-[360px]">Sub-scores (click to edit)</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Trend</th>
                  <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Renewal</th>
                </tr>
              </thead>
              <tbody>
                {allCls.map((c) => {
                  const latest = getLatestScore(c.id);
                  const prev = getPrevScore(c.id);
                  const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';
                  const hasData = latest && latest.totalScore > 0;
                  return (
                    <tr key={c.id} className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-[#111827] text-sm">{c.name}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${c.status === 'Live' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {c.priorityTier ? (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${
                            c.priorityTier === 'High' ? 'bg-[#FEF9C3] text-[#A16207]' :
                            c.priorityTier === 'Medium' ? 'bg-[#DBEAFE] text-[#1D4ED8]' :
                            'bg-[#F3F4F6] text-[#6B7280]'
                          }`}>{c.priorityTier}</span>
                        ) : <span className="text-[#9CA3AF] text-xs">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        {hasData ? (
                          <div className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg ${RATING_BADGE[c.healthRating] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                            <span className="font-bold text-sm">{c.healthScore}</span>
                            <span className="text-xs opacity-70">/35</span>
                          </div>
                        ) : (
                          <span className="text-[#B91C1C] text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No data</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.healthQuadrant
                          ? <span className="text-[11px] font-medium px-2 py-1 bg-[#F7F7F8] text-[#374151] rounded-lg whitespace-nowrap">{c.healthQuadrant}</span>
                          : <span className="text-[#9CA3AF] text-sm">—</span>}
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          {SUB_FIELDS.map(({ key, label }) => {
                            const v = latest?.[key];
                            const isEditingThis = editingScore?.clientId === c.id && editingScore?.field === key;
                            const isFlashed = flashedScore?.clientId === c.id && flashedScore?.field === key;
                            return (
                              <div key={key} className="flex flex-col items-center gap-0.5">
                                {isEditingThis ? (
                                  <input
                                    type="number" min="1" max="5"
                                    defaultValue={v || ''}
                                    autoFocus
                                    className="w-8 h-7 text-center text-xs font-bold border-2 border-[#8403C5] rounded-lg focus:outline-none bg-white"
                                    onBlur={(e) => { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) handleUpdateSubScore(c.id, key, val); else setEditingScore(null); }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) handleUpdateSubScore(c.id, key, val); else setEditingScore(null); }
                                      if (e.key === 'Escape') setEditingScore(null);
                                    }}
                                  />
                                ) : (
                                  <span
                                    title={`Click to edit ${label}`}
                                    className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:ring-2 hover:ring-[#8403C5]/30 transition-all ${SCORE_CHIP(v)} ${isFlashed ? 'ring-2 ring-[#15803D]/40' : ''}`}
                                    onClick={() => setEditingScore({ clientId: c.id, field: key })}
                                  >
                                    {v || '—'}
                                  </span>
                                )}
                                <span className="text-[9px] text-[#9CA3AF] leading-none">{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>

                      <td className="px-4 py-3">
                        {trend === 'up' && <TrendingUp className="w-4 h-4 text-[#15803D]" />}
                        {trend === 'down' && <TrendingDown className="w-4 h-4 text-[#B91C1C]" />}
                        {trend === 'flat' && <Minus className="w-4 h-4 text-[#9CA3AF]" />}
                      </td>
                      <td className="px-4 py-3"><RenewalCell date={c.renewalDate} /></td>
                    </tr>
                  );
                })}
                {allCls.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-16 text-center text-[#6B7280] text-sm">No live or onboarding clients</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {atRisk.length > 0 && (
            <div className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
              <h3 className="text-base font-semibold text-[#111827] mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-[#A16207]" />Needs attention</h3>
              <div className="space-y-2">
                {atRisk.map(c => {
                  const latest = getLatestScore(c.id);
                  const hasData = latest && latest.totalScore > 0;
                  const renewDiff = c.renewalDate ? differenceInDays(new Date(c.renewalDate), new Date()) : null;
                  let action = '';
                  if (!hasData) action = 'Complete first health review — click score chips in table above';
                  else if (c.healthRating === 'Red') action = 'Schedule urgent review call';
                  else if (renewDiff !== null && renewDiff <= 30) action = 'Send renewal proposal';
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3.5 bg-[#F7F7F8] rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-[#111827]">{c.name}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{action}</p>
                      </div>
                      {hasData && c.healthRating && (
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${RATING_BADGE[c.healthRating] || ''}`}>{c.healthRating}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}