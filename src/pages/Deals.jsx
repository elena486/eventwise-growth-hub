import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';
import InlineCell from '@/components/shared/InlineCell';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Up for Renewal': 'bg-amber-50 text-amber-700',
  Churned: 'bg-red-50 text-red-600',
};

function RenewalBadge({ date }) {
  if (!date) return null;
  const diff = differenceInDays(new Date(date), new Date());
  if (diff < 0) return <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Renewal overdue</span>;
  if (diff <= 60) return <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Renewing soon</span>;
  return null;
}

function ValueBreakdown({ deal }) {
  const annual = deal.annualValue || (deal.monthlyValue || 0) * 12;
  const acctg = deal.accountingServiceIncluded ? (deal.accountingServiceValue || 0) : 0;
  const fee = deal.onboardingFee || 0;
  const total = deal.totalFirstYearValue || (annual + acctg + fee);
  const year2 = annual + acctg;
  return (
    <div className="mt-2 ml-2 p-3 bg-ew-bg rounded-lg border border-ew-border text-xs space-y-1.5">
      <div className="flex justify-between"><span className="text-ew-muted">Software</span><span className="font-medium text-navy">{fmt(deal.monthlyValue)}/mo · {fmt(annual)}/yr</span></div>
      <div className="flex justify-between"><span className="text-ew-muted">Accounting service</span><span className="font-medium text-navy">{deal.accountingServiceIncluded ? `${fmt(acctg)}/yr` : 'Not included'}</span></div>
      <div className="flex justify-between"><span className="text-ew-muted">Onboarding fee</span><span className="font-medium text-navy">{fee > 0 ? `${fmt(fee)} (one-off)` : '£0 (included)'}</span></div>
      <div className="flex justify-between border-t border-ew-border pt-1.5 mt-1.5"><span className="font-semibold text-navy">Total year one</span><span className="font-bold text-navy">{fmt(total)}</span></div>
      <div className="flex justify-between text-ew-muted"><span>Ongoing from year two</span><span className="font-medium">{fmt(year2)}/yr</span></div>
    </div>
  );
}

export default function Deals({ onRenewalProposal }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);

  useEffect(() => {
    base44.entities.Deal.list('-created_date').then(data => { setDeals(data); setLoading(false); });
  }, []);

  const handleUpdateField = async (id, field, value) => {
    const deal = deals.find(d => d.id === id);
    const updates = { [field]: value };

    // Recalculate derived fields
    const monthly = field === 'monthlyValue' ? (parseFloat(value) || 0) : (deal.monthlyValue || 0);
    const acctgVal = field === 'accountingServiceValue' ? (parseFloat(value) || 0) : (deal.accountingServiceValue || 0);
    const fee = field === 'onboardingFee' ? (parseFloat(value) || 0) : (deal.onboardingFee || 0);
    const included = field === 'accountingServiceIncluded' ? value : deal.accountingServiceIncluded;

    if (['monthlyValue', 'accountingServiceValue', 'onboardingFee', 'accountingServiceIncluded'].includes(field)) {
      updates.annualValue = monthly * 12;
      updates.totalFirstYearValue = (monthly * 12) + (included ? acctgVal : 0) + fee;
    }

    setDeals(prev => prev.map(d => d.id === id ? { ...d, ...updates } : d));
    await base44.entities.Deal.update(id, updates);
  };

  const save = (id, field) => (value) => handleUpdateField(id, field, value);

  const active = deals.filter(d => d.status === 'Active' || d.status === 'Up for Renewal');
  const mrr = active.reduce((s, d) => s + (d.monthlyValue || 0), 0);
  const arr = mrr * 12;
  const renewingSoon = active.filter(d => {
    if (!d.subscriptionEndDate) return false;
    const diff = differenceInDays(new Date(d.subscriptionEndDate), new Date());
    return diff >= 0 && diff <= 60;
  }).length;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Deals</h1>
        <p className="text-ew-muted text-sm mt-0.5">All client subscription deals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total active deals', value: active.length },
          { label: 'Total MRR', value: fmt(mrr) },
          { label: 'Total ARR', value: fmt(arr) },
          { label: 'Renewals in 60 days', value: renewingSoon },
        ].map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-5">
            <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-navy">{c.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['Client', 'Plan', 'Monthly', 'Annual ▾', 'Year 1 total'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">
                  <span className="group relative inline-flex items-center gap-1 cursor-help">
                    Includes Accounting Add-on?
                    <span className="absolute bottom-full left-0 mb-1.5 w-64 bg-navy text-white text-xs rounded-lg px-3 py-2 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 normal-case tracking-normal font-normal whitespace-normal">
                      Toggle on if this client has purchased the accounting integration as part of their plan.
                    </span>
                  </span>
                </th>
                {['Start date', 'End date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.map((deal, i) => (
                <React.Fragment key={deal.id}>
                  <tr className={`border-b border-ew-border hover:bg-navy/[0.02] transition-colors ${expanded === deal.id ? 'bg-navy/[0.02]' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    {/* Client name */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <InlineCell value={deal.clientName} onSave={save(deal.id, 'clientName')} className="font-semibold text-navy" />
                    </td>

                    {/* Plan */}
                    <td className="px-4 py-3">
                      <InlineCell
                        value={deal.plan}
                        onSave={save(deal.id, 'plan')}
                        type="select"
                        options={['Starter', 'Professional', 'Business']}
                        className="text-ew-body"
                      />
                    </td>

                    {/* Monthly — editable */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <InlineCell
                        value={deal.monthlyValue}
                        onSave={save(deal.id, 'monthlyValue')}
                        type="number"
                        displayEl={<span className="font-semibold text-navy">{fmt(deal.monthlyValue)}</span>}
                        placeholder="Set value"
                      />
                    </td>

                    {/* Annual — read-only, expandable */}
                    <td className="px-4 py-3 min-w-[110px]">
                      <button
                        onClick={() => setExpanded(prev => prev === deal.id ? null : deal.id)}
                        className="flex items-center gap-1 font-semibold text-navy hover:text-navy/70 transition-colors"
                      >
                        {fmt(deal.annualValue || (deal.monthlyValue || 0) * 12)}
                        {expanded === deal.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </td>

                    {/* Year 1 total — read-only */}
                    <td className="px-4 py-3">
                      <InlineCell
                        value={deal.totalFirstYearValue}
                        readOnly
                        displayEl={<span className="font-semibold text-navy">{fmt(deal.totalFirstYearValue)}</span>}
                      />
                    </td>

                    {/* Accounting service toggle */}
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <InlineCell
                          value={deal.accountingServiceIncluded}
                          onSave={save(deal.id, 'accountingServiceIncluded')}
                          type="boolean"
                        />
                        {deal.accountingServiceIncluded && (
                          <InlineCell
                            value={deal.accountingServiceValue}
                            onSave={save(deal.id, 'accountingServiceValue')}
                            type="number"
                            displayEl={<span className="text-xs text-ew-body">{fmt(deal.accountingServiceValue)}/yr</span>}
                            placeholder="Set value"
                          />
                        )}
                      </div>
                    </td>

                    {/* Start date */}
                    <td className="px-4 py-3 min-w-[110px]">
                      <InlineCell
                        value={deal.subscriptionStartDate || ''}
                        onSave={save(deal.id, 'subscriptionStartDate')}
                        type="date"
                        displayEl={<span className="text-ew-body">{fmtDate(deal.subscriptionStartDate)}</span>}
                        placeholder="Set date"
                      />
                    </td>

                    {/* End date */}
                    <td className="px-4 py-3 min-w-[130px]">
                      <InlineCell
                        value={deal.subscriptionEndDate || ''}
                        onSave={save(deal.id, 'subscriptionEndDate')}
                        type="date"
                        displayEl={
                          <span>
                            <span className="text-ew-body">{fmtDate(deal.subscriptionEndDate)}</span>
                            <RenewalBadge date={deal.subscriptionEndDate} />
                          </span>
                        }
                        placeholder="Set date"
                      />
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3">
                      <InlineCell
                        value={deal.status}
                        onSave={save(deal.id, 'status')}
                        type="select"
                        options={['Active', 'Up for Renewal', 'Churned']}
                        displayEl={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>}
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3">
                      {onRenewalProposal && (deal.status === 'Up for Renewal' || differenceInDays(new Date(deal.subscriptionEndDate || '9999-01-01'), new Date()) <= 60) && (
                        <button
                          onClick={() => onRenewalProposal({ companyName: deal.clientName, plan: (deal.plan || 'starter').toLowerCase() })}
                          className="text-xs px-2.5 py-1.5 font-medium text-navy border border-navy/20 bg-navy-tint rounded-lg hover:bg-navy hover:text-white transition-colors whitespace-nowrap"
                        >
                          Send renewal proposal
                        </button>
                      )}
                    </td>
                  </tr>
                  {expanded === deal.id && (
                    <tr className="border-b border-ew-border bg-navy/[0.01]">
                      <td colSpan={10} className="px-4 pb-3"><ValueBreakdown deal={deal} /></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {deals.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-ew-muted text-sm">No deals yet. Convert a pipeline lead to create your first deal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}