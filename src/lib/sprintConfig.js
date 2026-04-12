export const MEMBERS = [
  {
    name: 'Chris Carter',
    role: 'CEO + Customer Success',
    questions: [
      { id: 'q1', label: 'Revenue-generating actions completed this week', type: 'number' },
      { id: 'q2', label: 'Sales conversations had this week', type: 'number' },
      { id: 'q3', label: '£ value of pipeline moved forward this week', type: 'number', prefix: '£' },
      { id: 'q4', label: 'Key decision or bottleneck resolved this week', type: 'text' },
      { id: 'q5', label: '#1 priority for next week', type: 'text' },
      { id: 'q6', label: 'Active client touchpoints completed this week', type: 'number' },
      { id: 'q7', label: 'Accounts at risk (churn/low engagement)', type: 'number' },
      { id: 'q8', label: 'Issues or requests resolved this week', type: 'number' },
      { id: 'q9', label: 'Top risk account + next action', type: 'text' },
    ],
    kpi1: { id: 'q2', label: 'Sales conversations', target: 10 },
    kpi2: { id: 'q3', label: '£ pipeline moved', target: 10000, prefix: '£' },
    qualitativeIds: ['q4', 'q5', 'q9'],
  },
  {
    name: 'Ramesh',
    role: 'Fractional CRO',
    questions: [
      { id: 'q1', label: 'Pipeline value added this week', type: 'number', prefix: '£' },
      { id: 'q2', label: 'Total pipeline value right now', type: 'number', prefix: '£' },
      { id: 'q3', label: 'Conversion rate to demo %', type: 'number', suffix: '%' },
      { id: 'q4', label: 'Forecast vs target (£)', type: 'number', prefix: '£' },
    ],
    kpi1: { id: 'q1', label: 'Pipeline added £', target: 20000, prefix: '£' },
    kpi2: { id: 'q3', label: 'Conversion rate %', target: 20, suffix: '%' },
    qualitativeIds: [],
  },
  {
    name: 'Elena Brouckaert',
    role: 'Marketing',
    questions: [
      { id: 'q1', label: 'New inbound leads generated', type: 'number' },
      { id: 'q2', label: 'Leads qualified / sales-ready', type: 'number' },
      { id: 'q3', label: 'Total traffic or key channel growth %', type: 'number', suffix: '%' },
      { id: 'q4', label: 'Campaigns or assets launched', type: 'number' },
    ],
    kpi1: { id: 'q1', label: 'Inbound leads', target: 5 },
    kpi2: { id: 'q4', label: 'Campaigns launched', target: 2 },
    qualitativeIds: [],
    allowDuplicateLast: true,
  },
  {
    name: 'George',
    role: 'Outbound Lead Generation',
    questions: [
      { id: 'q1', label: 'New leads added this week', type: 'number' },
      { id: 'q2', label: 'Responses received', type: 'number' },
      { id: 'q3', label: 'Meetings booked', type: 'number' },
      { id: 'q4', label: 'What worked best this week', type: 'text' },
    ],
    kpi1: { id: 'q1', label: 'New leads', target: 50 },
    kpi2: { id: 'q3', label: 'Meetings booked', target: 5 },
    qualitativeIds: ['q4'],
  },
  {
    name: 'Martinique',
    role: 'Customer Success',
    questions: [
      { id: 'q1', label: 'Active client touchpoints completed this week', type: 'number' },
      { id: 'q2', label: 'Accounts at risk', type: 'number' },
      { id: 'q3', label: 'Issues or requests resolved this week', type: 'number' },
      { id: 'q4', label: 'Top risk account + next action', type: 'text' },
    ],
    kpi1: { id: 'q1', label: 'Touchpoints', target: 10 },
    kpi2: { id: 'q2', label: 'At-risk accounts', target: 0, invertRag: true },
    qualitativeIds: ['q4'],
  },
  {
    name: 'Sreeja',
    role: 'QA',
    questions: [
      { id: 'q1', label: 'Test cases completed this week', type: 'number' },
      { id: 'q2', label: 'Bugs identified', type: 'number' },
      { id: 'q3', label: 'Bugs resolved', type: 'number' },
      { id: 'q4', label: 'Any blockers or issues to flag', type: 'text' },
    ],
    kpi1: { id: 'q1', label: 'Test cases', target: 20 },
    kpi2: { id: 'q2', label: 'Bugs identified', target: 0, invertRag: true },
    qualitativeIds: ['q4'],
  },
];

export function getMonday(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString().split('T')[0];
}

export function getWeekNumber(dateStr) {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const week = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  const month = d.getMonth();
  const weekOfMonth = Math.ceil((d.getDate() + new Date(d.getFullYear(), d.getMonth(), 1).getDay()) / 7);
  return `Week ${weekOfMonth} of ~4`;
}

export function calcRag(value, kpiConfig) {
  if (kpiConfig.target === 0) {
    if (kpiConfig.invertRag) {
      if (value === 0) return 'green';
      if (value <= 2) return 'amber';
      return 'red';
    }
    return 'green';
  }
  if (kpiConfig.invertRag) {
    if (value === 0) return 'green';
    const pct = value / kpiConfig.target;
    if (pct <= 1.2) return 'amber';
    return 'red';
  }
  const pct = value / kpiConfig.target;
  if (pct >= 1) return 'green';
  if (pct >= 0.8) return 'amber';
  return 'red';
}

export function ragColor(rag) {
  if (rag === 'green') return '#1D9E75';
  if (rag === 'amber') return '#F59E0B';
  return '#EF4444';
}

export function formatKpiValue(value, kpiConfig) {
  if (value == null || value === '') return '—';
  const prefix = kpiConfig.prefix || '';
  const suffix = kpiConfig.suffix || '';
  const formatted = kpiConfig.prefix === '£' ? Number(value).toLocaleString('en-GB') : value;
  return `${prefix}${formatted}${suffix}`;
}