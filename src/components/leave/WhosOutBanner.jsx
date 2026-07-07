import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { CalendarCheck, ArrowRight } from 'lucide-react';

const TYPE_STYLES = {
  'Annual Leave': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Sick':         'bg-[#FFFBEB] text-[#A16207]',
  'Other':        'bg-[#EBEBF5] text-[#5777AB]',
};

const AVATAR_COLORS = ['#8403C5','#1D4ED8','#15803D','#A16207','#B91C1C','#7E22CE','#0284C7','#0F766E'];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const THIS_YEAR = new Date().getFullYear();

function fmtShort(d, showYear) {
  if (!d) return '—';
  try { return format(parseISO(d), showYear ? 'd MMM yyyy' : 'd MMM'); } catch { return d; }
}

const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri'];

export default function WhosOutBanner({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [nextWeekAvailability, setNextWeekAvailability] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const inSevenDays = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const weekCommencing = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const nextWeekCommencing = format(addDays(startOfWeek(new Date(), { weekStartsOn: 1 }), 7), 'yyyy-MM-dd');
    Promise.all([
      base44.entities.LeaveEntry.filter({ status: { $in: ['Confirmed', 'Approved'] } }, 'startDate', 100),
      base44.entities.WeeklyAvailability.filter({ weekCommencing }),
      base44.entities.WeeklyAvailability.filter({ weekCommencing: nextWeekCommencing }),
      base44.entities.TeamMember.list(),
    ]).then(([leaveData, availData, nextAvailData, members]) => {
      setEntries(leaveData.filter(e => e.startDate <= inSevenDays && e.endDate >= today));
      setAvailability(availData);
      setNextWeekAvailability(nextAvailData);
      setTeamMembers(members);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  const requiredNames = teamMembers.filter(m => m.availabilityRequired).map(m => m.name);
  const loggedNames = [...new Set(availability.map(a => a.personName).filter(Boolean))];
  const workingNames = [...new Set([...loggedNames, ...requiredNames])].sort();
  const getAvail = (name) => availability.find(a => a.personName === name);

  const hasLeave = entries.length > 0;
  const hasWorking = workingNames.length > 0;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl px-5 py-4 mb-6 flex items-center gap-4 flex-wrap">
      {/* Title */}
      <div className="flex items-center gap-2 shrink-0">
        <CalendarCheck className="w-4 h-4 text-[#8403C5]" />
        <span className="text-[13px] font-bold text-[#242450]">Team Availability this week</span>
      </div>

      <div className="w-px h-5 bg-[#EBEBF5] shrink-0 hidden sm:block" />

      {/* On leave chips */}
      {hasLeave ? (
        <div className="flex items-center gap-3 flex-wrap">
          {entries.map(entry => {
            const color = getAvatarColor(entry.personName);
            return (
              <div key={entry.id} className="flex items-center gap-2 px-3 py-1.5 bg-[#F6F6FB] rounded-full border border-[#EBEBF5]">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}>
                  {getInitials(entry.personName)}
                </div>
                <span className="text-[12px] font-semibold text-[#242450]">{entry.personName.split(' ')[0]}</span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${TYPE_STYLES[entry.type] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                  {entry.type}
                </span>
                <span className="text-[11px] text-[#9CA3AF]">{(() => {
                  const endYear = entry.endDate ? new Date(entry.endDate).getFullYear() : THIS_YEAR;
                  const showYear = endYear !== THIS_YEAR;
                  return `${fmtShort(entry.startDate)}–${fmtShort(entry.endDate, showYear)}`;
                })()}</span>
              </div>
            );
          })}
        </div>
      ) : !hasWorking && (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1D9E75]">
          <span className="text-base">✓</span> Everyone in this week
        </span>
      )}

      {/* Working this week chips */}
      {hasWorking && (
        <div className={`flex items-center gap-3 flex-wrap ${hasLeave ? 'ml-2 pl-3 border-l border-[#EBEBF5]' : ''}`}>
          {workingNames.map(name => {
            const a = getAvail(name);
            const color = getAvatarColor(name);
            if (!a) {
              const hasNextWeek = nextWeekAvailability.find(n => n.personName === name);
              return (
                <div key={name} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border ${hasNextWeek ? 'bg-[#E8F7F2] border-[#BBF7D0]' : 'bg-[#FFFBEB] border-[#FDE68A]'}`}>
                  <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                    style={{ backgroundColor: color }}>
                    {getInitials(name)}
                  </div>
                  <span className={`text-[12px] font-semibold ${hasNextWeek ? 'text-[#1D9E75]' : 'text-[#A16207]'}`}>{name}</span>
                  <span className={`text-[10px] ${hasNextWeek ? 'text-[#1D9E75]' : 'text-[#A16207]'}`}>
                    {hasNextWeek ? 'Logged for next week' : 'Availability not yet logged'}
                  </span>
                </div>
              );
            }
            const workingDays = DAY_KEYS.map((k, i) => a[k] ? DAY_LABELS[i] : null).filter(Boolean);
            return (
              <div key={name} className="flex items-center gap-2 px-3 py-1.5 bg-[#E8F7F2] rounded-full border border-[#BBF7D0]">
                <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold text-white shrink-0"
                  style={{ backgroundColor: color }}>
                  {getInitials(name)}
                </div>
                <span className="text-[12px] font-semibold text-[#242450]">{name}</span>
                <span className="text-[11px] text-[#1D9E75]">· {workingDays.join(', ') || 'No days'}</span>
              </div>
            );
          })}
        </div>
      )}

      {/* View all link */}
      <button
        onClick={() => onNavigate?.('leave')}
        className="flex items-center gap-1 text-[12px] font-semibold text-[#8403C5] hover:text-[#6B02A0] transition-colors shrink-0 ml-auto"
      >
        View all <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}