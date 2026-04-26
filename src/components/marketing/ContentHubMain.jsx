import React, { useState } from 'react';
import ContentKanban from './ContentKanban';
import PRCoverageTab from './PRCoverageTab';
import LeadMagnetsTab from './LeadMagnetsTab';
import { LayoutGrid, CalendarDays } from 'lucide-react';

const TABS = ['Content', 'PR Coverage', 'Lead Magnets'];

function DisabledViewToggle() {
  return (
    <div className="flex items-center gap-0 border border-gray-200 rounded-lg overflow-hidden opacity-40 ml-auto mr-4" title="Only available in Content view">
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white text-gray-400 cursor-not-allowed">
        <LayoutGrid className="w-3.5 h-3.5" /> Board
      </span>
      <span className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200 bg-white text-gray-400 cursor-not-allowed">
        <CalendarDays className="w-3.5 h-3.5" /> Calendar
      </span>
    </div>
  );
}

export default function ContentHubMain() {
  const [tab, setTab] = useState('Content');

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 flex items-center shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>
        {tab !== 'Content' && <DisabledViewToggle />}
      </div>
      <div className="flex-1 overflow-hidden flex">
        {tab === 'Content' && <ContentKanban />}
        {tab === 'PR Coverage' && <PRCoverageTab />}
        {tab === 'Lead Magnets' && <LeadMagnetsTab />}
      </div>
    </div>
  );
}