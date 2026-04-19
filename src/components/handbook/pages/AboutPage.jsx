import React from 'react';
import HandbookPageShell from '../HandbookPageShell';

const SECTIONS = [
  {
    heading: 'What we do',
    body: `Eventwise is the end-to-end event budgeting platform that gives event organisers, festivals, and agencies complete control of their finances. We replace spreadsheets with a single platform covering budgets, spend tracking, approvals, ticket revenue, and financial reporting — all updating live.`,
  },
  {
    heading: 'Core platform features',
    bullets: [
      'Budget creation and live spend tracking',
      'Approval workflows and budget holder permissions',
      'Ticket revenue and sales tracking (integrations with Eventbrite, Skiddle, Ticketmaster, See Tickets)',
      'Scenario planning and cash flow forecasting',
      'Multi-event reporting and organisation dashboard',
      'Xero integration — sync department codes, account codes, and payments',
    ],
  },
  {
    heading: 'Who we serve',
    body: `Event planners, festival organisers, and event agencies of all sizes — particularly independent festivals and multi-event businesses in the UK that need proper financial infrastructure without enterprise complexity.`,
  },
  {
    heading: 'Business context',
    body: `Founded by Chris Carter. UK-based. Currently raising a seed round and in active growth mode. Elena works remotely from South Africa (SAST, UTC+2). Website: `,
    link: { href: 'https://eventwise.com', label: 'eventwise.com' },
  },
];

export default function AboutPage({ section, page, onUpdate, onDelete }) {
  return (
    <HandbookPageShell section={section} page={page} onUpdate={onUpdate} onDelete={onDelete}>
      <div className="space-y-6">
        {SECTIONS.map((s, i) => (
          <div key={i}>
            <h2 className="text-sm font-bold text-navy mb-2 uppercase tracking-[0.06em]">{s.heading}</h2>
            {s.bullets ? (
              <ul className="space-y-1.5">
                {s.bullets.map((b, j) => (
                  <li key={j} className="flex items-start gap-2 text-sm text-ew-body">
                    <span className="text-[#8403C5] mt-1 shrink-0">•</span>
                    {b}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-ew-body leading-relaxed">
                {s.body}
                {s.link && (
                  <a href={s.link.href} target="_blank" rel="noopener noreferrer"
                    className="text-[#8403C5] hover:underline">{s.link.label}</a>
                )}
              </p>
            )}
          </div>
        ))}
      </div>
    </HandbookPageShell>
  );
}