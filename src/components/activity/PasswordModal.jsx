import React, { useState } from 'react';
import { X, Lock } from 'lucide-react';

const CORRECT_PASSWORD = 'EW2026!';

export default function PasswordModal({ onSuccess, onClose }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
      sessionStorage.setItem('hub_insights_unlocked', '1');
      setError(false);
      onSuccess();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[400] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EBEBF5]">
          <div className="flex items-center gap-2">
            <Lock className="w-4 h-4 text-[#5777AB]" />
            <h2 className="text-base font-bold text-[#242450]">Restricted Access</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F6F6FB] text-[#9CA3AF]">
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            placeholder="Password"
            className="w-full px-3 py-2.5 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
            autoFocus
          />
          {error && (
            <p className="text-sm text-[#DC2626] font-medium">Incorrect password</p>
          )}
          <button
            type="submit"
            disabled={!password.trim()}
            className="w-full px-4 py-2.5 text-sm font-semibold bg-[#242450] text-white rounded-lg hover:bg-[#1A1A3A] disabled:opacity-40 transition-colors"
          >
            Enter
          </button>
        </form>
      </div>
    </div>
  );
}