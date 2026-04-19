import React from 'react';
import { ArrowLeft, ExternalLink, Pencil, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';

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

function Section({ title, children }) {
  if (!children) return null;
  return (
    <div>
      <h3 className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] mb-1">{title}</h3>
      <p className="text-sm text-ew-body whitespace-pre-wrap leading-relaxed">{children}</p>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return null;
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

export default function CompetitorDetail({ competitor, onBack, onEdit }) {
  const trustpilotMatch = competitor.customerSatisfaction?.match(/(\d+\.?\d*)\s+on\s+Trustpilot/i);
  const trustScore = trustpilotMatch ? trustpilotMatch[1] : null;

  return (
    <div className="bg-ew-bg p-8 font-dm min-h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto">
        {/* Back */}
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy transition-colors mb-5">
          <ArrowLeft className="w-4 h-4" /> Back to competitors
        </button>

        {/* Header card */}
        <div className="bg-white border border-ew-border rounded-xl p-6 mb-5">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="text-2xl font-bold text-navy">{competitor.companyName}</h1>
                {competitor.needsResearch && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                    <AlertTriangle className="w-3 h-3" /> Needs research
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {competitor.category && (
                  <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${CAT_STYLES[competitor.category] || 'bg-gray-100 text-gray-600'}`}>
                    {competitor.category}
                  </span>
                )}
                {competitor.threatLevel && (
                  <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${THREAT_STYLES[competitor.threatLevel]}`}>
                    {competitor.threatLevel} threat
                  </span>
                )}
                {trustScore && (
                  <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700">
                    ★ {trustScore} Trustpilot
                  </span>
                )}
              </div>
              {competitor.url && (
                <a href={competitor.url} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-navy hover:text-[#8403C5] transition-colors mt-2">
                  <ExternalLink className="w-3.5 h-3.5" /> {competitor.url}
                </a>
              )}
            </div>
            <button onClick={onEdit}
              className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors shrink-0">
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
          </div>

          {/* Quick stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-5 pt-5 border-t border-ew-border">
            {[
              { label: 'Team Size', value: competitor.teamSize },
              { label: 'Pricing', value: competitor.pricing },
              { label: 'Target Audience', value: competitor.targetAudience },
              { label: 'Last Updated', value: fmtDate(competitor.lastUpdated) },
            ].map(({ label, value }) => value ? (
              <div key={label}>
                <p className="text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] mb-0.5">{label}</p>
                <p className="text-sm font-medium text-navy">{value}</p>
              </div>
            ) : null)}
          </div>
        </div>

        {/* Detail sections */}
        <div className="bg-white border border-ew-border rounded-xl p-6 space-y-5">
          <Section title="Key Features">{competitor.keyFeatures}</Section>
          <Section title="Main Differences vs Eventwise">{competitor.mainDifferences}</Section>
          <Section title="Platform Adaptability">{competitor.platformAdaptability}</Section>
          <Section title="Customer Satisfaction">{competitor.customerSatisfaction}</Section>
          <Section title="Customer Support">{competitor.customerSupport}</Section>
          <Section title="Market Strategy">{competitor.marketStrategy}</Section>
          <Section title="Tech Stack">{competitor.techStack}</Section>
          <Section title="Integrations">{competitor.integrations}</Section>
          <Section title="Notes">{competitor.notes}</Section>
        </div>
      </div>
    </div>
  );
}