import { jsPDF } from 'jspdf';
import { calcPerformanceScore, calcPositiveReplyRate } from './OutreachHelpers';
import { startOfWeek, addDays, format, subWeeks } from 'date-fns';

// Brand colours
const NAVY = [36, 36, 80];
const PURPLE = [132, 3, 197];
const GREY = [107, 114, 128];
const LGREY = [156, 163, 175];
const GREEN = [29, 158, 117];
const RED = [229, 62, 62];
const AMBER = [161, 98, 7];
const BORDER = [229, 231, 240];
const BG_TINT = [245, 246, 250];

function scoreColor(score) {
  if (score >= 4) return GREEN;
  if (score >= 3) return AMBER;
  return RED;
}

function getWeekRange(weeksAgo = 0) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const adjusted = subWeeks(monday, weeksAgo);
  const friday = addDays(adjusted, 4);
  const sunday = addDays(adjusted, 6);
  return {
    monday: adjusted,
    friday,
    sunday,
    monStr: format(adjusted, 'yyyy-MM-dd'),
    sunStr: format(sunday, 'yyyy-MM-dd'),
  };
}

export function generateWeeklyReportPdf(campaigns, commentary, weeksAgo = 0) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PAGE_W = 210, PAGE_H = 297, MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const thisWeekRange = getWeekRange(weeksAgo);

  // Active campaigns = everything currently live, regardless of launch date.
  // Data model stores cumulative totals, so the report reflects current state.
  const active = campaigns.filter(c => c.status === 'Active');

  const sumKey = (arr, key) => arr.reduce((s, c) => s + (parseFloat(c[key]) || 0), 0);

  // Avg Open Rate: exclude rows where Sent = 0 or Open % is blank/null
  const openRows = active.filter(c => (parseFloat(c.emailsSent) || 0) > 0 && c.openRate != null && !isNaN(parseFloat(c.openRate)));
  const avgOpen = openRows.length ? openRows.reduce((s, c) => s + parseFloat(c.openRate), 0) / openRows.length : null;

  // Avg Reply Rate: exclude rows where +Reply % is blank/null
  const replyRows = active.filter(c => (parseFloat(c.emailsSent) || 0) > 0 && c.positiveReplies != null);
  const avgReply = replyRows.length ? replyRows.reduce((s, c) => s + calcPositiveReplyRate(c), 0) / replyRows.length : null;

  const m = {
    sent: sumKey(active, 'emailsSent'),
    open: avgOpen,
    reply: avgReply,
    meetings: sumKey(active, 'meetingsBooked'),
  };

  const fmtVal = (key, val) => {
    if (val == null) return '—';
    if (key === 'sent' || key === 'meetings') return Math.round(val).toLocaleString('en-GB');
    return val.toFixed(1) + '%';
  };

  // ── HEADER ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text('Eventwise', MARGIN, y + 5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Outreach Weekly Report', MARGIN, y + 13);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  const weekLabel = `Week of ${format(thisWeekRange.monday, 'd MMM')} - ${format(thisWeekRange.friday, 'd MMM yyyy')}`;
  doc.text(weekLabel, MARGIN, y + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LGREY);
  doc.text('Prepared by George Nell', PAGE_W - MARGIN, y + 5, { align: 'right' });
  doc.text(format(new Date(), 'd MMM yyyy'), PAGE_W - MARGIN, y + 9, { align: 'right' });

  y += 23;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  // ── Section header helper ──
  const sectionHeader = (title) => {
    doc.setFillColor(...PURPLE);
    doc.rect(MARGIN, y, 2.5, 6.5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, MARGIN + 5, y + 5);
    y += 10;
  };

  // ── SECTION 1 — HEADLINE NUMBERS ──
  sectionHeader('Headline Numbers');
  const stats = [
    { label: 'Total Sent (Active Campaigns)', val: fmtVal('sent', m.sent) },
    { label: 'Avg Open Rate', val: fmtVal('open', m.open) },
    { label: 'Avg Reply Rate', val: fmtVal('reply', m.reply) },
    { label: 'Meetings Booked', val: fmtVal('meetings', m.meetings) },
  ];
  const gap = 4;
  const cardW = (CONTENT_W - gap * 3) / 4;
  const cardH = 22;
  stats.forEach((s, i) => {
    const cx = MARGIN + i * (cardW + gap);
    doc.setFillColor(...BG_TINT);
    doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(...GREY);
    doc.text(s.label.toUpperCase(), cx + 3, y + 4.5);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...NAVY);
    doc.text(s.val, cx + 3, y + 11);
  });
  y += cardH + 7;

  // ── Scored entries across all active campaigns ──
  const scored = active
    .map(c => ({ ...c, _score: calcPerformanceScore(c), _prr: calcPositiveReplyRate(c) }))
    .sort((a, b) => b._score - a._score);

  // ── SECTION 2 — TOP SUBJECT LINES ──
  const top3 = scored.slice(0, 3);
  if (top3.length > 0) {
    sectionHeader('Best Performing Subject Lines');
    top3.forEach((c, i) => {
      const sc = scoreColor(c._score);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...LGREY);
      doc.text(`${i + 1}.`, MARGIN + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      const subjLines = doc.splitTextToSize(c.subjectLine || '(no subject)', CONTENT_W - 55);
      doc.text(subjLines[0], MARGIN + 9, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.campaignName || '', MARGIN + 9, y + 8);
      const metricsText = `Open ${c.openRate != null ? c.openRate + '%' : '—'}   Click ${c.clickRate != null ? c.clickRate + '%' : '—'}   Reply ${c._prr.toFixed(1)}%`;
      doc.text(metricsText, MARGIN + 9, y + 12);
      // Score chip
      const chipW = 12;
      doc.setFillColor(...sc);
      doc.roundedRect(PAGE_W - MARGIN - chipW, y + 1, chipW, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(c._score.toFixed(1), PAGE_W - MARGIN - chipW / 2, y + 5.2, { align: 'center' });
      y += 15;
    });
    y += 3;
  }

  // ── SECTION 3 — UNDERPERFORMING ──
  const underperforming = scored.filter(c => c._score < 3.0).sort((a, b) => a._score - b._score).slice(0, 3);
  if (underperforming.length > 0) {
    sectionHeader('Underperforming - Consider Pausing');
    underperforming.forEach(c => {
      const chipW = 12;
      doc.setFillColor(...RED);
      doc.roundedRect(MARGIN + 2, y + 1, chipW, 6, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(255, 255, 255);
      doc.text(c._score.toFixed(1), MARGIN + 2 + chipW / 2, y + 5.2, { align: 'center' });
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      const subjLines = doc.splitTextToSize(c.subjectLine || '(no subject)', CONTENT_W - 28);
      doc.text(subjLines[0], MARGIN + 18, y + 4.5);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.campaignName || '', MARGIN + 18, y + 8.5);
      const reason = (c.openRate != null && c.openRate < 25)
        ? `Low open rate - ${c.openRate}%`
        : `Low reply rate - ${c._prr.toFixed(1)}%`;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...RED);
      doc.text(reason, MARGIN + 18, y + 12.5);
      y += 16;
    });
    y += 3;
  }

  // ── SECTION 4 — ACTIVE CAMPAIGNS ──
  const activeThisWeek = active;
  const activeMap = {};
  activeThisWeek.forEach(c => {
    if (!activeMap[c.campaignName]) {
      activeMap[c.campaignName] = { name: c.campaignName, audience: c.audienceSegment, tps: [], sent: 0, status: c.status };
    }
    const g = activeMap[c.campaignName];
    if (c.touchPoint) g.tps.push(c.touchPoint);
    g.sent += parseFloat(c.emailsSent) || 0;
  });
  const tpOrder = { TP1: 1, TP2: 2, TP3: 3, TP4: 4, TP5: 5, TP6: 6 };
  const maxTP = (tps) => {
    if (!tps.length) return '—';
    return [...tps].sort((a, b) => (tpOrder[b] || 0) - (tpOrder[a] || 0))[0];
  };
  const activeList = Object.values(activeMap).sort((a, b) => b.sent - a.sent);

  if (activeList.length > 0) {
    sectionHeader('Active Campaigns This Week');
    const showList = activeList.slice(0, 8);
    showList.forEach(c => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      const nameLines = doc.splitTextToSize(c.name, 65);
      doc.text(nameLines[0], MARGIN + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      const detail = `${c.audience || '—'}   ·   ${maxTP(c.tps)}   ·   ${Math.round(c.sent).toLocaleString()} sent`;
      doc.text(detail, MARGIN + 70, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.status || '—', PAGE_W - MARGIN, y + 4, { align: 'right' });
      y += 6.5;
    });
    if (activeList.length > 8) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...LGREY);
      doc.text(`${activeList.length - 8} more campaigns active - see HQ for full view`, MARGIN + 2, y + 4);
      y += 7;
    }
    y += 3;
  }

  // ── SECTION 5 — GEORGE'S COMMENTARY ──
  if (commentary && commentary.trim()) {
    sectionHeader('Notes from George');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(commentary.trim(), CONTENT_W);
    lines.forEach(line => {
      doc.text(line, MARGIN + 2, y + 4);
      y += 5;
    });
    y += 3;
  }

  // ── FOOTER ──
  y = PAGE_H - 22;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...GREY);
  doc.text('Full analytics available in Eventwise HQ  >  Sales  >  Outreach Analytics', MARGIN, y);
  y += 4;
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 5;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LGREY);
  doc.text('Eventwise - Confidential - hello@eventwise.com  ·  eventwise.com', MARGIN, y);

  return doc;
}

export function getWeekLabel(weeksAgo = 0) {
  const r = getWeekRange(weeksAgo);
  return {
    weekOf: `Week of ${format(r.monday, 'd MMM')} – ${format(r.friday, 'd MMM yyyy')}`,
    fridayDate: format(r.friday, 'd MMM yyyy'),
    fridayFile: format(r.friday, 'yyyy-MM-dd'),
  };
}

export function getWeekOptions(count = 8) {
  return Array.from({ length: count }, (_, i) => {
    const r = getWeekRange(i);
    const label = i === 0 ? 'This week' : i === 1 ? 'Last week' : `${i} weeks ago`;
    const dateRange = `${format(r.monday, 'd MMM')} – ${format(r.friday, 'd MMM yyyy')}`;
    return { value: i, label: `${label} (${dateRange})` };
  });
}