import React from 'react';

const FEATURES = [
  { emoji: '📊', title: 'Live budget control', desc: 'Budgets update in real-time as sales come in and expenses are logged.' },
  { emoji: '✅', title: 'Smart approvals', desc: 'Set rules for purchases and changes. Track who approved what and when.' },
  { emoji: '🧾', title: 'Purchase orders', desc: 'Raise, approve and track POs directly in Eventwise. Full audit trail on every spend.' },
  { emoji: '🎟', title: 'Ticket tracking', desc: 'Live ticket sales from every platform in one dashboard.' },
  { emoji: '💸', title: 'Sales invoicing', desc: 'All revenue streams — tickets, sponsorship, traders — in one place.' },
  { emoji: '🔗', title: 'Xero integration', desc: 'Accounting data syncs in real-time. No manual reconciliation.' },
];

export default function PlatformFeatures() {
  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">The platform</p>
      <h2 className="text-2xl font-bold text-navy mb-2">Everything your finance team needs</h2>
      <p className="text-ew-body-light text-sm mb-8 max-w-xl">
        Built for event teams who are tired of spreadsheets and need real visibility over every pound — from first budget line to post-event P&L.
      </p>

      <div className="grid grid-cols-3 gap-4 mb-8">
        {FEATURES.map((f, i) => (
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