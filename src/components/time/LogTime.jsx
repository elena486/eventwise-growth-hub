import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Play, Square, Pause } from 'lucide-react';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
const CATEGORIES = [
  'Sales & Outbound',
  'Customer Success & Onboarding',
  'Marketing & Content',
  'Operations & Admin',
  'Product & Tech',
  'Finance',
  'Strategy & Planning',
  'Other',
];

function formatTime(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatTimeOfDay(iso) {
  try { return format(new Date(iso), 'hh:mm aa'); } catch { return iso; }
}

const LS_KEY_PREFIX = 'eventwise_timer_';

function getTimerLSKey(userId) {
  return `${LS_KEY_PREFIX}${userId}`;
}

function saveTimerToLS(userId, data) {
  try { localStorage.setItem(getTimerLSKey(userId), JSON.stringify(data)); } catch {}
}

function clearTimerLS(userId) {
  try { localStorage.removeItem(getTimerLSKey(userId)); } catch {}
}

function getTimerFromLS(userId) {
  try {
    const raw = localStorage.getItem(getTimerLSKey(userId));
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export default function LogTime({ onLogged }) {
  // ── Manual entry form ──
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [billable, setBillable] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [clients, setClients] = useState([]);

  // ── Review prompt state ──
  const [showReview, setShowReview] = useState(false);

  // ── Timer state ──
  const [timerCategory, setTimerCategory] = useState('');
  const [timerClientId, setTimerClientId] = useState('');
  const [timerClientName, setTimerClientName] = useState('');
  const [timerProject, setTimerProject] = useState('');

  // Active timer (from DB)
  const [activeTimerRecord, setActiveTimerRecord] = useState(null);
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [timerStatus, setTimerStatus] = useState('idle'); // 'idle' | 'running' | 'paused'
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const userIdRef = useRef(null);

  // Resolve team member & load clients
  useEffect(() => {
    base44.auth.me().then(me => {
      if (me) userIdRef.current = me.id;
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
  }, []);

  // ── Load running/paused timer on mount ──
  const loadRunningTimer = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      if (!me?.full_name) return;
      const firstName = me.full_name.split(' ')[0];
      if (!TEAM_MEMBERS.includes(firstName)) return;
      const uid = me.id;
      userIdRef.current = uid;

      // Check sessionStorage for stopped-timer review data
      const reviewData = sessionStorage.getItem('timer_review_data');
      if (reviewData) {
        try {
          const parsed = JSON.parse(reviewData);
          sessionStorage.removeItem('timer_review_data');
          setCategory(parsed.category || '');
          setProjectTask(parsed.projectTask || '');
          setClientId(parsed.clientId || '');
          setClientName(parsed.clientName || '');
          const h = Math.floor(parsed.durationMinutes / 60);
          const m = parsed.durationMinutes % 60;
          setHours(String(h));
          setMinutes(String(m));
          setShowReview(true);
          // Keep activeTimerId so handleSubmit updates the right record
          if (parsed.recordId) setActiveTimerId(parsed.recordId);
          return;
        } catch {}
      }

      // Check DB for running/paused timer
      const all = await base44.entities.TimeEntry.filter(
        { teamMember: firstName, timerStatus: { $in: ['running', 'paused'] } },
        '-created_date', 10
      );

      if (all.length > 0) {
        const record = all[0];
        setActiveTimerId(record.id);
        setActiveTimerRecord(record);
        setTimerCategory(record.category === '(Untitled session)' ? '' : record.category || '');
        setTimerClientId(record.clientId || '');
        setTimerClientName(record.clientName || '');
        setTimerProject(record.projectTask === '(Untitled session)' ? '' : record.projectTask || '');

        const startedAt = record.timerStartedAt;
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (startedAt) {
          const startMs = new Date(startedAt).getTime();
          startTimeRef.current = startMs;

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
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current);
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

        // Sync to localStorage
        saveTimerToLS(uid, {
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
      } else {
        // No DB record — check localStorage fallback, clear if stale
        const lsData = getTimerFromLS(uid);
        if (lsData && (lsData.status === 'running' || lsData.status === 'paused')) {
          clearTimerLS(uid);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadRunningTimer();
    return () => clearInterval(intervalRef.current);
  }, [loadRunningTimer]);

  // Listen for review data from FloatingTimer
  useEffect(() => {
    const handler = () => {
      const reviewData = sessionStorage.getItem('timer_review_data');
      if (!reviewData) return;
      try {
        const parsed = JSON.parse(reviewData);
        sessionStorage.removeItem('timer_review_data');
        setCategory(parsed.category || '');
        setProjectTask(parsed.projectTask || '');
        setClientId(parsed.clientId || '');
        setClientName(parsed.clientName || '');
        const h = Math.floor(parsed.durationMinutes / 60);
        const m = parsed.durationMinutes % 60;
        setHours(String(h));
        setMinutes(String(m));
        setShowReview(true);
        if (parsed.recordId) setActiveTimerId(parsed.recordId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    };
    window.addEventListener('timer-review-available', handler);
    return () => window.removeEventListener('timer-review-available', handler);
  }, []);

  // ── Update DB record as timer fields change ──
  useEffect(() => {
    if (!activeTimerId || timerStatus === 'idle') return;
    const debounce = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(activeTimerId, {
          category: timerCategory || '',
          projectTask: timerProject.trim() || '(Untitled session)',
          ...(timerClientId
            ? { clientId: timerClientId, clientName: timerClientName }
            : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(debounce);
  }, [timerCategory, timerClientId, timerProject]);

  // ── Start Timer ──
  const handleStartTimer = async () => {
    if (activeTimerId) return;

    try {
      const me = await base44.auth.me();
      const firstName = me?.full_name?.split(' ')[0] || '';
      const now = new Date().toISOString();
      const nowMs = new Date(now).getTime();

      const record = await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'),
        teamMember: firstName,
        category: timerCategory || '',
        projectTask: timerProject.trim() || '(Untitled session)',
        durationMinutes: 0,
        timerStatus: 'running',
        timerStartedAt: now,
        timerPauseIntervals: '[]',
        ...(timerClientId ? { clientId: timerClientId, clientName: timerClientName } : {}),
      });

      setActiveTimerRecord(record);
      setActiveTimerId(record.id);
      setTimerStatus('running');
      setElapsed(0);
      totalPausedMsRef.current = 0;
      pauseStartRef.current = null;

      startTimeRef.current = nowMs;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current);
      }, 500);

      saveTimerToLS(me.id, {
        startedAt: now,
        category: timerCategory,
        projectDescription: timerProject.trim() || '(Untitled session)',
        clientId: timerClientId,
        clientName: timerClientName,
        status: 'running',
        totalPausedMs: 0,
        pauseIntervals: [],
        recordId: record.id,
      });
    } catch {}
  };

  // ── Pause Timer ──
  const handlePauseTimer = async () => {
    const pauseTime = new Date().toISOString();
    pauseStartRef.current = new Date(pauseTime).getTime();
    clearInterval(intervalRef.current);
    setTimerStatus('paused');

    if (userIdRef.current) {
      const lsData = getTimerFromLS(userIdRef.current);
      if (lsData) {
        lsData.status = 'paused';
        lsData.pauseStartedAt = pauseTime;
        saveTimerToLS(userIdRef.current, lsData);
      }
    }

    if (activeTimerId) {
      try {
        const record = await base44.entities.TimeEntry.get(activeTimerId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        intervals.push({ pausedAt: pauseTime, resumedAt: null });
        await base44.entities.TimeEntry.update(activeTimerId, {
          timerStatus: 'paused',
          timerPauseIntervals: JSON.stringify(intervals),
        });
      } catch {}
    }
  };

  // ── Resume Timer ──
  const handleResumeTimer = async () => {
    const resumeTime = new Date().toISOString();
    const resumeMs = new Date(resumeTime).getTime();

    if (pauseStartRef.current) {
      totalPausedMsRef.current += resumeMs - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    setTimerStatus('running');

    intervalRef.current = setInterval(() => {
      setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current);
    }, 500);

    if (userIdRef.current) {
      const lsData = getTimerFromLS(userIdRef.current);
      if (lsData) {
        lsData.status = 'running';
        lsData.totalPausedMs = totalPausedMsRef.current;
        delete lsData.pauseStartedAt;
        saveTimerToLS(userIdRef.current, lsData);
      }
    }

    if (activeTimerId) {
      try {
        const record = await base44.entities.TimeEntry.get(activeTimerId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (intervals.length > 0 && intervals[intervals.length - 1].resumedAt === null) {
          intervals[intervals.length - 1].resumedAt = resumeTime;
        }
        await base44.entities.TimeEntry.update(activeTimerId, {
          timerStatus: 'running',
          timerPauseIntervals: JSON.stringify(intervals),
        });
      } catch {}
    }
  };

  // ── Stop & Log (from Running or Paused) ──
  const handleStopAndLog = async () => {
    clearInterval(intervalRef.current);

    if (timerStatus === 'paused' && pauseStartRef.current) {
      totalPausedMsRef.current += Date.now() - pauseStartRef.current;
      pauseStartRef.current = null;
    }

    const now = new Date();
    const nowISO = now.toISOString();
    const totalActiveMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    const totalMin = Math.max(1, Math.round(totalActiveMs / 60000));

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    setHours(String(h));
    setMinutes(String(m));

    setDate(format(new Date(), 'yyyy-MM-dd'));

    const cat = activeTimerRecord?.category || timerCategory || '';
    const task = activeTimerRecord?.projectTask === '(Untitled session)' ? timerProject : activeTimerRecord?.projectTask || timerProject || '';
    const cId = activeTimerRecord?.clientId || timerClientId || '';
    const cName = activeTimerRecord?.clientName || timerClientName || '';

    setCategory(cat);
    setProjectTask(task);
    setClientId(cId);
    setClientName(cName);
    setShowReview(true);

    if (activeTimerId) {
      try {
        await base44.entities.TimeEntry.update(activeTimerId, {
          timerStatus: 'stopped',
          timerStoppedAt: nowISO,
          durationMinutes: totalMin,
          category: cat || '',
          projectTask: task || '',
          ...(cId ? { clientId: cId, clientName: cName } : {}),
        });
      } catch {}
    }

    // Reset timer state
    setTimerStatus('idle');
    setActiveTimerRecord(null);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;

    if (userIdRef.current) {
      clearTimerLS(userIdRef.current);
      saveTimerToLS(userIdRef.current, {
        status: 'stopped',
        durationMinutes: totalMin,
        category: cat,
        projectDescription: task,
        clientId: cId,
        clientName: cName,
        recordId: activeTimerId,
      });
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // ── Discard running/paused timer ──
  const handleDiscardTimer = async () => {
    clearInterval(intervalRef.current);
    if (activeTimerId) {
      try { await base44.entities.TimeEntry.delete(activeTimerId); } catch {}
    }
    setActiveTimerId(null);
    setActiveTimerRecord(null);
    setTimerStatus('idle');
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;
    if (userIdRef.current) clearTimerLS(userIdRef.current);
  };

  // ── Manual form submit ──
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamMember || !category || !projectTask.trim()) return;

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMin = h * 60 + m;
    if (totalMin <= 0) return;

    setSaving(true);
    setShowReview(false);
    try {
      if (activeTimerId) {
        await base44.entities.TimeEntry.update(activeTimerId, {
          date,
          teamMember,
          category,
          projectTask: projectTask.trim(),
          durationMinutes: totalMin,
          billable,
          notes: notes.trim() || undefined,
          timerStatus: 'logged',
          ...(clientId ? { clientId, clientName } : {}),
        });
        setActiveTimerId(null);
        if (userIdRef.current) clearTimerLS(userIdRef.current);
      } else {
        await base44.entities.TimeEntry.create({
          date,
          teamMember,
          category,
          projectTask: projectTask.trim(),
          durationMinutes: totalMin,
          billable,
          notes: notes.trim() || undefined,
          ...(clientId ? { clientId, clientName } : {}),
        });
      }

      // Append activity log on linked client
      if (clientId) {
        try {
          const client = await base44.entities.Client.get(clientId);
          if (client) {
            const currentLog = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
            const durH = Math.floor(totalMin / 60);
            const durM = totalMin % 60;
            const durStr = durM === 0 ? `${durH}h` : `${durH}h ${durM}m`;
            currentLog.push({
              date: new Date().toISOString(),
              type: 'Time logged',
              label: `Time logged: ${durStr} — ${category}`,
              category,
              duration: durStr,
              description: projectTask.trim(),
              teamMember,
              notes: notes.trim() || '',
            });
            await base44.entities.Client.update(clientId, { activityLog: JSON.stringify(currentLog) });
          }
        } catch {}
      }

      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategory('');
      setClientId('');
      setClientName('');
      setProjectTask('');
      setHours('');
      setMinutes('');
      setBillable(false);
      setNotes('');
      setElapsed(0);
      setTimerCategory('');
      setTimerClientId('');
      setTimerClientName('');
      setTimerProject('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 2500);
      onLogged?.();
    } catch {} finally {
      setSaving(false);
    }
  };

  const isValid = teamMember && category && projectTask.trim() && ((parseInt(hours) || 0) + (parseInt(minutes) || 0)) > 0;

  return (
    <div className="max-w-lg mx-auto pt-6">
      {/* ── Active timer banner — RUNNING ── */}
      {activeTimerRecord && timerStatus === 'running' && (
        <div className="mb-5 px-4 py-3 bg-[#FFFBEB] border border-[#E8A020]/30 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#A16207] flex items-center gap-1.5">
                ⏱ Timer running since {formatTimeOfDay(activeTimerRecord.timerStartedAt)}
              </p>
              <p className="text-sm font-medium text-[#242450] mt-0.5">
                {(activeTimerRecord.category || timerCategory || 'No category')} · {(activeTimerRecord.projectTask === '(Untitled session)' ? timerProject : activeTimerRecord.projectTask) || 'Untitled'}
              </p>
              <p className="text-2xl font-bold text-[#E8A020] font-mono tracking-wider mt-1">
                {formatTime(elapsed)}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handlePauseTimer}
                className="px-3 py-2 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                <Pause className="w-3 h-3" /> Pause
              </button>
              <button onClick={handleStopAndLog}
                className="px-3 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                <Square className="w-3 h-3" fill="white" /> Stop &amp; Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Active timer banner — PAUSED ── */}
      {activeTimerRecord && timerStatus === 'paused' && (
        <div className="mb-5 px-4 py-3 bg-[#F6F6FB] border border-[#EBEBF5] rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#5777AB] flex items-center gap-1.5">
                ⏸ Timer paused
              </p>
              <p className="text-sm font-medium text-[#242450] mt-0.5">
                {(activeTimerRecord.category || timerCategory || 'No category')} · {(activeTimerRecord.projectTask === '(Untitled session)' ? timerProject : activeTimerRecord.projectTask) || 'Untitled'}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-2xl font-bold text-[#9CA3AF] font-mono tracking-wider">
                  {formatTime(elapsed)}
                </p>
                <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBEBF5] text-[#5777AB] text-[10px] font-semibold uppercase">
                  Paused
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleResumeTimer}
                className="px-3 py-2 bg-[#242450] hover:bg-[#1A1A3A] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                <Play className="w-3 h-3" fill="white" /> Resume
              </button>
              <button onClick={handleStopAndLog}
                className="px-3 py-2 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] text-xs font-semibold rounded-lg transition-colors flex items-center gap-1">
                <Square className="w-3 h-3" /> Stop &amp; Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review prompt ── */}
      {showReview && (
        <div className="mb-4 px-4 py-3 bg-[#EEF2F8] border border-[#5777AB]/20 rounded-xl">
          <p className="text-sm font-semibold text-[#242450]">
            Review your time entry before saving.
          </p>
          <p className="text-xs text-[#5777AB] mt-1">
            Fill in any missing details below.
          </p>
          {!category && (
            <p className="text-xs text-[#DC2626] font-medium mt-1">• Category is required</p>
          )}
        </div>
      )}

      {/* ── Success toast ── */}
      {success && (
        <div className="mb-4 px-4 py-2.5 bg-[#E8F7F2] text-[#1D9E75] text-sm font-semibold rounded-lg border border-[#1D9E75]/20">
          ✓ Time entry logged
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Team member</label>
            <select value={teamMember} onChange={e => setTeamMember(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
              <option value="">Select…</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)}
            className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] ${showReview && !category ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}>
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Client <span className="font-normal normal-case">(optional)</span></label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }}
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
            <option value="">None</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Project / Task description</label>
          <input type="text" value={projectTask} onChange={e => setProjectTask(e.target.value)}
            placeholder="e.g. Onboarding call with Noisily, Apollo sequence setup, Q2 board report"
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Time spent</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)}
                placeholder="0" className="w-16 px-2.5 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
              <span className="text-sm text-[#5777AB] font-medium">h</span>
              <input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)}
                placeholder="0" className="w-16 px-2.5 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
              <span className="text-sm text-[#5777AB] font-medium">m</span>
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Billable?</label>
            <div className="flex items-center gap-3 pt-1">
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="billable" checked={!billable} onChange={() => setBillable(false)}
                  className="accent-[#8403C5] w-4 h-4" />
                <span className="text-sm text-[#242450]">No</span>
              </label>
              <label className="flex items-center gap-1.5 cursor-pointer">
                <input type="radio" name="billable" checked={billable} onChange={() => setBillable(true)}
                  className="accent-[#8403C5] w-4 h-4" />
                <span className="text-sm text-[#242450]">Yes</span>
              </label>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5">Notes <span className="font-normal normal-case">(optional)</span></label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] resize-none" />
        </div>

        <button type="submit" disabled={!isValid || saving}
          className="w-full py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white font-semibold text-sm rounded-lg transition-colors">
          {saving ? 'Logging…' : 'Log Time'}
        </button>
      </form>

      {/* ── Timer section ── */}
      <div className="mt-6 border-t border-[#EBEBF5] pt-4">
        <p className="text-sm text-[#5777AB] font-medium mb-3">Or use the timer</p>

        <div className="space-y-3 bg-white border border-[#EBEBF5] rounded-xl p-4">
          {/* Timer display */}
          <div className="text-center">
            <span className={`text-3xl font-bold font-mono tracking-wider ${
              timerStatus === 'running' ? 'text-[#E8A020]' :
              timerStatus === 'paused' ? 'text-[#9CA3AF]' :
              'text-[#242450]'
            }`}>
              {timerStatus === 'idle' ? '00:00:00' : formatTime(elapsed)}
            </span>
            {timerStatus === 'paused' && (
              <span className="ml-2.5 inline-flex items-center px-2 py-0.5 rounded-full bg-[#EBEBF5] text-[#5777AB] text-[10px] font-semibold uppercase">
                Paused
              </span>
            )}
          </div>

          {/* Fields — always editable */}
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Category</label>
            <select value={timerCategory} onChange={e => setTimerCategory(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Client <span className="font-normal normal-case">(optional)</span></label>
            <select value={timerClientId} onChange={e => { setTimerClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setTimerClientName(c?.name || ''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Project / Task</label>
            <input type="text" value={timerProject} onChange={e => setTimerProject(e.target.value)}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
          </div>

          {/* Buttons per state */}
          {timerStatus === 'idle' && (
            <button onClick={handleStartTimer}
              className="w-full py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
              <Play className="w-4 h-4" fill="white" /> Start Timer
            </button>
          )}

          {timerStatus === 'running' && (
            <div className="flex gap-2">
              <button onClick={handlePauseTimer}
                className="flex-1 py-2.5 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Pause className="w-3.5 h-3.5" /> Pause
              </button>
              <button onClick={handleStopAndLog}
                className="flex-1 py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Square className="w-3.5 h-3.5" fill="white" /> Stop &amp; Log
              </button>
            </div>
          )}

          {timerStatus === 'paused' && (
            <div className="flex gap-2">
              <button onClick={handleResumeTimer}
                className="flex-1 py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Play className="w-3.5 h-3.5" fill="white" /> Resume
              </button>
              <button onClick={handleStopAndLog}
                className="flex-1 py-2.5 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-1.5">
                <Square className="w-3.5 h-3.5" /> Stop &amp; Log
              </button>
            </div>
          )}

          {timerStatus !== 'idle' && (
            <button onClick={handleDiscardTimer}
              className="w-full py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
              Discard timer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}