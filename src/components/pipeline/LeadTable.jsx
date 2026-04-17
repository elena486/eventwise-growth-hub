import React, { useState } from 'react';
import { format } from 'date-fns';
import StageBadge from './Stagebadge';
import PlanBadge from './PlanBadge';
import InlineCell from '@/components/shared/InlineCell';
import { ChevronUp, ChevronDown, ChevronsUpDown, FileText, Trash2, Check, X, Pencil } from 'lucide-react';

const STAGE_ORDER = ['Contacted', 'Discovery Call', 'Proposal Sent', 'In Negotiation', 'Closed Won', 'Closed Lost'];
const PLANS = ['Starter', 'Professional', 'Business'];
const OWNERS = ['Chris', 'Ramesh', 'Elena', 'George'];

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

// Inline next-action editor cell
function NextActionCell({ value, onSave }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');

  const startEdit = () => { setDraft(value || ''); setEditing(true); };
  const commit = async () => { setEditing(false); await onSave(draft); };
  const clear = async () => { setEditing(false); await onSave(''); };

  if (editing) {
    return (
      <div className="flex items-center gap-1 min-w-[160px]">
        <input
          autoFocus
          className="flex-1 text-xs border border-navy/30 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white"
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') setEditing(false); }}
        />
        <button onClick={commit} className="p-1 text-emerald-600 hover:bg-emerald-50 rounded transition-colors"><Check className="w-3.5 h-3.5" /></button>
        <button onClick={() => setEditing(false)} className="p-1 text-ew-muted hover:bg-ew-bg rounded transition-colors"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  if (value) {
    return (
      <div className="group flex items-start gap-1 max-w-[180px]">
        <p className="text-sm text-ew-body flex-1 truncate" title={value}>{value}</p>
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={startEdit} className="p-0.5 text-ew-muted hover:text-navy rounded transition-colors"><Pencil className="w-3 h-3" /></button>
          <button onClick={clear} className="p-0.5 text-ew-muted hover:text-red-500 rounded transition-colors"><X className="w-3 h-3" /></button>
        </div>
      </div>
    );
  }

  return (
    <button
      onClick={startEdit}
      className="text-xs text-ew-muted italic hover:text-navy transition-colors"
    >
      Add action…
    </button>
  );
}

const OWNER_COLORS = {
  Chris: 'bg-blue-100 text-blue-700',
  Ramesh: 'bg-purple-100 text-purple-700',
  Elena: 'bg-emerald-100 text-emerald-700',
  George: 'bg-amber-100 text-amber-700',
};

function SectionHeader({ label }) {
  return (
    <tr>
      <td colSpan={9} className="px-4 py-2 bg-[#F0F4FF] border-y border-[#DDE3F5]">
        <span className="text-[11px] font-bold text-[#4B5DA8] uppercase tracking-[0.15em]">{label}</span>
      </td>
    </tr>
  );
}

export default function LeadTable({ leads, onDelete, onProposal, onUpdateField, newLeadId, showOwnerSections }) {
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

  const sortLeads = (arr) => [...arr].sort((a, b) => {
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

  const renderRow = (lead, i) => {
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

        {/* Lead Owner */}
        <td className="px-4 py-3 min-w-[100px]">
          <InlineCell
            value={lead.leadOwner}
            onSave={save(lead.id, 'leadOwner')}
            type="select"
            options={OWNERS}
            displayEl={lead.leadOwner
              ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${OWNER_COLORS[lead.leadOwner] || 'bg-gray-100 text-gray-600'}`}>{lead.leadOwner}</span>
              : <span className="text-xs text-ew-muted italic">Unassigned</span>
            }
            placeholder="Assign"
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
        <td className="px-4 py-3 min-w-[160px]">
          <NextActionCell value={lead.nextAction} onSave={save(lead.id, 'nextAction')} />
        </td>

        {/* Last activity */}
        <td className="px-4 py-3 min-w-[120px]">
          <span className="text-sm text-ew-muted">{relativeDate(lead.lastActivity)}</span>
        </td>

        {/* Notes */}
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
  };

  // When showing all leads, split into Ramesh vs others with a section header
  const buildRows = () => {
    if (!showOwnerSections) {
      return sortLeads(leads).map((lead, i) => renderRow(lead, i));
    }

    const others = sortLeads(leads.filter(l => l.leadOwner !== 'Ramesh'));
    const ramesh = sortLeads(leads.filter(l => l.leadOwner === 'Ramesh'));

    const rows = [];
    others.forEach((lead, i) => rows.push(renderRow(lead, i)));

    if (ramesh.length > 0) {
      rows.push(<SectionHeader key="ramesh-header" label="Ramesh's Leads" />);
      ramesh.forEach((lead, i) => rows.push(renderRow(lead, i)));
    }

    return rows;
  };

  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="bg-ew-footer border-b border-ew-border">
          <tr>
            <Th label="Company" col="company" />
            <Th label="Owner" />
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
          {buildRows()}
        </tbody>
      </table>
    </div>
  );
}