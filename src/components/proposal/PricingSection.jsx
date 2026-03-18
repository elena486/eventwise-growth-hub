import React from 'react';

function CheckItem({ text }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className="text-green font-bold text-sm mt-0.5 shrink-0">✓</span>
      <span className="text-ew-body text-sm leading-snug">{text}</span>
    </div>
  );
}

export default function PricingSection({ data }) {
  const { planName, displayPrice, planFeatures, includeAccounting, accountingPrice, accountingServices } = data;

  return (
    <div className="px-10 py-10">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">Your investment</p>
      <h2 className="text-2xl font-bold text-navy mb-8">Simple, transparent pricing</h2>

      <div className={`grid gap-5 ${includeAccounting ? 'grid-cols-2' : 'max-w-[360px]'}`}>
        {/* Software plan card */}
        <div className="border-2 border-navy rounded-xl overflow-hidden">
          <div className="bg-navy p-6" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
            <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.15em] mb-3">{planName} Plan</p>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-white">£{displayPrice}</span>
              <span className="text-white/50 text-sm">/mo</span>
            </div>
            <p className="text-white/40 text-xs mt-2">Seats and departments included</p>
          </div>
          <div className="p-6">
            {planFeatures.map((f, i) => <CheckItem key={i} text={f} />)}
          </div>
        </div>

        {/* Accounting card */}
        {includeAccounting && (
          <div className="border border-ew-border rounded-xl overflow-hidden">
            <div className="bg-ew-footer p-6" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.15em] mb-3">Accounting Service</p>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-bold text-navy">£{accountingPrice?.toLocaleString() || '7,100'}</span>
                <span className="text-ew-muted text-sm">/yr</span>
              </div>
              <p className="text-ew-muted text-xs mt-2">Full-service financial management</p>
            </div>
            <div className="p-6">
              {accountingServices.map((s, i) => <CheckItem key={i} text={s} />)}
            </div>
          </div>
        )}
      </div>


    </div>
  );
}