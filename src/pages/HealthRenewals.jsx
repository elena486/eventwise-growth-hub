import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { calcHealth } from '@/lib/csData';
import { TrendingUp, TrendingDown, Minus, ChevronDown, ChevronRight, X, ExternalLink } from 'lucide-react';
import HealthScoreChip from '@/components/health/HealthScoreChip';

const RATING_BADGE = {
  Green: 'bg-[#DCFCE7] text-[#15803D]',
  Yellow: 'bg-[#FEF9C3] text-[#A16207]',
  Red: 'bg-[#FEE2E2] text-[#B91C1C]',
};

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
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-3">Sub-scores (click chip to edit)</p>
            <div className="flex items-start gap-2 flex-wrap">
              {SUB_FIELDS.map(({ key, label }) => (
                <HealthScoreChip
                  key={key}
                  scoreKey={key}
                  label={label}
                  value={latest?.[key] || 0}
                  onSave={(v) => onUpdateSubScore(client.id, key, v)}
                />
              ))}
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

// ── Scoring Guide Modal ────────────────────────────────────────────────────────
function ScoringGuideModal({ onClose, guideLink, onSaveLink }) {
  const [draft, setDraft] = useState(guideLink);

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#111827]">📊 How Health Scores Work</h3>
          <button onClick={onClose} className="p-1.5 text-[#9CA3AF] hover:text-[#374151] rounded-lg hover:bg-[#F7F7F8]"><X className="w-4 h-4" /></button>
        </div>

        {/* Score bands */}
        <div className="flex gap-3 mb-5">
          <div className="flex-1 bg-[#DCFCE7] rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-[#15803D] uppercase tracking-wide mb-1">Green</p>
            <p className="text-xl font-bold text-[#15803D]">28–35</p>
          </div>
          <div className="flex-1 bg-[#FEF9C3] rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-[#A16207] uppercase tracking-wide mb-1">Yellow</p>
            <p className="text-xl font-bold text-[#A16207]">18–27</p>
          </div>
          <div className="flex-1 bg-[#FEE2E2] rounded-xl p-3 text-center">
            <p className="text-xs font-bold text-[#B91C1C] uppercase tracking-wide mb-1">Red</p>
            <p className="text-xl font-bold text-[#B91C1C]">0–17</p>
          </div>
        </div>

        {/* Sub-score explanation */}
        <div className="bg-[#F9FAFB] rounded-xl p-4 mb-5 space-y-2 text-sm text-[#374151]">
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-wide mb-2">7 sub-scores, each rated 1–5</p>
          {[
            ['Emails', 'Communication quality & responsiveness'],
            ['Meetings', 'Engagement and decision-making in calls'],
            ['Goals', 'Clarity and alignment on objectives'],
            ['Adoption', 'How well they use the platform'],
            ['Knowledge', 'Understanding of platform features'],
            ['CX', 'Overall relationship quality'],
            ['Issues', 'How quickly blockers get resolved'],
          ].map(([k, v]) => (
            <div key={k} className="flex items-start gap-2">
              <span className="w-20 text-xs font-semibold text-[#374151] shrink-0">{k}</span>
              <span className="text-xs text-[#6B7280]">{v}</span>
            </div>
          ))}
        </div>

        {/* Quadrant explanation */}
        <div className="bg-[#F3E8FF] rounded-xl p-4 mb-5 text-sm">
          <p className="text-[11px] font-bold text-[#7E22CE] uppercase tracking-wide mb-2">Quadrant</p>
          <p className="text-xs text-[#374151]">The quadrant is calculated from the score + usage pattern: <strong>Star</strong> (high score, high adoption), <strong>Sleeper</strong> (low score, high adoption), <strong>At Risk</strong> (low score, low adoption), <strong>Stable</strong> (mid range).</p>
        </div>

        {/* Guide link */}
        <div>
          <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide mb-2">Scoring guide link (Google Doc)</p>
          <div className="flex gap-2">
            <input
              type="url"
              className="flex-1 border border-[#E5E7EB] rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
              placeholder="https://docs.google.com/…"
              value={draft}
              onChange={e => setDraft(e.target.value)}
            />
            {draft && (
              <a href={draft} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] rounded-lg hover:bg-[#EDE9FE] whitespace-nowrap">
                <ExternalLink className="w-3.5 h-3.5" /> Open
              </a>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#374151] hover:bg-[#F9FAFB] rounded-lg">Cancel</button>
          <button
            onClick={() => { onSaveLink(draft.trim()); onClose(); }}
            className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6d02a3] transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function HealthRenewals({ focusClientId, onOpenClientPanel }) {
  const [clients, setClients] = useState([]);
  const [healthScores, setHealthScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [needsAttentionOpen, setNeedsAttentionOpen] = useState(true);
  const [selectedClient, setSelectedClient] = useState(null);
  const [guideModalOpen, setGuideModalOpen] = useState(false);
  const [guideLink, setGuideLink] = useState(() => localStorage.getItem('healthGuideLink') || '');

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
    const existing = latest
      ? { emails: latest.emails || 0, meetings: latest.meetings || 0, goals: latest.goals || 0, adoption: latest.adoption || 0, knowledge: latest.knowledge || 0, cx: latest.cx || 0, issues: latest.issues || 0 }
      : baseScores;
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

  const handleSaveGuideLink = (link) => {
    setGuideLink(link);
    localStorage.setItem('healthGuideLink', link);
  };

  const liveClients = clients.filter(c => c.status === 'Live');
  const greenCount = liveClients.filter(c => c.healthRating === 'Green').length;
  const yellowCount = liveClients.filter(c => c.healthRating === 'Yellow').length;
  const redCount = liveClients.filter(c => c.healthRating === 'Red').length;
  const noDataCount = liveClients.filter(c => !c.healthScore || c.healthScore === 0).length;
  const avgScore = liveClients.length > 0
    ? Math.round(liveClients.reduce((s, c) => s + (c.healthScore || 0), 0) / liveClients.length) : 0;

  // Sort: Red first → Yellow → Green → No Data at bottom
  let allCls = [...clients.filter(c => c.status === 'Live'), ...clients.filter(c => c.status === 'Onboarding')];
  allCls.sort((a, b) => {
    const hasA = a.healthScore && a.healthScore > 0;
    const hasB = b.healthScore && b.healthScore > 0;
    if (!hasA && hasB) return 1;
    if (hasA && !hasB) return -1;
    if (!hasA && !hasB) return 0;
    const ratingOrder = { Red: 0, Yellow: 1, Green: 2 };
    const ra = ratingOrder[a.healthRating] ?? 3;
    const rb = ratingOrder[b.healthRating] ?? 3;
    if (ra !== rb) return ra - rb;
    return (a.healthScore || 0) - (b.healthScore || 0);
  });

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
          {guideLink && (
            <a href={guideLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] rounded-lg transition-colors border border-[#8403C5]/20">
              📄 Open scoring guide →
            </a>
          )}
          <button
            onClick={() => setGuideModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#374151] bg-white hover:bg-[#F9FAFB] rounded-lg transition-colors border border-[#E5E7EB]"
          >
            📊 How scores work
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

      {/* Needs attention */}
      {atRisk.length > 0 && (
        <div className="rounded-xl mb-4 overflow-hidden" style={{ background: '#FEF2F2', borderLeft: '4px solid #B91C1C', boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <button
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-red-50/60 transition-colors"
            onClick={() => setNeedsAttentionOpen(o => !o)}
          >
            <div className="flex items-center gap-2">
              {needsAttentionOpen ? <ChevronDown className="w-4 h-4 text-[#B91C1C]" /> : <ChevronRight className="w-4 h-4 text-[#B91C1C]" />}
              <span className="text-base font-semibold text-[#B91C1C]">⚠️ Needs Attention</span>
              <span className="text-xs font-bold bg-[#FEE2E2] text-[#B91C1C] border border-[#FCA5A5] px-2 py-0.5 rounded-full">{atRisk.length}</span>
            </div>
          </button>
          {needsAttentionOpen && (
            <div className="px-5 pb-4 space-y-2">
              {atRisk.map(c => {
                const latest = getLatestScore(c.id);
                const hasData = latest && latest.totalScore > 0;
                const action = !hasData ? 'No scores yet — click chips to add' : 'Schedule urgent review call';
                return (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-white/70 rounded-xl cursor-pointer hover:bg-white transition-colors border border-red-100"
                    onClick={() => setSelectedClient(c)}>
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0 bg-red-500" />
                      <div>
                        <p className="text-sm font-semibold text-[#111827]">{c.name}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{action}</p>
                      </div>
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
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          {[...Array(7)].map((_, i) => (
            <div key={i} className="px-4 py-4 flex gap-6 animate-pulse border-b border-[#F2F2F4] last:border-0">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
              <div className="h-4 bg-gray-200 rounded flex-1" />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06)' }}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Client</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Tier</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Score</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] min-w-[340px]">Sub-scores (click chip to edit)</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Trend</th>
                <th className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Renewal</th>
              </tr>
            </thead>
            <tbody>
              {filteredCls.map((c) => {
                const latest = getLatestScore(c.id);
                const prev = getPrevScore(c.id);
                const trend = prev && latest
                  ? (latest.totalScore > prev.totalScore ? 'up' : latest.totalScore < prev.totalScore ? 'down' : 'flat')
                  : 'flat';
                const hasData = latest && latest.totalScore > 0;
                const renewalDate = c.renewalDate ? new Date(c.renewalDate) : null;
                const renewalDiff = renewalDate ? differenceInDays(renewalDate, new Date()) : null;
                const renewalCls = renewalDiff !== null && renewalDiff <= 30
                  ? 'text-red-600 font-semibold'
                  : renewalDiff !== null && renewalDiff <= 60
                  ? 'text-amber-600 font-semibold'
                  : 'text-[#6B7280]';

                return (
                  <tr key={c.id}
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
                          <span className="font-bold text-[18px] leading-none">{c.healthScore}</span>
                          <span className="text-xs opacity-70">/35</span>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => { e.stopPropagation(); setSelectedClient(c); }}
                          className="text-[#9CA3AF] text-xs hover:text-[#8403C5] transition-colors whitespace-nowrap"
                        >
                          Add scores →
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-1.5">
                        {SUB_FIELDS.map(({ key, label }) => (
                          <HealthScoreChip
                            key={key}
                            scoreKey={key}
                            label={label}
                            value={latest?.[key] || 0}
                            onSave={(v) => handleUpdateSubScore(c.id, key, v)}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {trend === 'up' && <TrendingUp className="w-4 h-4 text-[#15803D]" />}
                      {trend === 'down' && <TrendingDown className="w-4 h-4 text-[#B91C1C]" />}
                      {trend === 'flat' && <Minus className="w-4 h-4 text-[#9CA3AF]" />}
                    </td>
                    <td className="px-4 py-3">
                      {c.renewalDate ? (
                        <span className={`text-xs ${renewalCls}`}>
                          {fmtDate(c.renewalDate)}
                          {renewalDiff !== null && renewalDiff <= 60 && renewalDiff > 0 ? ` (${renewalDiff}d)` : renewalDiff !== null && renewalDiff <= 0 ? ' ⚠' : ''}
                        </span>
                      ) : <span className="text-[#9CA3AF] text-xs">—</span>}
                    </td>
                  </tr>
                );
              })}
              {filteredCls.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-16 text-center">
                    <p className="text-sm text-[#6B7280]">No clients matching this filter.</p>
                  </td>
                </tr>
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
        <ScoringGuideModal
          onClose={() => setGuideModalOpen(false)}
          guideLink={guideLink}
          onSaveLink={handleSaveGuideLink}
        />
      )}
    </div>
  );
}