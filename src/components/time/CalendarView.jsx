/**
 * CalendarView — period-aware calendar for MyTimesheet
 * Modes: day (single column), week (7 side-by-side columns), month (grid)
 */
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { format, addDays, parseISO, startOfMonth, endOfMonth, startOfWeek, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import TaskPresetSelect from './TaskPresetSelect';
import LeadSelect from './LeadSelect';
import EntryDetailModal from './EntryDetailModal';

const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00–22:00
const HOUR_HEIGHT = 56;
const LEFT_GUTTER = 52;
const SNAP_MINUTES = 15;

function fmtDur(min) {
  const h = Math.floor(min / 60); const m = min % 60;
  if (!h && !m) return '0m'; if (!h) return `${m}m`; if (!m) return `${h}h`; return `${h}h ${m}m`;
}
function snapHour(h) { return Math.round(h * 60 / SNAP_MINUTES) * SNAP_MINUTES / 60; }
function hourToPx(h) { return (h - 7) * HOUR_HEIGHT; }
function pxToHour(px) { return 7 + px / HOUR_HEIGHT; }
function hourToISO(dateStr, h) {
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return `${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}
function isoToHour(iso) {
  try { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; } catch { return null; }
}
function assignColumns(items) {
  const sorted = [...items].sort((a, b) => a.startH - b.startH);
  const cols = [];
  sorted.forEach(item => {
    let placed = false;
    for (let ci = 0; ci < cols.length; ci++) {
      const last = cols[ci][cols[ci].length - 1];
      if (item.startH >= last.endH - 0.01) { cols[ci].push(item); item.col = ci; placed = true; break; }
    }
    if (!placed) { item.col = cols.length; cols.push([item]); }
  });
  const totalCols = cols.length || 1;
  return sorted.map(item => ({ ...item, totalCols }));
}

// ── Single Day Column ──
function DayColumn({ dateStr, entries, teamMember, clients, onEntryCreated, onEntryUpdated, onEntryDeleted, onOpenEntry, sharedGridRef, scrollOffset }) {
  const colRef = useRef(null);
  const [ghost, setGhost] = useState(null);
  const [creating, setCreating] = useState(null);
  const dragRef = useRef(null);
  const [dragging, setDragging] = useState(null);
  const [newForm, setNewForm] = useState(null);

  const positioned = useMemo(() => {
    const raw = entries
      .filter(e => e.timerStartedAt && e.timerStoppedAt)
      .map(e => {
        const startH = isoToHour(e.timerStartedAt);
        const endH = isoToHour(e.timerStoppedAt);
        if (startH == null || endH == null || startH < 7 || startH > 22) return null;
        return { entry: e, startH, endH };
      }).filter(Boolean);
    return assignColumns(raw);
  }, [entries]);

  const untimed = useMemo(() => entries.filter(e => !e.timerStartedAt || !e.timerStoppedAt), [entries]);

  const getColY = useCallback((clientY) => {
    const ref = sharedGridRef?.current || colRef.current;
    if (!ref) return 0;
    const rect = ref.getBoundingClientRect();
    return clientY - rect.top + (ref.scrollTop || scrollOffset || 0);
  }, [sharedGridRef, scrollOffset]);

  const handleMouseDown = useCallback((e) => {
    if (e.target !== colRef.current && !e.target.classList.contains('cal-col-empty')) return;
    if (e.button !== 0) return;
    const y = getColY(e.clientY);
    const rawH = pxToHour(y);
    if (rawH < 7 || rawH > 22) return;
    const startH = snapHour(rawH);
    setGhost({ startH, endH: startH + 0.5 });
    setCreating({ startH, startY: e.clientY });
    e.preventDefault();
  }, [getColY]);

  useEffect(() => {
    const move = (e) => {
      if (creating) {
        const y = getColY(e.clientY);
        const endH = Math.min(22, Math.max(creating.startH + 0.25, snapHour(pxToHour(y))));
        setGhost({ startH: creating.startH, endH });
        return;
      }
      if (dragRef.current) {
        const { type, startMouseY, origStartH, origEndH, entryId } = dragRef.current;
        const deltaH = (e.clientY - startMouseY) / HOUR_HEIGHT;
        let ns = origStartH, ne = origEndH;
        if (type === 'move') { const dur = origEndH - origStartH; ns = Math.max(7, Math.min(22 - dur, snapHour(origStartH + deltaH))); ne = ns + dur; }
        else if (type === 'resize-bottom') ne = Math.max(origStartH + 0.25, Math.min(22, snapHour(origEndH + deltaH)));
        else if (type === 'resize-top') ns = Math.min(origEndH - 0.25, Math.max(7, snapHour(origStartH + deltaH)));
        setDragging({ entryId, startH: ns, endH: ne });
      }
    };
    const up = async () => {
      if (creating && ghost) {
        setCreating(null);
        const finalStart = ghost.startH;
        const finalEnd = (ghost.endH - ghost.startH) < 0.1 ? finalStart + 0.5 : ghost.endH;
        setGhost(null);
        setNewForm({ startH: finalStart, endH: finalEnd, category: '', task: '', clientId: '', clientName: '', leadId: '', leadName: '', saving: false, error: '' });
        return;
      }
      if (dragRef.current && dragging) {
        const { entryId } = dragRef.current;
        const { startH, endH } = dragging;
        dragRef.current = null; setDragging(null);
        const entry = entries.find(en => en.id === entryId);
        if (!entry) return;
        const durationMinutes = Math.round((endH - startH) * 60);
        const newStartISO = hourToISO(dateStr, startH);
        const newEndISO = hourToISO(dateStr, endH);
        await base44.entities.TimeEntry.update(entryId, { timerStartedAt: newStartISO, timerStoppedAt: newEndISO, durationMinutes }).catch(() => {});
        onEntryUpdated?.({ ...entry, timerStartedAt: newStartISO, timerStoppedAt: newEndISO, durationMinutes });
        return;
      }
      dragRef.current = null; setDragging(null);
    };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', up); };
  }, [creating, ghost, dragging, entries, dateStr, getColY]);

  const startEntryDrag = useCallback((e, type, entry) => {
    e.stopPropagation(); e.preventDefault();
    dragRef.current = { type, entryId: entry.id, startMouseY: e.clientY, origStartH: isoToHour(entry.timerStartedAt), origEndH: isoToHour(entry.timerStoppedAt) };
    setDragging({ entryId: entry.id, startH: isoToHour(entry.timerStartedAt), endH: isoToHour(entry.timerStoppedAt) });
  }, []);

  const handleSaveNew = async () => {
    if (!newForm.category || !newForm.task.trim()) { setNewForm(f => ({ ...f, error: 'Category and Task required.' })); return; }
    setNewForm(f => ({ ...f, saving: true, error: '' }));
    const durationMinutes = Math.round((newForm.endH - newForm.startH) * 60);
    const created = await base44.entities.TimeEntry.create({
      date: dateStr, teamMember, category: newForm.category, projectTask: newForm.task.trim(),
      durationMinutes, timerStartedAt: hourToISO(dateStr, newForm.startH), timerStoppedAt: hourToISO(dateStr, newForm.endH),
      timerStatus: 'logged',
      ...(newForm.clientId ? { clientId: newForm.clientId, clientName: newForm.clientName } : {}),
      ...(newForm.leadId ? { leadId: newForm.leadId, leadName: newForm.leadName } : {}),
    }).catch(() => null);
    if (!created) { setNewForm(f => ({ ...f, saving: false, error: 'Failed — try again.' })); return; }
    setNewForm(null);
    onEntryCreated?.(created);
  };

  const totalHeight = CALENDAR_HOURS.length * HOUR_HEIGHT;
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const showNowLine = dateStr === format(now, 'yyyy-MM-dd') && currentHourDecimal >= 7 && currentHourDecimal <= 22;

  return (
    <div className="relative flex-1 min-w-0 border-l border-[#EBEBF5] first:border-l-0"
      ref={colRef}
      onMouseDown={handleMouseDown}
      style={{ height: `${totalHeight}px` }}
    >
      {/* Hour grid lines (only show in first column to avoid duplicates — controlled by parent) */}
      {ghost && (
        <div className="absolute pointer-events-none z-30 rounded"
          style={{ left: '2px', right: '2px', top: `${hourToPx(ghost.startH)}px`, height: `${Math.max(8, hourToPx(ghost.endH) - hourToPx(ghost.startH))}px`, backgroundColor: '#8403C520', border: '2px dashed #8403C5' }}>
          <span className="text-[9px] font-bold text-[#8403C5] px-1">{fmtDur(Math.round((ghost.endH - ghost.startH) * 60))}</span>
        </div>
      )}

      {/* Entry blocks */}
      {positioned.map(({ entry, startH, endH, col, totalCols }) => {
        const isDragging = dragging?.entryId === entry.id;
        const dStartH = isDragging ? dragging.startH : startH;
        const dEndH = isDragging ? dragging.endH : endH;
        const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
        const blockH = Math.max(HOUR_HEIGHT / 4, hourToPx(dEndH) - hourToPx(dStartH));
        const colW = `calc((100% - 4px) / ${totalCols})`;
        const leftOff = `calc(2px + (100% - 4px) / ${totalCols} * ${col})`;
        return (
          <div key={entry.id}
            className="absolute rounded overflow-hidden z-10 group"
            style={{ left: leftOff, width: colW, top: `${hourToPx(dStartH)}px`, height: `${Math.min(blockH, totalHeight - hourToPx(dStartH))}px`, backgroundColor: `${color}18`, borderLeft: `3px solid ${color}`, cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.8 : 1, zIndex: isDragging ? 30 : 10 }}
            onMouseDown={(e) => { const r = e.currentTarget.getBoundingClientRect(); const pct = (e.clientY - r.top) / r.height; if (pct > 0.15 && pct < 0.85) startEntryDrag(e, 'move', entry); }}
            onClick={(e) => { if (!isDragging) { e.stopPropagation(); onOpenEntry?.(entry); } }}
            title={`${entry.category} · ${fmtDur(Math.round((dEndH - dStartH) * 60))} · ${entry.projectTask}`}
          >
            <div className="px-1.5 py-0.5 pointer-events-none overflow-hidden">
              <div className="flex items-baseline gap-1">
                <p className="text-[9px] font-semibold truncate shrink-0 max-w-[55%]" style={{ color }}>{entry.category}</p>
                <p className="text-[9px] font-bold text-[#242450] shrink-0">{fmtDur(Math.round((dEndH - dStartH) * 60))}</p>
              </div>
              {blockH >= 30 && <p className="text-[9px] text-[#242450] truncate">{entry.projectTask}</p>}
            </div>
            <div className="absolute top-0 left-0 right-0 h-[5px] cursor-n-resize opacity-0 group-hover:opacity-100" style={{ backgroundColor: `${color}40` }} onMouseDown={(e) => startEntryDrag(e, 'resize-top', entry)} />
            <div className="absolute bottom-0 left-0 right-0 h-[5px] cursor-s-resize opacity-0 group-hover:opacity-100" style={{ backgroundColor: `${color}40` }} onMouseDown={(e) => startEntryDrag(e, 'resize-bottom', entry)} />
          </div>
        );
      })}

      {/* Untimed */}
      {untimed.map((e, ci) => {
        const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
        return (
          <div key={e.id} className="absolute rounded px-1 py-0.5 z-10 cursor-pointer hover:opacity-90"
            style={{ left: '2px', right: '2px', top: `${ci * 22}px`, backgroundColor: `${color}12`, borderLeft: `2px solid ${color}` }}
            onClick={() => onOpenEntry?.(e)}>
            <p className="text-[8px] truncate text-[#242450]">{e.projectTask}</p>
          </div>
        );
      })}

      {/* Now line */}
      {showNowLine && (
        <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${hourToPx(currentHourDecimal)}px` }}>
          <div className="absolute left-0 right-0 h-px bg-[#DC2626]" />
        </div>
      )}

      {/* New entry inline form */}
      {newForm && (
        <div className="absolute z-50 bg-white border-2 border-[#8403C5] rounded-xl shadow-xl p-3"
          style={{ left: '4px', right: '4px', top: `${Math.min(hourToPx(newForm.startH), totalHeight - 220)}px`, minWidth: '180px' }}
          onClick={e => e.stopPropagation()} onMouseDown={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-bold text-[#242450]">
              {(() => { const sh = newForm.startH; const hh = Math.floor(sh); const mm = Math.round((sh - hh) * 60); const eh = newForm.endH; const ehh = Math.floor(eh); const emm = Math.round((eh - ehh) * 60); return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}–${String(ehh).padStart(2,'0')}:${String(emm).padStart(2,'0')}`; })()}
            </p>
            <button onClick={() => setNewForm(null)} className="text-[#9CA3AF] hover:text-[#242450] text-xs">✕</button>
          </div>
          <div className="space-y-1.5">
            <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value, task: '' }))}
              className={`w-full px-2 py-1 text-[11px] border rounded-lg focus:outline-none ${!newForm.category && newForm.error ? 'border-[#DC2626]' : 'border-[#EBEBF5] focus:border-[#8403C5]'}`}>
              <option value="">Category…</option>
              {CATEGORY_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <TaskPresetSelect category={newForm.category} value={newForm.task} onChange={v => setNewForm(f => ({ ...f, task: v }))} placeholder="Task…"
              className={`w-full px-2 py-1 text-[11px] border rounded-lg focus:outline-none ${!newForm.task && newForm.error ? 'border-[#DC2626]' : 'border-[#EBEBF5] focus:border-[#8403C5]'}`} />
            <select value={newForm.clientId} onChange={e => { const c = clients.find(cl => cl.id === e.target.value); setNewForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '', leadId: e.target.value ? '' : f.leadId, leadName: e.target.value ? '' : f.leadName })); }}
              className="w-full px-2 py-1 text-[11px] border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]">
              <option value="">No client</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <LeadSelect
              value={newForm.leadId}
              onChange={(id, name) => setNewForm(f => ({ ...f, leadId: id, leadName: name, clientId: id ? '' : f.clientId, clientName: id ? '' : f.clientName }))}
              className="w-full px-2 py-1 text-[11px] border border-[#EBEBF5] rounded-lg bg-white focus:outline-none"
            />
            {newForm.error && <p className="text-[9px] text-[#DC2626] font-semibold">{newForm.error}</p>}
            <div className="flex gap-1.5 pt-0.5">
              <button onClick={() => setNewForm(null)} className="flex-1 px-2 py-1 text-[11px] text-[#5777AB] border border-[#5777AB] rounded-lg hover:bg-[#EEF2F8]">Cancel</button>
              <button onClick={handleSaveNew} disabled={newForm.saving} className="flex-1 px-2 py-1 text-[11px] font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:opacity-50">
                {newForm.saving ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Multi-day (week) calendar — side-by-side columns ──
function MultiDayCalendar({ days, entriesByDate, teamMember, clients, onEntryCreated, onEntryUpdated, onEntryDeleted, onOpenEntry }) {
  const scrollRef = useRef(null);
  const totalHeight = CALENDAR_HOURS.length * HOUR_HEIGHT;
  const now = new Date();

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden select-none">
      {/* Column headers */}
      <div className="flex border-b border-[#EBEBF5]" style={{ marginLeft: `${LEFT_GUTTER}px` }}>
        {days.map(({ dateStr, label, dayTotal }) => (
          <div key={dateStr} className="flex-1 min-w-0 border-l border-[#EBEBF5] first:border-l-0 px-2 py-2 text-center">
            <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.05em]">{label}</p>
            {dayTotal > 0 && <p className="text-[10px] font-bold text-[#8403C5] mt-0.5">{fmtDur(dayTotal)}</p>}
            <p className="text-[9px] text-[#C4C6D4]">Click or drag to add</p>
          </div>
        ))}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="overflow-auto" style={{ maxHeight: 'calc(100vh - 380px)' }}>
        <div className="flex" style={{ height: `${totalHeight}px` }}>
          {/* Time gutter */}
          <div className="shrink-0 relative border-r border-[#EBEBF5]" style={{ width: `${LEFT_GUTTER}px` }}>
            {CALENDAR_HOURS.map(hour => (
              <div key={hour} className="absolute left-0 right-0 flex items-start justify-end pr-1.5"
                style={{ top: `${(hour - 7) * HOUR_HEIGHT}px`, height: `${HOUR_HEIGHT}px` }}>
                <span className="text-[9px] font-bold text-[#9CA3AF] leading-none">{String(hour).padStart(2, '0')}:00</span>
              </div>
            ))}
          </div>

          {/* Grid lines overlay + day columns */}
          <div className="flex flex-1 relative">
            {/* Horizontal hour lines */}
            <div className="absolute inset-0 pointer-events-none">
              {CALENDAR_HOURS.map(hour => (
                <React.Fragment key={hour}>
                  <div className="absolute left-0 right-0 border-t border-[#EBEBF5]" style={{ top: `${(hour - 7) * HOUR_HEIGHT}px` }} />
                  <div className="absolute left-0 right-0 border-t border-dashed border-[#F0F0F8]" style={{ top: `${(hour - 7) * HOUR_HEIGHT + HOUR_HEIGHT / 2}px` }} />
                </React.Fragment>
              ))}
            </div>

            {days.map(({ dateStr }) => (
              <DayColumn
                key={dateStr}
                dateStr={dateStr}
                entries={entriesByDate[dateStr] || []}
                teamMember={teamMember}
                clients={clients}
                onEntryCreated={onEntryCreated}
                onEntryUpdated={onEntryUpdated}
                onEntryDeleted={onEntryDeleted}
                onOpenEntry={onOpenEntry}
                sharedGridRef={scrollRef}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Month grid calendar ──
function MonthGridCalendar({ rangeStart, rangeEnd, entriesByDate, onDayClick }) {
  // Build weeks covering the range
  const monthStart = startOfMonth(rangeStart);
  const monthEnd = endOfMonth(rangeEnd);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const allDays = eachDayOfInterval({ start: gridStart, end: addDays(monthEnd, 6 - ((monthEnd.getDay() + 6) % 7)) });
  const weeks = [];
  for (let i = 0; i < allDays.length; i += 7) weeks.push(allDays.slice(i, i + 7));
  const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
      <div className="grid grid-cols-7 border-b border-[#EBEBF5]">
        {DAY_LABELS.map(d => (
          <div key={d} className="px-2 py-2 text-center text-[10px] font-bold text-[#5777AB] uppercase tracking-[0.08em] border-l border-[#EBEBF5] first:border-l-0">{d}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 border-t border-[#EBEBF5]">
          {week.map(day => {
            const ds = format(day, 'yyyy-MM-dd');
            const dayEntries = entriesByDate[ds] || [];
            const total = dayEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0);
            const inRange = day >= rangeStart && day <= rangeEnd;
            const isCurrentMonth = isSameMonth(day, rangeStart);
            const cats = [...new Set(dayEntries.map(e => e.category))].slice(0, 4);
            return (
              <div key={ds}
                onClick={() => inRange && onDayClick(ds)}
                className={`border-l border-[#EBEBF5] first:border-l-0 min-h-[80px] p-1.5 transition-colors ${inRange ? 'cursor-pointer hover:bg-[#F6F6FB]' : 'opacity-30'} ${isToday(day) ? 'bg-[#F3E8FF]/30' : ''}`}>
                <p className={`text-[11px] font-bold mb-1 ${isToday(day) ? 'text-[#8403C5]' : 'text-[#242450]'}`}>{format(day, 'd')}</p>
                {total > 0 && <p className="text-[10px] font-semibold text-[#5777AB] mb-1">{fmtDur(total)}</p>}
                <div className="flex flex-wrap gap-0.5">
                  {cats.map(cat => (
                    <span key={cat} className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#9CA3AF' }} title={cat} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

// ── Main CalendarView export ──
export default function CalendarView({ entries, weekStart, rangeStart, rangeEnd, period, currentUser, onEntryCreated, onEntryUpdated, onEntryDeleted, onOpenEntry }) {
  const [clients, setClients] = useState([]);
  const [drillDay, setDrillDay] = useState(null); // for month-grid drill-in
  const [detailEntry, setDetailEntry] = useState(null);

  useEffect(() => { base44.entities.Client.list().then(setClients).catch(() => {}); }, []);

  const entriesByDate = useMemo(() => {
    const map = {};
    entries.forEach(e => { if (!map[e.date]) map[e.date] = []; map[e.date].push(e); });
    return map;
  }, [entries]);

  const handleOpenEntry = (entry) => {
    setDetailEntry(entry);
    onOpenEntry?.(entry);
  };

  // Determine layout mode
  const diffDays = Math.round((rangeEnd - rangeStart) / 86400000) + 1;
  const isMonthMode = (period === 'this_month' || period === 'last_month') || (period === 'custom' && diffDays > 7);
  const isDayMode = period === 'today';

  // For drill-in from month view
  if (drillDay) {
    const drillEntries = entriesByDate[drillDay] || [];
    const drillDayObj = parseISO(drillDay);
    return (
      <div>
        <button onClick={() => setDrillDay(null)} className="flex items-center gap-1.5 text-xs font-semibold text-[#5777AB] hover:text-[#8403C5] mb-3 transition-colors">
          ← Back to month
        </button>
        <p className="text-sm font-bold text-[#242450] mb-3">{format(drillDayObj, 'EEEE, d MMMM yyyy')}</p>
        <MultiDayCalendar
          days={[{ dateStr: drillDay, label: format(drillDayObj, 'EEE d MMM'), dayTotal: drillEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0) }]}
          entriesByDate={entriesByDate}
          teamMember={currentUser}
          clients={clients}
          onEntryCreated={onEntryCreated}
          onEntryUpdated={onEntryUpdated}
          onEntryDeleted={onEntryDeleted}
          onOpenEntry={handleOpenEntry}
        />
        {detailEntry && (
          <EntryDetailModal entry={detailEntry} clients={clients} onClose={() => setDetailEntry(null)}
            onUpdated={(u) => { onEntryUpdated?.(u); setDetailEntry(null); }}
            onDeleted={(id) => { onEntryDeleted?.(id); setDetailEntry(null); }} />
        )}
      </div>
    );
  }

  if (isMonthMode) {
    return (
      <div>
        <MonthGridCalendar rangeStart={rangeStart} rangeEnd={rangeEnd} entriesByDate={entriesByDate} onDayClick={setDrillDay} />
        {detailEntry && (
          <EntryDetailModal entry={detailEntry} clients={clients} onClose={() => setDetailEntry(null)}
            onUpdated={(u) => { onEntryUpdated?.(u); setDetailEntry(null); }}
            onDeleted={(id) => { onEntryDeleted?.(id); setDetailEntry(null); }} />
        )}
      </div>
    );
  }

  // Week (or short custom range) — side-by-side columns
  const dayCount = Math.min(diffDays, 7);
  const days = Array.from({ length: dayCount }, (_, i) => {
    const date = addDays(rangeStart, i);
    const ds = format(date, 'yyyy-MM-dd');
    const dayEntries = entriesByDate[ds] || [];
    return { dateStr: ds, label: format(date, 'EEE d'), dayTotal: dayEntries.reduce((s, e) => s + (e.durationMinutes || 0), 0) };
  });

  return (
    <div>
      <MultiDayCalendar
        days={days}
        entriesByDate={entriesByDate}
        teamMember={currentUser}
        clients={clients}
        onEntryCreated={onEntryCreated}
        onEntryUpdated={onEntryUpdated}
        onEntryDeleted={onEntryDeleted}
        onOpenEntry={handleOpenEntry}
      />
      {detailEntry && (
        <EntryDetailModal entry={detailEntry} clients={clients} onClose={() => setDetailEntry(null)}
          onUpdated={(u) => { onEntryUpdated?.(u); setDetailEntry(null); }}
          onDeleted={(id) => { onEntryDeleted?.(id); setDetailEntry(null); }} />
      )}
    </div>
  );
}