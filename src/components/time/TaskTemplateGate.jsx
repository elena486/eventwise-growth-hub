import React, { useState, useEffect } from 'react';
import { Lock } from 'lucide-react';

const STORAGE_KEY = 'eventwise_template_pw_hash';
const SESSION_KEY = 'eventwise_template_unlocked';

// Simple hash so we're not storing plaintext
async function hashPassword(pw) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(pw));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function TaskTemplateGate({ children }) {
  const [phase, setPhase] = useState('loading'); // 'loading' | 'setup' | 'prompt' | 'unlocked'
  const [pw, setPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    // Already unlocked this session?
    if (sessionStorage.getItem(SESSION_KEY) === '1') { setPhase('unlocked'); return; }
    // Password set?
    const stored = localStorage.getItem(STORAGE_KEY);
    setPhase(stored ? 'prompt' : 'setup');
  }, []);

  const handleSetPassword = async () => {
    if (pw.length < 4) { setError('Password must be at least 4 characters.'); return; }
    if (pw !== confirmPw) { setError('Passwords do not match.'); return; }
    const hash = await hashPassword(pw);
    localStorage.setItem(STORAGE_KEY, hash);
    sessionStorage.setItem(SESSION_KEY, '1');
    setPhase('unlocked');
  };

  const handleUnlock = async () => {
    const stored = localStorage.getItem(STORAGE_KEY);
    const hash = await hashPassword(pw);
    if (hash === stored) {
      sessionStorage.setItem(SESSION_KEY, '1');
      setPhase('unlocked');
      setError('');
    } else {
      setError('Incorrect password.');
      setPw('');
    }
  };

  if (phase === 'loading') return null;
  if (phase === 'unlocked') return children;

  return (
    <div className="flex items-center justify-center h-full min-h-[400px]">
      <div className="bg-white border border-[#EBEBF5] rounded-2xl p-8 w-full max-w-sm shadow-sm">
        <div className="flex items-center justify-center w-12 h-12 bg-[#F3E8FF] rounded-xl mx-auto mb-4">
          <Lock className="w-6 h-6 text-[#8403C5]" />
        </div>

        {phase === 'setup' ? (
          <>
            <h2 className="text-lg font-bold text-[#242450] text-center mb-1">Set a password</h2>
            <p className="text-sm text-[#5777AB] text-center mb-5">Protect this area with a password. Only needs to be set once.</p>
            <div className="space-y-3">
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                placeholder="New password"
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              />
              <input
                type="password"
                value={confirmPw}
                onChange={e => { setConfirmPw(e.target.value); setError(''); }}
                placeholder="Confirm password"
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
                onKeyDown={e => e.key === 'Enter' && handleSetPassword()}
              />
              {error && <p className="text-xs text-[#DC2626]">{error}</p>}
              <button
                onClick={handleSetPassword}
                className="w-full py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Set Password
              </button>
            </div>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-[#242450] text-center mb-1">Restricted Access</h2>
            <p className="text-sm text-[#5777AB] text-center mb-5">Enter your password to manage task templates.</p>
            <div className="space-y-3">
              <input
                type="password"
                value={pw}
                onChange={e => { setPw(e.target.value); setError(''); }}
                placeholder="Password"
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
                onKeyDown={e => e.key === 'Enter' && handleUnlock()}
                autoFocus
              />
              {error && <p className="text-xs text-[#DC2626]">{error}</p>}
              <button
                onClick={handleUnlock}
                className="w-full py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white font-semibold text-sm rounded-lg transition-colors"
              >
                Enter
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}