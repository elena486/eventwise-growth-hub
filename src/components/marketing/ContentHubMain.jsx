import React, { useState, useEffect } from 'react';
import ContentKanban from './ContentKanban';
import ContentAnalytics from './ContentAnalytics';
import PRCoverageTab from './PRCoverageTab';
import LeadMagnetsTab from './LeadMagnetsTab';
import { LayoutGrid, CalendarDays, TrendingUp } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const TABS = ['Content', 'PR Coverage', 'Lead Magnets'];

export default function ContentHubMain() {
  const [tab, setTab] = useState('Content');
  const [calendarView, setCalendarView] = useState(false);
  const [analyticsView, setAnalyticsView] = useState(false);
  const [items, setItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);

  const isContent = tab === 'Content';

  useEffect(() => {
    if (isContent) {
      base44.entities.ContentItem.list('-publishDate', 300).then(setItems);
    }
  }, [isContent]);

  const handleOpenItem = (item) => {
    setAnalyticsView(false);
    setSelectedItem(item);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden">
      <div className="bg-white border-b border-gray-200 px-6 flex items-center shrink-0">
        <div className="flex items-center gap-1">
          {TABS.map(t => (
            <button key={t} onClick={() => { setTab(t); setAnalyticsView(false); }}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${tab === t ? 'border-[#8403C5] text-[#8403C5]' : 'border-transparent text-gray-500 hover:text-gray-800'}`}>
              {t}
            </button>
          ))}
        </div>

        {/* View toggle — active for Content tab only */}
        <div className={`flex items-center gap-0 border rounded-lg overflow-hidden ml-auto ${!isContent ? 'opacity-40' : 'border-gray-200'}`} title={!isContent ? 'Only available in Content view' : ''}>
          <button
            disabled={!isContent}
            onClick={() => { setCalendarView(false); setAnalyticsView(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${isContent && !calendarView && !analyticsView ? 'bg-[#8403C5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} ${!isContent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Board
          </button>
          <button
            disabled={!isContent}
            onClick={() => { setCalendarView(true); setAnalyticsView(false); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${isContent && calendarView && !analyticsView ? 'bg-[#8403C5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} ${!isContent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
          <button
            disabled={!isContent}
            onClick={() => { setAnalyticsView(true); setCalendarView(false); base44.entities.ContentItem.list('-publishDate', 300).then(setItems); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-l border-gray-200 transition-colors ${isContent && analyticsView ? 'bg-[#8403C5] text-white' : 'bg-white text-gray-500 hover:bg-gray-50'} ${!isContent ? 'cursor-not-allowed' : 'cursor-pointer'}`}
          >
            <TrendingUp className="w-3.5 h-3.5" /> Analytics
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-hidden flex">
        {tab === 'Content' && !analyticsView && (
          <ContentKanban
            calendarView={calendarView}
            onSetCalendarView={setCalendarView}
            initialSelected={selectedItem}
            onClearSelected={() => setSelectedItem(null)}
          />
        )}
        {tab === 'Content' && analyticsView && (
          <ContentAnalytics
            items={items}
            onBack={() => setAnalyticsView(false)}
            onOpenItem={handleOpenItem}
          />
        )}
        {tab === 'PR Coverage' && <PRCoverageTab />}
        {tab === 'Lead Magnets' && <LeadMagnetsTab />}
      </div>
    </div>
  );
}