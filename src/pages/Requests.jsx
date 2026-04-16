import React, { useState } from 'react';
import RequestForm from '@/components/requests/RequestForm';
import RequestBoard from '@/components/requests/RequestBoard';

const TABS = [
  { id: 'form', label: 'Submit a Request' },
  { id: 'board', label: 'Company To-Do Board' },
];

export default function Requests() {
  const [tab, setTab] = useState('form');
  const [boardRefresh, setBoardRefresh] = useState(0);

  const handleSubmitted = () => {
    setBoardRefresh(n => n + 1);
    setTab('board');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm">
      {/* Sub-tab header */}
      <div className="bg-white border-b border-[#EBEBEB] shrink-0 px-8 flex items-center gap-1 h-11">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-[13px] font-medium transition-all duration-150 relative ${tab === t.id ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'}`}>
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'form' && <RequestForm onSubmitted={handleSubmitted} />}
        {tab === 'board' && <RequestBoard refresh={boardRefresh} />}
      </div>
    </div>
  );
}