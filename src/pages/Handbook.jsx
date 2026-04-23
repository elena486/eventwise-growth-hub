import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_HANDBOOK } from '@/lib/handbookData';
import HandbookSidebar from '@/components/handbook/HandbookSidebar';
import HandbookContentPage from '@/components/handbook/HandbookContentPage';
import HandbookLinkPage from '@/components/handbook/HandbookLinkPage';
import AboutPage from '@/components/handbook/pages/AboutPage';
import BrandPage from '@/components/handbook/pages/BrandPage';
import TechStackPage from '@/components/handbook/pages/TechStackPage';
import TeamPage from '@/components/handbook/pages/TeamPage';

const STORAGE_KEY = 'handbook_v2';

export default function Handbook({ onNavigate }) {
  const [hb, setHb] = useState(null);
  const [activeSectionId, setActiveSectionId] = useState('company');
  const [activePageId, setActivePageId] = useState('about');
  const [loaded, setLoaded] = useState(false);

  // Load from DB — merge in any new default sections missing from saved data
  useEffect(() => {
    base44.entities.HandbookSection.filter({ sectionKey: STORAGE_KEY }).then(results => {
      if (results.length > 0) {
        try {
          const parsed = JSON.parse(results[0].data || '{}');
          if (parsed.sections) {
            // Inject any default sections not present in saved data
            const existingIds = new Set(parsed.sections.map(s => s.id));
            const missingSections = DEFAULT_HANDBOOK.sections.filter(s => !existingIds.has(s.id));
            if (missingSections.length > 0) {
              // Insert missing sections in the correct position relative to DEFAULT order
              const defaultOrder = DEFAULT_HANDBOOK.sections.map(s => s.id);
              const merged = [...parsed.sections];
              missingSections.forEach(missing => {
                const defaultIdx = defaultOrder.indexOf(missing.id);
                // Find the best insertion point: after the previous default section that exists
                let insertAfterIdx = -1;
                for (let i = defaultIdx - 1; i >= 0; i--) {
                  const prevId = defaultOrder[i];
                  const pos = merged.findIndex(s => s.id === prevId);
                  if (pos !== -1) { insertAfterIdx = pos; break; }
                }
                merged.splice(insertAfterIdx + 1, 0, missing);
              });
              const migrated = { ...parsed, sections: merged };
              setHb(migrated);
              // Persist the migrated version
              base44.entities.HandbookSection.update(results[0].id, { sectionKey: STORAGE_KEY, data: JSON.stringify(migrated) });
            } else {
              setHb(parsed);
            }
            setLoaded(true);
            return;
          }
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
    if (remaining.length > 0) {
      setActivePageId(remaining[0].id);
    } else {
      const firstSection = newHb.sections[0];
      setActiveSectionId(firstSection.id);
      setActivePageId(firstSection.pages[0]?.id || '');
    }
  };

  const renamePage = (sectionId, pageId, newTitle) => {
    updateHb({
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId
          ? { ...s, pages: s.pages.map(p => p.id === pageId ? { ...p, title: newTitle } : p) }
          : s
      ),
    });
  };

  const renameSection = (sectionId, newLabel) => {
    updateHb({
      ...hb,
      sections: hb.sections.map(s =>
        s.id === sectionId ? { ...s, label: newLabel } : s
      ),
    });
  };

  const deleteSection = (sectionId) => {
    const newSections = hb.sections.filter(s => s.id !== sectionId);
    const newHb = { ...hb, sections: newSections };
    updateHb(newHb);
    if (newSections.length > 0) {
      setActiveSectionId(newSections[0].id);
      setActivePageId(newSections[0].pages[0]?.id || '');
    }
  };

  const reorderPages = (sectionId, draggedPageId, targetPageId) => {
    const section = hb.sections.find(s => s.id === sectionId);
    if (!section) return;
    const pages = [...section.pages];
    const fromIdx = pages.findIndex(p => p.id === draggedPageId);
    const toIdx = pages.findIndex(p => p.id === targetPageId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = pages.splice(fromIdx, 1);
    pages.splice(toIdx, 0, moved);
    updateHb({
      ...hb,
      sections: hb.sections.map(s => s.id === sectionId ? { ...s, pages } : s),
    });
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
        onRenamePage={renamePage}
        onDeletePage={deletePage}
        onRenameSection={renameSection}
        onDeleteSection={deleteSection}
        onReorderPages={reorderPages}
      />

      <div className="flex-1 overflow-hidden flex">
        {activePage ? (() => {
          const props = {
            key: activePage.id,
            section: activeSection,
            page: activePage,
            onUpdate: (updated) => updatePage(activeSection.id, updated),
            onDelete: () => deletePage(activeSection.id, activePage.id),
          };
          if (activePage.id === 'about')      return <AboutPage {...props} />;
          if (activePage.id === 'brand')      return <BrandPage {...props} />;
          if (activePage.id === 'techstack')  return <TechStackPage {...props} />;
          if (activePage.id === 'team-roles') return <TeamPage {...props} />;
          if (activePage.type === 'link')     return <HandbookLinkPage {...props} onNavigate={handleInternalNavigate} />;
          return <HandbookContentPage {...props} />;
        })() : (
          <div className="flex-1 flex items-center justify-center bg-[#F7F8FC]">
            <p className="text-ew-muted text-sm">Select a page from the sidebar.</p>
          </div>
        )}
      </div>
    </div>
  );
}