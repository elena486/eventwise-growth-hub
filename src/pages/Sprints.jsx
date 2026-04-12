import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, ragColor, RAG_STYLES, formatKpiValue, currentWeekStart, getWeekNumber, subWeeks } from '@/lib/sprintConfig';
import SprintSubmitModal from '@/components/sprints/SprintSubmitModal';
import SprintMemberDetail from '@/components/sprints/SprintMemberDetail';
import { Users, CheckCircle2, AlertTriangle, XCircle, Clock, ChevronDown, Download } from 'lucide-react';
import { format } from 'date-fns';

const FILTER_PRESETS = [
  { label: '4w', weeks: 4 },
  { label: '8w', weeks: 8 },
  { label: '12w', weeks: 12 },
];

function getMonthRange() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: start.toISOString().split('T')[0],
    to: end.toISOString().split('T')[0],
  };
}

export default function Sprints() {
  const [submissions, setSubmissions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFilter, setMemberFilter] = useState('all');
  const [preset, setPreset] = useState('4w');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const load = useCallback(() => {
    base44.entities.SprintSubmission.list('-created_date', 500).then(setSubmissions);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Compute effective date range
  const today = currentWeekStart();
  let effectiveFrom = dateFrom;
  let effectiveTo = dateTo;
  if (!dateFrom && !dateTo) {
    const weeks = parseInt(preset);
    effectiveFrom = subWeeks(today, weeks);
    effectiveTo = today;
  }

  const applyPreset = (p) => {
    setPreset(p);
    setDateFrom('');
    setDateTo('');
  };

  const applyCurrentMonth = () => {
    const r = getMonthRange();
    setDateFrom(r.from);
    setDateTo(r.to);
    setPreset('');
  };

  const applyCustom = () => {
    if (customFrom) setDateFrom(customFrom);
    if (customTo) setDateTo(customTo);
    setPreset('');
  };

  const filteredSubs = submissions.filter(s => {
    if (effectiveFrom && s.weekStart < effectiveFrom) return false;
    if (effectiveTo && s.weekStart > effectiveTo) return false;
    return true;
  });

  const memberFilteredSubs = memberFilter === 'all'
    ? filteredSubs
    : filteredSubs.filter(s => {
        const m = MEMBERS.find(m => m.id === memberFilter);
        return m && s.memberName === m.name;
      });

  // Stats
  const totalEntries = filteredSubs.length;
  let onTrack = 0, atRisk = 0, offTrack = 0;
  filteredSubs.forEach(s => {
    const m = MEMBERS.find(m => m.memberName === s.memberName || m.name === s.memberName);
    if (!m) return;
    const r1 = s.kpi1Value != null ? ragColor(s.kpi1Value, m.kpi1.target) : null;
    const r2 = s.kpi2Value != null ? ragColor(s.kpi2Value, m.kpi2.target) : null;
    const worst = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : null;
    if (worst === 'green') onTrack++;
    else if (worst === 'amber') atRisk++;
    else if (worst === 'red') offTrack++;
  });

  // This week submissions per member
  const thisWeek = currentWeekStart();
  const submittedThisWeek = MEMBERS.filter(m => filteredSubs.some(s => s.memberName === m.name && s.weekStart === thisWeek)).length;
  const needsAttention = MEMBERS.filter(m => {
    const latest = filteredSubs.filter(s => s.memberName === m.name).sort((a, b) => b.weekStart.localeCompare(a.weekStart))[0];
    if (!latest) return false;
    const r1 = latest.kpi1Value != null ? ragColor(latest.kpi1Value, m.kpi1.target) : null;
    const r2 = latest.kpi2Value != null ? ragColor(latest.kpi2Value, m.kpi2.target) : null;
    return r1 === 'red' || r2 === 'red';
  }).length;
  const activeBlockers = filteredSubs.filter(s => {
    try { const a = JSON.parse(s.answers || '{}'); return Object.values(a).some(v => typeof v === 'string' && v.length > 0 && (v.toLowerCase().includes('block') || v.toLowerCase().includes('issue'))); } catch { return false; }
  }).length;
  const pendingUpdates = MEMBERS.length - submittedThisWeek;

  const displayRange = dateFrom && dateTo
    ? `${format(new Date(dateFrom), 'd MMM yyyy')} – ${format(new Date(dateTo), 'd MMM yyyy')}`
    : `${format(new Date(effectiveFrom), 'd MMM yyyy')} – ${format(new Date(effectiveTo), 'd MMM yyyy')} (${preset || 'custom'})`;

  const exportCSV = () => {
    const rows = [['Member', 'Week', 'KPI1 Label', 'KPI1 Value', 'KPI2 Label', 'KPI2 Value']];
    filteredSubs.forEach(s => {
      const m = MEMBERS.find(m => m.name === s.memberName);
      if (!m) return;
      rows.push([s.memberName, s.weekStart, m.kpi1.label, s.kpi1Value ?? '', m.kpi2.label, s.kpi2Value ?? '']);
    });
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'sprints-export.csv'; a.click();
    URL.revokeObjectURL(url);
  };

  if (selectedMember) {
    const memberSubs = filteredSubs.filter(s => s.memberName === selectedMember.name).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return (
      <SprintMemberDetail
        member={selectedMember}
        history={memberSubs}
        allHistory={submissions.filter(s => s.memberName === selectedMember.name).sort((a, b) => a.weekStart.localeCompare(b.weekStart))}
        onBack={() => setSelectedMember(null)}
        onDelete={async (id) => { await base44.entities.SprintSubmission.delete(id); load(); }}
      />
    );
  }

  const displayMembers = memberFilter === 'all' ? MEMBERS : MEMBERS.filter(m => m.id === memberFilter);

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm bg-[#f5f6fa]">
      {/* Top bar */}
      <div className="bg-[#1a1f3c] text-white px-6 py-2.5 flex items-center gap-4 shrink-0">
        <div className="flex items-center gap-2 mr-4">
          <span className="font-bold text-white text-sm">Eventwise HQ</span>
          <span className="text-gray-400 text-sm">Sprints</span>
        </div>
        {/* Preset buttons */}
        <div className="flex items-center gap-1">
          {FILTER_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label)}
              className={`px-3 py-1 rounded text-xs font-medium transition-colors ${preset === p.label && !dateFrom ? 'bg-white/20 text-white' : 'text-gray-400 hover:text-white'}`}>
              {p.label}
            </button>
          ))}
        </div>
        {/* Custom date range */}
        <div className="flex items-center gap-2 bg-[#2d3560] rounded-lg px-3 py-1.5">
          <span className="text-xs text-gray-300">📅</span>
          <input type="date" className="bg-transparent text-xs text-white outline-none w-28" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span className="text-gray-400 text-xs">–</span>
          <input type="date" className="bg-transparent text-xs text-white outline-none w-28" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <button onClick={applyCustom} className="text-xs text-purple-300 hover:text-purple-200 ml-1">Apply</button>
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); setCustomFrom(''); setCustomTo(''); }} className="text-gray-400 hover:text-white text-xs ml-1">✕</button>}
        </div>
        <button onClick={applyCurrentMonth} className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white transition-colors">
          📅 Current month →
        </button>
        <div className="ml-auto">
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-gray-300 hover:text-white border border-gray-600 rounded-lg px-3 py-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Heading + submit */}
        <div className="flex items-start justify-between mb-1">
          <div>
            <h1 className="text-xl font-bold text-gray-900">Team Dashboard</h1>
            <p className="text-xs text-gray-500 mt-0.5">Showing: {displayRange}</p>
          </div>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
            + Submit Update
          </button>
        </div>

        <p className="text-xs text-gray-400 mb-4">Each team member submits a weekly update every Monday. RAG status is calculated automatically based on % of target achieved.</p>

        {/* 4 stat cards */}
        <div className="grid grid-cols-4 gap-3 mb-3">
          <div className="bg-white rounded-xl p-4 border border-gray-200">
            <div className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-gray-300" /><span className="text-3xl font-bold text-gray-800">{totalEntries}</span></div>
            <p className="text-xs text-gray-500">Total Entries</p>
          </div>
          <div className="bg-green-50 rounded-xl p-4 border border-green-100">
            <div className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500" /><span className="text-3xl font-bold text-green-600">{onTrack}</span></div>
            <p className="text-xs text-gray-500">On Track</p>
          </div>
          <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
            <div className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400" /><span className="text-3xl font-bold text-amber-600">{atRisk}</span></div>
            <p className="text-xs text-gray-500">At Risk</p>
          </div>
          <div className="bg-red-50 rounded-xl p-4 border border-red-100">
            <div className="flex items-center gap-2 mb-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500" /><span className="text-3xl font-bold text-red-500">{offTrack}</span></div>
            <p className="text-xs text-gray-500">Off Track</p>
          </div>
        </div>

        {/* 5 metric cards */}
        <div className="grid grid-cols-5 gap-3 mb-5">
          {[
            { icon: <Users className="w-5 h-5 text-[#5777AB]" />, value: MEMBERS.length, label: 'Team members', sub: <span className="text-amber-500 text-xs font-semibold">{submittedThisWeek}/{MEMBERS.length} submitted</span> },
            { icon: <CheckCircle2 className="w-5 h-5 text-green-500" />, value: onTrack, label: 'On track ≥80%' },
            { icon: <XCircle className="w-5 h-5 text-orange-400" />, value: needsAttention, label: 'Needs attention' },
            { icon: <AlertTriangle className="w-5 h-5 text-red-400" />, value: activeBlockers, label: 'Active blockers' },
            { icon: <Clock className="w-5 h-5 text-amber-400" />, value: pendingUpdates, label: 'Pending updates' },
          ].map((card, i) => (
            <div key={i} className="bg-white rounded-xl p-4 border border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">{card.icon}<span className="text-2xl font-bold text-gray-800">{card.value}</span></div>
                <ChevronDown className="w-4 h-4 text-gray-300" />
              </div>
              <p className="text-xs text-gray-500 mt-1">{card.label}</p>
              {card.sub && <div className="mt-1">{card.sub}</div>}
            </div>
          ))}
        </div>

        {/* Member filter pills */}
        <div className="flex items-center gap-2 mb-5">
          <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Filter</span>
          {['all', ...MEMBERS.map(m => m.id)].map(id => {
            const label = id === 'all' ? 'All' : MEMBERS.find(m => m.id === id)?.name.split(' ')[0];
            return (
              <button key={id} onClick={() => setMemberFilter(id)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${memberFilter === id ? 'bg-[#1a1f3c] text-white border-[#1a1f3c]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {label}
              </button>
            );
          })}
        </div>

        {/* Member cards or empty */}
        {memberFilteredSubs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <p className="text-gray-500 text-sm mb-1">No sprint data for this period.</p>
            <p className="text-gray-400 text-xs mb-5">Add KPIs to get started.</p>
            <button onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1a1f3c] text-white rounded-lg text-sm font-semibold hover:bg-[#242a50] transition-colors">
              + Add Update
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {displayMembers.map(member => {
              const memberSubs = filteredSubs.filter(s => s.memberName === member.name).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
              if (memberSubs.length === 0) return null;
              const latest = memberSubs[0];
              const rag1 = latest.kpi1Value != null ? ragColor(latest.kpi1Value, member.kpi1.target) : null;
              const rag2 = latest.kpi2Value != null ? ragColor(latest.kpi2Value, member.kpi2.target) : null;
              const overallRag = [rag1, rag2].includes('red') ? 'red' : [rag1, rag2].includes('amber') ? 'amber' : 'green';
              const s = RAG_STYLES[overallRag];
              const isThisWeek = latest.weekStart === thisWeek;

              return (
                <button key={member.id} onClick={() => setSelectedMember(member)}
                  className="bg-white rounded-xl p-5 border border-gray-200 text-left hover:border-[#8403C5]/40 hover:shadow-sm transition-all">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">{member.name}</p>
                      <p className="text-xs text-gray-500">{member.role}</p>
                    </div>
                    <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${s.bg} ${s.text}`}>
                      <span className={`w-2 h-2 rounded-full ${s.dot}`} />{s.label}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{member.kpi1.label}</span>
                      <div className="flex items-center gap-1.5">
                        {rag1 && <span className={`w-2 h-2 rounded-full ${RAG_STYLES[rag1].dot}`} />}
                        <span className="text-sm font-bold text-gray-900">{formatKpiValue(latest.kpi1Value, member.kpi1)}</span>
                        <span className="text-xs text-gray-400">/ {formatKpiValue(member.kpi1.target, member.kpi1)}</span>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{member.kpi2.label}</span>
                      <div className="flex items-center gap-1.5">
                        {rag2 && <span className={`w-2 h-2 rounded-full ${RAG_STYLES[rag2].dot}`} />}
                        <span className="text-sm font-bold text-gray-900">{formatKpiValue(latest.kpi2Value, member.kpi2)}</span>
                        <span className="text-xs text-gray-400">/ {formatKpiValue(member.kpi2.target, member.kpi2)}</span>
                      </div>
                    </div>
                  </div>
                  <p className={`text-xs mt-3 ${isThisWeek ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {isThisWeek ? '✓ Submitted this week' : `Last: ${latest.weekStart}`}
                  </p>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {showModal && <SprintSubmitModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />}
    </div>
  );
}