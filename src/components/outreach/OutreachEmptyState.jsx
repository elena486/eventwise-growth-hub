import React from 'react';
import { BarChart3, FileText } from 'lucide-react';

export default function OutreachEmptyState({ onGenerate, canGenerate }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4">
      <div className="w-20 h-20 bg-[#F3E8FF] rounded-2xl flex items-center justify-center mb-5">
        <BarChart3 className="w-10 h-10 text-[#8403C5]" />
      </div>
      <h2 className="text-xl font-bold text-navy mb-2">No outreach data yet</h2>
      <p className="text-sm text-ew-muted mb-6 max-w-sm text-center">
        Generate your first weekly report to start tracking campaign performance.
      </p>
      {canGenerate && (
        <button
          onClick={onGenerate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] text-white rounded-xl text-sm font-semibold hover:bg-[#6d02a3] transition-colors"
        >
          <FileText className="w-4 h-4" /> Generate Weekly Report
        </button>
      )}
    </div>
  );
}