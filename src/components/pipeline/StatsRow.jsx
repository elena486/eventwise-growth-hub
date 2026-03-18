import React from 'react';

function fmt(n) {
  return '£' + Math.round(n).toLocaleString('en-GB');
}

export default function StatsRow({ leads }) {
  const total = leads.length;
  const pipeline = leads.reduce((s, l) => s + (l.dealValueMonthly || 0), 0);
  const proposalsSent = leads.filter(l => l.stage === 'Proposal Sent').length;
  const avg = total > 0 ? pipeline / total : 0;

  const cards = [
    { label: 'Total leads', value: total },
    { label: 'Pipeline value', value: fmt(pipeline) + '/mo' },
    { label: 'Proposals sent', value: proposalsSent },
    { label: 'Avg deal value', value: fmt(avg) + '/mo' },
  ];

  return (
    <div className="grid grid-cols-4 gap-4 mb-6">
      {cards.map(c => (
        <div key={c.label} className="bg-white border border-ew-border rounded-xl p-5">
          <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">{c.label}</p>
          <p className="text-2xl font-bold text-navy">{c.value}</p>
        </div>
      ))}
    </div>
  );
}