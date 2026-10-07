import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { calcTotalArr, hasNewRevenueFields, getEffectiveArr, arrFieldUpdates } from '@/lib/dealRevenue';

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

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

/**
 * ProspectDealsSection — shows Deal records linked to this prospect (leadId),
 * with editable revenue breakdown fields (software_arr, services_arr, onboarding_fee).
 * Editing here updates the same Deal record used everywhere else.
 */
export default function ProspectDealsSection({ leadId, onNavigateToDeals }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({});

  const load = useCallback(async () => {
    if (!leadId) { setLoading(false); return; }
    try {
      const res = await base44.entities.Deal.filter({ leadId }, { sort: '-created_date', limit: 50 });
      setDeals(res.items || []);
    } catch {
      setDeals([]);
    }
    setLoading(false);
  }, [leadId]);

  useEffect(() => { load(); }, [load]);

  const startEdit = (deal) => {
    setEditingId(deal.id);
    setEditForm({
      software_arr: deal.software_arr || '',
      services_arr: deal.services_arr || '',
      onboarding_fee: deal.onboarding_fee || '',
    });
  };

  const saveEdit = async (deal) => {
    const updates = {
      software_arr: parseFloat(editForm.software_arr) || 0,
      services_arr: parseFloat(editForm.services_arr) || 0,
      onboarding_fee: parseFloat(editForm.onboarding_fee) || 0,
    };
    updates.total_arr = updates.software_arr + updates.services_arr;
    await base44.entities.Deal.update(deal.id, updates);
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, ...updates } : d));
    setEditingId(null);
  };

  const handleFieldSave = async (deal, field, value) => {
    const updates = arrFieldUpdates(field, value, deal);
    if (field === 'onboarding_fee') {
      updates.onboarding_fee = parseFloat(value) || 0;
      delete updates.total_arr;
    }
    await base44.entities.Deal.update(deal.id, updates);
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, ...updates } : d));
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-ew-muted py-4">
        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Loading deals…
      </div>
    );
  }

  if (deals.length === 0) return null;

  return (
    <div className="mt-6 pt-5 border-t border-ew-border">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.18em]">Closed Deal Records</p>
        {onNavigateToDeals && (
          <button onClick={onNavigateToDeals} className="flex items-center gap-1 text-[11px] font-semibold text-[#8403C5] hover:underline">
            <ExternalLink className="w-3 h-3" /> Open in Deals
          </button>
        )}
      </div>

      <div className="space-y-3">
        {deals.map(deal => {
          const totalArr = calcTotalArr(deal);
          const isNew = hasNewRevenueFields(deal);
          const effectiveArr = getEffectiveArr(deal);

          return (
            <div key={deal.id} className="bg-[#F7F8FC] border border-ew-border rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-navy">{deal.clientName || 'Unnamed'}</span>
                  {deal.status && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>}
                  {deal.plan && <span className="text-[10px] font-medium text-ew-muted">{deal.plan}</span>}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-ew-muted">Start: {fmtDate(deal.subscriptionStartDate)}</span>
                  {editingId === deal.id ? (
                    <>
                      <button onClick={() => saveEdit(deal)} className="px-2.5 py-1 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">Save</button>
                      <button onClick={() => setEditingId(null)} className="px-2.5 py-1 text-xs text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(deal)} className="px-2.5 py-1 text-xs font-medium text-[#8403C5] border border-[#8403C5]/30 bg-[#F3E8FF] hover:bg-[#E9D5FF] rounded-lg">Edit revenue</button>
                  )}
                </div>
              </div>

              {editingId === deal.id ? (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] font-medium text-ew-muted mb-1">Software ARR (Subscription)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-ew-muted">£</span>
                      <input type="number" className={ic + ' pl-7'} value={editForm.software_arr} onChange={e => setEditForm(f => ({ ...f, software_arr: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ew-muted mb-1">Services ARR (Accounting)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-ew-muted">£</span>
                      <input type="number" className={ic + ' pl-7'} value={editForm.services_arr} onChange={e => setEditForm(f => ({ ...f, services_arr: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ew-muted mb-1">Onboarding fee (one-off)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2 text-sm text-ew-muted">£</span>
                      <input type="number" className={ic + ' pl-7'} value={editForm.onboarding_fee} onChange={e => setEditForm(f => ({ ...f, onboarding_fee: e.target.value }))} placeholder="0" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-ew-muted mb-1">Total ARR (auto)</label>
                    <p className="text-sm font-bold text-navy pt-2">{fmt((parseFloat(editForm.software_arr) || 0) + (parseFloat(editForm.services_arr) || 0))}<span className="text-[10px] font-normal text-ew-muted ml-1">/yr</span></p>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-4 gap-3">
                  <div>
                    <p className="text-[10px] font-medium text-ew-muted mb-0.5">Software ARR</p>
                    <p className="text-sm font-semibold text-navy">{fmt(deal.software_arr || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-ew-muted mb-0.5">Services ARR</p>
                    <p className="text-sm font-semibold text-navy">{fmt(deal.services_arr || 0)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-ew-muted mb-0.5">Total ARR</p>
                    <p className="text-sm font-bold text-[#8403C5]">{fmt(isNew ? totalArr : effectiveArr)}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium text-ew-muted mb-0.5">Onboarding fee <span className="text-ew-muted-light">(one-off)</span></p>
                    <p className="text-sm font-semibold text-ew-body">{fmt(deal.onboarding_fee || deal.onboardingFee || 0)}</p>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}