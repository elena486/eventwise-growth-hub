import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import MentionTextarea, { sendMentionNotifications } from '@/components/shared/MentionTextarea';
import {
  X, Mail, ExternalLink, Phone, Linkedin, Plus, Pencil, Trash2,
  Check, Upload, Link, ChevronDown, ChevronUp, AlertTriangle
} from 'lucide-react';
import MultiFileUpload from '@/components/shared/MultiFileUpload';
import StageBadge from './Stagebadge';

const STAGES = ['New Lead', 'Contacted', 'Discovery Call', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'];
const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
const CONTRACT_LENGTHS = ['Monthly rolling', '6 months', '12 months', '24 months'];
const COMPANY_SIZES = ['1–10', '11–50', '51–200', '201–500', '500+'];
const INDUSTRIES = ['Festival', 'Event Organiser', 'Event Agency', 'Corporate Events', 'Venue', 'Accountancy', 'Other'];
const HEARD_ABOUT = ['LinkedIn', 'Referral', 'Inbound', 'Outbound', 'Event', 'Other'];
const ONBOARDING_PLANS = ['Basic', 'Standard', 'Enterprise', 'Option 1'];
const LOG_TYPES = ['Call', 'Email', 'Demo', 'Meeting', 'LinkedIn', 'Note'];
const LOG_MEMBERS = ['Chris', 'Ramesh', 'George', 'Elena'];
const PROPOSAL_STATUSES = ['Not sent', 'Sent', 'Accepted', 'Declined'];

const LOG_TYPE_STYLES = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-gray-100 text-gray-600',
  Demo: 'bg-purple-100 text-purple-700',
  Meeting: 'bg-green-100 text-green-700',
  LinkedIn: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Note: 'bg-amber-100 text-amber-700',
};

function fmt(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function fmtDate(d) { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d || '—'; } }
function fmtDateTime(d) { try { return format(new Date(d), 'd MMM yyyy, HH:mm'); } catch { return d || '—'; } }
function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

// ─── Reusable field components ───────────────────────────────────────────────

function SectionTitle({ children }) {
  return (
    <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-3">{children}</p>
  );
}

function FieldRow({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium text-ew-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

function Toggle({ value, onChange, label }) {
  return (
    <div className="flex items-center gap-3">
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${value ? 'bg-[#8403C5]' : 'bg-gray-200'}`}
      >
        <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-ew-body">{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function ActivityLog({ entries, onSave }) {
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'Note', date: todayStr(), summary: '', addedBy: 'Chris' });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const addEntry = () => {
    if (!newEntry.summary.trim()) return;
    const entry = { ...newEntry, id: Date.now(), createdAt: new Date().toISOString() };
    const updated = [entry, ...entries];
    onSave(updated);
    setAdding(false);
    setNewEntry({ type: 'Note', date: todayStr(), summary: '', addedBy: 'Chris' });
  };

  const saveEdit = (id) => {
    const updated = entries.map(e => e.id === id ? { ...e, ...editDraft } : e);
    onSave(updated);
    setEditingId(null);
  };

  const deleteEntry = (id) => {
    onSave(entries.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <SectionTitle>Activity Log</SectionTitle>
        <button onClick={() => setAdding(v => !v)} className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline font-semibold">
          <Plus className="w-3 h-3" /> Log activity
        </button>
      </div>

      {adding && (
        <div className="bg-[#F7F8FC] border border-ew-border rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-medium text-ew-muted mb-1">Type</label>
              <select className={ic} value={newEntry.type} onChange={e => setNewEntry(n => ({ ...n, type: e.target.value }))}>
                {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-medium text-ew-muted mb-1">Date</label>
              <input type="date" className={ic} value={newEntry.date} onChange={e => setNewEntry(n => ({ ...n, date: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ew-muted mb-1">Summary</label>
            <MentionTextarea
              className={ic + ' h-20 resize-none'}
              value={newEntry.summary}
              onChange={v => setNewEntry(n => ({ ...n, summary: v }))}
              placeholder="What happened?"
              rows={3}
              author={newEntry.addedBy}
              section={`Pipeline / Activity Log`}
              appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-ew-muted mb-1">Added by</label>
            <select className={ic} value={newEntry.addedBy} onChange={e => setNewEntry(n => ({ ...n, addedBy: e.target.value }))}>
              {LOG_MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
            <button onClick={addEntry} disabled={!newEntry.summary.trim()}
              className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">Save</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {entries.length === 0 && !adding && (
          <p className="text-sm text-ew-muted italic">No activity logged yet.</p>
        )}
        {entries.map(entry => (
          <div key={entry.id} className="group flex gap-3 bg-white border border-ew-border rounded-lg p-3 hover:border-[#8403C5]/30 transition-colors">
            {editingId === entry.id ? (
              <div className="flex-1 space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <select className={ic + ' text-xs py-1'} value={editDraft.type} onChange={e => setEditDraft(d => ({ ...d, type: e.target.value }))}>
                    {LOG_TYPES.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <input type="date" className={ic + ' text-xs py-1'} value={editDraft.date} onChange={e => setEditDraft(d => ({ ...d, date: e.target.value }))} />
                </div>
                <MentionTextarea className={ic + ' h-16 resize-none text-xs'} value={editDraft.summary} onChange={v => setEditDraft(d => ({ ...d, summary: v }))} rows={3} section="Pipeline / Activity Log" appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-2 py-1 text-xs text-ew-body hover:bg-ew-bg rounded">Cancel</button>
                  <button onClick={() => saveEdit(entry.id)} className="px-3 py-1 text-xs font-semibold bg-[#8403C5] text-white rounded">Save</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LOG_TYPE_STYLES[entry.type] || 'bg-gray-100 text-gray-600'}`}>{entry.type}</span>
                    <span className="text-[11px] text-ew-muted">{fmtDate(entry.date)}</span>
                    {entry.addedBy && <span className="text-[11px] text-ew-muted">· {entry.addedBy}</span>}
                  </div>
                  <p className="text-sm text-ew-body">{entry.summary}</p>
                </div>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                  <button onClick={() => { setEditingId(entry.id); setEditDraft({ type: entry.type, date: entry.date, summary: entry.summary }); }}
                    className="p-1 text-ew-muted hover:text-navy rounded"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => setDeleteConfirm(entry.id)} className="p-1 text-ew-muted hover:text-red-500 rounded"><X className="w-3 h-3" /></button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Delete this activity entry?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => deleteEntry(deleteConfirm)} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── External Links editor ────────────────────────────────────────────────────

function ExternalLinksEditor({ links, onChange }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const addLink = () => onChange([...links, { id: Date.now(), label: '', url: '' }]);
  const updateLink = (id, field, val) => onChange(links.map(l => l.id === id ? { ...l, [field]: val } : l));
  const confirmRemove = (id) => setDeleteConfirm(id);
  const removeLink = () => { onChange(links.filter(l => l.id !== deleteConfirm)); setDeleteConfirm(null); };

  return (
    <div>
      <div className="space-y-2 mb-2">
        {links.map(link => (
          <div key={link.id} className="flex items-center gap-2">
            <input className={ic + ' flex-1 text-xs py-1.5'} placeholder="Label" value={link.label}
              onChange={e => updateLink(link.id, 'label', e.target.value)} />
            <input className={ic + ' flex-2 text-xs py-1.5'} placeholder="https://…" value={link.url}
              onChange={e => updateLink(link.id, 'url', e.target.value)} />
            {link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-3.5 h-3.5" /></a>}
            <button onClick={() => confirmRemove(link.id)} className="text-ew-muted hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <button onClick={addLink} className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline">
        <Plus className="w-3 h-3" /> Add link
      </button>
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Remove this link?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={removeLink} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

export default function LeadDetailPanel({ lead, onClose, onUpdate, onDelete, onClosedWon }) {
  const [data, setData] = useState(lead);
  const [lostPrompt, setLostPrompt] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const saveTimer = useRef(null);

  // Sync if parent lead changes (e.g. from table updates)
  useEffect(() => { setData(lead); }, [lead.id]);

  const logEntries = (() => { try { return JSON.parse(data.activityLog || '[]'); } catch { return []; } })();
  const extLinks = (() => { try { return JSON.parse(data.externalLinks || '[]'); } catch { return []; } })();
  const leadFiles = (() => { try { const p = JSON.parse(data.fileUrl || '[]'); return Array.isArray(p) ? p : []; } catch { return data.fileUrl ? [{ name: data.fileName || data.fileUrl, url: data.fileUrl }] : []; } })();

  const autoSave = useCallback((updates) => {
    const merged = { ...data, ...updates };
    setData(merged);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(async () => {
      const now = new Date().toISOString();
      await base44.entities.Lead.update(merged.id, { ...updates, lastActivity: now });
      onUpdate({ ...merged, lastActivity: now });
    }, 500);
  }, [data]);

  const f = (field) => (e) => autoSave({ [field]: e.target.value });
  const fVal = (field) => (val) => autoSave({ [field]: val });
  const fBool = (field) => (val) => autoSave({ [field]: val });

  const handleStageChange = (newStage) => {
    if (newStage === 'Closed Won' && !data.converted) {
      onClosedWon({ ...data, stage: 'Closed Won' });
      return;
    }
    autoSave({ stage: newStage });
  };

  const handleMarkLost = async () => {
    const updates = { stage: 'Closed Lost', lostReason };
    autoSave(updates);
    setLostPrompt(false);
  };

  const handleDelete = async () => {
    await base44.entities.Lead.delete(data.id);
    onDelete(data.id);
    onClose();
  };

  const saveActivityLog = (entries) => {
    autoSave({ activityLog: JSON.stringify(entries) });
  };

  const saveExtLinks = (links) => {
    autoSave({ externalLinks: JSON.stringify(links) });
  };

  const saveFiles = (files) => {
    autoSave({ fileUrl: JSON.stringify(files), fileName: files.map(f => f.name).join(', ') });
  };

  const annual = (parseFloat(data.dealValueMonthly) || 0) * 12;

  return (
    <div className="flex flex-col h-full bg-white border-l border-ew-border overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 pt-5 pb-4 border-b border-ew-border">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <input
              className="text-xl font-bold text-navy bg-transparent border-none outline-none w-full hover:bg-ew-bg focus:bg-ew-bg rounded px-1 -ml-1 transition-colors"
              value={data.companyName || ''}
              onChange={f('companyName')}
              placeholder="Company name"
            />
            <input
              className="text-sm text-ew-muted bg-transparent border-none outline-none w-full hover:bg-ew-bg focus:bg-ew-bg rounded px-1 -ml-1 mt-0.5 transition-colors"
              value={data.contactName || ''}
              onChange={f('contactName')}
              placeholder="Contact name"
            />
          </div>
          <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg shrink-0 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Stage + CTA row */}
        <div className="flex items-center gap-3 mt-3 flex-wrap">
          <StageBadge stage={data.stage} />
          {data.converted && (
            <span className="text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-0.5 rounded-full">
              ✓ Converted {data.convertedDate ? fmtDate(data.convertedDate) : ''}
            </span>
          )}
          {!data.converted && data.stage !== 'Closed Won' && (
            <button
              onClick={() => onClosedWon({ ...data, stage: 'Closed Won' })}
              className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              🎉 Closed Won
            </button>
          )}
          {data.lastActivity && (
            <span className="text-[11px] text-ew-muted ml-auto">Updated {fmtDateTime(data.lastActivity)}</span>
          )}
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">

        {/* Converted banner */}
        {data.converted && (
          <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex items-center gap-2">
            <Check className="w-4 h-4 shrink-0 text-green-600" />
            <span>This lead was converted on {data.convertedDate ? fmtDate(data.convertedDate) : 'an earlier date'}.
              {data.dealId && <> <button className="underline hover:no-underline ml-1" onClick={() => {}}>View deal →</button></>}
            </span>
          </div>
        )}

        {/* ── SECTION A: Contact & Company ── */}
        <div>
          <SectionTitle>Contact & Company</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="First name">
              <input className={ic} value={data.firstName || ''} onChange={f('firstName')} placeholder="First name" />
            </FieldRow>
            <FieldRow label="Last name">
              <input className={ic} value={data.lastName || ''} onChange={f('lastName')} placeholder="Last name" />
            </FieldRow>
            <FieldRow label="Job title">
              <input className={ic} value={data.jobTitle || ''} onChange={f('jobTitle')} placeholder="e.g. Finance Director" />
            </FieldRow>
            <FieldRow label="Email">
              <div className="relative">
                <input className={ic + ' pr-8'} value={data.email || ''} onChange={f('email')} placeholder="name@company.com" />
                {data.email && (
                  <a href={`mailto:${data.email}`} className="absolute right-2.5 top-2.5 text-ew-muted hover:text-[#8403C5]"><Mail className="w-4 h-4" /></a>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Phone">
              <input className={ic} value={data.phone || ''} onChange={f('phone')} placeholder="+44 …" />
            </FieldRow>
            <FieldRow label="LinkedIn URL">
              <div className="relative">
                <input className={ic + ' pr-8'} value={data.linkedInUrl || ''} onChange={f('linkedInUrl')} placeholder="https://linkedin.com/in/…" />
                {data.linkedInUrl && (
                  <a href={data.linkedInUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2.5 top-2.5 text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-4 h-4" /></a>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Company website">
              <div className="relative">
                <input className={ic + ' pr-8'} value={data.companyWebsite || ''} onChange={f('companyWebsite')} placeholder="https://…" />
                {data.companyWebsite && (
                  <a href={data.companyWebsite} target="_blank" rel="noopener noreferrer" className="absolute right-2.5 top-2.5 text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-4 h-4" /></a>
                )}
              </div>
            </FieldRow>
            <FieldRow label="Company size">
              <select className={ic} value={data.companySize || ''} onChange={f('companySize')}>
                <option value="">Select…</option>
                {COMPANY_SIZES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Industry">
              <select className={ic} value={data.industry || ''} onChange={f('industry')}>
                <option value="">Select…</option>
                {INDUSTRIES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="How they heard about Eventwise">
              <select className={ic} value={data.heardAbout || ''} onChange={f('heardAbout')}>
                <option value="">Select…</option>
                {HEARD_ABOUT.map(s => <option key={s}>{s}</option>)}
              </select>
            </FieldRow>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* ── SECTION B: Deal Info ── */}
        <div>
          <SectionTitle>Deal Info</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Plan">
              <select className={ic} value={data.plan || ''} onChange={f('plan')}>
                <option value="">Select…</option>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Monthly value">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                <input type="number" className={ic + ' pl-7'} value={data.dealValueMonthly || ''} onChange={f('dealValueMonthly')} placeholder="0" />
              </div>
              <p className="text-xs text-ew-muted mt-1">{fmt(annual)} / year</p>
            </FieldRow>
            <FieldRow label="One-off setup fee">
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                <input type="number" className={ic + ' pl-7'} value={data.setupFee || ''} onChange={f('setupFee')} placeholder="0" />
              </div>
            </FieldRow>
            <FieldRow label="Includes accounting add-on?">
              <Toggle value={!!data.accountingAddon} onChange={fBool('accountingAddon')} />
            </FieldRow>
            <FieldRow label="Onboarding plan">
              <select className={ic} value={data.onboardingPlan || ''} onChange={f('onboardingPlan')}>
                <option value="">Select…</option>
                {ONBOARDING_PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Proposed start date">
              <input type="date" className={ic} value={data.proposedStartDate || ''} onChange={f('proposedStartDate')} />
            </FieldRow>
            <FieldRow label="Contract length">
              <select className={ic} value={data.contractLength || ''} onChange={f('contractLength')}>
                <option value="">Select…</option>
                {CONTRACT_LENGTHS.map(c => <option key={c}>{c}</option>)}
              </select>
            </FieldRow>
            <FieldRow label="Probability %">
              <div className="relative">
                <input type="number" min="0" max="100" className={ic + ' pr-7'} value={data.probability || ''} onChange={f('probability')} placeholder="e.g. 70" />
                <span className="absolute right-3 top-2.5 text-sm text-ew-muted">%</span>
              </div>
            </FieldRow>
            <FieldRow label="Budget confirmed">
              <Toggle value={!!data.budgetConfirmed} onChange={fBool('budgetConfirmed')} />
            </FieldRow>
            <FieldRow label="Decision maker confirmed">
              <Toggle value={!!data.decisionMakerConfirmed} onChange={fBool('decisionMakerConfirmed')} />
            </FieldRow>
            <FieldRow label="Timeline to decision">
              <input className={ic} value={data.timelineToDecision || ''} onChange={f('timelineToDecision')} placeholder="e.g. End of April" />
            </FieldRow>
            <FieldRow label="Competitors they are evaluating">
              <input className={ic} value={data.competitorsEvaluating || ''} onChange={f('competitorsEvaluating')} placeholder="e.g. Cvent, spreadsheets" />
            </FieldRow>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* ── SECTION C: Activity Log ── */}
        <ActivityLog entries={logEntries} onSave={saveActivityLog} />

        {/* Demo fields */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          <FieldRow label="Demo completed">
            <Toggle value={!!data.demoCompleted} onChange={fBool('demoCompleted')} />
          </FieldRow>
          {data.demoCompleted && (
            <FieldRow label="Demo date">
              <input type="date" className={ic} value={data.demoDate || ''} onChange={f('demoDate')} />
            </FieldRow>
          )}
          {data.demoCompleted && (
            <div className="col-span-2">
              <FieldRow label="Demo notes">
                <textarea className={ic + ' h-20 resize-none'} value={data.demoNotes || ''} onChange={f('demoNotes')} placeholder="What was discussed in the demo?" />
              </FieldRow>
            </div>
          )}
        </div>

        <hr className="border-ew-border" />

        {/* ── SECTION D: Objections & Intelligence ── */}
        <div>
          <SectionTitle>Objections & Intelligence</SectionTitle>
          <div className="space-y-3">
            <FieldRow label="Objections raised">
              <MentionTextarea className={ic + ' h-20 resize-none'} value={data.objections || ''} onChange={v => autoSave({ objections: v })} placeholder="What concerns or objections has the prospect raised?" rows={3} section={`Pipeline / ${data.companyName} / Objections`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
            </FieldRow>
            <FieldRow label="How objections were addressed">
              <MentionTextarea className={ic + ' h-20 resize-none'} value={data.objectionsAddressed || ''} onChange={v => autoSave({ objectionsAddressed: v })} placeholder="How have you handled these?" rows={3} section={`Pipeline / ${data.companyName} / Objections`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
            </FieldRow>
            <FieldRow label="Key pain points identified">
              <MentionTextarea className={ic + ' h-20 resize-none'} value={data.painPoints || ''} onChange={v => autoSave({ painPoints: v })} placeholder="What financial or operational problems are they trying to solve?" rows={3} section={`Pipeline / ${data.companyName} / Pain Points`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
            </FieldRow>
            <div>
              <label className="block text-[11px] font-medium text-ew-muted mb-1">🔒 Internal only — not shared with prospect</label>
              <MentionTextarea className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300/40 bg-amber-50 h-20 resize-none" value={data.internalNotes || ''} onChange={v => autoSave({ internalNotes: v })} placeholder="Internal notes…" rows={3} section={`Pipeline / ${data.companyName} / Internal Notes`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
            </div>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* ── SECTION E: Next Steps ── */}
        <div>
          <SectionTitle>Next Steps</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2">
              <FieldRow label="Next action">
                <input className={ic} value={data.nextAction || ''} onChange={f('nextAction')} placeholder="What needs to happen next?" />
              </FieldRow>
            </div>
            <FieldRow label="Next action due date">
              <input type="date" className={ic} value={data.nextActionDue || ''} onChange={f('nextActionDue')} />
            </FieldRow>
            <FieldRow label="Follow-up reminder">
              <input type="date" className={ic} value={data.followUpReminder || ''} onChange={f('followUpReminder')} />
            </FieldRow>
            <div className="col-span-2">
              <FieldRow label="Follow-up note">
                <input className={ic} value={data.followUpNote || ''} onChange={f('followUpNote')} placeholder="Optional note for reminder…" />
              </FieldRow>
            </div>
            <div className="col-span-2">
              <FieldRow label="Stage">
                <select className={ic} value={data.stage || ''} onChange={e => handleStageChange(e.target.value)}>
                  {STAGES.map(s => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
            </div>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* ── SECTION F: Files & Documents ── */}
        <div>
          <SectionTitle>Files & Documents</SectionTitle>
          <div className="grid grid-cols-2 gap-3">
            <FieldRow label="Proposal status">
              <select className={ic} value={data.proposalStatus || 'Not sent'} onChange={f('proposalStatus')}>
                {PROPOSAL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </FieldRow>
            {data.proposalStatus && data.proposalStatus !== 'Not sent' && (
              <FieldRow label="Proposal sent date">
                <input type="date" className={ic} value={data.proposalSentDate || ''} onChange={f('proposalSentDate')} />
              </FieldRow>
            )}
          </div>

          <div className="mt-3">
            <label className="block text-[11px] font-medium text-ew-muted mb-2">External links</label>
            <ExternalLinksEditor links={extLinks} onChange={saveExtLinks} />
          </div>

          <div className="mt-4">
            <label className="block text-[11px] font-medium text-ew-muted mb-2">File attachments</label>
            <MultiFileUpload files={leadFiles} onChange={saveFiles} />
          </div>
        </div>

        {/* ── FOOTER ACTIONS ── */}
        <div className="border-t border-ew-border pt-4 flex items-center gap-4">
          <button
            onClick={() => setLostPrompt(true)}
            className="text-sm text-ew-muted hover:text-gray-700 underline transition-colors"
          >
            Mark as Lost
          </button>
          <button
            onClick={() => setDeleteConfirm(true)}
            className="text-sm text-red-500 hover:text-red-700 underline transition-colors"
          >
            Delete this lead
          </button>
        </div>

        {/* Lost reason prompt */}
        {lostPrompt && (
          <div className="border border-ew-border rounded-xl p-4 bg-[#F7F8FC]">
            <p className="text-sm font-semibold text-navy mb-2">Why was this lead lost? <span className="font-normal text-ew-muted">(optional)</span></p>
            <textarea className={ic + ' h-16 resize-none mb-3'} value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="e.g. Went with a competitor, budget cut…" />
            <div className="flex gap-2 justify-end">
              <button onClick={() => setLostPrompt(false)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={handleMarkLost} className="px-3 py-1.5 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800">Mark as Lost</button>
            </div>
          </div>
        )}
      </div>

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete this lead?</h3>
            <p className="text-sm text-ew-body mb-5">Are you sure you want to permanently delete this lead? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}