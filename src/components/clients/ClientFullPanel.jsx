import React, { useState, useEffect, useRef, useCallback } from 'react';
import ReactDOM from 'react-dom';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import {
  X, Mail, Phone, Check, ChevronDown, ChevronUp, Trash2, AlertTriangle, MessageSquareOff, Plus, ExternalLink
} from 'lucide-react';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS, ONBOARDING_PHASES, calcHealth, initTasks } from '@/lib/csData';
import { useToast } from '@/lib/toast';
import TranscriptSection from '@/components/shared/TranscriptSection';
import ScoreTooltip from '@/components/health/ScoreTooltip';
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';

const TIER_STYLES = {
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
};

const STATUSES = ['Trial', 'Onboarding', 'Live', 'Churn'];
const OWNERS = ['Chris Carter', 'Martinique Keeler'];
const PLANS = ['', 'Starter', 'Professional', 'Business'];
const TIER_OPTIONS = ['', 'High', 'Medium', 'Low'];
const ONBOARDING_PLANS = ['', 'Basic', 'Standard', 'Enterprise', 'Option 1'];

const ic = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';

const SCORE_CHIP = (v) => {
  if (!v) return 'bg-[#F3F4F6] text-[#9CA3AF]';
  if (v <= 2) return 'bg-[#FEE2E2] text-[#B91C1C]';
  if (v === 3) return 'bg-[#FEF9C3] text-[#A16207]';
  return 'bg-[#DCFCE7] text-[#15803D]';
};

const BUG_PRIORITY_STYLES = {
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Critical': 'bg-[#FEE2E2] text-[#B91C1C]',
};
const BUG_STATUS_STYLES = {
  'Open': 'bg-[#F3E8FF] text-[#7E22CE]',
  'In Progress': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Waiting on Client': 'bg-[#FEF9C3] text-[#A16207]',
  'Resolved': 'bg-[#DCFCE7] text-[#15803D]',
  'Closed': 'bg-[#F3F4F6] text-[#6B7280]',
};
const BUG_STATUS_ORDER = { Open: 0, 'In Progress': 1, 'Waiting on Client': 2, Resolved: 3, Closed: 4 };

const SUB_SCORE_KEYS = [
  { key: 'emails', label: 'Emails' },
  { key: 'meetings', label: 'Meetings' },
  { key: 'goals', label: 'Goals' },
  { key: 'adoption', label: 'Adoption' },
  { key: 'knowledge', label: 'Knowledge' },
  { key: 'cx', label: 'CX' },
  { key: 'issues', label: 'Issues' },
];

const TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'health', label: 'Health' },
  { id: 'notes', label: 'Notes' },
  { id: 'bugs', label: 'Bugs' },
];

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function SectionTitle({ children }) {
  return <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.14em] mb-3 mt-5 first:mt-0">{children}</p>;
}

function ScoreDot({ score }) {
  if (score == null || score === '') return null;
  const n = Number(score);
  const cls = n >= 4 ? 'bg-emerald-500' : n >= 3 ? 'bg-amber-400' : 'bg-red-500';
  return <span className={`inline-block w-2 h-2 rounded-full ${cls} shrink-0`} />;
}

function ScoreRow({ label, scoreKey, value, onChange }) {
  return (
    <div className="flex items-center justify-between py-1.5 border-b border-[#F3F4F6] last:border-0">
      <div className="flex items-center gap-2">
        <ScoreDot score={value} />
        <ScoreTooltip scoreKey={scoreKey}>
          <span className="text-sm text-[#374151] cursor-help">{label}</span>
        </ScoreTooltip>
      </div>
      <div className="flex items-center gap-1.5">
        <input type="number" min="0" max="5" step="1" value={value ?? ''}
          onChange={e => onChange(Math.min(5, Math.max(0, Number(e.target.value))))}
          className="w-12 text-center text-sm font-semibold border border-[#E5E7EB] rounded-md px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-[#8403C5]/30" />
        <span className="text-xs text-[#9CA3AF]">/5</span>
      </div>
    </div>
  );
}

// ─── Health Trend Chart ────────────────────────────────────────────────────────

function HealthTrendChart({ allHealthScores }) {
  if (!allHealthScores || allHealthScores.length < 2) {
    return (
      <div className="text-xs text-[#9CA3AF] italic py-3">
        Score trend will appear after 2 or more health reviews.
      </div>
    );
  }

  const entries = [...allHealthScores]
    .sort((a, b) => new Date(a.created_date || 0) - new Date(b.created_date || 0))
    .slice(-6);

  const data = entries.map(h => ({
    date: fmtDate(h.updated_date || h.created_date),
    score: h.totalScore || 0,
    emails: h.emails,
    meetings: h.meetings,
    goals: h.goals,
    adoption: h.adoption,
    knowledge: h.knowledge,
    cx: h.cx,
    issues: h.issues,
  }));

  const lastScore = data[data.length - 1]?.score || 0;
  const lineColor = lastScore >= 28 ? '#15803D' : lastScore >= 18 ? '#A16207' : '#B91C1C';

  return (
    <div className="mt-3">
      <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.1em] mb-2">Score trend (last {data.length} reviews)</p>
      <ResponsiveContainer width="100%" height={200}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
          <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 35]} tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
          <ReferenceLine y={28} stroke="#15803D" strokeDasharray="4 3" strokeWidth={1} />
          <ReferenceLine y={18} stroke="#A16207" strokeDasharray="4 3" strokeWidth={1} />
          <Tooltip
            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #E5E7EB', padding: '6px 10px' }}
            formatter={(v) => [`${v}/35`, 'Total score']}
            labelFormatter={(l) => `${l}`}
          />
          <Line dataKey="score" stroke={lineColor} strokeWidth={2} dot={{ r: 4, fill: lineColor, strokeWidth: 0 }} activeDot={{ r: 6 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

// ─── New Bug Form (inline modal) ──────────────────────────────────────────────

function NewBugForm({ client, onClose, onCreated }) {
  const [form, setForm] = useState({
    title: '',
    category: 'Platform Bug',
    priority: 'Medium',
    description: '',
    assignedTo: '',
    reportedBy: 'Martinique',
  });
  const [saving, setSaving] = useState(false);

  const CATEGORIES = ['Platform Bug', 'Integration Issue', 'Onboarding Issue', 'Data Issue', 'UI Issue', 'Other'];
  const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
  const REPORTERS = ['Chris', 'Martinique', 'George', 'Sreeja', 'Elena'];
  const ASSIGNEES = ['Chris', 'Martinique', 'Sreeja', 'Elena'];

  const handleSave = async () => {
    if (!form.title.trim()) return;
    setSaving(true);
    const all = await base44.entities.Bug.list('-created_date', 500);
    const nextNum = all.length > 0 ? Math.max(...all.map(b => b.bugNumber || 0)) + 1 : 1;
    const newBug = await base44.entities.Bug.create({
      ...form,
      bugNumber: nextNum,
      status: 'Open',
      dateLogged: format(new Date(), 'yyyy-MM-dd'),
      clientId: client.id,
      clientName: client.name,
    });
    setSaving(false);
    onCreated(newBug);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-[#111827]">Log Bug — {client.name}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF]"><X className="w-4 h-4" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Title *</label>
            <input className={ic} placeholder="Brief description of the bug" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Category</label>
              <select className={ic} value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Priority</label>
              <select className={ic} value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Reported by</label>
              <select className={ic} value={form.reportedBy} onChange={e => setForm(f => ({ ...f, reportedBy: e.target.value }))}>
                {REPORTERS.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Assigned to</label>
              <select className={ic} value={form.assignedTo} onChange={e => setForm(f => ({ ...f, assignedTo: e.target.value }))}>
                <option value="">— Unassigned</option>
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Description</label>
            <textarea className={ic + ' h-20 resize-none'} placeholder="Steps to reproduce, expected vs actual behaviour…" value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
          </div>
        </div>
        <div className="flex gap-2 justify-end mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.title.trim()}
            className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Log Bug'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ClientFullPanel({ client: initialClient, onClose, onUpdated, onDelete, onViewOnboarding }) {
  const [client, setClient] = useState(initialClient);
  const [healthRecord, setHealthRecord] = useState(null);
  const [allHealthScores, setAllHealthScores] = useState([]);
  const [onboardingRecord, setOnboardingRecord] = useState(null);
  const [showSalesHistory, setShowSalesHistory] = useState(false);
  const [salesLead, setSalesLead] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [notes, setNotes] = useState(initialClient.notes || '');
  const [activeTab, setActiveTab] = useState('overview');
  const [bugs, setBugs] = useState([]);
  const [bugsLoading, setBugsLoading] = useState(false);
  const [showNewBugForm, setShowNewBugForm] = useState(false);
  const notesTimer = useRef(null);
  const saveTimer = useRef(null);
  const toast = useToast();

  useEffect(() => {
    setClient(initialClient);
    setNotes(initialClient.notes || '');
  }, [initialClient.id]);

  useEffect(() => {
    base44.entities.HealthScore.filter({ clientId: initialClient.id }).then(r => {
      const sorted = r.sort((a, b) => new Date(b.created_date || 0) - new Date(a.created_date || 0));
      setHealthRecord(sorted[0] || null);
      setAllHealthScores(sorted);
    });
    base44.entities.OnboardingRecord.filter({ clientId: initialClient.id }).then(r => setOnboardingRecord(r[0] || null));
  }, [initialClient.id]);

  useEffect(() => {
    setBugsLoading(true);
    base44.entities.Bug.filter({ clientId: initialClient.id })
      .then(b => { setBugs(b); setBugsLoading(false); })
      .catch(() => setBugsLoading(false));

    const unsub = base44.entities.Bug.subscribe((event) => {
      if (event.type === 'create' && event.data?.clientId === initialClient.id) {
        setBugs(prev => [event.data, ...prev]);
      } else if (event.type === 'update' && event.data?.clientId === initialClient.id) {
        setBugs(prev => prev.map(b => b.id === event.id ? event.data : b));
      } else if (event.type === 'update' && event.data?.clientId !== initialClient.id) {
        setBugs(prev => prev.filter(b => b.id !== event.id));
      } else if (event.type === 'delete') {
        setBugs(prev => prev.filter(b => b.id !== event.id));
      }
    });
    return unsub;
  }, [initialClient.id]);

  const autoSave = useCallback((field, value) => {
    const updated = { ...client, [field]: value };
    setClient(updated);
    onUpdated(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      base44.entities.Client.update(updated.id, { [field]: value })
        .then(() => toast.saved())
        .catch(() => toast.error());
    }, 600);
  }, [client, onUpdated, toast]);

  const handleNotesChange = (val) => {
    setNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      base44.entities.Client.update(client.id, { notes: val });
      const updated = { ...client, notes: val };
      setClient(updated);
      onUpdated(updated);
    }, 800);
  };

  const handleLogContactToday = () => autoSave('lastContacted', format(new Date(), 'yyyy-MM-dd'));

  const noReplyEntries = (() => { try { return JSON.parse(client.noReplyLog || '[]'); } catch { return []; } })();
  const latestNoReply = noReplyEntries[0];

  // Health scores
  const scores = healthRecord ? {
    emails: healthRecord.emails ?? '',
    meetings: healthRecord.meetings ?? '',
    goals: healthRecord.goals ?? '',
    adoption: healthRecord.adoption ?? '',
    knowledge: healthRecord.knowledge ?? '',
    cx: healthRecord.cx ?? '',
    issues: healthRecord.issues ?? '',
  } : { emails: '', meetings: '', goals: '', adoption: '', knowledge: '', cx: '', issues: '' };

  const total = Object.values(scores).reduce((s, v) => s + (Number(v) || 0), 0);
  const rating = total >= 28 ? 'Green' : total >= 18 ? 'Yellow' : 'Red';
  const ratingCls = rating === 'Green' ? 'text-emerald-600 bg-emerald-50' : rating === 'Yellow' ? 'text-amber-600 bg-amber-50' : 'text-red-600 bg-red-50';

  const handleScoreChange = async (field, value) => {
    const updated = { ...healthRecord, [field]: value };
    setHealthRecord(updated);
    if (healthRecord?.id) {
      await base44.entities.HealthScore.update(healthRecord.id, { [field]: value });
    }
  };

  // Onboarding
  const tasks = (() => { try { return JSON.parse(onboardingRecord?.tasks || '[]'); } catch { return []; } })();
  const currentPhase = tasks.length > 0 ? (() => {
    const incompletePhaseTasks = [1, 2, 3, 4].find(p => tasks.some(t => t.phase === p && !t.completed));
    return incompletePhaseTasks || 4;
  })() : 1;
  const phaseTasks = tasks.filter(t => t.phase === currentPhase);
  const completedCount = phaseTasks.filter(t => t.completed).length;
  const pct = phaseTasks.length > 0 ? Math.round((completedCount / phaseTasks.length) * 100) : 0;

  const toggleTask = async (taskIdx) => {
    if (!onboardingRecord) return;
    const allTasks = [...tasks];
    const absIdx = allTasks.findIndex((t) => t.phase === currentPhase && tasks.filter(x => x.phase === currentPhase).indexOf(t) === taskIdx);
    if (absIdx === -1) return;
    allTasks[absIdx] = { ...allTasks[absIdx], completed: !allTasks[absIdx].completed };
    const updated = { ...onboardingRecord, tasks: JSON.stringify(allTasks), lastUpdated: new Date().toISOString() };
    setOnboardingRecord(updated);
    await base44.entities.OnboardingRecord.update(onboardingRecord.id, { tasks: JSON.stringify(allTasks), lastUpdated: updated.lastUpdated });
  };

  const handleToggleSales = async () => {
    if (!showSalesHistory && !salesLead) {
      const leads = await base44.entities.Lead.filter({ companyName: client.name });
      setSalesLead(leads[0] || null);
    }
    setShowSalesHistory(v => !v);
  };

  const salesActivityLog = (() => {
    if (!salesLead) return [];
    try { return JSON.parse(salesLead.activityLog || '[]'); } catch { return []; }
  })();

  const handleDelete = async () => {
    setDeleting(true);
    await Promise.all([
      base44.entities.Client.delete(client.id),
      base44.entities.OnboardingRecord.filter({ clientId: client.id }).then(r => r.forEach(x => base44.entities.OnboardingRecord.delete(x.id))),
      base44.entities.HealthScore.filter({ clientId: client.id }).then(r => r.forEach(x => base44.entities.HealthScore.delete(x.id))),
    ]);
    setDeleting(false);
    onDelete(client.id);
    onClose();
  };

  const renewalDate = client.renewalDate ? new Date(client.renewalDate) : null;
  const renewalDiff = renewalDate ? differenceInDays(renewalDate, new Date()) : null;
  const renewalCls = renewalDate
    ? (renewalDiff !== null && renewalDiff <= 30) ? 'text-red-600 font-semibold'
    : (renewalDiff !== null && renewalDiff <= 60) ? 'text-amber-600 font-semibold'
    : 'text-[#374151]' : 'text-[#9CA3AF]';

  const bugsCount = bugs.length;

  return (
    <div className="fixed inset-0 z-40 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={() => { if (!showNewBugForm) onClose(); }} />
      <div className="w-[58%] h-full bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col pointer-events-auto overflow-hidden">

        {/* Fixed Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[#111827] leading-tight">{client.name}</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Updated {client.updated_date ? fmtDate(client.updated_date) : '—'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151] transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {client.status && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[client.status] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>{client.status}</span>}
            {client.priorityTier && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${TIER_STYLES[client.priorityTier] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>{client.priorityTier} priority</span>}
            {latestNoReply && (
              <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207] border border-amber-200 flex items-center gap-1">
                <MessageSquareOff className="w-2.5 h-2.5" /> No reply — {fmtDate(latestNoReply.date)}
              </span>
            )}
          </div>

          {/* Tab nav */}
          <div className="flex items-center gap-0 mt-4 -mb-px overflow-x-auto">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={`px-4 py-2 text-sm font-medium transition-colors relative whitespace-nowrap shrink-0 ${
                  activeTab === tab.id ? 'text-[#8403C5] font-semibold' : 'text-[#6B7280] hover:text-[#374151]'
                }`}>
                {tab.id === 'bugs' ? `Bugs${bugsCount > 0 ? ` (${bugsCount})` : ''}` : tab.label}
                {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* OVERVIEW TAB */}
          {activeTab === 'overview' && (
            <>
              <SectionTitle>Contact Details</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={labelCls}>Contact name</label>
                  <input className={ic} value={client.contactName || ''} onChange={e => autoSave('contactName', e.target.value)} placeholder="—" />
                </div>
                <div>
                  <label className={labelCls}>Email</label>
                  <div className="relative">
                    <input className={ic + ' pr-8'} type="email" value={client.contactEmail || ''} onChange={e => autoSave('contactEmail', e.target.value)} placeholder="—" />
                    {client.contactEmail && <a href={`mailto:${client.contactEmail}`} className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#8403C5]"><Mail className="w-4 h-4" /></a>}
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Phone</label>
                  <div className="relative">
                    <input className={ic + ' pr-8'} value={client.contactPhone || ''} onChange={e => autoSave('contactPhone', e.target.value)} placeholder="—" />
                    {client.contactPhone && <a href={`tel:${client.contactPhone}`} className="absolute right-2.5 top-2 text-[#9CA3AF] hover:text-[#8403C5]"><Phone className="w-4 h-4" /></a>}
                  </div>
                </div>
              </div>
              <hr className="border-[#F3F4F6] mb-4" />
              <SectionTitle>Account Info</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={labelCls}>Plan</label>
                  <select className={ic} value={client.plan || ''} onChange={e => autoSave('plan', e.target.value)}>
                    {PLANS.map(p => <option key={p} value={p}>{p || '— Select —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Status</label>
                  <select className={ic} value={client.status || ''} onChange={e => autoSave('status', e.target.value)}>
                    {STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Priority Tier</label>
                  <select className={ic} value={client.priorityTier || ''} onChange={e => autoSave('priorityTier', e.target.value)}>
                    {TIER_OPTIONS.map(o => <option key={o} value={o}>{o || '— Not set —'}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>CS Owner</label>
                  <select className={ic} value={client.owner || ''} onChange={e => autoSave('owner', e.target.value)}>
                    {OWNERS.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Subscription start</label>
                  <input type="date" className={ic} value={client.trialStartDate || ''} onChange={e => autoSave('trialStartDate', e.target.value)} />
                </div>
                <div>
                  <label className={labelCls}>Renewal date</label>
                  <input type="date" className={ic} value={client.renewalDate || ''} onChange={e => autoSave('renewalDate', e.target.value)} />
                  {client.renewalDate && (
                    <p className={`text-xs mt-0.5 ${renewalCls}`}>
                      {renewalDiff !== null && renewalDiff <= 0 ? '⚠ Overdue' : renewalDiff !== null && renewalDiff <= 60 ? `⚠ ${renewalDiff}d away` : fmtDate(client.renewalDate)}
                    </p>
                  )}
                </div>
                <div>
                  <label className={labelCls}>Last contacted</label>
                  <div className="flex items-center gap-2">
                    <input type="date" className={ic} value={client.lastContacted || ''} onChange={e => autoSave('lastContacted', e.target.value)} />
                    <button onClick={handleLogContactToday} className="shrink-0 text-xs px-2.5 py-1.5 bg-[#F3E8FF] text-[#8403C5] rounded-lg hover:bg-[#EDE9FE] font-semibold transition-colors whitespace-nowrap">Today</button>
                  </div>
                </div>
                <div>
                  <label className={labelCls}>Onboarding plan</label>
                  <select className={ic} value={client.onboardingPlan || ''} onChange={e => autoSave('onboardingPlan', e.target.value)}>
                    {ONBOARDING_PLANS.map(p => <option key={p} value={p}>{p || '— Select —'}</option>)}
                  </select>
                </div>
              </div>
              {client.handoffIncomplete && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                  <p className="text-sm font-semibold text-amber-800 mb-1">📋 Handoff incomplete</p>
                  <p className="text-sm text-amber-700">The sales-to-CS handover checklist has not been fully completed for this client.</p>
                </div>
              )}
              <div className="border-t border-[#F3F4F6] pt-4 mt-4">
                {deleteConfirm ? (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-sm text-[#374151] mb-3">Delete <strong>{client.name}</strong>? This will also remove their onboarding checklist and health scores. This cannot be undone.</p>
                    <div className="flex gap-2">
                      <button onClick={handleDelete} disabled={deleting} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                        {deleting ? 'Deleting…' : 'Delete permanently'}
                      </button>
                      <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg transition-colors">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                    <Trash2 className="w-4 h-4" /> Delete client
                  </button>
                )}
              </div>
            </>
          )}

          {/* ONBOARDING TAB */}
          {activeTab === 'onboarding' && (
            <>
              <SectionTitle>Onboarding Status</SectionTitle>
              {!onboardingRecord ? (
                <p className="text-sm text-[#9CA3AF] italic">No onboarding record yet.</p>
              ) : (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <span className="text-sm font-semibold text-[#374151]">Phase {currentPhase}</span>
                    <div className="flex-1 h-2 bg-[#F3F4F6] rounded-full overflow-hidden">
                      <div className="h-full bg-[#8403C5] rounded-full transition-all" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-sm font-semibold text-[#374151]">{pct}%</span>
                  </div>
                  <div className="space-y-1.5 mb-4">
                    {phaseTasks.map((task, i) => (
                      <div key={i} className="flex items-center gap-2.5 cursor-pointer group" onClick={() => toggleTask(i)}>
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${task.completed ? 'bg-[#8403C5] border-[#8403C5]' : 'border-[#D1D5DB] group-hover:border-[#8403C5]'}`}>
                          {task.completed && <Check className="w-2.5 h-2.5 text-white" />}
                        </div>
                        <span className={`text-sm transition-colors ${task.completed ? 'line-through text-[#9CA3AF]' : 'text-[#374151] group-hover:text-[#111827]'}`}>{task.taskName}</span>
                      </div>
                    ))}
                    {phaseTasks.length === 0 && <p className="text-sm text-[#9CA3AF] italic">No tasks for this phase.</p>}
                  </div>
                  {onViewOnboarding && (
                    <button onClick={() => onViewOnboarding(client)} className="text-sm text-[#8403C5] hover:underline font-medium">View full onboarding →</button>
                  )}
                </div>
              )}
            </>
          )}

          {/* HEALTH TAB */}
          {activeTab === 'health' && (
            <>
              <SectionTitle>Health Scores</SectionTitle>
              {!healthRecord ? (
                <p className="text-sm text-[#9CA3AF] italic">No health data yet.</p>
              ) : (
                <div>
                  <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-3">
                    {SUB_SCORE_KEYS.map(({ key, label }) => (
                      <ScoreRow key={key} label={label} scoreKey={key} value={scores[key]} onChange={v => handleScoreChange(key, v)} />
                    ))}
                  </div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-2xl font-bold text-[#111827]">{total}<span className="text-base font-normal text-[#9CA3AF]">/35</span></span>
                    <span className={`text-sm font-semibold px-3 py-1 rounded-full ${ratingCls}`}>{rating}</span>
                    <span className="text-xs text-[#9CA3AF]">{rating === 'Green' ? '28–35' : rating === 'Yellow' ? '18–27' : '0–17'}</span>
                  </div>
                  <HealthTrendChart allHealthScores={allHealthScores} />
                </div>
              )}
            </>
          )}

          {/* NOTES TAB */}
          {activeTab === 'notes' && (
            <>
              <SectionTitle>Notes & Activity</SectionTitle>
              <textarea
                className={`${ic} min-h-[120px] resize-none mb-3`}
                value={notes}
                onChange={e => handleNotesChange(e.target.value)}
                placeholder="Add notes here — auto-saves..."
              />
              <button onClick={handleToggleSales} className="flex items-center gap-1.5 text-sm text-[#6B7280] hover:text-[#374151] font-medium mb-2 transition-colors">
                {showSalesHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                View sales history
              </button>
              {showSalesHistory && (
                <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-4 mb-4">
                  {!salesLead ? (
                    <p className="text-sm text-[#9CA3AF] italic">No linked lead record found.</p>
                  ) : salesActivityLog.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF] italic">No activity logged on lead.</p>
                  ) : (
                    <div className="space-y-3">
                      {salesActivityLog.map((entry, i) => (
                        <div key={i} className="text-sm">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F3F4F6] text-[#6B7280]">{entry.type}</span>
                            <span className="text-xs text-[#9CA3AF]">{fmtDate(entry.date)}</span>
                            {entry.addedBy && <span className="text-xs text-[#9CA3AF]">· {entry.addedBy}</span>}
                          </div>
                          <p className="text-[#374151]">{entry.summary}</p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
              <div className="mt-3">
                <TranscriptSection
                  transcripts={(() => { try { return JSON.parse(client.transcripts || '[]'); } catch { return []; } })()}
                  onChange={async (val) => {
                    const updated = { ...client, transcripts: JSON.stringify(val) };
                    await base44.entities.Client.update(client.id, { transcripts: JSON.stringify(val) });
                    setClient(updated);
                    onUpdated(updated);
                  }}
                />
              </div>
            </>
          )}

          {/* BUGS TAB */}
          {activeTab === 'bugs' && (
            <BugsTabContent
              client={client}
              bugs={bugs}
              loading={bugsLoading}
              onLogBug={() => setShowNewBugForm(true)}
              onBugCreated={newBug => setBugs(prev => [newBug, ...prev])}
            />
          )}
        </div>
      </div>

      {showNewBugForm && ReactDOM.createPortal(
        <NewBugForm
          client={client}
          onClose={() => setShowNewBugForm(false)}
          onCreated={(newBug) => {
            setBugs(prev => [newBug, ...prev]);
          }}
        />,
        document.body
      )}
    </div>
  );
}

function BugsTabContent({ client, bugs, loading, onLogBug, onBugCreated }) {
  const sorted = [...bugs].sort((a, b) => {
    const so = (BUG_STATUS_ORDER[a.status] ?? 5) - (BUG_STATUS_ORDER[b.status] ?? 5);
    if (so !== 0) return so;
    return new Date(b.dateLogged || 0) - new Date(a.dateLogged || 0);
  });

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{bugs.length} bug{bugs.length !== 1 ? 's' : ''} logged</p>
        <button
          onClick={onLogBug}
          className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus className="w-3 h-3" /> Log Bug
        </button>
      </div>

      {sorted.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[#E5E7EB] rounded-xl">
          <div className="text-4xl mb-2 opacity-60">🐛</div>
          <p className="text-sm text-[#6B7280] mb-3">No bugs logged for this client yet.</p>
          <button onClick={onLogBug} className="flex items-center gap-1.5 mx-auto text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] px-4 py-2 rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log Bug
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          {sorted.map(b => (
            <div key={b.id} className="border border-[#E5E7EB] rounded-xl p-3.5 bg-white hover:border-[#8403C5]/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <p className="text-sm font-semibold text-[#111827] leading-tight">{b.title || <span className="text-[#9CA3AF] italic font-normal">Untitled</span>}</p>
                <a href="/AppShell?tab=bugs" className="shrink-0 flex items-center gap-1 text-[11px] font-semibold text-[#8403C5] hover:text-[#6d02a3] whitespace-nowrap transition-colors" title="View in Bug Tracker">
                  <ExternalLink className="w-3 h-3" /> View →
                </a>
              </div>
              <div className="flex items-center gap-1.5 flex-wrap mb-1.5">
                {b.priority && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${BUG_PRIORITY_STYLES[b.priority]}`}>{b.priority}</span>}
                {b.status && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${BUG_STATUS_STYLES[b.status]}`}>{b.status}</span>}
                {b.category && <span className="text-[10px] font-medium text-[#6B7280] bg-[#F3F4F6] px-1.5 py-0.5 rounded">{b.category}</span>}
                {b.dateLogged && <span className="text-[10px] text-[#9CA3AF]">{b.dateLogged}</span>}
              </div>
              {b.description && <p className="text-xs text-[#6B7280] truncate">{b.description}</p>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}