import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_HANDBOOK } from '@/lib/handbookData';
import HandbookSidebar from '@/components/handbook/HandbookSidebar';
import HandbookContentPage from '@/components/handbook/HandbookContentPage';
import HandbookLinkPage from '@/components/handbook/HandbookLinkPage';

const STORAGE_KEY = 'handbook_v2';

export default function Handbook({ onNavigate }) {
  const [hb, setHb] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState('company');
  const [activePageId, setActivePageId] = useState('about');
  const [loaded, setLoaded] = useState(false);

  // Load from DB
  useEffect(() => {
    base44.entities.HandbookSection.filter({ sectionKey: STORAGE_KEY }).then(results => {
      if (results.length > 0) {
        try {
          const parsed = JSON.parse(results[0].data || '{}');
          if (parsed.sections) { setHb(parsed); setLoaded(true); return; }
        } catch {}
      }
      setHb(DEFAULT_HANDBOOK);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback((newHb) => {
    const payload = { sectionKey: STORAGE_KEY, data: JSON.stringify(newHb) };
    base44.entities.HandbookSection.filter({ sectionKey: STORAGE_KEY }).then(results => {
      if (results.length > 0) base44.entities.HandbookSection.update(results[0].id, payload);
      else base44.entities.HandbookSection.create(payload);
    });
  }, []);

  const updateHb = (newHb) => {
    setHb(newHb);
    persist(newHb);
  };

  const toggleSection = (sectionId) => {
    updateHb({
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId ? { ...s, expanded: !s.expanded } : s
      ),
    });
  };

  const selectPage = (section, page) => {
    setActiveSectionId(section.id);
    setActivePageId(page.id);
    // Make sure section is expanded
    if (!section.expanded) {
      updateHb({ ...hb, sections: hb.sections.map(s => s.id === section.id ? { ...s, expanded: true } : s) });
    }
  };

  const updatePage = (sectionId, updatedPage) => {
    updateHb({
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId
          ? { ...s, pages: s.pages.map(p => p.id === updatedPage.id ? updatedPage : p) }
          : s
      ),
    });
  };

  const deletePage = (sectionId, pageId) => {
    const section = hb.sections.find(s => s.id === sectionId);
    const remaining = section?.pages.filter(p => p.id !== pageId) || [];
    const newHb = {
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId ? { ...s, pages: remaining } : s
      ),
    };
    updateHb(newHb);
    // Navigate to first page of section or first page of first section
    if (remaining.length > 0) {
      setActivePageId(remaining[0].id);
    } else {
      const firstSection = newHb.sections[0];
      setActiveSectionId(firstSection.id);
      setActivePageId(firstSection.pages[0]?.id || '');
    }
  };

  const addPage = (sectionId) => {
    const newPage = {
      id: `page-${Date.now()}`,
      title: 'New Page',
      type: 'content',
      description: '',
      content: '',
      updatedAt: new Date().toISOString().slice(0, 10),
    };
    const newHb = {
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId
          ? { ...s, expanded: true, pages: [...s.pages, newPage] }
          : s
      ),
    };
    updateHb(newHb);
    setActiveSectionId(sectionId);
    setActivePageId(newPage.id);
  };

  const handleInternalNavigate = (tab) => {
    if (onNavigate) onNavigate(tab);
  };

  if (!loaded || !hb) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F7F8FC]">
        <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
      </div>
    );
  }

  const activeSection = hb.sections.find(s => s.id === activeSectionId) || hb.sections[0];
  const activePage = activeSection?.pages.find(p => p.id === activePageId) || activeSection?.pages[0];

  return (
    <div className="flex-1 flex overflow-hidden font-dm">
      <HandbookSidebar
        sections={hb.sections}
        activePage={activePage}
        onSelectPage={selectPage}
        onToggleSection={toggleSection}
        onAddPage={addPage}
      />

      <div className="flex-1 overflow-hidden flex">
        {activePage ? (
          activePage.type === 'content' ? (
            <HandbookContentPage
              key={activePage.id}
              section={activeSection}
              page={activePage}
              onUpdate={(updated) => updatePage(activeSection.id, updated)}
              onDelete={() => deletePage(activeSection.id, activePage.id)}
            />
          ) : (
            <HandbookLinkPage
              key={activePage.id}
              section={activeSection}
              page={activePage}
              onUpdate={(updated) => updatePage(activeSection.id, updated)}
              onDelete={() => deletePage(activeSection.id, activePage.id)}
              onNavigate={handleInternalNavigate}
            />
          )
        ) : (
          <div className="flex-1 flex items-center justify-center bg-[#F7F8FC]">
            <p className="text-ew-muted text-sm">Select a page from the sidebar.</p>
          </div>
        )}
      </div>
    </div>
  );
}