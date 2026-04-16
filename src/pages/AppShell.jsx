import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Pipeline from './Pipeline';
import ProposalGeneratorInner from '@/components/proposal/ProposalGeneratorInner';
import Clients from './Clients';
import Onboarding from './Onboarding';
import HealthRenewals from './HealthRenewals';
import BugTracker from '@/components/bugs/BugTracker';
import Deals from './Deals';
import Sprints from './Sprints';
import Marketing from './Marketing';
import Handbook from './Handbook';
import Requests from './Requests';
import { LOGO_BLACK, LOGO_WHITE } from '@/lib/proposalData';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';

const GROUPS = [
  { id: 'sales', label: 'Sales', tabs: [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'deals', label: 'Deals' },
  ]},
  { id: 'cs', label: 'Customer Success', tabs: [
    { id: 'clients', label: 'Clients' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'health', label: 'Health & Renewals' },
    { id: 'bugs', label: 'Bug Tracker' },
  ]},
  { id: 'ops', label: 'Operations', tabs: [
    { id: 'sprints', label: 'Sprints' },
    { id: 'requests', label: 'Requests' },
  ]},
  { id: 'marketing', label: 'Marketing', tabs: [
    { id: 'marketing', label: 'Marketing' },
  ]},
  { id: 'handbook', label: 'Handbook', tabs: [
    { id: 'handbook', label: 'Handbook' },
  ]},
];

function getGroupForTab(tab) {
  return GROUPS.find(g => g.tabs.some(t => t.id === tab));
}

export default function AppShell() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'pipeline';
  const { user } = useAuth();
  const [proposalHandoff, setProposalHandoff] = useState(null);
  const [focusClientId, setFocusClientId] = useState(null);
  const [dark, setDark] = useDarkMode();

  const setTab = (t) => setSearchParams({ tab: t });
  const activeGroup = getGroupForTab(tab) || GROUPS[0];

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
    const allTabs = GROUPS.flatMap(g => g.tabs);
    const label = allTabs.find(t => t.id === tab)?.label || 'Pipeline';
    document.title = `${label} — Eventwise Client Hub`;
  }, [tab]);

  useEffect(() => {
    const keyMap = { '1': 'pipeline', '2': 'proposal', '3': 'deals', '4': 'clients', '5': 'onboarding', '6': 'health', '7': 'sprints', '8': 'requests' };
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
      <nav className="bg-white dark:bg-[#1A1A2E] border-b border-ew-border dark:border-[#2E2E4E] shrink-0 px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-4 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={dark ? LOGO_WHITE : LOGO_BLACK} alt="Eventwise" className="h-4" />
            <span className="w-px h-4 bg-ew-border inline-block" />
            <span className="text-[11px] text-ew-muted font-medium tracking-wide">HQ</span>
          </div>

          {/* Group tabs */}
          <div className="flex flex-col gap-0.5">
            <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
              {GROUPS.map(g => (
                <button
                  key={g.id}
                  onClick={() => setTab(g.tabs[0].id)}
                  className={`px-4 py-1 rounded-lg text-sm font-semibold transition-colors shrink-0 ${
                    activeGroup.id === g.id ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg hover:text-navy'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* Sub-tabs */}
            {activeGroup.tabs.length > 1 && (
              <div className="flex items-center gap-0.5 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
                {activeGroup.tabs.map(t => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`px-3 py-0.5 rounded-md text-xs font-medium transition-colors shrink-0 ${
                      tab === t.id ? 'text-navy bg-navy/10' : 'text-ew-muted hover:text-navy hover:bg-ew-bg'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right: user + settings */}
        <div className="flex items-center gap-2.5 shrink-0 ml-4">
          {user && (
            <>
              <div className="w-7 h-7 rounded-full bg-navy text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {(user.full_name || user.email || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-[13px] text-ew-muted font-medium hidden sm:block">{user.full_name || user.email}</span>
            </>
          )}
          <button onClick={() => setDark(d => !d)} className="p-1 text-ew-muted hover:text-navy dark:hover:text-white rounded-md hover:bg-ew-bg dark:hover:bg-white/10 transition-colors" title="Toggle dark mode">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <button className="p-1 text-ew-muted hover:text-navy rounded-md hover:bg-ew-bg transition-colors" title="Settings">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3"/>
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
            </svg>
          </button>
        </div>
      </nav>

      {/* Content */}
      <div className="flex-1 overflow-hidden flex dark:bg-[#0F0F1A]">
        {tab === 'pipeline' && <Pipeline onProposalHandoff={handleProposalHandoff} onViewDeals={() => setTab('deals')} />}
        {tab === 'proposal' && <ProposalGeneratorInner handoff={proposalHandoff} onHandoffConsumed={() => setProposalHandoff(null)} />}
        {tab === 'clients' && <Clients onViewHealth={handleViewHealth} onViewOnboarding={handleViewOnboarding} />}
        {tab === 'onboarding' && <Onboarding focusClientId={focusClientId} />}
        {tab === 'health' && <HealthRenewals focusClientId={focusClientId} />}
        {tab === 'deals' && <Deals onRenewalProposal={(data) => { handleProposalHandoff(data); }} />}
        {tab === 'sprints' && <Sprints />}
        {tab === 'marketing' && <Marketing />}
        {tab === 'handbook' && <Handbook />}
        {tab === 'requests' && <Requests />}
        {tab === 'bugs' && <BugTracker />}
      </div>
    </div>
  );
}