import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Pipeline from './Pipeline';
import ProposalGeneratorInner from '@/components/proposal/ProposalGeneratorInner';
import Clients from './Clients';
import Onboarding from './Onboarding';
import HealthRenewals from './HealthRenewals';
import Deals from './Deals';
import { LOGO_BLACK } from '@/lib/proposalData';

const TABS = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'proposal', label: 'Proposal' },
  { id: 'clients', label: 'Clients' },
  { id: 'onboarding', label: 'Onboarding' },
  { id: 'health', label: 'Health & Renewals' },
  { id: 'deals', label: 'Deals' },
];

export default function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'pipeline';
  const { user } = useAuth();
  const [proposalHandoff, setProposalHandoff] = useState(null);
  const [focusClientId, setFocusClientId] = useState(null);

  const setTab = (t) => setSearchParams({ tab: t });

  const handleViewHealth = (client) => {
    setFocusClientId(client.id);
    setTab('health');
  };

  const handleViewOnboarding = (client) => {
    setFocusClientId(client.id);
    setTab('onboarding');
  };

  const handleProposalHandoff = (data) => {
    setProposalHandoff(data);
    setTab('proposal');
  };

  useEffect(() => {
    const label = TABS.find(t => t.id === tab)?.label || 'Pipeline';
    document.title = `${label} — Eventwise Client Hub`;
  }, [tab]);

  useEffect(() => {
    const keyMap = { '1': 'pipeline', '2': 'proposal', '3': 'clients', '4': 'onboarding', '5': 'health', '6': 'deals' };
    const handler = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (keyMap[e.key]) setTab(keyMap[e.key]);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className="flex flex-col h-screen font-dm overflow-hidden">
      {/* Top nav */}
      <nav className="bg-white border-b border-ew-border shrink-0 px-6 flex items-center justify-between h-12">
        <div className="flex items-center gap-3 min-w-0">
          {/* Logo + App name */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={LOGO_BLACK} alt="Eventwise" className="h-4" />
            <span className="w-px h-4 bg-ew-border inline-block" />
            <span className="text-[11px] text-ew-muted font-medium tracking-wide">Client Hub</span>
          </div>
          {/* Tabs — scrollable, no scrollbar */}
          <div
            className="flex items-center gap-1 overflow-x-auto"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none', WebkitOverflowScrolling: 'touch' }}
          >
            {TABS.map((t, i) => (
              <div key={t.id} className="relative group shrink-0">
                <button
                  onClick={() => setTab(t.id)}
                  className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                    tab === t.id
                      ? 'bg-navy text-white'
                      : 'text-ew-body hover:bg-ew-bg hover:text-navy'
                  }`}
                >
                  {t.label}
                </button>
                {tab === t.id && (
                  <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4/5 h-0.5 bg-navy rounded-full" />
                )}
                {/* Tooltip */}
                <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 px-2 py-1 bg-gray-800 text-white text-[11px] rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-150 delay-300 z-50">
                  {t.label} ({i + 1})
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: user indicator + settings */}
        <div className="flex items-center gap-2.5 shrink-0 ml-4">
          {user && (
            <>
              <div className="w-7 h-7 rounded-full bg-navy text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {(user.full_name || user.email || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-[13px] text-ew-muted font-medium hidden sm:block">{user.full_name || user.email}</span>
            </>
          )}
          <button className="p-1 text-ew-muted hover:text-navy rounded-md hover:bg-ew-bg transition-colors" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex">
        {tab === 'pipeline' && <Pipeline onProposalHandoff={handleProposalHandoff} onViewDeals={() => setTab('deals')} />}
        {tab === 'proposal' && <ProposalGeneratorInner handoff={proposalHandoff} onHandoffConsumed={() => setProposalHandoff(null)} />}
        {tab === 'clients' && <Clients onViewHealth={handleViewHealth} onViewOnboarding={handleViewOnboarding} />}
        {tab === 'onboarding' && <Onboarding focusClientId={focusClientId} />}
        {tab === 'health' && <HealthRenewals focusClientId={focusClientId} />}
        {tab === 'deals' && <Deals onRenewalProposal={(data) => { handleProposalHandoff(data); }} />}
      </div>
    </div>
  );
}