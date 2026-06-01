import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { ArrowLeft, Plus, Trash2, Lock, ChevronDown, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

const PEOPLE = [
  { id: 'sreeja', name: 'Sreeja', role: 'QA' },
  { id: 'george', name: 'George', role: 'SDR' },
  { id: 'martinique', name: 'Martinique', role: 'Customer Success' },
];

const RAG_OPTIONS = [
  { value: 'green', label: '🟢 Green', cls: 'bg-[#DCFCE7] text-[#15803D]' },
  { value: 'amber', label: '🟡 Amber', cls: 'bg-[#FEF9C3] text-[#A16207]' },
  { value: 'red', label: '🔴 Red', cls: 'bg-[#FEE2E2] text-[#B91C1C]' },
];

const STORAGE_KEY = 'sprint_notes_pw_hash';

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function currentMonthYear() {
  return format(new Date(), 'MMMM yyyy');
}

function monthSortKey(str) {
  try {
    const parts = str.split(' ');
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
    const m = months.indexOf(parts[0]);
    const y = parseInt(parts[1]);
    return y * 100 + m;
  } catch { return 0; }
}

function SetPassword({ onSet }) {
  const [pw, setPw] = useState('');
  const [confirm, setConfirm] = useState('');
  const [err, setErr] = useState('');

  const handleSet = async (e) => {
    e.preventDefault();
    if (pw.length < 4) { setErr('Password must be at least 4 characters.'); return; }
    if (pw !== confirm) { setErr('Passwords do not match.'); return; }
    const hash = await hashPassword(pw);
    localStorage.setItem(STORAGE_KEY, hash);
    onSet();
  };

  const ic = 'w-full border border-ew-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 bg-[#F3E8FF] rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#8403C5]" />
        </div>
        <h2 className="text-lg font-bold text-navy dark:text-white mb-1">Set a password</h2>
        <p className="text-sm text-ew-muted mb-6">Protect Sprint Notes with a private password. Only you will know it.</p>
        <form onSubmit={handleSet} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-medium text-ew-muted mb-1">Password</label>
            <input type="password" className={ic} value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter a password" />
          </div>
          <div>
            <label className="block text-xs font-medium text-ew-muted mb-1">Confirm password</label>
            <input type="password" className={ic} value={confirm} onChange={e => setConfirm(e.target.value)} placeholder="Confirm your password" />
          </div>
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button type="submit" className="w-full py-2.5 bg-[#8403C5] text-white font-semibold rounded-lg hover:bg-[#7002A8] transition-colors text-sm mt-2">
            Set Password &amp; Unlock
          </button>
        </form>
      </div>
    </div>
  );
}

function UnlockScreen({ onUnlock, onCancel }) {
  const [pw, setPw] = useState('');
  const [err, setErr] = useState('');
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    const hash = await hashPassword(pw);
    if (hash === localStorage.getItem(STORAGE_KEY)) {
      onUnlock();
    } else {
      setErr('Incorrect password — try again.');
      setPw('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl shadow-2xl w-full max-w-sm p-8 text-center">
        <div className="w-12 h-12 bg-[#F3E8FF] rounded-full flex items-center justify-center mx-auto mb-4">
          <Lock className="w-5 h-5 text-[#8403C5]" />
        </div>
        <h2 className="text-lg font-bold text-navy dark:text-white mb-1">Sprint Notes</h2>
        <p className="text-sm text-ew-muted mb-6">Enter your password to unlock this section.</p>
        <form onSubmit={handleUnlock} className="space-y-3">
          <input
            ref={inputRef}
            type="password"
            className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white"
            value={pw}
            onChange={e => { setPw(e.target.value); setErr(''); }}
            placeholder="Password"
          />
          {err && <p className="text-xs text-red-500">{err}</p>}
          <button type="submit" className="w-full py-2.5 bg-[#8403C5] text-white font-semibold rounded-lg hover:bg-[#7002A8] transition-colors text-sm">
            Unlock
          </button>
          <button type="button" onClick={onCancel} className="w-full py-2 text-sm text-ew-muted hover:text-navy dark:hover:text-white transition-colors">
            Cancel
          </button>
        </form>
      </div>
    </div>
  );
}

function NoteEntry({ note, isFirst, onUpdate, onDelete }) {
  const [open, setOpen] = useState(isFirst);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const rag = RAG_OPTIONS.find(r => r.value === note.rag);

  const ta = 'w-full border border-ew-border rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600';
  const inp = 'border border-ew-border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600';
  const lc = 'block text-xs font-medium text-ew-muted dark:text-gray-400 mb-1';

  return (
    <div className="bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-ew-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ew-muted shrink-0" />}
        <span className="font-bold text-navy dark:text-white text-sm">{note.monthYear}</span>
        {note.meetingDate && <span className="text-xs text-ew-muted">{format(new Date(note.meetingDate), 'd MMM yyyy')}</span>}
        {rag && <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ml-1 ${rag.cls}`}>{rag.label}</span>}
        <button
          onClick={e => { e.stopPropagation(); setDeleteConfirm(true); }}
          className="ml-auto p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors shrink-0"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-ew-border dark:border-gray-700 space-y-4 pt-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lc}>Month / Year</label>
              <input className={`${inp} w-full`} value={note.monthYear || ''} placeholder="e.g. May 2026" onChange={e => onUpdate({ monthYear: e.target.value })} />
            </div>
            <div>
              <label className={lc}>Date of meeting</label>
              <input type="date" className={inp} value={note.meetingDate || ''} onChange={e => onUpdate({ meetingDate: e.target.value })} />
            </div>
            <div>
              <label className={lc}>Overall RAG</label>
              <select className={`${inp} w-full`} value={note.rag || ''} onChange={e => onUpdate({ rag: e.target.value })}>
                <option value="">Select…</option>
                {RAG_OPTIONS.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={lc}>What went well</label>
            <textarea className={`${ta} h-20`} value={note.wentWell || ''} placeholder="What went well this month…" onChange={e => onUpdate({ wentWell: e.target.value })} />
          </div>
          <div>
            <label className={lc}>Areas to improve</label>
            <textarea className={`${ta} h-20`} value={note.toImprove || ''} placeholder="What could be better…" onChange={e => onUpdate({ toImprove: e.target.value })} />
          </div>
          <div>
            <label className={lc}>Actions agreed</label>
            <textarea className={`${ta} h-24`} value={note.actionsAgreed || ''} placeholder="• Action items agreed in meeting…" onChange={e => onUpdate({ actionsAgreed: e.target.value })} />
          </div>
          <div className="border border-[#F3E8FF] dark:border-[#3B0764] rounded-xl p-4 bg-[#FAFAFE] dark:bg-[#1a1020]">
            <label className="flex items-center gap-1.5 text-xs font-medium text-[#8403C5] dark:text-[#c060e8] mb-1.5">
              <Lock className="w-3 h-3" /> Private notes — for Elena only
            </label>
            <textarea className={`${ta} h-20 border-[#E9D5FF] dark:border-[#4c1d95] focus:ring-[#8403C5]/30`} value={note.privateNotes || ''} placeholder="Private thoughts, context, things not shared with team member…" onChange={e => onUpdate({ privateNotes: e.target.value })} />
          </div>
          <div>
            <label className={lc}>Follow-up date (optional)</label>
            <input type="date" className={inp} value={note.followUpDate || ''} onChange={e => onUpdate({ followUpDate: e.target.value })} />
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#1E1E2E] rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy dark:text-white mb-2">Delete entry?</h3>
            <p className="text-sm text-ew-body dark:text-gray-300 mb-5">This will permanently delete the <strong>{note.monthYear}</strong> entry. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
              <button onClick={() => { onDelete(); setDeleteConfirm(false); }} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PersonTab({ personId }) {
  const [notes, setNotes] = useState([]);
  const [loading, setLoading] = useState(true);
  const saveTimers = useRef({});

  const load = useCallback(async () => {
    const data = await base44.entities.SprintNote.filter({ person: personId });
    data.sort((a, b) => monthSortKey(b.monthYear) - monthSortKey(a.monthYear));
    setNotes(data);
    setLoading(false);
  }, [personId]);

  useEffect(() => { load(); }, [load]);

  const handleAdd = async () => {
    const created = await base44.entities.SprintNote.create({ person: personId, monthYear: currentMonthYear() });
    setNotes(prev => [created, ...prev]);
  };

  const handleUpdate = (noteId, fields) => {
    setNotes(prev => prev.map(n => n.id === noteId ? { ...n, ...fields } : n));
    clearTimeout(saveTimers.current[noteId]);
    saveTimers.current[noteId] = setTimeout(() => {
      base44.entities.SprintNote.update(noteId, fields);
    }, 800);
  };

  const handleDelete = async (noteId) => {
    await base44.entities.SprintNote.delete(noteId);
    setNotes(prev => prev.filter(n => n.id !== noteId));
  };

  if (loading) return (
    <div className="flex items-center justify-center h-40">
      <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-ew-muted dark:text-gray-400">{notes.length} entr{notes.length === 1 ? 'y' : 'ies'}</p>
        <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors">
          <Plus className="w-4 h-4" /> New entry
        </button>
      </div>
      {notes.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-16">
          <p className="text-navy dark:text-white font-semibold mb-1">No entries yet</p>
          <p className="text-ew-muted text-sm mb-4">Start by adding your first sprint review note.</p>
          <button onClick={handleAdd} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors">
            <Plus className="w-4 h-4" /> New entry
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {notes.map((note, i) => (
            <NoteEntry
              key={note.id}
              note={note}
              isFirst={i === 0}
              onUpdate={(fields) => handleUpdate(note.id, fields)}
              onDelete={() => handleDelete(note.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SprintNotes({ onBack }) {
  const [authState] = useState(() => localStorage.getItem(STORAGE_KEY) ? 'locked' : 'setup');
  const [unlocked, setUnlocked] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [activePerson, setActivePerson] = useState('sreeja');

  const showSetup = authState === 'setup' && !setupDone;
  const showLock = authState === 'locked' && !unlocked;

  if (showSetup) {
    return <SetPassword onSet={() => { setSetupDone(true); setUnlocked(true); }} />;
  }

  if (showLock) {
    return <UnlockScreen onUnlock={() => setUnlocked(true)} onCancel={onBack} />;
  }

  return (
    <div className="flex-1 bg-ew-bg dark:bg-[#0F0F1A] overflow-y-auto p-8 font-dm">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy dark:hover:text-white transition-colors font-medium">
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <div className="w-px h-5 bg-ew-border" />
        <div className="flex items-center gap-2">
          <Lock className="w-4 h-4 text-[#8403C5]" />
          <h1 className="text-xl font-bold text-navy dark:text-white">Sprint Notes</h1>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5] dark:bg-[#3B0764] dark:text-[#D8B4FE]">Private</span>
        </div>
      </div>

      <div className="flex items-center gap-1 bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl p-1 mb-6 w-fit">
        {PEOPLE.map(p => (
          <button key={p.id} onClick={() => setActivePerson(p.id)}
            className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${activePerson === p.id ? 'bg-navy text-white dark:bg-[#8403C5]' : 'text-ew-body dark:text-gray-300 hover:bg-ew-bg dark:hover:bg-[#252535]'}`}>
            {p.name}
            <span className={`ml-1.5 text-xs ${activePerson === p.id ? 'text-white/60' : 'text-ew-muted'}`}>{p.role}</span>
          </button>
        ))}
      </div>

      <PersonTab key={activePerson} personId={activePerson} />
    </div>
  );
}