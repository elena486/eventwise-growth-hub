import React from 'react';
import { ChevronDown, ChevronRight, Plus } from 'lucide-react';

export default function HandbookSidebar({ sections, activePage, onSelectPage, onToggleSection, onAddPage }) {
  return (
    <div className="w-56 shrink-0 bg-[#242450] flex flex-col overflow-y-auto h-full">
      <div className="px-4 py-4 border-b border-white/10">
        <p className="text-[11px] font-bold text-white/40 uppercase tracking-[0.15em]">Handbook</p>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
        {sections.map(section => (
          <div key={section.id} className="mb-1">
            {/* Section header */}
            <button
              onClick={() => onToggleSection(section.id)}
              className="w-full flex items-center justify-between px-4 py-2 text-left group"
            >
              <span className="text-[12px] font-semibold text-white/80 group-hover:text-white transition-colors truncate">
                {section.label}
              </span>
              {section.expanded
                ? <ChevronDown className="w-3.5 h-3.5 text-white/40 shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-white/40 shrink-0" />}
            </button>

            {section.expanded && (
              <div className="pb-1">
                {section.pages.map(page => {
                  const isActive = activePage?.id === page.id;
                  return (
                    <button
                      key={page.id}
                      onClick={() => onSelectPage(section, page)}
                      className={`w-full text-left px-4 py-1.5 text-[12px] transition-all relative ${
                        isActive
                          ? 'text-white font-semibold'
                          : 'text-white/55 hover:text-white/85 font-normal'
                      }`}
                    >
                      {isActive && (
                        <span className="absolute left-0 top-1 bottom-1 w-0.5 bg-[#8403C5] rounded-r-full" />
                      )}
                      <span className="pl-3">{page.title}</span>
                    </button>
                  );
                })}
                <button
                  onClick={() => onAddPage(section.id)}
                  className="w-full flex items-center gap-1.5 pl-7 pr-4 py-1.5 text-[11px] text-white/30 hover:text-white/60 transition-colors"
                >
                  <Plus className="w-3 h-3" /> Add page
                </button>
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}