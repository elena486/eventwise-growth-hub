import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays, startOfWeek } from 'date-fns';
import { ArrowRight } from 'lucide-react';

const TYPE_STYLES = {
  'Annual Leave': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Sick': 'bg-[#FFFBEB] text-[#A16207]',
  'Other': 'bg-[#EBEBF5] text-[#5777AB]',
};

const AVATAR_COLORS = [
  '#8403C5', '#1D4ED8', '#15803D', '#A16207', '#B91C1C', '#7E22CE', '#0284C7', '#0F766E',
];

function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function fmtShort(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM'); } catch { return d; }
}

const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday'];
const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri'];

export default function WhosOutWidget({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [availability, setAvailability] = useState([]);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const inSevenDays = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    const weekCommencing = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    Promise.all([
      base44.entities.LeaveEntry.filter({ status: { $in: ['Confirmed', 'Approved'] } }, 'startDate', 100),
      base44.entities.WeeklyAvailability.filter({ weekCommencing }),
      base44.entities.TeamMember.list(),
    ]).then(([leaveData, availData, members]) => {
      setEntries(leaveData.filter(e => e.startDate <= inSevenDays && e.endDate >= today));
      setAvailability(availData);
      setTeamMembers(members);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const sectionTitleClass = "text-[15px] font-bold text-[#242450] dark:text-white mb-4";
  const linkClass = "flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6e02a3] mt-auto pt-4 transition-colors";

  const requiredNames = teamMembers.filter(m => m.availabilityRequired).map(m => m.name);
  const loggedNames = [...new Set(availability.map(a => a.personName).filter(Boolean))];
  const workingNames = [...new Set([...loggedNames, ...requiredNames])].sort();
  const getAvail = (name) => availability.find(a => a.personName === name);

  return (
    <div className="flex flex-col h-full">
      <h2 className={sectionTitleClass}>Team Availability this week</h2>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-3 flex-1">
          {/* On leave */}
          {entries.length > 0 ? (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">On leave</p>
              {entries.map(entry => {
                const color = getAvatarColor(entry.personName);
                return (
                  <div key={entry.id} className="flex items-center gap-3 px-1 py-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                      {getInitials(entry.personName)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] dark:text-[#E8E8F0]">{entry.personName}</p>
                      <p className="text-xs text-[#9CA3AF]">{fmtShort(entry.startDate)} – {fmtShort(entry.endDate)}</p>
                    </div>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${TYPE_STYLES[entry.type] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                      {entry.type}
                    </span>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide">On leave</p>
          )}
          {entries.length === 0 && (
            <p className="text-sm text-[#9CA3AF] dark:text-[#7070A0]">No one on leave this week</p>
          )}

          {/* Working */}
          {workingNames.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-wide pt-1">Working this week</p>
              {workingNames.map(name => {
                const a = getAvail(name);
                const color = getAvatarColor(name);
                if (!a) {
                  return (
                    <div key={name} className="flex items-center gap-3 px-1 py-1.5">
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                        {getInitials(name)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#A16207]">{name}</p>
                        <p className="text-xs text-[#A16207]">Availability not yet logged</p>
                      </div>
                    </div>
                  );
                }
                const workingDays = DAY_KEYS.map((k, i) => a[k] ? DAY_LABELS[i] : null).filter(Boolean);
                return (
                  <div key={name} className="flex items-center gap-3 px-1 py-1.5">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                      {getInitials(name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#111827] dark:text-[#E8E8F0]">{name}</p>
                      <p className="text-xs text-[#1D9E75]">{workingDays.join(', ') || 'No working days'}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
      <button onClick={() => onNavigate?.('leave')} className={linkClass}>
        View leave calendar <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}