import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { Clock, Play, Square, X } from 'lucide-react';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
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
  const [running, setRunning] = useState(false);
  const [dbId, setDbId] = useState(null);
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [clients, setClients] = useState([]);
  const startRef = useRef(null);
  const intervalRef = useRef(null);

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

  // Load running timer
  useEffect(() => {
    const init = async () => {
      const lsData = getFromLS();
      const me = await base44.auth.me().catch(() => null);
      if (!me) return;
      const firstName = me.full_name?.split(' ')[0] || '';

      if (lsData && lsData.status === 'running' && lsData.startedAt) {
        const startMs = new Date(lsData.startedAt).getTime();
        const now = Date.now();
        setRunning(true);
        startRef.current = startMs;
        setElapsed(now - startMs);
        setCategory(lsData.category || '');
        setProjectTask(lsData.projectDescription || '');
        setClientId(lsData.clientId || '');
        setClientName(lsData.clientName || '');
        intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
      }

      // Check DB
      const all = await base44.entities.TimeEntry.filter({ teamMember: firstName, timerStatus: 'running' }, '-created_date', 10);
      if (all.length > 0) {
        const record = all[0];
        setDbId(record.id);
        setCategory(record.category || '');
        setProjectTask(record.projectTask || '');
        setClientId(record.clientId || '');
        setClientName(record.clientName || '');
        if (!running) {
          const startMs = new Date(record.timerStartedAt).getTime();
          setRunning(true);
          startRef.current = startMs;
          setElapsed(Date.now() - startMs);
          intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 500);
          saveToLS({
            startedAt: record.timerStartedAt,
            category: record.category || '',
            projectDescription: record.projectTask || '',
            clientId: record.clientId || '',
            clientName: record.clientName || '',
            status: 'running',
          });
        }
      } else if (lsData?.status === 'running') {
        clearLS();
      }
    };
    init();
    return () => clearInterval(intervalRef.current);
  }, []);

  const handleStart = async () => {
    if (!category || !projectTask.trim()) return;
    const me = await base44.auth.me().catch(() => null);
    if (!me) return;
    const firstName = me.full_name?.split(' ')[0] || '';
    const now = new Date().toISOString();

    const record = await base44.entities.TimeEntry.create({
      date: new Date().toISOString().slice(0, 10),
      teamMember: firstName,
      category,
      projectTask: projectTask.trim(),
      durationMinutes: 0,
      timerStatus: 'running',
      timerStartedAt: now,
      ...(clientId ? { clientId, clientName } : {}),
    });

    setDbId(record.id);
    setRunning(true);
    startRef.current = new Date(now).getTime();
    setElapsed(0);
    intervalRef.current = setInterval(() => setElapsed(Date.now() - startRef.current), 500);

    saveToLS({
      startedAt: now,
      category,
      projectDescription: projectTask.trim(),
      clientId,
      clientName,
      status: 'running',
    });
  };

  const handleStopAndLog = async () => {
    clearInterval(intervalRef.current);
    const now = new Date();
    const totalMin = Math.round(elapsed / 60000);

    if (dbId) {
      await base44.entities.TimeEntry.update(dbId, {
        timerStatus: 'stopped',
        timerStoppedAt: now.toISOString(),
        durationMinutes: totalMin,
      }).catch(() => {});
    }

    clearLS();
    setRunning(false);
    setDbId(null);
    setExpanded(false);

    // Pass data up for navigation
    onStopAndLog?.({
      category,
      projectTask,
      clientId,
      clientName,
      durationMinutes: totalMin,
      timerId: dbId,
    });
  };

  const handleDiscard = async () => {
    clearInterval(intervalRef.current);
    if (dbId) {
      await base44.entities.TimeEntry.delete(dbId).catch(() => {});
    }
    clearLS();
    setRunning(false);
    setDbId(null);
    setExpanded(false);
  };

  if (!running && !expanded) {
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

  if (running && !expanded) {
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

  // Expanded panel
  return (
    <div className="fixed bottom-6 right-6 z-50 w-80 bg-white border border-[#EBEBF5] rounded-2xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#242450] text-white">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span className="text-sm font-bold">⏱ Timer</span>
        </div>
        <button onClick={() => running ? null : setExpanded(false)} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Elapsed */}
      <div className="px-4 py-4 text-center border-b border-[#EBEBF5]">
        <span className="text-3xl font-bold text-[#242450] font-mono tracking-wider">
          {formatTime(elapsed)}
        </span>
        {running && (
          <p className="text-xs text-[#A16207] font-semibold mt-1 flex items-center justify-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-[#E8A020] animate-pulse" />
            Running
          </p>
        )}
      </div>

      {/* Form */}
      <div className="px-4 py-3 space-y-3">
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Team member</label>
          <input type="text" value={teamMember} readOnly
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-[#F6F6FB] text-[#5777AB]" />
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Category</label>
          <select value={category} onChange={e => setCategory(e.target.value)} disabled={running}
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white disabled:bg-[#F6F6FB] disabled:text-[#5777AB]">
            <option value="">Select…</option>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
          <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }} disabled={running}
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white disabled:bg-[#F6F6FB]">
            <option value="">None</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.06em] block mb-1">Project / Task</label>
          <input type="text" value={projectTask} onChange={e => setProjectTask(e.target.value)} disabled={running}
            placeholder="What are you working on?"
            className="w-full px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white disabled:bg-[#F6F6FB]" />
        </div>

        {!running ? (
          <button onClick={handleStart}
            disabled={!category || !projectTask.trim()}
            className="w-full py-2.5 bg-[#242450] hover:bg-[#1A1A3A] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
            <Play className="w-4 h-4" fill="white" /> Start Timer
          </button>
        ) : (
          <div className="space-y-2">
            <button onClick={handleStopAndLog}
              className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
              <Square className="w-4 h-4" fill="white" /> Stop &amp; Log
            </button>
            <button onClick={handleDiscard}
              className="w-full py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
              Discard timer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}