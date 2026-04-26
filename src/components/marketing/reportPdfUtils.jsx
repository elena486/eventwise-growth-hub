import { jsPDF } from 'jspdf';

function parse(report, key) {
  try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; }
}

export function generateReportPDF(report) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const w = parse(report, 'websiteData');
  const li = parse(report, 'chrisLinkedInData');
  const cp = parse(report, 'companyPageData');
  const nl = parse(report, 'newsletterData');

  const PAGE_W = 210;
  const MARGIN = 16;
  const CONTENT_W = PAGE_W - MARGIN * 2;
  const NAVY = [36, 36, 80]; // #242450
  const PURPLE = [132, 3, 197]; // #8403C5
  const GREY = [107, 114, 128];
  const BLACK = [17, 24, 39];
  const WHITE = [255, 255, 255];

  let y = 0;

  // ── Header banner ──────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 28, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...WHITE);
  doc.text('Eventwise', MARGIN, 13);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(200, 200, 220);
  doc.text('Monthly Marketing Report', MARGIN, 20);

  // Report title (right side)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...WHITE);
  doc.text(`${report.month} ${report.year}`, PAGE_W - MARGIN, 17, { align: 'right' });

  y = 36;

  // ── Section renderer ────────────────────────────────────────────────────────
  const sectionHeader = (title) => {
    doc.setFillColor(...PURPLE);
    doc.rect(MARGIN, y, 3, 6, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...NAVY);
    doc.text(title, MARGIN + 6, y + 5);
    y += 10;
  };

  const metricRow = (label, value) => {
    if (!value) return;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    doc.text(String(value), MARGIN + CONTENT_W, y, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    doc.text(label, MARGIN, y);
    y += 7;
  };

  const notes = (text) => {
    if (!text) return;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    doc.text(lines, MARGIN, y);
    y += lines.length * 5 + 2;
  };

  const divider = () => {
    doc.setDrawColor(230, 230, 240);
    doc.setLineWidth(0.3);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 6;
  };

  // ── Website ──────────────────────────────────────────────────────────────────
  sectionHeader('Website');
  metricRow('Active Users', w.activeUsers);
  metricRow('Sessions', w.sessions);
  metricRow('New Users', w.newUsers);
  metricRow('Engaged Sessions (%)', w.engagedSessions);
  metricRow('Top Traffic Source', w.topTrafficSource);
  metricRow('GSC Impressions', w.gscImpressions);
  metricRow('GSC Clicks', w.gscClicks);
  metricRow('GSC Avg Position', w.gscAvgPosition);
  notes(w.notes);
  divider();

  // ── Chris LinkedIn ────────────────────────────────────────────────────────────
  sectionHeader('Chris LinkedIn');
  metricRow('Total Impressions', li.totalImpressions);
  metricRow('Unique Members Reached', li.uniqueMembersReached);
  metricRow('New Followers', li.newFollowers);
  metricRow('Engagement', li.engagement);
  metricRow('Top Post', li.topPostTitle);
  notes(li.notes);
  divider();

  // ── Company Page ──────────────────────────────────────────────────────────────
  sectionHeader('Company Page (Eventwise)');
  metricRow('Total Impressions', cp.totalImpressions);
  metricRow('Unique Visitors', cp.uniqueVisitors);
  metricRow('New Followers', cp.newFollowers);
  metricRow('Posts Published', cp.postsPublished);
  metricRow('Engagement', cp.engagement);
  notes(cp.notes);
  divider();

  // ── Newsletter ────────────────────────────────────────────────────────────────
  sectionHeader('Newsletter');
  metricRow('Subject', nl.subjectLine);
  metricRow('Send Date', nl.sendDate);
  metricRow('List Size', nl.listSize);
  metricRow('Open Rate', nl.openRate ? nl.openRate + '%' : null);
  metricRow('Click Rate', nl.clickRate ? nl.clickRate + '%' : null);
  metricRow('Unsubscribes', nl.unsubscribes);
  notes(nl.notes);

  // ── Footer ────────────────────────────────────────────────────────────────────
  const PAGE_H = 297;
  doc.setFillColor(...NAVY);
  doc.rect(0, PAGE_H - 12, PAGE_W, 12, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(`Eventwise Monthly Marketing Report — ${report.month} ${report.year} — Confidential`, PAGE_W / 2, PAGE_H - 5, { align: 'center' });

  doc.save(`Eventwise_Marketing_Report_${report.month}_${report.year}.pdf`);
}