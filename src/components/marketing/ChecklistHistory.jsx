import React, { useState, useMemo } from 'react';
import { format, parseISO, subDays, startOfWeek, addDays } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';

const COMMENTS_TARGET = 10;
const DMS_TARGET = 10;

function isWeekday(d) { const day = d.getDay(); return day >= 1 && day <= 5; }
function isComplete(rec) { return !!rec && (rec.commentsCount || 0) >= COMMENTS_TARGET && !!rec.repliesDone; }

export default function ChecklistHistory({ records }) {
  const [view, setView] = useState('daily');
  const [open, setOpen] = useState(false);

  const recordByDate = useMemo(() => {
    const m = {};
    records.forEach(r => { if (r.date) m[r.date] = r; });
    return m;
  }, [records]);

  // Daily — last 30 calendar days (weekdays only, past)
  const dailyRows = useMemo(() => {
    const rows = [];
    const today = new Date();
    for (let i = 1; i <= 30; i++) {
      const d = subDays(today, i);
      if (!isWeekday(d)) continue;
      const ds = format(d, 'yyyy-MM-dd');
      const rec = recordByDate[ds];
      const comments = rec?.commentsCount ?? 0;
      const replies = !!rec?.repliesDone;
      const status = !rec ? 'Missed' : isComplete(rec) ? 'Complete' : 'Partial';
      rows.push({ date: ds, comments, replies, status });
    }
    return rows;
  }, [recordByDate]);

  // Weekly — last 12 weeks
  const weeklyRows = useMemo(() => {
    const rows = [];
    const today = new Date();
    let monday = startOfWeek(today, { weekStartsOn: 1 });
    for (let w = 0; w < 12; w++) {
      const startStr = format(monday, 'yyyy-MM-dd');
      const endStr = format(addDays(monday, 6), 'yyyy-MM-dd');
      const weekRecs = records.filter(r => r.date >= startStr && r.date <= endStr);
      const dms = weekRecs.reduce((mx, r) => Math.max(mx, r.dmsCount || 0), 0);
      const blog = weekRecs.some(r => r.blogPublished);
      const complete = dms >= DMS_TARGET && blog;
      const status = weekRecs.length === 0 ? 'Missed' : complete ? 'Complete' : 'Partial';
      rows.push({ weekOf: startStr, dms, blog, status });
      monday = subDays(monday, 7);
    }
    return rows;
  }, [records]);

  // Stats
  const stats = useMemo(() => {
    const today = new Date();
    const monday = startOfWeek(today, { weekStartsOn: 1 });

    // This week — weekdays Mon..today
    let weekDays = 0, weekComplete = 0;
    for (let i = 0; i < 5; i++) {
      const d = addDays(monday, i);
      if (d > today) break;
      if (!isWeekday(d)) continue;
      weekDays++;
      if (isComplete(recordByDate[format(d, 'yyyy-MM-dd')])) weekComplete++;
    }

    // This month — weekdays 1st..today
    let monthDays = 0, monthComplete = 0;
    for (let d = new Date(today.getFullYear(), today.getMonth(), 1); d <= today; d = addDays(d, 1)) {
      if (!isWeekday(d)) continue;
      monthDays++;
      if (isComplete(recordByDate[format(d, 'yyyy-MM-dd')])) monthComplete++;
    }
    const monthPct = monthDays > 0 ? Math.round((monthComplete / monthDays) * 100) : 0;

    // Streak — consecutive past weekdays complete
    let streak = 0;
    let cursor = subDays(today, 1);
    while (cursor < today && !isWeekday(cursor)) cursor = subDays(cursor, 1);
    while (isComplete(recordByDate[format(cursor, 'yyyy-MM-dd')])) {
      streak++;
      cursor = subDays(cursor, 1);
      while (!isWeekday(cursor)) cursor = subDays(cursor, 1);
    }

    return { weekComplete, weekDays: weekDays || 5, monthPct, streak };
  }, [recordByDate]);

  const statusChip = (s) => {
    if (s === 'Complete') return 'chip-green';
    if (s === 'Partial') return 'chip-amber';
    return 'chip-red';
  };

  return (
    <div className="mt-4">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-[#5777AB] hover:text-[#242450] transition-colors">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        History &amp; stats
      </button>

      {open && (
        <div className="mt-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-[#F9FAFB] border border-[#EBEBF5] rounded-lg px-4 py-3">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">This week</p>
              <p className="text-base font-bold text-[#242450] mt-0.5">{stats.weekComplete}/{stats.weekDays} <span className="text-xs font-normal text-[#9CA3AF]">days completed</span></p>
            </div>
            <div className="bg-[#F9FAFB] border border-[#EBEBF5] rounded-lg px-4 py-3">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">This month</p>
              <p className="text-base font-bold text-[#242450] mt-0.5">{stats.monthPct}% <span className="text-xs font-normal text-[#9CA3AF]">completion</span></p>
            </div>
            <div className="bg-[#F9FAFB] border border-[#EBEBF5] rounded-lg px-4 py-3">
              <p className="text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-wide">Current streak</p>
              <p className="text-base font-bold text-[#242450] mt-0.5">{stats.streak} <span className="text-xs font-normal text-[#9CA3AF]">days ✓</span></p>
            </div>
          </div>

          <div className="flex gap-1 mb-3">
            <button onClick={() => setView('daily')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view === 'daily' ? 'bg-[#8403C5] text-white' : 'bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F9FAFB]'}`}>Daily (30 days)</button>
            <button onClick={() => setView('weekly')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${view === 'weekly' ? 'bg-[#8403C5] text-white' : 'bg-white border border-[#EBEBF5] text-[#5777AB] hover:bg-[#F9FAFB]'}`}>Weekly (12 weeks)</button>
          </div>

          {view === 'daily' ? (
            <div className="border border-[#EBEBF5] rounded-lg overflow-x-auto">
              <table>
                <thead><tr><th>Date</th><th>Comments</th><th>Replies</th><th>Status</th></tr></thead>
                <tbody>
                  {dailyRows.map(r => (
                    <tr key={r.date}>
                      <td className="text-[#242450] font-medium">{format(parseISO(r.date), 'EEE d MMM')}</td>
                      <td>{r.comments}/{COMMENTS_TARGET}</td>
                      <td>{r.replies ? '✓' : '✗'}</td>
                      <td><span className={`chip ${statusChip(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="border border-[#EBEBF5] rounded-lg overflow-x-auto">
              <table>
                <thead><tr><th>Week of</th><th>DMs</th><th>Blog</th><th>Status</th></tr></thead>
                <tbody>
                  {weeklyRows.map(r => (
                    <tr key={r.weekOf}>
                      <td className="text-[#242450] font-medium">{format(parseISO(r.weekOf), 'd MMM yyyy')}</td>
                      <td>{r.dms}/{DMS_TARGET}</td>
                      <td>{r.blog ? '✓' : '✗'}</td>
                      <td><span className={`chip ${statusChip(r.status)}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}