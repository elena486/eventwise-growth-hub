import React from 'react';

const RATING_STYLES = {
  on_track: { bg: 'bg-[#E8F7F2]', text: 'text-[#1D9E75]', dot: 'bg-[#1D9E75]', label: 'On track' },
  at_risk: { bg: 'bg-[#FFFBEB]', text: 'text-[#A16207]', dot: 'bg-[#E8A020]', label: 'At risk' },
  off_track: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', dot: 'bg-[#DC2626]', label: 'Off track' },
};

export function formatKpiValue(kpi) {
  if (kpi.value == null || kpi.value === '') return '—';
  const n = Number(kpi.value);
  if (isNaN(n)) return '—';
  if (kpi.prefix === '£') return '£' + n.toLocaleString('en-GB');
  return n.toLocaleString('en-GB') + (kpi.suffix || '');
}

export function formatTarget(kpi) {
  if (kpi.target == null) return '';
  if (kpi.prefix === '£') return '£' + kpi.target.toLocaleString('en-GB');
  return kpi.target + (kpi.suffix || '');
}

export const RATING_LABELS = { on_track: 'On track', at_risk: 'At risk', off_track: 'Off track' };

export default function SprintSection({ sprint }) {
  if (!sprint) {
    return (
      <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-bold text-[#242450] mb-2">Sprint / KPIs</h3>
        <p className="text-sm text-[#9CA3AF] italic">No sprint update submitted for this period.</p>
      </div>
    );
  }

  const rating = sprint.selfRating ? RATING_STYLES[sprint.selfRating] : null;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-[#242450]">Sprint / KPIs</h3>
        {rating && (
          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${rating.bg} ${rating.text}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${rating.dot}`} />
            {rating.label}
          </span>
        )}
      </div>
      <div className="space-y-0">
        {sprint.kpis.map((kpi, i) => (
          <div key={i} className="flex items-center justify-between gap-3 py-2 border-b border-[#F2F2F4] last:border-0">
            <p className="text-sm text-[#242450] truncate flex-1">{kpi.label}</p>
            <p className="text-sm shrink-0">
              <span className="font-semibold text-[#242450]">{formatKpiValue(kpi)}</span>
              {kpi.target != null && <span className="text-[#9CA3AF]"> / target {formatTarget(kpi)}</span>}
            </p>
          </div>
        ))}
      </div>
      {sprint.blocker && (
        <p className="text-xs text-[#9CA3AF] mt-3">Waiting on: {sprint.blocker}</p>
      )}
    </div>
  );
}