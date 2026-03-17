import React from 'react';

const TERMS = [
  {
    title: 'Cancellation',
    text: 'Cancel anytime with 30 days notice. You\'ll receive a full data export and prorated refund for any unused annual period.',
  },
  {
    title: 'Your data',
    text: 'All financial data remains yours. Exported on request and securely deleted within 90 days of termination.',
  },
  {
    title: 'Confidentiality',
    text: 'Strict confidentiality of all financial data and business information, surviving termination indefinitely.',
  },
];

export default function KeyTerms() {
  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">Agreement</p>
      <h2 className="text-2xl font-bold text-navy mb-6">Key terms</h2>

      <div className="grid grid-cols-3 gap-4">
        {TERMS.map((t, i) => (
          <div key={i} className="border border-ew-border rounded-lg p-5">
            <h4 className="font-semibold text-navy text-sm mb-2">{t.title}</h4>
            <p className="text-ew-muted text-xs leading-relaxed">{t.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}