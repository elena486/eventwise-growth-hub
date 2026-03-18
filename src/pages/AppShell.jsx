import React, { useState } from 'react';
import Pipeline from './Pipeline';
import ProposalGeneratorInner from '@/components/proposal/ProposalGeneratorInner';
import { LOGO_BLACK } from '@/lib/proposalData';

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'proposal', label: 'Proposal' },
];

export default function AppShell() {
  const [tab, setTab] = useState('pipeline');
  const [proposalHandoff, setProposalHandoff] = useState(null);

  const handleProposalHandoff = (data) => {
    setProposalHandoff(data);
    setTab('proposal');
  };

  return (
    <div className="flex flex-col h-screen font-dm overflow-hidden">
      {/* Top nav */}
      <nav className="bg-white border-b border-ew-border shrink-0 px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-6">
          <img src={LOGO_BLACK} alt="Eventwise" className="h-4" />
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  tab === t.id
                    ? 'bg-navy text-white'
                    : 'text-ew-body hover:bg-ew-bg hover:text-navy'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {tab === 'pipeline' ? (
          <Pipeline onProposalHandoff={handleProposalHandoff} />
        ) : (
          <ProposalGeneratorInner handoff={proposalHandoff} onHandoffConsumed={() => setProposalHandoff(null)} />
        )}
      </div>
    </div>
  );
}