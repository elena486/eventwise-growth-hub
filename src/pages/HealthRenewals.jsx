import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, isPast } from 'date-fns';
import UpdateScoresModal from '@/components/health/UpdateScoresModal';
import { calcHealth, HEALTH_DOT } from '@/lib/csData';
import { AlertTriangle, TrendingUp, TrendingDown, Minus } from 'lucide-react';

const SCORE_CHIP = (v) => {
  if (!v) return 'bg-gray-100 text-gray-400';
  if (v <= 2) return 'bg-red-100 text-red-600';
  if (v === 3) return 'bg-amber-100 text-amber-700';
  return 'bg-emerald-100 text-emerald-700';
};

const RATING_BADGE = { Green: 'bg-emerald-50 text-emerald-700', Yellow: 'bg-amber-50 text-amber-700', Red: 'bg-red-50 text-red-600' };

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
  const [updateModal, setUpdateModal] = useState(null);

  const load = async () => {
    const [cls, hs] = await Promise.all([
      base44.entities.Client.list(),
      base44.entities.HealthScore.list('-created_date'),
    ]);
    setClients(cls.filter(c => c.status === 'Live' || c.status === 'Onboarding'));
    setHealthScores(hs);
    setLoading(false);

    if (focusClientId) {
      const c = cls.find(cl => cl.id === focusClientId);
      if (c) {
        const latest = hs.find(h => h.clientId === focusClientId);
        setUpdateModal({ client: c, latestScore: latest || null });
      }
    }
  };

  useEffect(() => { load(); }, [focusClientId]);

  const getLatestScore = (clientId) => healthScores.find(h => h.clientId === clientId) || null;
  const getPrevScore = (clientId) => {
    const all = healthScores.filter(h => h.clientId === clientId);
    return all.length >= 2 ? all[1] : null;
  };

  const handleSaveScores = async ({ emails, meetings, goals, adoption, knowledge, cx, issues, total, rating, quadrant }) => {
    const c = updateModal.client;
    await Promise.all([
      base44.entities.HealthScore.create({
        clientId: c.id, clientName: c.name,
        emails, meetings, goals, adoption, knowledge, cx, issues,
        totalScore: total, rating, quadrant,
      }),
      base44.entities.Client.update(c.id, {
        healthScore: total, healthRating: rating, healthQuadrant: quadrant,
      }),
    ]);
    setUpdateModal(null);
    load();
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
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Health & Renewals</h1>
        <p className="text-ew-muted text-sm mt-0.5">Live client health scores and upcoming renewals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Avg health score', value: `${avgScore}/35` },
          { label: 'Green', value: greenCount, dot: 'bg-emerald-500' },
          { label: 'Yellow', value: yellowCount, dot: 'bg-amber-400' },
          { label: 'Red', value: redCount, dot: 'bg-red-500' },
          { label: 'Renewals in 60 days', value: renewalSoon },
        ].map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-5">
            <div className="flex items-center gap-1.5 mb-1">
              {c.dot && <span className={`w-2 h-2 rounded-full ${c.dot}`} />}
              <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em]">{c.label}</p>
            </div>
            <p className="text-2xl font-bold text-navy">{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : (
        <>
          {/* Health table */}
          <div className="bg-white border border-ew-border rounded-xl overflow-x-auto mb-6">
            <table className="w-full text-sm">
              <thead className="bg-ew-footer border-b border-ew-border">
                <tr>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Client</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Score</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Quadrant</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] min-w-[340px]">Sub-scores</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Trend</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Renewal</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {allCls.map((c, i) => {
                  const latest = getLatestScore(c.id);
                  const prev = getPrevScore(c.id);
                  const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';
                  const hasData = latest && latest.totalScore > 0;
                  return (
                    <tr key={c.id} className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-navy text-sm">{c.name}</p>
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${c.status === 'Live' ? 'bg-emerald-50 text-emerald-700' : 'bg-blue-50 text-blue-700'}`}>{c.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        {hasData ? (
                          <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg ${RATING_BADGE[c.healthRating] || 'bg-gray-100 text-gray-600'}`}>
                            <span className="font-bold text-sm">{c.healthScore}</span>
                            <span className="text-xs opacity-60">/35</span>
                          </div>
                        ) : (
                          <span className="text-red-500 text-xs flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No data</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {c.healthQuadrant ? (
                          <span className="text-[11px] font-medium px-2 py-1 bg-ew-bg text-ew-body rounded-lg whitespace-nowrap">{c.healthQuadrant}</span>
                        ) : <span className="text-ew-muted text-sm">—</span>}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {SUB_FIELDS.map(({ key, label }) => {
                            const v = latest?.[key];
                            return (
                              <div key={key} className="flex flex-col items-center gap-0.5">
                                <span className={`text-xs font-bold w-7 h-7 flex items-center justify-center rounded-lg ${SCORE_CHIP(v)}`}>{v || '—'}</span>
                                <span className="text-[9px] text-ew-muted leading-none">{label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        {trend === 'up' && <TrendingUp className="w-4 h-4 text-emerald-500" />}
                        {trend === 'down' && <TrendingDown className="w-4 h-4 text-red-500" />}
                        {trend === 'flat' && <Minus className="w-4 h-4 text-ew-muted" />}
                      </td>
                      <td className="px-4 py-3"><RenewalCell date={c.renewalDate} /></td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setUpdateModal({ client: c, latestScore: latest })}
                          className="text-xs px-2.5 py-1.5 font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors whitespace-nowrap"
                        >
                          Update scores
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {allCls.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-12 text-center text-ew-muted text-sm">No live or onboarding clients</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* At-risk panel */}
          {atRisk.length > 0 && (
            <div className="bg-white border border-ew-border rounded-xl p-5">
              <h3 className="text-sm font-bold text-navy mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" />Needs attention</h3>
              <div className="space-y-2">
                {atRisk.map(c => {
                  const latest = getLatestScore(c.id);
                  const hasData = latest && latest.totalScore > 0;
                  const renewDiff = c.renewalDate ? differenceInDays(new Date(c.renewalDate), new Date()) : null;
                  let action = '';
                  if (!hasData) action = 'Complete first health review';
                  else if (c.healthRating === 'Red') action = 'Schedule urgent review call';
                  else if (renewDiff !== null && renewDiff <= 30) action = 'Send renewal proposal';
                  return (
                    <div key={c.id} className="flex items-center justify-between p-3 bg-ew-bg rounded-lg">
                      <div>
                        <p className="text-sm font-semibold text-navy">{c.name}</p>
                        <p className="text-xs text-ew-muted mt-0.5">{action}</p>
                      </div>
                      <button
                        onClick={() => setUpdateModal({ client: c, latestScore: latest })}
                        className="text-xs px-3 py-1.5 font-medium bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
                      >
                        Update
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </>
      )}

      {updateModal && (
        <UpdateScoresModal
          client={updateModal.client}
          latestScore={updateModal.latestScore}
          onSave={handleSaveScores}
          onClose={() => setUpdateModal(null)}
        />
      )}
    </div>
  );
}