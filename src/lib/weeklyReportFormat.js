/**
 * Text and PDF formatting helpers for the Weekly Report.
 * Copy mirrors the compact on-screen layout as plain text.
 * PDF is rebuilt from the on-screen layout with proper visual structure.
 */
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { formatDuration } from './weeklyReportData';

function getStats(reportData) {
  if (reportData.isWholeTeam) {
    let c = 0, ip = 0, b = 0, h = 0;
    for (const r of Object.values(reportData.reportByPerson)) {
      c += r.stats.completed; ip += r.stats.inProgress; b += r.stats.blocked; h += r.stats.hoursLogged;
    }
    return { completed: c, inProgress: ip, blocked: b, hoursLogged: h };
  }
  return Object.values(reportData.reportByPerson)[0].stats;
}

function getPrevStats(reportData) {
  if (reportData.isWholeTeam) {
    let c = 0, ip = 0, b = 0, h = 0;
    for (const s of Object.values(reportData.prevStatsByPerson)) {
      c += s.completed; ip += s.inProgress; b += s.blocked; h += s.hoursLogged;
    }
    return { completed: c, inProgress: ip, blocked: b, hoursLogged: h };
  }
  return Object.values(reportData.prevStatsByPerson)[0];
}

function deltaText(curr, prev, isHours) {
  if (prev === 0) return '';
  const d = curr - prev;
  if (d === 0) return '';
  if (isHours) return `${d > 0 ? '+' : '-'}${formatDuration(Math.abs(d))} vs last week`;
  return `${d > 0 ? '+' : ''}${d} vs last week`;
}

// ── COPY (plain text for Slack / email) ──

export function formatReportAsText(reportData, aiSummary) {
  const { reportByPerson, isWholeTeam, weekStart, weekEnd } = reportData;
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
  const name = isWholeTeam ? 'Whole Team' : Object.keys(reportByPerson)[0];
  const stats = getStats(reportData);

  let text = `Weekly Report — ${name} — ${weekLabel}\n`;
  text += `Completed ${stats.completed} | In progress ${stats.inProgress} | Blocked ${stats.blocked} | Hours ${formatDuration(stats.hoursLogged)}\n\n`;

  if (aiSummary) {
    text += `${aiSummary}\n\n`;
  }

  for (const [person, report] of Object.entries(reportByPerson)) {
    if (isWholeTeam) {
      text += `${person} — ${formatDuration(report.stats.hoursLogged)} logged | ${report.stats.completed} completed\n`;
      const lines = [];
      report.done.slice(0, 3).forEach(t => lines.push(t.title));
      if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));
      lines.forEach(l => text += `• ${l}\n`);
      if (report.blocked.length > 0) text += `Blocked: ${report.blocked.map(t => t.title).join(', ')}\n`;
      text += '\n';
    } else {
      text += 'Completed this week\n';
      if (report.done.length === 0) text += 'Nothing completed this week.\n';
      else report.done.forEach(t => {
        text += `• ${t.title} — ${formatDuration(t.timeMinutes)}\n`;
        if (t.outcome) text += `  ${t.outcome}\n`;
      });
      text += '\n';

      text += 'In progress\n';
      if (report.inProgress.length === 0 && report.longRunning.length === 0) text += 'Nothing in progress.\n';
      else {
        report.inProgress.slice(0, 5).forEach(t => { text += `• ${t.title} — ${formatDuration(t.timeMinutes)}\n`; });
        if (report.inProgress.length > 5) text += `+ ${report.inProgress.length - 5} more\n`;
      }
      text += '\n';

      if (report.longRunning.length > 0) {
        text += `Long-running (${report.longRunning.length})\n`;
        report.longRunning.forEach(t => { text += `• ${t.title} — ${formatDuration(t.timeMinutes)}\n`; });
        text += '\n';
      }

      if (report.blocked.length > 0) {
        text += 'Blocked\n';
        report.blocked.forEach(t => { text += `• ${t.title}\n`; });
        text += '\n';
      }

      text += 'Coming up\n';
      if (report.comingUp.length === 0) text += 'Nothing due in the next 7 days.\n';
      else report.comingUp.forEach(t => { text += `• ${t.title} (due ${format(parseISO(t.deadline), 'd MMM')})\n`; });
      if (report.unscheduledCount > 0) text += `${report.unscheduledCount} unscheduled ${report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog\n`;
      text += '\n';

      text += 'Time by category\n';
      if (report.timeByCategory.length === 0) text += 'No time logged.\n';
      else report.timeByCategory.forEach(c => { text += `• ${c.category}: ${formatDuration(c.minutes)} (${c.share}%)\n`; });
      text += '\n';
    }
  }

  return text.trim();
}

// ── PDF ──

const C = {
  purple: [132, 3, 197],
  navy: [36, 36, 80],
  grey: [87, 119, 171],
  lightGrey: [156, 163, 175],
  border: [235, 235, 245],
  shadeBg: [248, 246, 252],
  red: [220, 38, 38],
  white: [255, 255, 255],
};

const BAR_RGB = [
  [132, 3, 197], [29, 158, 117], [87, 119, 171], [232, 160, 32], [220, 38, 38],
  [124, 58, 237], [14, 165, 233], [245, 158, 11], [16, 185, 129], [99, 102, 241],
];

export function generateReportPDF(reportData, aiSummary) {
  const doc = new jsPDF({ format: 'a4', unit: 'mm', orientation: 'portrait' });
  const pageW = 210, pageH = 297, margin = 20;
  const usableW = pageW - 2 * margin;
  let y = margin;

  // Header
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...C.purple);
  doc.text('Eventwise', margin, y + 7);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(...C.navy);
  doc.text('Weekly Report', margin, y + 14);
  const name = reportData.isWholeTeam ? 'Whole Team' : Object.keys(reportData.reportByPerson)[0];
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.navy);
  doc.text(name, margin, y + 20);
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.grey);
  doc.text(`${format(reportData.weekStart, 'd MMM')} – ${format(reportData.weekEnd, 'd MMM yyyy')}`, margin, y + 25);
  doc.setFontSize(9); doc.setTextColor(...C.lightGrey);
  doc.text(`Generated ${format(new Date(), 'd MMM yyyy')}`, margin, y + 30);
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(margin, y + 33, margin + usableW, y + 33);
  y += 38;

  // Stat tiles
  const stats = getStats(reportData);
  const prev = getPrevStats(reportData);
  const tiles = [
    { label: 'Completed', value: String(stats.completed), delta: deltaText(stats.completed, prev.completed, false) },
    { label: 'In progress', value: String(stats.inProgress), delta: deltaText(stats.inProgress, prev.inProgress, false) },
    { label: 'Blocked', value: String(stats.blocked), delta: deltaText(stats.blocked, prev.blocked, false) },
    { label: 'Hours logged', value: formatDuration(stats.hoursLogged), delta: deltaText(stats.hoursLogged, prev.hoursLogged, true) },
  ];
  const tileW = 40, tileH = 24, gap = (usableW - 4 * tileW) / 3;
  tiles.forEach((tile, i) => {
    const x = margin + i * (tileW + gap);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.roundedRect(x, y, tileW, tileH, 2, 2, 'S');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...C.purple);
    doc.text(tile.value, x + tileW / 2, y + 10, { align: 'center' });
    doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...C.grey);
    doc.text(tile.label.toUpperCase(), x + tileW / 2, y + 16, { align: 'center' });
    if (tile.delta) {
      doc.setFontSize(7); doc.setTextColor(...C.lightGrey);
      doc.text(tile.delta, x + tileW / 2, y + 21, { align: 'center' });
    }
  });
  y += tileH + 6;

  // Summary
  if (aiSummary) {
    if (y + 20 > pageH - 20) { doc.addPage(); y = margin; }
    const lines = doc.splitTextToSize(aiSummary, usableW - 10);
    const boxH = 8 + lines.length * 5 + 4;
    doc.setFillColor(...C.shadeBg);
    doc.roundedRect(margin, y, usableW, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.navy);
    doc.text('Summary', margin + 4, y + 6);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.grey);
    doc.text(lines, margin + 4, y + 12);
    y += boxH + 5;
  }

  if (reportData.isWholeTeam) {
    // Person cards
    for (const [person, report] of Object.entries(reportData.reportByPerson)) {
      const lines = [];
      report.done.slice(0, 3).forEach(t => lines.push(t.title));
      if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));
      const cardH = 8 + 5 + lines.length * 4 + (report.blocked.length > 0 ? 5 : 0) + 5;
      if (y + cardH > pageH - 15) { doc.addPage(); y = margin; }
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, usableW, cardH, 2, 2, 'S');
      let iy = y + 5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...C.navy);
      doc.text(person, margin + 4, iy); iy += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.purple);
      doc.text(`${formatDuration(report.stats.hoursLogged)} logged | ${report.stats.completed} completed`, margin + 4, iy); iy += 5;
      doc.setFontSize(9); doc.setTextColor(...C.grey);
      lines.forEach(l => { doc.text(l, margin + 4, iy); iy += 4; });
      if (report.blocked.length > 0) {
        doc.setTextColor(...C.red);
        doc.text(`Blocked: ${report.blocked.map(t => t.title).join(', ')}`, margin + 4, iy);
      }
      y += cardH + 4;
    }
  } else {
    // Individual sections
    const report = Object.values(reportData.reportByPerson)[0];

    const drawSection = (title, rows, opts = {}) => {
      const headingH = 7;
      const rowH = 5;
      let sectionH = headingH;
      rows.forEach(r => {
        sectionH += rowH;
        if (r.outcome) sectionH += 4;
      });
      sectionH += 4;
      if (y + sectionH > pageH - 15) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.purple);
      doc.text(title, margin, y + 5);
      let ry = y + headingH;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.navy);
      rows.forEach(r => {
        doc.text(r.title, margin, ry);
        if (r.right) doc.text(r.right, margin + usableW, ry, { align: 'right' });
        ry += rowH;
        if (r.outcome) {
          doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...C.grey);
          const ol = doc.splitTextToSize(r.outcome, usableW - 4);
          doc.text(ol, margin + 2, ry);
          ry += ol.length * 4;
          doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.navy);
        }
      });
      if (opts.footer) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.grey);
        doc.text(opts.footer, margin, ry);
        ry += 5;
      }
      y = ry + 3;
    };

    // Completed
    drawSection('Completed this week',
      report.done.length === 0 ? [{ title: 'Nothing completed this week.' }] :
      report.done.map(t => ({ title: t.title, right: formatDuration(t.timeMinutes), outcome: t.outcome || null }))
    );

    // In progress
    const ipRows = report.inProgress.slice(0, 5).map(t => ({ title: t.title, right: formatDuration(t.timeMinutes) }));
    if (report.inProgress.length === 0 && report.longRunning.length === 0) ipRows.push({ title: 'Nothing in progress.' });
    drawSection('In progress', ipRows,
      report.inProgress.length > 5 ? { footer: `+ ${report.inProgress.length - 5} more` } : {}
    );

    // Long-running
    if (report.longRunning.length > 0) {
      drawSection(`Long-running (${report.longRunning.length})`,
        report.longRunning.map(t => ({ title: t.title, right: formatDuration(t.timeMinutes) }))
      );
    }

    // Blocked
    if (report.blocked.length > 0) {
      drawSection('Blocked', report.blocked.map(t => ({ title: t.title })));
    }

    // Coming up
    const cuRows = report.comingUp.map(t => ({ title: t.title, right: `due ${format(parseISO(t.deadline), 'd MMM')}` }));
    if (report.comingUp.length === 0) cuRows.push({ title: 'Nothing due in the next 7 days.' });
    drawSection('Coming up', cuRows,
      report.unscheduledCount > 0 ? { footer: `${report.unscheduledCount} unscheduled ${report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog` } : {}
    );

    // Time by category
    if (report.timeByCategory.length === 0) {
      drawSection('Time by category', [{ title: 'No time logged.' }]);
    } else {
      const barH = 7;
      const legendCols = 2;
      const legendRows = Math.ceil(report.timeByCategory.length / legendCols);
      const sectionH = 7 + barH + 3 + legendRows * 5 + 4;
      if (y + sectionH > pageH - 15) { doc.addPage(); y = margin; }
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.purple);
      doc.text('Time by category', margin, y + 5);
      const barY = y + 7;
      let xOffset = margin;
      report.timeByCategory.forEach((c, i) => {
        const segW = (c.share / 100) * usableW;
        doc.setFillColor(...BAR_RGB[i % BAR_RGB.length]);
        doc.rect(xOffset, barY, segW, barH, 'F');
        xOffset += segW;
      });
      let legendY = barY + barH + 4;
      let legendX = margin;
      const colW = usableW / legendCols;
      report.timeByCategory.forEach((c, i) => {
        const col = i % legendCols;
        const row = Math.floor(i / legendCols);
        const lx = margin + col * colW;
        const ly = legendY + row * 5;
        doc.setFillColor(...BAR_RGB[i % BAR_RGB.length]);
        doc.rect(lx, ly - 3, 3, 3, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.navy);
        doc.text(`${c.category}: ${formatDuration(c.minutes)}`, lx + 4, ly);
      });
      y = legendY + legendRows * 5 + 3;
    }
  }

  // Footer page numbers
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(...C.lightGrey);
    doc.text(`Page ${i} of ${pageCount}`, pageW / 2, pageH - 8, { align: 'center' });
  }

  const namePart = reportData.isWholeTeam ? 'Team' : Object.keys(reportData.reportByPerson)[0];
  doc.save(`Weekly-Report-${namePart}-${format(reportData.weekStart, 'yyyy-MM-dd')}.pdf`);
}