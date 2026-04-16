import React, { useState } from 'react';
import RequestForm from '@/components/requests/RequestForm';
import RequestBoard from '@/components/requests/RequestBoard';

const TABS = [
  { id: 'form', label: 'Submit a Request' },
  { id: 'board', label: 'Company To-Do Board' },
  { id: 'george', label: "George's To-Do" },
];

export default function Requests() {
  const [tab, setTab] = useState('form');
  const [boardRefresh, setBoardRefresh] = useState(0);

  const handleSubmitted = () => {
    setBoardRefresh(n => n + 1);
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm">
      {/* Sub-tab header */}
      <div className="bg-white border-b border-ew-border shrink-0 px-8 flex items-center gap-1 h-11">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${tab === t.id ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg hover:text-navy'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {tab === 'form' && <RequestForm onSubmitted={handleSubmitted} />}
        {tab === 'board' && <RequestBoard refresh={boardRefresh} />}
        {tab === 'george' && <RequestBoard refresh={boardRefresh} assigneeFilter="George" />}
      </div>
    </div>
  );
}