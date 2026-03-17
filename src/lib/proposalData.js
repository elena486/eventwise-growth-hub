export const PLANS = {
  starter: { name: 'Starter', price: 299 },
  professional: { name: 'Professional', price: 499 },
  business: { name: 'Business', price: 799 },
};

export const PLAN_FEATURES = {
  starter: [
    'Budget creation and scenario planning',
    'Real-time budget vs actuals tracking',
    'Up to 10 cost/revenue departments',
    '5 user seats included',
    'Basic approval workflows',
    'Revenue and supplier invoice templates',
    'Xero integration',
    'Ticket seller integrations (Eventbrite, Skiddle, Ticketmaster)',
  ],
  professional: [
    'Purchase approvals and automated workflows',
    'Scenario budgeting and forecasting',
    'Up to 15 departments · 10 user seats',
    'Multi-currency support',
    'Custom permissions',
    'Priority support from account manager',
    'Revenue and supplier invoice templates',
    'Xero + ticket seller integrations',
  ],
  business: [
    'Unlimited departments · 20 user seats',
    'Multi-event portfolio dashboard',
    'Advanced reporting and analytics',
    'API access for integrations',
    'Dedicated account manager',
    'Half-day team training session',
    'All Professional features included',
    'Xero + ticket seller integrations',
  ],
};

export const DEFAULT_ACCOUNTING_SERVICES = [
  'Monthly reconciliation and invoicing',
  'End of year accounts and tax returns',
  'Payroll and VAT returns',
  'Weekly pay runs and credit control',
  'Quarterly financial reviews',
  'Bespoke post-event reporting with KPIs',
  'VAT management and HMRC filing',
  'Custom reporting and strategic support',
];

export const ONBOARDING_PACKAGES = {
  essential: { name: 'Success Essential', shortName: 'Essential', price: 0, priceLabel: 'Free' },
  plus: { name: 'Success Plus', shortName: 'Plus', price: 1500, priceLabel: '£1,500' },
  premium: { name: 'Success Premium', shortName: 'Premium', price: 5000, priceLabel: '£5,000' },
};

export const ONBOARDING_FEATURES = {
  essential: [
    'Dedicated account manager from day one',
    'Full kick-off call and account setup',
    'Four weekly check-in meetings',
    'One past budget uploaded for you',
    'Custom Eventwise training session',
    'Team drop-in session post-training',
    'Monthly check-ins after going live',
    'Ongoing help and support',
  ],
  plus: [
    'Dedicated account manager from day one',
    'Full kick-off call and account setup',
    'Four weekly check-in meetings',
    'One past budget uploaded for you',
    'Custom Eventwise training session',
    'Team drop-in session post-training',
    'Monthly check-ins after going live',
    'Ongoing help and support',
    'Free budget consultation and restructure',
    'Extra budget upload of your choice',
    'One on-site training day (4 hours)',
    '4 additional drop-in sessions for your team',
  ],
  premium: [
    'Dedicated account manager from day one',
    'Full kick-off call and account setup',
    'Four weekly check-in meetings',
    'Custom Eventwise training session',
    'Team drop-in session post-training',
    'Free budget consultation and restructure',
    'Upload of 50 past event budgets',
    'Two on-site training days (4 hours each)',
    '12 additional weekly meetings post go-live',
    'Ongoing help and support',
  ],
};

export const PLATFORM_FEATURES = [
  { emoji: '📊', title: 'Live budget control', desc: 'Budgets update in real-time as sales come in and expenses are logged.' },
  { emoji: '✅', title: 'Smart approvals', desc: 'Set rules for purchases and changes. Track who approved what.' },
  { emoji: '🔮', title: 'Scenario planning', desc: 'Model best, expected and worst case side-by-side before committing.' },
  { emoji: '🎟', title: 'Ticket tracking', desc: 'Live ticket sales from every platform in one dashboard.' },
  { emoji: '💸', title: 'Sales invoicing', desc: 'All revenue streams — tickets, sponsorship, traders — in one place.' },
  { emoji: '🔗', title: 'Xero integration', desc: 'Accounting data syncs in real-time. No manual reconciliation.' },
];

export const TIMELINE_STEPS = [
  { step: 1, label: 'Foundation', time: 'Day 1–2' },
  { step: 2, label: 'Configuration', time: 'Day 2–3' },
  { step: 3, label: 'Enablement', time: 'Week 1–2' },
  { step: 4, label: 'Launch', time: 'Week 2–3' },
];

export const LOGO_BLACK = 'https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/be171ff38_Logo_b1.png';
export const LOGO_WHITE = 'https://media.base44.com/images/public/user_68b97f79c23bb75318e10794/0142a0222_Logo_w.png';