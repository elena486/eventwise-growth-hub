import React from 'react';

const TIMELINE_STEPS = [
  {
    step: 1,
    label: 'Kick-off',
    time: 'Day 1',
    desc: 'Meet your dedicated account manager. Agree goals, platform structure and go-live timeline. Your account is set up and configured.',
  },
  {
    step: 2,
    label: 'Configuration',
    time: 'Days 2–5',
    desc: 'Chart of accounts, cost/revenue departments, approval workflows and budget templates built to match your events.',
  },
  {
    step: 3,
    label: 'Training',
    time: 'Week 2',
    desc: 'Live training session for your whole team — budgeting, purchase orders, approvals, invoicing and reporting all covered.',
  },
  {
    step: 4,
    label: 'Go-live',
    time: 'Week 3',
    desc: 'Your first live event budget running in Eventwise. Team drop-in session to answer questions and build confidence.',
  },
  {
    step: 5,
    label: 'Ongoing',
    time: 'Month 1+',
    desc: 'Regular check-ins, monthly reviews and dedicated support throughout your subscription. We\'re with you for the long term.',
  },
];

const PACKAGES = {
  essential: {
    name: 'Success Essential',
    price: 'Free',
    color: 'border-ew-border',
    headerBg: 'bg-ew-footer',
    features: [
      'Dedicated account manager from day one',
      'Full kick-off call and account setup',
      'Four weekly check-in meetings',
      'One past budget uploaded for you',
      'Custom Eventwise training session',
      'Team drop-in session post-training',
      'Monthly check-ins after going live',
      'Ongoing help and support',
    ],
  },
  plus: {
    name: 'Success Plus',
    price: '£1,500',
    color: 'border-navy',
    headerBg: 'bg-navy',
    isHighlighted: true,
    features: [
      'Everything in Essential',
      'Free budget consultation and restructure',
      'Extra budget upload of your choice',
      'One on-site training day (4 hours)',
      '4 additional drop-in sessions for your team',
      'Monthly check-ins after going live',
      'Priority support response',
      'Ongoing help and support',
    ],
  },
  premium: {
    name: 'Success Premium',
    price: '£5,000',
    color: 'border-ew-border',
    headerBg: 'bg-ew-footer',
    features: [
      'Everything in Plus',
      'Upload of 50 past event budgets',
      'Two on-site training days (4 hours each)',
      '12 additional weekly meetings post go-live',
      'Dedicated senior account manager',
      'Bespoke reporting templates',
      'Quarterly strategic review sessions',
      'Ongoing help and support',
    ],
  },
};

function CheckItem({ text, muted }) {
  return (
    <div className="flex items-start gap-2.5 py-1.5">
      <span className={`font-bold text-sm mt-0.5 shrink-0 ${muted ? 'text-ew-muted-light' : 'text-green'}`}>✓</span>
      <span className={`text-sm leading-snug ${muted ? 'text-ew-muted' : 'text-ew-body'}`}>{text}</span>
    </div>
  );
}

export default function OnboardingSection({ data }) {
  const { onboardingKey, onboardingName, onboardingPrice, showAllOnboarding } = data;

  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">Getting started</p>
      <h2 className="text-2xl font-bold text-navy mb-2">We don't disappear after launch</h2>
      <p className="text-ew-body-light text-sm mb-8 max-w-xl">
        Every client gets a dedicated account manager and a structured onboarding programme to make sure your team is set up for success from day one.
      </p>

      {/* Detailed implementation timeline */}
      <div className="mb-10">
        <h3 className="text-sm font-semibold text-navy mb-6 uppercase tracking-wide">Implementation timeline</h3>
        <div className="space-y-0">
          {TIMELINE_STEPS.map((s, i) => (
            <div key={s.step} className="flex gap-5">
              {/* Left column: step indicator + connector line */}
              <div className="flex flex-col items-center">
                <div
                  className="w-9 h-9 rounded-full bg-navy text-white text-xs font-bold flex items-center justify-center shrink-0"
                  style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                >
                  {s.step}
                </div>
                {i < TIMELINE_STEPS.length - 1 && (
                  <div className="w-0.5 bg-ew-border flex-1 mt-1 mb-1" style={{ minHeight: '32px' }} />
                )}
              </div>
              {/* Right column: content */}
              <div className={`pb-6 flex-1 ${i < TIMELINE_STEPS.length - 1 ? '' : ''}`}>
                <div className="flex items-center gap-3 mb-1 pt-1.5">
                  <p className="font-semibold text-navy text-sm">{s.label}</p>
                  <span className="bg-green-light text-green-dark text-[10px] font-semibold rounded-full px-2.5 py-0.5">{s.time}</span>
                </div>
                <p className="text-ew-body-light text-sm leading-relaxed">{s.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Onboarding package(s) */}
      <div>
        <h3 className="text-sm font-semibold text-navy mb-6 uppercase tracking-wide">
          {showAllOnboarding ? 'Onboarding packages' : 'Your onboarding package'}
        </h3>

        {showAllOnboarding ? (
          /* Show all 3 packages side by side */
          <div className="grid grid-cols-3 gap-4">
            {Object.entries(PACKAGES).map(([key, pkg]) => (
              <div key={key} className={`border-2 ${pkg.isHighlighted ? 'border-navy' : 'border-ew-border'} rounded-xl overflow-hidden`}>
                <div
                  className={`${pkg.isHighlighted ? 'bg-navy' : 'bg-ew-footer'} p-5`}
                  style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}
                >
                  {pkg.isHighlighted && (
                    <span className="bg-green text-white text-[10px] font-semibold rounded-full px-2.5 py-0.5 mb-2 inline-block" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
                      Most popular
                    </span>
                  )}
                  <p className={`text-[11px] font-semibold uppercase tracking-[0.15em] mb-2 ${pkg.isHighlighted ? 'text-white/50' : 'text-ew-muted'}`}>
                    {pkg.name}
                  </p>
                  <p className={`text-2xl font-bold ${pkg.isHighlighted ? 'text-white' : 'text-navy'}`}>{pkg.price}</p>
                </div>
                <div className="p-5">
                  {pkg.features.map((f, i) => (
                    <CheckItem key={i} text={f} muted={!pkg.isHighlighted && key === 'essential'} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* Show single selected package */
          <div className="border-2 border-navy rounded-xl overflow-hidden max-w-sm">
            <div className="bg-navy p-6" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
              <p className="text-[10px] font-semibold text-white/50 uppercase tracking-[0.15em] mb-2">Your package</p>
              <p className="text-xl font-bold text-white">{onboardingName}</p>
              <p className="text-white/50 text-sm mt-1">{onboardingPrice}</p>
            </div>
            <div className="p-6">
              {(PACKAGES[onboardingKey]?.features || []).map((f, i) => (
                <CheckItem key={i} text={f} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}