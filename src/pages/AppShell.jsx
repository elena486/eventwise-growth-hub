import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Pipeline from './Pipeline';
import ProposalGeneratorInner from '@/components/proposal/ProposalGeneratorInner';
import Clients from './Clients';
import Onboarding from './Onboarding';
import HealthRenewals from './HealthRenewals';
import Renewals from './Renewals';
import BugTracker from '@/components/bugs/BugTracker';
import Deals from './Deals';
import Sprints from './Sprints';
import Marketing from './Marketing';
import Handbook from './Handbook';
import Requests from './Requests';
import HR from './HR';
import SalesAssets from './SalesAssets';
import OutreachAnalytics from './OutreachAnalytics';
import Competitors from './Competitors';
import { LOGO_BLACK, LOGO_WHITE } from '@/lib/proposalData';
import ClientDetailPanel from '@/components/clients/ClientDetailPanel';
import ClientFullPanel from '@/components/clients/ClientFullPanel';
import { useDarkMode } from '@/hooks/useDarkMode';
import { Moon, Sun } from 'lucide-react';

const GROUPS = [
  { id: 'sales', label: 'Sales', tabs: [
    { id: 'pipeline', label: 'Pipeline' },
    { id: 'proposal', label: 'Proposal' },
    { id: 'deals', label: 'Deals' },
    { id: 'assets', label: 'Assets' },
    { id: 'outreach', label: 'Outreach Analytics' },
  ]},
  { id: 'cs', label: 'Customer Success', tabs: [
    { id: 'clients', label: 'Clients' },
    { id: 'onboarding', label: 'Onboarding' },
    { id: 'health', label: 'Health' },
    { id: 'renewals', label: 'Renewals' },
    { id: 'bugs', label: 'Bug Tracker' },
  ]},
  { id: 'ops', label: 'Operations', tabs: [
    { id: 'sprints', label: 'Sprints' },
    { id: 'requests', label: 'Team To Do Requests' },
    { id: 'hr', label: 'Time Off Requests' },
    { id: 'competitors', label: 'Competitors' },
  ]},
  { id: 'marketing', label: 'Marketing', tabs: [
    { id: 'marketing', label: 'Marketing' },
  ]},
  { id: 'handbook', label: 'Eventwise Wiki', tabs: [
    { id: 'handbook', label: 'Eventwise Wiki' },
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
  const [detailClient, setDetailClient] = useState(null);
  const [fullPanelClient, setFullPanelClient] = useState(null);
  const [fullPanelClients, setFullPanelClients] = useState([]);
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
    const keyMap = { '1': 'pipeline', '2': 'proposal', '3': 'deals', '4': 'clients', '5': 'onboarding', '6': 'health', '7': 'renewals', '8': 'sprints', '9': 'requests' };
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
      <nav className="bg-[#242450] shrink-0 px-6 flex items-center justify-between h-14">
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 shrink-0">
            <img src={LOGO_WHITE} alt="Eventwise" className="h-4" />
            <span className="w-px h-4 bg-white/20 inline-block" />
            <span className="text-[11px] text-white/50 font-medium tracking-widest uppercase">HQ</span>
          </div>

          {/* Group tabs */}
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setTab(g.tabs[0].id)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-150 shrink-0 ${
                  activeGroup.id === g.id
                    ? 'text-white bg-white/15'
                    : 'text-white/60 hover:text-white hover:bg-white/10'
                }`}
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>

        {/* Right: user + utilities */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          {user && (
            <>
              <div className="w-7 h-7 rounded-full bg-white/20 text-white text-[11px] font-semibold flex items-center justify-center shrink-0">
                {(user.full_name || user.email || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
              </div>
              <span className="text-[13px] text-white/60 font-medium hidden sm:block">{user.full_name || user.email}</span>
            </>
          )}
          <button onClick={() => setDark(d => !d)} className="p-2 text-white/50 hover:text-white rounded-lg hover:bg-white/10 transition-colors" title="Toggle dark mode">
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </nav>

      {/* Sub-nav */}
      {activeGroup.tabs.length > 1 && (
        <div className="bg-white border-b border-[#EBEBEB] shrink-0 px-6 flex items-center gap-1 h-10">
          {activeGroup.tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 text-[13px] font-medium transition-all duration-150 shrink-0 relative ${
                tab === t.id ? 'text-[#111827]' : 'text-[#6B7280] hover:text-[#111827]'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex dark:bg-[#0F0F1A]">
        {tab === 'pipeline' && <Pipeline onProposalHandoff={handleProposalHandoff} onViewDeals={() => setTab('deals')} />}
        {tab === 'proposal' && <ProposalGeneratorInner handoff={proposalHandoff} onHandoffConsumed={() => setProposalHandoff(null)} />}
        {tab === 'clients' && <Clients onViewHealth={handleViewHealth} onViewOnboarding={handleViewOnboarding} onViewDetail={setDetailClient} onOpenFullPanel={(client, allClients) => { setFullPanelClient(client); setFullPanelClients(allClients || []); }} />}
        {tab === 'onboarding' && <Onboarding focusClientId={focusClientId} />}
        {tab === 'health' && <HealthRenewals focusClientId={focusClientId} />}
        {tab === 'renewals' && <Renewals />}
        {tab === 'deals' && <Deals onRenewalProposal={(data) => { handleProposalHandoff(data); }} onViewClient={(clientId) => { setTab('clients'); }} onNavigate={setTab} />}
        {tab === 'sprints' && <Sprints />}
        {tab === 'marketing' && <Marketing />}
        {tab === 'handbook' && <Handbook onNavigate={(t) => setTab(t)} />}
        {tab === 'requests' && <Requests />}
        {tab === 'hr' && <HR />}
        {tab === 'competitors' && <Competitors />}
        {tab === 'bugs' && <BugTracker />}
        {tab === 'assets' && <SalesAssets />}
        {tab === 'outreach' && <OutreachAnalytics />}
      </div>
      {detailClient && (
        <ClientDetailPanel
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onUpdated={(updated) => setDetailClient(updated)}
        />
      )}
      {fullPanelClient && (
        <ClientFullPanel
          client={fullPanelClient}
          onClose={() => setFullPanelClient(null)}
          onUpdated={(updated) => {
            setFullPanelClient(updated);
            setFullPanelClients(prev => prev.map(c => c.id === updated.id ? updated : c));
          }}
          onDelete={(id) => {
            setFullPanelClients(prev => prev.filter(c => c.id !== id));
            setFullPanelClient(null);
          }}
          onViewOnboarding={handleViewOnboarding}
        />
      )}
    </div>
  );
}