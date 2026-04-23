import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays } from 'date-fns';
import { X, Mail, Trash2, ExternalLink } from 'lucide-react';

const PLAN_COLORS = {
  Starter: 'bg-blue-100 text-blue-700',
  Professional: 'bg-purple-100 text-purple-700',
  Business: 'bg-emerald-100 text-emerald-700',
};

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Up for Renewal': 'bg-amber-50 text-amber-700',
  Churned: 'bg-red-50 text-red-600',
  'At Risk': 'bg-orange-50 text-orange-700',
  'On Hold': 'bg-gray-100 text-gray-600',
  Cancelled: 'bg-red-100 text-red-700',
};

const ACCT_OPTIONS = ['Not included', 'Included in plan', 'Included in accounting service fee', 'Separate fee'];
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
      <p className="text-xs text-[#9CA3AF] mt-0.5">
        {diff < 0 ? `${Math.abs(diff)}d overdue` : `${diff}d remaining`}
      </p>
    </div>
  );
}

export default function DealDetailPanel({ deal: initialDeal, onClose, onUpdated, onDelete, onNavigate }) {
  const [deal, setDeal] = useState(initialDeal);
  const [notes, setNotes] = useState(initialDeal.notes || '');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [churnConfirm, setChurnConfirm] = useState(false);
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

  const handleChurn = async () => {
    await base44.entities.Deal.update(deal.id, { status: 'Churned' });
    // Also update client
    if (deal.clientId) {
      await base44.entities.Client.update(deal.clientId, { status: 'Churn' });
    }
    const updated = { ...deal, status: 'Churned' };
    setDeal(updated);
    onUpdated(updated);
    setChurnConfirm(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    await base44.entities.Deal.delete(deal.id);
    setDeleting(false);
    onDelete(deal.id);
    onClose();
  };

  const annual = (deal.monthlyValue || 0) * 12;
  const endDiff = deal.subscriptionEndDate ? differenceInDays(new Date(deal.subscriptionEndDate), new Date()) : null;

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
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">

          {/* S1: Deal Financials */}
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
            {deal.accountingService === 'Separate fee' && (
              <div>
                <label className={labelCls}>Accounting fee (£/month)</label>
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

          <hr className="border-[#F3F4F6] mb-4" />

          {/* S2: Contract Dates */}
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

          {/* S3: Ownership */}
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

          {/* S4: Handover notes */}
          {deal.handoverNotes && (
            <>
              <SectionTitle>Sales Handover Notes</SectionTitle>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-amber-800 whitespace-pre-wrap">📋 {deal.handoverNotes}</p>
              </div>
              <hr className="border-[#F3F4F6] mb-4" />
            </>
          )}

          {/* S5: Linked records */}
          <SectionTitle>Linked Records</SectionTitle>
          <div className="space-y-2 mb-4">
            {deal.clientId && onNavigate && (
              <button onClick={() => { onNavigate('clients'); onClose(); }}
                className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View client record →
              </button>
            )}
            {deal.leadId && onNavigate && (
              <button onClick={() => { onNavigate('pipeline'); onClose(); }}
                className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View original lead →
              </button>
            )}
            {deal.clientId && onNavigate && (
              <button onClick={() => { onNavigate('onboarding'); onClose(); }}
                className="flex items-center gap-2 text-sm text-[#8403C5] hover:underline font-medium">
                <ExternalLink className="w-3.5 h-3.5" /> View onboarding →
              </button>
            )}
          </div>

          <hr className="border-[#F3F4F6] mb-4" />

          {/* S6: Notes */}
          <SectionTitle>Notes</SectionTitle>
          <textarea className={`${ic} min-h-[80px] resize-none mb-4`} value={notes} onChange={e => handleNotesChange(e.target.value)} placeholder="Add notes here — auto-saves..." />

          {/* Footer actions */}
          <div className="border-t border-[#F3F4F6] pt-4 space-y-3">
            {deal.status !== 'Churned' && (
              churnConfirm ? (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                  <p className="text-sm text-[#374151] mb-3">
                    Are you sure you want to mark this deal as churned? The client record will also be updated to Churned status.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={handleChurn} className="px-4 py-2 text-sm font-semibold bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors">Confirm</button>
                    <button onClick={() => setChurnConfirm(false)} className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg">Cancel</button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setChurnConfirm(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-amber-700 hover:text-amber-900 transition-colors">
                  Mark as churned
                </button>
              )
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