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
    if (aiSummary.moved) text += `Moved: ${aiSummary.moved}\n`;
    if (aiSummary.blocking) text += `Blocking: ${aiSummary.blocking}\n`;
    if (aiSummary.next) text += `Next: ${aiSummary.next}\n`;
    text += '\n';
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
  const hoursW = 25;
  const titleW = usableW - hoursW;
  let y = margin;
  const name = reportData.isWholeTeam ? 'Whole Team' : Object.keys(reportData.reportByPerson)[0];
  const weekLabel = `${format(reportData.weekStart, 'd MMM')} – ${format(reportData.weekEnd, 'd MMM yyyy')}`;

  // Running header for continuation pages
  const drawRunningHeader = () => {
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.lightGrey);
    doc.text(`${name} — ${weekLabel}`, margin, margin + 5);
    doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
    doc.line(margin, margin + 8, margin + usableW, margin + 8);
  };

  // Page break helper — never splits a block
  const ensureSpace = (needed) => {
    const fullPageH = pageH - 2 * margin - 12;
    if (needed > fullPageH) {
      if (y > margin + 12) { doc.addPage(); drawRunningHeader(); y = margin + 12; }
      return;
    }
    if (y + needed > pageH - margin - 10) { doc.addPage(); drawRunningHeader(); y = margin + 12; }
  };

  // ── Main header (first page only) ──
  doc.setFont('helvetica', 'bold'); doc.setFontSize(18); doc.setTextColor(...C.purple);
  doc.text('Eventwise', margin, y + 6); y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(13); doc.setTextColor(...C.navy);
  doc.text('Weekly Report', margin, y + 5); y += 7;
  doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.navy);
  doc.text(name, margin, y + 4); y += 6;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.grey);
  doc.text(weekLabel, margin, y + 4); y += 5;
  doc.setFontSize(9); doc.setTextColor(...C.lightGrey);
  doc.text(`Generated ${format(new Date(), 'd MMM yyyy')}`, margin, y + 3); y += 5;
  doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
  doc.line(margin, y, margin + usableW, y); y += 6;

  // ── Stat tiles ──
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
  y += tileH + 8;

  // ── Summary (shaded box, three labelled lines) ──
  if (aiSummary && (aiSummary.moved || aiSummary.blocking || aiSummary.next)) {
    const padding = 5, headingH = 6, lineH = 5, gapBetween = 2;
    const labelW = 20;
    const entries = [
      { label: 'Moved:', text: aiSummary.moved },
      { label: 'Blocking:', text: aiSummary.blocking },
      { label: 'Next:', text: aiSummary.next },
    ].filter(l => l.text);
    // Pre-wrap text for each entry (font set before splitTextToSize)
    doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
    const wrapped = entries.map(e => ({
      label: e.label,
      lines: doc.splitTextToSize(e.text, usableW - 10 - labelW),
    }));
    const totalTextLines = wrapped.reduce((s, w) => s + w.lines.length, 0);
    const boxH = padding + headingH + totalTextLines * lineH + (wrapped.length > 0 ? (wrapped.length - 1) * gapBetween : 0) + padding;
    ensureSpace(boxH + 6);
    doc.setFillColor(...C.shadeBg);
    doc.roundedRect(margin, y, usableW, boxH, 2, 2, 'F');
    doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.navy);
    doc.text('Summary', margin + 4, y + padding + 4);
    let ty = y + padding + headingH + 4;
    wrapped.forEach((w) => {
      w.lines.forEach((line, i) => {
        if (i === 0) {
          doc.setFont('helvetica', 'bold'); doc.setFontSize(10); doc.setTextColor(...C.navy);
          doc.text(w.label, margin + 4, ty);
        }
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.grey);
        doc.text(line, margin + 4 + labelW, ty);
        ty += lineH;
      });
      ty += gapBetween;
    });
    y += boxH + 8;
  }

  if (reportData.isWholeTeam) {
    // ── Person cards (each kept on one page) ──
    for (const [person, report] of Object.entries(reportData.reportByPerson)) {
      const lines = [];
      report.done.slice(0, 3).forEach(t => lines.push(t.title));
      if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));
      let cardH = 5 + 5 + 5 + lines.length * 4 + (report.blocked.length > 0 ? 5 : 0) + 5;
      ensureSpace(cardH + 4);
      doc.setDrawColor(...C.border); doc.setLineWidth(0.3);
      doc.roundedRect(margin, y, usableW, cardH, 2, 2, 'S');
      let iy = y + 5;
      doc.setFont('helvetica', 'bold'); doc.setFontSize(12); doc.setTextColor(...C.navy);
      doc.text(person, margin + 4, iy + 3); iy += 5;
      doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.purple);
      doc.text(`${formatDuration(report.stats.hoursLogged)} logged | ${report.stats.completed} completed`, margin + 4, iy + 3); iy += 5;
      doc.setFontSize(9); doc.setTextColor(...C.grey);
      lines.forEach(l => { doc.text(l, margin + 4, iy + 3); iy += 4; });
      if (report.blocked.length > 0) {
        doc.setTextColor(...C.red);
        doc.text(`Blocked: ${report.blocked.map(t => t.title).join(', ')}`, margin + 4, iy + 3);
      }
      y += cardH + 4;
    }
  } else {
    // ── Individual sections ──
    const report = Object.values(reportData.reportByPerson)[0];

    const drawSection = (title, rows, opts = {}) => {
      // Compute section height by pre-wrapping all text
      let sectionH = 8; // heading + gap
      rows.forEach(r => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10);
        const tw = r.right ? titleW : usableW;
        const tl = doc.splitTextToSize(r.title, tw);
        sectionH += tl.length * 4.5 + 2;
        if (r.outcome) {
          doc.setFont('helvetica', 'italic'); doc.setFontSize(9);
          const ol = doc.splitTextToSize(r.outcome, usableW - 4);
          sectionH += ol.length * 4 + 2;
        }
      });
      if (opts.footer) sectionH += 5;
      sectionH += 8; // gap after section
      ensureSpace(sectionH);

      // Draw heading
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.purple);
      doc.text(title, margin, y + 4);
      y += 8; // advance past heading + gap before content

      // Draw rows
      rows.forEach(r => {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(...C.navy);
        const tw = r.right ? titleW : usableW;
        const tl = doc.splitTextToSize(r.title, tw);
        tl.forEach((line, i) => {
          doc.text(line, margin, y + 3);
          if (i === tl.length - 1 && r.right) {
            doc.text(r.right, margin + usableW, y + 3, { align: 'right' });
          }
          y += 4.5;
        });
        y += 2; // row spacing
        if (r.outcome) {
          doc.setFont('helvetica', 'italic'); doc.setFontSize(9); doc.setTextColor(...C.grey);
          const ol = doc.splitTextToSize(r.outcome, usableW - 4);
          ol.forEach((line, i) => { doc.text(line, margin + 2, y + 3 + i * 4); });
          y += ol.length * 4 + 2;
        }
      });

      if (opts.footer) {
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.grey);
        doc.text(opts.footer, margin, y + 3);
        y += 5;
      }
      y += 8; // gap between sections
    };

    drawSection('Completed this week',
      report.done.length === 0 ? [{ title: 'Nothing completed this week.' }] :
      report.done.map(t => ({ title: t.title, right: formatDuration(t.timeMinutes), outcome: t.outcome || null }))
    );

    const ipRows = report.inProgress.slice(0, 5).map(t => ({ title: t.title, right: formatDuration(t.timeMinutes) }));
    if (report.inProgress.length === 0 && report.longRunning.length === 0) ipRows.push({ title: 'Nothing in progress.' });
    drawSection('In progress', ipRows,
      report.inProgress.length > 5 ? { footer: `+ ${report.inProgress.length - 5} more` } : {}
    );

    if (report.longRunning.length > 0) {
      drawSection(`Long-running (${report.longRunning.length})`,
        report.longRunning.map(t => ({ title: t.title, right: formatDuration(t.timeMinutes) }))
      );
    }

    if (report.blocked.length > 0) {
      drawSection('Blocked', report.blocked.map(t => ({ title: t.title })));
    }

    const cuRows = report.comingUp.map(t => ({ title: t.title, right: `due ${format(parseISO(t.deadline), 'd MMM')}` }));
    if (report.comingUp.length === 0) cuRows.push({ title: 'Nothing due in the next 7 days.' });
    drawSection('Coming up', cuRows,
      report.unscheduledCount > 0 ? { footer: `${report.unscheduledCount} unscheduled ${report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog` } : {}
    );

    // Time by category (stacked bar + legend)
    if (report.timeByCategory.length === 0) {
      drawSection('Time by category', [{ title: 'No time logged.' }]);
    } else {
      const barH = 7, legendCols = 2;
      const legendRows = Math.ceil(report.timeByCategory.length / legendCols);
      const sectionH = 8 + barH + 3 + legendRows * 5 + 8;
      ensureSpace(sectionH);
      doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...C.purple);
      doc.text('Time by category', margin, y + 4);
      y += 8;
      let xOffset = margin;
      report.timeByCategory.forEach((c, i) => {
        const segW = (c.share / 100) * usableW;
        doc.setFillColor(...BAR_RGB[i % BAR_RGB.length]);
        doc.rect(xOffset, y, segW, barH, 'F');
        xOffset += segW;
      });
      y += barH + 3;
      const colW = usableW / legendCols;
      report.timeByCategory.forEach((c, i) => {
        const col = i % legendCols, row = Math.floor(i / legendCols);
        const lx = margin + col * colW, ly = y + row * 5;
        doc.setFillColor(...BAR_RGB[i % BAR_RGB.length]);
        doc.rect(lx, ly - 2, 3, 3, 'F');
        doc.setFont('helvetica', 'normal'); doc.setFontSize(9); doc.setTextColor(...C.navy);
        doc.text(`${c.category}: ${formatDuration(c.minutes)}`, lx + 4, ly + 1);
      });
      y += legendRows * 5 + 8;
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