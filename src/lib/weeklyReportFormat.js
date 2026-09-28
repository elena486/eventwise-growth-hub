/**
 * Text and PDF formatting helpers for the Weekly Report.
 */
import { jsPDF } from 'jspdf';
import { format, parseISO } from 'date-fns';
import { formatDuration } from './weeklyReportData';

export function formatReportAsText(reportData, aiSummary) {
  const { reportByPerson, isWholeTeam, weekStart, weekEnd } = reportData;
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
  let text = `WEEKLY REPORT — ${weekLabel}\n`;
  text += isWholeTeam ? 'Whole Team\n\n' : `${Object.keys(reportByPerson)[0]}\n\n`;

  if (aiSummary) {
    text += 'SUMMARY\n' + aiSummary + '\n\n';
  }

  for (const [person, report] of Object.entries(reportByPerson)) {
    if (isWholeTeam) text += `── ${person} ──\n\n`;

    text += 'DONE THIS WEEK\n';
    if (report.done.length === 0) text += 'Nothing completed this week.\n';
    else report.done.forEach(t => {
      text += `• ${t.title} [${t.category}] — ${formatDuration(t.timeMinutes)}${t.outcome ? ` — ${t.outcome}` : ''}\n`;
    });
    text += '\n';

    text += 'IN PROGRESS / CARRIED OVER\n';
    if (report.inProgress.length === 0) text += 'Nothing in progress.\n';
    else report.inProgress.forEach(t => {
      text += `• ${t.title} — ${formatDuration(t.timeMinutes)}`;
      if (t.carriedWeeks >= 2) text += ` (carried over ${t.carriedWeeks} weeks)`;
      text += '\n';
    });
    text += '\n';

    text += 'BLOCKED\n';
    if (report.blocked.length === 0) text += 'Nothing blocked.\n';
    else report.blocked.forEach(t => { text += `• ${t.title} [${t.category}]\n`; });
    text += '\n';

    text += 'NEXT WEEK\n';
    if (report.nextWeek.length === 0 && report.notScheduled.length === 0) text += 'Nothing scheduled.\n';
    else {
      report.nextWeek.forEach(t => { text += `• ${t.title} (due ${format(parseISO(t.deadline), 'd MMM')})\n`; });
      if (report.notScheduled.length > 0) {
        text += 'Not yet scheduled:\n';
        report.notScheduled.forEach(t => { text += `• ${t.title}\n`; });
      }
    }
    text += '\n';

    text += 'TIME BY CATEGORY\n';
    if (report.timeByCategory.length === 0) text += 'No time logged.\n';
    else report.timeByCategory.forEach(c => { text += `• ${c.category}: ${formatDuration(c.minutes)} (${c.share}%)\n`; });
    text += '\n';
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
  doc.text(reportData.isWholeTeam ? 'Whole Team' : Object.keys(reportData.reportByPerson)[0], left, y); y += 10;

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
      doc.text(person, left, y); y += 7;
    }

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

    writeSection('DONE THIS WEEK',
      report.done.length === 0 ? ['Nothing completed this week.'] :
      report.done.map(t => `- ${t.title} [${t.category}] — ${formatDuration(t.timeMinutes)}${t.outcome ? ` — ${t.outcome}` : ''}`)
    );

    writeSection('IN PROGRESS / CARRIED OVER',
      report.inProgress.length === 0 ? ['Nothing in progress.'] :
      report.inProgress.map(t => `- ${t.title} — ${formatDuration(t.timeMinutes)}${t.carriedWeeks >= 2 ? ` (carried over ${t.carriedWeeks} weeks)` : ''}`)
    );

    writeSection('BLOCKED',
      report.blocked.length === 0 ? ['Nothing blocked.'] :
      report.blocked.map(t => `- ${t.title} [${t.category}]`)
    );

    const nextLines = [];
    if (report.nextWeek.length === 0 && report.notScheduled.length === 0) nextLines.push('Nothing scheduled.');
    else {
      report.nextWeek.forEach(t => nextLines.push(`- ${t.title} (due ${format(parseISO(t.deadline), 'd MMM')})`));
      if (report.notScheduled.length > 0) { nextLines.push('Not yet scheduled:'); report.notScheduled.forEach(t => nextLines.push(`- ${t.title}`)); }
    }
    writeSection('NEXT WEEK', nextLines);

    writeSection('TIME BY CATEGORY',
      report.timeByCategory.length === 0 ? ['No time logged.'] :
      report.timeByCategory.map(c => `${c.category}: ${formatDuration(c.minutes)} (${c.share}%)`)
    );

    y += 5;
  }

  doc.save(`weekly-report-${format(reportData.weekStart, 'yyyy-MM-dd')}.pdf`);
}