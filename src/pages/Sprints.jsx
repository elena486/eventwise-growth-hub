import React, { useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import SprintForm from '@/components/sprints/SprintForm';
import SprintDashboard from '@/components/sprints/SprintDashboard';

export default function Sprints() {
  const { user } = useAuth();
  const [view, setView] = useState('form');

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm">
      {/* Sub-nav */}
      <div className="bg-white border-b border-ew-border px-8 py-2 flex items-center gap-2 shrink-0">
        {['form', 'dashboard'].map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg'}`}
          >
            {v === 'form' ? 'My Weekly Update' : 'Team Dashboard'}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto bg-ew-bg">
        {view === 'form' && (
          <div className="p-8">
            <SprintForm currentUser={user} />
          </div>
        )}
        {view === 'dashboard' && <SprintDashboard />}
      </div>
    </div>
  );
}