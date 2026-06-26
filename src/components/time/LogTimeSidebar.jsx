import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Play, Square, Pause, Link, Clock } from 'lucide-react';
import TaskPresetSelect from './TaskPresetSelect';
import StopTimerModal from './StopTimerModal';
import { CATEGORY_LABELS } from './categoryColors';
import { logActivity } from '@/lib/logActivity';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];

const LS_KEY_PREFIX = 'eventwise_timer_';
function getTimerLSKey(userId) { return `${LS_KEY_PREFIX}${userId}`; }
function saveTimerToLS(userId, data) { try { localStorage.setItem(getTimerLSKey(userId), JSON.stringify(data)); } catch {} }
function clearTimerLS(userId) { try { localStorage.removeItem(getTimerLSKey(userId)); } catch {} }
function getTimerFromLS(userId) {
  try { const raw = localStorage.getItem(getTimerLSKey(userId)); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

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
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

async function writeClientActivityLog({ clientId, clientName, teamMember, category, projectTask, durationMinutes, notes, transcriptLink }) {
  if (!clientId) return;
  try {
    const client = await base44.entities.Client.get(clientId);
    if (!client) return;
    const currentLog = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
    const durStr = formatDuration(durationMinutes);
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

export default function LogTimeSidebar() {
  const [open, setOpen] = useState(false);

  // Form fields — persist in state so they survive close/reopen
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [hours, setHours] = useState('0');
  const [mins, setMins] = useState('0');
  const [notes, setNotes] = useState('');
  const [transcriptLink, setTranscriptLink] = useState('');
  const [clients, setClients] = useState([]);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  // Timer
  const [timerStatus, setTimerStatus] = useState('idle');
  const [elapsed, setElapsed] = useState(0);
  const [activeTimerId, setActiveTimerId] = useState(null);
  const [activeTimerRecord, setActiveTimerRecord] = useState(null);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);
  const pauseStartRef = useRef(null);
  const totalPausedMsRef = useRef(0);
  const userIdRef = useRef(null);

  // Stop modal
  const [modalOpen, setModalOpen] = useState(false);
  const [modalData, setModalData] = useState(null);

  // Load user + clients once
  useEffect(() => {
    base44.auth.me().then(me => {
      if (me) {
        userIdRef.current = me.id;
        const first = me.full_name?.split(' ')[0] || '';
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
  }, []);

  // Sync timer DB fields when category/task/client change
  useEffect(() => {
    if (!activeTimerId || timerStatus === 'idle') return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(activeTimerId, {
          category: category || '',
          projectTask: projectTask.trim() || '(Untitled session)',
          ...(clientId ? { clientId, clientName } : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [category, clientId, projectTask]);

  const handleStartTimer = async () => {
    if (activeTimerId) return;
    const now = new Date().toISOString();
    const nowMs = new Date(now).getTime();
    const record = await base44.entities.TimeEntry.create({
      date: format(new Date(), 'yyyy-MM-dd'),
      teamMember,
      category: category || '',
      projectTask: projectTask.trim() || '(Untitled session)',
      durationMinutes: 0,
      timerStatus: 'running',
      timerStartedAt: now,
      timerPauseIntervals: '[]',
      ...(clientId ? { clientId, clientName } : {}),
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
    if (userIdRef.current) saveTimerToLS(userIdRef.current, { startedAt: now, status: 'running', totalPausedMs: 0, pauseIntervals: [], recordId: record.id });
  };

  const handlePauseTimer = async () => {
    const pauseTime = new Date().toISOString();
    pauseStartRef.current = new Date(pauseTime).getTime();
    clearInterval(intervalRef.current);
    setTimerStatus('paused');
    if (activeTimerId) {
      const record = await base44.entities.TimeEntry.get(activeTimerId).catch(() => null);
      if (record) {
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        intervals.push({ pausedAt: pauseTime, resumedAt: null });
        await base44.entities.TimeEntry.update(activeTimerId, { timerStatus: 'paused', timerPauseIntervals: JSON.stringify(intervals) }).catch(() => {});
      }
    }
  };

  const handleResumeTimer = async () => {
    const resumeMs = Date.now();
    if (pauseStartRef.current) { totalPausedMsRef.current += resumeMs - pauseStartRef.current; pauseStartRef.current = null; }
    setTimerStatus('running');
    intervalRef.current = setInterval(() => { setElapsed(Date.now() - startTimeRef.current - totalPausedMsRef.current); }, 500);
    if (activeTimerId) {
      const record = await base44.entities.TimeEntry.get(activeTimerId).catch(() => null);
      if (record) {
        const intervals = JSON.parse(record.timerPauseIntervals || '[]');
        if (intervals.length > 0 && !intervals[intervals.length - 1].resumedAt) intervals[intervals.length - 1].resumedAt = new Date().toISOString();
        await base44.entities.TimeEntry.update(activeTimerId, { timerStatus: 'running', timerPauseIntervals: JSON.stringify(intervals) }).catch(() => {});
      }
    }
  };

  const handleStopTimer = async () => {
    clearInterval(intervalRef.current);
    if (timerStatus === 'paused' && pauseStartRef.current) { totalPausedMsRef.current += Date.now() - pauseStartRef.current; pauseStartRef.current = null; }
    const totalActiveMs = Date.now() - startTimeRef.current - totalPausedMsRef.current;
    const totalMin = Math.max(1, Math.round(totalActiveMs / 60000));
    const cat = activeTimerRecord?.category || category || '';
    const task = (activeTimerRecord?.projectTask === '(Untitled session)' ? projectTask : activeTimerRecord?.projectTask || projectTask) || '';
    const cId = activeTimerRecord?.clientId || clientId || '';
    const cName = activeTimerRecord?.clientName || clientName || '';
    if (activeTimerId) {
      await base44.entities.TimeEntry.update(activeTimerId, {
        timerStatus: 'stopped', timerStoppedAt: new Date().toISOString(), durationMinutes: totalMin,
        category: cat, projectTask: task, ...(cId ? { clientId: cId, clientName: cName } : {}),
      }).catch(() => {});
    }
    setModalData({ mode: 'stop', category: cat, clientId: cId, clientName: cName, projectTask: task, durationMs: totalActiveMs, durationMinutes: totalMin, timerId: activeTimerId, date: format(new Date(), 'yyyy-MM-dd'), notes: '' });
    setModalOpen(true);
    setTimerStatus('idle');
    setActiveTimerRecord(null);
    totalPausedMsRef.current = 0;
    pauseStartRef.current = null;
    if (userIdRef.current) clearTimerLS(userIdRef.current);
  };

  const handleModalSave = async (formData) => {
    if (modalData?.timerId) {
      await base44.entities.TimeEntry.update(modalData.timerId, {
        ...formData, timerStatus: 'logged', teamMember,
        transcriptLink: formData.transcriptLink || '',
        ...(formData.clientId ? {} : { clientId: '', clientName: '' }),
      });
      await writeClientActivityLog({ clientId: formData.clientId, clientName: formData.clientName, teamMember, category: formData.category, projectTask: formData.projectTask, durationMinutes: formData.durationMinutes, notes: formData.notes, transcriptLink: formData.transcriptLink });
    }
    setModalOpen(false);
    setActiveTimerId(null);
    if (userIdRef.current) clearTimerLS(userIdRef.current);
    logActivity({ teamMember, actionType: 'Logged a time entry via sidebar', section: 'Time & Capacity', recordName: formData.projectTask || '' });
  };

  const handleQuickLog = async () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(mins) || 0;
    const totalMin = h * 60 + m;
    if (!projectTask.trim() || totalMin <= 0) return;
    setLogging(true);
    try {
      await base44.entities.TimeEntry.create({
        date: format(new Date(), 'yyyy-MM-dd'),
        teamMember,
        category: category || 'Other',
        projectTask: projectTask.trim(),
        durationMinutes: totalMin,
        notes: notes.trim() || undefined,
        transcriptLink: transcriptLink.trim() || undefined,
        ...(clientId ? { clientId, clientName } : {}),
      });
      await writeClientActivityLog({ clientId, clientName, teamMember, category: category || 'Other', projectTask: projectTask.trim(), durationMinutes: totalMin, notes: notes.trim(), transcriptLink: transcriptLink.trim() });
      logActivity({ teamMember, actionType: 'Logged a time entry via sidebar', section: 'Time & Capacity', recordName: projectTask.trim(), details: `${category || 'Other'} — ${formatDuration(totalMin)}` });
      // Reset form after log
      setProjectTask(''); setHours('0'); setMins('0'); setNotes(''); setTranscriptLink(''); setCategory(''); setClientId(''); setClientName('');
      setLogged(true);
      setTimeout(() => setLogged(false), 2000);
    } catch {}
    setLogging(false);
  };

  const isValid = projectTask.trim() && ((parseInt(hours) || 0) + (parseInt(mins) || 0)) > 0;

  return (
    <>
      {/* Tab handle */}
      <div
        onClick={() => setOpen(o => !o)}
        className="fixed right-0 top-1/2 -translate-y-1/2 z-50 cursor-pointer"
        title="Log Time"
      >
        <div className={`flex flex-col items-center justify-center gap-1.5 w-8 py-5 rounded-l-xl transition-all duration-200 ${open ? 'bg-[#6B02A0]' : 'bg-[#8403C5] hover:bg-[#6B02A0]'} shadow-lg`}>
          <Clock className="w-4 h-4 text-white" />
          {['L','o','g'].map((c, i) => <span key={i} className="text-white text-[10px] font-bold leading-none">{c}</span>)}
        </div>
      </div>

      {/* Backdrop */}
      {open && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />}

      {/* Sidebar panel */}
      <div className={`fixed top-0 right-0 h-full w-[360px] bg-white border-l border-[#EBEBF5] z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#EBEBF5] bg-[#242450]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/70" />
            <h2 className="text-sm font-bold text-white">Log Time</h2>
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Team Member */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Team member</label>
            <select value={teamMember} onChange={e => setTeamMember(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]">
              <option value="">Select…</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>

          {/* Category */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Category</label>
            <select value={category} onChange={e => { setCategory(e.target.value); setProjectTask(''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]">
              <option value="">Select…</option>
              {CATEGORY_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Task */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Project / Task</label>
            <TaskPresetSelect
              category={category}
              value={projectTask}
              onChange={setProjectTask}
              placeholder="Select a task…"
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]"
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Duration */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Duration</label>
            <div className="flex items-center gap-2">
              <input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)}
                className="w-16 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]" placeholder="0" />
              <span className="text-xs text-[#5777AB] font-medium">h</span>
              <input type="number" min="0" max="59" value={mins} onChange={e => setMins(e.target.value)}
                className="w-16 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]" placeholder="0" />
              <span className="text-xs text-[#5777AB] font-medium">m</span>
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Notes <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white resize-none focus:outline-none focus:border-[#8403C5]" />
          </div>

          {/* Transcript link */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1 flex items-center gap-1">
              <Link className="w-3 h-3" /> Transcript link <span className="font-normal normal-case text-[#9CA3AF] ml-1">(optional)</span>
            </label>
            <input type="url" value={transcriptLink} onChange={e => setTranscriptLink(e.target.value)}
              placeholder="Fireflies, Otter, Google Doc…"
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]" />
          </div>

          {/* Divider */}
          <div className="border-t border-[#EBEBF5]" />

          {/* Timer section */}
          <div>
            <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-2">Timer</p>
            <div className="flex items-center gap-2">
              {timerStatus === 'idle' ? (
                <button onClick={handleStartTimer}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#242450] hover:bg-[#1A1A3A] text-white rounded-full transition-all">
                  <Play className="w-3.5 h-3.5" fill="white" /> Start Timer
                </button>
              ) : (
                <>
                  <button onClick={timerStatus === 'running' ? handlePauseTimer : handleResumeTimer}
                    className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-full transition-all ${timerStatus === 'running' ? 'bg-[#FFFBEB] border-2 border-[#E8A020] text-[#A16207]' : 'border-2 border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
                    {timerStatus === 'running' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                    <span className="font-mono">{formatTimer(elapsed)}</span>
                  </button>
                  <button onClick={handleStopTimer}
                    className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-2 border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all">
                    <Square className="w-3.5 h-3.5" /> Stop
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="shrink-0 px-5 py-4 border-t border-[#EBEBF5]">
          {logged ? (
            <div className="w-full py-2.5 text-sm font-semibold text-center text-[#1D9E75] bg-[#E8F7F2] rounded-lg">✓ Logged!</div>
          ) : (
            <button onClick={handleQuickLog} disabled={!isValid || logging}
              className="w-full py-2.5 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white rounded-lg transition-colors">
              {logging ? 'Saving…' : 'Log Entry'}
            </button>
          )}
        </div>
      </div>

      <StopTimerModal open={modalOpen} onClose={() => setModalOpen(false)} onSave={handleModalSave} data={modalData} clients={clients} />
    </>
  );
}