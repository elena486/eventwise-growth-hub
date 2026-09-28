import React from 'react';
import { formatDuration } from '@/lib/weeklyReportData';

export default function TeamPersonCard({ person, report, isElena, onViewPerson }) {
  const lines = [];
  report.done.slice(0, 3).forEach(t => lines.push(t.title));
  if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-base font-bold text-[#242450]">{person}</h3>
        <button onClick={() => onViewPerson(person)} className="text-xs text-[#8403C5] font-medium hover:underline">
          View full report
        </button>
      </div>
      <div className="flex items-center gap-4 mb-3">
        <span className="text-sm text-[#242450]"><span className="font-bold text-[#8403C5]">{formatDuration(report.stats.hoursLogged)}</span> logged</span>
        <span className="text-sm text-[#242450]"><span className="font-bold text-[#8403C5]">{report.stats.completed}</span> completed</span>
      </div>
      <div className="space-y-1">
        {lines.length > 0 ? lines.map((line, i) => (
          <p key={i} className="text-xs text-[#5777AB] truncate" title={line}>{line}</p>
        )) : (
          <p className="text-xs text-[#9CA3AF] italic">No activity this week</p>
        )}
      </div>
      {report.blocked.length > 0 && (
        <p className="text-xs text-[#DC2626] mt-2">Blocked: {report.blocked.map(t => t.title).join(', ')}</p>
      )}
      {isElena && report.stats.hoursLogged > 0 && (
        <p className="text-[11px] text-[#9CA3AF] mt-2">
          {formatDuration(report.boardTaskHours)} of {formatDuration(report.stats.hoursLogged)} against board tasks ({report.boardTaskAdoptionPct}%)
        </p>
      )}
    </div>
  );
}