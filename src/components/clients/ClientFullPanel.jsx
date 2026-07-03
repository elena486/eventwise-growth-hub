import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import ReactDOM from 'react-dom';
import HealthScoreChip from '@/components/health/HealthScoreChip';
import ContractDocuments from './ContractDocuments';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, isToday, isYesterday, isWithinInterval, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, parseISO as parseDI } from 'date-fns';
import {
  X, Mail, Phone, Check, ChevronDown, ChevronUp, Trash2, AlertTriangle, MessageSquareOff, Plus, ExternalLink
} from 'lucide-react';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS, ONBOARDING_PHASES, calcHealth, initTasks, PRODUCT_OPTIONS, PRODUCT_STYLES } from '@/lib/csData';
import { useToast } from '@/lib/toast';
import TranscriptSection from '@/components/shared/TranscriptSection';
import { logActivity } from '@/lib/logActivity';
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
  { id: 'activity', label: 'Activity Log' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'health', label: 'Health' },
  { id: 'notes', label: 'Notes' },
  { id: 'bugs', label: 'Bugs' },
  { id: 'documents', label: 'Documents' },
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
    logActivity({ teamMember: form.reportedBy || '', actionType: 'Logged a bug', section: 'Customer Success', recordName: form.title, details: client.name });
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

function ProductPill({ client, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  if (editing) {
    return (
      <select className="text-[11px] font-semibold px-2 py-1 rounded-full border-2 border-[#8403C5] bg-white focus:outline-none"
        value={draft} autoFocus
        onChange={e => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}>
        <option value="">Unset</option>
        {PRODUCT_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }
  return (
    <button type="button" onClick={() => { setDraft(client.product || ''); setEditing(true); }}
      className={`text-[11px] font-semibold px-2.5 py-1 rounded-full transition-colors ${client.product ? PRODUCT_STYLES[client.product] : 'bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]'}`}
      title="Click to change product">
      {client.product || 'Set product'}
    </button>
  );
}

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
    logActivity({ teamMember: '', actionType: 'Viewed a client', section: 'Customer Success', recordName: initialClient.name });
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
            <ProductPill client={client} onSave={(v) => autoSave('product', v)} />
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
              {client.addedManually && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 mb-4 flex items-center gap-2">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-gray-200 text-gray-600">Existing client</span>
                  <p className="text-xs text-gray-500">Added manually — please complete health scores and set priority tier.</p>
                </div>
              )}
              {client.dealId && (
                <div className="mb-4">
                  <a href={`/AppShell?tab=deals`} className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline font-medium">
                    <ExternalLink className="w-3.5 h-3.5" /> View deal →
                  </a>
                </div>
              )}
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
              <div className="flex items-center justify-between mb-1">
                <SectionTitle>Health Scores</SectionTitle>
              </div>
              {!healthRecord ? (
                <p className="text-sm text-[#9CA3AF] italic">No health data yet — click a chip below to add the first score.</p>
              ) : (
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-2xl font-bold text-[#111827]">{total}<span className="text-base font-normal text-[#9CA3AF]">/35</span></span>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${ratingCls}`}>{rating}</span>
                  <span className="text-xs text-[#9CA3AF]">{rating === 'Green' ? '28–35' : rating === 'Yellow' ? '18–27' : '0–17'}</span>
                </div>
              )}
              <div className="flex items-center gap-2 flex-wrap mb-4">
                {SUB_SCORE_KEYS.map(({ key, label }) => (
                  <HealthScoreChip
                    key={key}
                    scoreKey={key}
                    label={label}
                    value={scores[key] || 0}
                    onSave={v => handleScoreChange(key, v)}
                  />
                ))}
              </div>
              {healthRecord && <HealthTrendChart allHealthScores={allHealthScores} />}
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

          {/* ACTIVITY LOG TAB */}
          {activeTab === 'activity' && (
            <ActivityLogTab clientId={client.id} />
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

          {/* DOCUMENTS TAB */}
          {activeTab === 'documents' && (
            <ContractDocuments
              client={client}
              onUpdated={(updated) => { setClient(updated); onUpdated(updated); }}
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

// ─── Activity Log Tab ─────────────────────────────────────────────────────────

const TEAM_MEMBER_COLORS = { Chris: '#8403C5', Elena: '#1D9E75', George: '#E8A020', Martinique: '#0EA5E9', Sreeja: '#DC2626', Ramesh: '#5777AB' };
const CAT_COLORS_ACT = { 'Sales & Outbound': '#3B82F6', 'Customer Success & Onboarding': '#22C55E', 'Marketing & Content': '#A855F7', 'Operations & Admin': '#F97316', 'Product & Tech': '#14B8A6', 'Finance': '#EAB308', 'Strategy & Planning': '#1E3A5F', 'Other': '#9CA3AF' };

function fmtDurAct(min) {
  if (!min) return '—';
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h) return `${m}m`; if (!m) return `${h}h`; return `${h}h ${m}m`;
}

function dateGroupLabel(dateStr) {
  if (!dateStr) return dateStr;
  try {
    const d = parseDI(dateStr);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, 'd MMM yyyy');
  } catch { return dateStr; }
}

function ActivityEntryRow({ e }) {
  const [expanded, setExpanded] = useState(false);
  const color = CAT_COLORS_ACT[e.category] || '#9CA3AF';
  const memberColor = TEAM_MEMBER_COLORS[e.teamMember] || '#9CA3AF';
  const hasExtra = e.notes || e.transcriptLink;
  return (
    <div className="border border-[#E5E7EB] rounded-xl bg-white hover:border-[#8403C5]/20 transition-colors overflow-hidden">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <div className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0" style={{ backgroundColor: memberColor }}>
          {(e.teamMember || '?').charAt(0)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#111827] truncate">{e.projectTask || <span className="text-[#9CA3AF] italic font-normal">No description</span>}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}20`, color }}>{e.category}</span>
            <span className="text-[10px] text-[#9CA3AF]">{e.teamMember}</span>
          </div>
        </div>
        <span className="text-sm font-bold text-[#242450] shrink-0">{fmtDurAct(e.durationMinutes)}</span>
        {hasExtra && (
          <button onClick={() => setExpanded(v => !v)} className="p-1 text-[#9CA3AF] hover:text-[#242450] shrink-0">
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
          </button>
        )}
      </div>
      {expanded && hasExtra && (
        <div className="px-3.5 pb-3 space-y-1.5 border-t border-[#F3F4F6] pt-2">
          {e.notes && <p className="text-xs text-[#6B7280]">{e.notes}</p>}
          {e.transcriptLink && (
            <a href={e.transcriptLink} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline">
              <ExternalLink className="w-3 h-3" /> View transcript
            </a>
          )}
        </div>
      )}
    </div>
  );
}

function ActivityLogTab({ clientId }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [memberFilter, setMemberFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  useEffect(() => {
    if (!clientId) return;
    setLoading(true);
    base44.entities.TimeEntry.filter({ clientId }).then(rows => {
      setEntries(rows.sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      setLoading(false);
    }).catch(() => setLoading(false));
    const unsub = base44.entities.TimeEntry.subscribe((event) => {
      if (event.type === 'create' && event.data?.clientId === clientId) {
        setEntries(prev => [event.data, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
      } else if (event.type === 'update' && event.data?.clientId === clientId) {
        setEntries(prev => prev.map(e => e.id === event.id ? event.data : e));
      } else if (event.type === 'delete') {
        setEntries(prev => prev.filter(e => e.id !== event.id));
      }
    });
    return unsub;
  }, [clientId]);

  const now = new Date();

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (memberFilter && e.teamMember !== memberFilter) return false;
      if (categoryFilter && e.category !== categoryFilter) return false;
      if (dateFilter !== 'all') {
        try {
          const d = parseDI(e.date);
          if (dateFilter === 'this_week' && !isWithinInterval(d, { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) })) return false;
          if (dateFilter === 'this_month' && !isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
          if (dateFilter === 'last_month' && !isWithinInterval(d, { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) })) return false;
          if (dateFilter === 'custom') {
            const start = customStart ? parseDI(customStart) : null;
            const end = customEnd ? parseDI(customEnd) : null;
            if (start && d < start) return false;
            if (end && d > end) return false;
          }
        } catch { return false; }
      }
      return true;
    });
  }, [entries, memberFilter, categoryFilter, dateFilter, customStart, customEnd]);

  const thisMonthTotal = useMemo(() => entries.filter(e => {
    try { return isWithinInterval(parseDI(e.date), { start: startOfMonth(now), end: endOfMonth(now) }); } catch { return false; }
  }).reduce((s, e) => s + (e.durationMinutes || 0), 0), [entries]);

  // Insights
  const catBreakdown = useMemo(() => {
    const map = {};
    entries.forEach(e => { map[e.category] = (map[e.category] || 0) + (e.durationMinutes || 0); });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([cat, min]) => ({ cat, min, pct: total ? Math.round((min / total) * 100) : 0 }));
  }, [entries]);

  const memberBreakdown = useMemo(() => {
    const map = {};
    entries.forEach(e => { map[e.teamMember] = (map[e.teamMember] || 0) + (e.durationMinutes || 0); });
    const total = Object.values(map).reduce((s, v) => s + v, 0);
    return Object.entries(map).sort((a, b) => b[1] - a[1]).map(([m, min]) => ({ m, min, pct: total ? Math.round((min / total) * 100) : 0 }));
  }, [entries]);

  // Monthly trend — last 3 months
  const monthlyTrend = useMemo(() => {
    const months = [];
    for (let i = 2; i >= 0; i--) {
      const mStart = startOfMonth(subMonths(now, i));
      const mEnd = endOfMonth(subMonths(now, i));
      const label = format(mStart, 'MMM');
      const min = entries.filter(e => { try { return isWithinInterval(parseDI(e.date), { start: mStart, end: mEnd }); } catch { return false; } }).reduce((s, e) => s + (e.durationMinutes || 0), 0);
      months.push({ label, min });
    }
    return months;
  }, [entries]);

  const lastActivityDate = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((latest, e) => e.date > latest ? e.date : latest, entries[0].date);
  }, [entries]);

  const lastActivityDaysAgo = useMemo(() => {
    if (!lastActivityDate) return null;
    try { return Math.floor((now - parseDI(lastActivityDate)) / (1000 * 60 * 60 * 24)); } catch { return null; }
  }, [lastActivityDate]);

  const [showInsights, setShowInsights] = useState(false);

  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(e => {
      const key = e.date || '';
      if (!map[key]) map[key] = [];
      map[key].push(e);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered]);

  const uniqueMembers = [...new Set(entries.map(e => e.teamMember).filter(Boolean))];
  const uniqueCategories = [...new Set(entries.map(e => e.category).filter(Boolean))];
  const activeFilters = [memberFilter, categoryFilter, dateFilter !== 'all' ? dateFilter : ''].filter(Boolean).length;
  const filteredTotal = filtered.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const periodLabel = dateFilter === 'this_week' ? 'this week' : dateFilter === 'this_month' ? 'this month' : dateFilter === 'last_month' ? 'last month' : dateFilter === 'custom' ? 'selected period' : 'all time';

  if (loading) {
    return <div className="flex items-center justify-center h-32"><div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  if (entries.length === 0) {
    return (
      <div className="text-center py-12 border border-dashed border-[#E5E7EB] rounded-xl">
        <p className="text-sm text-[#6B7280]">No time has been logged against this client yet.</p>
        <p className="text-xs text-[#9CA3AF] mt-1">Log time in Time & Capacity and select this client to see entries here.</p>
      </div>
    );
  }

  return (
    <div>
      {/* Last activity indicator */}
      {lastActivityDaysAgo !== null && (
        <div className={`flex items-center gap-2 mb-3 px-3 py-2 rounded-lg text-xs font-medium ${lastActivityDaysAgo === 0 ? 'bg-[#E8F7F2] text-[#1D9E75]' : lastActivityDaysAgo <= 7 ? 'bg-[#FFFBEB] text-[#A16207]' : 'bg-[#FEF2F2] text-[#DC2626]'}`}>
          <span className="font-bold">Last activity:</span>
          {lastActivityDaysAgo === 0 ? 'Today' : lastActivityDaysAgo === 1 ? 'Yesterday' : `${lastActivityDaysAgo} days ago`}
        </div>
      )}

      {/* Total banner */}
      <div className="flex items-center justify-between mb-3 px-3 py-2.5 bg-[#F3E8FF]/50 rounded-xl border border-[#8403C5]/10">
        <div>
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">This month</p>
          <p className="text-lg font-bold text-[#8403C5]">{fmtDurAct(thisMonthTotal)}</p>
        </div>
        <div className="text-right">
          <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">All time</p>
          <p className="text-sm font-bold text-[#242450]">{fmtDurAct(entries.reduce((s, e) => s + (e.durationMinutes || 0), 0))}</p>
        </div>
      </div>

      {/* Insights toggle */}
      <button onClick={() => setShowInsights(v => !v)}
        className="flex items-center gap-1.5 text-xs font-semibold text-[#5777AB] hover:text-[#8403C5] mb-3 transition-colors">
        <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showInsights ? 'rotate-180' : ''}`} />
        {showInsights ? 'Hide insights' : 'Show insights'}
      </button>

      {/* Insights panel */}
      {showInsights && (
        <div className="mb-4 space-y-3">
          {/* Monthly trend */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-3">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2">Hours per month (last 3 months)</p>
            <div className="flex items-end gap-2 h-12">
              {(() => {
                const maxMin = Math.max(...monthlyTrend.map(m => m.min), 1);
                return monthlyTrend.map(({ label, min }) => (
                  <div key={label} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[9px] font-bold text-[#242450]">{min > 0 ? fmtDurAct(min) : '—'}</span>
                    <div className="w-full rounded-t" style={{ height: `${Math.max(4, (min / maxMin) * 32)}px`, backgroundColor: '#8403C5' }} />
                    <span className="text-[9px] text-[#9CA3AF]">{label}</span>
                  </div>
                ));
              })()}
            </div>
          </div>

          {/* Category breakdown */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-3">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2">Time by category</p>
            <div className="space-y-1.5">
              {catBreakdown.slice(0, 4).map(({ cat, min, pct }) => (
                <div key={cat} className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-[#EBEBF5] rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-[#8403C5]" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-medium text-[#242450] w-24 truncate shrink-0">{cat}</span>
                  <span className="text-[10px] font-bold text-[#5777AB] shrink-0 w-8 text-right">{pct}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Member breakdown */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-3">
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-2">Time by team member</p>
            <div className="space-y-1.5">
              {memberBreakdown.map(({ m, min, pct }) => {
                const color = TEAM_MEMBER_COLORS[m] || '#9CA3AF';
                return (
                  <div key={m} className="flex items-center gap-2">
                    <div className="w-4 h-4 rounded-full shrink-0 flex items-center justify-center text-white text-[8px] font-bold" style={{ backgroundColor: color }}>{m.charAt(0)}</div>
                    <div className="flex-1 h-1.5 bg-[#EBEBF5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color }} />
                    </div>
                    <span className="text-[10px] font-medium text-[#242450] shrink-0">{m}</span>
                    <span className="text-[10px] font-bold text-[#5777AB] shrink-0">{fmtDurAct(min)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="mb-3">
        <button onClick={() => setFiltersOpen(v => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${activeFilters > 0 ? 'bg-[#F3E8FF] text-[#8403C5] border-[#8403C5]/30' : 'bg-white text-[#5777AB] border-[#EBEBF5]'}`}>
          <Plus className="w-3 h-3" /> Filters {activeFilters > 0 && <span className="bg-[#8403C5] text-white text-[9px] font-bold px-1.5 rounded-full">{activeFilters}</span>}
        </button>
        {filtersOpen && (
          <div className="mt-2 p-3 bg-white border border-[#EBEBF5] rounded-xl space-y-2">
            <div className="flex gap-2 flex-wrap">
              <select value={memberFilter} onChange={e => setMemberFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]">
                <option value="">All members</option>
                {uniqueMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
              <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]">
                <option value="">All categories</option>
                {uniqueCategories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <select value={dateFilter} onChange={e => setDateFilter(e.target.value)}
                className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]">
                <option value="all">All time</option>
                <option value="this_week">This week</option>
                <option value="this_month">This month</option>
                <option value="last_month">Last month</option>
                <option value="custom">Custom range…</option>
              </select>
              {activeFilters > 0 && (
                <button onClick={() => { setMemberFilter(''); setCategoryFilter(''); setDateFilter('all'); setCustomStart(''); setCustomEnd(''); }}
                  className="px-2 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg border border-[#FECACA]">Clear</button>
              )}
            </div>
            {dateFilter === 'custom' && (
              <div className="flex items-center gap-2 mt-1">
                <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
                <span className="text-xs text-[#9CA3AF]">to</span>
                <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                  className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Filtered total */}
      {dateFilter !== 'all' && (
        <p className="text-xs font-semibold text-[#5777AB] mb-2">{filtered.length} {filtered.length === 1 ? 'entry' : 'entries'} · <span className="text-[#8403C5]">{fmtDurAct(filteredTotal)}</span> {periodLabel}</p>
      )}

      {/* Grouped entries */}
      {filtered.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] italic text-center py-6">No entries match your filters.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(([dateStr, dayEntries]) => (
            <div key={dateStr}>
              <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5">{dateGroupLabel(dateStr)}</p>
              <div className="space-y-1.5">
                {dayEntries.map(e => <ActivityEntryRow key={e.id} e={e} />)}
              </div>
            </div>
          ))}
        </div>
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