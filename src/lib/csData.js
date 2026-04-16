export const ONBOARDING_PHASES = [
  {
    phase: 1, label: 'Foundation',
    tasks: [
      'Kick-off call completed',
      'Budget processes mapped',
      'Approval workflows mapped',
      'Account categories configured',
      'Account set up reviewed and signed off',
    ],
  },
  {
    phase: 2, label: 'Configuration',
    tasks: [
      'Xero connected',
      'Ticket sellers connected',
      'First budget uploaded',
      'Integrations tested',
    ],
  },
  {
    phase: 3, label: 'Enablement',
    tasks: [
      'Team roles mapped to Eventwise',
      'Training programme built',
      'Live training session completed',
      'Post-training drop-in done',
    ],
  },
  {
    phase: 4, label: 'Launch',
    tasks: [
      'Final system checks done',
      'Go-live confirmed',
      'Dedicated support call booked',
      'Monthly check-in scheduled',
    ],
  },
];

export const OWNERS = ['Chris Carter', 'Martinique Keeler'];
export const SECONDARY_OWNERS = ['Chris Carter', 'Martinique Keeler', 'None'];
export const STATUSES = ['Trial', 'Onboarding', 'Live', 'Churn'];

export function calcHealth(scores) {
  const { emails = 0, meetings = 0, goals = 0, adoption = 0, knowledge = 0, cx = 0, issues = 0 } = scores;
  const total = emails + meetings + goals + adoption + knowledge + cx + issues;
  const rating = total >= 28 ? 'Green' : total >= 18 ? 'Yellow' : 'Red';
  const qor = (emails + meetings) / 2;
  const roi = (goals + adoption + knowledge + cx + issues) / 5;
  let quadrant;
  if (qor >= 3.5 && roi >= 3.5) quadrant = 'Q4 – High QOR / High ROI';
  else if (qor < 3.5 && roi >= 3.5) quadrant = 'Q3 – Low QOR / High ROI';
  else if (qor >= 3.5 && roi < 3.5) quadrant = 'Q2 – High QOR / Low ROI';
  else quadrant = 'Q1 – Low QOR / Low ROI';
  return { total, rating, quadrant };
}

export function initTasks(preloadPhase = 0, preloadTasks = {}) {
  return ONBOARDING_PHASES.flatMap((p) =>
    p.tasks.map((t, ti) => {
      const key = `${p.phase}-${ti}`;
      return {
        phase: p.phase,
        taskName: t,
        completed: preloadTasks[key] || false,
        completedDate: null,
        notes: '',
      };
    })
  );
}

export const STATUS_STYLES = {
  Trial: 'bg-[#F3F4F6] text-[#6B7280]',
  Onboarding: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Live: 'bg-[#DCFCE7] text-[#15803D]',
  Churn: 'bg-[#FEE2E2] text-[#B91C1C]',
};

export const HEALTH_DOT = {
  Green: 'bg-emerald-500',
  Yellow: 'bg-amber-400',
  Red: 'bg-red-500',
};

export const OWNER_INITIALS = {
  'Chris Carter': 'CC',
  'Martinique Keeler': 'MK',
};

export const OWNER_COLORS = {
  'Chris Carter': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Martinique Keeler': 'bg-[#F3E8FF] text-[#7E22CE]',
};