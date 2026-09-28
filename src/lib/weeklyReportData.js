/**
 * Data fetching, report building, flags, and AI summary for the Weekly Report.
 */
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, addWeeks, differenceInWeeks, format } from 'date-fns';

export const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];

export function getWeekStart(date) {
  return startOfWeek(date, { weekStartsOn: 1 });
}

export function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

export async function fetchReportData(person, weekStart) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const nextWeekStart = addWeeks(weekStart, 1);
  const nextWeekEnd = endOfWeek(nextWeekStart, { weekStartsOn: 1 });
  const isWholeTeam = person === 'Whole team';

  const [allTasks, allEntries] = await Promise.all([
    base44.entities.Request.list('-created_date', 500),
    base44.entities.TimeEntry.list('-created_date', 500),
  ]);

  const tasks = allTasks.filter(t => !t.archived);

  const weekEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd }); } catch { return false; }
  });

  const people = isWholeTeam ? TEAM_MEMBERS : [person];
  const reportByPerson = {};

  for (const p of people) {
    const pTasks = isWholeTeam ? tasks.filter(t => t.assignedTo === p) : tasks;
    const pEntries = isWholeTeam ? weekEntries.filter(e => e.teamMember === p) : weekEntries;
    reportByPerson[p] = buildPersonReport(pTasks, pEntries, weekStart, weekEnd, nextWeekStart, nextWeekEnd);
  }

  return { reportByPerson, isWholeTeam, weekStart, weekEnd, people };
}

function buildPersonReport(tasks, entries, weekStart, weekEnd, nextWeekStart, nextWeekEnd) {
  const taskTime = (taskId) => entries.filter(e => e.linkedTaskId === taskId).reduce((s, e) => s + (e.durationMinutes || 0), 0);

  // 1. DONE THIS WEEK
  const done = tasks
    .filter(t => {
      if (!t.completedDate) return false;
      try { return isWithinInterval(parseISO(t.completedDate), { start: weekStart, end: weekEnd }); } catch { return false; }
    })
    .map(t => ({
      title: t.title || 'Untitled',
      category: t.category || '—',
      outcome: t.outcome || '',
      timeMinutes: taskTime(t.id),
    }));

  // 2. IN PROGRESS / CARRIED OVER
  const inProgress = tasks
    .filter(t => {
      if (t.status === 'Done' || t.status === 'Blocked') return false;
      const hasTime = entries.some(e => e.linkedTaskId === t.id);
      return t.status === 'In Progress' || (t.status === 'To Do' && hasTime);
    })
    .map(t => {
      const createdDate = t.submittedAt || t.created_date;
      let carriedWeeks = 0;
      if (createdDate) {
        try { carriedWeeks = Math.max(0, differenceInWeeks(weekEnd, parseISO(createdDate))); } catch {}
      }
      return {
        title: t.title || 'Untitled',
        status: t.status,
        timeMinutes: taskTime(t.id),
        carriedWeeks,
      };
    });

  // 3. BLOCKED
  const blocked = tasks
    .filter(t => t.status === 'Blocked')
    .map(t => {
      const updatedDate = t.updated_date || t.created_date;
      let blockedDays = 0;
      if (updatedDate) {
        try { blockedDays = Math.max(0, Math.floor((weekEnd.getTime() - new Date(updatedDate).getTime()) / 86400000)); } catch {}
      }
      return {
        title: t.title || 'Untitled',
        category: t.category || '—',
        blockedDays,
      };
    });

  // 4. NEXT WEEK
  const nextWeek = tasks
    .filter(t => {
      if (t.status !== 'To Do' && t.status !== 'In Progress') return false;
      if (!t.deadline) return false;
      try { return isWithinInterval(parseISO(t.deadline), { start: nextWeekStart, end: nextWeekEnd }); } catch { return false; }
    })
    .map(t => ({ title: t.title || 'Untitled', deadline: t.deadline }));

  const notScheduled = tasks
    .filter(t => t.status === 'To Do' && !t.deadline)
    .map(t => ({ title: t.title || 'Untitled' }));

  // 5. TIME BY CATEGORY
  const byCategory = {};
  entries.forEach(e => {
    const cat = e.category || 'Other';
    byCategory[cat] = (byCategory[cat] || 0) + (e.durationMinutes || 0);
  });
  const totalTime = Object.values(byCategory).reduce((s, v) => s + v, 0);
  const timeByCategory = Object.entries(byCategory)
    .sort((a, b) => b[1] - a[1])
    .map(([category, minutes]) => ({
      category,
      minutes,
      share: totalTime > 0 ? Math.round(minutes / totalTime * 100) : 0,
    }));

  return { done, inProgress, blocked, nextWeek, notScheduled, timeByCategory, totalTime };
}

export function buildFlags(reportByPerson, isWholeTeam) {
  const flags = [];

  for (const [person, report] of Object.entries(reportByPerson)) {
    // Carried over 2+ weeks
    report.inProgress.forEach(t => {
      if (t.carriedWeeks >= 2) {
        flags.push(`${person}: "${t.title}" has been open for ${t.carriedWeeks} weeks, ${formatDuration(t.timeMinutes)} logged`);
      }
    });

    // Blocked for more than 3 days
    report.blocked.forEach(t => {
      if (t.blockedDays > 3) {
        flags.push(`${person}: "${t.title}" has been blocked for ${t.blockedDays} days`);
      }
    });

    // In Progress with no time logged this week
    report.inProgress.forEach(t => {
      if (t.timeMinutes === 0) {
        flags.push(`${person}: "${t.title}" is In Progress with no time logged this week`);
      }
    });
  }

  // Team members with no activity (whole team only)
  if (isWholeTeam) {
    for (const [person, report] of Object.entries(reportByPerson)) {
      const hasActivity = report.done.length > 0 || report.inProgress.length > 0 || report.blocked.length > 0 || report.totalTime > 0;
      if (!hasActivity) {
        flags.push(`${person}: no board or timer activity this week`);
      }
    }
  }

  return flags;
}

export async function generateAISummary(reportData) {
  const isWholeTeam = reportData.isWholeTeam;

  const dataForAI = {};
  for (const [p, report] of Object.entries(reportData.reportByPerson)) {
    dataForAI[p] = {
      done: report.done.map(t => ({ title: t.title, category: t.category, time: formatDuration(t.timeMinutes), outcome: t.outcome || null })),
      inProgress: report.inProgress.map(t => ({ title: t.title, time: formatDuration(t.timeMinutes), carriedWeeks: t.carriedWeeks || 0 })),
      blocked: report.blocked.map(t => ({ title: t.title })),
      nextWeek: report.nextWeek.map(t => ({ title: t.title, deadline: t.deadline })),
      notScheduled: report.notScheduled.map(t => ({ title: t.title })),
      totalTime: formatDuration(report.totalTime),
    };
  }

  const prompt = `You are writing a weekly report summary. Generate a ${isWholeTeam ? '4-5 sentence' : '2-3 sentence'} summary.

STRICT RULES:
- Use ONLY the information in the data below. Never invent outcomes, results, reasons, or impact.
- If a task has no outcome, describe it as completed and nothing more.
- Do not evaluate or judge performance, productivity, or effort. No comparisons between people. Hours are not a measure of value.
- Plain, neutral, professional tone. Short sentences.
${isWholeTeam ? '- Cover what moved across the team, what is blocked, and what is coming next week.' : ''}

Report data:
${JSON.stringify(dataForAI, null, 2)}`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result : String(result?.response || result || '');
}