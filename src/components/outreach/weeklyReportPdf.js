import { jsPDF } from 'jspdf';
import { startOfWeek, addDays, format, subWeeks, parseISO } from 'date-fns';

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
const AMBER_BG = [255, 251, 235];

function cleanSubj(s) {
  return (s || '(no subject)').replace(/\{\{contact\.first_name\}\}/gi, '[First name]');
}

function getWeekRange(weeksAgo = 0) {
  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const adjusted = subWeeks(monday, weeksAgo);
  const friday = addDays(adjusted, 4);
  return { monday: adjusted, friday };
}

export function getWeekLabel(weeksAgo = 0) {
  const r = getWeekRange(weeksAgo);
  return {
    weekOf: `Week of ${format(r.monday, 'd MMM')} – ${format(r.friday, 'd MMM yyyy')}`,
    fridayDate: format(r.friday, 'd MMM yyyy'),
    fridayFile: format(r.friday, 'yyyy-MM-dd'),
    weekOfDate: format(r.monday, 'yyyy-MM-dd'),
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

export function weeksAgoFromWeekOf(weekOfDate) {
  if (!weekOfDate) return 0;
  const currentMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const target = parseISO(weekOfDate);
  const msPerWeek = 7 * 24 * 60 * 60 * 1000;
  return Math.max(0, Math.round((currentMonday - target) / msPerWeek));
}

export function generateAiReportPdf(aiSummary, commentary, weeksAgo = 0) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PAGE_W = 210, PAGE_H = 297, MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  let y = MARGIN;

  const r = getWeekRange(weeksAgo);
  const weekLabel = `Week of ${format(r.monday, 'd MMM')} - ${format(r.friday, 'd MMM yyyy')}`;
  const todayStr = format(new Date(), 'd MMM yyyy');

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
  doc.text(weekLabel, MARGIN, y + 19);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...LGREY);
  doc.text(`Prepared by George Nell · ${todayStr}`, PAGE_W - MARGIN, y + 5, { align: 'right' });

  y += 23;
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.5);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 7;

  // ── DATA QUALITY WARNING (if exists) ──
  if (aiSummary.data_quality_note) {
    const dqLines = doc.splitTextToSize(`Note: ${aiSummary.data_quality_note}`, CONTENT_W - 14);
    const boxH = Math.max(10, dqLines.length * 5 + 4);
    doc.setFillColor(...AMBER_BG);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...AMBER);
    doc.text('!', MARGIN + 4, y + 6);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    dqLines.forEach((line, i) => {
      doc.text(line, MARGIN + 10, y + 6 + i * 5);
    });
    y += boxH + 6;
  }

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
  const hn = aiSummary.headline_numbers || {};
  const stats = [
    { label: 'Emails Sent', val: hn.emails_sent != null ? String(hn.emails_sent) : '—' },
    { label: 'Avg Open Rate', val: hn.avg_open_rate || '—' },
    { label: 'Avg Reply Rate', val: hn.avg_reply_rate || '—' },
    { label: 'Meetings Booked', val: hn.meetings_booked != null ? String(hn.meetings_booked) : '—' },
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

  // ── SECTION 2 — AI OBSERVATIONS ──
  if (aiSummary.ai_observations) {
    sectionHeader('This Week at a Glance');
    const obsLines = doc.splitTextToSize(aiSummary.ai_observations, CONTENT_W - 12);
    const boxH = obsLines.length * 5 + 8;
    doc.setFillColor(...BG_TINT);
    doc.roundedRect(MARGIN, y, CONTENT_W, boxH, 2, 2, 'F');
    doc.setFillColor(...PURPLE);
    doc.rect(MARGIN, y, 2.5, boxH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(...NAVY);
    obsLines.forEach((line, i) => {
      doc.text(line, MARGIN + 6, y + 6 + i * 5);
    });
    y += boxH + 7;
  }

  // ── SECTION 3 — BEST PERFORMING SUBJECT LINES ──
  const topPerforming = (aiSummary.top_performing || []).slice(0, 3);
  if (topPerforming.length > 0) {
    sectionHeader('Best Performing Subject Lines');
    topPerforming.forEach((c, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...LGREY);
      doc.text(`${i + 1}.`, MARGIN + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      const subjLines = doc.splitTextToSize(cleanSubj(c.subject_line), CONTENT_W - 12);
      doc.text(subjLines[0], MARGIN + 9, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.campaign || '', MARGIN + 9, y + 8);
      const metricsText = `Open ${c.open_rate || '—'}   Click ${c.click_rate || '—'}   Reply ${c.reply_rate || '—'}`;
      doc.text(metricsText, MARGIN + 9, y + 12);
      if (c.why) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(...LGREY);
        const whyLines = doc.splitTextToSize(c.why, CONTENT_W - 12);
        doc.text(whyLines[0], MARGIN + 9, y + 16);
        y += 5;
      }
      y += 15;
    });
    y += 3;
  }

  // ── SECTION 4 — NEEDS ATTENTION ──
  const underperforming = (aiSummary.underperforming || []).slice(0, 3);
  if (underperforming.length > 0) {
    sectionHeader('Needs Attention');
    underperforming.forEach((c, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(...LGREY);
      doc.text(`${i + 1}.`, MARGIN + 2, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(...NAVY);
      const subjLines = doc.splitTextToSize(cleanSubj(c.subject_line), CONTENT_W - 12);
      doc.text(subjLines[0], MARGIN + 9, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.campaign || '', MARGIN + 9, y + 8);
      if (c.issue) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(...RED);
        const issueLines = doc.splitTextToSize(c.issue, CONTENT_W - 12);
        doc.text(issueLines[0], MARGIN + 9, y + 12);
      }
      y += 15;
    });
    y += 3;
  }

  // ── SECTION 5 — ACTIVE CAMPAIGNS ──
  const campaigns = aiSummary.campaign_snapshot || [];
  if (campaigns.length > 0) {
    sectionHeader('Active Campaigns');
    const showList = campaigns.slice(0, 8);
    showList.forEach(c => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(...NAVY);
      const nameLines = doc.splitTextToSize(c.name || '—', 70);
      doc.text(nameLines[0], MARGIN + 2, y + 4);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      const sent = c.emails_sent != null ? `${c.emails_sent} sent` : '—';
      const detail = `${sent}   ·   ${c.open_rate || '—'}`;
      doc.text(detail, MARGIN + 75, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text(c.status || '—', PAGE_W - MARGIN, y + 4, { align: 'right' });
      y += 6.5;
    });
    if (campaigns.length > 8) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7.5);
      doc.setTextColor(...LGREY);
      doc.text(`+ ${campaigns.length - 8} more campaigns · Full breakdown at eventwise-hq.base44.app`, MARGIN + 2, y + 4);
      y += 7;
    }
    y += 3;
  }

  // ── SECTION 6 — GEORGE'S NOTES ──
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
  doc.text('Full analytics in Eventwise HQ  >  Sales  >  Outreach Analytics', MARGIN, y);
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