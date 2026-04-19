import React, { useState } from 'react';
import TimeOffTracker from '@/components/hr/TimeOffTracker';
import HRRequestForm from '@/components/hr/HRRequestForm';

const TABS = [
  { id: 'tracker', label: 'Time Off & Sick Days' },
  { id: 'request', label: 'Request Form' },
];

export default function HR() {
  const [tab, setTab] = useState('tracker');
  const [refreshKey, setRefreshKey] = useState(0);

  const handleSubmitted = () => {
    setRefreshKey(k => k + 1);
    setTab('tracker');
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden font-dm">
      {/* Sub-tab bar */}
      <div className="bg-white border-b border-ew-border shrink-0 px-8 flex items-center gap-1 h-10">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-[13px] font-medium transition-all duration-150 shrink-0 relative ${
              tab === t.id ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'
            }`}
          >
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto">
        {tab === 'tracker' && <TimeOffTracker key={refreshKey} />}
        {tab === 'request' && <HRRequestForm onSubmitted={handleSubmitted} />}
      </div>
    </div>
  );
}