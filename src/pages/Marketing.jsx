import React, { useState } from 'react';
import ContentHub from '@/components/marketing/ContentHub';

const SECTIONS = [
  { id: 'content', label: 'Content Hub' },
  { id: 'reporting', label: 'Reporting' },
];

export default function Marketing() {
  const [section, setSection] = useState('content');

  return (
    <div className="flex-1 bg-ew-bg overflow-hidden flex flex-col font-dm">
      {/* Sub-nav */}
      <div className="bg-white border-b border-ew-border px-8 py-3 flex items-center gap-1 shrink-0">
        <h1 className="text-base font-bold text-navy mr-4">Marketing</h1>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setSection(s.id)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${section === s.id ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg'}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto">
        {section === 'content' && <ContentHub />}
        {section === 'reporting' && <MarketingReporting />}
      </div>
    </div>
  );
}

function MarketingReporting() {
  return (
    <div className="p-8 max-w-3xl mx-auto">
      <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
        <p className="text-2xl mb-3">📊</p>
        <h2 className="text-base font-bold text-navy mb-2">Marketing Reporting</h2>
        <p className="text-sm text-ew-muted">Monthly reports, MoM trend charts, and "Send to Chris" email live here.</p>
        <p className="text-xs text-ew-muted mt-2">Reports module coming soon — contact Elena to migrate existing data.</p>
      </div>
    </div>
  );
}