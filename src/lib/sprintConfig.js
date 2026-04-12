export const MEMBERS = [
  {
    id: 'chris',
    name: 'Chris Carter',
    role: 'CEO + Customer Success',
    questions: [
      // CEO section
      { id: 'q1', label: 'Revenue-generating actions completed this week', type: 'number', section: 'CEO' },
      { id: 'q2', label: 'Sales conversations had this week', type: 'number', section: 'CEO' },
      { id: 'q3', label: '£ value of pipeline moved forward this week', type: 'number', prefix: '£', section: 'CEO' },
      { id: 'q4', label: 'Key decision or bottleneck resolved this week', type: 'text', section: 'CEO' },
      { id: 'q5', label: '#1 priority for next week', type: 'text', section: 'CEO' },
      // CS section
      { id: 'q6', label: 'Active client touchpoints completed this week', type: 'number', section: 'Customer Success' },
      { id: 'q7', label: 'Accounts at risk (churn/low engagement)', type: 'number', section: 'Customer Success' },
      { id: 'q8', label: 'Issues or requests resolved this week', type: 'number', section: 'Customer Success' },
      { id: 'q9', label: 'Top risk account + next action', type: 'text', section: 'Customer Success' },
    ],
    kpi1: { questionId: 'q2', label: 'Sales conversations', target: 10, unit: '' },
    kpi2: { questionId: 'q3', label: '£ pipeline moved', target: 10000, prefix: '£' },
    qualitativeIds: ['q4', 'q5', 'q9'],
    duplicateLastMonth: false,
  },
  {
    id: 'ramesh',
    name: 'Ramesh',
    role: 'Fractional CRO',
    questions: [
      { id: 'q1', label: 'Pipeline value added this week', type: 'number', prefix: '£' },
      { id: 'q2', label: 'Total pipeline value right now', type: 'number', prefix: '£' },
      { id: 'q3', label: 'Conversion rate to demo %', type: 'number', suffix: '%' },
      { id: 'q4', label: 'Forecast vs target (£)', type: 'number', prefix: '£' },
    ],
    kpi1: { questionId: 'q1', label: 'Pipeline added', target: 20000, prefix: '£' },
    kpi2: { questionId: 'q3', label: 'Conversion rate', target: 20, suffix: '%' },
    qualitativeIds: [],
    duplicateLastMonth: false,
  },
  {
    id: 'elena',
    name: 'Elena Brouckaert',
    role: 'Marketing',
    questions: [
      { id: 'q1', label: 'New inbound leads generated', type: 'number' },
      { id: 'q2', label: 'Leads qualified / sales-ready', type: 'number' },
      { id: 'q3', label: 'Total traffic or key channel growth %', type: 'number', suffix: '%' },
      { id: 'q4', label: 'Campaigns or assets launched', type: 'number' },
    ],
    kpi1: { questionId: 'q1', label: 'Inbound leads', target: 5, unit: '' },
    kpi2: { questionId: 'q4', label: 'Campaigns launched', target: 2, unit: '' },
    qualitativeIds: [],
    duplicateLastMonth: true,
  },
  {
    id: 'george',
    name: 'George',
    role: 'Outbound Lead Generation',
    questions: [
      { id: 'q1', label: 'New leads added this week', type: 'number' },
      { id: 'q2', label: 'Responses received', type: 'number' },
      { id: 'q3', label: 'Meetings booked', type: 'number' },
      { id: 'q4', label: 'What worked best this week', type: 'text' },
    ],
    kpi1: { questionId: 'q1', label: 'New leads', target: 50, unit: '' },
    kpi2: { questionId: 'q3', label: 'Meetings booked', target: 5, unit: '' },
    qualitativeIds: ['q4'],
    duplicateLastMonth: false,
  },
  {
    id: 'martinique',
    name: 'Martinique',
    role: 'Customer Success',
    questions: [
      { id: 'q1', label: 'Active client touchpoints completed this week', type: 'number' },
      { id: 'q2', label: 'Accounts at risk', type: 'number' },
      { id: 'q3', label: 'Issues or requests resolved this week', type: 'number' },
      { id: 'q4', label: 'Top risk account + next action', type: 'text' },
    ],
    kpi1: { questionId: 'q1', label: 'Touchpoints', target: 10, unit: '' },
    kpi2: { questionId: 'q2', label: 'At-risk accounts', target: 0, unit: '' },
    qualitativeIds: ['q4'],
    duplicateLastMonth: false,
  },
  {
    id: 'sreeja',
    name: 'Sreeja',
    role: 'QA',
    questions: [
      { id: 'q1', label: 'Test cases completed this week', type: 'number' },
      { id: 'q2', label: 'Bugs identified', type: 'number' },
      { id: 'q3', label: 'Bugs resolved', type: 'number' },
      { id: 'q4', label: 'Any blockers or issues to flag', type: 'text' },
    ],
    kpi1: { questionId: 'q1', label: 'Test cases', target: 20, unit: '' },
    kpi2: { questionId: 'q2', label: 'Bugs identified', target: 0, unit: '' },
    qualitativeIds: ['q4'],
    duplicateLastMonth: false,
  },
];

export function getMemberById(id) {
  return MEMBERS.find(m => m.id === id);
}

export function getMemberByName(name) {
  return MEMBERS.find(m => m.name === name);
}

/** ISO date string for Monday of the current week */
export function currentWeekStart() {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().split('T')[0];
}

/** Week number within a 4-week monthly cycle (1–4) */
export function weekOfMonth(weekStartStr) {
  const d = new Date(weekStartStr);
  const dom = d.getDate();
  return Math.min(Math.ceil(dom / 7), 4);
}

/** RAG colour for a KPI value vs target */
export function ragColor(value, target) {
  if (target === 0) {
    // Lower is better (e.g. at-risk accounts, bugs)
    if (value === 0) return 'green';
    if (value <= 2) return 'amber';
    return 'red';
  }
  const ratio = value / target;
  if (ratio >= 1) return 'green';
  if (ratio >= 0.8) return 'amber';
  return 'red';
}

export const RAG_STYLES = {
  green: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', label: 'On track' },
  amber: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', label: 'Near target' },
  red: { dot: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', label: 'Below target' },
};

export function formatKpiValue(value, kpi) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  const formatted = kpi.prefix === '£'
    ? '£' + n.toLocaleString('en-GB')
    : n.toLocaleString('en-GB') + (kpi.suffix || '');
  return formatted;
}