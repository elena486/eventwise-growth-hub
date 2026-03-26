import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import StageBadge from './Stagebadge';
import PlanBadge from './PlanBadge';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Trash2, Check, X } from 'lucide-react';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];
const PLANS = ['Starter', 'Professional', 'Business'];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function relativeDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr + 'T00:00:00'), { addSuffix: true });
  } catch { return dateStr; }
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-ew-muted-light inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 text-navy inline" />
    : <ChevronDown className="w-3 h-3 ml-1 text-navy inline" />;
}

const inputCls = "w-full text-sm border border-navy/30 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy bg-white";
const selectCls = "w-full text-sm border border-navy/30 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy bg-white";

export default function LeadTable({ leads, onDelete, onProposal, onUpdateField, onOpenNotes }) {
  const [sortCol, setSortCol] = useState('stage');
  const [sortDir, setSortDir] = useState('asc');
  const [editing, setEditing] = useState(null); // { id, field }
  const [draft, setDraft] = useState('');
  const [deletingId, setDeletingId] = useState(null);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const startEdit = (lead, field) => {
    setEditing({ id: lead.id, field });
    setDraft(lead[field] ?? '');
  };

  const commitEdit = (id, field) => {
    onUpdateField(id, field, draft);
    setEditing(null);
  };

  const cancelEdit = () => setEditing(null);

  const isEditing = (id, field) => editing?.id === id && editing?.field === field;

  const sorted = [...leads].sort((a, b) => {
    let av, bv;
    if (sortCol === 'stage') { av = STAGE_ORDER.indexOf(a.stage); bv = STAGE_ORDER.indexOf(b.stage); }
    else if (sortCol === 'company') { av = a.companyName?.toLowerCase() || ''; bv = b.companyName?.toLowerCase() || ''; }
    else if (sortCol === 'deal') { av = a.dealValueMonthly || 0; bv = b.dealValueMonthly || 0; }
    else if (sortCol === 'activity') { av = a.lastActivity || ''; bv = b.lastActivity || ''; }
    else { av = ''; bv = ''; }
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const Th = ({ label, col, className = '' }) => (
    <th
      className={`px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] cursor-pointer select-none hover:text-navy transition-colors ${className}`}
      onClick={() => col && handleSort(col)}
    >
      {label}{col && <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />}
    </th>
  );

  const EditableText = ({ lead, field, placeholder = 'Click to edit', className = '' }) => {
    if (isEditing(lead.id, field)) {
      return (
        <input
          className={inputCls}
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commitEdit(lead.id, field)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit(lead.id, field);
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      );
    }
    return (
      <p
        className={`cursor-pointer hover:text-navy transition-colors truncate ${className}`}
        onClick={() => startEdit(lead, field)}
      >
        {lead[field] || <span className="text-ew-muted-light italic">{placeholder}</span>}
      </p>
    );
  };

  const EditableNumber = ({ lead, field }) => {
    if (isEditing(lead.id, field)) {
      return (
        <input
          className={inputCls}
          type="number"
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => { onUpdateField(lead.id, field, parseFloat(draft) || 0); setEditing(null); }}
          onKeyDown={e => {
            if (e.key === 'Enter') { onUpdateField(lead.id, field, parseFloat(draft) || 0); setEditing(null); }
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      );
    }
    return (
      <div className="cursor-pointer" onClick={() => startEdit(lead, field)}>
        <p className="font-semibold text-navy hover:text-navy/70 transition-colors">{fmt(lead[field])}/mo</p>
        <p className="text-xs text-ew-muted mt-0.5">{fmt((lead[field] || 0) * 12)}/yr</p>
      </div>
    );
  };

  const EditableSelect = ({ lead, field, options }) => {
    if (isEditing(lead.id, field)) {
      return (
        <select
          className={selectCls}
          value={draft}
          autoFocus
          onChange={e => { onUpdateField(lead.id, field, e.target.value); setEditing(null); }}
          onBlur={() => setEditing(null)}
          onKeyDown={e => { if (e.key === 'Escape') cancelEdit(); }}
        >
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      );
    }
    return (
      <div className="cursor-pointer" onClick={() => startEdit(lead, field)}>
        {field === 'stage' ? <StageBadge stage={lead[field]} /> : <PlanBadge plan={lead[field]} />}
      </div>
    );
  };

  const EditableDate = ({ lead, field }) => {
    if (isEditing(lead.id, field)) {
      return (
        <input
          className={inputCls}
          type="date"
          value={draft}
          autoFocus
          onChange={e => setDraft(e.target.value)}
          onBlur={() => commitEdit(lead.id, field)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitEdit(lead.id, field);
            if (e.key === 'Escape') cancelEdit();
          }}
        />
      );
    }
    return (
      <p
        className="text-sm text-ew-body cursor-pointer hover:text-navy transition-colors"
        onClick={() => startEdit(lead, field)}
      >
        {relativeDate(lead[field])}
      </p>
    );
  };

  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-ew-footer border-b border-ew-border">
          <tr>
            <Th label="Company" col="company" />
            <Th label="Plan" />
            <Th label="Deal value" col="deal" />
            <Th label="Stage" col="stage" />
            <Th label="Next action" />
            <Th label="Last activity" col="activity" />
            <Th label="Notes" />
            <Th label="" />
          </tr>
        </thead>
        <tbody>
          {sorted.map((lead, i) => (
            <tr
              key={lead.id}
              className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
            >
              {/* Company */}
              <td className="px-4 py-3 min-w-[140px]">
                <EditableText lead={lead} field="companyName" placeholder="Company name" className="font-semibold text-navy text-sm" />
                <EditableText lead={lead} field="contactName" placeholder="Contact name" className="text-xs text-ew-muted mt-0.5" />
              </td>

              {/* Plan */}
              <td className="px-4 py-3 min-w-[110px]">
                <EditableSelect lead={lead} field="plan" options={PLANS} />
              </td>

              {/* Deal value */}
              <td className="px-4 py-3 min-w-[110px]">
                <EditableNumber lead={lead} field="dealValueMonthly" />
              </td>

              {/* Stage */}
              <td className="px-4 py-3 min-w-[130px]">
                <EditableSelect lead={lead} field="stage" options={STAGE_ORDER} />
              </td>

              {/* Next action */}
              <td className="px-4 py-3 max-w-[160px]">
                <EditableText lead={lead} field="nextAction" placeholder="Add action…" className="text-ew-body text-sm" />
              </td>

              {/* Last activity */}
              <td className="px-4 py-3 min-w-[120px]">
                <p className="text-sm text-ew-body">{relativeDate(lead.lastActivity)}</p>
              </td>

              {/* Notes */}
              <td className="px-4 py-3 max-w-[160px]">
                <p
                  className="text-sm text-ew-body truncate cursor-pointer hover:text-navy transition-colors"
                  title={lead.notes || 'Click to add notes'}
                  onClick={() => onOpenNotes(lead)}
                >
                  {lead.notes || <span className="text-ew-muted-light italic">Add notes…</span>}
                </p>
              </td>

              {/* Actions */}
              <td className="px-4 py-3">
                <div className="flex items-center gap-1.5 justify-end">
                  <button
                    onClick={() => onProposal(lead)}
                    className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-navy bg-navy-tint hover:bg-navy hover:text-white rounded-lg transition-colors whitespace-nowrap"
                  >
                    <FileText className="w-3 h-3" />
                    Proposal
                  </button>
                  {deletingId === lead.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => { onDelete(lead.id); setDeletingId(null); }}
                        className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                        title="Confirm delete"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeletingId(null)}
                        className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors"
                        title="Cancel"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeletingId(lead.id)}
                      className="p-1.5 text-ew-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}