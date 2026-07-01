import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays } from 'date-fns';
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

export default function WhosOutWidget({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const inSevenDays = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    base44.entities.LeaveEntry.filter({ status: { $in: ['Confirmed', 'Approved'] } }, 'startDate', 100)
      .then(data => {
        const relevant = data.filter(e => e.startDate <= inSevenDays && e.endDate >= today);
        setEntries(relevant);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const sectionTitleClass = "text-[15px] font-bold text-[#242450] dark:text-white mb-4";
  const linkClass = "flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6e02a3] mt-auto pt-4 transition-colors";

  return (
    <div className="flex flex-col h-full">
      <h2 className={sectionTitleClass}>🏖️ Who's out this week</h2>
      {loading ? (
        <div className="flex items-center justify-center py-6">
          <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        </div>
      ) : entries.length === 0 ? (
        <p className="text-sm text-[#9CA3AF] dark:text-[#7070A0] py-4">Everyone's in this week 👍</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => {
            const color = getAvatarColor(entry.personName);
            const initials = getInitials(entry.personName);
            return (
              <div key={entry.id} className="flex items-center gap-3 px-3 py-2.5">
                <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                  {initials}
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
      )}
      <button onClick={() => onNavigate?.('leave')} className={linkClass}>
        View leave calendar <ArrowRight className="w-3 h-3" />
      </button>
    </div>
  );
}