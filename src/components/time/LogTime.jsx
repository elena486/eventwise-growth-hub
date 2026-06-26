import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday, isYesterday } from 'date-fns';
import { Play, Square, Pause, Link, MoreVertical, RotateCw, Copy, Pencil, Trash2, CalendarDays, List, Calendar } from 'lucide-react';
import TaskPresetSelect from './TaskPresetSelect';
import StopTimerModal from './StopTimerModal';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import { logActivity } from '@/lib/logActivity';

const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

async function writeClientActivityLog({ clientId, clientName, teamMember, category, projectTask, durationMinutes, notes, transcriptLink }) {
  if (!clientId) return;
  try {
    const client = await base44.entities.Client.get(clientId);
    if (!client) return;
    const currentLog = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
    const h = Math.floor(durationMinutes / 60);
    const m = durationMinutes % 60;
    const durStr = m === 0 ? `${h}h` : `${h}h ${m}m`;
    currentLog.push({
      date: new Date().toISOString(),
      type: 'Time logged',
      label: `Time logged: ${durStr} — ${category}`,
      category,
      duration: durStr,
      description: projectTask,
      teamMember,
      notes: notes || '',
      transcriptLink: transcriptLink || '',
    });
    await base44.entities.Client.update(clientId, { activityLog: JSON.stringify(currentLog) });
  } catch {}
}

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
const CATEGORIES = CATEGORY_LABELS;

function formatTimer(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimeOfDay(iso) {
  try { return format(new Date(iso), 'HH:mm'); } catch { return iso; }
}

const LS_KEY_PREFIX = 'eventwise_timer_';
function getTimerLSKey(userId) { return `${LS_KEY_PREFIX}${userId}`; }
function saveTimerToLS(userId, data) { try { localStorage.setItem(getTimerLSKey(userId), JSON.stringify(data)); } catch {} }
function clearTimerLS(userId) { try { localStorage.removeItem(getTimerLSKey(userId)); } catch {} }
function getTimerFromLS(userId) {
  try { const raw = localStorage.getItem(getTimerLSKey(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

export default function LogTime({ onLogged }) {
  // ── Timer state ──
  const [timerStatus, setTimerStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [activeTimerRecord, setActiveTimerRecord] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const userIdRef = useRef(null);

  const [timerCategory, setTimerCategory] = useState('');
  const [timerClientId, setTimerClientId] = useState('');
  const [timerClientName, setTimerClientName] = useState('');
  const [timerProject, setTimerProject] = useState('');

  // ── Quick entry bar ──
  const [quickDesc, setQuickDesc] = useState('');
  const [quickCat, setQuickCat] = useState('');
  const [quickClientId, setQuickClientId] = useState('');
  const [quickClientName, setQuickClientName] = useState('');
  const [quickH, setQuickH] = useState('0');
  const [quickM, setQuickM] = useState('0');
  const [quickTranscriptLink, setQuickTranscriptLink] = useState('');

  // ── Stop/edit modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // ── Entries ──
  const [entries, setEntries] = useState([]);
  const [teamMember, setTeamMember] = useState('');
  const [clients, setClients] = useState([]);

  // ── Overflow menu ──
  const [menuOpenId, setMenuOpenId] = useState(null);

  // ── Today view toggle ──
  const [todayView, setTodayView] = useState('list');

  // Resolve user & clients
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

  // ── Load running/paused timer ──
  const loadTimer = useCallback(async () => {
    try {
      const me = await base44.auth.me();
      if (!me?.full_name) return;
      const firstName = me.full_name.split(' ')[0];
      if (!TEAM_MEMBERS.includes(firstName)) return;
      userIdRef.current = me.id;

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

        if (record.timerStartedAt) {
          const startMs = new Date(record.timerStartedAt).getTime();
          startTimeRef.current = startMs;

          const pauseIntervals = JSON.parse(record.timerPauseIntervals || '[]');
          let totalPaused = 0;
          pauseIntervals.forEach(iv => {
            if (iv.pausedAt) {
              const pMs = new Date(iv.pausedAt).getTime();
              const rMs = iv.resumedAt ? new Date(iv.resumedAt).getTime() : Date.now();
              totalPaused += rMs - pMs;
            }
          });
          totalPausedMsRef.current = totalPaused;

          if (record.timerStatus === 'running') {
            setTimerStatus('running');
            intervalRef.current = setInterval(() => {
              setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current);
            }, 500);
            setElapsed(Date.now() - startMs - totalPaused);
          } else {
            setTimerStatus('paused');
            const last = pauseIntervals[pauseIntervals.length - 1];
            if (last && !last.resumedAt && last.pausedAt) {
              pauseStartRef.current = new Date(last.pausedAt).getTime();
            }
            setElapsed(Date.now() - startMs - totalPaused);
          }
        }
      } else {
        const lsData = getTimerFromLS(me.id);
        if (lsData && (lsData.status === 'running' || lsData.status === 'paused')) clearTimerLS(me.id);
      }
    } catch {}
  }, []);

  const loadEntries = useCallback(async () => {
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const firstName = me.full_name?.split(' ')[0] || '';
    if (!TEAM_MEMBERS.includes(firstName)) return;
    const all = await base44.entities.TimeEntry.filter({ teamMember: firstName }, '-date', 300);
    setEntries(all);
  }, []);

  useEffect(() => {
    loadTimer();
    loadEntries();

    // Check for stopped-timer review data from FloatingTimer (may fire before mount)
    const reviewData = sessionStorage.getItem('timer_review_data');
    if (reviewData) {
      try {
        const parsed = JSON.parse(reviewData);
        sessionStorage.removeItem('timer_review_data');
        setModalData({
          mode: 'stop', category: parsed.category || '', clientId: parsed.clientId || '',
          clientName: parsed.clientName || '', projectTask: parsed.projectTask || '',
          durationMs: (parsed.durationMinutes || 0) * 60000, durationMinutes: parsed.durationMinutes || 0,
          timerId: parsed.recordId, date: format(new Date(), 'yyyy-MM-dd'), billable: false, notes: '',
        });
        setModalOpen(true);
        setActiveTimerId(null);
        if (userIdRef.current) clearTimerLS(userIdRef.current);
      } catch {}
    }

    return () => clearInterval(intervalRef.current);
  }, [loadTimer, loadEntries]);

  // Listen for review data from FloatingTimer
  useEffect(() => {
    const handler = () => {
      const reviewData = sessionStorage.getItem('timer_review_data');
      if (!reviewData) return;
      try {
        const parsed = JSON.parse(reviewData);
        sessionStorage.removeItem('timer_review_data');
        setModalData({
          mode: 'stop',
          category: parsed.category || '',
          clientId: parsed.clientId || '',
          clientName: parsed.clientName || '',
          projectTask: parsed.projectTask || '',
          durationMs: (parsed.durationMinutes || 0) * 60000,
          durationMinutes: parsed.durationMinutes || 0,
          timerId: parsed.recordId,
          date: format(new Date(), 'yyyy-MM-dd'),
          billable: false,
          notes: '',
        });
        setModalOpen(true);
        setActiveTimerId(null);
        if (userIdRef.current) clearTimerLS(userIdRef.current);
        window.scrollTo({ top: 0, behavior: 'smooth' });
      } catch {}
    };
    window.addEventListener('timer-review-available', handler);
    return () => window.removeEventListener('timer-review-available', handler);
  }, []);

  // ── Today / Week grouping ──
  const weekRange = useMemo(() => {
    const now = new Date();
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }, []);

  const todayEntries = useMemo(() => entries.filter(e => {
    try { return isToday(parseISO(e.date)); } catch { return false; }
  }).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date)), [entries]);

  const weekEntries = useMemo(() => entries.filter(e => {
    try {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: weekRange.start, end: weekRange.end }) && !isToday(d);
    } catch { return false; }
  }).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date)), [entries, weekRange]);

  const weekByDay = useMemo(() => {
    const map = {};
    weekEntries.forEach(e => {
      const key = e.date;
      if (!map[key]) map[key] = { date: key, entries: [], totalMin: 0 };
      map[key].entries.push(e);
      map[key].totalMin += e.durationMinutes || 0;
    });
    return Object.values(map).sort((a, b) => b.date.localeCompare(a.date));
  }, [weekEntries]);

  const todayTotal = todayEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
  const weekTotal = weekEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);

  // ── Timer: Update DB as fields change ──
  useEffect(() => {
    if (!activeTimerId || timerStatus === 'idle') return;
    const debounce = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(activeTimerId, {
          category: timerCategory || '',
          projectTask: timerProject.trim() || '(Untitled session)',
          ...(timerClientId ? { clientId: timerClientId, clientName: timerClientName } : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(debounce);
  }, [timerCategory, timerClientId, timerProject]);

  // ── Timer: Start ──
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

      saveTimerToLS(me.id, { startedAt: now, category: timerCategory, projectDescription: timerProject.trim() || '(Untitled session)', clientId: timerClientId, clientName: timerClientName, status: 'running', totalPausedMs: 0, pauseIntervals: [], recordId: record.id });
      logActivity({ teamMember: firstName, actionType: 'Started a timer', section: 'Time & Capacity', recordName: timerProject.trim() || '(Untitled session)' });
    } catch {}
  };

  // ── Timer: Pause ──
  const handlePauseTimer = async () => {
    const pauseTime = new Date().toISOString();
    pauseStartRef.current = new Date(pauseTime).getTime();
    clearInterval(intervalRef.current);
    setTimerStatus('paused');

    if (userIdRef.current) {
      const ls = getTimerFromLS(userIdRef.current);
      if (ls) { ls.status = 'paused'; ls.pauseStartedAt = pauseTime; saveTimerToLS(userIdRef.current, ls); }
    }
    if (activeTimerId) {
      try {
        const record = await base44.entities.TimeEntry.get(activeTimerId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        intervals.push({ pausedAt: pauseTime, resumedAt: null });
        await base44.entities.TimeEntry.update(activeTimerId, { timerStatus: 'paused', timerPauseIntervals: JSON.stringify(intervals) });
      } catch {}
    }
  };

  // ── Timer: Resume ──
  const handleResumeTimer = async () => {
    const resumeTime = new Date().toISOString();
    const resumeMs = new Date(resumeTime).getTime();
    if (pauseStartRef.current) { totalPausedMsRef.current += resumeMs - pauseStartRef.current; pauseStartRef.current = null; }
    setTimerStatus('running');
    intervalRef.current = setInterval(() => { setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current); }, 500);

    if (userIdRef.current) {
      const ls = getTimerFromLS(userIdRef.current);
      if (ls) { ls.status = 'running'; ls.totalPausedMs = totalPausedMsRef.current; delete ls.pauseStartedAt; saveTimerToLS(userIdRef.current, ls); }
    }
    if (activeTimerId) {
      try {
        const record = await base44.entities.TimeEntry.get(activeTimerId);
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (intervals.length > 0 && intervals[intervals.length - 1].resumedAt === null) intervals[intervals.length - 1].resumedAt = resumeTime;
        await base44.entities.TimeEntry.update(activeTimerId, { timerStatus: 'running', timerPauseIntervals: JSON.stringify(intervals) });
      } catch {}
    }
  };

  // ── Timer: Stop & Log → opens modal ──
  const handleStopAndLog = async () => {
    clearInterval(intervalRef.current);
    if (timerStatus === 'paused' && pauseStartRef.current) { totalPausedMsRef.current += Date.now() - pauseStartRef.current; pauseStartRef.current = null; }

    const totalActiveMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    const totalMin = Math.max(1, Math.round(totalActiveMs / 60000));
    const cat = activeTimerRecord?.category || timerCategory || '';
    const task = activeTimerRecord?.projectTask === '(Untitled session)' ? timerProject : activeTimerRecord?.projectTask || timerProject || '';
    const cId = activeTimerRecord?.clientId || timerClientId || '';
    const cName = activeTimerRecord?.clientName || timerClientName || '';

    if (activeTimerId) {
      await base44.entities.TimeEntry.update(activeTimerId, {
        timerStatus: 'stopped', timerStoppedAt: new Date().toISOString(), durationMinutes: totalMin,
        category: cat, projectTask: task,
        ...(cId ? { clientId: cId, clientName: cName } : {}),
      }).catch(() => {});
    }

    setModalData({ mode: 'stop', category: cat, clientId: cId, clientName: cName, projectTask: task, durationMs: totalActiveMs, durationMinutes: totalMin, timerId: activeTimerId, date: format(new Date(), 'yyyy-MM-dd'), billable: false, notes: '' });
    setModalOpen(true);

    setTimerStatus('idle');
    setActiveTimerRecord(null);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;
    if (userIdRef.current) clearTimerLS(userIdRef.current);
  };

  // ── Modal Save ──
  const handleModalSave = async (formData) => {
    const recordId = modalData?.mode === 'stop' ? modalData?.timerId : modalData?.entryId;
    if (recordId) {
      await base44.entities.TimeEntry.update(recordId, {
        ...formData, timerStatus: 'logged', teamMember,
        transcriptLink: formData.transcriptLink || '',
        ...(formData.clientId ? {} : { clientId: '', clientName: '' }),
      });
    }
    await writeClientActivityLog({ clientId: formData.clientId, clientName: formData.clientName, teamMember, category: formData.category, projectTask: formData.projectTask, durationMinutes: formData.durationMinutes, notes: formData.notes, transcriptLink: formData.transcriptLink });
    setModalOpen(false);
    setActiveTimerId(null);
    if (modalData?.mode === 'stop' && userIdRef.current) clearTimerLS(userIdRef.current);
    loadEntries();
    onLogged?.();
    logActivity({ teamMember, actionType: 'Stopped & logged a timer', section: 'Time & Capacity', recordName: formData.projectTask || '', details: `${formData.category || ''} — ${formatDuration(formData.durationMinutes)}` });
  };

  // ── Quick Log ──
  const handleQuickLog = async () => {
    if (!quickDesc.trim()) return;
    const h = parseInt(quickH) || 0;
    const m = parseInt(quickM) || 0;
    const totalMin = h * 60 + m;
    if (totalMin <= 0) return;

    try {
      await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'),
        teamMember,
        category: quickCat || 'Other',
        projectTask: quickDesc.trim(),
        durationMinutes: totalMin,
        transcriptLink: quickTranscriptLink.trim() || undefined,
        ...(quickClientId ? { clientId: quickClientId, clientName: quickClientName } : {}),
      });
      await writeClientActivityLog({ clientId: quickClientId, clientName: quickClientName, teamMember, category: quickCat || 'Other', projectTask: quickDesc.trim(), durationMinutes: totalMin, notes: '', transcriptLink: quickTranscriptLink.trim() });
      setQuickDesc(''); setQuickH('0'); setQuickM('0'); setQuickTranscriptLink('');
      loadEntries();
      onLogged?.();
      logActivity({ teamMember, actionType: 'Logged a time entry', section: 'Time & Capacity', recordName: quickDesc.trim(), details: `${quickCat || 'Other'} — ${formatDuration(totalMin)}` });
    } catch {}
  };

  // ── Replay → pre-fill quick bar ──
  const handleReplay = (entry) => {
    setQuickDesc(entry.projectTask || '');
    setQuickCat(entry.category || '');
    setQuickClientId(entry.clientId || '');
    setQuickClientName(entry.clientName || '');
    const h = Math.floor((entry.durationMinutes || 0) / 60);
    const m = (entry.durationMinutes || 0) % 60;
    setQuickH(String(h));
    setQuickM(String(m));
  };

  // ── Edit entry ──
  const handleEdit = (entry) => {
    setModalData({
      mode: 'edit', entryId: entry.id,
      category: entry.category || '', clientId: entry.clientId || '', clientName: entry.clientName || '',
      projectTask: entry.projectTask || '', durationMinutes: entry.durationMinutes || 0,
      date: entry.date || '', billable: entry.billable || false, notes: entry.notes || '',
    });
    setModalOpen(true);
    setMenuOpenId(null);
  };

  // ── Duplicate entry ──
  const handleDuplicate = async (entry) => {
    try {
      await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'),
        teamMember,
        category: entry.category || '',
        projectTask: entry.projectTask || '',
        durationMinutes: entry.durationMinutes || 0,
        billable: entry.billable || false,
        notes: entry.notes || '',
        ...(entry.clientId ? { clientId: entry.clientId, clientName: entry.clientName } : {}),
      });
      loadEntries();
      onLogged?.();
    } catch {}
    setMenuOpenId(null);
  };

  // ── Delete entry ──
  const handleDelete = async (entry) => {
    if (!window.confirm('Delete this time entry?')) return;
    try { await base44.entities.TimeEntry.delete(entry.id); loadEntries(); onLogged?.(); } catch {}
    setMenuOpenId(null);
  };

  // ── Entry row component ──
  const EntryRow = ({ entry, showReplay = true, idx }) => {
    const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
    const hasTimes = entry.timerStartedAt && entry.timerStoppedAt;
    const desc = entry.projectTask?.trim();
    const catLabel = entry.category?.trim();
    return (
      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-[#FAFBFC] transition-colors group ${idx !== undefined && idx % 2 === 1 ? 'bg-[#FAFAFD]/40' : ''}`}>
        <div className="flex-1 min-w-0">
          <p className={`text-[15px] font-bold text-[#242450] truncate ${!desc ? 'text-[#9CA3AF] italic font-normal' : ''}`}>
            {desc || 'No description'}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>
              {catLabel || 'Uncategorised'}
            </span>
            {entry.clientName && (
              <span className="text-[11px] text-[#4A5568] border border-[#D8D8EE] rounded-full px-2 py-0.5">{entry.clientName}</span>
            )}
            {entry.transcriptLink && (
              <a href={entry.transcriptLink} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-1 text-[11px] text-[#5777AB] hover:text-[#8403C5] transition-colors" title="View transcript">
                <Link className="w-3 h-3" /> Transcript
              </a>
            )}
          </div>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-0.5">
          <span className="text-[12px] text-[#4A5568] font-mono">
            {hasTimes ? `${formatTimeOfDay(entry.timerStartedAt)} – ${formatTimeOfDay(entry.timerStoppedAt)}` : <span className="text-[#9CA3AF] italic">No time range</span>}
          </span>
          <span className="text-[18px] font-bold text-[#242450]">{formatDuration(entry.durationMinutes)}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {showReplay && (
            <button onClick={() => handleReplay(entry)} className="p-2 hover:bg-[#EBEBF5] rounded-lg" title="Resume task">
              <RotateCw className="w-4 h-4 text-[#5777AB]" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === entry.id ? null : entry.id); }}
              className="p-2 hover:bg-[#EBEBF5] rounded-lg entry-menu" title="More actions">
              <MoreVertical className="w-4 h-4 text-[#9CA3AF]" />
            </button>
            {menuOpenId === entry.id && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 py-1 entry-menu" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleEdit(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#242450] hover:bg-[#F6F6FB]" title="Edit entry">
                  <Pencil className="w-3 h-3" /> Edit
                </button>
                <button onClick={() => handleDuplicate(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#242450] hover:bg-[#F6F6FB]" title="Duplicate entry">
                  <Copy className="w-3 h-3" /> Duplicate
                </button>
                <button onClick={() => handleDelete(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2]" title="Delete entry">
                  <Trash2 className="w-3 h-3" /> Delete
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Close menu on outside click (mousedown fires before the ⋮ button's click)
  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e) => { if (!e.target.closest('.entry-menu')) setMenuOpenId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  return (
    <div className="max-w-[900px] mx-auto pt-4 space-y-10">
      {/* ══════════════════════════════════════
          SECTION 1 — QUICK ENTRY BAR
          ══════════════════════════════════ */}
      <div className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 border-l-[#8403C5] px-7 py-6">
        <div className="space-y-3">
        <div className="flex items-end gap-3 flex-wrap">
          {/* Team Member */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Team member</label>
            <select value={teamMember} onChange={e => setTeamMember(e.target.value)}
              className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] w-[120px] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all">
              <option value="">Select…</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Category */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Category</label>
            <select value={quickCat} onChange={e => { setQuickCat(e.target.value); setQuickDesc(''); }}
              className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] w-[180px] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all">
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* What are you working on? */}
          <div className="flex-1 min-w-[180px]">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Task description</label>
            <TaskPresetSelect
              category={quickCat}
              value={quickDesc}
              onChange={setQuickDesc}
              placeholder="What are you working on?"
              className="w-full px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all"
            />
          </div>

          {/* Client */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">
              Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span>
            </label>
            <select value={quickClientId} onChange={e => { setQuickClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setQuickClientName(c?.name || ''); }}
              className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] w-[130px] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Duration */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Duration</label>
            <div className="flex items-center gap-1">
              <input type="number" min="0" value={quickH} onChange={e => setQuickH(e.target.value)}
                className="w-12 px-2 py-2 text-sm text-center border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all" placeholder="0" />
              <span className="text-xs text-[#5777AB] font-medium">h</span>
              <input type="number" min="0" max="59" value={quickM} onChange={e => setQuickM(e.target.value)}
                className="w-12 px-2 py-2 text-sm text-center border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all" placeholder="0" />
              <span className="text-xs text-[#5777AB] font-medium">m</span>
            </div>
          </div>

          {/* Log button */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">&nbsp;</label>
            <button onClick={handleQuickLog}
              disabled={!quickDesc || ((parseInt(quickH) || 0) + (parseInt(quickM) || 0)) <= 0}
              className="h-[38px] px-4 text-sm font-semibold border-2 border-[#8403C5] text-[#8403C5] bg-transparent hover:bg-[#F3E8FF] disabled:border-[#D8D8EE] disabled:text-[#D8D8EE] disabled:hover:bg-transparent rounded-lg transition-all shrink-0">
              Log
            </button>
          </div>

          {/* Divider */}
          <div className="w-px h-[52px] bg-[#EBEBF5] shrink-0 hidden sm:block" />

          {/* Timer buttons */}
          <div className="shrink-0">
            <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">&nbsp;</label>
            <div className="flex items-center gap-2">
              {timerStatus === 'idle' ? (
                <button onClick={handleStartTimer}
                  className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#242450] hover:bg-[#1A1A3A] text-white rounded-full transition-all">
                  <Play className="w-4 h-4" fill="white" /> Start Timer
                </button>
              ) : (
                <>
                  <button onClick={timerStatus === 'running' ? handlePauseTimer : handleResumeTimer}
                    className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full transition-all ${
                      timerStatus === 'running'
                        ? 'bg-[#FFFBEB] border-2 border-[#E8A020] text-[#A16207] animate-pulse'
                        : 'border-2 border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB]'
                    }`}>
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: timerStatus === 'running' ? '#E8A020' : '#9CA3AF' }} />
                    <span className="font-mono tracking-wider">⏱ {formatTimer(elapsed)}</span>
                  </button>
                  <button onClick={handleStopAndLog}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-2 border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all"
                    title="Stop & Log">
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
        {/* Transcript link */}
        <div className="flex items-center gap-2">
          <Link className="w-3.5 h-3.5 text-[#9CA3AF] shrink-0" />
          <input
            type="url"
            value={quickTranscriptLink}
            onChange={e => setQuickTranscriptLink(e.target.value)}
            placeholder="Transcript link (optional — Fireflies, Otter, Google Doc…)"
            className="flex-1 px-3 py-1.5 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10 transition-all"
          />
        </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 2 — TODAY'S ENTRIES
          ══════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#8403C5] rounded-full" />
            <h2 className="text-[18px] font-bold text-[#242450]">Today</h2>
            <span className="px-3 py-1 text-xs font-bold bg-[#8403C5] text-white rounded-full">{formatDuration(todayTotal)}</span>
          </div>
          <div className="flex border-2 border-[#EBEBF5] rounded-lg overflow-hidden bg-white">
            {[{ id: 'list', icon: List, label: 'List' }, { id: 'calendar', icon: Calendar, label: 'Calendar' }].map(v => (
              <button key={v.id} onClick={() => setTodayView(v.id)}
                className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${todayView === v.id ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
                <v.icon className="w-3.5 h-3.5" /> {v.label}
              </button>
            ))}
          </div>
        </div>
        {todayView === 'list' ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
            {todayEntries.length === 0 ? (
              <div className="px-5 py-12 text-center">
                <p className="text-[15px] font-medium text-[#4A5568]">No time logged today</p>
                <p className="text-[13px] text-[#9CA3AF] mt-1">Use the entry bar above to start tracking</p>
              </div>
            ) : (
              todayEntries.map((e, i) => <EntryRow key={e.id} entry={e} idx={i} />)
            )}
          </div>
        ) : (
          <TodayCalendarView entries={todayEntries} />
        )}
      </div>

      {/* ══════════════════════════════════════
          SECTION 3 — THIS WEEK
          ══════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#8403C5] rounded-full" />
            <h2 className="text-[18px] font-bold text-[#242450]">This Week</h2>
          </div>
          <span className="px-3 py-1 text-xs font-bold bg-[#8403C5] text-white rounded-full">{formatDuration(weekTotal)}</span>
        </div>
        {weekByDay.length === 0 ? (
          <div className="bg-white border-2 border-dashed border-[#D8D8EE] rounded-xl px-5 py-12 text-center">
            <CalendarDays className="w-10 h-10 text-[#8403C5]/40 mx-auto mb-3" />
            <p className="text-[15px] font-medium text-[#4A5568]">No earlier entries this week</p>
            <p className="text-[13px] text-[#9CA3AF] mt-1">Entries from previous days will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {weekByDay.map(day => (
              <DayGroup key={day.date} day={day}>
                {day.entries.map((e, i) => <EntryRow key={e.id} entry={e} showReplay={false} idx={i} />)}
              </DayGroup>
            ))}
          </div>
        )}
      </div>

      {/* ══════════════════════════════════════
          MODAL
          ══════════════════════════════════ */}
      <StopTimerModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} data={modalData} clients={clients} />
    </div>
  );
}

// ── Today Calendar View ──
function TodayCalendarView({ entries }) {
  const now = new Date();
  const todayStr = format(now, 'yyyy-MM-dd');
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const showCurrentLine = currentHourDecimal >= 7 && currentHourDecimal <= 22;
  const totalHeight = CALENDAR_HOURS.length * 60;

  const positioned = useMemo(() => entries.filter(e => e.timerStartedAt && e.timerStoppedAt).map(e => {
    try {
      const startH = new Date(e.timerStartedAt).getHours() + new Date(e.timerStartedAt).getMinutes() / 60;
      const endH = new Date(e.timerStoppedAt).getHours() + new Date(e.timerStoppedAt).getMinutes() / 60;
      if (startH < 7 || startH > 22) return null;
      return { entry: e, top: (startH - 7) * 60, height: Math.max(24, (endH - startH) * 60) };
    } catch { return null; }
  }).filter(Boolean), [entries]);

  const untimed = useMemo(() => entries.filter(e => !e.timerStartedAt || !e.timerStoppedAt), [entries]);

  function fmtHoursLocal(minutes) {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0 && m === 0) return '—';
    if (m === 0) return `${h}h`;
    return `${h}h ${m}m`;
  }

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="grid grid-cols-[60px_1fr] border-b border-[#EBEBF5]">
        <div className="border-r border-[#EBEBF5]" />
        <div className="px-3 py-2.5 text-center">
          <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.06em]">{format(now, 'EEEE')}</p>
          <p className="text-[10px] text-[#9CA3AF]">{format(now, 'd MMM yyyy')}</p>
        </div>
      </div>
      {/* Time grid */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 400px)' }}>
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {CALENDAR_HOURS.map(hour => {
            const top = (hour - 7) * 60;
            return (
              <div key={hour} className="absolute left-0 right-0" style={{ top: `${top}px`, height: '60px' }}>
                <div className="absolute left-0 top-0 w-[60px] h-full border-r border-[#EBEBF5] flex items-start justify-end pr-2">
                  <span className="text-[10px] font-bold text-[#5777AB] leading-none">{String(hour).padStart(2, '0')}:00</span>
                </div>
                <div className="absolute left-[60px] right-0 top-0 border-t border-[#EBEBF5] h-px" />
                <div className="absolute left-[60px] right-0 top-[30px] border-t border-dashed border-[#D8D8EE] h-px" />
              </div>
            );
          })}
          {/* Positioned entries */}
          {positioned.map(({ entry, top, height }) => {
            const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
            return (
              <div key={entry.id} className="absolute rounded-md px-2 py-1 overflow-hidden z-10"
                style={{ left: '64px', right: '4px', top: `${top}px`, height: `${Math.min(height, totalHeight - top)}px`, backgroundColor: `${color}18`, borderLeft: `3px solid ${color}` }}>
                <p className="text-[10px] font-semibold leading-tight" style={{ color }}>{entry.category}</p>
                <p className="text-[10px] font-medium text-[#242450] leading-tight mt-0.5 truncate">{entry.projectTask}</p>
                <p className="text-[9px] font-bold text-[#242450] mt-0.5">{fmtHoursLocal(entry.durationMinutes)}</p>
              </div>
            );
          })}
          {/* Untimed entries at top */}
          {untimed.map((e, ci) => {
            const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
            return (
              <div key={e.id} className="absolute px-1.5 py-0.5 rounded z-10"
                style={{ left: '64px', right: '4px', top: `${ci * 26}px`, backgroundColor: `${color}12`, borderLeft: `2px solid ${color}` }}>
                <p className="text-[9px] font-medium text-[#242450] truncate">{e.projectTask || '—'}</p>
                <p className="text-[8px] text-[#5777AB]">{fmtHoursLocal(e.durationMinutes)}</p>
              </div>
            );
          })}
          {/* Current time line */}
          {showCurrentLine && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${(currentHourDecimal - 7) * 60}px` }}>
              <div className="absolute left-[60px] right-0 h-px bg-[#DC2626]" />
              <div className="absolute left-0 w-[60px] flex items-center justify-end pr-2" style={{ marginTop: '-9px' }}>
                <span className="text-[10px] font-bold text-[#DC2626] bg-white px-1 rounded">{format(now, 'HH:mm')}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Collapsible day group ──
function DayGroup({ day, children }) {
  const [open, setOpen] = useState(true);
  try { format(parseISO(day.date), 'EEE d MMM'); } catch { return <div>{children}</div>; }

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl shadow-[0_1px_4px_rgba(0,0,0,0.03)]">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F6F6FB] transition-colors">
        <span className="text-[13px] font-bold text-[#242450]">
          {(() => {
            try {
              const d = parseISO(day.date);
              if (isYesterday(d)) return 'Yesterday';
              return format(d, 'EEE d MMM');
            } catch { return day.date; }
          })()}
        </span>
        <span className="px-2.5 py-0.5 text-[11px] font-bold bg-[#8403C5]/10 text-[#8403C5] rounded-full">{formatDuration(day.totalMin)}</span>
      </button>
      {open && <div className="border-t border-[#F2F2F4]">{children}</div>}
    </div>
  );
}