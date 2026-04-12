import React, { useState } from 'react';
import MarketingReporting from '@/components/marketing/MarketingReporting';
import ContentHubMain from '@/components/marketing/ContentHubMain';

const TABS = [
  { id: 'reporting', label: 'Reporting' },
  { id: 'content', label: 'Content Hub' },
];

export default function Marketing() {
  const [tab, setTab] = useState('reporting');

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm">
      <div className="bg-white border-b border-gray-200 px-6 py-0 flex items-center gap-1 shrink-0">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex">
        {tab === 'reporting' && <MarketingReporting />}
        {tab === 'content' && <ContentHubMain />}
      </div>
    </div>
  );
}