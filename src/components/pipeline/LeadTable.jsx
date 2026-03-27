import React, { useState } from 'react';
import { format } from 'date-fns';
import StageBadge from './Stagebadge';
import PlanBadge from './PlanBadge';
import InlineCell from '@/components/shared/InlineCell';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Trash2, Check, X } from 'lucide-react';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];
const PLANS = ['Starter', 'Professional', 'Business'];

function fmt(n) {
  return '£' + Math.round(n || 0).toLocaleString('en-GB');
}

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

export default function LeadTable({ leads, onDelete, onProposal, onUpdateField, newLeadId }) {
  const [sortCol, setSortCol] = useState('stage');
  const [sortDir, setSortDir] = useState('asc');
  const [deletingId, setDeletingId] = useState(null);

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const save = (id, field) => async (value) => {
    await onUpdateField(id, field, value);
  };

  const sorted = [...leads].sort((a, b) => {
    // new leads always float to top
    if (a.id === newLeadId) return -1;
    if (b.id === newLeadId) return 1;
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

  const Th = ({ label, col }) => (
    <th
      className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] cursor-pointer select-none hover:text-navy transition-colors"
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
          {sorted.map((lead, i) => {
            const isNew = lead.id === newLeadId;
            return (
              <tr
                key={lead.id}
                className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors ${isNew ? 'bg-blue-50/40' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
              >
                {/* Company + Contact */}
                <td className="px-4 py-3 min-w-[160px]">
                  <InlineCell
                    value={lead.companyName}
                    onSave={save(lead.id, 'companyName')}
                    placeholder="Company name"
                    autoEdit={isNew}
                    className="font-semibold text-navy text-sm"
                  />
                  <InlineCell
                    value={lead.contactName}
                    onSave={save(lead.id, 'contactName')}
                    placeholder="Contact name"
                    className="text-xs text-ew-muted mt-0.5"
                  />
                </td>

                {/* Plan */}
                <td className="px-4 py-3 min-w-[110px]">
                  <InlineCell
                    value={lead.plan}
                    onSave={save(lead.id, 'plan')}
                    type="select"
                    options={PLANS}
                    displayEl={lead.plan ? <PlanBadge plan={lead.plan} /> : null}
                    placeholder="Set plan"
                  />
                </td>

                {/* Deal value */}
                <td className="px-4 py-3 min-w-[110px]">
                  <InlineCell
                    value={lead.dealValueMonthly}
                    onSave={save(lead.id, 'dealValueMonthly')}
                    type="number"
                    displayEl={
                      <div>
                        <p className="font-semibold text-navy">{fmt(lead.dealValueMonthly)}/mo</p>
                        <p className="text-xs text-ew-muted">{fmt((lead.dealValueMonthly || 0) * 12)}/yr</p>
                      </div>
                    }
                    placeholder="Set value"
                  />
                </td>

                {/* Stage */}
                <td className="px-4 py-3 min-w-[140px]">
                  <InlineCell
                    value={lead.stage}
                    onSave={save(lead.id, 'stage')}
                    type="select"
                    options={STAGE_ORDER}
                    displayEl={lead.stage ? <StageBadge stage={lead.stage} /> : null}
                    placeholder="Set stage"
                  />
                </td>

                {/* Next action */}
                <td className="px-4 py-3 max-w-[180px]">
                  <InlineCell
                    value={lead.nextAction}
                    onSave={save(lead.id, 'nextAction')}
                    placeholder="Add action…"
                    className="text-ew-body text-sm"
                  />
                </td>

                {/* Last activity — read-only display */}
                <td className="px-4 py-3 min-w-[120px]">
                  <span className="text-sm text-ew-muted">{relativeDate(lead.lastActivity)}</span>
                </td>

                {/* Notes — inline textarea */}
                <td className="px-4 py-3 max-w-[180px]">
                  <InlineCell
                    value={lead.notes}
                    onSave={save(lead.id, 'notes')}
                    type="textarea"
                    placeholder="Add notes…"
                    displayEl={
                      lead.notes
                        ? <p className="text-sm text-ew-body truncate max-w-[160px]" title={lead.notes}>{lead.notes}</p>
                        : null
                    }
                  />
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
                        <button onClick={() => { onDelete(lead.id); setDeletingId(null); }} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors" title="Confirm delete">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => setDeletingId(null)} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors" title="Cancel">
                          <X className="w-3.5 h-3.5" />
                        </button>
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
          })}
        </tbody>
      </table>
    </div>
  );
}