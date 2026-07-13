import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Play, Square, Pause, ChevronDown } from 'lucide-react';
import TaskPresetSelect from './TaskPresetSelect';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];
const LS_KEY = 'eventwise_floating_timer';

function saveToLS(data) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch {}
}
function getFromLS() {
  try { const raw = localStorage.getItem(LS_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
}
function clearLS() {
  try { localStorage.removeItem(LS_KEY); } catch {}
}

function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function FloatingTimer({ onStopAndLog }) {
  const [expanded, setExpanded] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [timerStatus, setTimerStatus] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [dbId, setDbId] = useState(null);
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [clients, setClients] = useState([]);
  const startRef = useRef(null);
  const intervalRef = useRef(null);
  const pauseStartRef = useRef(null);
  const totalPausedMsRef = useRef(0);

  // Resolve current user
  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
  }, []);

  // Load running/paused timer
  useEffect(() => {
    const init = async () => {
      const lsData = getFromLS();
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      const firstName = me.full_name?.split(' ')[0] || '';

      // Check DB for running/paused timer
      const all = await base44.entities.TimeEntry.filter(
        { teamMember: firstName, timerStatus: { $in: ['running', 'paused'] } },
        '-created_date', 10
      );

      if (all.length > 0) {
        const record = all[0];
        setDbId(record.id);
        setCategory(record.category === '(Untitled session)' ? '' : record.category || '');
        setClientId(record.clientId || '');
        setClientName(record.clientName || '');
        setProjectTask(record.projectTask === '(Untitled session)' ? '' : record.projectTask || '');

        const startedAt = record.timerStartedAt;
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (startedAt) {
          const startMs = new Date(startedAt).getTime();
          startRef.current = startMs;

          // Calculate total paused time from intervals
          let totalPaused = 0;
          intervals.forEach(iv => {
            if (iv.pausedAt) {
              const pausedMs = new Date(iv.pausedAt).getTime();
              const resumedMs = iv.resumedAt ? new Date(iv.resumedAt).getTime() : Date.now();
              totalPaused += resumedMs - pausedMs;
            }
          });
          totalPausedMsRef.current = totalPaused;

          if (record.timerStatus === 'running') {
            setTimerStatus('running');
            intervalRef.current = setInterval(() => {
              setElapsed(Date.now() - startRef.current - totalPausedMsRef.current);
            }, 500);
            setElapsed(Date.now() - startMs - totalPaused);
          } else if (record.timerStatus === 'paused') {
            setTimerStatus('paused');
            const lastInterval = intervals[intervals.length - 1];
            if (lastInterval && !lastInterval.resumedAt && lastInterval.pausedAt) {
              pauseStartRef.current = new Date(lastInterval.pausedAt).getTime();
            }
            setElapsed(Date.now() - startMs - totalPaused);
          }
        }

        // Sync localStorage
        saveToLS({
          startedAt: record.timerStartedAt,
          category: record.category || '',
          projectDescription: record.projectTask || '',
          clientId: record.clientId || '',
          clientName: record.clientName || '',
          status: record.timerStatus,
          totalPausedMs: totalPausedMsRef.current,
          pauseIntervals: intervals,
          recordId: record.id,
        });
      } else if (lsData && (lsData.status === 'running' || lsData.status === 'paused')) {
        // Stale localStorage — clear
        clearLS();
      }
    };
    init();
    return () => clearInterval(intervalRef.current);
  }, []);

  // Update DB as fields change during active session
  useEffect(() => {
    if (!dbId || timerStatus === 'idle') return;
    const debounce = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(dbId, {
          category: category || '',
          projectTask: projectTask.trim() || '(Untitled session)',
          ...(clientId ? { clientId, clientName } : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(debounce);
  }, [category, clientId, projectTask]);

  const handleStart = async () => {
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const firstName = me.full_name?.split(' ')[0] || '';
    const now = new Date().toISOString();
    const nowMs = new Date(now).getTime();

    const record = await base44.entities.TimeEntry.create({
      date: new Date().toISOString().slice(0, 10),
      teamMember: firstName,
      category: category || '',
      projectTask: projectTask.trim() || '(Untitled session)',
      durationMinutes: 0,
      timerStatus: 'running',
      timerStartedAt: now,
      timerPauseIntervals: '[]',
      ...(clientId ? { clientId, clientName } : {}),
    });

    setDbId(record.id);
    setTimerStatus('running');
    startRef.current = nowMs;
    setElapsed(0);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current - totalPausedMsRef.current);
    }, 500);

    saveToLS({
      startedAt: now,
      category,
      projectDescription: projectTask.trim() || '(Untitled session)',
      clientId,
      clientName,
      status: 'running',
      totalPausedMs: 0,
      pauseIntervals: [],
      recordId: record.id,
    });
  };

  const handlePause = async () => {
    const pauseTime = new Date().toISOString();
    pauseStartRef.current = new Date(pauseTime).getTime();
    clearInterval(intervalRef.current);
    setTimerStatus('paused');

    const lsData = getFromLS();
    if (lsData) {
      lsData.status = 'paused';
      lsData.pauseStartedAt = pauseTime;
      saveToLS(lsData);
    }

    if (dbId) {
      try {
        const record = await base44.entities.TimeEntry.get(dbId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        intervals.push({ pausedAt: pauseTime, resumedAt: null });
        await base44.entities.TimeEntry.update(dbId, {
          timerStatus: 'paused',
          timerPauseIntervals: JSON.stringify(intervals),
        });
      } catch {}
    }
  };

  const handleResume = async () => {
    const resumeTime = new Date().toISOString();
    const resumeMs = new Date(resumeTime).getTime();

    if (pauseStartRef.current) {
      totalPausedMsRef.current += resumeMs - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    setTimerStatus('running');

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startRef.current - totalPausedMsRef.current);
    }, 500);

    const lsData = getFromLS();
    if (lsData) {
      lsData.status = 'running';
      lsData.totalPausedMs = totalPausedMsRef.current;
      delete lsData.pauseStartedAt;
      saveToLS(lsData);
    }

    if (dbId) {
      try {
        const record = await base44.entities.TimeEntry.get(dbId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (intervals.length > 0 && intervals[intervals.length - 1].resumedAt === null) {
          intervals[intervals.length - 1].resumedAt = resumeTime;
        }
        await base44.entities.TimeEntry.update(dbId, {
          timerStatus: 'running',
          timerPauseIntervals: JSON.stringify(intervals),
        });
      } catch {}
    }
  };

  const handleStopAndLog = async () => {
    clearInterval(intervalRef.current);

    if (timerStatus === 'paused' && pauseStartRef.current) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    const now = new Date();
    const totalActiveMs = Date.now() - startRef.current - totalPausedMsRef.current;
    const totalMin = Math.max(1, Math.round(totalActiveMs / 60000));

    if (dbId) {
      await base44.entities.TimeEntry.update(dbId, {
        timerStatus: 'stopped',
        timerStoppedAt: now.toISOString(),
        durationMinutes: totalMin,
        category: category || '',
        projectTask: projectTask.trim() || '',
        ...(clientId ? { clientId, clientName } : {}),
        timerPauseIntervals: JSON.stringify([]),
      }).catch(() => {});
    }

    // Pass review data via sessionStorage so LogTime tab picks it up
    try {
      sessionStorage.setItem('timer_review_data', JSON.stringify({
        category: category || '',
        projectTask: projectTask.trim() || '',
        clientId: clientId || '',
        clientName: clientName || '',
        durationMinutes: totalMin,
        recordId: dbId,
      }));
    } catch {}

    clearLS();
    setTimerStatus('idle');
    setDbId(null);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;
    setExpanded(false);

    // Notify LogTime tab to pick up the review data
    window.dispatchEvent(new CustomEvent('timer-review-available'));
    onStopAndLog?.();
  };

  const handleDiscard = async () => {
    clearInterval(intervalRef.current);
    if (dbId) {
      await base44.entities.TimeEntry.delete(dbId).catch(() => {});
    }
    clearLS();
    setTimerStatus('idle');
    setDbId(null);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;
    setExpanded(false);
  };

  // ── Minimized: NOT STARTED ──
  if (timerStatus === 'idle' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-[#242450] hover:bg-[#1A1A3A] text-white flex items-center justify-center shadow-lg transition-all hover:scale-105 group"
        title="Start a timer"
      >
        <Clock className="w-5 h-5" />
        <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-[#242450] text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Start a timer
        </span>
      </button>
    );
  }

  // ── Minimized: RUNNING ──
  if (timerStatus === 'running' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#FFFBEB] border-2 border-[#E8A020] text-[#A16207] shadow-lg hover:scale-105 transition-all group"
      >
        <span className="w-2 h-2 rounded-full bg-[#E8A020] animate-pulse" />
        <span className="font-mono text-sm font-bold tracking-wider">{formatTime(elapsed)}</span>
        <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-[#242450] text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Timer running — click to view
        </span>
      </button>
    );
  }

  // ── Minimized: PAUSED ──
  if (timerStatus === 'paused' && !expanded) {
    return (
      <button
        onClick={() => setExpanded(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#F6F6FB] border-2 border-[#9CA3AF] text-[#5777AB] shadow-lg hover:scale-105 transition-all group"
      >
        <span className="w-2 h-2 rounded-full bg-[#9CA3AF]" />
        <span className="font-mono text-sm font-bold tracking-wider">{formatTime(elapsed)}</span>
        <span className="absolute right-full mr-3 px-2.5 py-1.5 bg-[#242450] text-white text-xs font-semibold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
          Paused — click to view
        </span>
      </button>
    );
  }

  // ── Expanded panel ──
  const statusColor = timerStatus === 'running' ? 'text-[#E8A020]' : timerStatus === 'paused' ? 'text-[#9CA3AF]' : 'text-[#242450]';

  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-[#EBEBF5] rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#242450] text-white">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-bold">⏱ Timer</span>
        </div>
        <button onClick={() => setExpanded(false)} className="p-1 hover:bg-white/10 rounded group/min" title="Minimise — timer keeps running">
          <ChevronDown className="w-4 h-4" />
          <span className="absolute right-0 top-full mt-1 px-2 py-1 bg-[#242450] text-white text-[10px] font-semibold rounded-md opacity-0 group-hover/min:opacity-100 transition-opacity whitespace-nowrap pointer-events-none z-50">
            Minimise — timer keeps running
          </span>
        </button>
      </div>

      {/* Elapsed */}
      <div className="px-4 py-4 text-center border-b border-[#EBEBF5]">
        <span className={`text-3xl font-bold font-mono tracking-wider ${statusColor}`}>
          {formatTime(elapsed)}
        </span>
        <div className="flex items-center justify-center gap-1.5 mt-1">
          {timerStatus === 'running' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] animate-pulse" />
              <span className="text-xs text-[#A16207] font-semibold">Running</span>
            </>
          )}
          {timerStatus === 'paused' && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[#9CA3AF]" />
              <span className="text-xs text-[#5777AB] font-semibold">Paused</span>
            </>
          )}
        </div>
      </div>

      {/* Form */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Team member</label>
          <select value={teamMember} onChange={e => setTeamMember(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white text-[#242450]">
            <option value="">Select…</option>
            {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white">
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }}
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white">
            <option value="">None</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Project / Task</label>
          <TaskPresetSelect
            category={category}
            value={projectTask}
            onChange={setProjectTask}
            placeholder="What are you working on?"
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white"
          />
        </div>

        {/* IDLE: Start button */}
        {timerStatus === 'idle' && (
          <button onClick={handleStart}
            className="w-full py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
            <Play className="w-4 h-4" fill="white" /> Start Timer
          </button>
        )}

        {/* RUNNING: Pause + Stop */}
        {timerStatus === 'running' && (
          <>
            <div className="flex gap-2">
              <button onClick={handlePause}
                className="flex-1 py-2.5 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <button onClick={handleStopAndLog}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Square className="w-3.5 h-3.5" fill="white" /> Stop &amp; Log
              </button>
            </div>
            <button onClick={() => setExpanded(false)} className="w-full text-center text-[11px] text-[#9CA3AF] hover:text-[#5777AB] transition-colors py-0.5">
              Hide panel
            </button>
          </>
        )}

        {/* PAUSED: Resume + Stop */}
        {timerStatus === 'paused' && (
          <>
            <div className="flex gap-2">
              <button onClick={handleResume}
                className="flex-1 py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Play className="w-3.5 h-3.5" fill="white" /> Resume
              </button>
              <button onClick={handleStopAndLog}
                className="flex-1 py-2.5 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Square className="w-3.5 h-3.5" /> Stop &amp; Log
              </button>
            </div>
            <button onClick={() => setExpanded(false)} className="w-full text-center text-[11px] text-[#9CA3AF] hover:text-[#5777AB] transition-colors py-0.5">
              Hide panel
            </button>
          </>
        )}

        {timerStatus !== 'idle' && (
          <button onClick={handleDiscard}
            className="w-full py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
            Discard timer
          </button>
        )}
      </div>
    </div>
  );
}