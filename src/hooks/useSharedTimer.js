/**
 * Shared timer state — a single module-level store so all components
 * (LogTime today tab, LogTimeSidebar, NavTimer) always read the same state.
 *
 * Usage:
 *   const { timerState, timerActions } = useSharedTimer();
 */
import { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const LS_KEY_PREFIX = 'eventwise_timer_';
function lsKey(userId) { return `${LS_KEY_PREFIX}${userId}`; }
function lsSave(userId, data) { try { localStorage.setItem(lsKey(userId), JSON.stringify(data)); } catch {} }
function lsClear(userId) { try { localStorage.removeItem(lsKey(userId)); } catch {} }

// ─── Module-level shared state ───────────────────────────────────────────────
let _listeners = new Set();
let _state = {
  status: 'idle',       // 'idle' | 'running' | 'paused'
  elapsed: 0,
  timerId: null,
  category: '',
  projectTask: '',
  clientId: '',
  clientName: '',
  transcriptLink: '',
  transcriptFileUrl: '',
  transcriptFileName: '',
  userId: null,
};

function getState() { return _state; }

function setState(patch) {
  _state = { ..._state, ...patch };
  _listeners.forEach(fn => fn(_state));
}

// Interval lives at module level so it's shared
let _intervalHandle = null;
let _startTimeMs = null;
let _totalPausedMs = 0;
let _pauseStartMs = null;

function startTick() {
  if (_intervalHandle) clearInterval(_intervalHandle);
  _intervalHandle = setInterval(() => {
    const elapsed = Date.now() - _startTimeMs - _totalPausedMs;
    setState({ elapsed });
  }, 500);
}

function stopTick() {
  if (_intervalHandle) clearInterval(_intervalHandle);
  _intervalHandle = null;
}

// ─── Actions (these mutate shared state + hit the DB) ────────────────────────

export async function sharedTimerStart({ teamMember, category, projectTask, clientId, clientName, userId }) {
  if (_state.timerId) return; // already running
  const now = new Date().toISOString();
  const nowMs = new Date(now).getTime();
  const record = await base44.entities.TimeEntry.create({
    date: format(new Date(), 'yyyy-MM-dd'),
    teamMember,
    category: category || '',
    projectTask: projectTask?.trim() || '(Untitled session)',
    durationMinutes: 0,
    timerStatus: 'running',
    timerStartedAt: now,
    timerPauseIntervals: '[]',
    ...(clientId ? { clientId, clientName } : {}),
  });
  _startTimeMs = nowMs;
  _totalPausedMs = 0;
  _pauseStartMs = null;
  setState({ status: 'running', elapsed: 0, timerId: record.id, category: category || '', projectTask: projectTask?.trim() || '', clientId: clientId || '', clientName: clientName || '', userId });
  startTick();
  if (userId) lsSave(userId, { startedAt: now, status: 'running', totalPausedMs: 0, pauseIntervals: [], recordId: record.id });
}

export async function sharedTimerPause() {
  if (_state.status !== 'running') return;
  const pauseTime = new Date().toISOString();
  _pauseStartMs = Date.now();
  stopTick();
  setState({ status: 'paused' });
  if (_state.timerId) {
    const rec = await base44.entities.TimeEntry.get(_state.timerId).catch(() => null);
    if (rec) {
      const ivs = JSON.parse(rec.timerPauseIntervals || '[]');
      ivs.push({ pausedAt: pauseTime, resumedAt: null });
      await base44.entities.TimeEntry.update(_state.timerId, { timerStatus: 'paused', timerPauseIntervals: JSON.stringify(ivs) }).catch(() => {});
    }
  }
}

export async function sharedTimerResume() {
  if (_state.status !== 'paused') return;
  const resumeMs = Date.now();
  if (_pauseStartMs) { _totalPausedMs += resumeMs - _pauseStartMs; _pauseStartMs = null; }
  setState({ status: 'running' });
  startTick();
  if (_state.timerId) {
    const rec = await base44.entities.TimeEntry.get(_state.timerId).catch(() => null);
    if (rec) {
      const ivs = JSON.parse(rec.timerPauseIntervals || '[]');
      if (ivs.length > 0 && !ivs[ivs.length - 1].resumedAt) ivs[ivs.length - 1].resumedAt = new Date().toISOString();
      await base44.entities.TimeEntry.update(_state.timerId, { timerStatus: 'running', timerPauseIntervals: JSON.stringify(ivs) }).catch(() => {});
    }
  }
}

export async function sharedTimerStop() {
  // Returns { durationMs, durationMinutes, timerId, category, projectTask, clientId, clientName }
  if (_state.status === 'paused' && _pauseStartMs) { _totalPausedMs += Date.now() - _pauseStartMs; _pauseStartMs = null; }
  const durationMs = _state.status !== 'idle' ? Date.now() - _startTimeMs - _totalPausedMs : _state.elapsed;
  const durationMinutes = Math.max(1, Math.round(durationMs / 60000));
  stopTick();
  const result = { durationMs, durationMinutes, timerId: _state.timerId, category: _state.category, projectTask: _state.projectTask, clientId: _state.clientId, clientName: _state.clientName };
  // Update DB to stopped
  if (_state.timerId) {
    await base44.entities.TimeEntry.update(_state.timerId, {
      timerStatus: 'stopped', timerStoppedAt: new Date().toISOString(), durationMinutes,
      category: _state.category, projectTask: _state.projectTask || '(Untitled session)',
      ...(_state.clientId ? { clientId: _state.clientId, clientName: _state.clientName } : {}),
    }).catch(() => {});
  }
  const userId = _state.userId;
  setState({ status: 'idle', elapsed: 0, timerId: null, category: '', projectTask: '', clientId: '', clientName: '', userId: null });
  if (userId) lsClear(userId);
  return result;
}

export function sharedTimerUpdateMeta(patch) {
  // Updates category/task/client in shared state + debounced DB sync
  setState(patch);
  // DB sync is handled by the component via the debounce effect
}

export async function sharedTimerCommit(timerId, formData, teamMember) {
  // Finalize the entry after stop
  await base44.entities.TimeEntry.update(timerId, {
    ...formData, timerStatus: 'logged', teamMember,
    transcriptLink: formData.transcriptLink || '',
    ...(!formData.clientId ? { clientId: '', clientName: '' } : {}),
  });
}

// ─── Load running timer from DB on app boot ───────────────────────────────────
export async function sharedTimerBootstrap(teamMember, userId) {
  if (_state.timerId) return; // already loaded
  try {
    const running = await base44.entities.TimeEntry.filter(
      { teamMember, timerStatus: { $in: ['running', 'paused'] } }, '-created_date', 5
    );
    if (running.length === 0) return;
    const rec = running[0];
    const pauseIntervals = JSON.parse(rec.timerPauseIntervals || '[]');
    let totalPaused = 0;
    pauseIntervals.forEach(iv => {
      if (iv.pausedAt) {
        const pMs = new Date(iv.pausedAt).getTime();
        const rMs = iv.resumedAt ? new Date(iv.resumedAt).getTime() : Date.now();
        totalPaused += rMs - pMs;
      }
    });
    _startTimeMs = new Date(rec.timerStartedAt).getTime();
    _totalPausedMs = totalPaused;
    _pauseStartMs = null;
    const elapsed = Date.now() - _startTimeMs - _totalPausedMs;
    setState({
      status: rec.timerStatus === 'running' ? 'running' : 'paused',
      elapsed,
      timerId: rec.id,
      category: rec.category === '(Untitled session)' ? '' : rec.category || '',
      projectTask: rec.projectTask === '(Untitled session)' ? '' : rec.projectTask || '',
      clientId: rec.clientId || '',
      clientName: rec.clientName || '',
      userId,
    });
    if (rec.timerStatus === 'running') {
      startTick();
    } else {
      const last = pauseIntervals[pauseIntervals.length - 1];
      if (last && !last.resumedAt) _pauseStartMs = new Date(last.pausedAt).getTime();
    }
  } catch {}
}

// ─── React hook ──────────────────────────────────────────────────────────────
export function useSharedTimer() {
  const [state, setLocalState] = useState(getState());

  useEffect(() => {
    const listener = (s) => setLocalState({ ...s });
    _listeners.add(listener);
    return () => _listeners.delete(listener);
  }, []);

  return state;
}