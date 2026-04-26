import React from 'react';
import { ExternalLink, AlertTriangle } from 'lucide-react';

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

export default function CompetitorCard({ competitor, onClick, onEdit, onDelete, needsResearch: needsResearchProp }) {
  const trustpilotMatch = competitor.customerSatisfaction?.match(/(\d+\.?\d*)\s+on\s+Trustpilot/i);
  const trustScore = trustpilotMatch ? trustpilotMatch[1] : null;

  return (
    <div
      className="group bg-white border border-ew-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-bold text-navy leading-snug truncate">{competitor.companyName}</h3>
          {competitor.url && (
            <a
              href={competitor.url}
              target="_blank"
              rel="noopener noreferrer"
              onClick={e => e.stopPropagation()}
              className="inline-flex items-center gap-1 text-[11px] text-ew-muted hover:text-[#8403C5] transition-colors mt-0.5"
            >
              <ExternalLink className="w-2.5 h-2.5" />
              {competitor.url.replace(/^https?:\/\//, '').replace(/\/$/, '')}
            </a>
          )}
        </div>
        {(competitor.needsResearch || needsResearchProp) && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
            <AlertTriangle className="w-2.5 h-2.5" /> Needs research
          </span>
        )}
      </div>

      {/* Tags */}
      <div className="flex items-center gap-2 flex-wrap">
        {competitor.category && (
          <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${CAT_STYLES[competitor.category] || 'bg-gray-100 text-gray-600'}`}>
            {competitor.category}
          </span>
        )}
        {competitor.threatLevel && (
          <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${THREAT_STYLES[competitor.threatLevel]}`}>
            {competitor.threatLevel} threat
          </span>
        )}
      </div>

      {/* Pricing */}
      {competitor.pricing && (
        <p className="text-xs text-ew-body line-clamp-1">
          <span className="font-medium text-ew-muted">Pricing: </span>{competitor.pricing}
        </p>
      )}

      {/* Trustpilot */}
      {trustScore && (
        <p className="text-xs text-ew-body">
          <span className="font-medium text-ew-muted">Trustpilot: </span>
          <span className="font-semibold text-amber-600">★ {trustScore}</span>
        </p>
      )}

      {/* Action row */}
      <div className="flex items-center gap-2 mt-auto pt-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
        <button onClick={onEdit} className="text-[11px] text-ew-muted hover:text-navy font-medium transition-colors">Edit</button>
        <span className="text-ew-border">·</span>
        <button onClick={onDelete} className="text-[11px] text-red-400 hover:text-red-600 font-medium transition-colors">Delete</button>
      </div>
    </div>
  );
}