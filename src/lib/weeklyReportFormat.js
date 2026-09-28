/**
 * Text and PDF formatting helpers for the Weekly Report.
 * Mirrors the compact on-screen layout.
 */
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { formatDuration } from './weeklyReportData';

function statsLine(reportData) {
  if (reportData.isWholeTeam) {
    let c = 0, ip = 0, b = 0, h = 0;
    for (const r of Object.values(reportData.reportByPerson)) {
      c += r.stats.completed; ip += r.stats.inProgress; b += r.stats.blocked; h += r.stats.hoursLogged;
    }
    return `Completed: ${c} | In progress: ${ip} | Blocked: ${b} | Hours: ${formatDuration(h)}`;
  }
  const r = Object.values(reportData.reportByPerson)[0];
  return `Completed: ${r.stats.completed} | In progress: ${r.stats.inProgress} | Blocked: ${r.stats.blocked} | Hours: ${formatDuration(r.stats.hoursLogged)}`;
}

export function formatReportAsText(reportData, aiSummary) {
  const { reportByPerson, isWholeTeam, weekStart, weekEnd } = reportData;
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
  let text = `WEEKLY REPORT — ${weekLabel}\n`;
  text += isWholeTeam ? 'Whole Team\n\n' : `${Object.keys(reportByPerson)[0]}\n\n`;
  text += statsLine(reportData) + '\n\n';

  if (aiSummary) {
    text += 'SUMMARY\n' + aiSummary + '\n\n';
  }

  for (const [person, report] of Object.entries(reportByPerson)) {
    if (isWholeTeam) {
      text += `── ${person} ──\n`;
      text += `${formatDuration(report.stats.hoursLogged)} logged | ${report.stats.completed} completed\n`;
      const lines = [];
      report.done.slice(0, 3).forEach(t => lines.push(t.title));
      if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));
      lines.forEach(l => text += `  ${l}\n`);
      if (report.blocked.length > 0) text += `  Blocked: ${report.blocked.map(t => t.title).join(', ')}\n`;
      text += '\n';
    } else {
      text += 'COMPLETED THIS WEEK\n';
      if (report.done.length === 0) text += 'Nothing completed this week.\n';
      else report.done.forEach(t => {
        text += `${t.title} — ${formatDuration(t.timeMinutes)}\n`;
        if (t.outcome) text += `  ${t.outcome}\n`;
      });
      text += '\n';

      text += 'IN PROGRESS\n';
      if (report.inProgress.length === 0 && report.longRunning.length === 0) text += 'Nothing in progress.\n';
      else {
        report.inProgress.slice(0, 5).forEach(t => { text += `${t.title} — ${formatDuration(t.timeMinutes)}\n`; });
        if (report.inProgress.length > 5) text += `+ ${report.inProgress.length - 5} more\n`;
      }
      text += '\n';

      if (report.longRunning.length > 0) {
        text += `LONG-RUNNING (${report.longRunning.length})\n`;
        report.longRunning.forEach(t => { text += `${t.title} — ${formatDuration(t.timeMinutes)}\n`; });
        text += '\n';
      }

      if (report.blocked.length > 0) {
        text += 'BLOCKED\n';
        report.blocked.forEach(t => { text += `${t.title}\n`; });
        text += '\n';
      }

      text += 'COMING UP\n';
      if (report.comingUp.length === 0) text += 'Nothing due in the next 7 days.\n';
      else report.comingUp.forEach(t => { text += `${t.title} (due ${format(parseISO(t.deadline), 'd MMM')})\n`; });
      if (report.unscheduledCount > 0) text += `${report.unscheduledCount} unscheduled ${report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog\n`;
      text += '\n';

      text += 'TIME BY CATEGORY\n';
      if (report.timeByCategory.length === 0) text += 'No time logged.\n';
      else report.timeByCategory.forEach(c => { text += `${c.category}: ${formatDuration(c.minutes)} (${c.share}%)\n`; });
      text += '\n';
    }
  }

  return text.trim();
}

export function generateReportPDF(reportData, aiSummary) {
  const doc = new jsPDF();
  let y = 20;
  const left = 15;
  const maxWidth = 180;

  doc.setFontSize(16); doc.setFont(undefined, 'bold');
  doc.text('WEEKLY REPORT', left, y); y += 8;
  doc.setFontSize(10); doc.setFont(undefined, 'normal');
  doc.text(`${format(reportData.weekStart, 'd MMM')} – ${format(reportData.weekEnd, 'd MMM yyyy')}`, left, y); y += 6;
  doc.text(reportData.isWholeTeam ? 'Whole Team' : Object.keys(reportData.reportByPerson)[0], left, y); y += 6;
  doc.text(statsLine(reportData), left, y); y += 10;

  if (aiSummary) {
    doc.setFont(undefined, 'bold'); doc.setFontSize(11);
    doc.text('Summary', left, y); y += 6;
    doc.setFont(undefined, 'normal'); doc.setFontSize(10);
    const sl = doc.splitTextToSize(aiSummary, maxWidth);
    doc.text(sl, left, y); y += sl.length * 5 + 6;
  }

  for (const [person, report] of Object.entries(reportData.reportByPerson)) {
    if (reportData.isWholeTeam) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont(undefined, 'bold'); doc.setFontSize(12);
      doc.text(person, left, y); y += 6;
      doc.setFont(undefined, 'normal'); doc.setFontSize(10);
      doc.text(`${formatDuration(report.stats.hoursLogged)} logged | ${report.stats.completed} completed`, left, y); y += 5;
      const lines = [];
      report.done.slice(0, 3).forEach(t => lines.push(t.title));
      if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));
      lines.forEach(l => { const w = doc.splitTextToSize(`  ${l}`, maxWidth); doc.text(w, left, y); y += w.length * 5; });
      if (report.blocked.length > 0) {
        const w = doc.splitTextToSize(`  Blocked: ${report.blocked.map(t => t.title).join(', ')}`, maxWidth);
        doc.text(w, left, y); y += w.length * 5;
      }
      y += 6;
    } else {
      const writeSection = (title, lines) => {
        if (y > 270) { doc.addPage(); y = 20; }
        doc.setFont(undefined, 'bold'); doc.setFontSize(10);
        doc.text(title, left, y); y += 5;
        doc.setFont(undefined, 'normal');
        lines.forEach(line => {
          if (y > 280) { doc.addPage(); y = 20; }
          const wrapped = doc.splitTextToSize(line, maxWidth);
          doc.text(wrapped, left, y); y += wrapped.length * 5;
        });
        y += 3;
      };

      writeSection('COMPLETED THIS WEEK',
        report.done.length === 0 ? ['Nothing completed this week.'] :
        report.done.flatMap(t => [`${t.title} — ${formatDuration(t.timeMinutes)}`, ...(t.outcome ? [`  ${t.outcome}`] : [])])
      );

      const ipLines = report.inProgress.slice(0, 5).map(t => `${t.title} — ${formatDuration(t.timeMinutes)}`);
      if (report.inProgress.length > 5) ipLines.push(`+ ${report.inProgress.length - 5} more`);
      if (ipLines.length === 0 && report.longRunning.length === 0) ipLines.push('Nothing in progress.');
      writeSection('IN PROGRESS', ipLines);

      if (report.longRunning.length > 0) {
        writeSection(`LONG-RUNNING (${report.longRunning.length})`,
          report.longRunning.map(t => `${t.title} — ${formatDuration(t.timeMinutes)}`)
        );
      }

      if (report.blocked.length > 0) writeSection('BLOCKED', report.blocked.map(t => t.title));

      const comingUpLines = report.comingUp.map(t => `${t.title} (due ${format(parseISO(t.deadline), 'd MMM')})`);
      if (report.comingUp.length === 0) comingUpLines.push('Nothing due in the next 7 days.');
      if (report.unscheduledCount > 0) comingUpLines.push(`${report.unscheduledCount} unscheduled ${report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog`);
      writeSection('COMING UP', comingUpLines);

      writeSection('TIME BY CATEGORY',
        report.timeByCategory.length === 0 ? ['No time logged.'] :
        report.timeByCategory.map(c => `${c.category}: ${formatDuration(c.minutes)} (${c.share}%)`)
      );
      y += 5;
    }
  }

  doc.save(`weekly-report-${format(reportData.weekStart, 'yyyy-MM-dd')}.pdf`);
}