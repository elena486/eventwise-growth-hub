import React from 'react';

const STAGE_STYLES = {
  'New Lead':        'bg-gray-100 text-gray-600',
  'Contacted':       'bg-gray-100 text-gray-600',
  'Discovery Call':  'bg-blue-50 text-blue-700',
  'Demo Booked':     'bg-cyan-50 text-cyan-700',
  'Proposal Sent':   'bg-amber-50 text-amber-700',
  'Negotiation':     'bg-purple-50 text-purple-700',
  'In Negotiation':  'bg-purple-50 text-purple-700',
  'Closed Won':      'bg-green-50 text-green-700',
  'Closed Lost':     'bg-red-50 text-red-600',
  'On Hold':         'bg-orange-50 text-orange-600',
};

export default function StageBadge({ stage }) {
  const cls = STAGE_STYLES[stage] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {stage}
    </span>
  );
}