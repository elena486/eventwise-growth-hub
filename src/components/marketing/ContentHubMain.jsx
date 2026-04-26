import React, { useState } from 'react';
import ContentKanban from './ContentKanban';
import PRCoverageTab from './PRCoverageTab';
import LeadMagnetsTab from './LeadMagnetsTab';
import { LayoutGrid, CalendarDays } from 'lucide-react';

const TABS = ['Content', 'PR Coverage', 'Lead Magnets'];

export default function ContentHubMain() {
  const [tab, setTab] = useState('Content');
  const [calendarView, setCalendarView] = useState(false);

  const isContent = tab === 'Content';

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

        {/* View toggle — active for Content, disabled for others */}
        <div className={`flex items-center gap-0 border rounded-lg overflow-hidden ml-auto ${!isContent ? 'opacity-40' : 'border-gray-200'}`} title={!isContent ? 'Only available in Content view' : ''}>
          <button
            disabled={!isContent}
            onClick={() => setCalendarView(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${isContent && !calendarView ? 'bg-[#8403C5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} ${!isContent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
          <button
            disabled={!isContent}
            onClick={() => setCalendarView(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${isContent && calendarView ? 'bg-[#8403C5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} ${!isContent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {tab === 'Content' && <ContentKanban calendarView={calendarView} onSetCalendarView={setCalendarView} />}
        {tab === 'PR Coverage' && <PRCoverageTab />}
        {tab === 'Lead Magnets' && <LeadMagnetsTab />}
      </div>
    </div>
  );
}