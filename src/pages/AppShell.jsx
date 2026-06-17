import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import Pipeline from './Pipeline';
import HQDashboard from './HQDashboard';
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
import RequestBoard from '@/components/requests/RequestBoard';
import SubmitRequestForm from '@/components/requests/SubmitRequestForm';
import TimeOffTracker from '@/components/hr/TimeOffTracker';
import SalesAssets from './SalesAssets';
import MQLTracker from './MQLTracker';
import OutreachAnalytics from './OutreachAnalytics';
import Competitors from './Competitors';
import TimeCapacity from './TimeCapacity';
import LinkSpace from './LinkSpace';
import ChangelogAdmin from './ChangelogAdmin';
import ChangelogView from './ChangelogView';
import { LOGO_BLACK, LOGO_WHITE } from '@/lib/proposalData';
import ClientDetailPanel from '@/components/clients/ClientDetailPanel';
import ClientFullPanel from '@/components/clients/ClientFullPanel';
import { useDarkMode } from '@/hooks/useDarkMode';
import useAutoRefresh from '@/hooks/useAutoRefresh';
import AutoRefreshToast from '@/components/AutoRefreshToast';
import { Moon, Sun, LogOut, ChevronDown, Settings, Search, HelpCircle, Clock } from 'lucide-react';
import NotificationBell from '@/components/NotificationBell';
import PostRefreshBanner from '@/components/PostRefreshBanner';
import FirstVisitModal from '@/components/FirstVisitModal';
import GlobalSearch from '@/components/GlobalSearch';
import KeyboardShortcutsModal from '@/components/KeyboardShortcutsModal';
import useKeyboardShortcuts from '@/hooks/useKeyboardShortcuts';
import { base44 } from '@/api/base44Client';
import { getRecentlyViewed, addRecentlyViewed, clearRecentlyViewed, TYPE_META, formatRelativeTime } from '@/utils/recentlyViewed';

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
    { id: 'team-board', label: "Team To Do's" },
    { id: 'submit-request', label: 'Submit a Request' },
    { id: 'sprints', label: 'Sprints' },
    { id: 'time-off', label: 'Time Off' },
    { id: 'competitors', label: 'Competitors' },
  ]},
  { id: 'time', label: 'Time & Capacity', tabs: [
    { id: 'time-log', label: 'Log Time' },
    { id: 'time-timesheet', label: 'My Timesheet' },
    { id: 'time-overview', label: 'Team Overview' },
  ]},
  { id: 'links', label: '🔗 Links', tabs: [
    { id: 'links', label: 'Link Space' },
  ]},
  { id: 'marketing', label: 'Marketing', tabs: [
    { id: 'marketing', label: 'Marketing' },
    { id: 'mql', label: 'MQL Tracker' },
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
  const tab = searchParams.get('tab') || 'dashboard';
  const { user } = useAuth();
  const [proposalHandoff, setProposalHandoff] = useState(null);
  const [focusClientId, setFocusClientId] = useState(null);
  const [detailClient, setDetailClient] = useState(null);
  const [fullPanelClient, setFullPanelClient] = useState(null);
  const [fullPanelClients, setFullPanelClients] = useState([]);
  const [dark, setDark] = useDarkMode();
  const { showWarning, countdown, reload, dismiss } = useAutoRefresh();
  const [avatarOpen, setAvatarOpen] = useState(false);

  // Changelog / notification state
  const [changelogEntries, setChangelogEntries] = useState([]);
  const [postRefreshBanner, setPostRefreshBanner] = useState(false);
  const [showFirstVisitModal, setShowFirstVisitModal] = useState(false);
  const [notificationPanelOpen, setNotificationPanelOpen] = useState(false);
  const postRefreshBannerTimer = useRef(null);

  // HQ dropdown state
  const [hqOpen, setHqOpen] = useState(false);
  const hqRef = useRef(null);
  const [recentItems, setRecentItems] = useState(() => getRecentlyViewed());

  // Global search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchFocus, setSearchFocus] = useState(null);

  const LAST_READ_KEY = 'changelog_last_read';

  const getLastRead = useCallback(() => parseInt(localStorage.getItem(LAST_READ_KEY) || '0', 10), []);

  const loadChangelog = useCallback(async () => {
    try {
      const data = await base44.entities.ChangelogEntry.list('-created_date');
      const lastRead = getLastRead();
      const enriched = data.map(e => ({
        ...e,
        _unread: new Date(e.created_date).getTime() > lastRead,
      }));
      setChangelogEntries(enriched);
      return enriched;
    } catch { return []; }
  }, [getLastRead]);

  const markAllRead = useCallback(() => {
    localStorage.setItem(LAST_READ_KEY, String(Date.now()));
    loadChangelog();
  }, [loadChangelog]);

  const unreadCount = changelogEntries.filter(e => e._unread).length;

  // Load changelog on mount + check post-refresh
  useEffect(() => {
    loadChangelog().then(enriched => {
      const wasAutoRefreshed = sessionStorage.getItem('auto_refreshed');
      if (wasAutoRefreshed) {
        sessionStorage.removeItem('auto_refreshed');
        const newCount = enriched.filter(e => e._unread).length;
        if (newCount > 0) {
          setPostRefreshBanner(true);
          if (postRefreshBannerTimer.current) clearTimeout(postRefreshBannerTimer.current);
          postRefreshBannerTimer.current = setTimeout(() => setPostRefreshBanner(false), 10000);
          if (newCount >= 3) setShowFirstVisitModal(true);
        }
      } else {
        // Check for first-visit modal even without auto-refresh
        const newCount = enriched.filter(e => e._unread).length;
        const lastRead = getLastRead();
        if (newCount >= 3 && lastRead === 0) setShowFirstVisitModal(true);
      }
    });
  }, []);

  const handleOpenNotificationPanel = () => {
    setNotificationPanelOpen(true);
    // Entries get marked as read when panel opens
    markAllRead();
  };

  const handleSeeWhatsNew = () => {
    setPostRefreshBanner(false);
    setNotificationPanelOpen(true);
  };

  // Close HQ dropdown on Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape' && hqOpen) setHqOpen(false); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [hqOpen]);

  // Close HQ dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (hqRef.current && !hqRef.current.contains(e.target)) setHqOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Refresh recent items list when dropdown opens
  useEffect(() => {
    if (hqOpen) setRecentItems(getRecentlyViewed());
  }, [hqOpen]);

  // Track recently viewed when AppShell-managed panels open
  useEffect(() => {
    if (detailClient) {
      addRecentlyViewed({
        type: 'client',
        name: detailClient.name || 'Unnamed Client',
        section: 'Customer Success → Clients',
        tab: 'clients',
        recordId: detailClient.id,
      });
    }
  }, [detailClient]);

  useEffect(() => {
    if (fullPanelClient) {
      addRecentlyViewed({
        type: 'client',
        name: fullPanelClient.name || 'Unnamed Client',
        section: 'Customer Success → Clients',
        tab: 'clients',
        recordId: fullPanelClient.id,
      });
    }
  }, [fullPanelClient]);

  // Focus request from search — write to sessionStorage for RequestBoard to pick up
  useEffect(() => {
    if (searchFocus?.focusType === 'request' && searchFocus.focusId && tab === 'team-board') {
      sessionStorage.setItem('focus_request_id', searchFocus.focusId);
      setTeamBoardRefresh(n => n + 1);
      setSearchFocus(null);
    }
  }, [searchFocus, tab]);

  const [teamBoardRefresh, setTeamBoardRefresh] = useState(0);

  // Keyboard shortcuts
  const { shortcutsModalOpen, setShortcutsModalOpen } = useKeyboardShortcuts({
    searchOpen,
    onToggleSearch: () => setSearchOpen(prev => !prev),
    notificationPanelOpen,
    onCloseNotificationPanel: () => setNotificationPanelOpen(false),
    fullPanelOpen: !!fullPanelClient,
    onCloseFullPanel: () => setFullPanelClient(null),
    detailClientOpen: !!detailClient,
    onCloseDetailClient: () => setDetailClient(null),
  });

  const handleSearchNavigate = useCallback(({ tab, focusType, focusId, sectionId }) => {
    setSearchFocus({ tab, focusType, focusId, sectionId });
    setSearchParams({ tab });
  }, [setSearchParams]);

  const avatarRef = useRef(null);

  const setTab = (t) => setSearchParams({ tab: t });

  // Close avatar dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (avatarRef.current && !avatarRef.current.contains(e.target)) setAvatarOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);
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
    const keyMap = { '1': 'pipeline', '2': 'proposal', '3': 'deals', '4': 'clients', '5': 'onboarding', '6': 'health', '7': 'renewals', '8': 'sprints', '9': 'team-board' };
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
      <nav className="bg-[#0F0F1A] shrink-0 px-6 flex items-center justify-between h-[52px] border-b border-[#1E1E32]">
        <div className="flex items-center gap-6 min-w-0">
          {/* Logo + HQ dropdown */}
          <div className="relative flex items-center gap-2.5 shrink-0" ref={hqRef}>
            <button onClick={() => setSearchParams({})} className="shrink-0" title="Dashboard">
              <img src={LOGO_WHITE} alt="Eventwise" className="h-4" />
            </button>
            <span className="w-px h-4 bg-white/20 inline-block" />
            <button
              onClick={() => setHqOpen(o => !o)}
              className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-all text-sm font-medium ${
                hqOpen
                  ? 'text-white bg-white/10'
                  : 'text-[#8B8FA8] hover:text-[#C4C6D4] hover:bg-white/5'
              }`}
              title="Recently viewed"
            >
              <Clock className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Recent</span>
              {recentItems.length > 0 && (
                <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] font-bold bg-[#8403C5] text-white rounded-full px-1.5 leading-none">
                  {recentItems.length}
                </span>
              )}
              <ChevronDown className={`w-3 h-3 transition-transform ${hqOpen ? 'rotate-180' : ''}`} />
            </button>
            {hqOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-[280px] bg-white dark:bg-[#1E2035] rounded-[10px] border border-[#E5E7EB] dark:border-[#2E2E4E] shadow-[0_8px_24px_rgba(0,0,0,0.12)] z-50 overflow-hidden">
                <div className="px-4 py-3 border-b border-[#F2F2F4] dark:border-[#2E2E4E]">
                  <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Recently viewed</p>
                </div>
                {recentItems.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] italic text-center py-8 px-4">
                    Nothing viewed yet — your recent records will appear here
                  </p>
                ) : (
                  <div>
                    {recentItems.map((item, i) => {
                      const meta = TYPE_META[item.type] || { icon: '📌', label: item.type };
                      return (
                        <button
                          key={i}
                          onClick={() => {
                            setHqOpen(false);
                            setSearchParams({ tab: item.tab });
                            setSearchFocus({ tab: item.tab, focusType: item.type, focusId: item.recordId, sectionId: item.sectionId || null });
                          }}
                          className="w-full flex items-center gap-3 px-4 h-[52px] hover:bg-[#F3F4F6] dark:hover:bg-[#2D3748] transition-colors text-left"
                        >
                          <span className="text-lg shrink-0">{meta.icon}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-[#111827] dark:text-[#E8E8F0] truncate">{item.name}</p>
                            <p className="text-[11px] text-[#9CA3AF]">{item.section}</p>
                          </div>
                          <span className="text-[11px] text-[#9CA3AF] shrink-0">{formatRelativeTime(item.timestamp)}</span>
                        </button>
                      );
                    })}
                    <div className="border-t border-[#F2F2F4] dark:border-[#2E2E4E] px-4 py-2.5">
                      <button
                        onClick={() => {
                          if (window.confirm('Clear your recent history?')) {
                            clearRecentlyViewed();
                            setRecentItems([]);
                          }
                        }}
                        className="text-[11px] text-[#9CA3AF] hover:text-[#EF4444] transition-colors"
                      >
                        Clear history
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Global search button */}
          <button
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-[#8B8FA8] hover:text-[#C4C6D4] hover:bg-white/5 transition-all text-sm"
            title="Search (Cmd+K)"
          >
            <Search className="w-4 h-4" />
            <span className="hidden md:inline text-xs text-white/30 font-mono">⌘K</span>
          </button>

          {/* Group tabs */}
          <div className="flex items-center gap-1 overflow-x-auto" style={{ scrollbarWidth: 'none' }}>
            {GROUPS.map(g => (
              <button
                key={g.id}
                onClick={() => setTab(g.tabs[0].id)}
                className={`px-4 h-full text-[13px] font-medium transition-all duration-150 shrink-0 relative ${
                  activeGroup.id === g.id
                    ? 'text-white'
                    : 'text-[#8B8FA8] hover:text-[#C4C6D4]'
                }`}
              >
                {g.label}
                {activeGroup.id === g.id && (
                  <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-white rounded-t-full" />
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: user + utilities */}
        <div className="flex items-center gap-2 shrink-0 ml-4">
          <NotificationBell
            unreadCount={unreadCount}
            entries={changelogEntries}
            onOpenPanel={handleOpenNotificationPanel}
            onMarkAllRead={markAllRead}
            onViewAll={() => setTab('changelog')}
          />
          <button
            onClick={() => setDark(d => !d)}
            className="p-2 text-[#8B8FA8] hover:text-white rounded-lg hover:bg-white/5 transition-colors"
            title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {user && (
            <div className="relative" ref={avatarRef}>
              <button
                onClick={() => setAvatarOpen(o => !o)}
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-[#7C3AED]/20 text-[#C4B5FD] text-[11px] font-semibold flex items-center justify-center shrink-0">
                  {(user.full_name || user.email || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                </div>
                <ChevronDown className="w-3 h-3 text-[#8B8FA8]" />
              </button>
              {avatarOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-[10px] border border-[#F0F0F0] overflow-hidden z-50">
                  <div className="px-4 py-3 border-b border-[#F0F0F0]">
                    <p className="text-[14px] font-semibold text-[#0F0F1A]">{user.full_name || '—'}</p>
                    <p className="text-[12px] text-[#9CA3AF] mt-0.5 truncate">{user.email}</p>
                  </div>
                  <button
                    onClick={() => { setDark(d => !d); }}
                    className="w-full flex items-center justify-between px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#FAFAFA] transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      {dark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                      {dark ? 'Light mode' : 'Dark mode'}
                    </span>
                    <span className={`w-8 h-4 rounded-full transition-colors ${dark ? 'bg-[#7C3AED]' : 'bg-[#E5E7EB]'} relative inline-block`}>
                      <span className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-transform ${dark ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </span>
                  </button>
                  {(user?.email || '').toLowerCase().includes('elena') && (
                    <button
                      onClick={() => { setAvatarOpen(false); setTab('changelog-admin'); }}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#374151] hover:bg-[#FAFAFA] transition-colors"
                    >
                      <Settings className="w-4 h-4" /> Changelog Admin
                    </button>
                  )}
                  <button
                    onClick={() => { setAvatarOpen(false); import('@/api/base44Client').then(m => m.base44.auth.logout()); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-[13px] text-[#DC2626] hover:bg-[#FEF2F2] transition-colors border-t border-[#F0F0F0]"
                  >
                    <LogOut className="w-4 h-4" /> Sign out
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* Post-refresh banner */}
      {postRefreshBanner && (
        <PostRefreshBanner
          newCount={unreadCount}
          onSeeWhatsNew={handleSeeWhatsNew}
          onDismiss={() => setPostRefreshBanner(false)}
        />
      )}

      {/* Sub-nav — skip for dashboard */}
      {tab !== 'dashboard' && activeGroup.tabs.length > 1 && (
        <div className="bg-white border-b border-[#F0F0F0] shrink-0 px-6 flex items-center gap-1 h-10">
          {activeGroup.tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 h-full text-[13px] font-medium transition-all duration-150 shrink-0 relative ${
                tab === t.id ? 'text-[#0F0F1A]' : 'text-[#9CA3AF] hover:text-[#6B7280]'
              }`}
            >
              {t.label}
              {tab === t.id && <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-[#7C3AED] rounded-t-full" />}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-hidden flex dark:bg-[#0F0F1A]">
        {tab === 'dashboard' && <HQDashboard user={user} onNavigate={setTab} onRefresh={() => window.dispatchEvent(new Event('hq-refresh'))} />}
        {tab === 'pipeline' && <Pipeline onProposalHandoff={handleProposalHandoff} onViewDeals={() => setTab('deals')} focusLeadId={searchFocus?.focusType === 'lead' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'proposal' && <ProposalGeneratorInner handoff={proposalHandoff} onHandoffConsumed={() => setProposalHandoff(null)} />}
        {tab === 'clients' && <Clients onViewHealth={handleViewHealth} onViewOnboarding={handleViewOnboarding} onViewDetail={setDetailClient} onOpenFullPanel={(client, allClients) => { setFullPanelClient(client); setFullPanelClients(allClients || []); }} focusClientId={searchFocus?.focusType === 'client' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'onboarding' && <Onboarding focusClientId={focusClientId} />}
        {tab === 'health' && <HealthRenewals focusClientId={focusClientId} />}
        {tab === 'renewals' && <Renewals />}
        {tab === 'deals' && <Deals onRenewalProposal={(data) => { handleProposalHandoff(data); }} onViewClient={(clientId) => { setTab('clients'); }} onNavigate={setTab} focusDealId={searchFocus?.focusType === 'deal' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'team-board' && <RequestBoard refresh={teamBoardRefresh} />}
        {tab === 'submit-request' && <SubmitRequestForm onSubmitted={() => { setTeamBoardRefresh(n => n + 1); setTab('team-board'); }} />}
        {tab === 'sprints' && <Sprints />}
        {tab === 'time-off' && <TimeOffTracker />}
        {tab === 'competitors' && <Competitors focusCompetitorId={searchFocus?.focusType === 'competitor' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'time-log' && <TimeCapacity subTab="log" onSubTabChange={(id) => setSearchParams({ tab: id })} />}
        {tab === 'time-timesheet' && <TimeCapacity subTab="timesheet" onSubTabChange={(id) => setSearchParams({ tab: id })} />}
        {tab === 'time-overview' && <TimeCapacity subTab="overview" onSubTabChange={(id) => setSearchParams({ tab: id })} />}
        {tab === 'marketing' && <Marketing focusContentId={searchFocus?.focusType === 'content' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'mql' && <MQLTracker />}
        {tab === 'handbook' && <Handbook onNavigate={(t) => setTab(t)} focusWikiPage={searchFocus?.focusType === 'wiki' ? { pageId: searchFocus.focusId, sectionId: searchFocus.sectionId } : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'bugs' && <BugTracker focusBugId={searchFocus?.focusType === 'bug' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'assets' && <SalesAssets focusAssetId={searchFocus?.focusType === 'asset' ? searchFocus.focusId : null} onFocusConsumed={() => setSearchFocus(null)} />}
        {tab === 'outreach' && <OutreachAnalytics />}
        {tab === 'links' && <LinkSpace user={user} />}
        {tab === 'changelog' && <ChangelogView />}
        {tab === 'changelog-admin' && <ChangelogAdmin />}
      </div>

      {/* Global search overlay */}
      <GlobalSearch
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        onNavigate={handleSearchNavigate}
      />

      {/* Keyboard shortcuts modal */}
      <KeyboardShortcutsModal
        open={shortcutsModalOpen}
        onClose={() => setShortcutsModalOpen(false)}
      />

      {/* Shortcut hint button */}
      <button
        onClick={() => setShortcutsModalOpen(true)}
        className="fixed bottom-5 right-5 w-9 h-9 flex items-center justify-center rounded-full bg-white border border-[#F0F0F0] text-[#9CA3AF] hover:text-[#0F0F1A] hover:border-[#E5E7EB] transition-all z-40"
        title="Keyboard shortcuts (⌘/)"
      >
        <HelpCircle className="w-4 h-4" />
      </button>

      {detailClient && (
        <ClientDetailPanel
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onUpdated={(updated) => setDetailClient(updated)}
        />
      )}
      {showWarning && (
        <AutoRefreshToast countdown={countdown} onRefresh={reload} onDismiss={dismiss} />
      )}
      {showFirstVisitModal && (
        <FirstVisitModal
          entries={changelogEntries.filter(e => e._unread).slice(0, 3)}
          onClose={() => { setShowFirstVisitModal(false); markAllRead(); }}
          onSeeAll={() => { setShowFirstVisitModal(false); setTab('changelog'); }}
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