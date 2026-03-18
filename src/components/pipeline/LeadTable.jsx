import React, { useState } from 'react';
import { formatDistanceToNow, format } from 'date-fns';
import StageBadge from './Stagebadge';
import PlanBadge from './PlanBadge';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Pencil, Trash2 } from 'lucide-react';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

function relativeDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
  } catch { return dateStr; }
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown className="w-3 h-3 ml-1 text-ew-muted-light inline" />;
  return sortDir === 'asc'
    ? <ChevronUp className="w-3 h-3 ml-1 text-navy inline" />
    : <ChevronDown className="w-3 h-3 ml-1 text-navy inline" />;
}

export default function LeadTable({ leads, onEdit, onDelete, onProposal, onUpdateField, onOpenNotes }) {
  const [sortCol, setSortCol] = useState('stage');
  const [sortDir, setSortDir] = useState('asc');
  const [editingAction, setEditingAction] = useState(null);
  const [actionDraft, setActionDraft] = useState('');

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const sorted = [...leads].sort((a, b) => {
    let av, bv;
    if (sortCol === 'stage') {
      av = STAGE_ORDER.indexOf(a.stage);
      bv = STAGE_ORDER.indexOf(b.stage);
    } else if (sortCol === 'company') {
      av = a.companyName?.toLowerCase() || '';
      bv = b.companyName?.toLowerCase() || '';
    } else if (sortCol === 'deal') {
      av = a.dealValueMonthly || 0;
      bv = b.dealValueMonthly || 0;
    } else if (sortCol === 'activity') {
      av = a.lastActivity || '';
      bv = b.lastActivity || '';
    } else {
      av = ''; bv = '';
    }
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
              <td className="px-4 py-3">
                <p className="font-semibold text-navy text-sm">{lead.companyName}</p>
                {lead.contactName && <p className="text-xs text-ew-muted mt-0.5">{lead.contactName}</p>}
              </td>

              {/* Plan */}
              <td className="px-4 py-3">
                <PlanBadge plan={lead.plan} />
              </td>

              {/* Deal value */}
              <td className="px-4 py-3">
                <p className="font-semibold text-navy">{fmt(lead.dealValueMonthly)}/mo</p>
                <p className="text-xs text-ew-muted mt-0.5">{fmt((lead.dealValueMonthly || 0) * 12)}/yr</p>
              </td>

              {/* Stage */}
              <td className="px-4 py-3">
                <StageBadge stage={lead.stage} />
              </td>

              {/* Next action — inline edit */}
              <td className="px-4 py-3 max-w-[160px]">
                {editingAction === lead.id ? (
                  <input
                    className="w-full text-sm border border-ew-border rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-navy"
                    value={actionDraft}
                    autoFocus
                    onChange={e => setActionDraft(e.target.value)}
                    onBlur={() => { onUpdateField(lead.id, 'nextAction', actionDraft); setEditingAction(null); }}
                    onKeyDown={e => { if (e.key === 'Enter') { onUpdateField(lead.id, 'nextAction', actionDraft); setEditingAction(null); } if (e.key === 'Escape') setEditingAction(null); }}
                  />
                ) : (
                  <p
                    className="text-ew-body text-sm truncate cursor-pointer hover:text-navy"
                    title="Click to edit"
                    onClick={() => { setEditingAction(lead.id); setActionDraft(lead.nextAction || ''); }}
                  >
                    {lead.nextAction || <span className="text-ew-muted-light italic">Add action…</span>}
                  </p>
                )}
              </td>

              {/* Last activity */}
              <td className="px-4 py-3">
                <p
                  className="text-sm text-ew-body cursor-pointer hover:text-navy transition-colors"
                  title="Click to set today"
                  onClick={() => onUpdateField(lead.id, 'lastActivity', format(new Date(), 'yyyy-MM-dd'))}
                >
                  {relativeDate(lead.lastActivity)}
                </p>
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
                  <button
                    onClick={() => onEdit(lead)}
                    className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => { if (window.confirm(`Delete ${lead.companyName}?`)) onDelete(lead.id); }}
                    className="p-1.5 text-ew-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}