import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfWeek, endOfWeek, isWithinInterval, isToday, isYesterday } from 'date-fns';
import { Play, Square, Pause, Link, MoreVertical, RotateCw, Copy, Pencil, Trash2, CalendarDays, List, Calendar } from 'lucide-react';
import TranscriptField from './TranscriptField';
import TaskPresetSelect from './TaskPresetSelect';
import EntryDetailModal from './EntryDetailModal';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import { logActivity } from '@/lib/logActivity';
import {
  useSharedTimer, sharedTimerStart, sharedTimerPause, sharedTimerResume,
  sharedTimerStop, sharedTimerCommit, sharedTimerBootstrap, sharedTimerUpdateMeta
} from '@/hooks/useSharedTimer';

const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 7);

async function writeClientActivityLog({ clientId, clientName, teamMember, category, projectTask, durationMinutes, notes, transcriptLink }) {
  if (!clientId) return;
  try {
    const client = await base44.entities.Client.get(clientId);
    if (!client) return;
    const currentLog = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
    const h = Math.floor(durationMinutes / 60); const m = durationMinutes % 60;
    const durStr = m === 0 ? `${h}h` : `${h}h ${m}m`;
    currentLog.push({ date: new Date().toISOString(), type: 'Time logged', label: `Time logged: ${durStr} — ${category}`, category, duration: durStr, description: projectTask, teamMember, notes: notes || '', transcriptLink: transcriptLink || '' });
    await base44.entities.Client.update(clientId, { activityLog: JSON.stringify(currentLog) });
  } catch {}
}

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
const CATEGORIES = CATEGORY_LABELS;

function formatTimer(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (h === 0 && m === 0) return '0h';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

function formatTimeOfDay(iso) {
  try { return format(new Date(iso), 'HH:mm'); } catch { return iso; }
}

export default function LogTime({ onLogged }) {
  // Shared timer state
  const timer = useSharedTimer();

  // Local mirror of timer meta fields (synced to shared state)
  const [quickCat, setQuickCatRaw] = useState(timer.category || '');
  const [quickDesc, setQuickDescRaw] = useState(timer.projectTask || '');
  const [quickClientId, setQuickClientIdRaw] = useState(timer.clientId || '');
  const [quickClientName, setQuickClientNameRaw] = useState(timer.clientName || '');

  // Keep local fields in sync when shared state changes from another surface
  const prevTimerRef = useRef(timer);
  useEffect(() => {
    const prev = prevTimerRef.current;
    if (prev.timerId !== timer.timerId || prev.category !== timer.category || prev.projectTask !== timer.projectTask) {
      setQuickCatRaw(timer.category || '');
      setQuickDescRaw(timer.projectTask || '');
      setQuickClientIdRaw(timer.clientId || '');
      setQuickClientNameRaw(timer.clientName || '');
    }
    prevTimerRef.current = timer;
  }, [timer.timerId, timer.category, timer.projectTask, timer.clientId]);

  const setQuickCat = (v) => { setQuickCatRaw(v); if (timer.timerId) sharedTimerUpdateMeta({ category: v }); };
  const setQuickDesc = (v) => { setQuickDescRaw(v); if (timer.timerId) sharedTimerUpdateMeta({ projectTask: v }); };
  const setQuickClientId = (v) => { setQuickClientIdRaw(v); };
  const setQuickClientName = (v) => { setQuickClientNameRaw(v); if (timer.timerId) sharedTimerUpdateMeta({ clientName: v }); };

  // Inline validation after stop
  const [stoppedEntry, setStoppedEntry] = useState(null); // { timerId, durationMinutes, durationMs }
  const [saveError, setSaveError] = useState('');

  // Quick log
  const [quickH, setQuickH] = useState('0');
  const [quickM, setQuickM] = useState('0');
  const [quickTranscriptLink, setQuickTranscriptLink] = useState('');
  const [quickTranscriptFileUrl, setQuickTranscriptFileUrl] = useState('');
  const [quickTranscriptFileName, setQuickTranscriptFileName] = useState('');

  // Entries + misc
  const [entries, setEntries] = useState([]);
  const [teamMember, setTeamMember] = useState('');
  const [clients, setClients] = useState([]);
  const [menuOpenId, setMenuOpenId] = useState(null);
  const [todayView, setTodayView] = useState('calendar');
  const [detailEntry, setDetailEntry] = useState(null);

  const userIdRef = useRef(null);

  // Debounce meta sync to DB
  useEffect(() => {
    if (!timer.timerId || timer.status === 'idle') return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(timer.timerId, {
          category: quickCat || '',
          projectTask: quickDesc.trim() || '(Untitled session)',
          ...(quickClientId ? { clientId: quickClientId, clientName: quickClientName } : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [quickCat, quickDesc, quickClientId, quickClientName, timer.timerId]);

  // Init user + clients + bootstrap timer
  useEffect(() => {
    base44.auth.me().then(me => {
      if (me) {
        userIdRef.current = me.id;
        const first = me.full_name?.split(' ')[0] || '';
        if (TEAM_MEMBERS.includes(first)) {
          setTeamMember(first);
          sharedTimerBootstrap(first, me.id);
        }
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
    loadEntries();
  }, []);

  const loadEntries = useCallback(async () => {
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const firstName = me.full_name?.split(' ')[0] || '';
    if (!TEAM_MEMBERS.includes(firstName)) return;
    const all = await base44.entities.TimeEntry.filter({ teamMember: firstName }, '-date', 300);
    setEntries(all);
  }, []);

  // Date grouping
  const weekRange = useMemo(() => {
    const now = new Date();
    return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
  }, []);

  const todayEntries = useMemo(() => entries.filter(e => {
    try { return isToday(parseISO(e.date)); } catch { return false; }
  }).filter(e => e.timerStatus === 'logged' || !e.timerStatus).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date)), [entries]);

  const weekEntries = useMemo(() => entries.filter(e => {
    try {
      const d = parseISO(e.date);
      return isWithinInterval(d, { start: weekRange.start, end: weekRange.end }) && !isToday(d);
    } catch { return false; }
  }).filter(e => e.timerStatus === 'logged' || !e.timerStatus).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date)), [entries, weekRange]);

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

  // ── Timer: Start ──
  const handleStartTimer = async () => {
    if (timer.timerId) return;
    setStoppedEntry(null); setSaveError('');
    const me = await base44.auth.me().catch(() => null);
    const firstName = me?.full_name?.split(' ')[0] || '';
    await sharedTimerStart({ teamMember: firstName, category: quickCat, projectTask: quickDesc, clientId: quickClientId, clientName: quickClientName, userId: me?.id });
    logActivity({ teamMember: firstName, actionType: 'Started a timer', section: 'Time & Capacity', recordName: quickDesc.trim() || '(Untitled session)' });
  };

  // ── Timer: Stop — no modal, inline validation ──
  const handleStopAndLog = async () => {
    const result = await sharedTimerStop();
    // Check required fields
    const cat = quickCat;
    const task = quickDesc.trim();
    if (!cat || !task) {
      setStoppedEntry({ ...result, category: cat, projectTask: task });
      setSaveError('Category and Task are required before saving.');
      return;
    }
    // Auto-save immediately
    await commitEntry(result.timerId, result.durationMinutes, cat, task);
  };

  const commitEntry = async (timerId, durationMinutes, cat, task) => {
    await sharedTimerCommit(timerId, {
      category: cat, projectTask: task,
      clientId: quickClientId, clientName: quickClientName,
      date: format(new Date(), 'yyyy-MM-dd'),
      durationMinutes,
      notes: '',
      transcriptLink: quickTranscriptLink.trim(),
      transcriptFileUrl: quickTranscriptFileUrl,
      transcriptFileName: quickTranscriptFileName,
    }, teamMember);
    await writeClientActivityLog({ clientId: quickClientId, clientName: quickClientName, teamMember, category: cat, projectTask: task, durationMinutes, notes: '', transcriptLink: quickTranscriptLink.trim() });
    setStoppedEntry(null); setSaveError('');
    setQuickCatRaw(''); setQuickDescRaw(''); setQuickClientIdRaw(''); setQuickClientNameRaw('');
    setQuickTranscriptLink(''); setQuickTranscriptFileUrl(''); setQuickTranscriptFileName('');
    loadEntries();
    onLogged?.();
    logActivity({ teamMember, actionType: 'Stopped & logged a timer', section: 'Time & Capacity', recordName: task, details: `${cat} — ${formatDuration(durationMinutes)}` });
  };

  const handleSaveStopped = async () => {
    if (!stoppedEntry) return;
    const cat = quickCat;
    const task = quickDesc.trim();
    if (!cat || !task) { setSaveError('Category and Task are required before saving.'); return; }
    await commitEntry(stoppedEntry.timerId, stoppedEntry.durationMinutes, cat, task);
  };

  // ── Quick Log ──
  const handleQuickLog = async () => {
    if (!quickDesc.trim()) return;
    const h = parseInt(quickH) || 0; const m = parseInt(quickM) || 0;
    const totalMin = h * 60 + m;
    if (totalMin <= 0) return;
    try {
      await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'), teamMember, category: quickCat || 'Other',
        projectTask: quickDesc.trim(), durationMinutes: totalMin,
        transcriptLink: quickTranscriptLink.trim() || undefined,
        transcriptFileUrl: quickTranscriptFileUrl || undefined,
        transcriptFileName: quickTranscriptFileName || undefined,
        timerStatus: 'logged',
        ...(quickClientId ? { clientId: quickClientId, clientName: quickClientName } : {}),
      });
      await writeClientActivityLog({ clientId: quickClientId, clientName: quickClientName, teamMember, category: quickCat || 'Other', projectTask: quickDesc.trim(), durationMinutes: totalMin, notes: '', transcriptLink: quickTranscriptLink.trim() });
      setQuickDesc(''); setQuickH('0'); setQuickM('0'); setQuickTranscriptLink(''); setQuickTranscriptFileUrl(''); setQuickTranscriptFileName('');
      loadEntries(); onLogged?.();
      logActivity({ teamMember, actionType: 'Logged a time entry', section: 'Time & Capacity', recordName: quickDesc.trim(), details: `${quickCat || 'Other'} — ${formatDuration(totalMin)}` });
    } catch {}
  };

  const handleReplay = (entry) => {
    setQuickDesc(entry.projectTask || '');
    setQuickCat(entry.category || '');
    setQuickClientId(entry.clientId || '');
    setQuickClientName(entry.clientName || '');
    const h = Math.floor((entry.durationMinutes || 0) / 60);
    const m = (entry.durationMinutes || 0) % 60;
    setQuickH(String(h)); setQuickM(String(m));
  };

  const handleEdit = (entry) => {
    setDetailEntry(entry);
    setMenuOpenId(null);
  };

  const handleDuplicate = async (entry) => {
    try {
      await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'), teamMember, category: entry.category || '',
        projectTask: entry.projectTask || '', durationMinutes: entry.durationMinutes || 0,
        timerStatus: 'logged',
        ...(entry.clientId ? { clientId: entry.clientId, clientName: entry.clientName } : {}),
      });
      loadEntries(); onLogged?.();
    } catch {}
    setMenuOpenId(null);
  };

  const handleDelete = async (entry) => {
    if (!window.confirm('Delete this time entry?')) return;
    try { await base44.entities.TimeEntry.delete(entry.id); loadEntries(); onLogged?.(); } catch {}
    setMenuOpenId(null);
  };

  // ── Entry row ──
  const EntryRow = ({ entry, showReplay = true, idx }) => {
    const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
    const hasTimes = entry.timerStartedAt && entry.timerStoppedAt;
    const desc = entry.projectTask?.trim();
    const catLabel = entry.category?.trim();
    return (
      <div className={`flex items-center gap-4 px-5 py-4 hover:bg-[#FAFBFC] transition-colors group ${idx !== undefined && idx % 2 === 1 ? 'bg-[#FAFAFD]/40' : ''}`}>
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setDetailEntry(entry)}>
          <p className={`text-[15px] font-bold text-[#242450] truncate ${!desc ? 'text-[#9CA3AF] italic font-normal' : ''}`}>{desc || 'No description'}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: `${color}20`, color }}>{catLabel || 'Uncategorised'}</span>
            {entry.clientName && <span className="text-[11px] text-[#4A5568] border border-[#D8D8EE] rounded-full px-2 py-0.5">{entry.clientName}</span>}
            {entry.transcriptLink && (
              <a href={entry.transcriptLink} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                className="flex items-center gap-1 text-[11px] text-[#5777AB] hover:text-[#8403C5]">
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
            <button onClick={(e) => { e.stopPropagation(); setMenuOpenId(menuOpenId === entry.id ? null : entry.id); }}
              className="p-2 hover:bg-[#EBEBF5] rounded-lg entry-menu">
              <MoreVertical className="w-4 h-4 text-[#9CA3AF]" />
            </button>
            {menuOpenId === entry.id && (
              <div className="absolute right-0 top-full mt-1 w-36 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 py-1 entry-menu" onClick={e => e.stopPropagation()}>
                <button onClick={() => handleEdit(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#242450] hover:bg-[#F6F6FB]"><Pencil className="w-3 h-3" /> Edit</button>
                <button onClick={() => handleDuplicate(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#242450] hover:bg-[#F6F6FB]"><Copy className="w-3 h-3" /> Duplicate</button>
                <button onClick={() => handleDelete(entry)} className="w-full flex items-center gap-2 px-3 py-2 text-xs text-[#DC2626] hover:bg-[#FEF2F2]"><Trash2 className="w-3 h-3" /> Delete</button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  useEffect(() => {
    if (!menuOpenId) return;
    const handler = (e) => { if (!e.target.closest('.entry-menu')) setMenuOpenId(null); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpenId]);

  const isStopped = !!stoppedEntry;
  const missingCat = isStopped && !quickCat;
  const missingTask = isStopped && !quickDesc.trim();

  return (
    <div className="max-w-[900px] mx-auto pt-4 space-y-10">
      {/* ── QUICK ENTRY BAR ── */}
      <div className={`bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.06)] border-l-4 ${isStopped ? 'border-l-[#DC2626]' : 'border-l-[#8403C5]'} px-7 py-6`}>
        <div className="space-y-3">
          <div className="flex items-end gap-3 flex-wrap">
            {/* Team Member */}
            <div className="shrink-0">
              <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Team member</label>
              <select value={teamMember} onChange={e => setTeamMember(e.target.value)}
                className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] w-[120px] focus:outline-none focus:border-[#8403C5]">
                <option value="">Select…</option>
                {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {/* Category */}
            <div className="shrink-0">
              <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Category</label>
              <select value={quickCat} onChange={e => { setQuickCat(e.target.value); if (timer.status === 'idle' && !isStopped) setQuickDesc(''); }}
                className={`px-3 py-2 text-sm border rounded-lg bg-[#F8FAFC] text-[#242450] w-[180px] focus:outline-none transition-all ${missingCat ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20' : 'border-[#E2E8F0] focus:border-[#8403C5]'}`}>
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            {/* Task */}
            <div className="flex-1 min-w-[180px]">
              <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Task description</label>
              <TaskPresetSelect
                category={quickCat}
                value={quickDesc}
                onChange={setQuickDesc}
                placeholder="What are you working on?"
                className={`w-full px-3 py-2 text-sm border rounded-lg bg-[#F8FAFC] focus:outline-none transition-all ${missingTask ? 'border-[#DC2626] ring-2 ring-[#DC2626]/20' : 'border-[#E2E8F0] focus:border-[#8403C5]'}`}
              />
            </div>
            {/* Client */}
            <div className="shrink-0">
              <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
              <select value={quickClientId} onChange={e => { setQuickClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setQuickClientName(c?.name || ''); }}
                className="px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] w-[130px] focus:outline-none focus:border-[#8403C5]">
                <option value="">None</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            {/* Duration (only show when timer is idle and not stopped) */}
            {timer.status === 'idle' && !isStopped && (
              <div className="shrink-0">
                <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Duration</label>
                <div className="flex items-center gap-1">
                  <input type="number" min="0" value={quickH} onChange={e => setQuickH(e.target.value)}
                    className="w-12 px-2 py-2 text-sm text-center border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5]" placeholder="0" />
                  <span className="text-xs text-[#5777AB] font-medium">h</span>
                  <input type="number" min="0" max="59" value={quickM} onChange={e => setQuickM(e.target.value)}
                    className="w-12 px-2 py-2 text-sm text-center border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:outline-none focus:border-[#8403C5]" placeholder="0" />
                  <span className="text-xs text-[#5777AB] font-medium">m</span>
                </div>
              </div>
            )}
            {/* Log / Save button */}
            {isStopped ? (
              <div className="shrink-0">
                <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">&nbsp;</label>
                <button onClick={handleSaveStopped}
                  disabled={!quickCat || !quickDesc.trim()}
                  className="h-[38px] px-4 text-sm font-semibold bg-[#1D9E75] hover:bg-[#17856A] text-white disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] rounded-lg transition-all shrink-0">
                  Save Entry
                </button>
              </div>
            ) : timer.status === 'idle' && (
              <div className="shrink-0">
                <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">&nbsp;</label>
                <button onClick={handleQuickLog}
                  disabled={!quickDesc || ((parseInt(quickH) || 0) + (parseInt(quickM) || 0)) <= 0}
                  className="h-[38px] px-4 text-sm font-semibold border-2 border-[#8403C5] text-[#8403C5] bg-transparent hover:bg-[#F3E8FF] disabled:border-[#D8D8EE] disabled:text-[#D8D8EE] disabled:hover:bg-transparent rounded-lg transition-all shrink-0">
                  Log
                </button>
              </div>
            )}
            {/* Divider */}
            {!isStopped && <div className="w-px h-[52px] bg-[#EBEBF5] shrink-0 hidden sm:block" />}
            {/* Timer controls */}
            {!isStopped && (
              <div className="shrink-0">
                <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">&nbsp;</label>
                <div className="flex items-center gap-2">
                  {timer.status === 'idle' ? (
                    <button onClick={handleStartTimer}
                      className="flex items-center gap-2 px-5 py-2 text-sm font-semibold bg-[#242450] hover:bg-[#1A1A3A] text-white rounded-full transition-all">
                      <Play className="w-4 h-4" fill="white" /> Start Timer
                    </button>
                  ) : (
                    <>
                      <button onClick={timer.status === 'running' ? sharedTimerPause : sharedTimerResume}
                        className={`flex items-center gap-1.5 px-4 py-2 text-sm font-bold rounded-full transition-all ${timer.status === 'running' ? 'bg-[#FFFBEB] border-2 border-[#E8A020] text-[#A16207] animate-pulse' : 'border-2 border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: timer.status === 'running' ? '#E8A020' : '#9CA3AF' }} />
                        <span className="font-mono tracking-wider">⏱ {formatTimer(timer.elapsed)}</span>
                      </button>
                      <button onClick={handleStopAndLog}
                        className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-2 border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all">
                        <Square className="w-3.5 h-3.5" /> Stop
                      </button>
                    </>
                  )}
                </div>
              </div>
            )}
            {/* Stopped duration badge */}
            {isStopped && (
              <div className="shrink-0">
                <label className="block text-[10px] font-semibold text-[#242450] uppercase tracking-[0.06em] mb-1">Recorded</label>
                <span className="text-lg font-bold text-[#242450]">{formatDuration(stoppedEntry.durationMinutes)}</span>
              </div>
            )}
          </div>

          {/* Inline error */}
          {saveError && (
            <div className="flex items-center gap-2 px-3 py-2 bg-[#FEF2F2] border border-[#FECACA] rounded-lg">
              <span className="text-xs font-semibold text-[#DC2626]">{saveError}</span>
            </div>
          )}

          {/* Transcript */}
          <TranscriptField
            transcriptLink={quickTranscriptLink}
            onTranscriptLinkChange={setQuickTranscriptLink}
            transcriptFileUrl={quickTranscriptFileUrl}
            transcriptFileName={quickTranscriptFileName}
            onTranscriptFileChange={({ url, name }) => { setQuickTranscriptFileUrl(url); setQuickTranscriptFileName(name); }}
          />
        </div>
      </div>

      {/* ── TODAY ── */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-1 h-6 bg-[#8403C5] rounded-full" />
            <h2 className="text-[18px] font-bold text-[#242450]">Today</h2>
            {todayTotal > 0 && <span className="px-3 py-1 text-xs font-bold bg-[#8403C5] text-white rounded-full">{formatDuration(todayTotal)}</span>}
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
            ) : todayEntries.map((e, i) => <EntryRow key={e.id} entry={e} idx={i} />)}
          </div>
        ) : (
          <TodayCalendarView entries={todayEntries} onOpenEntry={setDetailEntry} />
        )}
      </div>

      {/* ── THIS WEEK ── */}
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

      {/* Entry detail modal */}
      {detailEntry && (
        <EntryDetailModal
          entry={detailEntry}
          clients={clients}
          onClose={() => setDetailEntry(null)}
          onUpdated={(updated) => {
            setEntries(prev => prev.map(e => e.id === updated.id ? updated : e));
            setDetailEntry(null);
          }}
          onDeleted={(id) => {
            setEntries(prev => prev.filter(e => e.id !== id));
            setDetailEntry(null);
            onLogged?.();
          }}
        />
      )}
    </div>
  );
}

// ── Today Calendar View with side-by-side overlap fix + clickable entries ──
function TodayCalendarView({ entries, onOpenEntry }) {
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const showCurrentLine = currentHourDecimal >= 7 && currentHourDecimal <= 22;
  const totalHeight = CALENDAR_HOURS.length * 60;

  // Compute columns for overlapping entries
  const positioned = useMemo(() => {
    const raw = entries.filter(e => e.timerStartedAt && e.timerStoppedAt).map(e => {
      try {
        const startH = new Date(e.timerStartedAt).getHours() + new Date(e.timerStartedAt).getMinutes() / 60;
        const endH = new Date(e.timerStoppedAt).getHours() + new Date(e.timerStoppedAt).getMinutes() / 60;
        if (startH < 7 || startH > 22) return null;
        return { entry: e, startH, endH, top: (startH - 7) * 60, height: Math.max(24, (endH - startH) * 60) };
      } catch { return null; }
    }).filter(Boolean);

    // Assign columns for overlaps
    const columns = [];
    raw.forEach(item => {
      let placed = false;
      for (let col = 0; col < columns.length; col++) {
        const lastInCol = columns[col][columns[col].length - 1];
        if (item.startH >= lastInCol.endH) { columns[col].push(item); item.col = col; placed = true; break; }
      }
      if (!placed) { item.col = columns.length; columns.push([item]); }
    });
    const totalCols = columns.length;
    return raw.map(item => ({ ...item, totalCols }));
  }, [entries]);

  const untimed = useMemo(() => entries.filter(e => !e.timerStartedAt || !e.timerStoppedAt), [entries]);

  function fmtDur(minutes) {
    const h = Math.floor(minutes / 60); const m = minutes % 60;
    if (!h && !m) return '—'; if (!m) return `${h}h`; if (!h) return `${m}m`; return `${h}h ${m}m`;
  }

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      <div className="grid grid-cols-[60px_1fr] border-b border-[#EBEBF5]">
        <div className="border-r border-[#EBEBF5]" />
        <div className="px-3 py-2.5 text-center">
          <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.06em]">{format(now, 'EEEE')}</p>
          <p className="text-[10px] text-[#9CA3AF]">{format(now, 'd MMM yyyy')}</p>
        </div>
      </div>
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
          {/* Positioned entries — side by side if overlapping */}
          {positioned.map(({ entry, top, height, col, totalCols }) => {
            const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
            const colW = `calc((100% - 64px) / ${totalCols})`;
            const leftPx = `calc(64px + (100% - 64px) / ${totalCols} * ${col})`;
            return (
              <div key={entry.id}
                className="absolute rounded-md px-2 py-1 overflow-hidden z-10 cursor-pointer hover:opacity-90 transition-opacity"
                style={{ left: leftPx, width: colW, top: `${top}px`, height: `${Math.min(height, totalHeight - top)}px`, backgroundColor: `${color}18`, borderLeft: `3px solid ${color}` }}
                onClick={() => onOpenEntry(entry)}>
                <p className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>{entry.category}</p>
                <p className="text-[10px] font-medium text-[#242450] leading-tight mt-0.5 truncate">{entry.projectTask}</p>
                <p className="text-[9px] font-bold text-[#242450] mt-0.5">{fmtDur(entry.durationMinutes)}</p>
              </div>
            );
          })}
          {/* Untimed entries */}
          {untimed.map((e, ci) => {
            const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
            return (
              <div key={e.id} className="absolute px-1.5 py-0.5 rounded z-10 cursor-pointer hover:opacity-90"
                style={{ left: '64px', right: '4px', top: `${ci * 26}px`, backgroundColor: `${color}12`, borderLeft: `2px solid ${color}` }}
                onClick={() => onOpenEntry(e)}>
                <p className="text-[9px] font-medium text-[#242450] truncate">{e.projectTask || '—'}</p>
                <p className="text-[8px] text-[#5777AB]">{fmtDur(e.durationMinutes)}</p>
              </div>
            );
          })}
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

function DayGroup({ day, children }) {
  const [open, setOpen] = useState(true);
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