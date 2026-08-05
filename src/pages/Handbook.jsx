import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { DEFAULT_HANDBOOK } from '@/lib/handbookData';
import HandbookSidebar from '@/components/handbook/HandbookSidebar';
import HandbookContentPage from '@/components/handbook/HandbookContentPage';
import HandbookLinkPage from '@/components/handbook/HandbookLinkPage';
import ConsentResponsesPage from '@/components/handbook/pages/ConsentResponsesPage';

const STORAGE_KEY = 'handbook_v2';

export default function Handbook({ onNavigate, focusWikiPage, onFocusConsumed }) {
  const [hb, setHb] = useState(null);
  const hbRef = useRef(hb);
  hbRef.current = hb;
  const [activeSectionId, setActiveSectionId] = useState('company');
  const [activePageId, setActivePageId] = useState('about');
  const [loaded, setLoaded] = useState(false);

  // Merge missing default sections into loaded data
  const mergeDefaults = useCallback((parsed) => {
    let changed = false;
    const defaultOrder = DEFAULT_HANDBOOK.sections.map(s => s.id);

    // 1. Backfill missing pages within existing sections
    let sections = parsed.sections.map(section => {
      const defaultSection = DEFAULT_HANDBOOK.sections.find(s => s.id === section.id);
      if (!defaultSection) return section;
      const existingPageIds = new Set((section.pages || []).map(p => p.id));
      const missingPages = defaultSection.pages.filter(p => !existingPageIds.has(p.id));
      if (missingPages.length === 0) return section;
      changed = true;
      const pageOrder = defaultSection.pages.map(p => p.id);
      const mergedPages = [...(section.pages || [])];
      missingPages.forEach(missingPage => {
        const defaultIdx = pageOrder.indexOf(missingPage.id);
        let insertAfterIdx = -1;
        for (let i = defaultIdx - 1; i >= 0; i--) {
          const pos = mergedPages.findIndex(p => p.id === pageOrder[i]);
          if (pos !== -1) { insertAfterIdx = pos; break; }
        }
        mergedPages.splice(insertAfterIdx + 1, 0, missingPage);
      });
      return { ...section, pages: mergedPages };
    });

    // 2. Backfill missing sections entirely
    const existingIds = new Set(sections.map(s => s.id));
    const missingSections = DEFAULT_HANDBOOK.sections.filter(s => !existingIds.has(s.id));
    if (missingSections.length > 0) {
      changed = true;
      missingSections.forEach(missing => {
        const defaultIdx = defaultOrder.indexOf(missing.id);
        let insertAfterIdx = -1;
        for (let i = defaultIdx - 1; i >= 0; i--) {
          const pos = sections.findIndex(s => s.id === defaultOrder[i]);
          if (pos !== -1) { insertAfterIdx = pos; break; }
        }
        sections.splice(insertAfterIdx + 1, 0, missing);
      });
    }

    if (!changed) return parsed;
    return { ...parsed, sections };
  }, []);

  // Load from DB — data stored as uploaded file URL to avoid size limits
  useEffect(() => {
    base44.entities.HandbookSection.filter({ sectionKey: STORAGE_KEY }).then(async results => {
      if (results.length > 0) {
        try {
          const record = results[0];
          let parsed = null;
          // Try loading from fileUrl first (new format), fall back to inline data (legacy)
          if (record.fileUrl) {
            const res = await fetch(record.fileUrl);
            parsed = await res.json();
          } else if (record.data) {
            parsed = JSON.parse(record.data);
          }
          if (parsed?.sections) {
            const merged = mergeDefaults(parsed);
            setHb(merged);
            // If we merged new sections, persist the update
            if (merged !== parsed) persist(merged, record);
            setLoaded(true);
            return;
          }
        } catch {}
      }
      setHb(DEFAULT_HANDBOOK);
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (newHb, existingRecord) => {
    // Upload JSON as a file to avoid entity field size limits
    const blob = new Blob([JSON.stringify(newHb)], { type: 'application/json' });
    const file = new File([blob], 'handbook.json', { type: 'application/json' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file });

    const payload = { sectionKey: STORAGE_KEY, fileUrl: file_url, data: '' };
    const results = existingRecord
      ? [existingRecord]
      : await base44.entities.HandbookSection.filter({ sectionKey: STORAGE_KEY });

    if (results.length > 0) {
      await base44.entities.HandbookSection.update(results[0].id, payload);
    } else {
      await base44.entities.HandbookSection.create(payload);
    }
  }, []);

  const updateHb = useCallback((newHb) => {
    setHb(newHb);
    return persist(newHb);
  }, [persist]);

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
    // Use hbRef.current instead of hb from closure — the autosave hook's
    // unmount cleanup can call this with a stale closure, which would
    // overwrite newer state (e.g. section expansion from selectPage).
    const currentHb = hbRef.current;
    return updateHb({
      ...currentHb,
      sections: currentHb.sections.map(s =>
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
    const today = new Date().toISOString().slice(0, 10);
    const newPage = {
      id: `page-${Date.now()}`,
      title: 'New Page',
      type: 'content',
      description: '',
      content: '',
      updatedAt: today,
      createdAt: today,
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

  const addSection = () => {
    const newSection = {
      id: `section-${Date.now()}`,
      label: 'New Section',
      expanded: true,
      pages: [],
    };
    updateHb({ ...hb, sections: [...hb.sections, newSection] });
    setActiveSectionId(newSection.id);
  };

  const handleInternalNavigate = (tab) => {
    if (onNavigate) onNavigate(tab);
  };

  // Track recently viewed when wiki page opens
  useEffect(() => {
    if (!loaded || !hb || !activePage) return;
    const section = hb.sections.find(s => s.id === activeSectionId);
    const sectionLabel = section?.label || 'Eventwise Wiki';
    addRecentlyViewed({
      type: 'wiki',
      name: activePage.title || 'Untitled Page',
      section: `Wiki → ${sectionLabel}`,
      tab: 'handbook',
      recordId: activePage.id,
      sectionId: activeSectionId,
    });
  }, [activePageId, activeSectionId, loaded, hb]);

  // Focus wiki page from global search
  useEffect(() => {
    if (!focusWikiPage || !loaded || !hb) return;
    const { pageId, sectionId } = focusWikiPage;
    if (pageId) setActivePageId(pageId);
    if (sectionId) setActiveSectionId(sectionId);
    onFocusConsumed?.();
  }, [focusWikiPage, loaded, hb]);

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
        onAddSection={addSection}
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
            allowEdit: true,
          };
          if (activePage.id === 'marketing-consent') return <ConsentResponsesPage {...props} />;
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