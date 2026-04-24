import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { calcHealth, HEALTH_DOT } from '@/lib/csData';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, X, BookOpen } from 'lucide-react';

const SCORE_CHIP = (v) => {
  if (!v) return 'bg-[#F3F4F6] text-[#9CA3AF]';
  if (v <= 2) return 'bg-[#FEE2E2] text-[#B91C1C]';
  if (v === 3) return 'bg-[#FEF9C3] text-[#A16207]';
  return 'bg-[#DCFCE7] text-[#15803D]';
};

const RATING_BADGE = { Green: 'bg-[#DCFCE7] text-[#15803D]', Yellow: 'bg-[#FEF9C3] text-[#A16207]', Red: 'bg-[#FEE2E2] text-[#B91C1C]' };

const SUB_FIELDS = [
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'goals', label: 'Goals' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'cx', label: 'CX' },
  { key: 'issues', label: 'Issues' },
];

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

// ── Health Side Panel ──────────────────────────────────────────────────────────
function HealthSidePanel({ client, latest, prev, onClose, onUpdateSubScore, onSaveNotes }) {
  const [notes, setNotes] = useState(latest?.notes || '');
  const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="flex-1" />
      <div className="w-full max-w-md bg-white shadow-2xl border-l border-[#EBEBEB] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 border-b border-[#EBEBEB] shrink-0">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{client.name}</h2>
            <div className="flex items-center gap-2 mt-1">
              {latest?.totalScore > 0 && (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${RATING_BADGE[client.healthRating] || 'bg-gray-100 text-gray-500'}`}>
                  {client.healthScore}/35 — {client.healthRating}
                </span>
              )}
              {trend === 'up' && <TrendingUp className="w-4 h-4 text-[#15803D]" />}
              {trend === 'down' && <TrendingDown className="w-4 h-4 text-[#B91C1C]" />}
              {trend === 'flat' && <Minus className="w-4 h-4 text-[#9CA3AF]" />}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-[#374151] hover:bg-[#F7F7F8] rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {/* Sub-scores */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-3">Sub-scores (click to edit)</p>
            <div className="grid grid-cols-7 gap-1.5">
              {SUB_FIELDS.map(({ key, label }) => {
                const v = latest?.[key];
                return (
                  <div key={key} className="flex flex-col items-center gap-1">
                    <span
                      title={`Click to edit ${label}`}
                      className={`text-xs font-bold w-9 h-9 flex items-center justify-center rounded-lg cursor-pointer hover:ring-2 hover:ring-[#8403C5]/30 transition-all ${SCORE_CHIP(v)}`}
                      onClick={() => {
                        const val = window.prompt(`Score for ${label} (1–5):`, v || '');
                        if (val && parseInt(val) >= 1 && parseInt(val) <= 5) {
                          onUpdateSubScore(client.id, key, parseInt(val));
                        }
                      }}
                    >
                      {v || '—'}
                    </span>
                    <span className="text-[9px] text-[#9CA3AF] text-center leading-tight">{label}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trend */}
          {prev && (
            <div>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Previous score</p>
              <p className="text-sm text-[#374151]">{prev.totalScore}/35 — {prev.rating}</p>
            </div>
          )}

          {/* Last updated */}
          {latest?.updated_date && (
            <div>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Last updated</p>
              <p className="text-sm text-[#374151]">{fmtDate(latest.updated_date)}</p>
            </div>
          )}

          {/* Notes */}
          <div>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Health notes</p>
            <textarea
              className="w-full text-sm border border-[#EBEBEB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 resize-none h-24 bg-white"
              placeholder="Add context about this client's health score…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
            <button
              onClick={() => onSaveNotes(client.id, notes)}
              className="mt-1.5 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] transition-colors"
            >
              Save notes
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function HealthRenewals({ focusClientId }) {
  const [clients, setClients] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState(null);
  const [flashedScore, setFlashedScore] = useState(null);
  const [filter, setFilter] = useState('All');
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideLink, setGuideLink] = useState(() => localStorage.getItem('healthGuideLink') || '');
  const [guideLinkDraft, setGuideLinkDraft] = useState('');

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

    // update selected client panel if open
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, healthScore: total, healthRating: rating, healthQuadrant: quadrant } : prev);
    }
  };

  const handleSaveNotes = async (clientId, notes) => {
    const latest = getLatestScore(clientId);
    if (latest) {
      await base44.entities.HealthScore.update(latest.id, { notes });
      setHealthScores(prev => prev.map(h => h.id === latest.id ? { ...h, notes } : h));
    }
  };

  const liveClients = clients.filter(c => c.status === 'Live');
  const greenCount = liveClients.filter(c => c.healthRating === 'Green').length;
  const yellowCount = liveClients.filter(c => c.healthRating === 'Yellow').length;
  const redCount = liveClients.filter(c => c.healthRating === 'Red').length;
  const noDataCount = liveClients.filter(c => !c.healthScore || c.healthScore === 0).length;
  const avgScore = liveClients.length > 0 ? Math.round(liveClients.reduce((s, c) => s + (c.healthScore || 0), 0) / liveClients.length) : 0;

  // Sort: Red first, then by score ascending
  let allCls = [...clients.filter(c => c.status === 'Live'), ...clients.filter(c => c.status === 'Onboarding')];
  allCls.sort((a, b) => {
    const ratingOrder = { Red: 0, Yellow: 1, Green: 2 };
    const ra = ratingOrder[a.healthRating] ?? 3;
    const rb = ratingOrder[b.healthRating] ?? 3;
    if (ra !== rb) return ra - rb;
    return (a.healthScore || 0) - (b.healthScore || 0);
  });

  // Apply filter
  const filteredCls = allCls.filter(c => {
    if (filter === 'All') return true;
    if (filter === 'Green') return c.healthRating === 'Green';
    if (filter === 'Yellow') return c.healthRating === 'Yellow';
    if (filter === 'Red') return c.healthRating === 'Red';
    if (filter === 'No Data') return !c.healthScore || c.healthScore === 0;
    return true;
  });

  const atRisk = allCls.filter(c => c.healthRating === 'Red' || (!c.healthScore || c.healthScore === 0));

  return (
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Health</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">Live client health scores — click any score chip to edit</p>
        </div>
        <div className="flex items-center gap-2">
          {guideLink ? (
            <a href={guideLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] rounded-lg transition-colors border border-[#8403C5]/20">
              📄 How health scores are calculated →
            </a>
          ) : null}
          <button onClick={() => { setGuideLinkDraft(guideLink); setGuideModalOpen(true); }}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#374151] bg-white hover:bg-[#F9FAFB] rounded-lg transition-colors border border-[#E5E7EB]">
            <BookOpen className="w-3.5 h-3.5" /> Scoring Guide
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-4">
        {[
          { label: 'Avg health score', value: `${avgScore}/35`, color: '#8403C5', filterVal: 'All' },
          { label: 'Green', value: greenCount, color: '#15803D', filterVal: 'Green' },
          { label: 'Yellow', value: yellowCount, color: '#A16207', filterVal: 'Yellow' },
          { label: 'Red', value: redCount, color: '#B91C1C', filterVal: 'Red' },
          { label: 'No data', value: noDataCount, color: '#6B7280', filterVal: 'No Data' },
        ].map(c => (
          <div key={c.label} onClick={() => setFilter(c.filterVal)}
            className={`bg-white rounded-xl p-5 cursor-pointer transition-all hover:shadow-md ${filter === c.filterVal ? 'ring-2 ring-[#8403C5]/30' : ''}`}
            style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}` }}>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{c.label}</p>
            <p className="text-3xl font-bold text-[#111827]">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {['All', 'Green', 'Yellow', 'Red', 'No Data'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-[#242450] text-white' : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Needs attention (collapsible) */}
      {atRisk.length > 0 && (
        <div className="bg-white rounded-xl mb-4 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button
            className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F9FAFB] transition-colors"
            onClick={() => setNeedsAttentionOpen(o => !o)}
          >
            <div className="flex items-center gap-2">
              {needsAttentionOpen ? <ChevronDown className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />}
              <AlertTriangle className="w-4 h-4 text-[#A16207]" />
              <span className="text-sm font-semibold text-[#111827]">Needs attention</span>
              <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{atRisk.length}</span>
            </div>
          </button>
          {needsAttentionOpen && (
            <div className="px-5 pb-4 space-y-2">
              {atRisk.map(c => {
                const latest = getLatestScore(c.id);
                const hasData = latest && latest.totalScore > 0;
                let action = '';
                if (!hasData) action = 'Complete first health review — click score chips in table';
                else if (c.healthRating === 'Red') action = 'Schedule urgent review call';
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[#F7F7F8] rounded-xl cursor-pointer hover:bg-[#F0F0F8]" onClick={() => setSelectedClient(c)}>
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
          )}
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Client</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Tier</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Score</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Quadrant</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] min-w-[360px]">Sub-scores (click to edit)</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Trend</th>
              </tr>
            </thead>
            <tbody>
              {filteredCls.map((c) => {
                const latest = getLatestScore(c.id);
                const prev = getPrevScore(c.id);
                const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';
                const hasData = latest && latest.totalScore > 0;
                return (
                  <tr key={c.id} className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
                    onClick={() => setSelectedClient(c)}>
                    <td className="px-4 py-3">
                      <p className="font-medium text-[#111827] text-sm">{c.name}</p>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${c.status === 'Live' ? 'bg-[#DCFCE7] text-[#15803D]' : 'bg-[#DBEAFE] text-[#1D4ED8]'}`}>{c.status}</span>
                    </td>
                    <td className="px-4 py-3">
                      {c.priorityTier ? (
                        <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md whitespace-nowrap ${c.priorityTier === 'High' ? 'bg-[#FEF9C3] text-[#A16207]' : c.priorityTier === 'Medium' ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#F3F4F6] text-[#6B7280]'}`}>{c.priorityTier}</span>
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
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                  </tr>
                );
              })}
              {filteredCls.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-16 text-center text-[#6B7280] text-sm">No clients matching this filter</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Health side panel */}
      {selectedClient && (
        <HealthSidePanel
          client={selectedClient}
          latest={getLatestScore(selectedClient.id)}
          prev={getPrevScore(selectedClient.id)}
          onClose={() => setSelectedClient(null)}
          onUpdateSubScore={handleUpdateSubScore}
          onSaveNotes={handleSaveNotes}
        />
      )}

      {/* Scoring guide modal */}
      {guideModalOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setGuideModalOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827] mb-1">Process & Scoring Guide</h3>
            <p className="text-sm text-[#9CA3AF] mb-4">Paste the Google Doc link to the health scoring guide below.</p>
            <input
              type="url"
              className="w-full border border-[#EBEBEB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 mb-4"
              placeholder="https://docs.google.com/…"
              value={guideLinkDraft}
              onChange={e => setGuideLinkDraft(e.target.value)}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setGuideModalOpen(false)} className="px-4 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB] rounded-lg">Cancel</button>
              <button onClick={() => { const link = guideLinkDraft.trim(); setGuideLink(link); localStorage.setItem('healthGuideLink', link); setGuideModalOpen(false); }}
                className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors">
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}