import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, X, CornerDownLeft, ArrowUp, ArrowDown, ExternalLink, Clock, Zap } from 'lucide-react';

const RECENT_KEY = 'global_search_recent';
const MAX_RECENT = 5;

function getRecent() {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) || '[]'); } catch { return []; }
}

function addRecent(item) {
  try {
    const existing = getRecent().filter(r => !(r.type === item.type && r.id === item.id));
    const updated = [item, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(updated));
  } catch {}
}

const QUICK_LINKS = [
  { label: 'Pipeline', tab: 'pipeline', emoji: '📊' },
  { label: 'Clients', tab: 'clients', emoji: '🏢' },
  { label: 'Team Board', tab: 'team-board', emoji: '✅' },
  { label: 'Wiki', tab: 'handbook', emoji: '📄' },
];

const CATEGORY_CONFIG = {
  clients: { label: 'Clients', icon: '🏢' },
  leads: { label: 'Leads', icon: '📊' },
  deals: { label: 'Deals', icon: '💼' },
  bugs: { label: 'Bugs', icon: '🐛' },
  tasks: { label: 'Tasks', icon: '✅' },
  wiki: { label: 'Wiki', icon: '📄' },
  links: { label: 'Links', icon: '🔗' },
  assets: { label: 'Assets', icon: '📦' },
  competitors: { label: 'Competitors', icon: '🔍' },
  content: { label: 'Content', icon: '📝' },
};

const STAGE_STYLES = {
  'New Lead': 'bg-blue-50 text-blue-700',
  'Contacted': 'bg-indigo-50 text-indigo-700',
  'Discovery Call': 'bg-purple-50 text-purple-700',
  'Demo Booked': 'bg-amber-50 text-amber-700',
  'Proposal Sent': 'bg-orange-50 text-orange-700',
  'Negotiation': 'bg-pink-50 text-pink-700',
  'Closed Won': 'bg-green-50 text-green-700',
  'Closed Lost': 'bg-red-50 text-red-600',
  'On Hold': 'bg-gray-100 text-gray-500',
};

const CLIENT_STATUS = {
  Trial: 'bg-blue-50 text-blue-700',
  Onboarding: 'bg-amber-50 text-amber-700',
  Live: 'bg-green-50 text-green-700',
  Churn: 'bg-red-50 text-red-600',
};

const THREAT_STYLES = {
  High: 'bg-red-50 text-red-600',
  Medium: 'bg-amber-50 text-amber-700',
  Low: 'bg-green-50 text-green-700',
  Monitor: 'bg-gray-100 text-gray-600',
};

const PRIORITY_STYLES = {
  Low: 'bg-gray-100 text-gray-600',
  Medium: 'bg-amber-50 text-amber-700',
  High: 'bg-orange-50 text-orange-600',
  Urgent: 'bg-red-50 text-red-600',
  Critical: 'bg-red-50 text-red-600',
};

const BUG_STATUS = {
  Open: 'bg-blue-50 text-blue-700',
  'In Progress': 'bg-amber-50 text-amber-700',
  'Waiting on Client': 'bg-purple-50 text-purple-700',
  Resolved: 'bg-green-50 text-green-700',
  Closed: 'bg-gray-100 text-gray-600',
};

const CONTENT_STATUS = {
  Ideas: 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-amber-50 text-amber-700',
  'Ready to Publish': 'bg-blue-50 text-blue-700',
  Scheduled: 'bg-purple-50 text-purple-700',
  Published: 'bg-green-50 text-green-700',
  Cancelled: 'bg-red-50 text-red-600',
};

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const idx = text.toLowerCase().indexOf(query.toLowerCase());
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="font-bold text-[#8403C5]">{text.slice(idx, idx + query.length)}</span>
      {text.slice(idx + query.length)}
    </>
  );
}

function SearchResultRow({ item, query, selected, onClick, onMouseEnter }) {
  const category = CATEGORY_CONFIG[item.category];
  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors ${
        selected ? 'bg-[#F3E8FF]' : 'hover:bg-[#F3E8FF]/50'
      }`}
      style={{ minHeight: 44 }}
    >
      <span className="text-base shrink-0 w-6 text-center">{category?.icon || '📌'}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#242450] truncate">
          {item.renderTitle ? item.renderTitle(query) : highlightMatch(item.title, query)}
        </p>
        {item.subtitle && (
          <p className="text-xs text-[#6B7280] truncate">
            {item.renderSubtitle ? item.renderSubtitle(query) : highlightMatch(item.subtitle, query)}
          </p>
        )}
      </div>
      {item.badge && (
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${item.badgeStyle || 'bg-gray-100 text-gray-600'}`}>
          {item.badge}
        </span>
      )}
      {item.meta && (
        <span className="text-[11px] text-[#9CA3AF] shrink-0 hidden sm:block">{item.meta}</span>
      )}
    </div>
  );
}

export default function GlobalSearch({ open, onClose, onNavigate }) {
  const [query, setQuery] = useState('');
  const [allData, setAllData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [recentItems, setRecentItems] = useState(getRecent());
  const inputRef = useRef(null);
  const resultsRef = useRef(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setSelectedIndex(-1);
      setRecentItems(getRecent());
      setTimeout(() => inputRef.current?.focus(), 50);
      if (!allData) loadAllData();
    }
  }, [open]);

  // Escape to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    if (open) {
      window.addEventListener('keydown', handler);
      return () => window.removeEventListener('keydown', handler);
    }
  }, [open, onClose]);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [
        leads, deals, clients, bugs, requests, competitors,
        contentItems, assets, handbookRecord,
      ] = await Promise.all([
        base44.entities.Lead.list('-created_date'),
        base44.entities.Deal.list('-created_date'),
        base44.entities.Client.list('-created_date'),
        base44.entities.Bug.list('-created_date'),
        base44.entities.Request.list('-created_date'),
        base44.entities.Competitor.list('-created_date'),
        base44.entities.ContentItem.list('-created_date'),
        base44.entities.SalesAsset.list('-created_date'),
        base44.entities.HandbookSection.filter({ sectionKey: 'handbook_v2' }),
      ]);

      // Parse handbook data
      let wikiPages = [];
      let linkEntries = [];
      if (handbookRecord.length > 0) {
        try {
          const record = handbookRecord[0];
          let parsed = null;
          if (record.fileUrl) {
            const res = await fetch(record.fileUrl);
            parsed = await res.json();
          } else if (record.data) {
            parsed = JSON.parse(record.data);
          }
          if (parsed?.sections) {
            parsed.sections.forEach(section => {
              (section.pages || []).forEach(page => {
                const secLabel = section.label?.replace(/^[^\w]+/, '').trim() || section.id;
                if (section.id === 'links' || secLabel.toLowerCase().includes('link')) {
                  (page.links || []).forEach(link => {
                    linkEntries.push({
                      id: `link-${page.id}-${link.id}`,
                      title: link.label,
                      description: link.note || '',
                      url: link.url,
                      section: secLabel,
                      pageTitle: page.title,
                    });
                  });
                } else {
                  wikiPages.push({
                    id: page.id,
                    title: page.title,
                    description: page.description || '',
                    content: page.richContent || page.content || '',
                    sectionId: section.id,
                    sectionLabel: secLabel,
                  });
                }
              });
            });
          }
        } catch {}
      }

      setAllData({ leads, deals, clients, bugs, requests, competitors, contentItems, assets, wikiPages, linkEntries });
    } catch {}
    setLoading(false);
  };

  const results = useMemo(() => {
    if (!query.trim() || !allData) return [];

    const q = query.toLowerCase();
    const sections = [];

    // Leads
    const matchedLeads = allData.leads.filter(l =>
      (l.companyName || '').toLowerCase().includes(q) ||
      (l.contactName || '').toLowerCase().includes(q) ||
      (l.email || '').toLowerCase().includes(q)
    ).slice(0, 3).map(l => ({
      id: l.id,
      category: 'leads',
      title: l.companyName || '',
      subtitle: l.contactName || l.email || '',
      badge: l.stage || '',
      badgeStyle: STAGE_STYLES[l.stage] || 'bg-gray-100 text-gray-600',
      meta: l.leadOwner || '',
      type: 'lead',
      navigate: () => {
        addRecent({ type: 'lead', id: l.id, title: l.companyName, category: 'leads' });
        onNavigate({ tab: 'pipeline', focusType: 'lead', focusId: l.id });
      },
    }));
    if (matchedLeads.length) {
      sections.push({
        key: 'leads',
        label: '📊 Leads',
        items: matchedLeads,
        total: allData.leads.filter(l =>
          (l.companyName || '').toLowerCase().includes(q) ||
          (l.contactName || '').toLowerCase().includes(q) ||
          (l.email || '').toLowerCase().includes(q)
        ).length,
        seeAllTab: 'pipeline',
        seeAllLabel: 'Pipeline',
      });
    }

    // Deals
    const matchedDeals = allData.deals.filter(d =>
      (d.clientName || '').toLowerCase().includes(q)
    ).slice(0, 3).map(d => ({
      id: d.id,
      category: 'deals',
      title: d.clientName || '',
      subtitle: `${d.plan || ''} · ${d.monthlyValue ? '£' + Math.round(d.monthlyValue) + '/mo' : ''}`,
      badge: d.status || '',
      badgeStyle: d.status === 'Active' ? 'bg-green-50 text-green-700' : d.status === 'Churned' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
      meta: '',
      type: 'deal',
      navigate: () => {
        addRecent({ type: 'deal', id: d.id, title: d.clientName, category: 'deals' });
        onNavigate({ tab: 'deals', focusType: 'deal', focusId: d.id });
      },
    }));
    if (matchedDeals.length) {
      sections.push({
        key: 'deals',
        label: '💼 Deals',
        items: matchedDeals,
        total: allData.deals.filter(d => (d.clientName || '').toLowerCase().includes(q)).length,
        seeAllTab: 'deals',
        seeAllLabel: 'Deals',
      });
    }

    // Assets
    const matchedAssets = allData.assets.filter(a =>
      (a.title || '').toLowerCase().includes(q)
    ).slice(0, 3).map(a => ({
      id: a.id,
      category: 'assets',
      title: a.title || '',
      subtitle: a.type || '',
      badge: a.status || '',
      badgeStyle: a.status === 'Good to Use' ? 'bg-green-50 text-green-700' : a.status === 'Needs Creating' ? 'bg-red-50 text-red-600' : 'bg-amber-50 text-amber-700',
      meta: '',
      type: 'asset',
      navigate: () => {
        addRecent({ type: 'asset', id: a.id, title: a.title, category: 'assets' });
        onNavigate({ tab: 'assets', focusType: 'asset', focusId: a.id });
      },
    }));
    if (matchedAssets.length) {
      sections.push({
        key: 'assets',
        label: '📦 Assets',
        items: matchedAssets,
        total: allData.assets.filter(a => (a.title || '').toLowerCase().includes(q)).length,
        seeAllTab: 'assets',
        seeAllLabel: 'Sales Assets',
      });
    }

    // Clients
    const matchedClients = allData.clients.filter(c =>
      (c.name || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.contactEmail || '').toLowerCase().includes(q)
    ).slice(0, 3).map(c => ({
      id: c.id,
      category: 'clients',
      title: c.name || '',
      subtitle: c.contactName || c.contactEmail || '',
      badge: c.status || '',
      badgeStyle: CLIENT_STATUS[c.status] || 'bg-gray-100 text-gray-600',
      meta: c.owner || '',
      type: 'client',
      navigate: () => {
        addRecent({ type: 'client', id: c.id, title: c.name, category: 'clients' });
        onNavigate({ tab: 'clients', focusType: 'client', focusId: c.id });
      },
    }));
    if (matchedClients.length) {
      sections.push({
        key: 'clients',
        label: '🏢 Clients',
        items: matchedClients,
        total: allData.clients.filter(c =>
          (c.name || '').toLowerCase().includes(q) ||
          (c.contactName || '').toLowerCase().includes(q) ||
          (c.contactEmail || '').toLowerCase().includes(q)
        ).length,
        seeAllTab: 'clients',
        seeAllLabel: 'Clients',
      });
    }

    // Bugs
    const matchedBugs = allData.bugs.filter(b =>
      (b.title || '').toLowerCase().includes(q)
    ).slice(0, 3).map(b => ({
      id: b.id,
      category: 'bugs',
      title: b.title || '',
      subtitle: b.clientName || '',
      badge: b.priority || '',
      badgeStyle: PRIORITY_STYLES[b.priority] || 'bg-gray-100 text-gray-600',
      meta: b.status || '',
      type: 'bug',
      navigate: () => {
        addRecent({ type: 'bug', id: b.id, title: b.title, category: 'bugs' });
        onNavigate({ tab: 'bugs', focusType: 'bug', focusId: b.id });
      },
    }));
    if (matchedBugs.length) {
      sections.push({
        key: 'bugs',
        label: '🐛 Bugs',
        items: matchedBugs,
        total: allData.bugs.filter(b => (b.title || '').toLowerCase().includes(q)).length,
        seeAllTab: 'bugs',
        seeAllLabel: 'Bug Tracker',
      });
    }

    // Requests / Tasks
    const matchedTasks = allData.requests.filter(r =>
      (r.title || '').toLowerCase().includes(q)
    ).slice(0, 3).map(r => ({
      id: r.id,
      category: 'tasks',
      title: r.title || '',
      subtitle: r.assignedTo || r.recipient || '',
      badge: r.priority || '',
      badgeStyle: PRIORITY_STYLES[r.priority] || 'bg-gray-100 text-gray-600',
      meta: r.status || '',
      type: 'request',
      navigate: () => {
        addRecent({ type: 'request', id: r.id, title: r.title, category: 'tasks' });
        onNavigate({ tab: 'team-board', focusType: 'request', focusId: r.id });
      },
    }));
    if (matchedTasks.length) {
      sections.push({
        key: 'tasks',
        label: '✅ Tasks',
        items: matchedTasks,
        total: allData.requests.filter(r => (r.title || '').toLowerCase().includes(q)).length,
        seeAllTab: 'team-board',
        seeAllLabel: 'Team Board',
      });
    }

    // Competitors
    const matchedCompetitors = allData.competitors.filter(c =>
      (c.companyName || '').toLowerCase().includes(q)
    ).slice(0, 3).map(c => ({
      id: c.id,
      category: 'competitors',
      title: c.companyName || '',
      subtitle: c.category || '',
      badge: c.threatLevel || '',
      badgeStyle: THREAT_STYLES[c.threatLevel] || 'bg-gray-100 text-gray-600',
      meta: '',
      type: 'competitor',
      navigate: () => {
        addRecent({ type: 'competitor', id: c.id, title: c.companyName, category: 'competitors' });
        onNavigate({ tab: 'competitors', focusType: 'competitor', focusId: c.id });
      },
    }));
    if (matchedCompetitors.length) {
      sections.push({
        key: 'competitors',
        label: '🔍 Competitors',
        items: matchedCompetitors,
        total: allData.competitors.filter(c => (c.companyName || '').toLowerCase().includes(q)).length,
        seeAllTab: 'competitors',
        seeAllLabel: 'Competitors',
      });
    }

    // Content Items
    const matchedContent = allData.contentItems.filter(c =>
      (c.title || '').toLowerCase().includes(q)
    ).slice(0, 3).map(c => ({
      id: c.id,
      category: 'content',
      title: c.title || '',
      subtitle: c.platform || 'LinkedIn',
      badge: c.status || '',
      badgeStyle: CONTENT_STATUS[c.status] || 'bg-gray-100 text-gray-600',
      meta: '',
      type: 'content',
      navigate: () => {
        addRecent({ type: 'content', id: c.id, title: c.title, category: 'content' });
        onNavigate({ tab: 'marketing', focusType: 'content', focusId: c.id });
      },
    }));
    if (matchedContent.length) {
      sections.push({
        key: 'content',
        label: '📝 Content',
        items: matchedContent,
        total: allData.contentItems.filter(c => (c.title || '').toLowerCase().includes(q)).length,
        seeAllTab: 'marketing',
        seeAllLabel: 'Content Hub',
      });
    }

    // Wiki pages
    const matchedWiki = allData.wikiPages.filter(p =>
      (p.title || '').toLowerCase().includes(q) ||
      (p.content || '').toLowerCase().includes(q) ||
      (p.description || '').toLowerCase().includes(q)
    ).slice(0, 3).map(p => ({
      id: p.id,
      category: 'wiki',
      title: p.title || '',
      subtitle: `${p.sectionLabel}`,
      badge: '',
      badgeStyle: '',
      meta: '',
      type: 'wiki',
      navigate: () => {
        addRecent({ type: 'wiki', id: p.id, title: p.title, category: 'wiki' });
        onNavigate({ tab: 'handbook', focusType: 'wiki', focusId: p.id, sectionId: p.sectionId });
      },
    }));
    if (matchedWiki.length) {
      sections.push({
        key: 'wiki',
        label: '📄 Wiki',
        items: matchedWiki,
        total: allData.wikiPages.filter(p =>
          (p.title || '').toLowerCase().includes(q) ||
          (p.content || '').toLowerCase().includes(q) ||
          (p.description || '').toLowerCase().includes(q)
        ).length,
        seeAllTab: 'handbook',
        seeAllLabel: 'Wiki',
      });
    }

    // Links
    const matchedLinks = allData.linkEntries.filter(l =>
      (l.title || '').toLowerCase().includes(q) ||
      (l.description || '').toLowerCase().includes(q)
    ).slice(0, 3).map(l => ({
      id: l.id,
      category: 'links',
      title: l.title || '',
      subtitle: l.section || '',
      badge: '',
      badgeStyle: '',
      meta: '',
      type: 'link',
      url: l.url,
      navigate: () => {
        addRecent({ type: 'link', id: l.id, title: l.title, category: 'links' });
        if (l.url && !l.url.startsWith('internal:')) {
          window.open(l.url, '_blank');
        } else {
          onNavigate({ tab: 'handbook', focusType: 'link', sectionId: l.section?.toLowerCase().includes('link') ? 'links' : '' });
        }
      },
    }));
    if (matchedLinks.length) {
      sections.push({
        key: 'links',
        label: '🔗 Links',
        items: matchedLinks,
        total: allData.linkEntries.filter(l =>
          (l.title || '').toLowerCase().includes(q) ||
          (l.description || '').toLowerCase().includes(q)
        ).length,
        seeAllTab: 'links',
        seeAllLabel: 'Link Space',
      });
    }

    return sections;
  }, [query, allData]);

  // Flatten all result items for keyboard nav
  const flatItems = useMemo(() => {
    return results.reduce((acc, section) => [...acc, ...section.items], []);
  }, [results]);

  // Reset selected index when results change
  useEffect(() => {
    setSelectedIndex(flatItems.length > 0 ? 0 : -1);
  }, [flatItems.length]);

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, flatItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && selectedIndex >= 0 && flatItems[selectedIndex]) {
      e.preventDefault();
      flatItems[selectedIndex].navigate();
      onClose();
    } else if (e.key === 'Escape') {
      onClose();
    }
  };

  const showRecent = !query.trim() && recentItems.length > 0;

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[100] flex items-start justify-center pt-[15vh]"
          onClick={onClose}
        >
          <div
            className="w-full max-w-[600px] mx-4 rounded-2xl shadow-2xl overflow-hidden bg-white dark:bg-[#1E1E2E] border border-[#EBEBEB] dark:border-[#2E2E4E]"
            onClick={e => e.stopPropagation()}
          >
            {/* Search input */}
            <div className="flex items-center gap-3 px-5 py-4 border-b border-[#EBEBEB] dark:border-[#2E2E4E]">
              <Search className="w-5 h-5 text-[#9CA3AF] shrink-0" />
              <input
                ref={inputRef}
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search leads, clients, assets, tasks, wiki pages…"
                className="flex-1 text-base bg-transparent border-none outline-none text-[#242450] dark:text-[#E8E8F0] placeholder:text-[#9CA3AF]"
                autoComplete="off"
                spellCheck={false}
              />
              <span className="text-[11px] text-[#9CA3AF] bg-[#F3F4F6] dark:bg-[#252535] px-2 py-0.5 rounded-md font-medium shrink-0 hidden sm:block">
                Esc to close
              </span>
              <button
                onClick={onClose}
                className="p-1.5 text-[#9CA3AF] hover:text-[#374151] dark:hover:text-[#E8E8F0] rounded-lg hover:bg-[#F3F4F6] dark:hover:bg-[#252535] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Results area */}
            <div className="max-h-[420px] overflow-y-auto" ref={resultsRef}>
              {loading && (
                <div className="flex items-center justify-center py-12">
                  <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
                </div>
              )}

              {!loading && query.trim() && flatItems.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12">
                  <Search className="w-8 h-8 text-[#D1D5DB] mb-3" />
                  <p className="text-sm text-[#6B7280]">
                    No results for '<span className="font-semibold text-[#374151]">{query}</span>'
                  </p>
                </div>
              )}

              {!loading && showRecent && (
                <div className="py-3">
                  <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.12em] px-5 mb-2">
                    Recent
                  </p>
                  {recentItems.map((item, i) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className="flex items-center gap-3 px-5 py-2.5 cursor-pointer hover:bg-[#F3E8FF]/50 transition-colors"
                      onClick={() => {
                        const { type, id } = item;
                        onNavigate({ tab:
                          type === 'lead' ? 'pipeline' :
                          type === 'deal' ? 'deals' :
                          type === 'client' ? 'clients' :
                          type === 'asset' ? 'assets' :
                          type === 'bug' ? 'bugs' :
                          type === 'request' ? 'team-board' :
                          type === 'competitor' ? 'competitors' :
                          type === 'content' ? 'marketing' :
                          type === 'wiki' ? 'handbook' :
                          type === 'link' ? 'links' : 'pipeline',
                          focusType: type,
                          focusId: id,
                        });
                        onClose();
                      }}
                    >
                      <Clock className="w-4 h-4 text-[#9CA3AF] shrink-0" />
                      <span className="text-sm text-[#374151] dark:text-[#C0C0E0] truncate">{item.title}</span>
                      <span className="text-[11px] text-[#9CA3AF] ml-auto shrink-0">
                        {CATEGORY_CONFIG[item.category]?.label}
                      </span>
                    </div>
                  ))}

                  {/* Quick links */}
                  <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.12em] px-5 mt-4 mb-2">
                    Quick links
                  </p>
                  <div className="flex flex-wrap gap-2 px-5 pb-3">
                    {QUICK_LINKS.map(link => (
                      <button
                        key={link.tab}
                        onClick={() => { onNavigate({ tab: link.tab }); onClose(); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-[#F3F4F6] dark:bg-[#252535] rounded-xl text-sm font-medium text-[#374151] dark:text-[#C0C0E0] hover:bg-[#F3E8FF] hover:text-[#8403C5] transition-colors"
                      >
                        <span>{link.emoji}</span> {link.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {!loading && query.trim() && results.map((section, si) => (
                <div key={section.key} className="pb-1">
                  <div className="flex items-center justify-between px-5 py-2">
                    <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.12em]">
                      {section.label}
                    </p>
                    {section.total > 3 && (
                      <button
                        onClick={() => { onNavigate({ tab: section.seeAllTab }); onClose(); }}
                        className="text-[11px] font-medium text-[#8403C5] hover:underline"
                      >
                        See all {section.total} in {section.seeAllLabel} →
                      </button>
                    )}
                  </div>
                  {section.items.map((item, ii) => {
                    const flatIdx = flatItems.indexOf(item);
                    return (
                      <SearchResultRow
                        key={item.id || `${section.key}-${ii}`}
                        item={item}
                        query={query}
                        selected={flatIdx === selectedIndex}
                        onClick={() => { item.navigate(); onClose(); }}
                        onMouseEnter={() => setSelectedIndex(flatIdx)}
                      />
                    );
                  })}
                </div>
              ))}

              {/* Keyboard hints footer */}
              {!loading && flatItems.length > 0 && (
                <div className="flex items-center gap-4 px-5 py-2.5 border-t border-[#EBEBEB] dark:border-[#2E2E4E] text-[11px] text-[#9CA3AF]">
                  <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3" /><ArrowDown className="w-3 h-3" /> navigate
                  </span>
                  <span className="flex items-center gap-1">
                    <CornerDownLeft className="w-3 h-3" /> open
                  </span>
                  <span className="flex items-center gap-1 ml-auto">
                    esc close
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}