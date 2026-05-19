import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { X, Trash2, ExternalLink, Info } from 'lucide-react';

const PLAN_COLORS = {
  Starter: 'bg-blue-100 text-blue-700',
  Professional: 'bg-purple-100 text-purple-700',
  Business: 'bg-emerald-100 text-emerald-700',
};

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Up for Renewal': 'bg-amber-50 text-amber-700',
  Churned: 'bg-red-50 text-red-600',
};

const ACCT_OPTIONS = ['Not included', 'Included in plan', 'Included in accounting service fee', 'Separate fee'];
const ACCT_WITH_FEE = ['Included in accounting service fee', 'Separate fee'];
const DEAL_STATUSES = ['Active', 'At Risk', 'On Hold', 'Up for Renewal', 'Churned', 'Cancelled'];
const CS_OWNERS = ['Martinique Keeler', 'Chris Carter'];
const ONBOARDING_PKGS = ['Success Essential', 'Success Plus', 'Success Premium'];
const PLANS = ['Starter', 'Professional', 'Business'];

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function pct(a, b) {
  if (!b || b === 0) return '—';
  return Math.round(((a) / b) * 100) + '%';
}

const ic = 'w-full text-sm border border-[#E5E7EB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] bg-white transition-colors';
const labelCls = 'block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1';

function SectionTitle({ children }) {
  return <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.14em] mb-3 mt-5 first:mt-0">{children}</p>;
}

function EndDateField({ date }) {
  if (!date) return <span className="text-[#9CA3AF]">—</span>;
  const diff = differenceInDays(new Date(date), new Date());
  const cls = diff <= 30 ? 'text-red-600 font-semibold' : diff <= 60 ? 'text-amber-600 font-semibold' : 'text-[#374151]';
  return (
    <div>
      <span className={cls}>{fmtDate(date)}</span>
      <p className="text-xs text-[#9CA3AF] mt-0.5">{diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d remaining`}</p>
    </div>
  );
}

export default function DealDetailPanel({ deal: initialDeal, onClose, onUpdated, onDelete, onNavigate, onChurn }) {
  const [deal, setDeal] = useState(initialDeal);
  const [notes, setNotes] = useState(initialDeal.notes || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const notesTimer = useRef(null);
  const saveTimer = useRef(null);

  useEffect(() => {
    setDeal(initialDeal);
    setNotes(initialDeal.notes || '');
  }, [initialDeal.id]);

  const autoSave = useCallback((field, value) => {
    const updated = { ...deal, [field]: value };
    setDeal(updated);
    onUpdated(updated);
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      base44.entities.Deal.update(updated.id, { [field]: value });
    }, 500);
  }, [deal, onUpdated]);

  const handleNotesChange = (val) => {
    setNotes(val);
    clearTimeout(notesTimer.current);
    notesTimer.current = setTimeout(() => {
      base44.entities.Deal.update(deal.id, { notes: val });
      const updated = { ...deal, notes: val };
      setDeal(updated);
      onUpdated(updated);
    }, 800);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Deal.delete(deal.id);
    setDeleting(false);
    onDelete(deal.id);
    onClose();
  };

  const annual = (deal.monthlyValue || 0) * 12;

  // Accounting margin calcs
  const showAcctMargin = ACCT_WITH_FEE.includes(deal.accountingService);
  const acctFee = deal.accountingServiceFee || 0;
  const acctCost = deal.accountingCost || 0;
  const acctMarginGbp = acctFee - acctCost;
  const acctMarginPct = acctFee > 0 ? Math.round((acctMarginGbp / acctFee) * 100) : null;

  return (
    <div className="fixed inset-0 z-40 flex pointer-events-none">
      <div className="flex-1 pointer-events-auto" onClick={onClose} />
      <div className="w-[55%] h-full bg-white border-l border-[#E5E7EB] shadow-2xl flex flex-col pointer-events-auto overflow-hidden">
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[#E5E7EB] bg-white">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold text-[#111827] leading-tight">{deal.clientName}</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">Updated {deal.updated_date ? fmtDate(deal.updated_date) : '—'}</p>
            </div>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151] transition-colors shrink-0">
              <X className="w-5 h-5" />
            </button>
          </div>
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            {deal.plan && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${PLAN_COLORS[deal.plan] || 'bg-gray-100 text-gray-600'}`}>{deal.plan}</span>}
            {deal.status && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>}
            {deal.backdated && (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-500" title="This deal was added retroactively and is excluded from monthly growth calculations">
                Backdated
              </span>
            )}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          <SectionTitle>Deal Financials</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Plan</label>
              <select className={ic} value={deal.plan || ''} onChange={e => autoSave('plan', e.target.value)}>
                {PLANS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Monthly value (£)</label>
              <input type="number" className={ic} value={deal.monthlyValue || ''} onChange={e => autoSave('monthlyValue', parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Annual value</label>
              <p className="text-sm font-semibold text-[#111827] pt-2">{fmt(annual)}/yr</p>
            </div>
            <div>
              <label className={labelCls}>Setup fee (£)</label>
              <input type="number" className={ic} value={deal.onboardingFee || ''} onChange={e => autoSave('onboardingFee', parseFloat(e.target.value) || 0)} placeholder="0" />
            </div>
            <div>
              <label className={labelCls}>Accounting service</label>
              <select className={ic} value={deal.accountingService || 'Not included'} onChange={e => autoSave('accountingService', e.target.value)}>
                {ACCT_OPTIONS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            {(deal.accountingService === 'Separate fee' || deal.accountingService === 'Included in accounting service fee') && (
              <div>
                <label className={labelCls}>Accounting fee charged (£/month)</label>
                <input type="number" className={ic} value={deal.accountingServiceFee || ''} onChange={e => autoSave('accountingServiceFee', parseFloat(e.target.value) || 0)} placeholder="0" />
              </div>
            )}
            <div>
              <label className={labelCls}>Onboarding plan</label>
              <select className={ic} value={deal.onboardingPackage || ''} onChange={e => autoSave('onboardingPackage', e.target.value)}>
                <option value="">— Select —</option>
                {ONBOARDING_PKGS.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
          </div>

          {/* Accounting Margin */}
          {showAcctMargin && (
            <>
              <hr className="border-[#F3F4F6] mb-4" />
              <SectionTitle>Accounting Margin</SectionTitle>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className={labelCls}>Fee charged to client (£/mo)</label>
                  <input type="number" className={ic} value={deal.accountingServiceFee || ''} onChange={e => autoSave('accountingServiceFee', parseFloat(e.target.value) || 0)} placeholder="0" />
                </div>
                <div>
                  <label className={labelCls}>Accounting cost (£/mo)</label>
                  <input type="number" className={ic} value={deal.accountingCost || ''} onChange={e => autoSave('accountingCost', parseFloat(e.target.value) || 0)} placeholder="0 — what Eventwise pays ITLA" />
                </div>
                <div>
                  <label className={labelCls}>Gross margin £</label>
                  <p className={`text-sm font-semibold pt-2 ${acctFee > 0 ? (acctMarginGbp >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-[#9CA3AF]'}`}>
                    {acctFee > 0 ? fmt(acctMarginGbp) + '/mo' : '—'}
                  </p>
                </div>
                <div>
                  <label className={labelCls}>Gross margin %</label>
                  <p className={`text-sm font-semibold pt-2 ${acctFee > 0 ? (acctMarginPct >= 0 ? 'text-emerald-600' : 'text-red-600') : 'text-[#9CA3AF]'}`}>
                    {acctFee > 0 && acctMarginPct !== null ? acctMarginPct + '%' : '—'}
                  </p>
                </div>
              </div>
            </>
          )}

          <hr className="border-[#F3F4F6] mb-4" />

          <SectionTitle>Contract Dates</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Subscription start</label>
              <input type="date" className={ic} value={deal.subscriptionStartDate || ''} onChange={e => autoSave('subscriptionStartDate', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Contract end</label>
              <input type="date" className={ic} value={deal.subscriptionEndDate || ''} onChange={e => autoSave('subscriptionEndDate', e.target.value)} />
              {deal.subscriptionEndDate && <EndDateField date={deal.subscriptionEndDate} />}
            </div>
          </div>

          <hr className="border-[#F3F4F6] mb-4" />

          {/* Backdated toggle */}
          <SectionTitle>Deal Settings</SectionTitle>
          <div className="flex items-center gap-3 mb-4">
            <button
              onClick={() => autoSave('backdated', !deal.backdated)}
              className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${deal.backdated ? 'bg-[#8403C5]' : 'bg-gray-200'}`}
            >
              <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${deal.backdated ? 'translate-x-4' : 'translate-x-1'}`} />
            </button>
            <div>
              <p className="text-sm font-medium text-[#374151]">Backdated deal</p>
              <p className="text-xs text-[#9CA3AF]">Excluded from "added this month" metrics but included in totals</p>
            </div>
          </div>

          <hr className="border-[#F3F4F6] mb-4" />

          <SectionTitle>Deal Ownership</SectionTitle>
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div>
              <label className={labelCls}>Closed by</label>
              <input className={ic} value={deal.closedBy || ''} onChange={e => autoSave('closedBy', e.target.value)} placeholder="—" />
            </div>
            <div>
              <label className={labelCls}>CS Owner</label>
              <select className={ic} value={deal.csOwner || ''} onChange={e => autoSave('csOwner', e.target.value)}>
                <option value="">— Select —</option>
                {CS_OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Deal status</label>
              <select className={ic} value={deal.status || 'Active'} onChange={e => autoSave('status', e.target.value)}>
                {DEAL_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <hr className="border-[#F3F4F6] mb-4" />

          {deal.handoverNotes && (
            <>
              <SectionTitle>Sales Handover Notes</SectionTitle>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 whitespace-pre-wrap">📋 {deal.handoverNotes}</p>
              </div>
              <hr className="border-[#F3F4F6] mb-4" />
            </>
          )}

          {/* Churn details — visible when churned */}
          {deal.status === 'Churned' && (deal.churnDate || deal.churnReason || deal.churnNotes) && (
            <>
              <SectionTitle>Churn Details</SectionTitle>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4 space-y-2">
                {deal.churnDate && (
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide w-28 shrink-0">Churn date</span>
                    <span className="text-sm text-red-800">{fmtDate(deal.churnDate)}</span>
                  </div>
                )}
                {deal.churnReason && (
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide w-28 shrink-0">Reason</span>
                    <span className="text-sm text-red-800">{deal.churnReason}</span>
                  </div>
                )}
                {deal.churnNotes && (
                  <div className="flex gap-4">
                    <span className="text-xs font-bold text-red-400 uppercase tracking-wide w-28 shrink-0">Notes</span>
                    <span className="text-sm text-red-800 whitespace-pre-wrap">{deal.churnNotes}</span>
                  </div>
                )}
              </div>
              <hr className="border-[#F3F4F6] mb-4" />
            </>
          )}

          <SectionTitle>Linked Records</SectionTitle>
          <div className="space-y-2 mb-4">
            {deal.clientId && onNavigate && (
              <button onClick={() => { onNavigate('clients'); onClose(); }} className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View client record →
              </button>
            )}
            {deal.leadId && onNavigate && (
              <button onClick={() => { onNavigate('pipeline'); onClose(); }} className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View original lead →
              </button>
            )}
            {deal.clientId && onNavigate && (
              <button onClick={() => { onNavigate('onboarding'); onClose(); }} className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View onboarding →
              </button>
            )}
          </div>

          <hr className="border-[#F3F4F6] mb-4" />

          <SectionTitle>Notes</SectionTitle>
          <textarea className={`${ic} min-h-[80px] resize-none mb-4`} value={notes} onChange={e => handleNotesChange(e.target.value)} placeholder="Add notes here — auto-saves..." />

          {/* Footer actions */}
          <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
            {deal.status !== 'Churned' && onChurn && (
              <button onClick={() => { onClose(); onChurn(deal); }}
                className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
                Mark as churned
              </button>
            )}
            {deleteConfirm ? (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <p className="text-sm text-[#374151] mb-3">Are you sure you want to delete this deal? This cannot be undone.</p>
                <div className="flex gap-2">
                  <button onClick={handleDelete} disabled={deleting}
                    className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-colors">
                    {deleting ? 'Deleting…' : 'Delete permanently'}
                  </button>
                  <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg">Cancel</button>
                </div>
              </div>
            ) : (
              <button onClick={() => setDeleteConfirm(true)} className="flex items-center gap-1.5 text-sm text-red-500 hover:text-red-700 font-medium transition-colors">
                <Trash2 className="w-4 h-4" /> Delete deal
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}