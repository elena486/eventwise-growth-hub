export const MEMBERS = [
  {
    id: 'chris',
    name: 'Chris Carter',
    role: 'CEO + Customer Success',
    questions: [
      { id: 'q1', label: 'Revenue-generating actions completed this week', type: 'number', section: 'CEO' },
      { id: 'q2', label: 'Sales conversations had this week', type: 'number', section: 'CEO' },
      { id: 'q3', label: '£ value of pipeline moved forward this week', type: 'number', prefix: '£', section: 'CEO' },
      { id: 'q4', label: 'Key decision or bottleneck resolved this week', type: 'text', section: 'CEO' },
      { id: 'q5', label: '#1 priority for next week', type: 'text', section: 'CEO' },
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
      { id: 'q1', label: 'New MQLs', type: 'number', targetLabel: '3 target' },
      { id: 'q2', label: 'Leads qualified / sales-ready (SQLs)', type: 'number' },
      { id: 'q3', label: 'Total traffic or key channel growth', type: 'number', suffix: '%' },
      { id: 'q4', label: 'Content or campaigns published', type: 'number', targetLabel: '4 target' },
      { id: 'q5', label: 'Confidence (1–5)', type: 'confidence' },
      { id: 'q6', label: 'Blocker (optional)', type: 'text', placeholder: 'Describe any blockers...' },
    ],
    kpi1: { questionId: 'q1', label: 'New MQLs', target: 5, unit: '' },
    kpi2: { questionId: 'q4', label: 'Campaigns published', target: 4, unit: '' },
    qualitativeIds: ['q6'],
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
      { id: 'q4', label: 'What worked best this week', type: 'text', placeholder: 'One sentence...' },
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

export function currentWeekStart() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now);
  mon.setDate(now.getDate() + diff);
  return mon.toISOString().split('T')[0];
}

export function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  const start = new Date(d.getFullYear(), 0, 1);
  const diff = d - start + (start.getTimezoneOffset() - d.getTimezoneOffset()) * 60000;
  return Math.ceil((diff / 86400000 + start.getDay() + 1) / 7);
}

export function weekOfMonth(weekStartStr) {
  const d = new Date(weekStartStr);
  return Math.min(Math.ceil(d.getDate() / 7), 4);
}

export function ragColor(value, target) {
  if (target === 0) {
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
  green: { dot: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-200', label: 'On track' },
  amber: { dot: 'bg-amber-400', text: 'text-amber-700', bg: 'bg-amber-50', border: 'border-amber-200', label: 'At risk' },
  red: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Off track' },
};

export function formatKpiValue(value, kpi) {
  if (value == null || value === '') return '—';
  const n = Number(value);
  if (isNaN(n)) return '—';
  if (kpi.prefix === '£') return '£' + n.toLocaleString('en-GB');
  return n.toLocaleString('en-GB') + (kpi.suffix || '');
}

export function addWeeks(dateStr, weeks) {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split('T')[0];
}

export function subWeeks(dateStr, weeks) {
  return addWeeks(dateStr, -weeks);
}