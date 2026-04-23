import React, { useState, useRef } from 'react';
import { ChevronDown, ChevronRight, Plus, Pencil, Trash2, GripVertical, Check, X } from 'lucide-react';

export default function HandbookSidebar({
  sections,
  activePage,
  onSelectPage,
  onToggleSection,
  onAddPage,
  onRenamePage,
  onDeletePage,
  onRenameSection,
  onDeleteSection,
  onReorderPages,
}) {
  const [renamingPage, setRenamingPage] = useState(null); // { sectionId, pageId }
  const [renamePageVal, setRenamePageVal] = useState('');
  const [renamingSection, setRenamingSection] = useState(null); // sectionId
  const [renameSectionVal, setRenameSectionVal] = useState('');
  const [deletePageConfirm, setDeletePageConfirm] = useState(null); // { sectionId, pageId, title }
  const [deleteSectionConfirm, setDeleteSectionConfirm] = useState(null); // { sectionId, label }
  const [draggingPage, setDraggingPage] = useState(null); // { sectionId, pageId }
  const [dragOverPage, setDragOverPage] = useState(null); // { sectionId, pageId }

  const startRenamePage = (sectionId, pageId, currentTitle, e) => {
    e.stopPropagation();
    setRenamingPage({ sectionId, pageId });
    setRenamePageVal(currentTitle);
  };

  const commitRenamePage = () => {
    if (renamingPage && renamePageVal.trim() && onRenamePage) {
      onRenamePage(renamingPage.sectionId, renamingPage.pageId, renamePageVal.trim());
    }
    setRenamingPage(null);
  };

  const startRenameSection = (sectionId, currentLabel, e) => {
    e.stopPropagation();
    setRenamingSection(sectionId);
    // Strip emoji prefix
    setRenameSectionVal(currentLabel.replace(/^[^\w]+/, '').trim());
  };

  const commitRenameSection = () => {
    if (renamingSection && renameSectionVal.trim() && onRenameSection) {
      onRenameSection(renamingSection, renameSectionVal.trim());
    }
    setRenamingSection(null);
  };

  const handleDragStart = (sectionId, pageId) => {
    setDraggingPage({ sectionId, pageId });
  };

  const handleDragOver = (e, sectionId, pageId) => {
    e.preventDefault();
    if (draggingPage?.sectionId !== sectionId) return;
    if (dragOverPage?.pageId !== pageId) setDragOverPage({ sectionId, pageId });
  };

  const handleDrop = (e, sectionId, targetPageId) => {
    e.preventDefault();
    if (!draggingPage || draggingPage.sectionId !== sectionId || draggingPage.pageId === targetPageId) {
      setDraggingPage(null);
      setDragOverPage(null);
      return;
    }
    if (onReorderPages) onReorderPages(sectionId, draggingPage.pageId, targetPageId);
    setDraggingPage(null);
    setDragOverPage(null);
  };

  const handleDragEnd = () => {
    setDraggingPage(null);
    setDragOverPage(null);
  };

  return (
    <>
      <div className="w-56 shrink-0 bg-[#242450] flex flex-col overflow-y-auto h-full">
        <div className="px-4 py-4 border-b border-white/10">
          <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">Eventwise Wiki</p>
        </div>
        <nav className="flex-1 py-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
          {sections.map(section => (
            <div key={section.id} className="mb-1">
              {/* Section header */}
              <div className="group flex items-center px-3 py-1.5">
                <button
                  onClick={() => onToggleSection(section.id)}
                  className="flex-1 flex items-center gap-1 text-left min-w-0"
                >
                  {section.expanded
                    ? <ChevronDown className="w-3 h-3 text-white/30 shrink-0" />
                    : <ChevronRight className="w-3 h-3 text-white/30 shrink-0" />}
                  {renamingSection === section.id ? (
                    <input
                      autoFocus
                      className="text-[11px] font-bold bg-white/10 text-white outline-none rounded px-1 flex-1 min-w-0 uppercase tracking-[0.08em]"
                      value={renameSectionVal}
                      onChange={e => setRenameSectionVal(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') commitRenameSection();
                        if (e.key === 'Escape') setRenamingSection(null);
                        e.stopPropagation();
                      }}
                      onClick={e => e.stopPropagation()}
                    />
                  ) : (
                    <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] group-hover:text-white/70 transition-colors truncate">
                      {section.label}
                    </span>
                  )}
                </button>
                <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1 shrink-0">
                  {renamingSection === section.id ? (
                    <>
                      <button onClick={commitRenameSection} className="p-0.5 text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
                      <button onClick={() => setRenamingSection(null)} className="p-0.5 text-white/40 hover:text-white/80"><X className="w-3 h-3" /></button>
                    </>
                  ) : (
                    <>
                      <button onClick={e => startRenameSection(section.id, section.label, e)} className="p-0.5 text-white/30 hover:text-white/80" title="Rename section"><Pencil className="w-3 h-3" /></button>
                      <button onClick={e => { e.stopPropagation(); setDeleteSectionConfirm({ sectionId: section.id, label: section.label }); }} className="p-0.5 text-white/30 hover:text-red-400" title="Delete section"><Trash2 className="w-3 h-3" /></button>
                    </>
                  )}
                </div>
              </div>

              {section.expanded && (
                <div className="pb-1">
                  {section.pages.map(page => {
                    const isActive = activePage?.id === page.id;
                    const isDraggingThis = draggingPage?.pageId === page.id;
                    const isDragTarget = dragOverPage?.pageId === page.id && draggingPage?.sectionId === section.id;
                    const isRenaming = renamingPage?.pageId === page.id && renamingPage?.sectionId === section.id;

                    return (
                      <div
                        key={page.id}
                        draggable
                        onDragStart={() => handleDragStart(section.id, page.id)}
                        onDragOver={e => handleDragOver(e, section.id, page.id)}
                        onDrop={e => handleDrop(e, section.id, page.id)}
                        onDragEnd={handleDragEnd}
                        className={`group/page relative flex items-center transition-all ${isDraggingThis ? 'opacity-40' : ''} ${isDragTarget ? 'border-t-2 border-[#8403C5]' : ''}`}
                      >
                        {/* Active left border */}
                        {isActive && (
                          <span className="absolute left-0 top-0.5 bottom-0.5 w-[3px] bg-[#8403C5] rounded-r-full" />
                        )}
                        {/* Drag handle */}
                        <span className="pl-4 pr-1 opacity-0 group-hover/page:opacity-40 hover:!opacity-80 cursor-grab shrink-0">
                          <GripVertical className="w-3 h-3 text-white" />
                        </span>
                        {isRenaming ? (
                          <input
                            autoFocus
                            className="flex-1 text-[12px] bg-white/10 text-white outline-none rounded px-1 py-0.5 mx-1"
                            value={renamePageVal}
                            onChange={e => setRenamePageVal(e.target.value)}
                            onKeyDown={e => {
                              if (e.key === 'Enter') commitRenamePage();
                              if (e.key === 'Escape') setRenamingPage(null);
                              e.stopPropagation();
                            }}
                          />
                        ) : (
                          <button
                            onClick={() => onSelectPage(section, page)}
                            className={`flex-1 text-left py-1.5 pr-1 text-[12px] rounded transition-all truncate mx-1 px-2 ${
                              isActive
                                ? 'text-white font-semibold bg-white/10'
                                : 'text-[#6B7280] hover:text-white hover:bg-white/5 font-normal'
                            }`}
                          >
                            {page.title}
                          </button>
                        )}
                        <div className="flex items-center gap-0.5 opacity-0 group-hover/page:opacity-100 transition-opacity pr-2 shrink-0">
                          {isRenaming ? (
                            <>
                              <button onClick={commitRenamePage} className="p-0.5 text-green-400 hover:text-green-300"><Check className="w-3 h-3" /></button>
                              <button onClick={() => setRenamingPage(null)} className="p-0.5 text-white/40 hover:text-white/80"><X className="w-3 h-3" /></button>
                            </>
                          ) : (
                            <>
                              <button
                                onClick={e => startRenamePage(section.id, page.id, page.title, e)}
                                className="p-0.5 text-white/30 hover:text-white/80" title="Rename">
                                <Pencil className="w-3 h-3" />
                              </button>
                              <button
                                onClick={e => { e.stopPropagation(); setDeletePageConfirm({ sectionId: section.id, pageId: page.id, title: page.title }); }}
                                className="p-0.5 text-white/20 hover:text-red-400" title="Delete">
                                <Trash2 className="w-3 h-3" />
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <button
                    onClick={() => onAddPage(section.id)}
                    className="w-full flex items-center gap-1.5 pl-8 pr-4 py-1.5 text-[12px] text-[#8403C5] hover:text-purple-300 transition-colors opacity-0 hover:opacity-100 group-hover:opacity-100"
                  >
                    <Plus className="w-3 h-3" /> Add page
                  </button>
                </div>
              )}
            </div>
          ))}
        </nav>
      </div>

      {/* Delete page confirm */}
      {deletePageConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setDeletePageConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete page?</h3>
            <p className="text-sm text-ew-body mb-5">Delete <strong>{deletePageConfirm.title}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeletePageConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button
                onClick={() => { onDeletePage(deletePageConfirm.sectionId, deletePageConfirm.pageId); setDeletePageConfirm(null); }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete section confirm */}
      {deleteSectionConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={() => setDeleteSectionConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete section?</h3>
            <p className="text-sm text-ew-body mb-5">Delete the entire <strong>{deleteSectionConfirm.label}</strong> section and all its pages? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteSectionConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button
                onClick={() => { onDeleteSection(deleteSectionConfirm.sectionId); setDeleteSectionConfirm(null); }}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}