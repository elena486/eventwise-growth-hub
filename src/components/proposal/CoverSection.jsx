import React from 'react';
import { format } from 'date-fns';
import { LOGO_WHITE } from '@/lib/proposalData';

export default function CoverSection({ data }) {
  const { companyName, contactName, date, planName, includeAccounting } = data;
  const subtitle = includeAccounting
    ? `${planName} Plan + Accounting Service`
    : `${planName} Plan`;

  const formattedDate = date ? format(new Date(date), 'MMMM yyyy') : '';

  return (
    <div className="bg-navy rounded-t-xl p-10 pb-8" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <div className="flex items-center justify-between mb-10">
        <img src={LOGO_WHITE} alt="Eventwise" className="h-8" />
        <span className="text-xs font-medium text-white/80 border border-white/30 rounded-full px-4 py-1.5 tracking-wide">
          Subscription Proposal
        </span>
      </div>

      <p className="text-[11px] font-medium text-white/40 uppercase tracking-[0.2em] mb-3">
        Prepared exclusively for
      </p>
      <h1 className="text-[38px] font-bold text-white leading-tight tracking-tight mb-3">
        {companyName || 'Company Name'}
      </h1>
      <p className="text-white/60 text-base font-medium">{subtitle}</p>

      <div className="border-t border-white/15 mt-8 pt-6 flex justify-between items-end">
        <div>
          <p className="text-[10px] font-medium text-white/40 uppercase tracking-[0.15em] mb-1">Prepared for</p>
          <p className="text-white font-semibold text-sm">{contactName || 'Contact Name'}</p>
        </div>
        <div className="text-right">
          <p className="text-white/50 text-xs mb-1">{formattedDate}</p>
          <p className="text-white font-semibold text-sm">Chris Carter</p>
          <p className="text-white/50 text-xs">CEO, Eventwise</p>
        </div>
      </div>
    </div>
  );
}