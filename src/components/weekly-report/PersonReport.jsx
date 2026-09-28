import React from 'react';
import { format, parseISO } from 'date-fns';
import { formatDuration } from '@/lib/weeklyReportData';

export default function PersonReport({ person, report }) {
  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-6">
      {person && <h3 className="text-base font-bold text-[#242450] mb-4">{person}</h3>}

      <Section title="Done this week" empty="Nothing completed this week.">
        {report.done.map((t, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            <span className="text-[#1D9E75] mt-0.5">✓</span>
            <div className="flex-1">
              <p className="text-sm text-[#242450]">
                {t.title} <span className="text-[#5777AB]">[{t.category}]</span> — <span className="font-medium">{formatDuration(t.timeMinutes)}</span>
              </p>
              {t.outcome && <p className="text-xs text-[#5777AB] italic mt-0.5">{t.outcome}</p>}
            </div>
          </div>
        ))}
      </Section>

      <Section title="In progress / carried over" empty="Nothing in progress.">
        {report.inProgress.map((t, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            <span className="text-[#5777AB] mt-0.5">→</span>
            <p className="text-sm text-[#242450] flex-1">
              {t.title} — <span className="font-medium">{formatDuration(t.timeMinutes)}</span>
              {t.carriedWeeks >= 2 && <span className="text-xs text-[#A16207] ml-2">carried over {t.carriedWeeks} weeks</span>}
            </p>
          </div>
        ))}
      </Section>

      <Section title="Blocked" empty="Nothing blocked.">
        {report.blocked.map((t, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            <span className="text-[#DC2626] mt-0.5">⊘</span>
            <p className="text-sm text-[#242450]">{t.title} <span className="text-[#5777AB]">[{t.category}]</span></p>
          </div>
        ))}
      </Section>

      <Section title="Next week" empty="Nothing scheduled.">
        {report.nextWeek.map((t, i) => (
          <div key={i} className="flex items-start gap-2 py-1.5">
            <span className="text-[#8403C5] mt-0.5">→</span>
            <p className="text-sm text-[#242450]">{t.title} <span className="text-[#5777AB]">(due {format(parseISO(t.deadline), 'd MMM')})</span></p>
          </div>
        ))}
        {report.notScheduled.length > 0 && (
          <div className="mt-2 pt-2 border-t border-[#F2F2F4]">
            <p className="text-xs font-semibold text-[#5777AB] uppercase tracking-wide mb-1">Not yet scheduled</p>
            {report.notScheduled.map((t, i) => (
              <p key={i} className="text-sm text-[#5777AB] py-0.5">• {t.title}</p>
            ))}
          </div>
        )}
      </Section>

      <Section title="Time by category" empty="No time logged.">
        <table className="w-full text-sm">
          <tbody>
            {report.timeByCategory.map((c, i) => (
              <tr key={i} className="border-b border-[#F2F2F4] last:border-0">
                <td className="py-1.5 text-[#242450]">{c.category}</td>
                <td className="py-1.5 text-right text-[#242450] font-medium">{formatDuration(c.minutes)}</td>
                <td className="py-1.5 text-right text-[#5777AB] w-16">{c.share}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Section>
    </div>
  );
}

function Section({ title, empty, children }) {
  const hasContent = React.Children.count(children) > 0;
  return (
    <div className="mb-5 last:mb-0">
      <h4 className="text-xs font-bold text-[#5777AB] uppercase tracking-[0.06em] mb-2">{title}</h4>
      {hasContent ? <div>{children}</div> : <p className="text-sm text-[#9CA3AF] italic">{empty}</p>}
    </div>
  );
}