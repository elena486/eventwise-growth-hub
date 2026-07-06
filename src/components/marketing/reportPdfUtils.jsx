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

// ASCII-only text guaranteed to render in jsPDF standard fonts (WinAnsi/Latin-1).
// No emoji, no arrow glyphs (U+2191/U+2193), no check marks — only Latin-1 + em dash.
const NO_DATA_MSG = 'Data not available for this period — check integration connection';

export function generateReportPDF(report, prevReport) {
  // A4 landscape — jsPDF embeds standard 14 fonts (helvetica) which are Latin-1/WinAnsi.
  // All text below is ASCII / Latin-1 only, so no garbled character codes appear.
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'landscape' });
  const PAGE_W = 297;
  const PAGE_H = 210;
  const MARGIN = 14;
  const COL_W = (PAGE_W - MARGIN * 2 - 9) / 2; // 2 columns with 9mm gap

  const NAVY   = [36, 36, 80];
  const PURPLE = [132, 3, 197];
  const GREY   = [107, 114, 128];
  const LGREY  = [249, 250, 251];
  const BLACK  = [17, 24, 39];
  const WHITE  = [255, 255, 255];
  const GREEN  = [21, 128, 61];
  const RED    = [185, 28, 28];

  const w  = parse(report, 'websiteData');
  const li = parse(report, 'chrisLinkedInData');
  const cp = parse(report, 'companyPageData');
  const nl = parse(report, 'newsletterData');

  const pw  = prevReport ? parse(prevReport, 'websiteData') : {};
  const pli = prevReport ? parse(prevReport, 'chrisLinkedInData') : {};
  const pcp = prevReport ? parse(prevReport, 'companyPageData') : {};
  const pnl = prevReport ? parse(prevReport, 'newsletterData') : {};

  // ── Header ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, PAGE_W, 22, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(...WHITE);
  doc.text('Eventwise', MARGIN, 10);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 220);
  doc.text('Monthly Marketing Report', MARGIN, 16);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(...WHITE);
  doc.text(`${report.month} ${report.year}`, PAGE_W - MARGIN, 10, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(200, 200, 220);
  doc.text(`Status: ${report.status || 'Draft'}`, PAGE_W - MARGIN, 16, { align: 'right' });

  let y = 28;

  // ── Section card renderer ──────────────────────────────────────────────────
  function drawCard(x, cardY, cardW, cardH) {
    doc.setFillColor(255, 255, 255);
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'F');
    doc.setDrawColor(230, 232, 240);
    doc.setLineWidth(0.2);
    doc.roundedRect(x, cardY, cardW, cardH, 3, 3, 'S');
  }

  // Section title uses a coloured left bar (renders reliably) — no emoji prefix.
  function sectionTitle(x, sy, _icon, title) {
    doc.setFillColor(...PURPLE);
    doc.rect(x, sy, 2.5, 7, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(...NAVY);
    doc.text(title, x + 6, sy + 5.5);
    return sy + 12;
  }

  function noDataMessage(x, sy, maxW) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    const lines = doc.splitTextToSize(NO_DATA_MSG, maxW);
    doc.text(lines, x, sy + 4);
    return sy + Math.max(10, lines.length * 4 + 4);
  }

  function statBlock(x, sy, label, value, prevVal) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(...NAVY);
    doc.text(String(value || '—'), x, sy + 5);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...GREY);
    doc.text(label, x, sy + 10);
    const m = mom(value, prevVal);
    if (m) {
      doc.setFontSize(7.5);
      doc.setTextColor(...(m.up ? GREEN : RED));
      doc.setFont('helvetica', 'bold');
      doc.text(`${m.up ? '+' : '-'}${m.pct}% vs prev`, x, sy + 14.5);
    }
    // No prior data -> show nothing (no "No prior data" text)
    return sy + 18;
  }

  function narrative(x, ny, text, maxW) {
    if (!text) return ny;
    doc.setFillColor(249, 250, 251);
    const lines = doc.splitTextToSize(text, maxW - 8);
    const boxH = lines.length * 4 + 6;
    doc.roundedRect(x, ny, maxW, boxH, 1.5, 1.5, 'F');
    doc.setFillColor(...PURPLE);
    doc.rect(x, ny, 2, boxH, 'F');
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...BLACK);
    doc.text(lines, x + 5, ny + 4.5, { lineHeightFactor: 1.5 });
    return ny + boxH + 3;
  }

  function subDivider(x, dy, maxW, label) {
    doc.setDrawColor(220, 222, 234);
    doc.setLineWidth(0.3);
    doc.line(x, dy, x + maxW, dy);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    doc.text(label.toUpperCase(), x + maxW / 2, dy + 3.5, { align: 'center' });
    return dy + 7;
  }

  // ═══════════════════════════════════════════════════════════════
  // LEFT COLUMN: Website + Newsletter
  // ═══════════════════════════════════════════════════════════════
  const LX = MARGIN;
  const RX = MARGIN + COL_W + 9;
  const CARD_H = 83;

  // ── WEBSITE CARD ──────────────────────────────────────────────
  drawCard(LX, y, COL_W, CARD_H);
  let ly = sectionTitle(LX + 4, y + 3, null, 'Website');
  const hasWebsite = w.activeUsers || w.sessions || w.newUsers || w.engagedSessions;
  if (hasWebsite) {
    // 4 stats in a row
    const wStatW = (COL_W - 8) / 4;
    statBlock(LX + 4,                     ly, 'Active Users',     fmtNum(w.activeUsers),    pw.activeUsers);
    statBlock(LX + 4 + wStatW,            ly, 'Sessions',         fmtNum(w.sessions),       pw.sessions);
    statBlock(LX + 4 + wStatW * 2,        ly, 'New Users',        fmtNum(w.newUsers),       pw.newUsers);
    statBlock(LX + 4 + wStatW * 3,        ly, 'Engaged Sessions', w.engagedSessions ? w.engagedSessions + (String(w.engagedSessions).includes('%') ? '' : '%') : '—', pw.engagedSessions);
    ly += 18;
  } else {
    ly = noDataMessage(LX + 4, ly, COL_W - 8) + 6;
  }

  // GSC row
  ly = subDivider(LX + 4, ly, COL_W - 8, 'Search Console');
  const hasGsc = w.gscImpressions || w.gscClicks || w.gscAvgPosition;
  if (hasGsc) {
    const gscW = (COL_W - 8) / 4;
    statBlock(LX + 4,              ly, 'Impressions',  fmtNum(w.gscImpressions), pw.gscImpressions);
    statBlock(LX + 4 + gscW,      ly, 'Clicks',       fmtNum(w.gscClicks),      pw.gscClicks);
    statBlock(LX + 4 + gscW * 2,  ly, 'Avg Position', w.gscAvgPosition || '—',  null);

    const gscCtr = w.gscImpressions && w.gscClicks
      ? ((parseFloat(w.gscClicks) / parseFloat(w.gscImpressions)) * 100).toFixed(2) + '%' : null;
    statBlock(LX + 4 + gscW * 3,  ly, 'CTR',          gscCtr || '—',            null);
    ly += 18;
  } else {
    ly = noDataMessage(LX + 4, ly, COL_W - 8) + 4;
  }

  if (w.notes) narrative(LX + 4, ly, w.notes, COL_W - 8);

  // ── NEWSLETTER CARD ────────────────────────────────────────────
  const NL_Y = y + CARD_H + 5;
  const NL_H = 73;
  drawCard(LX, NL_Y, COL_W, NL_H);
  let nly = sectionTitle(LX + 4, NL_Y + 3, null, 'Newsletter — Beehiiv');
  const hasNl = nl.openRate || nl.clickRate || nl.listSize || nl.unsubscribes || nl.sendDate || nl.subjectLine;

  if (!hasNl) {
    noDataMessage(LX + 4, nly, COL_W - 8);
  } else {
    if (nl.sendDate || nl.subjectLine) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...GREY);
      doc.text([nl.sendDate, nl.subjectLine ? `"${nl.subjectLine}"` : ''].filter(Boolean).join('   '), LX + 4, nly);
      nly += 5;
    }

    const nlW = (COL_W - 8) / 4;
    const openRate = parseFloat(nl.openRate) || 0;
    const openBenchmark = openRate > 40 ? true : openRate >= 30 ? null : false;

    statBlock(LX + 4,            nly, 'Open Rate',     nl.openRate ? nl.openRate + '%' : '—', null);
    statBlock(LX + 4 + nlW,      nly, 'Click Rate',    nl.clickRate ? nl.clickRate + '%' : '—', null);
    statBlock(LX + 4 + nlW * 2,  nly, 'Total Subs',   fmtNum(nl.listSize), pnl.listSize);
    statBlock(LX + 4 + nlW * 3,  nly, 'Unsubscribes', fmtNum(nl.unsubscribes), null);
    nly += 18;

    // Open rate bar
    if (nl.openRate) {
      const barW = COL_W - 10;
      doc.setFillColor(240, 240, 248);
      doc.roundedRect(LX + 4, nly, barW, 4, 1, 1, 'F');
      const fillW = Math.min(barW, (openRate / 100) * barW);
      doc.setFillColor(...(openBenchmark === true ? GREEN : openBenchmark === false ? RED : [161, 98, 7]));
      doc.roundedRect(LX + 4, nly, fillW, 4, 1, 1, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...GREY);
      doc.text('Open Rate — Industry avg: 35%', LX + 4, nly + 7.5);
      const benchLabel = openBenchmark === true ? 'Above average' : openBenchmark === false ? 'Below average' : 'Average';
      doc.setTextColor(...(openBenchmark === true ? GREEN : openBenchmark === false ? RED : [161, 98, 7]));
      doc.setFont('helvetica', 'bold');
      doc.text(benchLabel, LX + 4 + barW, nly + 7.5, { align: 'right' });
      nly += 10;
    }

    if (nl.notes) narrative(LX + 4, nly, nl.notes, COL_W - 8);
  }

  // ═══════════════════════════════════════════════════════════════
  // RIGHT COLUMN: Chris LinkedIn + Company Page
  // ═══════════════════════════════════════════════════════════════

  // ── LINKEDIN CARD ──────────────────────────────────────────────
  drawCard(RX, y, COL_W, CARD_H);
  let ry = sectionTitle(RX + 4, y + 3, null, 'Chris LinkedIn — Personal');
  const hasLI = li.totalImpressions || li.uniqueMembersReached || li.reactions || li.comments;
  if (hasLI) {
    const liW = (COL_W - 8) / 4;
    statBlock(RX + 4,             ry, 'Impressions',   fmtNum(li.totalImpressions),    pli.totalImpressions);
    statBlock(RX + 4 + liW,       ry, 'Members Reach', fmtNum(li.uniqueMembersReached), pli.uniqueMembersReached);
    statBlock(RX + 4 + liW * 2,   ry, 'Reactions',     fmtNum(li.reactions),           pli.reactions);
    statBlock(RX + 4 + liW * 3,   ry, 'Comments',      fmtNum(li.comments),            pli.comments);
    ry += 18;

    // Eng rate
    const liImp = parseFloat(li.totalImpressions) || 0;
    const liEng = (parseFloat(li.reactions) || 0) + (parseFloat(li.comments) || 0) + (parseFloat(li.reposts) || 0);
    const liEngRate = liImp > 0 ? ((liEng / liImp) * 100).toFixed(2) + '%' : null;

    ry = subDivider(RX + 4, ry, COL_W - 8, 'Engagement');
    const engW = (COL_W - 8) / 3;
    statBlock(RX + 4,             ry, 'New Connections', fmtNum(li.newFollowers), pli.newFollowers);
    statBlock(RX + 4 + engW,      ry, 'Reposts',         fmtNum(li.reposts),     null);
    statBlock(RX + 4 + engW * 2,  ry, 'Engagement Rate', liEngRate || '—',       null);
    ry += 18;

    if (li.topPostTitle) {
      doc.setFillColor(243, 232, 255);
      doc.roundedRect(RX + 4, ry, COL_W - 8, 7, 1.5, 1.5, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...PURPLE);
      doc.text('Top Post:', RX + 7, ry + 4);
      doc.setTextColor(...NAVY);
      doc.text(doc.splitTextToSize(li.topPostTitle, COL_W - 30)[0], RX + 22, ry + 4);
      ry += 9;
    }

    if (li.notes) narrative(RX + 4, ry, li.notes, COL_W - 8);
  } else {
    noDataMessage(RX + 4, ry, COL_W - 8);
  }

  // ── COMPANY PAGE CARD ──────────────────────────────────────────
  const CP_Y = y + CARD_H + 5;
  const CP_H = 73;
  drawCard(RX, CP_Y, COL_W, CP_H);
  let cy = sectionTitle(RX + 4, CP_Y + 3, null, 'Eventwise Company Page');
  const hasCP = cp.totalImpressions || cp.newFollowers || cp.reactions || cp.clicks;
  if (hasCP) {
    const cpW = (COL_W - 8) / 4;
    statBlock(RX + 4,            cy, 'Impressions',  fmtNum(cp.totalImpressions), pcp.totalImpressions);
    statBlock(RX + 4 + cpW,      cy, 'New Followers', fmtNum(cp.newFollowers),    pcp.newFollowers);
    statBlock(RX + 4 + cpW * 2,  cy, 'Reactions',    fmtNum(cp.reactions),        pcp.reactions);
    statBlock(RX + 4 + cpW * 3,  cy, 'Clicks',       fmtNum(cp.clicks),           pcp.clicks);
    cy += 18;

    const cpImp = parseFloat(cp.totalImpressions) || 0;
    const cpEng = (parseFloat(cp.reactions) || 0) + (parseFloat(cp.clicks) || 0);
    const cpEngRate = cpImp > 0 ? ((cpEng / cpImp) * 100).toFixed(2) + '%' : null;

    cy = subDivider(RX + 4, cy, COL_W - 8, 'Supporting Metrics');
    const csmW = (COL_W - 8) / 3;
    statBlock(RX + 4,             cy, 'Unique Visitors',  fmtNum(cp.uniqueVisitors), pcp.uniqueVisitors);
    statBlock(RX + 4 + csmW,      cy, 'Posts Published',  cp.postsPublished || '—',  null);
    statBlock(RX + 4 + csmW * 2,  cy, 'Engagement Rate',  cpEngRate || '—',          null);
    cy += 18;

    if (cp.notes) narrative(RX + 4, cy, cp.notes, COL_W - 8);
  } else {
    noDataMessage(RX + 4, cy, COL_W - 8);
  }

  // ── Footer ─────────────────────────────────────────────────────────────────
  doc.setFillColor(...NAVY);
  doc.rect(0, PAGE_H - 11, PAGE_W, 11, 'F');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(...WHITE);
  doc.text(`Eventwise Monthly Marketing Report — ${report.month} ${report.year} — Confidential`, PAGE_W / 2, PAGE_H - 4, { align: 'center' });
  doc.setTextColor(200, 200, 220);
  doc.text('hello@eventwise.com · eventwise.com', PAGE_W - MARGIN, PAGE_H - 4, { align: 'right' });

  doc.save(`Eventwise_Marketing_Report_${report.month}_${report.year}.pdf`);
}