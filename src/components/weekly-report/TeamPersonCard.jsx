import React from 'react';
import { formatDuration } from '@/lib/weeklyReportData';
import { RATING_LABELS } from './SprintSection';

const RATING_STYLES = {
  on_track: { bg: 'bg-[#E8F7F2]', text: 'text-[#1D9E75]', dot: 'bg-[#1D9E75]' },
  at_risk: { bg: 'bg-[#FFFBEB]', text: 'text-[#A16207]', dot: 'bg-[#E8A020]' },
  off_track: { bg: 'bg-[#FEF2F2]', text: 'text-[#DC2626]', dot: 'bg-[#DC2626]' },
};

export default function TeamPersonCard({ person, report, isElena, isDayMode, onViewPerson }) {
  const lines = [];
  report.done.slice(0, 3).forEach(t => lines.push(t.title));
  if (lines.length < 3) report.inProgress.slice(0, 3 - lines.length).forEach(t => lines.push(t.title));

  const sprint = report.sprint;
  const rating = !isDayMode && sprint?.selfRating ? RATING_STYLES[sprint.selfRating] : null;
  const headlineKpi = !isDayMode && sprint?.kpis?.[0] || null;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-bold text-[#242450]">{person}</h3>
          {rating && (
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${rating.bg} ${rating.text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${rating.dot}`} />
              {RATING_LABELS[sprint.selfRating]}
            </span>
          )}
        </div>
        <button onClick={() => onViewPerson(person)} className="text-xs text-[#8403C5] font-medium hover:underline">
          View full report
        </button>
      </div>
      <div className="flex items-center gap-4 mb-3 flex-wrap">
        <span className="text-sm text-[#242450]"><span className="font-bold text-[#8403C5]">{formatDuration(report.stats.hoursLogged)}</span> logged</span>
        <span className="text-sm text-[#242450]"><span className="font-bold text-[#8403C5]">{report.stats.completed}</span> completed</span>
        {headlineKpi && (
          <span className="text-sm text-[#242450]">
            <span className="font-bold text-[#8403C5]">{headlineKpi.value != null ? headlineKpi.value : '—'}</span> {headlineKpi.label.toLowerCase()}
            {headlineKpi.target != null && <span className="text-[#9CA3AF]"> / target {headlineKpi.target}</span>}
          </span>
        )}
      </div>
      <div className="space-y-1">
        {lines.length > 0 ? lines.map((line, i) => (
          <p key={i} className="text-xs text-[#5777AB] truncate" title={line}>{line}</p>
        )) : (
          <p className="text-xs text-[#9CA3AF] italic">No activity {isDayMode ? 'today' : 'this week'}</p>
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