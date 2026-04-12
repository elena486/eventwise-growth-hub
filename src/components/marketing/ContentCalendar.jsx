import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, LayoutGrid } from 'lucide-react';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const YEARS = Array.from({ length: 10 }, (_, i) => 2020 + i);

export default function ContentCalendar({ items, onSelectItem, onToggle, onAdd }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth());
  const [year, setYear] = useState(now.getFullYear());

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();
  const offset = firstDay === 0 ? 6 : firstDay - 1;

  const byDay = {};
  items.forEach(item => {
    if (!item.publishDate) return;
    const d = new Date(item.publishDate);
    if (d.getFullYear() === year && d.getMonth() === month) {
      const day = d.getDate();
      if (!byDay[day]) byDay[day] = [];
      byDay[day].push(item);
    }
  });

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1); } else setMonth(m => m - 1); };
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1); } else setMonth(m => m + 1); };

  const cells = [];
  for (let i = 0; i < offset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#f5f6fa]">
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
        <button onClick={onToggle} className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 bg-white">
          <LayoutGrid className="w-3.5 h-3.5" /> Kanban
        </button>
        <div className="flex items-center gap-2 ml-2">
          <button onClick={prevMonth} className="p-1 text-gray-400 hover:text-gray-700"><ChevronLeft className="w-4 h-4" /></button>
          <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none" value={month} onChange={e => setMonth(Number(e.target.value))}>
            {MONTHS.map((m, i) => <option key={m} value={i}>{m}</option>)}
          </select>
          <select className="border border-gray-200 rounded-lg px-2 py-1 text-sm outline-none" value={year} onChange={e => setYear(Number(e.target.value))}>
            {YEARS.map(y => <option key={y}>{y}</option>)}
          </select>
          <button onClick={nextMonth} className="p-1 text-gray-400 hover:text-gray-700"><ChevronRight className="w-4 h-4" /></button>
        </div>
        <button onClick={onAdd} className="ml-auto flex items-center gap-1.5 px-3 py-1.5 bg-[#8403C5] text-white rounded-lg text-xs font-semibold">
          <Plus className="w-3.5 h-3.5" /> New Content
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="grid grid-cols-7 gap-1 mb-2">
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((day, i) => (
              <div key={i} className={`min-h-[80px] rounded-lg p-1 ${day ? 'bg-gray-50' : ''}`}>
                {day && <div className="text-xs font-semibold text-gray-700 mb-1 px-1">{day}</div>}
                {day && (byDay[day] || []).map(item => (
                  <div key={item.id} onClick={() => onSelectItem(item)}
                    className={`text-[10px] px-1.5 py-0.5 rounded mb-0.5 cursor-pointer font-medium truncate ${item.pagePostedOn?.includes('Chris') ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-[#8403C5]'}`}>
                    {item.title}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}