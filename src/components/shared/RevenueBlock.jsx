import React from 'react';
import { calcTotalArr, hasNewRevenueFields } from '@/lib/dealRevenue';

const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

function fmt(n) {
  if (!n && n !== 0) return '—';
  return '£' + Math.round(n).toLocaleString('en-GB');
}

/**
 * Shared ARR revenue block used in the Pipeline lead side view, the Deal side
 * view, and the Prospect deals section — identical layout and styling.
 *
 * Props:
 *  - record: a lead or deal with software_arr, services_arr, onboarding_fee
 *  - onSaveArr(field, value): persists software_arr / services_arr (caller recalculates total_arr)
 *  - onSaveOnboarding(value): persists onboarding_fee
 */
export default function RevenueBlock({ record, onSaveArr, onSaveOnboarding }) {
  if (!record) return null;
  const missing = !hasNewRevenueFields(record);

  return (
    <div className="bg-[#F7F8FC] border border-ew-border rounded-xl p-3.5">
      <div className="flex items-center justify-between mb-2.5">
        <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.18em]">Revenue Breakdown (ARR)</p>
        {missing && (
          <span className="text-[10px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full whitespace-nowrap">
            Breakdown missing
          </span>
        )}
      </div>
      <div className="grid grid-cols-3 gap-2.5">
        <div>
          <label className="block text-[10px] font-medium text-ew-muted mb-1">Software ARR £/yr</label>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-sm text-ew-muted">£</span>
            <input type="number" className={inputCls + ' pl-7'} value={record.software_arr || ''} onChange={e => onSaveArr('software_arr', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-ew-muted mb-1">Services ARR £/yr</label>
          <div className="relative">
            <span className="absolute left-2.5 top-2 text-sm text-ew-muted">£</span>
            <input type="number" className={inputCls + ' pl-7'} value={record.services_arr || ''} onChange={e => onSaveArr('services_arr', e.target.value)} placeholder="0" />
          </div>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-ew-muted mb-1">Total ARR <span className="font-normal">auto</span></label>
          <p className="text-base font-bold text-[#8403C5] pt-1.5">{fmt(calcTotalArr(record))}<span className="text-xs font-normal text-ew-muted ml-1">/yr</span></p>
        </div>
      </div>
      <div className="mt-2.5 pt-2.5 border-t border-ew-border flex items-center gap-3">
        <label className="text-[10px] font-medium text-ew-muted whitespace-nowrap">Onboarding fee (one-off, not in ARR)</label>
        <div className="relative w-[150px]">
          <span className="absolute left-2.5 top-2 text-sm text-ew-muted">£</span>
          <input type="number" className={inputCls + ' pl-7'} value={record.onboarding_fee || ''} onChange={e => onSaveOnboarding(e.target.value)} placeholder="0" />
        </div>
      </div>
    </div>
  );
}