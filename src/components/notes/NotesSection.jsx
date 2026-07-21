import React, { useState, useRef, useEffect } from 'react';
import { ArrowLeft, Lock } from 'lucide-react';
import SprintNotes from '@/components/sprints/SprintNotes';
import OneOnOneNotes from '@/components/notes/OneOnOneNotes';

const STORAGE_KEY = 'sprint_notes_pw_hash';

async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
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
        <p className="text-sm text-ew-muted mb-6">Protect Notes with a private password. Only you will know it.</p>
        <form onSubmit={handleSet} className="space-y-3 text-left">
          <div>
            <label className="block text-xs font-medium text-ew-muted mb-1">Password</label>
            <input type="password" className={ic} value={pw} onChange={e => setPw(e.target.value)} placeholder="Enter a password" autoFocus />
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
        <h2 className="text-lg font-bold text-navy dark:text-white mb-1">Notes</h2>
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

export default function NotesSection({ onBack }) {
  const [authState] = useState(() => localStorage.getItem(STORAGE_KEY) ? 'locked' : 'setup');
  const [unlocked, setUnlocked] = useState(false);
  const [setupDone, setSetupDone] = useState(false);
  const [tab, setTab] = useState('sprint');

  if (authState === 'setup' && !setupDone) {
    return <SetPassword onSet={() => { setSetupDone(true); setUnlocked(true); }} />;
  }
  if (authState === 'locked' && !unlocked) {
    return <UnlockScreen onUnlock={() => setUnlocked(true)} onCancel={onBack} />;
  }

  const tabBtn = (id, label) => (
    <button
      onClick={() => setTab(id)}
      className={`px-5 py-2 rounded-lg text-sm font-medium transition-colors ${tab === id ? 'bg-navy text-white dark:bg-[#8403C5]' : 'text-ew-body dark:text-gray-300 hover:bg-ew-bg dark:hover:bg-[#252535]'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="flex-1 bg-ew-bg dark:bg-[#0F0F1A] overflow-y-auto font-dm">
      <div className="sticky top-0 z-10 bg-ew-bg dark:bg-[#0F0F1A] border-b border-ew-border dark:border-[#242450] px-8 pt-6 pb-4">
        <div className="flex items-center gap-4 mb-4">
          <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy dark:hover:text-white transition-colors font-medium">
            <ArrowLeft className="w-4 h-4" /> Back to Dashboard
          </button>
          <div className="w-px h-5 bg-ew-border" />
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#8403C5]" />
            <h1 className="text-xl font-bold text-navy dark:text-white">Notes</h1>
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5] dark:bg-[#3B0764] dark:text-[#D8B4FE]">Private</span>
          </div>
        </div>
        <div className="flex items-center gap-1 bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl p-1 w-fit">
          {tabBtn('sprint', 'Sprint Notes')}
          {tabBtn('1on1', '1:1 Notes')}
        </div>
      </div>
      {tab === 'sprint' ? <SprintNotes /> : <OneOnOneNotes />}
    </div>
  );
}