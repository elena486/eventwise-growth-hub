import { jsPDF } from 'jspdf';

function parse(report, key) {
  try { return JSON.parse(report?.[key] || '{}'); } catch { return {}; }
}

function fmtNum(n) {
  if (n == null || n === '' || isNaN(Number(n))) return '—';
  const num = Number(n);
  if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return num.toLocaleString();
}

function mom(curr, prev) {
  const c = parseFloat(curr), p = parseFloat(prev);
  if (!p || isNaN(c) || isNaN(p)) return null;
  const pct = ((c - p) / Math.abs(p)) * 100;
  return { pct: Math.abs(pct).toFixed(1), up: c >= p };
}

// ASCII / Latin-1 only — renders reliably in jsPDF standard fonts.
const NO_DATA_MSG = 'Data not available this period — check integration connection';

// Brand colours
const NAVY   = [36, 36, 80];      // #242450
const NAVY_TINT = [240, 241, 248]; // #F0F1F8
const GREY   = [107, 114, 128];
const LGREY  = [156, 163, 175];
const BLACK  = [51, 51, 51];       // #333333 body text
const WHITE  = [255, 255, 255];
const GREEN  = [29, 158, 117];     // #1D9E75
const RED    = [220, 38, 38];
const BORDER = [229, 231, 240];

export function generateReportPDF(report, prevReport) {
  // A4 portrait, 20mm margins
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' });
  const PAGE_W = 210;
  const PAGE_H = 297;
  const MARGIN = 20;
  const CONTENT_W = PAGE_W - MARGIN * 2; // 170mm

  const w  = parse(report, 'websiteData');
  const li = parse(report, 'chrisLinkedInData');
  const cp = parse(report, 'companyPageData');
  const nl = parse(report, 'newsletterData');

  const pw  = prevReport ? parse(prevReport, 'websiteData') : {};
  const pli = prevReport ? parse(prevReport, 'chrisLinkedInData') : {};
  const pcp = prevReport ? parse(prevReport, 'companyPageData') : {};
  const pnl = prevReport ? parse(prevReport, 'newsletterData') : {};

  let y = MARGIN;

  // ── Helper: ensure space, add page if needed ──
  const ensure = (need) => {
    if (y + need > PAGE_H - MARGIN - 12) {
      addFooter();
      doc.addPage();
      y = MARGIN;
    }
  };

  // ── Footer (called at end of each page) ──
  function addFooter() {
    const fy = PAGE_H - 14;
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, fy - 4, PAGE_W - MARGIN, fy - 4);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(...GREY);
    doc.text(`Eventwise Monthly Marketing Report — ${report.month} ${report.year} — Confidential`, MARGIN, fy);
    doc.text('hello@eventwise.com · eventwise.com', PAGE_W - MARGIN, fy, { align: 'right' });
    const pageNum = doc.internal.getNumberOfPages();
    doc.text(String(pageNum), PAGE_W / 2, fy, { align: 'center' });
  }

  // ── Report Header ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(...NAVY);
  doc.text('Eventwise', MARGIN, y + 5);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(...GREY);
  doc.text('Monthly Marketing Report', MARGIN, y + 11);

  // Month/year + status (right aligned)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.setTextColor(...NAVY);
  doc.text(`${report.month} ${report.year}`, PAGE_W - MARGIN, y + 5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(...GREY);
  doc.text(`Status: ${report.status || 'Draft'}`, PAGE_W - MARGIN, y + 11, { align: 'right' });

  y += 16;

  // Divider
  doc.setDrawColor(...BORDER);
  doc.setLineWidth(0.3);
  doc.line(MARGIN, y, PAGE_W - MARGIN, y);
  y += 8;

  // ── Section header bar ──
  function sectionHeader(title) {
    ensure(14);
    // Light navy tint background bar with navy left accent
    doc.setFillColor(...NAVY_TINT);
    doc.rect(MARGIN, y, CONTENT_W, 9, 'F');
    doc.setFillColor(...NAVY);
    doc.rect(MARGIN, y, 2.5, 9, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, MARGIN + 6, y + 6.2);
    y += 13;
  }

  // ── No-data message ──
  function noDataMessage() {
    ensure(10);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.setTextColor(...LGREY);
    doc.text(NO_DATA_MSG, MARGIN + 2, y + 4);
    y += 10;
  }

  // ── Metrics row: stat cards side by side within section ──
  function metricsRow(stats) {
    // stats: [{ label, value, prev }]
    const valid = stats.filter(s => s.value != null && s.value !== '' && s.value !== '—');
    if (valid.length === 0) {
      noDataMessage();
      return;
    }
    const count = valid.length;
    const gap = 4;
    const cardW = (CONTENT_W - gap * (count - 1)) / count;
    const cardH = 22;
    ensure(cardH + 4);

    valid.forEach((s, i) => {
      const cx = MARGIN + i * (cardW + gap);
      // Card background
      doc.setFillColor(249, 250, 251);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'F');
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.2);
      doc.roundedRect(cx, y, cardW, cardH, 2, 2, 'S');

      // Value (large, bold, navy)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(15);
      doc.setTextColor(...NAVY);
      const valStr = String(s.value);
      doc.text(valStr, cx + 4, y + 8);

      // Label (small caps, grey)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      const label = s.label.toUpperCase();
      doc.text(label, cx + 4, y + 13);

      // Comparison
      const m = mom(s.value, s.prev);
      if (m) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(...(m.up ? GREEN : RED));
        doc.text(`${m.up ? '+' : '-'}${m.pct}% vs prev`, cx + 4, y + 18.5);
      }
    });
    y += cardH + 6;
  }

  // ── Narrative paragraph (full width) ──
  function narrative(text) {
    if (!text) return;
    ensure(14);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(...BLACK);
    const lines = doc.splitTextToSize(text, CONTENT_W);
    // Check each line for page break
    lines.forEach(line => {
      ensure(6);
      doc.text(line, MARGIN, y + 4);
      y += 5.5;
    });
    y += 4;
  }

  // ── Sub-metrics label (for supporting metrics under a main row) ──
  function subLabel(text) {
    ensure(8);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...LGREY);
    doc.text(text.toUpperCase(), MARGIN + 2, y + 3);
    y += 6;
  }

  // ── Section divider ──
  function sectionDivider() {
    ensure(6);
    doc.setDrawColor(...BORDER);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, PAGE_W - MARGIN, y);
    y += 8;
  }

  // ════════════════════════════════════════════════════════════════
  // SECTION 1 — WEBSITE (GA4)
  // ════════════════════════════════════════════════════════════════
  sectionHeader('Website (GA4)');
  const hasWebsite = w.activeUsers || w.sessions || w.newUsers || w.engagedSessions;
  if (hasWebsite) {
    metricsRow([
      { label: 'Active Users',     value: fmtNum(w.activeUsers),    prev: pw.activeUsers },
      { label: 'Sessions',         value: fmtNum(w.sessions),       prev: pw.sessions },
      { label: 'New Users',        value: fmtNum(w.newUsers),       prev: pw.newUsers },
      { label: 'Engaged Sessions', value: w.engagedSessions ? w.engagedSessions + (String(w.engagedSessions).includes('%') ? '' : '%') : null, prev: pw.engagedSessions },
    ]);
    narrative(w.notes);
  } else {
    noDataMessage();
  }
  sectionDivider();

  // ════════════════════════════════════════════════════════════════
  // SECTION 2 — SEARCH CONSOLE
  // ════════════════════════════════════════════════════════════════
  sectionHeader('Search Console');
  const hasGsc = w.gscImpressions || w.gscClicks || w.gscAvgPosition;
  if (hasGsc) {
    const gscCtr = w.gscImpressions && w.gscClicks
      ? ((parseFloat(w.gscClicks) / parseFloat(w.gscImpressions)) * 100).toFixed(2) + '%' : null;
    metricsRow([
      { label: 'Impressions',  value: fmtNum(w.gscImpressions), prev: pw.gscImpressions },
      { label: 'Clicks',       value: fmtNum(w.gscClicks),      prev: pw.gscClicks },
      { label: 'Avg Position', value: w.gscAvgPosition || null, prev: null },
      { label: 'CTR',          value: gscCtr,                   prev: null },
    ]);
  } else {
    noDataMessage();
  }
  sectionDivider();

  // ════════════════════════════════════════════════════════════════
  // SECTION 3 — NEWSLETTER — BEEHIIV
  // ════════════════════════════════════════════════════════════════
  sectionHeader('Newsletter — Beehiiv');
  const hasNl = nl.openRate || nl.clickRate || nl.listSize || nl.unsubscribes || nl.sendDate || nl.subjectLine;
  if (hasNl) {
    if (nl.sendDate || nl.subjectLine) {
      ensure(6);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(...GREY);
      doc.text([nl.sendDate, nl.subjectLine ? `"${nl.subjectLine}"` : ''].filter(Boolean).join('   '), MARGIN + 2, y + 3);
      y += 6;
    }
    metricsRow([
      { label: 'Open Rate',     value: nl.openRate ? nl.openRate + '%' : null, prev: null },
      { label: 'Click Rate',    value: nl.clickRate ? nl.clickRate + '%' : null, prev: null },
      { label: 'Total Subs',    value: fmtNum(nl.listSize),     prev: pnl.listSize },
      { label: 'Unsubscribes',  value: fmtNum(nl.unsubscribes), prev: null },
    ]);
    narrative(nl.notes);
  } else {
    noDataMessage();
  }
  sectionDivider();

  // ════════════════════════════════════════════════════════════════
  // SECTION 4 — CHRIS LINKEDIN — PERSONAL
  // ════════════════════════════════════════════════════════════════
  sectionHeader('Chris LinkedIn — Personal');
  const hasLI = li.totalImpressions || li.uniqueMembersReached || li.reactions || li.comments;
  if (hasLI) {
    metricsRow([
      { label: 'Impressions',   value: fmtNum(li.totalImpressions),    prev: pli.totalImpressions },
      { label: 'Members Reach', value: fmtNum(li.uniqueMembersReached), prev: pli.uniqueMembersReached },
      { label: 'Reactions',     value: fmtNum(li.reactions),           prev: pli.reactions },
      { label: 'Comments',      value: fmtNum(li.comments),            prev: pli.comments },
    ]);

    // Supporting metrics
    const liImp = parseFloat(li.totalImpressions) || 0;
    const liEng = (parseFloat(li.reactions) || 0) + (parseFloat(li.comments) || 0) + (parseFloat(li.reposts) || 0);
    const liEngRate = liImp > 0 ? ((liEng / liImp) * 100).toFixed(2) + '%' : null;
    if (li.newFollowers || li.reposts || liEngRate) {
      subLabel('Engagement');
      metricsRow([
        { label: 'New Connections', value: fmtNum(li.newFollowers), prev: pli.newFollowers },
        { label: 'Reposts',         value: fmtNum(li.reposts),      prev: null },
        { label: 'Engagement Rate', value: liEngRate,               prev: null },
      ]);
    }

    if (li.topPostTitle) {
      ensure(10);
      doc.setFillColor(243, 232, 255);
      doc.roundedRect(MARGIN, y, CONTENT_W, 8, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(132, 3, 197);
      doc.text('Top Post:', MARGIN + 4, y + 5);
      doc.setTextColor(...NAVY);
      const titleLines = doc.splitTextToSize(li.topPostTitle, CONTENT_W - 30);
      doc.text(titleLines[0], MARGIN + 22, y + 5);
      y += 10;
    }

    narrative(li.notes);
  } else {
    noDataMessage();
  }
  sectionDivider();

  // ════════════════════════════════════════════════════════════════
  // SECTION 5 — EVENTWISE COMPANY PAGE
  // ════════════════════════════════════════════════════════════════
  sectionHeader('Eventwise Company Page');
  const hasCP = cp.totalImpressions || cp.newFollowers || cp.reactions || cp.clicks;
  if (hasCP) {
    metricsRow([
      { label: 'Impressions',   value: fmtNum(cp.totalImpressions), prev: pcp.totalImpressions },
      { label: 'New Followers', value: fmtNum(cp.newFollowers),     prev: pcp.newFollowers },
      { label: 'Reactions',     value: fmtNum(cp.reactions),        prev: pcp.reactions },
      { label: 'Clicks',        value: fmtNum(cp.clicks),           prev: pcp.clicks },
    ]);

    const cpImp = parseFloat(cp.totalImpressions) || 0;
    const cpEng = (parseFloat(cp.reactions) || 0) + (parseFloat(cp.clicks) || 0);
    const cpEngRate = cpImp > 0 ? ((cpEng / cpImp) * 100).toFixed(2) + '%' : null;
    if (cp.uniqueVisitors || cp.postsPublished || cpEngRate) {
      subLabel('Supporting Metrics');
      metricsRow([
        { label: 'Unique Visitors',  value: fmtNum(cp.uniqueVisitors), prev: pcp.uniqueVisitors },
        { label: 'Posts Published',  value: cp.postsPublished || null, prev: null },
        { label: 'Engagement Rate',  value: cpEngRate,                 prev: null },
      ]);
    }

    narrative(cp.notes);
  } else {
    noDataMessage();
  }

  // ── Final footer on last page ──
  addFooter();

  doc.save(`Eventwise_Marketing_Report_${report.month}_${report.year}.pdf`);
}