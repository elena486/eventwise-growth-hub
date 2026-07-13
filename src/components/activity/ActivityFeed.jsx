import React, { useState, useMemo } from 'react';
import { format, parseISO, startOfWeek, endOfWeek, startOfMonth, endOfMonth, subMonths, isWithinInterval } from 'date-fns';
import { Search, X } from 'lucide-react';
import { SECTION_COLORS } from '@/lib/logActivity';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const SECTIONS = ['Sprints', 'Time & Capacity', 'To-Do Board', 'Customer Success', 'Sales', 'Competitors', 'Time Off', 'Authentication'];

function fmtTimestamp(dateStr) {
  if (!dateStr) return '';
  const d = parseISO(dateStr);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return `Today at ${format(d, 'HH:mm')}`;
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday at ${format(d, 'HH:mm')}`;
  return format(d, 'EEE MMM d — HH:mm');
}

function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

export default function ActivityFeed({ activities }) {
  const [memberFilter, setMemberFilter] = useState([]);
  const [sectionFilter, setSectionFilter] = useState([]);
  const [dateFilter, setDateFilter] = useState('this_month');
  const [keyword, setKeyword] = useState('');

  const toggle = (setter, arr, val) => setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);

  const dateRange = useMemo(() => {
    const now = new Date();
    switch (dateFilter) {
      case 'this_week': return { start: startOfWeek(now, { weekStartsOn: 1 }), end: endOfWeek(now, { weekStartsOn: 1 }) };
      case 'this_month': return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'last_month': return { start: startOfMonth(subMonths(now, 1)), end: endOfMonth(subMonths(now, 1)) };
      default: return null; // all time
    }
  }, [dateFilter]);

  const filtered = useMemo(() => {
    return activities.filter(a => {
      if (memberFilter.length > 0 && !memberFilter.includes(a.teamMember)) return false;
      if (sectionFilter.length > 0 && !sectionFilter.includes(a.section)) return false;
      if (dateRange) {
        const d = parseISO(a.created_date || a.date);
        if (!isWithinInterval(d, { start: dateRange.start, end: dateRange.end })) return false;
      }
      if (keyword.trim()) {
        const kw = keyword.toLowerCase();
        const searchStr = `${a.teamMember} ${a.actionType} ${a.section} ${a.recordName} ${a.details}`.toLowerCase();
        if (!searchStr.includes(kw)) return false;
      }
      return true;
    }).sort((a, b) => new Date(b.created_date || b.date) - new Date(a.created_date || a.date));
  }, [activities, memberFilter, sectionFilter, dateRange, keyword]);

  const hasFilters = memberFilter.length > 0 || sectionFilter.length > 0 || dateFilter !== 'this_month' || keyword.trim();
  const clearFilters = () => {
    setMemberFilter([]);
    setSectionFilter([]);
    setDateFilter('this_month');
    setKeyword('');
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        {/* Date range */}
        {[
          { id: 'this_week', label: 'This week' },
          { id: 'this_month', label: 'This month' },
          { id: 'last_month', label: 'Last month' },
          { id: 'all', label: 'All time' },
        ].map(p => (
          <button key={p.id} onClick={() => setDateFilter(p.id)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${dateFilter === p.id ? 'bg-[#242450] text-white' : 'bg-white text-[#5777AB] border border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            {p.label}
          </button>
        ))}

        <span className="w-px h-5 bg-[#EBEBF5] mx-1" />

        {/* Member filter */}
        {TEAM_MEMBERS.map(m => (
          <button key={m} onClick={() => toggle(setMemberFilter, memberFilter, m)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${memberFilter.includes(m) ? 'bg-[#8403C5] text-white' : 'bg-white text-[#5777AB] border border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            {m}
          </button>
        ))}

        <span className="w-px h-5 bg-[#EBEBF5] mx-1" />

        {/* Section filter */}
        {SECTIONS.map(s => (
          <button key={s} onClick={() => toggle(setSectionFilter, sectionFilter, s)}
            className={`px-2.5 py-1 text-[11px] font-medium rounded-lg transition-colors ${sectionFilter.includes(s) ? 'text-white' : 'bg-white text-[#5777AB] border border-[#EBEBF5] hover:border-[#D8D8EE]'}`}
            style={sectionFilter.includes(s) ? { backgroundColor: SECTION_COLORS[s] || '#9CA3AF' } : {}}>
            {s}
          </button>
        ))}

        {/* Search */}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
          <input type="text" value={keyword} onChange={e => setKeyword(e.target.value)}
            placeholder="Search..."
            className="pl-7 pr-3 py-1.5 text-xs border border-[#EBEBF5] rounded-lg bg-white w-40 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20" />
        </div>

        {hasFilters && (
          <button onClick={clearFilters}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors">
            <X className="w-3 h-3" /> Clear
          </button>
        )}
      </div>

      {/* Feed */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-16 text-center">
          <p className="text-sm text-[#5777AB]">
            {activities.length === 0
              ? 'No activity recorded yet — activity will appear here as the team uses the hub'
              : 'No activity matches your filters'}
          </p>
        </div>
      ) : (
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          {filtered.map((a, i) => {
            const color = SECTION_COLORS[a.section] || '#9CA3AF';
            return (
              <div key={a.id || i} className="flex items-start gap-3 px-4 py-3 border-t border-[#F2F2F4] first:border-t-0 hover:bg-[#F6F6FB] transition-colors">
                <div className="w-8 h-8 rounded-full bg-[#F0EAF8] flex items-center justify-center text-[10px] font-bold text-[#8403C5] shrink-0 mt-0.5">
                  {getInitials(a.teamMember)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-[#242450] leading-relaxed">
                    <span className="font-semibold">{a.teamMember}</span>{' '}
                    <span>{a.actionType}</span>
                    {a.recordName ? <span className="text-[#5777AB]"> — {a.recordName}</span> : ''}
                    {a.details ? <span className="text-[#5777AB]"> — {a.details}</span> : ''}
                  </p>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">{fmtTimestamp(a.created_date || a.date)}</p>
                </div>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md shrink-0 mt-0.5"
                  style={{ backgroundColor: `${color}18`, color }}>
                  {a.section}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}