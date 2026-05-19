import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, startOfMonth, endOfMonth } from 'date-fns';
import { ChevronDown, ChevronRight, Pencil, RefreshCw, X, User, Trash2, Info } from 'lucide-react';
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

const CHURN_REASONS = ['Price', 'Product gaps', 'No longer running events', 'Went to competitor', 'No engagement', 'Other'];

function RenewalBadge({ date }) {
  if (!date) return null;
  const diff = differenceInDays(new Date(date), new Date());
  if (diff < 0) return <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-600">Renewal overdue</span>;
  if (diff <= 60) return <span className="ml-1.5 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Renewing soon</span>;
  return null;
}

function BackdatedChip() {
  const [tip, setTip] = useState(false);
  return (
    <span className="relative inline-flex items-center gap-0.5">
      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Backdated</span>
      <button onMouseEnter={() => setTip(true)} onMouseLeave={() => setTip(false)} className="text-gray-400 hover:text-gray-600">
        <Info className="w-3 h-3" />
      </button>
      {tip && (
        <div className="absolute bottom-full left-0 mb-1 w-56 bg-gray-800 text-white text-xs rounded-lg p-2 z-50 leading-relaxed shadow-xl">
          This deal was added retroactively and is excluded from monthly growth calculations.
        </div>
      )}
    </span>
  );
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

// Churn modal with date, reason, notes
function ChurnModal({ deal, onClose, onChurned }) {
  const [churnDate, setChurnDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [churnReason, setChurnReason] = useState('');
  const [churnNotes, setChurnNotes] = useState('');
  const [saving, setSaving] = useState(false);

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 bg-white';
  const labelCls = 'block text-xs font-medium text-ew-body mb-1';

  const handleConfirm = async () => {
    if (!churnReason) return;
    setSaving(true);
    const updates = { status: 'Churned', churnDate, churnReason, churnNotes };
    await base44.entities.Deal.update(deal.id, updates);
    if (deal.clientId) {
      await base44.entities.Client.update(deal.clientId, { status: 'Churn' });
    }
    onChurned({ ...deal, ...updates });
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-navy mb-1">Mark as churned</h3>
        <p className="text-sm text-ew-body mb-5">Recording churn details for <strong>{deal.clientName}</strong>.</p>
        <div className="space-y-3">
          <div>
            <label className={labelCls}>Churn date *</label>
            <input type="date" className={inputCls} value={churnDate} onChange={e => setChurnDate(e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Churn reason *</label>
            <select className={inputCls} value={churnReason} onChange={e => setChurnReason(e.target.value)}>
              <option value="">— Select a reason —</option>
              {CHURN_REASONS.map(r => <option key={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label className={labelCls}>Additional notes (optional)</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={churnNotes} onChange={e => setChurnNotes(e.target.value)} placeholder="Any additional context about why this client churned…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleConfirm} disabled={saving || !churnReason} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40 transition-colors">
            {saving ? 'Saving…' : 'Confirm churn'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Deals({ onRenewalProposal, onViewClient, onNavigate }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [filter, setFilter] = useState('Active');
  const [selectedDeal, setSelectedDeal] = useState(null);

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

  const handleChurned = (updated) => {
    setDeals(prev => prev.map(d => d.id === updated.id ? updated : d));
    if (selectedDeal?.id === updated.id) setSelectedDeal(updated);
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

  const activeDeals = deals.filter(d => d.status === 'Active' || d.status === 'Up for Renewal');
  const churnedDeals = deals.filter(d => d.status === 'Churned');
  const displayDeals = filter === 'Churned' ? churnedDeals : activeDeals;

  const mrr = activeDeals.reduce((s, d) => s + (d.monthlyValue || 0), 0);
  const arr = mrr * 12;
  const renewingSoon = activeDeals.filter(d => {
    if (!d.subscriptionEndDate) return false;
    return differenceInDays(new Date(d.subscriptionEndDate), new Date()) <= 60;
  }).length;

  // Accounting margin across active deals with accounting fees
  const acctDeals = activeDeals.filter(d =>
    d.accountingService === 'Separate fee' || d.accountingService === 'Included in accounting service fee'
  );
  const totalAcctRevenue = acctDeals.reduce((s, d) => s + (d.accountingServiceFee || 0), 0);
  const totalAcctCost = acctDeals.reduce((s, d) => s + (d.accountingCost || 0), 0);
  const acctMargin = totalAcctRevenue - totalAcctCost;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Deals</h1>
        <p className="text-ew-muted text-sm mt-0.5">All client subscription deals</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-4 mb-6">
        {[
          { label: 'Total active deals', value: activeDeals.length },
          { label: 'Total MRR', value: fmt(mrr) },
          { label: 'Total ARR', value: fmt(arr) },
          { label: 'Renewals in 60 days', value: renewingSoon },
          { label: 'Accounting margin /mo', value: totalAcctRevenue > 0 ? fmt(acctMargin) : '—', sub: totalAcctRevenue > 0 ? `Rev: ${fmt(totalAcctRevenue)} · Cost: ${fmt(totalAcctCost)}` : 'No accounting deals' },
        ].map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-5">
            <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-navy">{c.value}</p>
            {c.sub && <p className="text-[11px] text-ew-muted mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>

      {/* Filter tabs */}
      <div className="flex items-center gap-1.5 mb-4">
        {['Active', 'Churned'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${filter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
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
                {['Client', 'Plan', 'Monthly', 'Annual ▾', 'Year 1 total', 'Accounting service', 'Start date', 'End date', 'Status'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
                {filter === 'Churned' && ['Churn date', 'Churn reason', 'Churn notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {displayDeals.map((deal, i) => (
                <React.Fragment key={deal.id}>
                  <tr className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors cursor-pointer ${selectedDeal?.id === deal.id ? 'bg-[#F3E8FF] border-l-2 border-l-[#8403C5]' : expanded === deal.id ? 'bg-navy/[0.02]' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                    onClick={() => setSelectedDeal(deal)}>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex flex-col gap-0.5">
                        <InlineCell value={deal.clientName} onSave={save(deal.id, 'clientName')} className="font-semibold text-navy" />
                        {deal.backdated && <BackdatedChip />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <InlineCell value={deal.plan} onSave={save(deal.id, 'plan')} type="select" options={['Starter', 'Professional', 'Business']} className="text-ew-body" />
                    </td>
                    <td className="px-4 py-3 min-w-[100px]">
                      <InlineCell value={deal.monthlyValue} onSave={save(deal.id, 'monthlyValue')} type="number" displayEl={<span className="font-semibold text-navy">{fmt(deal.monthlyValue)}</span>} placeholder="Set value" />
                    </td>
                    <td className="px-4 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setExpanded(prev => prev === deal.id ? null : deal.id)} className="flex items-center gap-1 font-semibold text-navy hover:text-navy/70 transition-colors">
                        {fmt(deal.annualValue || (deal.monthlyValue || 0) * 12)}
                        {expanded === deal.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <InlineCell value={deal.totalFirstYearValue} readOnly displayEl={<span className="font-semibold text-navy">{fmt(deal.totalFirstYearValue)}</span>} />
                    </td>
                    <td className="px-4 py-3 min-w-[160px]">
                      <span className="text-xs text-ew-body">{deal.accountingService || (deal.accountingServiceIncluded ? 'Included' : 'Not included')}</span>
                      {deal.accountingService === 'Separate fee' && deal.accountingServiceFee > 0 && (
                        <p className="text-xs text-ew-muted">{fmt(deal.accountingServiceFee)}/mo</p>
                      )}
                    </td>
                    <td className="px-4 py-3 min-w-[110px]">
                      <InlineCell value={deal.subscriptionStartDate || ''} onSave={save(deal.id, 'subscriptionStartDate')} type="date" displayEl={<span className="text-ew-body">{fmtDate(deal.subscriptionStartDate)}</span>} placeholder="Set date" />
                    </td>
                    <td className="px-4 py-3 min-w-[130px]">
                      <InlineCell value={deal.subscriptionEndDate || ''} onSave={save(deal.id, 'subscriptionEndDate')} type="date"
                        displayEl={<span><span className="text-ew-body">{fmtDate(deal.subscriptionEndDate)}</span><RenewalBadge date={deal.subscriptionEndDate} /></span>}
                        placeholder="Set date" />
                    </td>
                    <td className="px-4 py-3">
                      <InlineCell value={deal.status} onSave={save(deal.id, 'status')} type="select" options={['Active', 'Up for Renewal', 'Churned']}
                        displayEl={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>} />
                    </td>
                    {filter === 'Churned' && (
                      <>
                        <td className="px-4 py-3 text-sm text-ew-body whitespace-nowrap">{fmtDate(deal.churnDate)}</td>
                        <td className="px-4 py-3 text-sm text-ew-body whitespace-nowrap">{deal.churnReason || '—'}</td>
                        <td className="px-4 py-3 text-xs text-ew-muted max-w-[180px] truncate">{deal.churnNotes || '—'}</td>
                      </>
                    )}
                    <td className="px-4 py-3 min-w-[130px]" onClick={e => e.stopPropagation()}>
                      <div className="flex items-center gap-0.5">
                        <IconBtn icon={Pencil} label="View / Edit deal" onClick={() => setEditDeal(deal)} className="text-ew-muted hover:text-navy hover:bg-ew-bg" />
                        {isRenewable(deal) && (
                          <IconBtn icon={RefreshCw} label="Renew deal" onClick={() => setRenewDeal(deal)} className="text-amber-500 hover:text-amber-700 hover:bg-amber-50" />
                        )}
                        {deal.status !== 'Churned' && (
                          <IconBtn icon={X} label="Mark as churned" onClick={() => setChurnConfirm(deal)} className="text-ew-muted hover:text-red-600 hover:bg-red-50" />
                        )}
                        {onViewClient && (
                          <IconBtn icon={User} label="View client record" onClick={() => onViewClient(deal.clientId)} className="text-ew-muted hover:text-navy hover:bg-ew-bg" />
                        )}
                        <IconBtn icon={Trash2} label="Delete deal" onClick={() => setDeleteConfirm(deal)} className="text-ew-muted hover:text-red-500 hover:bg-red-50" />
                      </div>
                    </td>
                  </tr>
                  {expanded === deal.id && (
                    <tr className="border-b border-ew-border bg-navy/[0.01]" onClick={e => e.stopPropagation()}>
                      <td colSpan={filter === 'Churned' ? 13 : 10} className="px-4 pb-3"><ValueBreakdown deal={deal} /></td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
              {displayDeals.length === 0 && (
                <tr>
                  <td colSpan={filter === 'Churned' ? 13 : 10} className="px-4 py-16 text-center">
                    <div className="text-4xl mb-3">🤝</div>
                    <p className="text-sm text-[#6B7280]">{filter === 'Churned' ? 'No churned deals.' : 'No deals yet. Close your first lead to get started.'}</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {editDeal && <DealEditModal deal={editDeal} onClose={() => setEditDeal(null)} onSaved={handleSaved} />}
      {renewDeal && <RenewModal deal={renewDeal} onClose={() => setRenewDeal(null)} onRenewed={handleSaved} />}
      {churnConfirm && <ChurnModal deal={churnConfirm} onClose={() => setChurnConfirm(null)} onChurned={handleChurned} />}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete deal?</h3>
            <p className="text-sm text-ew-body mb-5">This will permanently delete the deal record for <strong>{deleteConfirm.clientName}</strong>. Only delete test or incorrect entries.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {selectedDeal && (
        <DealDetailPanel
          deal={selectedDeal}
          onClose={() => setSelectedDeal(null)}
          onUpdated={handleSaved}
          onDelete={(id) => { setDeals(prev => prev.filter(d => d.id !== id)); setSelectedDeal(null); }}
          onNavigate={onNavigate}
          onChurn={(deal) => setChurnConfirm(deal)}
        />
      )}
    </div>
  );
}