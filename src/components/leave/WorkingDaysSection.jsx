import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addWeeks, addDays, startOfWeek } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Mon', hoursKey: 'mondayHours' },
  { key: 'tuesday', label: 'Tue', hoursKey: 'tuesdayHours' },
  { key: 'wednesday', label: 'Wed', hoursKey: 'wednesdayHours' },
  { key: 'thursday', label: 'Thu', hoursKey: 'thursdayHours' },
  { key: 'friday', label: 'Fri', hoursKey: 'fridayHours' },
];

const AVATAR_COLORS = ['#8403C5', '#1D4ED8', '#15803D', '#A16207', '#B91C1C', '#7E22CE', '#0284C7', '#0F766E'];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function weekCommencingForDate(d) {
  return format(startOfWeek(d, { weekStartsOn: 1 }), 'yyyy-MM-dd');
}

export default function WorkingDaysSection() {
  const [weekOffset, setWeekOffset] = useState(0);
  const [entries, setEntries] = useState([]);
  const [nextWeekEntries, setNextWeekEntries] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  const weekDate = addWeeks(new Date(), weekOffset);
  const weekCommencing = weekCommencingForDate(weekDate);

  useEffect(() => {
    setLoading(true);
    const nextWeekCommencing = format(addWeeks(weekDate, 1), 'yyyy-MM-dd');
    Promise.all([
      base44.entities.WeeklyAvailability.filter({ weekCommencing }),
      base44.entities.WeeklyAvailability.filter({ weekCommencing: nextWeekCommencing }),
      base44.entities.TeamMember.list(),
    ]).then(([data, nextData, members]) => {
      setEntries(data);
      setNextWeekEntries(nextData);
      setTeamMembers(members);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, [weekCommencing]);

  const requiredNames = teamMembers.filter(m => m.availabilityRequired).map(m => m.name);
  const loggedNames = [...new Set(entries.map(e => e.personName).filter(Boolean))];
  const allNames = [...new Set([...loggedNames, ...requiredNames])].sort();
  const getEntry = (name) => entries.find(e => e.personName === name);

  const weekMonday = parseISO(weekCommencing);
  const weekFriday = addDays(weekMonday, 4);
  const weekLabel = `${format(weekMonday, 'd MMM')} – ${format(weekFriday, 'd MMM yyyy')}`;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBF5] bg-[#F6F6FB]">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-bold text-[#242450]">Working Days</h3>
          <span className="text-[11px] font-medium text-[#9CA3AF] bg-white border border-[#EBEBF5] px-2 py-0.5 rounded-full">
            {weekLabel}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setWeekOffset(o => o - 1)}
            className="p-1.5 rounded-lg text-[#5777AB] hover:bg-[#EBEBF5] transition-colors">
            <ChevronLeft className="w-4 h-4" />
          </button>
          {weekOffset !== 0 && (
            <button onClick={() => setWeekOffset(0)}
              className="px-2 py-1 text-[11px] font-semibold text-[#8403C5] hover:bg-[#F3E8FF] rounded-lg transition-colors">
              This week
            </button>
          )}
          <button onClick={() => setWeekOffset(o => o + 1)}
            className="p-1.5 rounded-lg text-[#5777AB] hover:bg-[#EBEBF5] transition-colors">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-8">
          <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        </div>
      ) : allNames.length === 0 ? (
        <div className="px-5 py-8 text-center">
          <p className="text-sm text-[#9CA3AF]">No working availability logged for this week.</p>
        </div>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EBEBF5] bg-[#F6F6FB]">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Person</th>
              {DAYS.map(d => (
                <th key={d.key} className="px-3 py-2.5 text-center text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">{d.label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {allNames.map(name => {
              const entry = getEntry(name);
              const color = getAvatarColor(name);
              const isRequired = requiredNames.includes(name);
              return (
                <tr key={name} className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                        {getInitials(name)}
                      </div>
                      <div>
                        <span className="text-sm font-semibold text-[#242450]">{name}</span>
                        {isRequired && <span className="ml-1.5 text-[9px] font-semibold text-[#A16207] bg-[#FFFBEB] px-1.5 py-0.5 rounded-full">Required</span>}
                      </div>
                    </div>
                  </td>
                  {entry ? (
                    DAYS.map(day => {
                      const on = entry[day.key];
                      const hours = entry[day.hoursKey];
                      return (
                        <td key={day.key} className="px-3 py-3 text-center">
                          {on ? (
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-[#E8F7F2] text-[#1D9E75] text-[10px] font-bold">✓</span>
                              {hours && <span className="text-[10px] text-[#5777AB]">{hours}</span>}
                            </div>
                          ) : (
                            <span className="text-[#9CA3AF] text-sm">–</span>
                          )}
                        </td>
                      );
                    })
                  ) : (
                    <td colSpan={5} className="px-3 py-3 text-center">
                      {nextWeekEntries.find(e => e.personName === name) ? (
                        <span className="text-[11px] font-semibold text-[#1D9E75] bg-[#E8F7F2] px-2.5 py-1 rounded-full">✓ Logged for next week</span>
                      ) : (
                        <span className="text-[11px] font-semibold text-[#A16207] bg-[#FFFBEB] px-2.5 py-1 rounded-full">Not submitted</span>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}