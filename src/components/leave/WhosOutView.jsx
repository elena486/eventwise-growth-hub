import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, addMonths } from 'date-fns';
import { List, CalendarDays } from 'lucide-react';
import LeaveCalendar from './LeaveCalendar';

const TYPE_STYLES = {
  'Annual Leave': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Sick': 'bg-[#FFFBEB] text-[#A16207]',
  'Other': 'bg-[#EBEBF5] text-[#5777AB]',
};

const STATUS_STYLES = {
  Confirmed: 'bg-[#E8F7F2] text-[#1D9E75]',
  Approved:  'bg-[#EEF2F8] text-[#5777AB]',
  Requested: 'bg-[#FFFBEB] text-[#A16207]',
  Declined:  'bg-[#FEF2F2] text-[#DC2626]',
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

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

function calcWorkingDays(start, end) {
  if (!start || !end) return 0;
  try {
    let s = new Date(start), e = new Date(end), count = 0;
    while (s <= e) {
      const d = s.getDay();
      if (d !== 0 && d !== 6) count++;
      s = new Date(s.getTime() + 86400000);
    }
    return Math.max(count, 1);
  } catch { return 1; }
}

const DATE_FILTERS = [
  { id: 'this_week', label: 'This week' },
  { id: 'this_month', label: 'This month' },
  { id: 'next_month', label: 'Next month' },
  { id: 'custom', label: 'Custom' },
];

// showAllStatuses = true means show all (for Time Off tab which shows history)
// default = false means only Confirmed/Approved (for Leave tab who's out view)
export default function WhosOutView({ refresh, showAllStatuses = false }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [personFilters, setPersonFilters] = useState([]);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'calendar'

  const load = async () => {
    setLoading(true);
    const query = showAllStatuses
      ? {}
      : { status: { $in: ['Confirmed', 'Approved'] } };
    const data = await base44.entities.LeaveEntry.filter(query, 'startDate', 500);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const now = new Date();
  const dateRanges = useMemo(() => ({
    this_week: { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) },
    this_month: { start: startOfMonth(now), end: endOfMonth(now) },
    next_month: { start: startOfMonth(addMonths(now, 1)), end: endOfMonth(addMonths(now, 1)) },
  }), []);

  const filtered = useMemo(() => {
    return entries.filter(e => {
      if (personFilters.length > 0 && !personFilters.includes(e.personName)) return false;
      const start = e.startDate ? new Date(e.startDate) : null;
      const end = e.endDate ? new Date(e.endDate) : null;
      if (!start || !end) return false;

      if (dateFilter === 'custom') {
        if (!customStart && !customEnd) return true;
        const rangeStart = customStart ? new Date(customStart) : null;
        const rangeEnd = customEnd ? new Date(customEnd) : null;
        if (rangeStart && end < rangeStart) return false;
        if (rangeEnd && start > rangeEnd) return false;
        return true;
      }

      const range = dateRanges[dateFilter];
      if (!range) return true;
      return start <= range.end && end >= range.start;
    });
  }, [entries, dateFilter, customStart, customEnd, personFilters, dateRanges]);

  // Calendar only shows confirmed/approved
  const calendarEntries = useMemo(() => filtered.filter(e => e.status === 'Confirmed' || e.status === 'Approved'), [filtered]);

  const allPeople = useMemo(() => [...new Set(entries.map(e => e.personName).filter(Boolean))].sort(), [entries]);
  const hasNotes = filtered.some(e => e.notes);

  const togglePerson = (name) => {
    setPersonFilters(prev => prev.includes(name) ? prev.filter(p => p !== name) : [...prev, name]);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Toolbar: filters + view toggle */}
      <div className="flex flex-wrap items-center gap-3 mb-5">
        {/* Date filter pills */}
        <div className="flex items-center gap-1">
          {DATE_FILTERS.map(f => (
            <button key={f.id} onClick={() => setDateFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${dateFilter === f.id ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:bg-[#F6F6FB]'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {dateFilter === 'custom' && (
          <div className="flex items-center gap-2">
            <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
              className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
            <span className="text-xs text-[#9CA3AF]">to</span>
            <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
              className="px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
          </div>
        )}

        {/* Person filter */}
        {allPeople.length > 1 && (
          <div className="flex items-center gap-1 flex-wrap">
            {allPeople.map(p => (
              <button key={p} onClick={() => togglePerson(p)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${personFilters.includes(p) ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:bg-[#F6F6FB]'}`}>
                {p}
              </button>
            ))}
            {personFilters.length > 0 && (
              <button onClick={() => setPersonFilters([])} className="px-2 py-1 text-xs text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg border border-[#FECACA]">Clear</button>
            )}
          </div>
        )}

        {/* View toggle */}
        <div className="ml-auto flex border border-[#EBEBF5] rounded-lg overflow-hidden bg-white shrink-0">
          <button onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'list' ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            <List className="w-3.5 h-3.5" /> List
          </button>
          <button onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold transition-colors ${viewMode === 'calendar' ? 'bg-[#242450] text-white' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}>
            <CalendarDays className="w-3.5 h-3.5" /> Calendar
          </button>
        </div>
      </div>

      {/* Calendar view */}
      {viewMode === 'calendar' && (
        <LeaveCalendar
          entries={calendarEntries}
          dateFilter={dateFilter}
          customStart={customStart}
          customEnd={customEnd}
        />
      )}

      {/* List view */}
      {viewMode === 'list' && (
        filtered.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-12 text-center">
            <p className="text-sm font-medium text-[#5777AB]">No leave entries for this period</p>
          </div>
        ) : (
          <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#EBEBF5] bg-[#F6F6FB]">
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Person</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Type</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Start</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">End</th>
                  <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Days</th>
                  {showAllStatuses && <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Status</th>}
                  {hasNotes && <th className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Notes</th>}
                </tr>
              </thead>
              <tbody>
                {filtered.map(entry => {
                  const days = calcWorkingDays(entry.startDate, entry.endDate);
                  const color = getAvatarColor(entry.personName);
                  const initials = getInitials(entry.personName);
                  return (
                    <tr key={entry.id} className="border-b border-[#EBEBF5] hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: color }}>
                            {initials}
                          </div>
                          <span className="text-sm font-semibold text-[#242450]">{entry.personName}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${TYPE_STYLES[entry.type] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                          {entry.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#1A1A3A]">{fmtDate(entry.startDate)}</td>
                      <td className="px-4 py-3 text-sm text-[#1A1A3A]">{fmtDate(entry.endDate)}</td>
                      <td className="px-4 py-3 text-sm font-semibold text-[#242450]">{days}</td>
                      {showAllStatuses && (
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[entry.status] || 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                            {entry.status}
                          </span>
                        </td>
                      )}
                      {hasNotes && <td className="px-4 py-3 text-xs text-[#5777AB] max-w-[200px]"><span className="line-clamp-2">{entry.notes || '—'}</span></td>}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}