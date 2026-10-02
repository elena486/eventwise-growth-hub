/**
 * Data fetching, report building, flags, and AI summary for the Weekly Report.
 * Tasks are attributed by `assignedTo` (current assignee only).
 * Time entries are attributed by `teamMember` (the person who logged them).
 * All time entries (linked or unlinked) are included in Hours and Time by Category.
 */
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, isWithinInterval, parseISO, addDays, subWeeks, differenceInWeeks, format, startOfDay, endOfDay, subDays, isSameDay } from 'date-fns';
import { MEMBERS } from '@/lib/sprintConfig';

export const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];

// Sprint submission cadence per person — determines how a submission maps to weekly reports
const SPRINT_CADENCE = {
  Chris: 'weekly', Elena: 'weekly', George: 'weekly',
  Martinique: 'monthly', Sreeja: 'weekly', Ramesh: 'weekly',
};

function findSprintSubmission(person, allSprints, reportWeekStart) {
  const cadence = SPRINT_CADENCE[person];
  if (!cadence) return null;
  const personSprints = allSprints.filter(s => s.memberName === person || (s.memberName && s.memberName.startsWith(person)));
  const weekStr = format(reportWeekStart, 'yyyy-MM-dd');
  if (cadence === 'weekly') {
    return personSprints.find(s => s.weekStart === weekStr) || null;
  }
  // Monthly: most recent submission whose weekStart is on or before the report week
  const candidates = personSprints.filter(s => s.weekStart <= weekStr).sort((a, b) => b.weekStart.localeCompare(a.weekStart));
  return candidates[0] || null;
}

function extractSprintData(submission, memberConfig) {
  if (!submission || !memberConfig) return null;
  let answers = {};
  try { answers = JSON.parse(submission.answers || '{}'); } catch {}
  const kpiConfigs = [memberConfig.kpi1, memberConfig.kpi2, memberConfig.kpi3].filter(k => k && k.questionId);
  const kpiValues = [submission.kpi1Value, submission.kpi2Value, submission.kpi3Value];
  const kpis = kpiConfigs.map((k, i) => ({
    label: k.label,
    value: kpiValues[i],
    target: k.target,
    prefix: k.prefix || '',
    suffix: k.suffix || '',
  }));
  return {
    selfRating: submission.selfRating || null,
    selfRatingReason: submission.selfRatingReason || null,
    kpis,
    blocker: answers.q_blocker || null,
    weekStart: submission.weekStart,
  };
}

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
  const prevWeekStart = subWeeks(weekStart, 1);
  const prevWeekEnd = endOfWeek(prevWeekStart, { weekStartsOn: 1 });
  const isWholeTeam = person === 'Whole team';

  const [allTasks, allEntries, allSprints] = await Promise.all([
    base44.entities.Request.list('-created_date', 500),
    base44.entities.TimeEntry.list('-created_date', 1000),
    base44.entities.SprintSubmission.list('-created_date', 500),
  ]);

  // Include archived Done tasks so completed work still counts for the week it was finished.
  // Archived non-Done tasks stay excluded (they don't belong in in-progress/blocked/coming-up).
  const tasks = allTasks.filter(t => !t.archived || t.status === 'Done');

  const weekEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: weekStart, end: weekEnd }); } catch { return false; }
  });

  const prevWeekEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: prevWeekStart, end: prevWeekEnd }); } catch { return false; }
  });

  const people = isWholeTeam ? TEAM_MEMBERS : [person];
  const reportByPerson = {};
  const prevStatsByPerson = {};

  for (const p of people) {
    const pTasks = tasks.filter(t => t.assignedTo === p);
    const pEntries = weekEntries.filter(e => e.teamMember === p);
    const pPrevEntries = prevWeekEntries.filter(e => e.teamMember === p);
    reportByPerson[p] = buildPersonReport(pTasks, pEntries, weekStart, weekEnd);
    prevStatsByPerson[p] = computeStats(pTasks, pPrevEntries, prevWeekStart, prevWeekEnd);
    const sprintMember = MEMBERS.find(m => m.name === p || m.name.startsWith(p));
    const submission = findSprintSubmission(p, allSprints, weekStart);
    reportByPerson[p].sprint = submission && sprintMember ? extractSprintData(submission, sprintMember) : null;
  }

  return { reportByPerson, prevStatsByPerson, isWholeTeam, weekStart, weekEnd, people };
}

export async function fetchDailyReportData(person, dayDate) {
  const dayStart = startOfDay(dayDate);
  const dayEnd = endOfDay(dayDate);
  const prevDay = subDays(dayDate, 1);
  const prevDayStart = startOfDay(prevDay);
  const prevDayEnd = endOfDay(prevDay);
  const isWholeTeam = person === 'Whole team';

  const [allTasks, allEntries] = await Promise.all([
    base44.entities.Request.list('-created_date', 500),
    base44.entities.TimeEntry.list('-created_date', 1000),
  ]);

  // Include archived Done tasks so completed work still counts for the week it was finished.
  // Archived non-Done tasks stay excluded (they don't belong in in-progress/blocked/coming-up).
  const tasks = allTasks.filter(t => !t.archived || t.status === 'Done');

  const dayEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: dayStart, end: dayEnd }); } catch { return false; }
  });
  const prevDayEntries = allEntries.filter(e => {
    try { return isWithinInterval(parseISO(e.date), { start: prevDayStart, end: prevDayEnd }); } catch { return false; }
  });

  const people = isWholeTeam ? TEAM_MEMBERS : [person];
  const reportByPerson = {};
  const prevStatsByPerson = {};

  // Coming up = tasks due tomorrow only
  const tomorrowStart = addDays(dayStart, 1);
  const tomorrowEnd = addDays(dayEnd, 1);

  for (const p of people) {
    const pTasks = tasks.filter(t => t.assignedTo === p);
    const pEntries = dayEntries.filter(e => e.teamMember === p);
    const pPrevEntries = prevDayEntries.filter(e => e.teamMember === p);
    reportByPerson[p] = buildPersonReport(pTasks, pEntries, dayStart, dayEnd, { comingUpStart: tomorrowStart, comingUpEnd: tomorrowEnd });
    prevStatsByPerson[p] = computeStats(pTasks, pPrevEntries, prevDayStart, prevDayEnd);

    // All time entries for the day (ordered by start time)
    reportByPerson[p].allTimeEntries = pEntries
      .slice()
      .sort((a, b) => {
        const aT = a.timerStartedAt || a.created_date || '';
        const bT = b.timerStartedAt || b.created_date || '';
        return String(aT).localeCompare(String(bT));
      })
      .map(e => ({
        title: e.linkedTaskTitle || e.projectTask || 'Untitled entry',
        category: e.category || 'Other',
        startAt: e.timerStartedAt || null,
        endAt: e.timerStoppedAt || null,
        durationMinutes: e.durationMinutes || 0,
        isLongUntitled: !e.linkedTaskId && (e.durationMinutes || 0) > 90,
      }));
    // No sprint in daily mode
    reportByPerson[p].sprint = null;
  }

  return { reportByPerson, prevStatsByPerson, isWholeTeam, weekStart: dayStart, weekEnd: dayEnd, people, isDayMode: true, dayDate };
}

function computeStats(tasks, entries, weekStart, weekEnd) {
  const completed = tasks.filter(t => {
    if (!t.completedDate) return false;
    try { return isWithinInterval(parseISO(t.completedDate), { start: weekStart, end: weekEnd }); } catch { return false; }
  }).length;

  const inProgress = tasks.filter(t => {
    if (t.status === 'Done' || t.status === 'Blocked') return false;
    const hasTime = entries.some(e => e.linkedTaskId === t.id);
    return t.status === 'In Progress' || (t.status === 'To Do' && hasTime);
  }).length;

  const blocked = tasks.filter(t => t.status === 'Blocked').length;
  const hoursLogged = entries.reduce((s, e) => s + (e.durationMinutes || 0), 0);

  return { completed, inProgress, blocked, hoursLogged };
}

function buildPersonReport(tasks, entries, weekStart, weekEnd, opts = {}) {
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
        notes: t.notes || '',
        outcome: t.outcome || '',
      };
    });

  // 4. COMING UP — next 7 days after week end (or custom range for daily mode)
  const comingUpStart = opts.comingUpStart || addDays(weekEnd, 1);
  const comingUpEnd = opts.comingUpEnd || addDays(weekEnd, 7);
  const comingUp = tasks
    .filter(t => {
      if (t.status !== 'To Do' && t.status !== 'In Progress') return false;
      if (!t.deadline) return false;
      try { return isWithinInterval(parseISO(t.deadline), { start: comingUpStart, end: comingUpEnd }); } catch { return false; }
    })
    .map(t => ({ title: t.title || 'Untitled', deadline: t.deadline }));

  const unscheduledCount = tasks.filter(t => t.status === 'To Do' && !t.deadline).length;

  // 5. TIME BY CATEGORY — all entries, linked or not
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

  // Board task adoption
  const boardTaskHours = entries.filter(e => e.linkedTaskId).reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const boardTaskAdoptionPct = totalTime > 0 ? Math.round(boardTaskHours / totalTime * 100) : 0;

  return {
    done,
    inProgress,
    longRunning,
    blocked,
    comingUp,
    unscheduledCount,
    timeByCategory,
    totalTime,
    boardTaskHours,
    boardTaskAdoptionPct,
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
    if (!isWholeTeam && viewingPerson && person === viewingPerson) continue;

    const personFlags = [];
    const flaggedTitles = new Set();

    report.blocked.forEach(t => {
      if (t.blockedDays > 3 && !flaggedTitles.has(t.title)) {
        personFlags.push(`${person}: "${t.title}" blocked for ${t.blockedDays} days`);
        flaggedTitles.add(t.title);
      }
    });

    report.longRunning.forEach(t => {
      if (!flaggedTitles.has(t.title)) {
        personFlags.push(`${person}: "${t.title}" open for ${t.carriedWeeks} weeks`);
        flaggedTitles.add(t.title);
      }
    });

    const hasActivity = report.stats.completed > 0 || report.stats.inProgress > 0 || report.stats.blocked > 0 || report.stats.hoursLogged > 0;
    if (!hasActivity) {
      personFlags.push(`${person}: no board or timer activity this week`);
    }

    flags.push(...personFlags.slice(0, 5));
  }

  return flags;
}

export async function generateAISummary(reportData, companyPriorities) {
  const isWholeTeam = reportData.isWholeTeam;
  const isDayMode = reportData.isDayMode;

  const dataForAI = {};
  for (const [p, report] of Object.entries(reportData.reportByPerson)) {
    dataForAI[p] = {
      completed: report.done.map(t => ({ title: t.title, outcome: t.outcome || null })),
      inProgress: report.inProgress.map(t => ({ title: t.title })),
      blocked: report.blocked.map(t => ({ title: t.title, notes: t.notes || null, outcome: t.outcome || null })),
      comingUp: report.comingUp.map(t => ({ title: t.title, deadline: t.deadline })),
      hasBlocked: report.blocked.length > 0,
      hasComingUp: report.comingUp.length > 0,
      sprint: report.sprint ? {
        selfRating: report.sprint.selfRating,
        kpis: report.sprint.kpis.map(k => ({
          label: k.label,
          value: k.value,
          target: k.target,
          hitTarget: k.target != null && k.value != null && k.value >= k.target,
          missedTarget: k.target != null && k.value != null && k.value < k.target,
        })),
        blocker: report.sprint.blocker || null,
      } : null,
    };
  }

  const periodWord = isDayMode ? 'day' : 'week';
  const periodWordCap = isDayMode ? 'Day' : 'Week';
  const nextWindow = isDayMode ? 'tomorrow' : 'the next 7 days';

  const prompt = `You are writing a ${isDayMode ? 'daily' : 'weekly'} report summary with three labelled lines: Moved, Blocking, and Next.

${isWholeTeam ? 'This is a WHOLE TEAM report. Write one to two sentences per line, covering the team as a whole rather than person by person.' : 'This is an INDIVIDUAL report. Write one sentence per line.'}

CONTENT RULES:
- Do NOT restate what is already visible in the report tiles and lists: no counts, no hours, no listing task titles one by one. Refer to themes of work, not individual tasks.
- Explain relevance: connect the work to the company priorities below when there is a genuine link. Skip the link if there isn't one. Never force it.
- Use intent wording for work without a recorded outcome: "supports", "aims to", "lays groundwork for", "keeps X moving". Use result wording ("reduced", "improved", "saved", "increased") ONLY when a task's Outcome line states it, and stay as close to that wording as possible.
- Never invent numbers, results, customers, or causes.
- Moved: what progressed this ${periodWord} and why it matters to the team or company.${isDayMode ? '' : ' May reference KPI performance from the sprint submission when notable (e.g. hit or missed a target), but never invent numbers — only state what\'s in the data.'}
- Blocking: use Blocked-status tasks${isDayMode ? '' : ' AND the sprint blocker line (sprint.blocker)'}. ${isDayMode ? 'If none, write exactly "Nothing flagged."' : 'If both exist, mention both distinctly. If only one exists, use that one. If neither, write exactly "Nothing flagged."'} Do not infer blockers from missing time or long-running tasks.
- Next: base on tasks due ${nextWindow} and current in-progress focus. If nothing is scheduled, write exactly "No dated work scheduled yet."
- No judgement of performance, effort or productivity. No comparisons between people. Neutral, plain, professional tone. Short sentences.
- If there is very little data, keep it short and honest rather than padding it out.

${companyPriorities ? `COMPANY PRIORITIES (use to explain why work matters where there is a genuine link):\n${companyPriorities}` : 'No company priorities have been set. Do not make company-level claims.'}

Report data:
${JSON.stringify(dataForAI, null, 2)}

Return a JSON object with three string fields: "moved", "blocking", "next".`;

  const result = await base44.integrations.Core.InvokeLLM({
    prompt,
    response_json_schema: {
      type: 'object',
      properties: {
        moved: { type: 'string' },
        blocking: { type: 'string' },
        next: { type: 'string' },
      },
      required: ['moved', 'blocking', 'next'],
    },
  });

  if (result && typeof result === 'object' && result.moved !== undefined) {
    return { moved: result.moved || '', blocking: result.blocking || '', next: result.next || '' };
  }
  if (typeof result === 'string') {
    try {
      const parsed = JSON.parse(result);
      return { moved: parsed.moved || '', blocking: parsed.blocking || '', next: parsed.next || '' };
    } catch {}
  }
  return { moved: '', blocking: '', next: '' };
}