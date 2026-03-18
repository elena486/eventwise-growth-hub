import React from 'react';

const PLAN_STYLES = {
  'Starter':      'bg-gray-100 text-gray-600',
  'Professional': 'bg-blue-50 text-blue-700',
  'Business':     'bg-[#EEF0FA] text-[#1B2A52]',
};

export default function PlanBadge({ plan }) {
  const cls = PLAN_STYLES[plan] || 'bg-gray-100 text-gray-600';
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${cls}`}>
      {plan}
    </span>
  );
}