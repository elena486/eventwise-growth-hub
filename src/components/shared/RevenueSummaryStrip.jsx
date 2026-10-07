import React from 'react';
import { computeRevenueMetrics } from '@/lib/dealRevenue';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

/**
 * Shared summary strip for the top of the Pipeline and Deals pages.
 * Computes live metrics from the given records (already filtered/searched).
 * getEffectiveArrFn: getEffectiveLeadArr for leads, getEffectiveArr for deals.
 */
export default function RevenueSummaryStrip({ records, getEffectiveArrFn, recordLabel = 'records' }) {
  const m = computeRevenueMetrics(records, getEffectiveArrFn);

  const cards = [
    { label: 'Total Software ARR', value: fmt(m.totalSoftware) },
    { label: 'Total Services ARR', value: fmt(m.totalServices) },
    { label: 'Total ARR', value: fmt(m.totalArr), highlight: true },
    { label: 'Total Onboarding (one-off)', value: fmt(m.totalOnboarding), sub: 'Not in ARR' },
    { label: recordLabel, value: m.numRecords, sub: `Avg ARR: ${fmt(m.avgArr)}` },
    { label: 'Services share of ARR', value: m.servicesShare != null ? Math.round(m.servicesShare) + '%' : '—', sub: 'Software vs accounting split' },
  ];

  return (
    <div>
      <div className="grid grid-cols-6 gap-3 mb-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-4">
            <p className="text-[10px] font-medium text-ew-muted uppercase tracking-[0.1em] mb-1">{c.label}</p>
            <p className={`font-bold ${c.highlight ? 'text-[#8403C5] text-2xl' : 'text-navy text-xl'}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-ew-muted mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>
      {m.missingBreakdown > 0 && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          <span>⚠</span>
          <span><strong>{m.missingBreakdown}</strong> {recordLabel.toLowerCase()} missing revenue breakdown — Total ARR uses the legacy deal value fallback for these.</span>
        </div>
      )}
    </div>
  );
}