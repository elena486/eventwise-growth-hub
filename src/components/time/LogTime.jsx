import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday, isYesterday } from 'date-fns';
import { Play, Square, Pause, DollarSign, MoreVertical, RotateCw, Copy, Pencil, Trash2 } from 'lucide-react';
import StopTimerModal from './StopTimerModal';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';

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
  if (h === 0 && m === 0) return '—';
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
  const [quickBillable, setQuickBillable] = useState(false);

  // ── Stop/edit modal ──
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // ── Entries ──
  const [entries, setEntries] = useState([]);
  const [teamMember, setTeamMember] = useState('');
  const [clients, setClients] = useState([]);

  // ── Overflow menu ──
  const [menuOpenId, setMenuOpenId] = useState(null);

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

  // ── Day label helper ──
  function dayLabel(dateStr) {
    try {
      const d = parseISO(dateStr);
      if (isYesterday(d)) return 'Yesterday';
      return format(d, 'EEE d MMM');
    } catch { return dateStr; }
  }

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
        ...(formData.clientId ? {} : { clientId: '', clientName: '' }),
      });
    }
    setModalOpen(false);
    setActiveTimerId(null);
    if (modalData?.mode === 'stop' && userIdRef.current) clearTimerLS(userIdRef.current);
    loadEntries();
    onLogged?.();
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
        billable: quickBillable,
        ...(quickClientId ? { clientId: quickClientId, clientName: quickClientName } : {}),
      });
      setQuickDesc(''); setQuickH('0'); setQuickM('0');
      loadEntries();
      onLogged?.();
    } catch {}
  };

  // ── Replay → pre-fill quick bar ──
  const handleReplay = (entry) => {
    setQuickDesc(entry.projectTask || '');
    setQuickCat(entry.category || '');
    setQuickClientId(entry.clientId || '');
    setQuickClientName(entry.clientName || '');
    setQuickBillable(entry.billable || false);
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
  const EntryRow = ({ entry, showReplay = true }) => {
    const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
    const hasTimes = entry.timerStartedAt && entry.timerStoppedAt;
    return (
      <div className="flex items-center gap-3 px-4 py-2.5 border-t border-[#F2F2F4] hover:bg-[#F6F6FB] transition-colors group">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[#242450] truncate">{entry.projectTask || '—'}</p>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded" style={{ backgroundColor: `${color}18`, color }}>{entry.category}</span>
            {entry.clientName && <span className="text-[10px] text-[#5777AB]">{entry.clientName}</span>}
          </div>
        </div>
        <span className="text-[10px] text-[#9CA3AF] shrink-0 w-24 text-right">
          {hasTimes ? `${formatTimeOfDay(entry.timerStartedAt)} – ${formatTimeOfDay(entry.timerStoppedAt)}` : '—'}
        </span>
        <span className="text-sm font-bold text-[#242450] font-mono shrink-0 w-20 text-right">{formatDuration(entry.durationMinutes)}</span>
        <div className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
          {showReplay && (
            <button onClick={() => handleReplay(entry)} className="p-1.5 hover:bg-[#EBEBF5] rounded" title="Resume task">
              <RotateCw className="w-3.5 h-3.5 text-[#5777AB]" />
            </button>
          )}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === entry.id ? null : entry.id); }}
              className="p-1.5 hover:bg-[#EBEBF5] rounded entry-menu" title="More actions">
              <MoreVertical className="w-3.5 h-3.5 text-[#9CA3AF]" />
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
    <div className="max-w-3xl mx-auto pt-2 space-y-6">
      {/* ══════════════════════════════════════
          SECTION 1 — QUICK ENTRY BAR
          ══════════════════════════════════ */}
      <div className="bg-white border border-[#EBEBF5] rounded-xl px-4 py-3">
        <div className="flex items-center gap-2 flex-wrap">
          {/* What are you working on? */}
          <input
            type="text" value={quickDesc} onChange={e => setQuickDesc(e.target.value)}
            placeholder="What are you working on?"
            className="flex-1 min-w-[160px] px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
            onKeyDown={e => { if (e.key === 'Enter') handleQuickLog(); }}
          />

          {/* Category */}
          <select value={quickCat} onChange={e => setQuickCat(e.target.value)}
            className="px-2.5 py-2 text-xs border border-[#EBEBF5] rounded-lg bg-white text-[#242450] shrink-0">
            <option value="">Category</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>

          {/* Client */}
          <select value={quickClientId} onChange={e => { setQuickClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setQuickClientName(c?.name || ''); }}
            className="px-2.5 py-2 text-xs border border-[#EBEBF5] rounded-lg bg-white text-[#242450] shrink-0 max-w-[120px]">
            <option value="">Client</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>

          {/* Billable toggle */}
          <button onClick={() => setQuickBillable(b => !b)} title="Billable"
            className={`p-2 rounded-lg border transition-colors shrink-0 ${quickBillable ? 'bg-[#E8F7F2] border-[#1D9E75] text-[#1D9E75]' : 'border-[#EBEBF5] text-[#9CA3AF] hover:border-[#D8D8EE]'}`}>
            <DollarSign className="w-4 h-4" />
          </button>

          {/* Duration */}
          <div className="flex items-center gap-1 shrink-0">
            <input type="number" min="0" value={quickH} onChange={e => setQuickH(e.target.value)}
              className="w-12 px-2 py-2 text-xs text-center border border-[#EBEBF5] rounded-lg bg-white" placeholder="0" />
            <span className="text-xs text-[#5777AB]">h</span>
            <input type="number" min="0" max="59" value={quickM} onChange={e => setQuickM(e.target.value)}
              className="w-12 px-2 py-2 text-xs text-center border border-[#EBEBF5] rounded-lg bg-white" placeholder="0" />
            <span className="text-xs text-[#5777AB]">m</span>
          </div>

          {/* Log button */}
          <button onClick={handleQuickLog}
            disabled={!quickDesc.trim() || ((parseInt(quickH) || 0) + (parseInt(quickM) || 0)) <= 0}
            className="px-4 py-2 text-xs font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white rounded-lg transition-colors shrink-0">
            Log
          </button>

          {/* Divider */}
          <div className="w-px h-8 bg-[#EBEBF5] shrink-0 hidden sm:block" />

          {/* Timer buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {timerStatus === 'idle' ? (
              <button onClick={handleStartTimer}
                className="flex items-center gap-1 px-3 py-2 text-xs font-semibold bg-[#242450] hover:bg-[#1A1A3A] text-white rounded-lg transition-colors">
                <Play className="w-3.5 h-3.5" fill="white" /> Start
              </button>
            ) : (
              <>
                <span className={`font-mono text-sm font-bold tracking-wider ${timerStatus === 'running' ? 'text-[#E8A020]' : 'text-[#9CA3AF]'}`}>
                  {formatTimer(elapsed)}
                </span>
                {timerStatus === 'running' ? (
                  <>
                    <button onClick={handlePauseTimer} className="p-1.5 hover:bg-[#EBEBF5] rounded" title="Pause">
                      <Pause className="w-3.5 h-3.5 text-[#5777AB]" />
                    </button>
                    <button onClick={handleStopAndLog}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold bg-[#DC2626] hover:bg-[#B91C1C] text-white rounded-lg transition-colors">
                      <Square className="w-3 h-3" fill="white" /> Stop
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={handleResumeTimer} className="p-1.5 hover:bg-[#EBEBF5] rounded" title="Resume">
                      <Play className="w-3.5 h-3.5 text-[#5777AB]" fill="#5777AB" />
                    </button>
                    <button onClick={handleStopAndLog}
                      className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">
                      <Square className="w-3 h-3" /> Stop
                    </button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 2 — TODAY'S ENTRIES
          ══════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#242450]">Today</h2>
          <span className="text-xs font-semibold text-[#5777AB]">{formatDuration(todayTotal)} total</span>
        </div>
        <div className="bg-white border border-[#EBEBF5] rounded-xl">
          {todayEntries.length === 0 ? (
            <div className="px-4 py-10 text-center">
              <p className="text-sm text-[#5777AB]">No time logged today</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Use the bar above to start tracking</p>
            </div>
          ) : (
            todayEntries.map(e => <EntryRow key={e.id} entry={e} />)
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════
          SECTION 3 — THIS WEEK
          ══════════════════════════════════════ */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-[#242450]">This Week</h2>
          <span className="text-xs font-semibold text-[#5777AB]">{formatDuration(weekTotal)} total</span>
        </div>
        {weekByDay.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl px-4 py-10 text-center">
            <p className="text-sm text-[#5777AB]">No entries earlier this week</p>
          </div>
        ) : (
          <div className="space-y-3">
            {weekByDay.map(day => (
              <DayGroup key={day.date} day={day}>
                {day.entries.map(e => <EntryRow key={e.id} entry={e} showReplay={false} />)}
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

// ── Collapsible day group ──
function DayGroup({ day, children }) {
  const [open, setOpen] = useState(true);
  try { format(parseISO(day.date), 'EEE d MMM'); } catch { return <div>{children}</div>; }

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl">
      <button onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-2.5 hover:bg-[#F6F6FB] transition-colors">
        <span className="text-xs font-bold text-[#242450] uppercase tracking-[0.04em]">
          {(() => {
            try {
              const d = parseISO(day.date);
              if (isYesterday(d)) return 'Yesterday';
              return format(d, 'EEE d MMM');
            } catch { return day.date; }
          })()}
        </span>
        <span className="text-xs font-semibold text-[#5777AB]">{formatDuration(day.totalMin)}</span>
      </button>
      {open && <div>{children}</div>}
    </div>
  );
}