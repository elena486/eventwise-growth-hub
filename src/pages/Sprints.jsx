import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { MEMBERS } from '@/lib/sprintConfig';
import SprintForm from '@/components/sprints/SprintForm';
import SprintDashboard from '@/components/sprints/SprintDashboard';

export default function Sprints() {
  const { user } = useAuth();
  const [view, setView] = useState('form'); // 'form' | 'dashboard'

  const isChris = user?.full_name === 'Chris Carter' || user?.email?.includes('chris');

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto font-dm">
      {/* Header */}
      <div className="bg-white border-b border-ew-border px-8 py-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-navy">Sprints</h1>
          <p className="text-xs text-ew-muted mt-0.5">Weekly team updates — submitted every Monday</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setView('form')}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'form' ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg'}`}
          >
            My Update
          </button>
          {isChris && (
            <button
              onClick={() => setView('dashboard')}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${view === 'dashboard' ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg'}`}
            >
              CEO Dashboard
            </button>
          )}
        </div>
      </div>

      <div className="p-8">
        {view === 'form' && <SprintForm user={user} />}
        {view === 'dashboard' && isChris && <SprintDashboard />}
      </div>
    </div>
  );
}