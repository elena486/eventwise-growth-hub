import React from 'react';
import { X, ExternalLink } from 'lucide-react';

const THREAT_STYLES = {
  High:    'bg-red-50 text-red-600 border-red-200',
  Medium:  'bg-amber-50 text-amber-700 border-amber-200',
  Low:     'bg-green-50 text-green-700 border-green-200',
  Monitor: 'bg-gray-100 text-gray-600 border-gray-200',
};

const CAT_STYLES = {
  'Forecasting Tool':         'bg-blue-50 text-blue-700',
  'Event Management':         'bg-purple-50 text-purple-700',
  'Procurement & Approvals':  'bg-orange-50 text-orange-600',
  'Accounting Software':      'bg-teal-50 text-teal-700',
  'Project Management':       'bg-indigo-50 text-indigo-700',
  'Expense Management':       'bg-pink-50 text-pink-700',
  'Other':                    'bg-gray-100 text-gray-600',
};

const FIELDS = [
  { label: 'Category', key: 'category', render: (v) => v ? <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${CAT_STYLES[v] || 'bg-gray-100 text-gray-600'}`}>{v}</span> : '—' },
  { label: 'Threat Level', key: 'threatLevel', render: (v) => v ? <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${THREAT_STYLES[v]}`}>{v}</span> : '—' },
  { label: 'Pricing', key: 'pricing' },
  { label: 'Team Size', key: 'teamSize' },
  { label: 'Target Audience', key: 'targetAudience' },
  { label: 'Trustpilot', key: 'customerSatisfaction', render: (v) => {
    const m = v?.match(/(\d+\.?\d*)\s+on\s+Trustpilot/i);
    return m ? <span className="font-semibold text-amber-600">★ {m[1]}</span> : (v || '—');
  }},
  { label: 'Key Features', key: 'keyFeatures' },
  { label: 'Main Differences vs Eventwise', key: 'mainDifferences' },
  { label: 'Platform Adaptability', key: 'platformAdaptability' },
  { label: 'Market Strategy', key: 'marketStrategy' },
  { label: 'Tech Stack', key: 'techStack' },
  { label: 'Integrations', key: 'integrations' },
  { label: 'Customer Support', key: 'customerSupport' },
  { label: 'Notes', key: 'notes' },
];

export default function ComparePanel({ competitors, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto p-4 py-8">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-[95vw] font-dm">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border sticky top-0 bg-white rounded-t-xl z-10">
          <h2 className="text-base font-bold text-navy">Side-by-side comparison ({competitors.length} competitors)</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] min-w-[160px] sticky left-0 bg-ew-footer z-10">Field</th>
                {competitors.map(c => (
                  <th key={c.id} className="px-4 py-3 text-left min-w-[220px]">
                    <div className="font-bold text-navy text-sm">{c.companyName}</div>
                    {c.url && (
                      <a href={c.url} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
                        className="inline-flex items-center gap-1 text-[11px] text-ew-muted hover:text-[#8403C5] transition-colors mt-0.5">
                        <ExternalLink className="w-2.5 h-2.5" /> Visit
                      </a>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FIELDS.map((f, fi) => (
                <tr key={f.key} className={fi % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFE]'}>
                  <td className={`px-4 py-3 text-[11px] font-semibold text-ew-muted uppercase tracking-[0.08em] whitespace-nowrap sticky left-0 z-10 ${fi % 2 === 0 ? 'bg-white' : 'bg-[#FAFBFE]'}`}>
                    {f.label}
                  </td>
                  {competitors.map(c => (
                    <td key={c.id} className="px-4 py-3 text-xs text-ew-body align-top max-w-[260px]">
                      {f.render ? f.render(c[f.key]) : (c[f.key] || <span className="text-ew-muted italic">—</span>)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}