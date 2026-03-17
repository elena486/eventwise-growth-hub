import React from 'react';

const STEPS = [
  'Consultation call',
  'Customise to your workflows',
  '2-week implementation',
  'Go-live with full support',
];

export default function CTABlock() {
  return (
    <div className="mx-10 my-10 bg-navy rounded-xl p-8 flex gap-8 items-center" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <div className="flex-1">
        <p className="text-[10px] font-semibold text-white/40 uppercase tracking-[0.2em] mb-2">Ready to move forward?</p>
        <h3 className="text-xl font-bold text-white mb-2">Let's get you live in 3 weeks</h3>
        <p className="text-white/50 text-sm leading-relaxed">
          Most clients are up and running — with real data flowing — in under three weeks.
        </p>
      </div>
      <div className="space-y-3 shrink-0">
        {STEPS.map((s, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full border border-white/25 text-white text-xs font-bold flex items-center justify-center shrink-0">
              {i + 1}
            </div>
            <span className="text-white text-sm font-medium">{s}</span>
          </div>
        ))}
      </div>
    </div>
  );
}