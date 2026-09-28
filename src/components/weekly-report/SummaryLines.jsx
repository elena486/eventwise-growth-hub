import React from 'react';

export default function SummaryLines({ summary }) {
  if (!summary) return null;
  return (
    <div className="space-y-1.5">
      {summary.moved && (
        <p className="text-sm text-[#242450]"><span className="font-bold">Moved:</span> {summary.moved}</p>
      )}
      {summary.blocking && (
        <p className="text-sm text-[#242450]"><span className="font-bold">Blocking:</span> {summary.blocking}</p>
      )}
      {summary.next && (
        <p className="text-sm text-[#242450]"><span className="font-bold">Next:</span> {summary.next}</p>
      )}
    </div>
  );
}