import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Play, Square, Pause, Clock } from 'lucide-react';
import TranscriptField from './TranscriptField';
import LeadSelect from './LeadSelect';
import TaskPresetSelect from './TaskPresetSelect';
import { CATEGORY_LABELS } from './categoryColors';
import { logActivity } from '@/lib/logActivity';
import {
  useSharedTimer, sharedTimerStart, sharedTimerPause, sharedTimerResume,
  sharedTimerStop, sharedTimerCommit, sharedTimerBootstrap, sharedTimerUpdateMeta
} from '@/hooks/useSharedTimer';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];

function formatTimer(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

async function writeLeadActivityLog({ leadId, leadName, teamMember, category, projectTask, durationMinutes }) {
  if (!leadId) return;
  try {
    const lead = await base44.entities.Lead.get(leadId);
    if (!lead) return;
    const log = (() => { try { return JSON.parse(lead.activityLog || '[]'); } catch { return []; } })();
    const durStr = formatDuration(durationMinutes);
    log.push({ date: new Date().toISOString(), type: 'Time logged', label: `Time logged: ${durStr} — ${category}`, category, duration: durStr, description: projectTask, teamMember });
    await base44.entities.Lead.update(leadId, { activityLog: JSON.stringify(log) });
  } catch {}
}

async function writeClientActivityLog({ clientId, clientName, teamMember, category, projectTask, durationMinutes, notes, transcriptLink }) {
  if (!clientId) return;
  try {
    const client = await base44.entities.Client.get(clientId);
    if (!client) return;
    const log = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
    const durStr = formatDuration(durationMinutes);
    log.push({ date: new Date().toISOString(), type: 'Time logged', label: `Time logged: ${durStr} — ${category}`, category, duration: durStr, description: projectTask, teamMember, notes: notes || '', transcriptLink: transcriptLink || '' });
    await base44.entities.Client.update(clientId, { activityLog: JSON.stringify(log) });
  } catch {}
}

export default function LogTimeSidebar({ triggerOpen, onTriggerConsumed }) {
  const [open, setOpen] = useState(false);
  const timer = useSharedTimer();

  useEffect(() => {
    if (triggerOpen) { setOpen(true); onTriggerConsumed?.(); }
  }, [triggerOpen]);

  // Local form fields — mirror shared timer meta when a timer is active
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [notes, setNotes] = useState('');
  const [transcriptLink, setTranscriptLink] = useState('');
  const [transcriptFileUrl, setTranscriptFileUrl] = useState('');
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const [clients, setClients] = useState([]);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  // Inline stop validation
  const [stoppedEntry, setStoppedEntry] = useState(null);
  const [saveError, setSaveError] = useState('');

  const userIdRef = useRef(null);

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
  }, []);

  // Sync from shared state when timer is active
  const prevTimerIdRef = useRef(null);
  useEffect(() => {
    if (timer.timerId && timer.timerId !== prevTimerIdRef.current) {
      setCategory(timer.category || '');
      setProjectTask(timer.projectTask || '');
      setClientId(timer.clientId || '');
      setClientName(timer.clientName || '');
      setLeadId(timer.leadId || '');
      setLeadName(timer.leadName || '');
    }
    prevTimerIdRef.current = timer.timerId;
  }, [timer.timerId, timer.category, timer.projectTask]);

  // Setters that also update shared state when timer is active
  const setAndSyncCategory = (v) => { setCategory(v); setProjectTask(''); if (timer.timerId) sharedTimerUpdateMeta({ category: v }); };
  const setAndSyncTask = (v) => { setProjectTask(v); if (timer.timerId) sharedTimerUpdateMeta({ projectTask: v }); };
  const setAndSyncClient = (v, name) => { setClientId(v); setClientName(name); if (v) { setLeadId(''); setLeadName(''); } if (timer.timerId) sharedTimerUpdateMeta({ clientId: v, clientName: name }); };
  const setAndSyncLead = (v, name) => { setLeadId(v); setLeadName(name); if (v) { setClientId(''); setClientName(''); } if (timer.timerId) sharedTimerUpdateMeta({ leadId: v, leadName: name }); };

  // Debounced DB sync
  useEffect(() => {
    if (!timer.timerId || timer.status === 'idle') return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(timer.timerId, {
          category: category || '',
          projectTask: projectTask.trim() || '(Untitled session)',
          ...(clientId ? { clientId, clientName } : { clientId: '', clientName: '' }),
          ...(leadId ? { leadId, leadName } : { leadId: '', leadName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [category, projectTask, clientId, clientName, timer.timerId]);

  const handleStartTimer = async () => {
    if (timer.timerId) return;
    setStoppedEntry(null); setSaveError('');
    await sharedTimerStart({ teamMember, category, projectTask, clientId, clientName, userId: userIdRef.current });
    logActivity({ teamMember, actionType: 'Started a timer', section: 'Time & Capacity', recordName: projectTask.trim() || '(Untitled session)' });
  };

  const handleStopTimer = async () => {
    const result = await sharedTimerStop();
    const cat = category;
    const task = projectTask.trim();
    if (!cat || !task) {
      setStoppedEntry({ ...result, category: cat, projectTask: task });
      setSaveError('Category and Task are required before saving.');
      return;
    }
    await finalizeSave(result.timerId, result.durationMinutes, cat, task);
  };

  const finalizeSave = async (timerId, durationMinutes, cat, task) => {
    await sharedTimerCommit(timerId, {
      category: cat, projectTask: task, clientId, clientName, leadId, leadName,
      date: format(new Date(), 'yyyy-MM-dd'), durationMinutes, notes: notes.trim(),
      transcriptLink: transcriptLink.trim(), transcriptFileUrl, transcriptFileName,
    }, teamMember);
    await writeClientActivityLog({ clientId, clientName, teamMember, category: cat, projectTask: task, durationMinutes, notes: notes.trim(), transcriptLink: transcriptLink.trim() });
    if (leadId) { writeLeadActivityLog({ leadId, leadName, teamMember, category: cat, projectTask: task, durationMinutes }); }
    logActivity({ teamMember, actionType: 'Logged a time entry via sidebar', section: 'Time & Capacity', recordName: task });
    setStoppedEntry(null); setSaveError('');
    setCategory(''); setProjectTask(''); setClientId(''); setClientName(''); setLeadId(''); setLeadName(''); setNotes('');
    setTranscriptLink(''); setTranscriptFileUrl(''); setTranscriptFileName('');
    setLogged(true); setTimeout(() => setLogged(false), 2000);
  };

  const handleSaveStopped = async () => {
    if (!stoppedEntry) return;
    const cat = category;
    const task = projectTask.trim();
    if (!cat || !task) { setSaveError('Category and Task are required before saving.'); return; }
    await finalizeSave(stoppedEntry.timerId, stoppedEntry.durationMinutes, cat, task);
  };

  const startEndDuration = (() => {
    if (!startTime || !endTime) return 0;
    try {
      const [sh, sm] = startTime.split(':').map(Number);
      const [eh, em] = endTime.split(':').map(Number);
      return Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
    } catch { return 0; }
  })();

  const handleQuickLog = async () => {
    const totalMin = startEndDuration;
    if (!projectTask.trim() || totalMin <= 0) return;
    const today = format(new Date(), 'yyyy-MM-dd');
    const startISO = startTime ? `${today}T${startTime}:00` : undefined;
    const endISO = endTime ? `${today}T${endTime}:00` : undefined;
    setLogging(true);
    try {
      await base44.entities.TimeEntry.create({
        date: today, teamMember, category: category || 'Other',
        projectTask: projectTask.trim(), durationMinutes: totalMin, timerStatus: 'logged',
        notes: notes.trim() || undefined, transcriptLink: transcriptLink.trim() || undefined,
        transcriptFileUrl: transcriptFileUrl || undefined, transcriptFileName: transcriptFileName || undefined,
        ...(startISO ? { timerStartedAt: startISO } : {}),
        ...(endISO ? { timerStoppedAt: endISO } : {}),
        ...(clientId ? { clientId, clientName } : {}),
        ...(leadId ? { leadId, leadName } : {}),
      });
      await writeClientActivityLog({ clientId, clientName, teamMember, category: category || 'Other', projectTask: projectTask.trim(), durationMinutes: totalMin, notes: notes.trim(), transcriptLink: transcriptLink.trim() });
      if (leadId) { writeLeadActivityLog({ leadId, leadName, teamMember, category: category || 'Other', projectTask: projectTask.trim(), durationMinutes: totalMin }); }
      logActivity({ teamMember, actionType: 'Logged a time entry via sidebar', section: 'Time & Capacity', recordName: projectTask.trim(), details: `${category || 'Other'} — ${formatDuration(totalMin)}` });
      setProjectTask(''); setStartTime(''); setEndTime(''); setNotes(''); setTranscriptLink(''); setTranscriptFileUrl(''); setTranscriptFileName(''); setCategory(''); setClientId(''); setClientName(''); setLeadId(''); setLeadName('');
      setLogged(true); setTimeout(() => setLogged(false), 2000);
    } catch {}
    setLogging(false);
  };

  const isValid = projectTask.trim() && startEndDuration > 0;
  const isStopped = !!stoppedEntry;
  const missingCat = isStopped && !category;
  const missingTask = isStopped && !projectTask.trim();

  return (
    <>
      {open && <div className="fixed inset-0 z-40 bg-black/20" onClick={() => setOpen(false)} />}
      <div className={`fixed top-0 right-0 h-full w-[360px] bg-white border-l border-[#EBEBF5] z-50 flex flex-col transition-transform duration-300 ${open ? 'translate-x-0' : 'translate-x-full'}`}>
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-5 py-4 border-b border-[#EBEBF5] bg-[#242450]">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-white/70" />
            <h2 className="text-sm font-bold text-white">Log Time</h2>
            {timer.status !== 'idle' && (
              <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full ${timer.status === 'running' ? 'bg-[#E8A020]/20 text-[#E8A020]' : 'bg-white/10 text-white/60'}`}>
                {formatTimer(timer.elapsed)}
              </span>
            )}
          </div>
          <button onClick={() => setOpen(false)} className="p-1.5 rounded-lg hover:bg-white/10">
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
            <select value={category} onChange={e => setAndSyncCategory(e.target.value)}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:border-[#8403C5] ${missingCat ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}>
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
              onChange={setAndSyncTask}
              placeholder="Select a task…"
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:border-[#8403C5] ${missingTask ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}
            />
          </div>

          {/* Client */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <select value={clientId} onChange={e => { const c = clients.find(cl => cl.id === e.target.value); setAndSyncClient(e.target.value, c?.name || ''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          {/* Sales Company (Prospect) */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Sales Company <span className="font-normal normal-case text-[#9CA3AF]">(optional — prospect)</span></label>
            <LeadSelect
              value={leadId}
              onChange={setAndSyncLead}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none"
            />
          </div>

          {/* Time — only for manual log (not timer) */}
          {timer.status === 'idle' && !isStopped && (
            <div>
              <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Time</label>
              <div className="flex items-center gap-2">
                <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                  className="flex-1 px-2 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]" />
                <span className="text-xs text-[#5777AB]">→</span>
                <input type="time" value={endTime} onChange={e => setEndTime(e.target.value)}
                  className="flex-1 px-2 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5]" />
              </div>
              {startEndDuration > 0 && (
                <p className="text-[11px] text-[#1D9E75] font-semibold mt-1">Duration: {formatDuration(startEndDuration)}</p>
              )}
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Notes <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white resize-none focus:outline-none focus:border-[#8403C5]" />
          </div>

          {/* Transcript */}
          <TranscriptField
            transcriptLink={transcriptLink}
            onTranscriptLinkChange={setTranscriptLink}
            transcriptFileUrl={transcriptFileUrl}
            transcriptFileName={transcriptFileName}
            onTranscriptFileChange={({ url, name }) => { setTranscriptFileUrl(url); setTranscriptFileName(name); }}
          />

          {/* Divider */}
          <div className="border-t border-[#EBEBF5]" />

          {/* Timer section */}
          <div>
            <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-2">Timer</p>
            {isStopped ? (
              <div className="space-y-2">
                <p className="text-sm text-[#242450]">Timer stopped — <span className="font-bold">{formatDuration(stoppedEntry.durationMinutes)}</span> recorded.</p>
                {saveError && <p className="text-xs font-semibold text-[#DC2626]">{saveError}</p>}
                <button onClick={handleSaveStopped} disabled={!category || !projectTask.trim()}
                  className="w-full py-2 text-sm font-semibold bg-[#1D9E75] hover:bg-[#17856A] text-white disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] rounded-lg transition-colors">
                  Save Entry
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                {timer.status === 'idle' ? (
                  <button onClick={handleStartTimer}
                    className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#242450] hover:bg-[#1A1A3A] text-white rounded-full transition-all">
                    <Play className="w-3.5 h-3.5" fill="white" /> Start Timer
                  </button>
                ) : (
                  <>
                    <button onClick={timer.status === 'running' ? sharedTimerPause : sharedTimerResume}
                      className={`flex items-center gap-1.5 px-3 py-2 text-sm font-bold rounded-full transition-all ${timer.status === 'running' ? 'bg-[#FFFBEB] border-2 border-[#E8A020] text-[#A16207]' : 'border-2 border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
                      {timer.status === 'running' ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3" />}
                      <span className="font-mono">{formatTimer(timer.elapsed)}</span>
                    </button>
                    <button onClick={handleStopTimer}
                      className="flex items-center gap-1 px-3 py-2 text-sm font-semibold border-2 border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-all">
                      <Square className="w-3.5 h-3.5" /> Stop
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Footer — only for manual log */}
        {timer.status === 'idle' && !isStopped && (
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
        )}
      </div>
    </>
  );
}