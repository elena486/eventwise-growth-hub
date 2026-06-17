import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { MEMBERS, ragColor, RAG_STYLES, formatKpiValue, currentWeekStart, subWeeks } from '@/lib/sprintConfig';
import SprintSubmitModal from '@/components/sprints/SprintSubmitModal';
import SprintMemberDetail from '@/components/sprints/SprintMemberDetail';
import { Users, CheckCircle2, XCircle, Clock, Download, BarChart2, LayoutDashboard, Lock, Send, ChevronDown } from 'lucide-react';
import SprintAnalytics from '@/components/sprints/SprintAnalytics';
import SprintNotes from '@/components/sprints/SprintNotes';
import { format } from 'date-fns';

const FILTER_PRESETS = [
  { label: 'This week', weeks: null },
  { label: 'Last week', weeks: null },
  { label: '4w', weeks: 4 },
  { label: '8w', weeks: 8 },
  { label: '12w', weeks: 12 },
];

const TINT = {
  green: 'bg-[#F0FDF4] border-l-4 border-l-[#1D9E75]',
  amber: 'bg-[#FFFBEB] border-l-4 border-l-[#A16207]',
  red: 'bg-[#FEF2F2] border-l-4 border-l-[#DC2626]',
};

function Sparkline({ values, target, width = 80, height = 28 }) {
  if (!values || values.length < 2) return <span className="text-[10px] text-gray-300 italic">—</span>;
  const nums = values.filter(v => v != null);
  if (nums.length < 2) return null;
  const max = Math.max(...nums, target || 0) * 1.15 || 1;
  const min = 0;
  const pts = nums.map((v, i) => {
    const x = (i / (nums.length - 1)) * width;
    const y = height - ((v - min) / (max - min)) * height;
    return `${x},${y}`;
  }).join(' ');
  const lastVal = nums[nums.length - 1];
  const color = target != null
    ? ragColor(lastVal, target) === 'green' ? '#1D9E75' : ragColor(lastVal, target) === 'amber' ? '#A16207' : '#DC2626'
    : '#8403C5';
  const ty = height - ((target - min) / (max - min)) * height;
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
      {target != null && (
        <line x1="0" y1={ty} x2={width} y2={ty} stroke="#9CA3AF" strokeWidth="1" strokeDasharray="3 2" />
      )}
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.5" />
      {nums.map((v, i) => {
        const x = (i / (nums.length - 1)) * width;
        const y = height - ((v - min) / (max - min)) * height;
        return <circle key={i} cx={x} cy={y} r="2.5" fill={color} />;
      })}
    </svg>
  );
}

function MemberCard({ member, submissions, thisWeek, onView, periodLabel }) {
  const [moreOpen, setMoreOpen] = useState(false);
  const memberSubs = submissions
    .filter(s => s.memberName === member.name)
    .sort((a, b) => b.weekStart.localeCompare(a.weekStart));

  const latest = memberSubs[0] || null;
  const hasSubmittedThisPeriod = latest?.weekStart === thisWeek;

  let overallRag = null;
  let rag1 = null, rag2 = null;
  if (latest) {
    rag1 = latest.kpi1Value != null ? ragColor(latest.kpi1Value, member.kpi1.target) : null;
    rag2 = latest.kpi2Value != null ? ragColor(latest.kpi2Value, member.kpi2.target) : null;
    overallRag = [rag1, rag2].includes('red') ? 'red' : [rag1, rag2].includes('amber') ? 'amber' : rag1 || rag2 ? 'green' : null;
  }

  const ragStyle = overallRag ? RAG_STYLES[overallRag] : null;

  const last4 = memberSubs.slice(0, 4).reverse();
  const spark1 = last4.map(s => s.kpi1Value ?? null);
  const spark2 = last4.map(s => s.kpi2Value ?? null);

  let answers = {};
  if (latest) { try { answers = JSON.parse(latest.answers || '{}'); } catch {} }
  const qualUpdates = member.qualitativeIds
    .map(qid => {
      const q = member.questions.find(q => q.id === qid);
      const val = answers[qid];
      return q && val ? { label: q.label, value: val } : null;
    }).filter(Boolean);

  const kpiIds = [member.kpi1.questionId, member.kpi2.questionId];
  const secondaryQs = member.questions.filter(q => q.type === 'number' && !kpiIds.includes(q.id));

  const cardTint = overallRag ? TINT[overallRag] : 'bg-white border border-[#EBEBF5]';

  if (!latest) {
    return (
      <div className="bg-white border border-dashed border-[#EBEBF5] rounded-xl p-5 flex flex-col gap-3">
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-[#242450] text-base">{member.name}</p>
            <p className="text-xs text-[#5777AB] mt-0.5">{member.role}</p>
          </div>
          <span className="text-xs text-[#5777AB] bg-[#EBEBF5] px-2.5 py-1 rounded-full font-medium">No data</span>
        </div>
        <p className="text-xs text-[#9CA3AF] italic">No submission for {periodLabel}.</p>
        <button
          onClick={() => window.dispatchEvent(new CustomEvent('sprint-send-reminder', { detail: { member } }))}
          className="text-xs text-[#8403C5] font-medium hover:underline text-left transition-colors"
        >
          Send reminder →
        </button>
        <button
          onClick={() => onView(member)}
          className="text-xs text-[#5777AB] font-medium hover:underline text-left transition-colors"
        >
          View full detail →
        </button>
      </div>
    );
  }

  return (
    <div className={`${cardTint} rounded-xl p-5 shadow-sm flex flex-col gap-3 transition-all duration-150`} style={{ borderRadius: 12 }}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-bold text-[#242450] text-base leading-tight">{member.name}</p>
          <p className="text-xs text-[#5777AB] mt-0.5">{member.role}</p>
          <p className={`text-[11px] mt-1 font-medium ${hasSubmittedThisPeriod ? 'text-[#1D9E75]' : 'text-[#5777AB]'}`}>
            {hasSubmittedThisPeriod ? `✓ Submitted (${periodLabel})` : `Last: ${format(new Date(latest.weekStart), 'd MMM')}`}
          </p>
        </div>
        {ragStyle && (
          <span className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${ragStyle.bg} ${ragStyle.text}`}>
            <span className={`w-2 h-2 rounded-full ${ragStyle.dot}`} />{ragStyle.label}
          </span>
        )}
      </div>

      <div className="space-y-2">
        {[
          { kpi: member.kpi1, val: latest.kpi1Value, rag: rag1, spark: spark1 },
          { kpi: member.kpi2, val: latest.kpi2Value, rag: rag2, spark: spark2 },
        ].map(({ kpi, val, rag, spark }, i) => (
          <div key={i} className="flex items-center gap-2 justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              {rag && <span className={`w-2 h-2 rounded-full shrink-0 ${RAG_STYLES[rag].dot}`} />}
              <span className="text-xs text-[#5777AB] truncate">{kpi.label}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Sparkline values={spark} target={kpi.target} />
              <span className="text-sm font-bold text-[#242450] w-12 text-right">{formatKpiValue(val, kpi)}</span>
              <span className="text-xs text-[#5777AB]">/ {formatKpiValue(kpi.target, kpi)}</span>
            </div>
          </div>
        ))}
      </div>

      {secondaryQs.length > 0 && (
        <button
          onClick={() => setMoreOpen(v => !v)}
          className="text-[11px] text-[#8403C5] font-semibold flex items-center gap-1 hover:underline transition-colors"
        >
          {moreOpen ? '▲ Hide metrics' : `▼ More metrics (${secondaryQs.length})`}
        </button>
      )}
      {moreOpen && (
        <div className="bg-white/60 rounded-lg p-3 space-y-1.5 border border-white">
          {secondaryQs.map(q => (
            <div key={q.id} className="flex justify-between items-center">
              <span className="text-xs text-[#5777AB]">{q.label}</span>
              <span className="text-xs font-semibold text-[#242450]">{answers[q.id] ?? '—'}</span>
            </div>
          ))}
        </div>
      )}

      {qualUpdates.length > 0 && (
        <div className="bg-white/60 rounded-lg p-3 space-y-2 border border-white">
          {qualUpdates.map((u, i) => (
            <div key={i}>
              <p className="text-[10px] font-bold text-[#5777AB] uppercase tracking-wide mb-0.5">{u.label}</p>
              <p className="text-xs text-[#1A1A3A] leading-relaxed">"{u.value}"</p>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => onView(member)}
        className="text-xs text-[#5777AB] font-medium hover:underline text-left transition-colors mt-auto"
      >
        View full detail →
      </button>
    </div>
  );
}

export default function Sprints() {
  const [submissions, setSubmissions] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [memberFilter, setMemberFilter] = useState('all');
  const [ragFilter, setRagFilter] = useState('all');
  const [preset, setPreset] = useState('This week');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [pendingOpen, setPendingOpen] = useState(false);
  const [analyticsView, setAnalyticsView] = useState(false);
  const [sprintNotesView, setSprintNotesView] = useState(false);

  const load = useCallback(() => {
    base44.entities.SprintSubmission.list('-created_date', 500).then(setSubmissions);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const onEscape = () => {
      if (showModal) { setShowModal(false); return; }
      if (selectedMember) { setSelectedMember(null); return; }
      if (sprintNotesView) setSprintNotesView(false);
    };
    window.addEventListener('ew-escape', onEscape);
    return () => window.removeEventListener('ew-escape', onEscape);
  }, [showModal, selectedMember, sprintNotesView]);

  const today = currentWeekStart();
  const lastWeek = subWeeks(today, 1);
  let effectiveFrom = dateFrom;
  let effectiveTo = dateTo;
  if (!dateFrom && !dateTo) {
    if (preset === 'This week') {
      effectiveFrom = today;
      effectiveTo = today;
    } else if (preset === 'Last week') {
      effectiveFrom = lastWeek;
      effectiveTo = lastWeek;
    } else {
      const weeks = parseInt(preset);
      effectiveFrom = subWeeks(today, weeks);
      effectiveTo = today;
    }
  }

  const applyPreset = (p) => { setPreset(p); setDateFrom(''); setDateTo(''); };
  const applyCustom = () => { if (customFrom) setDateFrom(customFrom); if (customTo) setDateTo(customTo); setPreset(''); };

  const filteredSubs = submissions.filter(s => {
    if (effectiveFrom && s.weekStart < effectiveFrom) return false;
    if (effectiveTo && s.weekStart > effectiveTo) return false;
    return true;
  });

  const thisWeek = currentWeekStart();

  const memberRag = {};
  MEMBERS.forEach(m => {
    const subs = filteredSubs.filter(s => s.memberName === m.name).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
    const latest = subs[0];
    if (!latest) { memberRag[m.id] = null; return; }
    const r1 = latest.kpi1Value != null ? ragColor(latest.kpi1Value, m.kpi1.target) : null;
    const r2 = latest.kpi2Value != null ? ragColor(latest.kpi2Value, m.kpi2.target) : null;
    memberRag[m.id] = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : null;
  });

  let totalEntries = filteredSubs.length;
  let onTrack = 0, atRisk = 0, offTrack = 0;
  filteredSubs.forEach(s => {
    const m = MEMBERS.find(m => m.name === s.memberName);
    if (!m) return;
    const r1 = s.kpi1Value != null ? ragColor(s.kpi1Value, m.kpi1.target) : null;
    const r2 = s.kpi2Value != null ? ragColor(s.kpi2Value, m.kpi2.target) : null;
    const worst = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : null;
    if (worst === 'green') onTrack++;
    else if (worst === 'amber') atRisk++;
    else if (worst === 'red') offTrack++;
  });

  const submittedThisWeek = MEMBERS.filter(m => filteredSubs.some(s => s.memberName === m.name && s.weekStart === thisWeek));
  const notSubmittedThisWeek = MEMBERS.filter(m => !filteredSubs.some(s => s.memberName === m.name && s.weekStart === thisWeek));
  const needsAttention = MEMBERS.filter(m => memberRag[m.id] === 'red').length;
  const pendingUpdates = notSubmittedThisWeek.length;

  const periodLabel = preset === 'This week' ? 'this week'
    : preset === 'Last week' ? 'last week'
    : dateFrom && dateTo ? `${format(new Date(dateFrom), 'd MMM')} – ${format(new Date(dateTo), 'd MMM')}`
    : preset;

  // Is viewing current week?
  const isCurrentWeek = effectiveFrom === today && effectiveTo === today;

  // Prev period comparison
  const periodLen = (preset === 'This week' || preset === 'Last week') ? 1 : parseInt(preset || '4');
  const prevFrom = subWeeks(effectiveFrom, periodLen);
  const prevSubs = submissions.filter(s => s.weekStart >= prevFrom && s.weekStart < effectiveFrom);
  let prevOnTrack = 0, prevAtRisk = 0, prevOffTrack = 0;
  prevSubs.forEach(s => {
    const m = MEMBERS.find(m => m.name === s.memberName);
    if (!m) return;
    const r1 = s.kpi1Value != null ? ragColor(s.kpi1Value, m.kpi1.target) : null;
    const r2 = s.kpi2Value != null ? ragColor(s.kpi2Value, m.kpi2.target) : null;
    const worst = [r1, r2].includes('red') ? 'red' : [r1, r2].includes('amber') ? 'amber' : r1 || r2 ? 'green' : null;
    if (worst === 'green') prevOnTrack++;
    else if (worst === 'amber') prevAtRisk++;
    else if (worst === 'red') prevOffTrack++;
  });

  function trend(curr, prev) {
    if (prev === 0 && curr === 0) return null;
    const diff = curr - prev;
    if (diff === 0) return <span className="text-gray-400 text-[10px]">→ same as last period</span>;
    if (diff > 0) return <span className="text-green-600 text-[10px]">↑ {diff} from last period</span>;
    return <span className="text-red-500 text-[10px]">↓ {Math.abs(diff)} from last period</span>;
  }

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

  const handleSendReminder = ({ detail }) => {
    const member = detail.member;
    // Could integrate with Slack/email — for now this is a UI placeholder
    alert(`Reminder sent to ${member.name}`);
  };

  useEffect(() => {
    window.addEventListener('sprint-send-reminder', handleSendReminder);
    return () => window.removeEventListener('sprint-send-reminder', handleSendReminder);
  }, []);

  if (sprintNotesView) {
    return <SprintNotes onBack={() => setSprintNotesView(false)} />;
  }

  if (selectedMember) {
    const memberSubs = submissions.filter(s => s.memberName === selectedMember.name).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    const memberFilteredSubs = filteredSubs.filter(s => s.memberName === selectedMember.name).sort((a, b) => a.weekStart.localeCompare(b.weekStart));
    return (
      <SprintMemberDetail
        member={selectedMember}
        history={memberFilteredSubs}
        allHistory={memberSubs}
        onBack={() => setSelectedMember(null)}
        onDelete={async (id) => { await base44.entities.SprintSubmission.delete(id); load(); }}
      />
    );
  }

  const displayMembers = MEMBERS.filter(m => {
    if (memberFilter !== 'all' && m.id !== memberFilter) return false;
    if (ragFilter !== 'all') {
      if (ragFilter === 'none' && memberRag[m.id] !== null) return false;
      if (ragFilter !== 'none' && memberRag[m.id] !== ragFilter) return false;
    }
    return true;
  });

  const submittedCount = submittedThisWeek.length;
  const allSubmitted = pendingUpdates === 0;
  const showEmptyBanner = isCurrentWeek && submittedCount === 0;

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm bg-[#F6F6FB] dark:bg-[#0E0E1F]">
      {/* Filter row — directly below main nav */}
      <div className="bg-white dark:bg-[#171730] border-b border-[#EBEBF5] dark:border-[#242450] shrink-0 px-6 h-12 flex items-center justify-between">
        <div className="flex items-center gap-2">
          {FILTER_PRESETS.map(p => (
            <button key={p.label} onClick={() => applyPreset(p.label)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${preset === p.label && !dateFrom ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
              {p.label}
            </button>
          ))}
          <span className="w-px h-4 bg-[#EBEBF5] dark:bg-[#242450] mx-1" />
          <span className="text-xs text-[#5777AB]">📅</span>
          <input type="date" className="bg-transparent text-xs text-[#242450] dark:text-[#E8E8F5] outline-none w-28 border border-[#EBEBF5] dark:border-[#242450] rounded-lg px-2 py-1" value={customFrom} onChange={e => setCustomFrom(e.target.value)} />
          <span className="text-[#9CA3AF] text-xs">–</span>
          <input type="date" className="bg-transparent text-xs text-[#242450] dark:text-[#E8E8F5] outline-none w-28 border border-[#EBEBF5] dark:border-[#242450] rounded-lg px-2 py-1" value={customTo} onChange={e => setCustomTo(e.target.value)} />
          <button onClick={applyCustom} className="text-xs text-[#8403C5] hover:text-[#6B02A0] font-medium ml-1">Apply</button>
          {(dateFrom || dateTo) && <button onClick={() => { setDateFrom(''); setDateTo(''); setCustomFrom(''); setCustomTo(''); }} className="text-[#9CA3AF] hover:text-[#242450] text-xs ml-1">✕</button>}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center border border-[#EBEBF5] dark:border-[#242450] rounded-lg overflow-hidden">
            <button
              onClick={() => setAnalyticsView(false)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${!analyticsView ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:text-[#242450]'}`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" /> Dashboard
            </button>
            <button
              onClick={() => setAnalyticsView(true)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-[#EBEBF5] dark:border-[#242450] transition-colors ${analyticsView ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:text-[#242450]'}`}
            >
              <BarChart2 className="w-3.5 h-3.5" /> Analytics
            </button>
          </div>
          <button onClick={() => setSprintNotesView(true)} className="flex items-center gap-1.5 text-xs text-[#5777AB] hover:text-[#242450] border border-[#EBEBF5] dark:border-[#242450] rounded-lg px-3 py-1.5 transition-colors">
            <Lock className="w-3.5 h-3.5" /> Sprint Notes
          </button>
          <button onClick={exportCSV} className="flex items-center gap-1.5 text-xs text-[#5777AB] hover:text-[#242450] border border-[#EBEBF5] dark:border-[#242450] rounded-lg px-3 py-1.5 transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg text-sm font-semibold transition-colors">
            + Submit Update
          </button>
        </div>
      </div>

      {analyticsView ? (
        <SprintAnalytics
          submissions={filteredSubs}
          effectiveFrom={effectiveFrom}
          effectiveTo={effectiveTo}
          preset={preset}
          allSubmissions={submissions}
        />
      ) : (
        <div className="flex-1 overflow-y-auto p-6">
          {/* Empty state banner */}
          {showEmptyBanner && (
            <div className="bg-white dark:bg-[#171730] border border-[#EBEBF5] dark:border-[#242450] rounded-xl p-6 mb-6 text-center">
              <p className="text-lg font-bold text-[#242450] dark:text-[#F6F6FB] mb-1">No updates submitted yet this week</p>
              <p className="text-sm text-[#5777AB] mb-4">Submissions open.</p>
              <button onClick={() => setShowModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg text-sm font-semibold transition-colors">
                + Submit Update
              </button>
            </div>
          )}

          {/* Page heading */}
          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-xl font-bold text-[#242450] dark:text-[#F6F6FB]">Team Dashboard</h1>
              <p className="text-xs text-[#5777AB] mt-0.5">
                Showing: {preset || (dateFrom && dateTo ? `${format(new Date(dateFrom), 'd MMM yyyy')} – ${format(new Date(dateTo), 'd MMM yyyy')}` : 'custom')}
              </p>
            </div>
          </div>

          {/* 4 stat cards */}
          <div className="grid grid-cols-4 gap-3 mb-3">
            {[
              { key: 'all', count: totalEntries, label: 'Total Entries', borderColor: 'border-l-[#9CA3AF]', numColor: 'text-[#242450]', trendEl: null },
              { key: 'green', count: onTrack, label: 'On Track', borderColor: 'border-l-[#1D9E75]', numColor: 'text-[#1D9E75]', trendEl: trend(onTrack, prevOnTrack) },
              { key: 'amber', count: atRisk, label: 'At Risk', borderColor: 'border-l-[#A16207]', numColor: 'text-[#A16207]', trendEl: trend(atRisk, prevAtRisk) },
              { key: 'red', count: offTrack, label: 'Off Track', borderColor: 'border-l-[#DC2626]', numColor: 'text-[#DC2626]', trendEl: trend(offTrack, prevOffTrack) },
            ].map(card => (
              <button key={card.key}
                onClick={() => setRagFilter(f => f === card.key ? 'all' : card.key)}
                className={`bg-white dark:bg-[#171730] rounded-xl p-4 border border-l-4 text-left transition-all duration-150 hover:border-[#D8D8EE] ${card.borderColor} ${ragFilter === card.key ? 'ring-2 ring-[#8403C5]/30' : 'border-[#EBEBF5] dark:border-[#242450]'}`}>
                <p className={`text-3xl font-bold mb-1 ${card.numColor}`}>{card.count}</p>
                <p className="text-xs text-[#5777AB]">{card.label}</p>
                {card.trendEl && <div className="mt-1">{card.trendEl}</div>}
              </button>
            ))}
          </div>

          {/* 5 metric cards */}
          <div className="grid grid-cols-5 gap-3 mb-5">
            <div className="bg-white dark:bg-[#171730] rounded-xl p-4 border border-[#EBEBF5] dark:border-[#242450]">
              <div className="flex items-center gap-2 mb-1">
                <Users className="w-4 h-4 text-[#5777AB]" />
                <span className="text-2xl font-bold text-[#242450] dark:text-[#F6F6FB]">{MEMBERS.length}</span>
              </div>
              <p className="text-xs text-[#5777AB]">Team members</p>
              <p className={`text-xs font-semibold mt-1 ${allSubmitted ? 'text-[#1D9E75]' : submittedCount >= 3 ? 'text-[#A16207]' : 'text-[#DC2626]'}`}>{submittedCount}/{MEMBERS.length} submitted</p>
            </div>

            <button onClick={() => setRagFilter(f => f === 'green' ? 'all' : 'green')}
              className={`bg-white dark:bg-[#171730] rounded-xl p-4 border text-left hover:border-[#8403C5]/30 transition-colors ${ragFilter === 'green' ? 'ring-2 ring-[#8403C5]/20 border-[#8403C5]/30' : 'border-[#EBEBF5] dark:border-[#242450]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <CheckCircle2 className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-2xl font-bold text-[#242450] dark:text-[#F6F6FB]">{MEMBERS.filter(m => memberRag[m.id] === 'green').length}</span>
              </div>
              <p className="text-xs text-[#5777AB]">On track ≥80%</p>
            </button>

            <button onClick={() => setRagFilter(f => f === 'red' ? 'all' : 'red')}
              className={`bg-white dark:bg-[#171730] rounded-xl p-4 border text-left hover:border-[#8403C5]/30 transition-colors ${ragFilter === 'red' ? 'ring-2 ring-[#8403C5]/20 border-[#8403C5]/30' : 'border-[#EBEBF5] dark:border-[#242450]'}`}>
              <div className="flex items-center gap-2 mb-1">
                <XCircle className="w-4 h-4 text-[#E8A020]" />
                <span className="text-2xl font-bold text-[#242450] dark:text-[#F6F6FB]">{needsAttention}</span>
              </div>
              <p className="text-xs text-[#5777AB]">Needs attention</p>
            </button>

            <div className="bg-white dark:bg-[#171730] rounded-xl p-4 border border-[#EBEBF5] dark:border-[#242450]">
              <div className="flex items-center gap-2 mb-1">
                <Clock className="w-4 h-4 text-[#E8A020]" />
                <span className="text-2xl font-bold text-[#242450] dark:text-[#F6F6FB]">—</span>
              </div>
              <p className="text-xs text-[#5777AB]">Active blockers</p>
            </div>

            {/* Pending updates — clickable */}
            <div className="relative">
              <button
                onClick={() => setPendingOpen(o => !o)}
                className={`w-full bg-white dark:bg-[#171730] rounded-xl p-4 border text-left hover:border-[#8403C5]/30 transition-colors cursor-pointer ${pendingOpen ? 'ring-2 ring-[#8403C5]/20 border-[#8403C5]/30' : 'border-[#EBEBF5] dark:border-[#242450]'}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-[#A16207]" />
                  <span className="text-2xl font-bold text-[#242450] dark:text-[#F6F6FB]">{pendingUpdates}</span>
                </div>
                <p className="text-xs text-[#5777AB]">{pendingUpdates === 0 ? 'All submitted' : 'Pending updates'} <ChevronDown className={`w-3 h-3 inline transition-transform ${pendingOpen ? 'rotate-180' : ''}`} /></p>
              </button>
              {pendingOpen && pendingUpdates > 0 && (
                <div className="absolute top-full left-0 mt-1 z-20 bg-white dark:bg-[#1E1E3D] border border-[#EBEBF5] dark:border-[#242450] rounded-xl shadow-lg p-4 min-w-[200px]">
                  <button
                    onClick={() => {
                      notSubmittedThisWeek.forEach(m => {
                        window.dispatchEvent(new CustomEvent('sprint-send-reminder', { detail: { member: m } }));
                      });
                      setPendingOpen(false);
                    }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:text-[#6B02A0] mb-2"
                  >
                    <Send className="w-3 h-3" /> Send reminder to all
                  </button>
                  <div className="space-y-1">
                    {notSubmittedThisWeek.map(m => (
                      <div key={m.id} className="flex items-center justify-between gap-4">
                        <p className="text-xs text-[#242450] dark:text-[#E8E8F5]">{m.name.split(' ')[0]}</p>
                        <button
                          onClick={() => window.dispatchEvent(new CustomEvent('sprint-send-reminder', { detail: { member: m } }))}
                          className="text-[10px] text-[#8403C5] hover:underline"
                        >
                          Remind
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Person filter pills */}
          <div className="flex items-center gap-2 mb-5 flex-wrap">
            <span className="text-xs font-semibold text-[#5777AB] uppercase tracking-wide">Filter</span>
            {['all', ...MEMBERS.map(m => m.id)].map(id => {
              const label = id === 'all' ? 'All' : MEMBERS.find(m => m.id === id)?.name.split(' ')[0];
              const isActive = memberFilter === id;
              return (
                <button key={id} onClick={() => setMemberFilter(id)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${isActive ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white dark:bg-[#171730] text-[#5777AB] border-[#EBEBF5] dark:border-[#242450] hover:border-[#D8D8EE]'}`}>
                  {label}
                </button>
              );
            })}
            {(memberFilter !== 'all' || ragFilter !== 'all') && (
              <button onClick={() => { setMemberFilter('all'); setRagFilter('all'); }}
                className="text-xs text-[#5777AB] hover:text-[#242450] underline ml-1">Clear filters</button>
            )}
          </div>

          {/* Member cards */}
          {displayMembers.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center bg-white dark:bg-[#171730] rounded-xl border border-[#EBEBF5] dark:border-[#242450]">
              <p className="text-[#5777AB] text-sm mb-1 font-semibold">No sprint data for this period.</p>
              <p className="text-[#9CA3AF] text-xs mb-5">Remind the team to submit their weekly update every Monday.</p>
              <button onClick={() => setShowModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] text-white rounded-lg text-sm font-bold hover:bg-[#6B02A0] transition-colors">
                + Submit Update
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {displayMembers.map(member => (
                <MemberCard
                  key={member.id}
                  member={member}
                  submissions={filteredSubs}
                  thisWeek={thisWeek}
                  onView={setSelectedMember}
                  periodLabel={periodLabel}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {showModal && (
        <SprintSubmitModal
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load(); }}
        />
      )}
    </div>
  );
}