import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Play, Pause, ChevronDown, ChevronRight } from 'lucide-react';

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

export default function LogTime({ onLogged }) {
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

  // Timer state
  const [timerOpen, setTimerOpen] = useState(false);
  const [timerRunning, setTimerRunning] = useState(false);
  const [timerCategory, setTimerCategory] = useState('');
  const [timerProject, setTimerProject] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
  }, []);

  // Timer tick
  useEffect(() => {
    if (timerRunning) {
      startTimeRef.current = Date.now() - elapsed;
      intervalRef.current = setInterval(() => {
        setElapsed(Date.now() - startTimeRef.current);
      }, 200);
    } else {
      clearInterval(intervalRef.current);
    }
    return () => clearInterval(intervalRef.current);
  }, [timerRunning]);

  const formatElapsed = (ms) => {
    const totalSec = Math.floor(ms / 1000);
    const h = Math.floor(totalSec / 3600);
    const m = Math.floor((totalSec % 3600) / 60);
    const s = totalSec % 60;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  const stopTimer = () => {
    setTimerRunning(false);
    const totalMin = Math.round(elapsed / 60000);
    const h = Math.floor(totalMin / 60);
    const m = totalMin % 60;
    setHours(String(h));
    setMinutes(String(m));
    if (timerCategory) setCategory(timerCategory);
    if (timerProject) setProjectTask(timerProject);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!teamMember || !category || !projectTask.trim()) return;

    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMin = h * 60 + m;
    if (totalMin <= 0) return;

    setSaving(true);
    try {
      await base44.entities.TimeEntry.create({
        date,
        teamMember,
        category,
        projectTask: projectTask.trim(),
        durationMinutes: totalMin,
        billable,
        notes: notes.trim() || undefined,
      });
      setDate(format(new Date(), 'yyyy-MM-dd'));
      setCategory('');
      setProjectTask('');
      setHours('');
      setMinutes('');
      setBillable(false);
      setNotes('');
      setElapsed(0);
      setTimerRunning(false);
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
      {/* Success toast */}
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

        <button type="submit" disabled={!isValid || saving}
          className="w-full py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white font-semibold text-sm rounded-lg transition-colors">
          {saving ? 'Logging…' : 'Log Time'}
        </button>
      </form>

      {/* Timer section */}
      <div className="mt-6 border-t border-[#EBEBF5] pt-4">
        <button onClick={() => setTimerOpen(o => !o)}
          className="flex items-center gap-1 text-sm text-[#5777AB] hover:text-[#242450] transition-colors font-medium">
          {timerOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          Or use the timer
        </button>

        {timerOpen && (
          <div className="mt-3 space-y-3 bg-white border border-[#EBEBF5] rounded-xl p-4">
            {timerRunning && (
              <div className="px-3 py-2 bg-[#FFFBEB] text-[#A16207] text-xs font-semibold rounded-lg border border-[#E8A020]/30">
                ⏱ Timer is running — do not close this tab or time will be lost
              </div>
            )}

            <div className="text-center">
              <span className="text-3xl font-bold text-[#242450] font-mono tracking-wider">
                {formatElapsed(elapsed)}
              </span>
            </div>

            {!timerRunning ? (
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
                <button onClick={() => { setElapsed(0); setTimerRunning(true); }}
                  className="w-full py-2.5 bg-[#242450] hover:bg-[#1A1A3A] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" fill="white" /> Start Timer
                </button>
              </>
            ) : (
              <button onClick={stopTimer}
                className="w-full py-2.5 bg-[#DC2626] hover:bg-[#B91C1C] text-white font-semibold text-sm rounded-lg transition-colors flex items-center justify-center gap-2">
                <Pause className="w-4 h-4" fill="white" /> Stop & Log
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}