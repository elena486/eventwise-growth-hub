import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, addDays } from 'date-fns';
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

function fmtShort(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM'); } catch { return d; }
}

export default function WhosOutBanner({ onNavigate }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const inSevenDays = format(addDays(new Date(), 7), 'yyyy-MM-dd');
    base44.entities.LeaveEntry.filter({ status: { $in: ['Confirmed', 'Approved'] } }, 'startDate', 100)
      .then(data => {
        setEntries(data.filter(e => e.startDate <= inSevenDays && e.endDate >= today));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return null;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl px-5 py-4 mb-6 flex items-center gap-4 flex-wrap">
      {/* Title */}
      <div className="flex items-center gap-2 shrink-0">
        <CalendarCheck className="w-4 h-4 text-[#8403C5]" />
        <span className="text-[13px] font-bold text-[#242450]">Who's Out</span>
      </div>

      <div className="w-px h-5 bg-[#EBEBF5] shrink-0 hidden sm:block" />

      {/* Content */}
      {entries.length === 0 ? (
        <span className="flex items-center gap-1.5 text-[13px] font-semibold text-[#1D9E75]">
          <span className="text-base">✓</span> Everyone in this week
        </span>
      ) : (
        <div className="flex items-center gap-3 flex-wrap flex-1 min-w-0">
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
                <span className="text-[11px] text-[#9CA3AF]">{fmtShort(entry.startDate)}–{fmtShort(entry.endDate)}</span>
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