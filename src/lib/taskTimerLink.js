/**
 * Shared helpers for linking Time Entries to To-Do Board tasks.
 * Used by all timer surfaces (LogTime, NavTimer, LogTimeSidebar,
 * InteractiveCalendar, QuickEntryModal) to keep task-status logic
 * consistent with the RequestBoard.
 */
import { base44 } from '@/api/base44Client';
import { logActivity } from '@/lib/logActivity';

/**
 * Navigate to the To-Do Board and auto-open a specific task.
 * Uses the same sessionStorage mechanism as the RequestBoard.
 */
export function navigateToTask(taskId) {
  if (!taskId) return;
  sessionStorage.setItem('focus_request_id', taskId);
  const url = new URL(window.location.href);
  url.searchParams.set('tab', 'team-board');
  window.history.pushState({}, '', url);
  window.dispatchEvent(new PopStateEvent('popstate'));
}

/**
 * If a task is still in "To Do" status, move it to "In Progress".
 * Called when a timer is started against a task.
 */
export async function moveTaskToInProgress(taskId, teamMember) {
  if (!taskId) return;
  try {
    const task = await base44.entities.Request.get(taskId);
    if (!task) return;
    if (task.status === 'To Do') {
      await base44.entities.Request.update(taskId, { status: 'In Progress' });
      logActivity({ teamMember: teamMember || '', actionType: 'Updated a task status', section: 'To-Do Board', recordName: task.title || '', details: '→ In Progress' });
    }
  } catch {}
}

/**
 * Mark a task as Done. Called when the user clicks "Mark task complete"
 * after stopping a timer, or uses the "✓ Complete" shortcut.
 */
export async function completeTask(taskId, teamMember) {
  if (!taskId) return;
  try {
    const task = await base44.entities.Request.get(taskId);
    if (!task) return;
    await base44.entities.Request.update(taskId, { status: 'Done' });
    logActivity({ teamMember: teamMember || '', actionType: 'Updated a task status', section: 'To-Do Board', recordName: task.title || '', details: '→ Done' });
  } catch {}
}

/**
 * Fetch the current status of a task. Returns null if not found.
 */
export async function getTaskStatus(taskId) {
  if (!taskId) return null;
  try {
    const task = await base44.entities.Request.get(taskId);
    return task?.status || null;
  } catch { return null; }
}

/**
 * Compute total minutes logged against a set of task IDs.
 * Returns a map of { taskId: totalMinutes }.
 */
export async function loadTaskTimeTotals() {
  try {
    const entries = await base44.entities.TimeEntry.list('-created_date', 500);
    const map = {};
    entries.forEach(e => {
      if (e.linkedTaskId && e.durationMinutes) {
        map[e.linkedTaskId] = (map[e.linkedTaskId] || 0) + e.durationMinutes;
      }
    });
    return map;
  } catch { return {}; }
}

/**
 * Brief toast notification for task-related actions.
 */
export function showTaskToast(msg) {
  const el = document.createElement('div');
  el.className = 'fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] bg-[#1D9E75] text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl animate-toast-in';
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

/**
 * Format minutes as "Xh Ym" or "Ym" or "Xh".
 */
export function formatTaskDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}