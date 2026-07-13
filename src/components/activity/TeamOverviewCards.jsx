import React, { useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subDays } from 'date-fns';
import { MEMBER_COLORS, SECTION_COLORS } from '@/lib/logActivity';

const TEAM = [
  { name: 'Chris', role: 'Founder' },
  { name: 'Elena', role: 'Marketing' },
  { name: 'George', role: 'Sales' },
  { name: 'Martinique', role: 'Customer Success' },
  { name: 'Sreeja', role: 'Product & Tech' },
  { name: 'Ramesh', role: 'Sales' },
  { name: 'Eleanor', role: 'CTO' },
];

function fmtRelative(dateStr) {
  if (!dateStr) return 'Never';
  const d = parseISO(dateStr);
  const now = new Date();
  const diffMs = now - d;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24 && d.toDateString() === now.toDateString()) return `Today at ${format(d, 'HH:mm')}`;
  if (diffHrs < 48) return `Yesterday at ${format(d, 'HH:mm')}`;
  return format(d, 'EEE d MMM — HH:mm');
}

export default function TeamOverviewCards({ activities }) {
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const monthStart = startOfMonth(now);
  const monthEnd = endOfMonth(now);

  const cards = useMemo(() => {
    return TEAM.map(member => {
      const personActs = activities.filter(a => a.teamMember === member.name);

      // Last active
      let lastActive = '';
      personActs.forEach(a => {
        const cd = a.created_date || a.date;
        if (cd > lastActive) lastActive = cd;
      });

      // This week count
      const weekCount = personActs.filter(a => {
        const d = parseISO(a.created_date || a.date);
        return d >= weekStart && d <= weekEnd;
      }).length;

      // This month count
      const monthCount = personActs.filter(a => {
        const d = parseISO(a.created_date || a.date);
        return d >= monthStart && d <= monthEnd;
      }).length;

      // Most used section
      const secMap = {};
      personActs.forEach(a => { secMap[a.section] = (secMap[a.section] || 0) + 1; });
      const mostUsed = Object.entries(secMap).sort((a, b) => b[1] - a[1])[0]?.[0] || '—';

      // 7-day sparkline
      const sparkline = [];
      for (let i = 6; i >= 0; i--) {
        const day = subDays(now, i);
        const dayStr = format(day, 'yyyy-MM-dd');
        sparkline.push(personActs.filter(a => {
          try { return (a.created_date || a.date).startsWith(dayStr); } catch { return false; }
        }).length);
      }

      const noRecentActivity = weekCount === 0;

      return {
        ...member,
        lastActive,
        weekCount,
        monthCount,
        mostUsed,
        sparkline,
        noRecentActivity,
      };
    });
  }, [activities, weekStart, weekEnd, monthStart, monthEnd]);

  const maxSpark = Math.max(...cards.flatMap(c => c.sparkline), 1);

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {cards.map(card => {
        const color = MEMBER_COLORS[card.name] || '#9CA3AF';
        return (
          <div key={card.name}
            className={`bg-white border rounded-xl p-4 transition-colors ${card.noRecentActivity ? 'border-[#E8A020]/40 bg-[#FFFBEB]' : 'border-[#EBEBF5]'}`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold shrink-0"
                style={{ backgroundColor: color }}>
                {card.name.charAt(0)}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#242450] truncate">{card.name}</p>
                <p className="text-[10px] text-[#5777AB]">{card.role}</p>
              </div>
            </div>

            {/* No recent activity badge */}
            {card.noRecentActivity && (
              <div className="mb-3 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#E8A020]/10 text-[#A16207] text-[10px] font-semibold">
                No recent activity
              </div>
            )}

            {/* Stats */}
            <div className="space-y-2 mb-3">
              <div className="flex justify-between text-xs">
                <span className="text-[#9CA3AF]">Last active</span>
                <span className="font-medium text-[#242450]">{fmtRelative(card.lastActive)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9CA3AF]">This week</span>
                <span className="font-semibold text-[#242450]">{card.weekCount} actions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9CA3AF]">This month</span>
                <span className="font-semibold text-[#242450]">{card.monthCount} actions</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-[#9CA3AF]">Most used</span>
                <span className="font-medium text-[#5777AB] truncate max-w-[120px]">{card.mostUsed}</span>
              </div>
            </div>

            {/* Sparkline */}
            <div className="flex items-end gap-0.5 h-10">
              {card.sparkline.map((v, i) => (
                <div key={i} className="flex-1 flex flex-col justify-end h-full">
                  <div
                    className="w-full rounded-sm transition-all duration-300"
                    style={{
                      height: `${Math.max((v / maxSpark) * 100, v > 0 ? 8 : 2)}%`,
                      backgroundColor: v > 0 ? color : '#EBEBF5',
                      minHeight: '2px',
                    }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-1">
              {card.sparkline.map((v, i) => (
                <span key={i} className="text-[8px] text-[#9CA3AF] w-4 text-center">{v}</span>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}