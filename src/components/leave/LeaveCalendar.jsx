import React, { useState, useEffect, useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, addMonths, subMonths, isSameMonth, isToday } from 'date-fns';
import { ChevronLeft, ChevronRight } from 'lucide-react';

const TYPE_COLORS = {
  'Annual Leave': { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' },
  'Sick':         { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  'Other':        { bg: '#E5E7EB', text: '#374151', border: '#D1D5DB' },
};

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

function entrySpansDay(entry, day) {
  const d = format(day, 'yyyy-MM-dd');
  return entry.startDate <= d && entry.endDate >= d;
}

function Tooltip({ entry }) {
  const colors = TYPE_COLORS[entry.type] || TYPE_COLORS['Other'];
  return (
    <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 bg-white border border-[#EBEBF5] rounded-lg shadow-xl p-3 pointer-events-none">
      <p className="text-sm font-bold text-[#242450] mb-1">{entry.personName}</p>
      <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full" style={{ backgroundColor: colors.bg, color: colors.text }}>{entry.type}</span>
      <p className="text-xs text-[#5777AB] mt-2">{format(parseISO(entry.startDate), 'd MMM')} – {format(parseISO(entry.endDate), 'd MMM yyyy')}</p>
      {entry.notes && <p className="text-xs text-[#9CA3AF] mt-1 italic">"{entry.notes}"</p>}
    </div>
  );
}

function EntryChip({ entry, showName = true, onClick }) {
  const [hover, setHover] = useState(false);
  const colors = TYPE_COLORS[entry.type] || TYPE_COLORS['Other'];
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <div
        onClick={(e) => { e.stopPropagation(); onClick?.(entry); }}
        className="text-[10px] font-semibold px-1.5 py-0.5 rounded truncate cursor-pointer select-none hover:opacity-80 transition-opacity"
        style={{ backgroundColor: colors.bg, color: colors.text, borderLeft: `2px solid ${colors.border}` }}
      >
        {showName ? entry.personName.split(' ')[0] : getInitials(entry.personName)}
      </div>
      {hover && <Tooltip entry={entry} />}
    </div>
  );
}

// ── Month View ──────────────────────────────────────────
function MonthGrid({ entries, currentMonth, onEntryClick }) {
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = [];
  let d = gridStart;
  while (d <= gridEnd) {
    days.push(new Date(d));
    d = addDays(d, 1);
  }

  const weeks = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      {/* Day headers */}
      <div className="grid grid-cols-7 border-b border-[#EBEBF5]">
        {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
          <div key={d} className="px-2 py-2 text-center text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] bg-[#F6F6FB]">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-b border-[#EBEBF5] last:border-0">
          {week.map((day, di) => {
            const inMonth = isSameMonth(day, currentMonth);
            const today = isToday(day);
            const dayStr = format(day, 'yyyy-MM-dd');
            const dayEntries = entries.filter(e => entrySpansDay(e, day));
            const overlapCount = dayEntries.length;
            const isOverlap = overlapCount >= 2;
            return (
              <div
                key={di}
                className={`min-h-[80px] px-1.5 py-1.5 border-r border-[#EBEBF5] last:border-0 relative ${!inMonth ? 'bg-[#FAFAFA]' : ''} ${isOverlap ? 'bg-[#FFFBEB]' : ''}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className={`text-[11px] font-semibold w-5 h-5 flex items-center justify-center rounded-full ${today ? 'bg-[#8403C5] text-white' : inMonth ? 'text-[#242450]' : 'text-[#D1D5DB]'}`}>
                    {format(day, 'd')}
                  </div>
                  {isOverlap && (
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${overlapCount >= 3 ? 'bg-[#DC2626] text-white' : 'bg-[#E8A020] text-white'}`} title={`${overlapCount} people on leave`}>
                      {overlapCount}
                    </span>
                  )}
                </div>
                <div className="space-y-0.5">
                  {dayEntries.slice(0, 3).map(e => (
                    <EntryChip key={e.id} entry={e} showName onClick={onEntryClick} />
                  ))}
                  {dayEntries.length > 3 && (
                    <div className="text-[9px] text-[#9CA3AF] font-medium">+{dayEntries.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Week View ───────────────────────────────────────────
function WeekGrid({ entries, weekStart, onEntryClick }) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#EBEBF5]">
        {days.map((day, i) => {
          const dayEntries = entries.filter(e => entrySpansDay(e, day));
          const today = isToday(day);
          const overlapCount = dayEntries.length;
          const isOverlap = overlapCount >= 2;
          return (
            <div key={i} className={`border-r border-[#EBEBF5] last:border-0 ${isOverlap ? 'bg-[#FFFBEB]' : ''}`}>
              <div className={`px-3 py-2 text-center bg-[#F6F6FB] border-b border-[#EBEBF5] relative`}>
                <div className={`text-[11px] font-semibold uppercase tracking-[0.06em] ${today ? 'text-[#8403C5]' : 'text-[#5777AB]'}`}>
                  {format(day, 'EEE')}
                </div>
                <div className={`text-lg font-bold mt-0.5 ${today ? 'text-[#8403C5]' : 'text-[#242450]'}`}>
                  {format(day, 'd')}
                </div>
                {dayEntries.length > 0 && (
                  <div className={`text-[10px] mt-0.5 ${isOverlap ? 'font-bold' : 'text-[#9CA3AF]'} ${isOverlap ? (overlapCount >= 3 ? 'text-[#DC2626]' : 'text-[#A16207]') : 'text-[#9CA3AF]'}`}>
                    {dayEntries.length} out
                  </div>
                )}
                {isOverlap && (
                  <span className={`absolute top-1.5 right-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full ${overlapCount >= 3 ? 'bg-[#DC2626] text-white' : 'bg-[#E8A020] text-white'}`} title={`${overlapCount} people on leave`}>
                    {overlapCount}
                  </span>
                )}
              </div>
              <div className="p-2 min-h-[120px] space-y-1">
                {dayEntries.map(e => (
                  <EntryChip key={e.id} entry={e} showName onClick={onEntryClick} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Calendar Component ─────────────────────────────
export default function LeaveCalendar({ entries, dateFilter, customStart, customEnd, onEntryClick }) {
  const now = new Date();
  const [currentMonth, setCurrentMonth] = useState(
    dateFilter === 'next_month' ? addMonths(now, 1) : now
  );

  const isWeekView = dateFilter === 'this_week';

  const weekStart = useMemo(() => {
    if (customStart) return startOfWeek(new Date(customStart), { weekStartsOn: 1 });
    return startOfWeek(now, { weekStartsOn: 1 });
  }, [customStart]);

  // When dateFilter changes, snap the calendar to the right month
  React.useEffect(() => {
    if (dateFilter === 'next_month') setCurrentMonth(addMonths(now, 1));
    else if (dateFilter === 'this_month' || dateFilter === 'this_week') setCurrentMonth(now);
    else if (dateFilter === 'custom' && customStart) setCurrentMonth(new Date(customStart));
  }, [dateFilter, customStart]);

  const displayLabel = isWeekView
    ? `Week of ${format(weekStart, 'd MMM yyyy')}`
    : format(currentMonth, 'MMMM yyyy');

  return (
    <div>
      {/* Calendar nav */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {!isWeekView && (
            <>
              <button onClick={() => setCurrentMonth(m => subMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-[#F6F6FB] border border-[#EBEBF5] text-[#5777AB]">
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button onClick={() => setCurrentMonth(m => addMonths(m, 1))}
                className="p-1.5 rounded-lg hover:bg-[#F6F6FB] border border-[#EBEBF5] text-[#5777AB]">
                <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}
          <span className="text-sm font-bold text-[#242450]">{displayLabel}</span>
        </div>
        {!isWeekView && (
          <button onClick={() => setCurrentMonth(now)}
            className="px-3 py-1 text-xs font-semibold bg-white border border-[#EBEBF5] text-[#5777AB] rounded-lg hover:bg-[#F6F6FB] transition-colors">
            This month
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 mb-4">
        {Object.entries(TYPE_COLORS).map(([type, c]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: c.bg, border: `1px solid ${c.border}` }} />
            <span className="text-xs text-[#5777AB]">{type}</span>
          </div>
        ))}
      </div>

      {isWeekView
        ? <WeekGrid entries={entries} weekStart={weekStart} onEntryClick={onEntryClick} />
        : <MonthGrid entries={entries} currentMonth={currentMonth} onEntryClick={onEntryClick} />
      }
    </div>
  );
}