import React, { useState, useEffect } from 'react';
import RequestBoard from '@/components/requests/RequestBoard';
import SubmitRequestForm from '@/components/requests/SubmitRequestForm';

const TABS = [
  { id: 'board', label: 'Company Board' },
  { id: 'form', label: 'Submit a Request' },
];

export default function Requests({ focusRequestId, onFocusConsumed }) {
  const [tab, setTab] = useState('board');
  const [boardRefresh, setBoardRefresh] = useState(0);

  useEffect(() => {
    if (!focusRequestId) return;
    setTab('board');
    setBoardRefresh(n => n + 1);
    sessionStorage.setItem('focus_request_id', focusRequestId);
    onFocusConsumed?.();
  }, [focusRequestId]);

  // Keyboard shortcut: Cmd+N to open request form
  useEffect(() => {
    const onNew = () => setTab('form');
    window.addEventListener('ew-new-entry', onNew);
    return () => window.removeEventListener('ew-new-entry', onNew);
  }, []);

  const handleSubmitted = () => {
    setBoardRefresh(n => n + 1);
    setTab('board');
  };

  return (
    <div className="flex flex-col flex-1 overflow-hidden font-dm">
      {/* Sub-tab header */}
      <div className="bg-white border-b border-[#EBEBF5] shrink-0 px-8 flex items-center gap-1 h-10">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-4 py-1.5 text-[13px] font-medium transition-all duration-150 relative ${tab === t.id ? 'text-[#242450]' : 'text-[#5777AB] hover:text-[#242450]'}`}>
            {t.label}
            {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden bg-[#F6F6FB]">
        {tab === 'board' && <RequestBoard refresh={boardRefresh} />}
        {tab === 'form' && <SubmitRequestForm onSubmitted={handleSubmitted} />}
      </div>
    </div>
  );
}