import React, { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { formatDuration } from '@/lib/weeklyReportData';
import TimeByCategoryBar from './TimeByCategoryBar';

export default function PersonReport({ report, aiSummary, aiLoading, aiError, onRegenerateSummary }) {
  const [expanded, setExpanded] = useState(false);
  const [longRunningOpen, setLongRunningOpen] = useState(false);

  return (
    <div>
      {/* Stat tiles */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <StatTile label="Completed" value={report.stats.completed} />
        <StatTile label="In progress" value={report.stats.inProgress} />
        <StatTile label="Blocked" value={report.stats.blocked} />
        <StatTile label="Hours logged" value={formatDuration(report.stats.hoursLogged)} />
      </div>

      {/* AI summary */}
      <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4">
        <h3 className="text-sm font-bold text-[#242450] mb-2">Summary</h3>
        {aiLoading ? (
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
            <p className="text-sm text-[#5777AB]">Generating summary…</p>
          </div>
        ) : aiError ? (
          <div>
            <p className="text-sm text-[#5777AB] mb-2">Summary unavailable, try again</p>
            <button onClick={onRegenerateSummary} className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg transition-colors">Regenerate summary</button>
          </div>
        ) : (
          <p className="text-sm text-[#242450] leading-relaxed">{aiSummary}</p>
        )}
      </div>

      {/* Completed */}
      <Section title="Completed this week">
        {report.done.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] italic">Nothing completed this week.</p>
        ) : (
          report.done.map((t, i) => (
            <div key={i} className="py-2.5 border-b border-[#F2F2F4] last:border-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm text-[#242450] truncate flex-1" title={t.title}>{t.title}</p>
                <span className="text-xs text-[#5777AB] shrink-0">{formatDuration(t.timeMinutes)}</span>
              </div>
              {t.outcome && <p className="text-xs text-[#5777AB] italic mt-1">{t.outcome}</p>}
            </div>
          ))
        )}
      </Section>

      {/* In progress */}
      <Section title="In progress">
        {report.inProgress.length === 0 && report.longRunning.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] italic">Nothing in progress.</p>
        ) : (
          <>
            {report.inProgress.slice(0, 5).map((t, i) => (
              <TaskRow key={i} title={t.title} hours={formatDuration(t.timeMinutes)} />
            ))}
            {report.inProgress.length > 5 && (
              <div className="mt-1">
                <button onClick={() => setExpanded(!expanded)} className="text-xs text-[#8403C5] font-medium hover:underline">
                  {expanded ? 'Show less' : `+ ${report.inProgress.length - 5} more`}
                </button>
                {expanded && report.inProgress.slice(5).map((t, i) => (
                  <TaskRow key={i + 5} title={t.title} hours={formatDuration(t.timeMinutes)} />
                ))}
              </div>
            )}
            {report.longRunning.length > 0 && (
              <div className="mt-3 pt-2 border-t border-[#F2F2F4]">
                <button onClick={() => setLongRunningOpen(!longRunningOpen)} className="text-xs text-[#5777AB] font-medium hover:text-[#242450]">
                  Long-running ({report.longRunning.length}) {longRunningOpen ? '▾' : '▸'}
                </button>
                {longRunningOpen && report.longRunning.map((t, i) => (
                  <TaskRow key={i} title={t.title} hours={formatDuration(t.timeMinutes)} />
                ))}
              </div>
            )}
          </>
        )}
      </Section>

      {/* Blocked — only shown if not empty */}
      {report.blocked.length > 0 && (
        <Section title="Blocked">
          {report.blocked.map((t, i) => (
            <TaskRow key={i} title={t.title} />
          ))}
        </Section>
      )}

      {/* Coming up */}
      <Section title="Coming up">
        {report.comingUp.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] italic">Nothing due in the next 7 days.</p>
        ) : (
          report.comingUp.map((t, i) => (
            <div key={i} className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F2F2F4] last:border-0">
              <p className="text-sm text-[#242450] truncate flex-1" title={t.title}>{t.title}</p>
              <span className="text-xs text-[#5777AB] shrink-0">{format(parseISO(t.deadline), 'd MMM')}</span>
            </div>
          ))
        )}
        {report.unscheduledCount > 0 && (
          <p className="text-xs text-[#5777AB] mt-2">{report.unscheduledCount} unscheduled {report.unscheduledCount === 1 ? 'task' : 'tasks'} in backlog</p>
        )}
      </Section>

      {/* Time by category */}
      <Section title="Time by category">
        <TimeByCategoryBar timeByCategory={report.timeByCategory} totalTime={report.totalTime} />
      </Section>
    </div>
  );
}

function StatTile({ label, value }) {
  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-4">
      <p className="text-2xl font-bold text-[#8403C5]">{value}</p>
      <p className="text-xs text-[#5777AB] uppercase tracking-wide mt-1">{label}</p>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4">
      <h3 className="text-sm font-bold text-[#242450] mb-3">{title}</h3>
      {children}
    </div>
  );
}

function TaskRow({ title, hours }) {
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-[#F2F2F4] last:border-0">
      <p className="text-sm text-[#242450] truncate flex-1" title={title}>{title}</p>
      {hours && <span className="text-xs text-[#5777AB] shrink-0">{hours}</span>}
    </div>
  );
}