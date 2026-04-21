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

  // Normalise to 0–10 scale (assume max realistic: open 60%, click 20%, prr 15%, mcr 5%)
  const normOpen = Math.min(openRate / 60, 1);
  const normClick = Math.min(clickRate / 20, 1);
  const normPRR = Math.min(prr / 15, 1);
  const normMCR = Math.min(mcr / 5, 1);

  const score = (normOpen * 0.20 + normClick * 0.20 + normPRR * 0.35 + normMCR * 0.25) * 10;
  return Math.round(score * 10) / 10;
}

export function getVerdict(score) {
  if (score >= 8) return { label: '🏆 Winner — use more', cls: 'bg-green-100 text-green-700' };
  if (score >= 6) return { label: '✅ Good — keep testing', cls: 'bg-blue-100 text-blue-700' };
  if (score >= 4) return { label: '⚠️ Average — review', cls: 'bg-amber-100 text-amber-700' };
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
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}