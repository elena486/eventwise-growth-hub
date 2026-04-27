import React, { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import StageBadge from './Stagebadge';
import PlanBadge from './PlanBadge';
import InlineCell from '@/components/shared/InlineCell';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Trash2, Check, X, Pencil, Settings2, RotateCcw, AlertTriangle, Undo2 } from 'lucide-react';

const STAGE_ORDER = ['New Lead', 'Contacted', 'Discovery Call', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'];
const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
const OWNERS = ['Chris', 'Ramesh', 'George'];

const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function fmtMonth(val) {
  if (!val) return '—';
  try {
    const [y, m] = val.split('-');
    return `${MONTHS_SHORT[parseInt(m, 10) - 1]} ${y}`;
  } catch { return val; }
}

function fmt(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }

function relativeDate(dateStr) {
  if (!dateStr) return '—';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = diffMs / 60000;
    const diffHours = diffMs / 3600000;
    const diffDays = diffMs / 86400000;
    if (diffMins < 60) return 'Just now';
    if (diffHours < 24 && date.toDateString() === now.toDateString()) {
      const h = Math.floor(diffHours);
      return `${h} hour${h !== 1 ? 's' : ''} ago`;
    }
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
    if (diffDays < 7) { const d = Math.floor(diffDays); return `${d} day${d !== 1 ? 's' : ''} ago`; }
    return format(date, 'd MMM yyyy');
  } catch { return dateStr; }
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-ew-muted-light inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 text-navy inline" />
    : <ChevronDown className="w-3 h-3 ml-1 text-navy inline" />;
}

function NextActionCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const startEdit = () => { setDraft(value || ''); setEditing(true); };
  const commit = async () => { setEditing(false); await onSave(draft); };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[160px]">
        <input autoFocus className="flex-1 text-xs border border-navy/30 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }} />
        <button onClick={commit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-ew-muted hover:bg-ew-bg rounded"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }
  if (value) {
    return (
      <div className="group flex items-start gap-1 max-w-[180px]">
        <p className="text-sm text-ew-body flex-1 truncate" title={value}>{value}</p>
        <button onClick={startEdit} className="opacity-0 group-hover:opacity-100 p-0.5 text-ew-muted hover:text-navy rounded"><Pencil className="w-3 h-3" /></button>
      </div>
    );
  }
  return <button onClick={startEdit} className="text-xs text-ew-muted italic hover:text-navy">Add action…</button>;
}

const OWNER_COLORS = {
  Chris: 'bg-blue-100 text-blue-700',
  Ramesh: 'bg-purple-100 text-purple-700',
  Elena: 'bg-emerald-100 text-emerald-700',
  George: 'bg-amber-100 text-amber-700',
};

// Contact cell — shows primary contact name + extra contacts badge with tooltip
function ContactCell({ lead, onSave }) {
  const [tooltipVisible, setTooltipVisible] = useState(false);
  const tooltipRef = useRef(null);

  // Parse multi-contacts if present
  let contacts = [];
  try {
    const parsed = JSON.parse(lead.contacts || '[]');
    if (Array.isArray(parsed) && parsed.length > 0) contacts = parsed;
  } catch {}

  const primary = contacts.find(c => c.primary) || contacts[0];
  const primaryName = primary ? [primary.firstName, primary.lastName].filter(Boolean).join(' ') : lead.contactName;
  const extra = contacts.filter(c => c !== primary);

  return (
    <div className="flex items-center gap-1 mt-0.5 relative">
      <InlineCell value={primaryName || lead.contactName} onSave={onSave} placeholder="Contact name" className="text-xs text-ew-muted" />
      {extra.length > 0 && (
        <div className="relative" ref={tooltipRef}
          onMouseEnter={() => setTooltipVisible(true)}
          onMouseLeave={() => setTooltipVisible(false)}>
          <span className="text-[10px] font-semibold bg-[#F3E8FF] text-[#8403C5] px-1.5 py-0.5 rounded-full cursor-default">+{extra.length}</span>
          {tooltipVisible && (
            <div className="absolute left-0 top-full mt-1 bg-[#1a1f3c] text-white rounded-xl p-3 shadow-xl text-xs z-50 min-w-[160px]">
              {extra.map((c, i) => (
                <div key={i} className="py-0.5">
                  <span className="font-semibold">{[c.firstName, c.lastName].filter(Boolean).join(' ') || '—'}</span>
                  {c.jobTitle && <span className="text-white/60 ml-1">· {c.jobTitle}</span>}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function MonthCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  if (editing) {
    return (
      <input type="month" autoFocus
        className="text-xs border border-navy/30 rounded-lg px-2 py-1.5 focus:outline-none bg-white"
        value={value}
        onChange={e => { onSave(e.target.value); setEditing(false); }}
        onBlur={() => setEditing(false)}
      />
    );
  }
  return (
    <button onClick={() => setEditing(true)} className="text-sm text-ew-body hover:text-navy transition-colors">
      {value ? fmtMonth(value) : <span className="text-xs text-ew-muted italic">—</span>}
    </button>
  );
}

function SectionHeader({ label, colSpan }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-2 bg-[#F0F4FF] border-y border-[#DDE3F5]">
        <span className="text-[11px] font-bold text-[#4B5DA8] uppercase tracking-[0.15em]">{label}</span>
      </td>
    </tr>
  );
}

// Mark as lost in-row
function MarkLostCell({ lead, onMarkLost }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  if (open) {
    return (
      <div className="min-w-[200px]" onClick={e => e.stopPropagation()}>
        <p className="text-xs font-semibold text-navy mb-1">Mark as lost</p>
        <textarea
          className="w-full text-xs border border-ew-border rounded-lg px-2 py-1.5 resize-none mb-1.5 focus:outline-none bg-white"
          rows={2} placeholder="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)}
        />
        <div className="flex gap-1.5">
          <button onClick={() => { onMarkLost(lead.id, reason); setOpen(false); }}
            className="flex-1 text-xs font-semibold bg-gray-700 text-white rounded-lg py-1 hover:bg-gray-800">Confirm</button>
          <button onClick={() => setOpen(false)} className="text-xs text-ew-muted hover:text-navy px-2">Cancel</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={e => { e.stopPropagation(); setOpen(true); }}
      className="flex items-center gap-1 text-xs text-ew-muted hover:text-red-600 hover:bg-red-50 rounded-lg px-2 py-1 transition-colors whitespace-nowrap">
      <AlertTriangle className="w-3 h-3" /> Lost
    </button>
  );
}

// Column visibility dropdown
const ALL_COLUMNS = [
  { key: 'company', label: 'Company' },
  { key: 'owner', label: 'Owner' },
  { key: 'plan', label: 'Plan' },
  { key: 'deal', label: 'Deal value' },
  { key: 'stage', label: 'Stage' },
  { key: 'probability', label: 'Probability %' },
  { key: 'expectedClose', label: 'Expected close' },
  { key: 'nextAction', label: 'Next action' },
  { key: 'activity', label: 'Last activity' },
  { key: 'notes', label: 'Notes' },
  { key: 'accounting', label: 'Accounting service' },
];

const DEFAULT_VISIBLE = ['company', 'owner', 'plan', 'deal', 'stage', 'probability', 'nextAction', 'activity', 'notes'];

const STORAGE_KEY = 'pipeline_columns_v1';

function loadVisibleCols() {
  try { const s = localStorage.getItem(STORAGE_KEY); if (s) return new Set(JSON.parse(s)); } catch {}
  return new Set(DEFAULT_VISIBLE);
}

function ColumnToggle({ visible, onToggle, onReset }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border bg-white rounded-lg hover:bg-ew-bg transition-colors">
        <Settings2 className="w-3.5 h-3.5" /> Columns
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-1 bg-white border border-ew-border rounded-xl shadow-lg z-30 py-2 min-w-[180px]">
          {ALL_COLUMNS.map(col => (
            <label key={col.key} className="flex items-center gap-2.5 px-3 py-1.5 cursor-pointer hover:bg-ew-bg transition-colors">
              <input type="checkbox" checked={visible.has(col.key)} onChange={() => onToggle(col.key)} className="rounded" />
              <span className="text-sm text-ew-body">{col.label}</span>
            </label>
          ))}
          <div className="border-t border-ew-border mt-1 pt-1 px-3">
            <button onClick={() => { onReset(); setOpen(false); }} className="flex items-center gap-1.5 text-xs text-ew-muted hover:text-navy py-1 transition-colors">
              <RotateCcw className="w-3 h-3" /> Reset to default
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Undo Toast
function UndoToast({ message, onUndo, onDismiss }) {
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] flex items-center gap-3 bg-[#1a1a2e] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl animate-in fade-in slide-in-from-bottom-2">
      <span>{message}</span>
      <button onClick={onUndo} className="flex items-center gap-1.5 px-3 py-1 bg-white/15 hover:bg-white/25 rounded-lg text-xs font-semibold transition-colors">
        <Undo2 className="w-3 h-3" /> Undo
      </button>
      <button onClick={onDismiss} className="text-white/50 hover:text-white ml-1"><X className="w-3.5 h-3.5" /></button>
    </div>
  );
}

export default function LeadTable({ leads, onDelete, onProposal, onUpdateField, onMarkLost, newLeadId, showOwnerSections, onRowClick, selectedLeadId, isLostView }) {
  const [sortCol, setSortCol] = useState('stage');
  const [sortDir, setSortDir] = useState('asc');
  const [deletingId, setDeletingId] = useState(null);
  const [visibleCols, setVisibleCols] = useState(() => loadVisibleCols());
  const [undoToast, setUndoToast] = useState(null); // { lead, timer }
  const undoRef = useRef(null);

  const handleDelete = async (lead) => {
    setDeletingId(null);
    // Delete immediately
    await onDelete(lead.id);
    // Show undo toast for 8 seconds
    clearTimeout(undoRef.current);
    setUndoToast({ lead });
    undoRef.current = setTimeout(() => setUndoToast(null), 8000);
  };

  const handleUndo = async () => {
    if (!undoToast) return;
    clearTimeout(undoRef.current);
    const { lead } = undoToast;
    setUndoToast(null);
    const { id, created_date, updated_date, ...rest } = lead;
    const { base44: b44 } = await import('@/api/base44Client');
    await b44.entities.Lead.create(rest);
    window.dispatchEvent(new CustomEvent('pipeline-refresh'));
  };

  const toggleCol = (key) => {
    setVisibleCols(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      return next;
    });
  };

  const resetCols = () => {
    const def = new Set(DEFAULT_VISIBLE);
    setVisibleCols(def);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...def]));
  };

  const show = (key) => visibleCols.has(key);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const save = (id, field) => async (value) => onUpdateField(id, field, value);

  const sortLeads = (arr) => [...arr].sort((a, b) => {
    if (a.id === newLeadId) return -1;
    if (b.id === newLeadId) return 1;
    let av, bv;
    if (sortCol === 'stage') { av = STAGE_ORDER.indexOf(a.stage); bv = STAGE_ORDER.indexOf(b.stage); }
    else if (sortCol === 'company') { av = a.companyName?.toLowerCase() || ''; bv = b.companyName?.toLowerCase() || ''; }
    else if (sortCol === 'deal') { av = a.dealValueMonthly || 0; bv = b.dealValueMonthly || 0; }
    else if (sortCol === 'activity') { av = a.lastActivity || ''; bv = b.lastActivity || ''; }
    else if (sortCol === 'probability') { av = a.probability || 0; bv = b.probability || 0; }
    else { av = ''; bv = ''; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const Th = ({ label, col }) => (
    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] cursor-pointer select-none hover:text-navy transition-colors whitespace-nowrap"
      onClick={() => col && handleSort(col)}>
      {label}{col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
    </th>
  );

  // count visible data cols for section header colspan
  const visibleCount = ALL_COLUMNS.filter(c => show(c.key)).length + 2; // +2 for actions col + lost col

  const renderRow = (lead, i) => {
    const isNew = lead.id === newLeadId;
    const isSelected = lead.id === selectedLeadId;
    return (
      <tr
        key={lead.id}
        onClick={() => onRowClick && onRowClick(lead)}
        className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-[#F3E8FF] border-l-2 border-l-[#8403C5]' : ''} ${isNew ? 'bg-blue-50/40' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
      >
        {show('company') && (
          <td className="px-4 py-3 min-w-[160px]" onClick={e => e.stopPropagation()}>
            <InlineCell value={lead.companyName} onSave={save(lead.id, 'companyName')} placeholder="Company name" autoEdit={isNew} className="font-semibold text-navy text-sm" />
            <ContactCell lead={lead} onSave={save(lead.id, 'contactName')} />
          </td>
        )}
        {show('owner') && (
          <td className="px-4 py-3 min-w-[100px]">
            <InlineCell value={lead.leadOwner} onSave={save(lead.id, 'leadOwner')} type="select" options={OWNERS}
              displayEl={lead.leadOwner ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${OWNER_COLORS[lead.leadOwner] || 'bg-gray-100 text-gray-600'}`}>{lead.leadOwner}</span> : <span className="text-xs text-ew-muted italic">Unassigned</span>}
              placeholder="Assign" />
          </td>
        )}
        {show('plan') && (
          <td className="px-4 py-3 min-w-[110px]">
            <InlineCell value={lead.plan} onSave={save(lead.id, 'plan')} type="select" options={PLANS}
              displayEl={lead.plan ? <PlanBadge plan={lead.plan} /> : null} placeholder="Set plan" />
          </td>
        )}
        {show('deal') && (
          <td className="px-4 py-3 min-w-[110px]">
            <InlineCell value={lead.dealValueMonthly} onSave={save(lead.id, 'dealValueMonthly')} type="number"
              displayEl={<div><p className="font-semibold text-navy">{fmt(lead.dealValueMonthly)}/mo</p><p className="text-xs text-ew-muted">{fmt((lead.dealValueMonthly || 0) * 12)}/yr</p></div>}
              placeholder="Set value" />
          </td>
        )}
        {show('stage') && (
          <td className="px-4 py-3 min-w-[140px]" onClick={e => e.stopPropagation()}>
            <InlineCell value={lead.stage} onSave={save(lead.id, 'stage')} type="select" options={STAGE_ORDER}
              displayEl={lead.stage ? <StageBadge stage={lead.stage} /> : null} placeholder="Set stage" />
          </td>
        )}
        {show('probability') && (
          <td className="px-4 py-3 min-w-[80px]" onClick={e => e.stopPropagation()}>
            <InlineCell value={lead.probability} onSave={save(lead.id, 'probability')} type="number" min={0} max={100}
              displayEl={lead.probability != null && lead.probability !== '' ? <span className="text-sm font-semibold text-navy">{lead.probability}%</span> : null}
              placeholder="—" />
          </td>
        )}
        {show('expectedClose') && (
          <td className="px-4 py-3 min-w-[120px]" onClick={e => e.stopPropagation()}>
            <MonthCell value={lead.expectedCloseMonth || ''} onSave={save(lead.id, 'expectedCloseMonth')} />
          </td>
        )}
        {show('nextAction') && (
          <td className="px-4 py-3 min-w-[160px]">
            <NextActionCell value={lead.nextAction} onSave={save(lead.id, 'nextAction')} />
          </td>
        )}
        {show('activity') && (
          <td className="px-4 py-3 min-w-[100px]">
            <span className="text-sm text-ew-muted">{relativeDate(lead.lastActivity)}</span>
          </td>
        )}
        {show('notes') && (
          <td className="px-4 py-3 max-w-[180px]">
            <InlineCell value={lead.notes} onSave={save(lead.id, 'notes')} type="textarea" placeholder="Add notes…"
              displayEl={lead.notes ? <p className="text-sm text-ew-body truncate max-w-[160px]" title={lead.notes}>{lead.notes}</p> : null} />
          </td>
        )}
        {show('accounting') && (
          <td className="px-4 py-3 min-w-[140px]">
            <span className="text-xs text-ew-body">{lead.accountingService || '—'}</span>
          </td>
        )}
        {isLostView && (
          <td className="px-4 py-3 min-w-[160px]">
            <p className="text-xs text-red-600 font-medium">{lead.lostReason || '—'}</p>
          </td>
        )}
        {/* Actions */}
        <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
          <div className="flex items-center gap-1.5 justify-end flex-wrap">
            {!isLostView && onMarkLost && (
              <MarkLostCell lead={lead} onMarkLost={onMarkLost} />
            )}
            {!isLostView && (
              <button onClick={() => onProposal(lead)}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-navy bg-navy-tint hover:bg-navy hover:text-white rounded-lg transition-colors whitespace-nowrap">
                <FileText className="w-3 h-3" /> Proposal
              </button>
            )}
            {deletingId === lead.id ? (
              <div className="flex items-center gap-1">
                <button onClick={() => handleDelete(lead)} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setDeletingId(null)} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <button onClick={() => setDeletingId(lead.id)} className="p-1.5 text-ew-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors" title="Delete">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </td>
      </tr>
    );
  };

  const buildRows = () => {
    if (!showOwnerSections) return sortLeads(leads).map((lead, i) => renderRow(lead, i));
    const others = sortLeads(leads.filter(l => l.leadOwner !== 'Ramesh'));
    const ramesh = sortLeads(leads.filter(l => l.leadOwner === 'Ramesh'));
    const rows = [];
    others.forEach((lead, i) => rows.push(renderRow(lead, i)));
    if (ramesh.length > 0) {
      rows.push(<SectionHeader key="ramesh-header" label="Ramesh's Leads" colSpan={visibleCount} />);
      ramesh.forEach((lead, i) => rows.push(renderRow(lead, i)));
    }
    return rows;
  };

  return (
    <>
      <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
        {/* Column toggle toolbar */}
        <div className="flex justify-end px-4 py-2 border-b border-ew-border">
          <ColumnToggle visible={visibleCols} onToggle={toggleCol} onReset={resetCols} />
        </div>
        <table className="w-full text-sm">
          <thead className="bg-ew-footer border-b border-ew-border">
            <tr>
              {show('company') && <Th label="Company" col="company" />}
              {show('owner') && <Th label="Owner" />}
              {show('plan') && <Th label="Plan" />}
              {show('deal') && <Th label="Deal value" col="deal" />}
              {show('stage') && <Th label="Stage" col="stage" />}
              {show('probability') && <Th label="Prob %" col="probability" />}
              {show('expectedClose') && <Th label="Expected close" />}
              {show('nextAction') && <Th label="Next action" />}
              {show('activity') && <Th label="Last activity" col="activity" />}
              {show('notes') && <Th label="Notes" />}
              {show('accounting') && <Th label="Accounting" />}
              {isLostView && <Th label="Lost reason" />}
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>{buildRows()}</tbody>
        </table>
      </div>
      {undoToast && (
        <UndoToast
          message="Lead deleted"
          onUndo={handleUndo}
          onDismiss={() => { clearTimeout(undoRef.current); setUndoToast(null); }}
        />
      )}
    </>
  );
}