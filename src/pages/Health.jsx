import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { calcHealth, HEALTH_DOT } from '@/lib/csData';
import { AlertTriangle, TrendingUp, TrendingDown, Minus, X, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';

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

const SUB_FIELDS = [
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'goals', label: 'Goals' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'cx', label: 'CX' },
  { key: 'issues', label: 'Issues' },
];

function HealthSidePanel({ client, latest, prev, onClose, onUpdateScore }) {
  const [notes, setNotes] = useState(client.healthNotes || '');
  const [editingField, setEditingField] = useState(null);
  const [saving, setSaving] = useState(false);

  const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';

  const handleSaveNotes = async () => {
    setSaving(true);
    await base44.entities.Client.update(client.id, { healthNotes: notes });
    setSaving(false);
  };

  return (
    <div className="w-96 bg-white border-l border-[#EBEBEB] flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBEB] shrink-0">
        <div>
          <h2 className="text-sm font-bold text-[#111827]">{client.name}</h2>
          <p className="text-xs text-[#9CA3AF] mt-0.5">Health detail</p>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151]">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
        {/* Score summary */}
        <div className="flex items-center gap-3">
          {latest && latest.totalScore > 0 ? (
            <div className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg ${RATING_BADGE[client.healthRating] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
              <span className="font-bold text-lg">{client.healthScore}</span>
              <span className="text-sm opacity-70">/35</span>
            </div>
          ) : (
            <span className="text-[#B91C1C] text-sm flex items-center gap-1"><AlertTriangle className="w-4 h-4" />No data</span>
          )}
          <div className="flex items-center gap-1">
            {trend === 'up' && <><TrendingUp className="w-4 h-4 text-[#15803D]" /><span className="text-xs text-[#15803D] font-medium">Improving</span></>}
            {trend === 'down' && <><TrendingDown className="w-4 h-4 text-[#B91C1C]" /><span className="text-xs text-[#B91C1C] font-medium">Declining</span></>}
            {trend === 'flat' && <><Minus className="w-4 h-4 text-[#9CA3AF]" /><span className="text-xs text-[#9CA3AF] font-medium">Stable</span></>}
          </div>
        </div>

        {latest && (
          <p className="text-xs text-[#9CA3AF]">Last updated: {fmtDate(latest.updated_date || latest.created_date)}</p>
        )}

        {/* Sub-scores */}
        <div>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-3">Sub-scores (click to edit)</p>
          <div className="space-y-2">
            {SUB_FIELDS.map(({ key, label }) => {
              const v = latest?.[key];
              const isEditing = editingField === key;
              return (
                <div key={key} className="flex items-center gap-3">
                  <span className="text-xs text-[#374151] w-20 shrink-0">{label}</span>
                  <div className="flex-1 h-1.5 bg-[#F3F4F6] rounded-full overflow-hidden">
                    <div className="h-full bg-[#8403C5] rounded-full" style={{ width: `${((v || 0) / 5) * 100}%` }} />
                  </div>
                  {isEditing ? (
                    <input
                      type="number" min="1" max="5"
                      defaultValue={v || ''}
                      autoFocus
                      className="w-12 h-7 text-center text-xs font-bold border-2 border-[#8403C5] rounded-lg focus:outline-none bg-white"
                      onBlur={e => { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) { onUpdateScore(client.id, key, val); setEditingField(null); } else setEditingField(null); }}
                      onKeyDown={e => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) { onUpdateScore(client.id, key, val); setEditingField(null); } } if (e.key === 'Escape') setEditingField(null); }}
                    />
                  ) : (
                    <span
                      onClick={() => setEditingField(key)}
                      className={`text-xs font-bold w-8 h-7 flex items-center justify-center rounded-lg cursor-pointer hover:ring-2 hover:ring-[#8403C5]/30 ${SCORE_CHIP(v)}`}
                    >
                      {v || '—'}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Previous score */}
        {prev && prev.totalScore > 0 && (
          <div className="bg-[#F7F7F8] rounded-lg p-3">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Previous score</p>
            <p className="text-sm font-semibold text-[#374151]">{prev.totalScore}/35 — {prev.rating}</p>
          </div>
        )}

        {/* Notes */}
        <div>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">CS Notes</p>
          <textarea
            className="w-full text-sm border border-[#EBEBEB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white h-24 resize-none"
            placeholder="Add context about this client's health scores…"
            value={notes}
            onChange={e => setNotes(e.target.value)}
          />
          <button
            onClick={handleSaveNotes}
            disabled={saving}
            className="mt-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving…' : 'Save notes'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Health({ focusClientId }) {
  const [clients, setClients] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingScore, setEditingScore] = useState(null);
  const [flashedScore, setFlashedScore] = useState(null);
  const [filterRating, setFilterRating] = useState('All');
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState(null);
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideLink, setGuideLink] = useState(() => localStorage.getItem('healthScoringGuideLink') || '');

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
      const newScore = await base44.entities.HealthScore.create({ clientId, clientName: client?.name || '', ...updatedScores, totalScore: total, rating, quadrant });
      await base44.entities.Client.update(clientId, { healthScore: total, healthRating: rating, healthQuadrant: quadrant });
      setHealthScores(prev => [newScore, ...prev]);
    }
    setClients(prev => prev.map(c => c.id === clientId ? { ...c, healthScore: total, healthRating: rating, healthQuadrant: quadrant } : c));
    setEditingScore(null);
    setFlashedScore({ clientId, field: scoreKey });
    setTimeout(() => setFlashedScore(null), 500);
    // Update side panel client
    if (selectedClient?.id === clientId) {
      setSelectedClient(prev => prev ? { ...prev, healthScore: total, healthRating: rating, healthQuadrant: quadrant } : null);
    }
  };

  const liveClients = clients.filter(c => c.status === 'Live');
  const greenCount = liveClients.filter(c => c.healthRating === 'Green').length;
  const yellowCount = liveClients.filter(c => c.healthRating === 'Yellow').length;
  const redCount = liveClients.filter(c => c.healthRating === 'Red').length;
  const avgScore = liveClients.length > 0 ? Math.round(liveClients.reduce((s, c) => s + (c.healthScore || 0), 0) / liveClients.length) : 0;

  // Sort: Red first, then by score ascending
  let allCls = [...clients].sort((a, b) => {
    const ratingOrder = { Red: 0, Yellow: 1, Green: 2 };
    const ra = ratingOrder[a.healthRating] ?? 3;
    const rb = ratingOrder[b.healthRating] ?? 3;
    if (ra !== rb) return ra - rb;
    return (a.healthScore || 0) - (b.healthScore || 0);
  });

  // Apply filter
  if (filterRating !== 'All') {
    if (filterRating === 'No Data') {
      allCls = allCls.filter(c => !c.healthScore || c.healthScore === 0);
    } else {
      allCls = allCls.filter(c => c.healthRating === filterRating);
    }
  }

  const redClients = clients.filter(c => c.healthRating === 'Red');

  const statCards = [
    { label: 'Avg health score', value: `${avgScore}/35`, color: '#8403C5', filter: 'All' },
    { label: 'Green', value: greenCount, color: '#15803D', filter: 'Green' },
    { label: 'Yellow', value: yellowCount, color: '#A16207', filter: 'Yellow' },
    { label: 'Red', value: redCount, color: '#B91C1C', filter: 'Red' },
    { label: 'No data', value: clients.filter(c => !c.healthScore || c.healthScore === 0).length, color: '#9CA3AF', filter: 'No Data' },
  ];

  return (
    <div className="flex flex-1 overflow-hidden">
      <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
        {/* Header */}
        <div className="flex items-start justify-between mb-6">
          <div>
            <h1 className="text-2xl font-semibold text-[#111827]">Health Scores</h1>
            <p className="text-[#9CA3AF] text-sm mt-0.5">Live client health — click any score chip to edit inline</p>
          </div>
          <button
            onClick={() => setGuideOpen(true)}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors"
          >
            📄 How health scores are calculated →
          </button>
        </div>

        {/* Stat cards — clickable */}
        <div className="grid grid-cols-5 gap-4 mb-6">
          {statCards.map(c => (
            <button
              key={c.label}
              onClick={() => setFilterRating(filterRating === c.filter ? 'All' : c.filter)}
              className={`text-left bg-white rounded-xl p-5 transition-all ${filterRating === c.filter ? 'ring-2 ring-[#8403C5]' : 'hover:shadow-md'}`}
              style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)', borderLeft: `4px solid ${c.color}` }}
            >
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{c.label}</p>
              <p className="text-3xl font-bold text-[#111827]">{c.value}</p>
            </button>
          ))}
        </div>

        {/* Filter pills */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {['All', 'Green', 'Yellow', 'Red', 'No Data'].map(f => (
            <button key={f} onClick={() => setFilterRating(f)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filterRating === f ? 'bg-[#242450] text-white' : 'bg-white text-[#374151] hover:bg-[#F9FAFB]'}`}
              style={filterRating !== f ? { border: '1.5px solid #E5E7EB' } : {}}>
              {f}
            </button>
          ))}
        </div>

        {/* Needs attention — collapsible */}
        {redClients.length > 0 && (
          <div className="bg-white rounded-xl mb-5 overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
            <button
              onClick={() => setNeedsAttentionOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#A16207]" />
                <span className="text-sm font-semibold text-[#111827]">Needs attention</span>
                <span className="text-xs font-semibold bg-red-100 text-red-700 px-2 py-0.5 rounded-full">{redClients.length}</span>
              </div>
              {needsAttentionOpen ? <ChevronDown className="w-4 h-4 text-[#9CA3AF]" /> : <ChevronRight className="w-4 h-4 text-[#9CA3AF]" />}
            </button>
            {needsAttentionOpen && (
              <div className="px-5 pb-4 space-y-2">
                {redClients.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-[#F7F7F8] rounded-xl">
                    <div>
                      <p className="text-sm font-medium text-[#111827]">{c.name}</p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">Schedule urgent review call — score: {c.healthScore || 0}/35</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg ${RATING_BADGE[c.healthRating] || ''}`}>{c.healthRating}</span>
                  </div>
                ))}
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
                  {['Client', 'Tier', 'Score', 'Quadrant', 'Sub-scores (click to edit)', 'Trend'].map(h => (
                    <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {allCls.map((c) => {
                  const latest = getLatestScore(c.id);
                  const prev = getPrevScore(c.id);
                  const trend = prev && latest ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat') : 'flat';
                  const hasData = latest && latest.totalScore > 0;
                  return (
                    <tr
                      key={c.id}
                      className={`border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer ${selectedClient?.id === c.id ? 'bg-[#FAF5FF]' : ''}`}
                      onClick={() => setSelectedClient(selectedClient?.id === c.id ? null : c)}
                    >
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
                        {c.healthQuadrant ? <span className="text-[11px] font-medium px-2 py-1 bg-[#F7F7F8] text-[#374151] rounded-lg whitespace-nowrap">{c.healthQuadrant}</span> : <span className="text-[#9CA3AF] text-sm">—</span>}
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
                                  <input type="number" min="1" max="5" defaultValue={v || ''} autoFocus
                                    className="w-8 h-7 text-center text-xs font-bold border-2 border-[#8403C5] rounded-lg focus:outline-none bg-white"
                                    onBlur={(e) => { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) handleUpdateSubScore(c.id, key, val); else setEditingScore(null); }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') { const val = parseInt(e.target.value); if (val >= 1 && val <= 5) handleUpdateSubScore(c.id, key, val); else setEditingScore(null); } if (e.key === 'Escape') setEditingScore(null); }}
                                  />
                                ) : (
                                  <span title={`Click to edit ${label}`}
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
                {allCls.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-16 text-center text-[#6B7280] text-sm">No clients match this filter</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Side panel */}
      {selectedClient && (
        <HealthSidePanel
          client={selectedClient}
          latest={getLatestScore(selectedClient.id)}
          prev={getPrevScore(selectedClient.id)}
          onClose={() => setSelectedClient(null)}
          onUpdateScore={handleUpdateSubScore}
        />
      )}

      {/* Scoring guide modal */}
      {guideOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setGuideOpen(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#111827] mb-4">Process & Scoring Guide</h3>
            <p className="text-xs text-[#9CA3AF] mb-2">Paste your Google Doc link below (only visible to admins)</p>
            <input
              type="url"
              className="w-full border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 mb-4"
              placeholder="https://docs.google.com/..."
              value={guideLink}
              onChange={e => { setGuideLink(e.target.value); localStorage.setItem('healthScoringGuideLink', e.target.value); }}
            />
            {guideLink && (
              <a href={guideLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm font-semibold text-[#8403C5] hover:underline mb-4">
                <ExternalLink className="w-4 h-4" /> Open scoring guide →
              </a>
            )}
            <div className="flex justify-end">
              <button onClick={() => setGuideOpen(false)} className="px-4 py-2 text-sm font-medium text-[#374151] hover:bg-[#F9FAFB] rounded-lg">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}