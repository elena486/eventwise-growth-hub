import React from 'react';
import { ONBOARDING_FEATURES, TIMELINE_STEPS } from '@/lib/proposalData';

export default function OnboardingSection({ data }) {
  const { onboardingKey, onboardingName, onboardingPrice } = data;
  const features = ONBOARDING_FEATURES[onboardingKey] || [];
  const midpoint = Math.ceil(features.length / 2);

  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">Getting started</p>
      <h2 className="text-2xl font-bold text-navy mb-4">We don't disappear after launch</h2>

      <div className="flex gap-3 mb-8">
        <span className="bg-navy-tint text-navy text-xs font-semibold rounded-full px-4 py-1.5">
          {onboardingName}
        </span>
        <span className="bg-green-light text-green-dark text-xs font-semibold rounded-full px-4 py-1.5">
          {onboardingPrice}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-x-8 gap-y-2 mb-10">
        {features.map((f, i) => (
          <div key={i} className="flex items-start gap-2.5 py-1.5">
            <span className="text-green font-bold text-sm mt-0.5 shrink-0">✓</span>
            <span className="text-ew-body text-sm leading-snug">{f}</span>
          </div>
        ))}
      </div>

      {/* Timeline */}
      <div className="relative mb-2">
        <div className="flex justify-between items-start relative">
          {/* Connecting line */}
          <div className="absolute top-4 left-8 right-8 h-0.5 bg-ew-border" />
          {TIMELINE_STEPS.map((s) => (
            <div key={s.step} className="flex flex-col items-center relative z-10 flex-1">
              <div
                className="w-8 h-8 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center mb-2"
                style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
              >
                {s.step}
              </div>
              <p className="font-semibold text-navy text-xs">{s.label}</p>
              <p className="text-ew-muted text-[11px]">{s.time}</p>
            </div>
          ))}
        </div>
      </div>
      <p className="text-center text-ew-muted text-xs">Most clients are live and confident within 2–3 weeks</p>
    </div>
  );
}