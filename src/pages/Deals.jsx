import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { ChevronDown, ChevronRight, Pencil, RefreshCw, X, User, Trash2 } from 'lucide-react';
import InlineCell from '@/components/shared/InlineCell';
import DealEditModal from '@/components/deals/DealEditModal';
import RenewModal from '@/components/deals/RenewModal';
import DealDetailPanel from '@/components/deals/DealDetailPanel';

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

function IconBtn({ icon: Icon, label, onClick, className = '' }) {
  return (
    <button
      title={label}
      onClick={e => { e.stopPropagation(); onClick(); }}
      className={`p-1.5 rounded-lg transition-colors opacity-0 group-hover:opacity-100 ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
    </button>
  );
}

export default function Deals({ onRenewalProposal, onViewClient, onNavigate }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('Active');
  const [selectedDeal, setSelectedDeal] = useState(null);

  // Modals
  const [editDeal, setEditDeal] = useState(null);
  const [renewDeal, setRenewDeal] = useState(null);
  const [churnConfirm, setChurnConfirm] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    const data = await base44.entities.Deal.list('-created_date');
    setDeals(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdateField = async (id, field, value) => {
    const deal = deals.find(d => d.id === id);
    const updates = { [field]: value };
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

  const handleChurn = async (id) => {
    await base44.entities.Deal.update(id, { status: 'Churned' });
    setDeals(prev => prev.map(d => d.id === id ? { ...d, status: 'Churned' } : d));
    setChurnConfirm(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Deal.delete(id);
    setDeals(prev => prev.filter(d => d.id !== id));
    setDeleteConfirm(null);
  };

  const handleSaved = (updated) => {
    setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (selectedDeal?.id === updated.id) setSelectedDeal(updated);
  };

  const save = (id, field) => (value) => handleUpdateField(id, field, value);

  const isRenewable = (deal) => {
    if (!deal.subscriptionEndDate) return false;
    return differenceInDays(new Date(deal.subscriptionEndDate), new Date()) <= 90;
  };

  // Filter tabs
  const activeDeals = deals.filter(d => d.status === 'Active' || d.status === 'Up for Renewal');
  const churnedDeals = deals.filter(d => d.status === 'Churned');
  const displayDeals = filter === 'Churned' ? churnedDeals : activeDeals;

  const mrr = activeDeals.reduce((s, d) => s + (d.monthlyValue || 0), 0);
  const arr = mrr * 12;
  const renewingSoon = activeDeals.filter(d => {
    if (!d.subscriptionEndDate) return false;
    return differenceInDays(new Date(d.subscriptionEndDate), new Date()) <= 60;
  }).length;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Deals</h1>
        <p className="text-ew-muted text-sm mt-0.5">All client subscription deals</p>
      </div>

      {/* Stats — always based on active deals */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total active deals', value: activeDeals.length },
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

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4">
        {['Active', 'Churned'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${filter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}
          >
            {f} {f === 'Churned' && churnedDeals.length > 0 && <span className="ml-1 text-xs opacity-70">({churnedDeals.length})</span>}
          </button>
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
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Accounting service</th>
                {['Start date', 'End date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {displayDeals.map((deal, i) => (
                <React.Fragment key={deal.id}>
                  <tr className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors cursor-pointer ${selectedDeal?.id === deal.id ? 'bg-[#F3E8FF] border-l-2 border-l-[#8403C5]' : expanded === deal.id ? 'bg-navy/[0.02]' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                    onClick={() => setSelectedDeal(deal)}>
                    {/* Client */}
                    <td className="px-4 py-3 min-w-[140px]">
                      <InlineCell value={deal.clientName} onSave={save(deal.id, 'clientName')} className="font-semibold text-navy" />
                    </td>
                    {/* Plan */}
                    <td className="px-4 py-3">
                      <InlineCell value={deal.plan} onSave={save(deal.id, 'plan')} type="select" options={['Starter', 'Professional', 'Business']} className="text-ew-body" />
                    </td>
                    {/* Monthly */}
                    <td className="px-4 py-3 min-w-[100px]">
                      <InlineCell value={deal.monthlyValue} onSave={save(deal.id, 'monthlyValue')} type="number" displayEl={<span className="font-semibold text-navy">{fmt(deal.monthlyValue)}</span>} placeholder="Set value" />
                    </td>
                    {/* Annual expandable */}
                    <td className="px-4 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setExpanded(prev => prev === deal.id ? null : deal.id)} className="flex items-center gap-1 font-semibold text-navy hover:text-navy/70 transition-colors">
                        {fmt(deal.annualValue || (deal.monthlyValue || 0) * 12)}
                        {expanded === deal.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    {/* Year 1 */}
                    <td className="px-4 py-3">
                      <InlineCell value={deal.totalFirstYearValue} readOnly displayEl={<span className="font-semibold text-navy">{fmt(deal.totalFirstYearValue)}</span>} />
                    </td>
                    {/* Accounting */}
                    <td className="px-4 py-3 min-w-[160px]">
                      <span className="text-xs text-ew-body">{deal.accountingService || (deal.accountingServiceIncluded ? 'Included' : 'Not included')}</span>
                      {deal.accountingService === 'Separate fee' && deal.accountingServiceFee > 0 && (
                        <p className="text-xs text-ew-muted">{fmt(deal.accountingServiceFee)}/mo</p>
                      )}
                    </td>
                    {/* Start date */}
                    <td className="px-4 py-3 min-w-[110px]">
                      <InlineCell value={deal.subscriptionStartDate || ''} onSave={save(deal.id, 'subscriptionStartDate')} type="date" displayEl={<span className="text-ew-body">{fmtDate(deal.subscriptionStartDate)}</span>} placeholder="Set date" />
                    </td>
                    {/* End date */}
                    <td className="px-4 py-3 min-w-[130px]">
                      <InlineCell value={deal.subscriptionEndDate || ''} onSave={save(deal.id, 'subscriptionEndDate')} type="date"
                        displayEl={<span><span className="text-ew-body">{fmtDate(deal.subscriptionEndDate)}</span><RenewalBadge date={deal.subscriptionEndDate} /></span>}
                        placeholder="Set date"
                      />
                    </td>
                    {/* Status */}
                    <td className="px-4 py-3">
                      <InlineCell value={deal.status} onSave={save(deal.id, 'status')} type="select" options={['Active', 'Up for Renewal', 'Churned']}
                        displayEl={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>}
                      />
                    </td>
                    {/* Actions */}
                    <td className="px-4 py-3 min-w-[130px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        {/* Edit */}
                        <IconBtn icon={Pencil} label="View / Edit deal" onClick={() => setEditDeal(deal)} className="text-ew-muted hover:text-navy hover:bg-ew-bg" />
                        {/* Renew — only within 90 days */}
                        {isRenewable(deal) && (
                          <IconBtn icon={RefreshCw} label="Renew deal" onClick={() => setRenewDeal(deal)} className="text-amber-500 hover:text-amber-700 hover:bg-amber-50" />
                        )}
                        {/* Mark churned — only for non-churned */}
                        {deal.status !== 'Churned' && (
                          <IconBtn icon={X} label="Mark as churned" onClick={() => setChurnConfirm(deal)} className="text-ew-muted hover:text-red-600 hover:bg-red-50" />
                        )}
                        {/* View client */}
                        {onViewClient && (
                          <IconBtn icon={User} label="View client record" onClick={() => onViewClient(deal.clientId)} className="text-ew-muted hover:text-navy hover:bg-ew-bg" />
                        )}
                        {/* Delete */}
                        <IconBtn icon={Trash2} label="Delete deal" onClick={() => setDeleteConfirm(deal)} className="text-ew-muted hover:text-red-500 hover:bg-red-50" />
                      </div>
                    </td>
                  </tr>
                  {expanded === deal.id && (
                    <tr className="border-b border-ew-border bg-navy/[0.01]" onClick={e => e.stopPropagation()}>
                      <td colSpan={10} className="px-4 pb-3"><ValueBreakdown deal={deal} /></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {displayDeals.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-12 text-center text-ew-muted text-sm">
                  {filter === 'Churned' ? 'No churned deals.' : 'No deals yet. Convert a pipeline lead to create your first deal.'}
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editDeal && <DealEditModal deal={editDeal} onClose={() => setEditDeal(null)} onSaved={handleSaved} />}

      {/* Renew modal */}
      {renewDeal && <RenewModal deal={renewDeal} onClose={() => setRenewDeal(null)} onRenewed={handleSaved} />}

      {/* Churn confirm */}
      {churnConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setChurnConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Mark as churned?</h3>
            <p className="text-sm text-ew-body mb-5">Are you sure you want to mark <strong>{churnConfirm.clientName}</strong>'s deal as churned? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setChurnConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleChurn(churnConfirm.id)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Mark churned</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete deal?</h3>
            <p className="text-sm text-ew-body mb-5">This will permanently delete the deal record for <strong>{deleteConfirm.clientName}</strong>. Only delete test or incorrect entries.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Deal detail panel */}
      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={handleSaved}
          onDelete={(id) => {
            setDeals(prev => prev.filter(d => d.id !== id));
            setSelectedDeal(null);
          }}
          onNavigate={onNavigate}
        />
      )}
    </div>
  );
}