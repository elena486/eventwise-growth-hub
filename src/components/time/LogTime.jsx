import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Play, Pause, ChevronDown, ChevronRight, Square } from 'lucide-react';

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

function formatDateTime(iso) {
  try { return format(new Date(iso), 'd MMM yyyy, hh:mm aa'); } catch { return iso; }
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
  const [projectTask, setProjectTask] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [billable, setBillable] = useState(false);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  // ── Timer state ──
  const [timerOpen, setTimerOpen] = useState(true);
  const [timerCategory, setTimerCategory] = useState('');
  const [timerProject, setTimerProject] = useState('');

  // Active timer (from DB)
  const [activeTimerRecord, setActiveTimerRecord] = useState(null); // the saved DB record
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [elapsed, setElapsed] = useState(0);
  const [bannerVisible, setBannerVisible] = useState(true);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const userIdRef = useRef(null);

  // Abandoned mode (>8h)
  const [abandonedMode, setAbandonedMode] = useState(false);
  const [manualDurationH, setManualDurationH] = useState('');
  const [manualDurationM, setManualDurationM] = useState('');

  // Resolve team member
  useEffect(() => {
    base44.auth.me().then(me => {
      if (me) userIdRef.current = me.id;
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
  }, []);

  // ── Load running timer on mount ──
  const loadRunningTimer = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      if (!me?.full_name) return;
      const firstName = me.full_name.split(' ')[0];
      if (!TEAM_MEMBERS.includes(firstName)) return;
      const uid = me.id;
      userIdRef.current = uid;

      // 1. Check localStorage first — instant display
      const lsData = getTimerFromLS(uid);
      if (lsData && lsData.status === 'running' && lsData.startedAt) {
        const startMs = new Date(lsData.startedAt).getTime();
        const now = Date.now();
        const eightHours = 8 * 60 * 60 * 1000;

        // Use localStorage data immediately for the banner (before DB responds)
        setBannerVisible(true);
        setActiveTimerRecord({
          timerStartedAt: lsData.startedAt,
          category: lsData.category || '',
          projectTask: lsData.projectDescription || '',
        });

        if (now - startMs > eightHours) {
          setAbandonedMode(true);
        } else {
          setAbandonedMode(false);
          startTimeRef.current = startMs;
          setElapsed(now - startMs);
          clearInterval(intervalRef.current);
          intervalRef.current = setInterval(() => {
            setElapsed(Date.now() - startMs);
          }, 500);
        }
      }

      // 2. Also check DB for the actual record (id, etc.)
      const all = await base44.entities.TimeEntry.filter({ teamMember: firstName, timerStatus: 'running' }, '-created_date', 10);
      if (all.length > 0) {
        const record = all[0];
        setActiveTimerId(record.id);
        setActiveTimerRecord(record);
        const startedAt = record.timerStartedAt;
        if (startedAt) {
          const startMs = new Date(startedAt).getTime();
          const now = Date.now();
          const eightHours = 8 * 60 * 60 * 1000;
          if (now - startMs > eightHours) {
            setAbandonedMode(true);
            clearInterval(intervalRef.current);
          } else if (!lsData || lsData.status !== 'running') {
            // DB has a running timer but localStorage didn't — sync
            setAbandonedMode(false);
            startTimeRef.current = startMs;
            setElapsed(now - startMs);
            setBannerVisible(true);
            clearInterval(intervalRef.current);
            intervalRef.current = setInterval(() => {
              setElapsed(Date.now() - startMs);
            }, 500);
            // Also restore to localStorage
            saveTimerToLS(uid, {
              startedAt: record.timerStartedAt,
              category: record.category || '',
              projectDescription: record.projectTask || '',
              status: 'running',
            });
          }
        }
      } else if (lsData && lsData.status === 'running') {
        // localStorage has a running timer but DB doesn't — clear stale LS
        clearTimerLS(uid);
        setBannerVisible(false);
        setActiveTimerRecord(null);
      }
    } catch {}
  }, []);

  useEffect(() => {
    loadRunningTimer();
    return () => clearInterval(intervalRef.current);
  }, [loadRunningTimer]);

  // ── Start Timer → save to DB immediately ──
  const handleStartTimer = async () => {
    if (!timerCategory || !timerProject.trim()) return;

    // Check for existing running timer
    if (activeTimerId) {
      // Already have one — scroll to banner
      setBannerVisible(true);
      return;
    }

    try {
      const me = await base44.auth.me();
      const firstName = me?.full_name?.split(' ')[0] || '';
      const now = new Date().toISOString();

      const record = await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'),
        teamMember: firstName,
        category: timerCategory,
        projectTask: timerProject.trim(),
        durationMinutes: 0, // placeholder, will update on stop
        timerStatus: 'running',
        timerStartedAt: now,
      });

      setActiveTimerRecord(record);
      setActiveTimerId(record.id);
      setAbandonedMode(false);
      setBannerVisible(true);
      setElapsed(0);

      startTimeRef.current = new Date(now).getTime();
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 500);

      // Save to localStorage for instant recovery
      saveTimerToLS(me.id, {
        startedAt: now,
        category: timerCategory,
        projectDescription: timerProject.trim(),
        status: 'running',
      });
    } catch {}
  };

  // ── Stop & Log ──
  const handleStopAndLog = async () => {
    clearInterval(intervalRef.current);

    const now = new Date();
    const nowISO = now.toISOString();
    const totalMin = Math.round(elapsed / 60000);

    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    setHours(String(h));
    setMinutes(String(m));

    if (activeTimerRecord) {
      setCategory(activeTimerRecord.category || '');
      setProjectTask(activeTimerRecord.projectTask || '');
    }

    // Update DB record
    if (activeTimerId) {
      try {
        await base44.entities.TimeEntry.update(activeTimerId, {
          timerStatus: 'stopped',
          timerStoppedAt: nowISO,
          durationMinutes: totalMin,
        });
      } catch {}
    }

    // Clear banner
    setActiveTimerId(null);
    setActiveTimerRecord(null);
    setBannerVisible(false);
    setAbandonedMode(false);

    // Clear localStorage
    if (userIdRef.current) clearTimerLS(userIdRef.current);
  };

  // ── Discard abandoned timer ──
  const handleDiscardTimer = async () => {
    if (activeTimerId) {
      try { await base44.entities.TimeEntry.delete(activeTimerId); } catch {}
    }
    setActiveTimerId(null);
    setActiveTimerRecord(null);
    setBannerVisible(false);
    setAbandonedMode(false);
    clearInterval(intervalRef.current);

    if (userIdRef.current) clearTimerLS(userIdRef.current);
  };

  // ── Enter duration manually (abandoned timer) ──
  const handleEnterManualDuration = () => {
    const h = parseInt(manualDurationH) || 0;
    const m = parseInt(manualDurationM) || 0;
    const totalMin = h * 60 + m;
    if (totalMin <= 0) return;

    setHours(String(h));
    setMinutes(String(m));
    if (activeTimerRecord) {
      setCategory(activeTimerRecord.category || '');
      setProjectTask(activeTimerRecord.projectTask || '');
    }

    // Update record
    if (activeTimerId) {
      base44.entities.TimeEntry.update(activeTimerId, {
        timerStatus: 'stopped',
        timerStoppedAt: new Date().toISOString(),
        durationMinutes: totalMin,
      }).catch(() => {});
    }

    setActiveTimerId(null);
    setActiveTimerRecord(null);
    setBannerVisible(false);
    setAbandonedMode(false);
    clearInterval(intervalRef.current);

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
    try {
      if (activeTimerId) {
        // Update the existing timer record to "logged"
        await base44.entities.TimeEntry.update(activeTimerId, {
          date,
          teamMember,
          category,
          projectTask: projectTask.trim(),
          durationMinutes: totalMin,
          billable,
          notes: notes.trim() || undefined,
          timerStatus: 'logged',
        });
        setActiveTimerId(null);
        setActiveTimerRecord(null);
        setBannerVisible(false);
        if (userIdRef.current) clearTimerLS(userIdRef.current);
      } else {
        // Create fresh entry
        await base44.entities.TimeEntry.create({
          date,
          teamMember,
          category,
          projectTask: projectTask.trim(),
          durationMinutes: totalMin,
          billable,
          notes: notes.trim() || undefined,
        });
      }

      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategory('');
      setProjectTask('');
      setHours('');
      setMinutes('');
      setBillable(false);
      setNotes('');
      setElapsed(0);
      setTimerCategory('');
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
      {/* ── Active timer banner ── */}
      {bannerVisible && activeTimerRecord && !abandonedMode && (
        <div className="mb-5 px-4 py-3 bg-[#FFFBEB] border border-[#E8A020]/30 rounded-xl">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-[#A16207] flex items-center gap-1.5">
                ⏱ Timer running since {formatTimeOfDay(activeTimerRecord.timerStartedAt)}
              </p>
              <p className="text-sm font-medium text-[#242450] mt-0.5">
                {activeTimerRecord.category} · {activeTimerRecord.projectTask}
              </p>
              <p className="text-2xl font-bold text-[#242450] font-mono tracking-wider mt-1">
                {formatTime(elapsed)}
              </p>
            </div>
            <button onClick={handleStopAndLog}
              className="shrink-0 flex items-center gap-1.5 px-3.5 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white text-xs font-semibold rounded-lg transition-colors">
              <Square className="w-3.5 h-3.5" fill="white" /> Stop &amp; Log
            </button>
          </div>
        </div>
      )}

      {/* ── Abandoned timer banner ── */}
      {bannerVisible && activeTimerRecord && abandonedMode && (
        <div className="mb-5 px-4 py-3 bg-[#FEE2E2] border border-[#DC2626]/20 rounded-xl">
          <p className="text-xs font-semibold text-[#DC2626] flex items-center gap-1.5 mb-2">
            ⚠ Timer was still running from {formatDateTime(activeTimerRecord.timerStartedAt)}. Did you forget to stop it?
          </p>
          <p className="text-sm text-[#242450] mb-1">
            {activeTimerRecord.category} · {activeTimerRecord.projectTask}
          </p>
          <p className="text-sm text-[#5777AB] mb-3">Enter the actual time you spent or discard this entry.</p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5">
              <input type="number" min="0" value={manualDurationH} onChange={e => setManualDurationH(e.target.value)}
                placeholder="0" className="w-14 px-2 py-1.5 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white" />
              <span className="text-xs text-[#5777AB]">h</span>
              <input type="number" min="0" max="59" value={manualDurationM} onChange={e => setManualDurationM(e.target.value)}
                placeholder="0" className="w-14 px-2 py-1.5 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white" />
              <span className="text-xs text-[#5777AB]">m</span>
            </div>
            <button onClick={handleEnterManualDuration}
              className="px-3 py-1.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white text-xs font-semibold rounded-lg transition-colors">
              Enter duration
            </button>
            <button onClick={handleDiscardTimer}
              className="px-3 py-1.5 bg-white border border-[#EBEBF5] text-[#DC2626] text-xs font-semibold rounded-lg hover:bg-[#FEF2F2] transition-colors">
              Discard timer
            </button>
          </div>
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
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
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

        {activeTimerId && !abandonedMode && (
          <div className="px-3 py-2 bg-[#FFFBEB] text-[#A16207] text-xs font-semibold rounded-lg border border-[#E8A020]/30 text-center">
            Timer stopped — review the details above before logging
          </div>
        )}

        <button type="submit" disabled={!isValid || saving}
          className="w-full py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white font-semibold text-sm rounded-lg transition-colors">
          {saving ? 'Logging…' : 'Log Time'}
        </button>
      </form>

      {/* ── Timer section ── */}
      <div className="mt-6 border-t border-[#EBEBF5] pt-4">
        <button onClick={() => setTimerOpen(o => !o)}
          className="flex items-center gap-1 text-sm text-[#5777AB] hover:text-[#242450] transition-colors font-medium">
          {timerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Or use the timer
        </button>

        {timerOpen && (
          <div className="mt-3 space-y-3 bg-white border border-[#EBEBF5] rounded-xl p-4">
            {activeTimerId && !abandonedMode && (
              <div className="px-3 py-2 bg-[#FEF2F2] text-[#DC2626] text-xs font-semibold rounded-lg border border-[#DC2626]/20">
                You already have a timer running. Stop it before starting a new one.
              </div>
            )}

            <div className="text-center">
              <span className="text-3xl font-bold text-[#242450] font-mono tracking-wider">
                {activeTimerId ? formatTime(elapsed) : '00:00:00'}
              </span>
            </div>

            {!activeTimerId ? (
              <>
                <div>
                  <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Category</label>
                  <select value={timerCategory} onChange={e => setTimerCategory(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]">
                    <option value="">Select…</option>
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Project / Task</label>
                  <input type="text" value={timerProject} onChange={e => setTimerProject(e.target.value)}
                    placeholder="What are you working on?"
                    className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]" />
                </div>
                <button onClick={handleStartTimer}
                  className="w-full py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" fill="white" /> Start Timer
                </button>
              </>
            ) : !abandonedMode ? (
              <button onClick={handleStopAndLog}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                <Square className="w-4 h-4" fill="white" /> Stop &amp; Log
              </button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}