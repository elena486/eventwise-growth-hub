import React from 'react';
import { PLATFORM_FEATURES } from '@/lib/proposalData';

export default function PlatformFeatures() {
  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">The platform</p>
      <h2 className="text-2xl font-bold text-navy mb-2">Everything your finance team needs</h2>
      <p className="text-ew-body-light text-sm mb-8 max-w-xl">
        Built for event teams who are tired of spreadsheets and need real visibility over every pound — from first budget line to post-event P&L.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {PLATFORM_FEATURES.map((f, i) => (
          <div key={i} className="border border-ew-border rounded-lg p-5">
            <span className="text-2xl mb-3 block">{f.emoji}</span>
            <h4 className="font-semibold text-navy text-sm mb-1">{f.title}</h4>
            <p className="text-ew-muted text-xs leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      <div className="border-l-4 border-navy bg-navy-tint rounded-r-lg p-6" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
        <p className="text-ew-body text-sm italic leading-relaxed mb-3">
          "Eventwise is exactly what our music festival needed. Its interactive features and budget tools transform our planning, helping us stay on budget, catch issues early, and make confident decisions throughout the event lifecycle."
        </p>
        <p className="text-navy text-sm">
          <strong>Fred Letts</strong>, <span className="text-ew-muted">Director — Gottwood Festival</span>
        </p>
      </div>
    </div>
  );
}