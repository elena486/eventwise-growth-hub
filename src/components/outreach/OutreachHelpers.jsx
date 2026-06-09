// Shared helpers for outreach analytics

export function calcPositiveReplyRate(c) {
  if (!c.emailsSent || !c.positiveReplies) return 0;
  return (c.positiveReplies / c.emailsSent) * 100;
}

export function calcMeetingConversionRate(c) {
  if (!c.emailsSent || !c.meetingsBooked) return 0;
  return (c.meetingsBooked / c.emailsSent) * 100;
}

export function calcPerformanceScore(c) {
  const openRate = parseFloat(c.openRate) || 0;
  const clickRate = parseFloat(c.clickRate) || 0;
  const prr = calcPositiveReplyRate(c);
  const mcr = calcMeetingConversionRate(c);

  // Benchmarks: open <30 poor, 30-45 avg, 45-60 good, >60 excellent (ceiling 80)
  // click <5 poor, 5-15 avg, 15-25 good, >25 excellent (ceiling 40)
  // prr <0.5 poor, 0.5-1 avg, 1-2 good, >2 excellent (ceiling 5)
  // mcr ceiling 3 (early stage)
  const normOpen = Math.min(openRate / 80, 1);
  const normClick = Math.min(clickRate / 40, 1);
  const normPRR = Math.min(prr / 5, 1);
  const normMCR = Math.min(mcr / 3, 1);

  // Weights: open 35%, click 35%, reply 20%, meeting 10%
  const score = (normOpen * 0.35 + normClick * 0.35 + normPRR * 0.20 + normMCR * 0.10) * 10;
  return Math.round(score * 10) / 10;
}

export function getVerdict(score) {
  if (score >= 7) return { label: '🏆 Winner — use more', cls: 'bg-green-100 text-green-700' };
  if (score >= 5) return { label: '✅ Good — keep testing', cls: 'bg-blue-100 text-blue-700' };
  if (score >= 3) return { label: '⚠️ Average — review', cls: 'bg-amber-100 text-amber-700' };
  return { label: '❌ Kill it', cls: 'bg-red-100 text-red-600' };
}

export function getAssetVerdict(avgClick, avgMCR) {
  if (avgClick >= 10 && avgMCR >= 2) return { label: '🏆 High performer', cls: 'bg-green-100 text-green-700' };
  if (avgClick >= 8 && avgMCR < 2) return { label: '⚠️ Weak asset — revisit content', cls: 'bg-amber-100 text-amber-700' };
  return { label: '❌ Drop this asset', cls: 'bg-red-100 text-red-600' };
}

export function fmtPct(n) {
  if (n == null || isNaN(n)) return '—';
  return n.toFixed(1) + '%';
}

export function exportCSV(rows, columns, filename) {
  const header = columns.map(c => `"${c.label}"`).join(',');
  const body = rows.map(r => columns.map(c => `"${(r[c.key] ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const csv = header + '\n' + body;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}