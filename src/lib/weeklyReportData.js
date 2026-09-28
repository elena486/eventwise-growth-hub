/**
 * Data fetching, report building, flags, and AI summary for the Weekly Report.
 * Tasks are attributed by `assignedTo` (current assignee only).
 * Time entries are attributed by `teamMember` (the person who logged them).
 */
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays, differenceInWeeks, format } from 'date-fns';

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

const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export async function fetchReportData(person, weekStart) {
  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
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
    // FIX: always filter by assignee for tasks, by teamMember for time entries
    const pTasks = tasks.filter(t => t.assignedTo === p);
    const pEntries = weekEntries.filter(e => e.teamMember === p);
    reportByPerson[p] = buildPersonReport(pTasks, pEntries, weekStart, weekEnd);
  }

  return { reportByPerson, isWholeTeam, weekStart, weekEnd, people };
}

function buildPersonReport(tasks, entries, weekStart, weekEnd) {
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

  // 2. IN PROGRESS — split into active (< 4 weeks) and long-running (4+ weeks)
  const allInProgress = tasks
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
        priority: t.priority || 'Medium',
        timeMinutes: taskTime(t.id),
        carriedWeeks,
      };
    });

  const sortByHoursThenPriority = (a, b) => {
    const timeDiff = b.timeMinutes - a.timeMinutes;
    if (timeDiff !== 0) return timeDiff;
    return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
  };

  const inProgress = allInProgress.filter(t => t.carriedWeeks < 4).sort(sortByHoursThenPriority);
  const longRunning = allInProgress.filter(t => t.carriedWeeks >= 4).sort(sortByHoursThenPriority);

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

  // 4. COMING UP — next 7 days after week end
  const comingUpStart = addDays(weekEnd, 1);
  const comingUpEnd = addDays(weekEnd, 7);
  const comingUp = tasks
    .filter(t => {
      if (t.status !== 'To Do' && t.status !== 'In Progress') return false;
      if (!t.deadline) return false;
      try { return isWithinInterval(parseISO(t.deadline), { start: comingUpStart, end: comingUpEnd }); } catch { return false; }
    })
    .map(t => ({ title: t.title || 'Untitled', deadline: t.deadline }));

  const unscheduledCount = tasks.filter(t => t.status === 'To Do' && !t.deadline).length;

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

  return {
    done,
    inProgress,
    longRunning,
    blocked,
    comingUp,
    unscheduledCount,
    timeByCategory,
    totalTime,
    stats: {
      completed: done.length,
      inProgress: allInProgress.length,
      blocked: blocked.length,
      hoursLogged: totalTime,
    },
  };
}

export function buildFlags(reportByPerson, isWholeTeam, viewingPerson) {
  const flags = [];

  for (const [person, report] of Object.entries(reportByPerson)) {
    // Skip the viewer's own tasks in their individual report
    if (!isWholeTeam && viewingPerson && person === viewingPerson) continue;

    const personFlags = [];
    const flaggedTitles = new Set();

    // 1. Blocked more than 3 days
    report.blocked.forEach(t => {
      if (t.blockedDays > 3 && !flaggedTitles.has(t.title)) {
        personFlags.push(`${person}: "${t.title}" blocked for ${t.blockedDays} days`);
        flaggedTitles.add(t.title);
      }
    });

    // 2. Open 4+ weeks
    report.longRunning.forEach(t => {
      if (!flaggedTitles.has(t.title)) {
        personFlags.push(`${person}: "${t.title}" open for ${t.carriedWeeks} weeks`);
        flaggedTitles.add(t.title);
      }
    });

    // 3. No activity in the week
    const hasActivity = report.stats.completed > 0 || report.stats.inProgress > 0 || report.stats.blocked > 0 || report.stats.hoursLogged > 0;
    if (!hasActivity) {
      personFlags.push(`${person}: no board or timer activity this week`);
    }

    // Max 5 per person
    flags.push(...personFlags.slice(0, 5));
  }

  return flags;
}

export async function generateAISummary(reportData) {
  const isWholeTeam = reportData.isWholeTeam;

  const dataForAI = {};
  for (const [p, report] of Object.entries(reportData.reportByPerson)) {
    dataForAI[p] = {
      completed: report.done.map(t => ({ title: t.title, outcome: t.outcome || null, hours: formatDuration(t.timeMinutes) })),
      inProgress: report.inProgress.map(t => ({ title: t.title, hours: formatDuration(t.timeMinutes) })),
      longRunning: report.longRunning.map(t => ({ title: t.title, weeksOpen: t.carriedWeeks })),
      blocked: report.blocked.map(t => ({ title: t.title })),
      comingUp: report.comingUp.map(t => ({ title: t.title, deadline: t.deadline })),
      totalTime: formatDuration(report.totalTime),
      stats: report.stats,
    };
  }

  const prompt = `You are writing a weekly report summary. Generate a ${isWholeTeam ? '3-4 sentence' : '2-3 sentence'} summary.

STRICT RULES:
- Use ONLY the information in the data below. Never invent outcomes, results, reasons, or impact.
- If a task has no outcome, describe it as completed and nothing more.
- Do not evaluate or judge performance, productivity, or effort. No comparisons between people. Hours are not a measure of value.
- Plain, neutral, professional tone. Short sentences.
${isWholeTeam ? '- Cover what moved across the team, what is blocked, and what is coming next.' : ''}

Report data:
${JSON.stringify(dataForAI, null, 2)}`;

  const result = await base44.integrations.Core.InvokeLLM({ prompt });
  return typeof result === 'string' ? result : String(result?.response || result || '');
}