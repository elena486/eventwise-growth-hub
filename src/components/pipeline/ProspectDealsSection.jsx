import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { RefreshCw, ExternalLink } from 'lucide-react';
import { arrFieldUpdates } from '@/lib/dealRevenue';
import RevenueBlock from '@/components/shared/RevenueBlock';

const STATUS_STYLES = {
  Active: 'bg-emerald-50 text-emerald-700',
  'Up for Renewal': 'bg-amber-50 text-amber-700',
  Churned: 'bg-red-50 text-red-600',
};

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

/**
 * ProspectDealsSection — shows Deal records linked to this prospect (leadId),
 * with the shared editable RevenueBlock at the top of each card.
 * Editing here updates the same Deal record used everywhere else.
 */
export default function ProspectDealsSection({ leadId, onNavigateToDeals }) {
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

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

  const saveArrField = async (deal, field, value) => {
    const updates = arrFieldUpdates(field, value, deal);
    await base44.entities.Deal.update(deal.id, updates);
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, ...updates } : d));
  };

  const saveOnboarding = async (deal, value) => {
    const onboarding_fee = parseFloat(value) || 0;
    await base44.entities.Deal.update(deal.id, { onboarding_fee });
    setDeals(prev => prev.map(d => d.id === deal.id ? { ...d, onboarding_fee } : d));
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
        {deals.map(deal => (
          <div key={deal.id} className="bg-white border border-ew-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-navy">{deal.clientName || 'Unnamed'}</span>
                {deal.status && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[deal.status] || 'bg-gray-100 text-gray-600'}`}>{deal.status}</span>}
                {deal.plan && <span className="text-[10px] font-medium text-ew-muted">{deal.plan}</span>}
              </div>
              <span className="text-[10px] text-ew-muted">Start: {fmtDate(deal.subscriptionStartDate)}</span>
            </div>
            <RevenueBlock
              record={deal}
              onSaveArr={(field, value) => saveArrField(deal, field, value)}
              onSaveOnboarding={(value) => saveOnboarding(deal, value)}
            />
          </div>
        ))}
      </div>
    </div>
  );
}