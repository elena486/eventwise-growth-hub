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
 *
 * Props:
 *  - records: the records currently in view (filtered/searched)
 *  - getEffectiveArrFn
 *  - recordLabel
 *  - overallMissingCount: count of records missing the breakdown across ALL records (not just this view)
 *  - onFilterMissing: callback to filter the list to only records missing the breakdown (optional)
 *  - missingFilterActive: true when the missing-breakdown filter is currently applied
 *  - onClearMissingFilter: callback to clear the missing-breakdown filter (optional)
 */
export default function RevenueSummaryStrip({ records, getEffectiveArrFn, recordLabel = 'records', overallMissingCount, overallMissingWarm, overallMissingCold, activePipelineLabel, onFilterMissing, missingFilterActive, onClearMissingFilter }) {
  const m = computeRevenueMetrics(records, getEffectiveArrFn);

  const cards = [
    { label: 'Total Software ARR', value: fmt(m.totalSoftware) },
    { label: 'Total Services ARR', value: fmt(m.totalServices) },
    { label: 'Unsplit (legacy value)', value: fmt(m.totalUnsplit), sub: 'Fallback, not broken down' },
    { label: 'Total ARR', value: fmt(m.totalArr), highlight: true, sub: 'Software + Services + Unsplit' },
    { label: 'Total Onboarding (one-off)', value: fmt(m.totalOnboarding), sub: 'Not in ARR' },
    { label: recordLabel, value: m.numRecords, sub: `Avg ARR (leads with a value): ${fmt(m.avgArrWithValue)}` },
    { label: 'Services share of ARR', value: m.servicesShare != null ? Math.round(m.servicesShare) + '%' : '—', sub: 'Of split ARR only' },
  ];

  const showBanner = m.missingBreakdown > 0 || (overallMissingCount != null && overallMissingCount > 0);

  return (
    <div>
      <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-4">
        {cards.map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-4">
            <p className="text-[10px] font-medium text-ew-muted uppercase tracking-[0.1em] mb-1">{c.label}</p>
            <p className={`font-bold ${c.highlight ? 'text-[#8403C5] text-2xl' : 'text-navy text-xl'}`}>{c.value}</p>
            {c.sub && <p className="text-[10px] text-ew-muted mt-0.5">{c.sub}</p>}
          </div>
        ))}
      </div>
      {showBanner && (
        <div className="mb-4 flex items-center gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 flex-wrap">
          <span>⚠</span>
          <span>
            <strong>{m.missingBreakdown}</strong> leads in this view have no revenue entered.
            {overallMissingCount != null && (
              <> Overall: <strong>{overallMissingCount}</strong>
                {overallMissingWarm != null && overallMissingCold != null && (
                  <> (Warm: <strong>{overallMissingWarm}</strong>, Cold: <strong>{overallMissingCold}</strong>)</>
                )}
                {activePipelineLabel && <> — {activePipelineLabel} counts towards this page's totals.</>}
              </>
            )}
            {m.totalUnsplit > 0 && <> Total ARR uses the legacy deal value fallback (<strong>{fmt(m.totalUnsplit)}</strong>) for these.</>}
          </span>
          {onFilterMissing && !missingFilterActive && (
            <button onClick={onFilterMissing} className="font-semibold text-amber-800 underline hover:text-amber-900 whitespace-nowrap">
              Show only these →
            </button>
          )}
          {missingFilterActive && onClearMissingFilter && (
            <button onClick={onClearMissingFilter} className="font-semibold text-amber-800 underline hover:text-amber-900 whitespace-nowrap">
              Clear filter
            </button>
          )}
        </div>
      )}
    </div>
  );
}