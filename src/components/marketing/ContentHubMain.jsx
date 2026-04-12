import React, { useState } from 'react';
import ContentKanban from './ContentKanban';
import PRCoverageTab from './PRCoverageTab';
import LeadMagnetsTab from './LeadMagnetsTab';

const TABS = ['Content', 'PR Coverage', 'Lead Magnets'];

export default function ContentHubMain() {
  const [tab, setTab] = useState('Content');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 flex items-center gap-1 shrink-0">
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
            {t}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-hidden flex">
        {tab === 'Content' && <ContentKanban />}
        {tab === 'PR Coverage' && <PRCoverageTab />}
        {tab === 'Lead Magnets' && <LeadMagnetsTab />}
      </div>
    </div>
  );
}