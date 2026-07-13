import React, { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, eachDayOfInterval, startOfWeek, endOfWeek } from 'date-fns';
import { SECTION_COLORS, MEMBER_COLORS } from '@/lib/logActivity';

const TEAM = [
  { name: 'Chris', role: 'Founder', expected: ['Time & Capacity', 'Sales', 'Customer Success', 'Sprints', 'To-Do Board', 'Competitors', 'Time Off', 'Authentication'] },
  { name: 'Elena', role: 'Marketing', expected: ['Time & Capacity', 'Sales', 'Customer Success', 'Sprints', 'To-Do Board', 'Competitors', 'Time Off', 'Authentication'] },
  { name: 'George', role: 'Sales', expected: ['Sales', 'Competitors'] },
  { name: 'Martinique', role: 'CS', expected: ['Customer Success'] },
  { name: 'Sreeja', role: 'Product', expected: ['Sprints', 'To-Do Board'] },
  { name: 'Ramesh', role: 'Sales', expected: ['Sales', 'Competitors'] },
  { name: 'Eleanor', role: 'CTO', expected: ['Sprints', 'To-Do Board', 'Time & Capacity'] },
];

const SECTIONS = ['Sprints', 'Time & Capacity', 'To-Do Board', 'Customer Success', 'Sales', 'Competitors', 'Time Off', 'Authentication'];

function HeatmapGrid({ activities, months }) {
  const today = new Date();
  const startDate = subMonths(today, months);
  const endDate = today;
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  // Count activities per day
  const dayMap = {};
  days.forEach(d => { dayMap[format(d, 'yyyy-MM-dd')] = 0; });
  activities.forEach(a => {
    const key = (a.created_date || a.date || '').slice(0, 10);
    if (key in dayMap) dayMap[key]++;
  });

  const maxCount = Math.max(...Object.values(dayMap), 1);

  // Group by week rows
  const weeks = [];
  let currentWeek = [];
  days.forEach((d, i) => {
    const dayOfWeek = d.getDay();
    if (dayOfWeek === 0 && currentWeek.length > 0) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
    const key = format(d, 'yyyy-MM-dd');
    currentWeek.push({ date: d, key, count: dayMap[key] || 0 });
    if (i === days.length - 1 && currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
  });

  const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-0.5">
        {/* Day labels */}
        <div className="flex flex-col gap-0.5 mr-1 pt-0">
          {dayLabels.map((l, i) => (
            <div key={i} className="w-6 h-[11px] flex items-center">
              <span className="text-[8px] text-[#9CA3AF] leading-none">{l}</span>
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-0.5">
            {week.map(day => {
              const intensity = maxCount > 0 ? day.count / maxCount : 0;
              let bg = '#F0F0F8';
              if (day.count > 0) bg = `rgba(132, 3, 197, ${Math.max(0.15, intensity * 0.9)})`;
              return (
                <div key={day.key} className="w-[11px] h-[11px] rounded-sm relative group"
                  style={{ backgroundColor: bg }}
                  title={`${day.count} action${day.count !== 1 ? 's' : ''} on ${format(day.date, 'MMM d')}`}>
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-[#242450] text-white text-[10px] font-medium rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10">
                    {day.count} action{day.count !== 1 ? 's' : ''} — {format(day.date, 'MMM d')}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-1.5 mt-2 justify-end">
        <span className="text-[10px] text-[#9CA3AF]">Less</span>
        {[0, 0.25, 0.5, 0.75, 1].map((v, i) => (
          <div key={i} className="w-[11px] h-[11px] rounded-sm"
            style={{ backgroundColor: v === 0 ? '#F0F0F8' : `rgba(132, 3, 197, ${0.15 + v * 0.75})` }} />
        ))}
        <span className="text-[10px] text-[#9CA3AF]">More</span>
      </div>
    </div>
  );
}

export default function UsageAnalytics({ activities }) {
  const now = new Date();
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const monthActivities = useMemo(() =>
    activities.filter(a => {
      const d = parseISO(a.created_date || a.date);
      return d >= monthStart && d <= monthEnd;
    }), [activities, monthStart, monthEnd]
  );

  // Section usage
  const sectionUsage = useMemo(() => {
    const map = {};
    SECTIONS.forEach(s => { map[s] = 0; });
    monthActivities.forEach(a => { map[a.section] = (map[a.section] || 0) + 1; });
    const max = Math.max(...Object.values(map), 1);
    return Object.entries(map)
      .map(([section, count]) => ({ section, count, pct: (count / max) * 100 }))
      .sort((a, b) => b.count - a.count);
  }, [monthActivities]);

  // Activity by person
  const personUsage = useMemo(() => {
    return TEAM.map(m => ({
      ...m,
      count: monthActivities.filter(a => a.teamMember === m.name).length,
    })).sort((a, b) => b.count - a.count);
  }, [monthActivities]);

  const maxPersonCount = Math.max(...personUsage.map(p => p.count), 1);

  // Adoption alerts
  const alerts = useMemo(() => {
    const result = [];

    // No activity in past 7 days
    const weekStart = startOfWeek(now, { weekStartsOn: 1 });
    TEAM.forEach(m => {
      const hasRecent = activities.some(a => {
        if (a.teamMember !== m.name) return false;
        const d = parseISO(a.created_date || a.date);
        return d >= weekStart;
      });
      if (!hasRecent) {
        result.push({ type: 'person', text: `${m.name} has zero activity in the past 7 days`, level: 'amber' });
      }
    });

    // Section with zero activity in past 14 days
    const twoWeeksAgo = new Date(now);
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
    SECTIONS.forEach(s => {
      const hasRecent = activities.some(a => {
        if (a.section !== s) return false;
        const d = parseISO(a.created_date || a.date);
        return d >= twoWeeksAgo;
      });
      if (!hasRecent) {
        result.push({ type: 'section', text: `"${s}" has zero activity in the past 14 days`, level: 'red' });
      }
    });

    // Never used expected section
    TEAM.forEach(m => {
      m.expected.forEach(sec => {
        const hasUsed = activities.some(a => a.teamMember === m.name && a.section === sec);
        if (!hasUsed) {
          result.push({ type: 'expected', text: `${m.name} has never used "${sec}"`, level: 'amber' });
        }
      });
    });

    return result;
  }, [activities]);

  const levelColors = { amber: 'text-[#A16207] bg-[#FFFBEB]', red: 'text-[#DC2626] bg-[#FEF2F2]' };

  return (
    <div className="space-y-8">
      {/* Section Usage Bar Chart */}
      <div>
        <h4 className="text-sm font-bold text-[#242450] mb-3">Section Usage — This Month</h4>
        {sectionUsage.every(s => s.count === 0) ? (
          <p className="text-sm text-[#5777AB] text-center py-8 bg-white border border-[#EBEBF5] rounded-xl">
            No activity recorded yet
          </p>
        ) : (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 space-y-2.5">
            {sectionUsage.map(s => {
              const color = SECTION_COLORS[s.section] || '#9CA3AF';
              return (
                <div key={s.section} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#242450] w-44 shrink-0 truncate">{s.section}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-[#F6F6FB] rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full flex items-center px-2.5 transition-all duration-500"
                        style={{ width: `${Math.max(s.pct, s.count > 0 ? 3 : 0)}%`, backgroundColor: color }}>
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{s.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Activity by Person */}
      <div>
        <h4 className="text-sm font-bold text-[#242450] mb-3">Activity by Person — This Month</h4>
        {personUsage.every(p => p.count === 0) ? (
          <p className="text-sm text-[#5777AB] text-center py-8 bg-white border border-[#EBEBF5] rounded-xl">
            No activity recorded yet
          </p>
        ) : (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 space-y-2.5">
            {personUsage.map(p => {
              const color = MEMBER_COLORS[p.name] || '#9CA3AF';
              const barW = (p.count / maxPersonCount) * 80;
              return (
                <div key={p.name} className="flex items-center gap-3">
                  <span className="text-xs font-medium text-[#242450] w-24 shrink-0 truncate">{p.name}</span>
                  <div className="flex-1 flex items-center gap-2">
                    <div className="flex-1 bg-[#F6F6FB] rounded-full h-6 overflow-hidden">
                      <div className="h-full rounded-full flex items-center px-2.5 transition-all duration-500"
                        style={{ width: `${Math.max(barW, p.count > 0 ? 3 : 0)}%`, backgroundColor: color }}>
                        <span className="text-[10px] font-bold text-white whitespace-nowrap">{p.count}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Daily Activity Heatmap */}
      <div>
        <h4 className="text-sm font-bold text-[#242450] mb-3">Daily Activity — Last 3 Months</h4>
        <div className="bg-white border border-[#EBEBF5] rounded-xl p-5">
          <HeatmapGrid activities={activities} months={3} />
        </div>
      </div>

      {/* Adoption Alerts */}
      <div>
        <h4 className="text-sm font-bold text-[#242450] mb-3">Adoption Alerts</h4>
        {alerts.length === 0 ? (
          <div className="bg-white border border-[#1D9E75]/30 bg-[#E8F7F2] rounded-xl px-4 py-3">
            <p className="text-sm text-[#1D9E75]">All clear — team members are engaging with their expected sections.</p>
          </div>
        ) : (
          <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left">Alert</th>
                  <th className="px-4 py-3 text-left w-20">Level</th>
                </tr>
              </thead>
              <tbody>
                {alerts.map((alert, i) => (
                  <tr key={i} className="border-t border-[#F2F2F4]">
                    <td className="px-4 py-2.5 text-xs text-[#242450]">{alert.text}</td>
                    <td className="px-4 py-2.5">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${levelColors[alert.level]}`}>
                        {alert.level === 'amber' ? '⚠ Watch' : '🔴 Alert'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}