/**
 * NavTimer — nav bar timer widget, reads from shared timer state.
 * All start/pause/stop goes through sharedTimer* actions so it stays
 * in sync with LogTime (Today tab) and LogTimeSidebar.
 */
import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Play, Square, Pause } from 'lucide-react';
import TaskPresetSelect from './TaskPresetSelect';
import {
  useSharedTimer, sharedTimerStart, sharedTimerPause, sharedTimerResume,
  sharedTimerStop, sharedTimerCommit, sharedTimerBootstrap, sharedTimerUpdateMeta
} from '@/hooks/useSharedTimer';

function formatDuration(minutes) {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (h === 0 && m === 0) return '0m';
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}

async function writeLeadActivityLog({ leadId, teamMember, category, projectTask, durationMinutes }) {
  if (!leadId) return;
  try {
    const lead = await base44.entities.Lead.get(leadId);
    if (!lead) return;
    const log = (() => { try { return JSON.parse(lead.activityLog || '[]'); } catch { return []; } })();
    const now = new Date().toISOString();
    log.unshift({ id: Date.now(), type: 'Time logged', createdAt: now, addedBy: teamMember, category, duration: formatDuration(durationMinutes), description: projectTask, summary: '', transcriptLink: '', transcriptFileUrl: '', transcriptFileName: '' });
    await base44.entities.Lead.update(leadId, { activityLog: JSON.stringify(log), lastActivity: now });
  } catch {}
}

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];

function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600); const m = Math.floor((sec % 3600) / 60); const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function NavTimer({ onStopAndLog, onLogTime }) {
  const [open, setOpen] = useState(false);
  const timer = useSharedTimer();

  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState(timer.category || '');
  const [projectTask, setProjectTask] = useState(timer.projectTask || '');
  const [clientId, setClientId] = useState(timer.clientId || '');
  const [clientName, setClientName] = useState(timer.clientName || '');
  const [leadId, setLeadId] = useState(timer.leadId || '');
  const [leadName, setLeadName] = useState(timer.leadName || '');
  const [clients, setClients] = useState([]);
  const panelRef = useRef(null);
  const userIdRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) {
          setTeamMember(first);
          userIdRef.current = me.id;
          sharedTimerBootstrap(first, me.id);
        }
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});
  }, []);

  // Sync local fields from shared state when timer is active
  useEffect(() => {
    if (timer.timerId) {
      setCategory(timer.category || '');
      setProjectTask(timer.projectTask || '');
      setClientId(timer.clientId || '');
      setClientName(timer.clientName || '');
      setLeadId(timer.leadId || '');
      setLeadName(timer.leadName || '');
    }
  }, [timer.timerId, timer.category, timer.projectTask, timer.leadId]);

  const setAndSyncCategory = (v) => { setCategory(v); setProjectTask(''); if (timer.timerId) sharedTimerUpdateMeta({ category: v }); };
  const setAndSyncTask = (v) => { setProjectTask(v); if (timer.timerId) sharedTimerUpdateMeta({ projectTask: v }); };
  const setAndSyncClient = (v, name) => { setClientId(v); setClientName(name); if (timer.timerId) sharedTimerUpdateMeta({ clientId: v, clientName: name }); };

  // Debounced DB sync when fields change
  useEffect(() => {
    if (!timer.timerId || timer.status === 'idle') return;
    const t = setTimeout(async () => {
      try {
        await base44.entities.TimeEntry.update(timer.timerId, {
          category: category || '',
          projectTask: projectTask.trim() || '(Untitled session)',
          ...(clientId ? { clientId, clientName } : { clientId: '', clientName: '' }),
        });
      } catch {}
    }, 600);
    return () => clearTimeout(t);
  }, [category, projectTask, clientId, clientName, timer.timerId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleStart = async () => {
    await sharedTimerStart({ teamMember, category, projectTask, clientId, clientName, userId: userIdRef.current });
  };

  const handleStopAndLog = async () => {
    const result = await sharedTimerStop();
    // Auto-commit if fields are filled, otherwise navigate so the Today tab shows inline validation
    if (result.category && result.projectTask) {
      await sharedTimerCommit(result.timerId, {
        category: result.category, projectTask: result.projectTask,
        clientId: result.clientId || '', clientName: result.clientName || '',
        leadId: result.leadId || '', leadName: result.leadName || '',
        date: new Date().toISOString().slice(0, 10),
        durationMinutes: result.durationMinutes,
        notes: '', transcriptLink: '',
      }, teamMember);
      // Write to lead activity log if a sales prospect was linked
      if (result.leadId) {
        writeLeadActivityLog({ leadId: result.leadId, teamMember, category: result.category, projectTask: result.projectTask, durationMinutes: result.durationMinutes });
      }
    }
    setOpen(false);
    onStopAndLog?.();
  };

  const handleDiscard = async () => {
    if (!timer.timerId) return;
    const tid = timer.timerId;
    await sharedTimerStop(); // resets shared state
    await base44.entities.TimeEntry.delete(tid).catch(() => {});
    setOpen(false);
  };

  return (
    <div className="relative">
      <button
        onClick={() => timer.status === 'idle' ? onLogTime?.() : setOpen(o => !o)}
        onContextMenu={(e) => { e.preventDefault(); setOpen(o => !o); }}
        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg transition-all ${
          timer.status === 'running' ? 'text-[#E8A020] hover:bg-white/10'
          : timer.status === 'paused' ? 'text-[#8B8FA8] hover:bg-white/10'
          : 'text-[#8B8FA8] hover:text-[#C4C6D4] hover:bg-white/5'
        }`}
        title="Timer"
      >
        <div className="relative">
          <Clock className="w-4 h-4" />
          {timer.status === 'running' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#E8A020] animate-pulse" />}
          {timer.status === 'paused' && <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-[#9CA3AF]" />}
        </div>
        {timer.status !== 'idle' && (
          <span className={`font-mono text-xs font-bold tracking-wider ${timer.status === 'running' ? 'text-[#E8A020]' : 'text-[#8B8FA8]'}`}>
            {formatTime(timer.elapsed)}
          </span>
        )}
      </button>

      {open && (
        <div ref={panelRef} className="absolute top-full right-0 mt-2 w-72 bg-white border border-[#EBEBF5] rounded-xl shadow-2xl overflow-hidden z-50">
          <div className="flex items-center justify-between px-4 py-2.5 bg-[#242450] text-white">
            <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" />
              <span className="text-sm font-bold">Timer</span>
            </div>
            {timer.status !== 'idle' && (
              <span className={`font-mono text-sm font-bold tracking-wider ${timer.status === 'running' ? 'text-[#E8A020]' : 'text-[#9CA3AF]'}`}>
                {formatTime(timer.elapsed)}
              </span>
            )}
          </div>

          <div className="px-4 py-3 space-y-2.5">
            <div>
              <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Category</label>
              <select value={category} onChange={e => setAndSyncCategory(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white text-[#242450]">
                <option value="">Select…</option>
                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Project / Task</label>
              <TaskPresetSelect
                category={category}
                value={projectTask}
                onChange={setAndSyncTask}
                placeholder="What are you working on?"
                className="w-full px-2.5 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
              <select value={clientId} onChange={e => { const c = clients.find(cl => cl.id === e.target.value); setAndSyncClient(e.target.value, c?.name || ''); }}
                className="w-full px-2.5 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white text-[#242450]">
                <option value="">None</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>

            {timer.status === 'idle' && (
              <button onClick={handleStart}
                className="w-full py-2 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                <Play className="w-4 h-4" fill="white" /> Start Timer
              </button>
            )}
            {timer.status === 'running' && (
              <div className="flex gap-2">
                <button onClick={sharedTimerPause}
                  className="flex-1 py-2 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5">
                  <Pause className="w-3.5 h-3.5" /> Pause
                </button>
                <button onClick={handleStopAndLog}
                  className="flex-1 py-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5">
                  <Square className="w-3.5 h-3.5" fill="white" /> Stop &amp; Log
                </button>
              </div>
            )}
            {timer.status === 'paused' && (
              <div className="flex gap-2">
                <button onClick={sharedTimerResume}
                  className="flex-1 py-2 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5">
                  <Play className="w-3.5 h-3.5" fill="white" /> Resume
                </button>
                <button onClick={handleStopAndLog}
                  className="flex-1 py-2 bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F6F6FB] font-semibold text-sm rounded-lg flex items-center justify-center gap-1.5">
                  <Square className="w-3.5 h-3.5" /> Stop &amp; Log
                </button>
              </div>
            )}
            {timer.status !== 'idle' && (
              <button onClick={handleDiscard}
                className="w-full py-1 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
                Discard timer
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}