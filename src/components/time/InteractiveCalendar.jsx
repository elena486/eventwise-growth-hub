/**
 * InteractiveCalendar — click-to-create, drag-to-move, drag-to-resize
 * Used by LogTime (Today view) and MyTimesheet (History calendar view)
 */
import React, { useState, useRef, useMemo, useCallback, useEffect } from 'react';
import { format } from 'date-fns';
import { base44 } from '@/api/base44Client';
import { CATEGORY_COLORS, CATEGORY_LABELS } from './categoryColors';
import TaskPresetSelect from './TaskPresetSelect';

const CALENDAR_HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 07:00–22:00
const HOUR_HEIGHT = 60; // px per hour
const LEFT_GUTTER = 60; // px for time labels
const SNAP_MINUTES = 15; // snap grid

function fmtDur(minutes) {
  const h = Math.floor(minutes / 60); const m = minutes % 60;
  if (!h && !m) return '0m'; if (!h) return `${m}m`; if (!m) return `${h}h`; return `${h}h ${m}m`;
}
function pxToHour(px) { return 7 + px / HOUR_HEIGHT; }
function hourToPx(h) { return (h - 7) * HOUR_HEIGHT; }
function snapHour(h) {
  const totalMin = Math.round(h * 60 / SNAP_MINUTES) * SNAP_MINUTES;
  return totalMin / 60;
}
function hourToISO(dateStr, h) {
  const hh = Math.floor(h); const mm = Math.round((h - hh) * 60);
  return `${dateStr}T${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}:00`;
}
function isoToHour(iso) {
  try { const d = new Date(iso); return d.getHours() + d.getMinutes() / 60; } catch { return null; }
}

// Assign columns to overlapping entries
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

export default function InteractiveCalendar({
  entries,          // array of TimeEntry objects
  dateStr,          // 'yyyy-MM-dd' — the date being shown
  teamMember,       // string
  clients = [],     // array of Client objects
  onEntryCreated,   // (entry) => void
  onEntryUpdated,   // (entry) => void
  onEntryDeleted,   // (id) => void
  onOpenEntry,      // (entry) => void — open detail modal
}) {
  const gridRef = useRef(null);

  // ── Ghost creation state ──
  const [ghost, setGhost] = useState(null); // { startH, endH, top, height }
  const [creating, setCreating] = useState(null); // { startH, endH }

  // ── New entry inline form ──
  const [newForm, setNewForm] = useState(null); // { startH, endH, category, task, clientId, clientName, saving, error }

  // ── Drag state: move or resize ──
  const dragRef = useRef(null); // { type: 'move'|'resize-top'|'resize-bottom', entryId, startMouseY, origStartH, origEndH }
  const [dragging, setDragging] = useState(null); // { entryId, startH, endH }

  // ── Positioned entries ──
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

  // ── Helpers to get grid Y from mouse event ──
  const getGridY = useCallback((clientY) => {
    if (!gridRef.current) return 0;
    const rect = gridRef.current.getBoundingClientRect();
    return clientY - rect.top + gridRef.current.scrollTop;
  }, []);

  // ── MOUSE DOWN on empty grid → start ghost (create) ──
  const handleGridMouseDown = useCallback((e) => {
    // Only on the grid area (not on entry blocks)
    if (e.target !== gridRef.current && !e.target.classList.contains('cal-empty-row')) return;
    if (e.button !== 0) return;
    const y = getGridY(e.clientY);
    const rawH = pxToHour(y);
    if (rawH < 7 || rawH > 22) return;
    const startH = snapHour(rawH);
    setGhost({ startH, endH: startH + 0.5 });
    setCreating({ startH, startY: e.clientY });
    e.preventDefault();
  }, [getGridY]);

  // ── MOUSE MOVE ──
  useEffect(() => {
    const handleMouseMove = (e) => {
      // Ghost creation drag
      if (creating) {
        const y = getGridY(e.clientY);
        const rawH = pxToHour(y);
        const endH = Math.min(22, Math.max(creating.startH + 0.25, snapHour(rawH)));
        setGhost({ startH: creating.startH, endH });
        return;
      }
      // Entry move/resize drag
      if (dragRef.current) {
        const { type, startMouseY, origStartH, origEndH, entryId } = dragRef.current;
        const deltaY = e.clientY - startMouseY;
        const deltaH = deltaY / HOUR_HEIGHT;
        let newStartH = origStartH, newEndH = origEndH;
        if (type === 'move') {
          const dur = origEndH - origStartH;
          newStartH = Math.max(7, Math.min(22 - dur, snapHour(origStartH + deltaH)));
          newEndH = newStartH + dur;
        } else if (type === 'resize-bottom') {
          newEndH = Math.max(origStartH + 0.25, Math.min(22, snapHour(origEndH + deltaH)));
        } else if (type === 'resize-top') {
          newStartH = Math.min(origEndH - 0.25, Math.max(7, snapHour(origStartH + deltaH)));
        }
        setDragging({ entryId, startH: newStartH, endH: newEndH });
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [creating, getGridY]);

  // ── MOUSE UP ──
  useEffect(() => {
    const handleMouseUp = async (e) => {
      // Finish ghost creation
      if (creating && ghost) {
        setCreating(null);
        const dur = ghost.endH - ghost.startH;
        // Single click (tiny drag) → 30 min default
        const finalStart = ghost.startH;
        const finalEnd = dur < 0.1 ? finalStart + 0.5 : ghost.endH;
        setGhost(null);
        setNewForm({
          startH: finalStart,
          endH: finalEnd,
          category: '',
          task: '',
          clientId: '',
          clientName: '',
          saving: false,
          error: '',
        });
        return;
      }
      // Finish entry drag
      if (dragRef.current && dragging) {
        const { entryId } = dragRef.current;
        const { startH, endH } = dragging;
        dragRef.current = null;
        setDragging(null);
        // Save
        const entry = entries.find(en => en.id === entryId);
        if (!entry) return;
        const durationMinutes = Math.round((endH - startH) * 60);
        const newStartISO = hourToISO(dateStr, startH);
        const newEndISO = hourToISO(dateStr, endH);
        const updated = await base44.entities.TimeEntry.update(entryId, {
          timerStartedAt: newStartISO,
          timerStoppedAt: newEndISO,
          durationMinutes,
        }).catch(() => null);
        if (updated) onEntryUpdated?.({ ...entry, timerStartedAt: newStartISO, timerStoppedAt: newEndISO, durationMinutes });
        return;
      }
      dragRef.current = null;
      setDragging(null);
    };
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, [creating, ghost, dragging, entries, dateStr, onEntryUpdated]);

  // ── Start move/resize drag on an entry ──
  const startEntryDrag = useCallback((e, type, entry) => {
    e.stopPropagation();
    e.preventDefault();
    const startH = isoToHour(entry.timerStartedAt);
    const endH = isoToHour(entry.timerStoppedAt);
    dragRef.current = { type, entryId: entry.id, startMouseY: e.clientY, origStartH: startH, origEndH: endH };
    setDragging({ entryId: entry.id, startH, endH });
  }, []);

  // ── Save new entry ──
  const handleSaveNew = async () => {
    if (!newForm.category || !newForm.task.trim()) {
      setNewForm(f => ({ ...f, error: 'Category and Task are required.' }));
      return;
    }
    setNewForm(f => ({ ...f, saving: true, error: '' }));
    const durationMinutes = Math.round((newForm.endH - newForm.startH) * 60);
    const startISO = hourToISO(dateStr, newForm.startH);
    const endISO = hourToISO(dateStr, newForm.endH);
    const created = await base44.entities.TimeEntry.create({
      date: dateStr,
      teamMember,
      category: newForm.category,
      projectTask: newForm.task.trim(),
      durationMinutes,
      timerStartedAt: startISO,
      timerStoppedAt: endISO,
      timerStatus: 'logged',
      ...(newForm.clientId ? { clientId: newForm.clientId, clientName: newForm.clientName } : {}),
    }).catch(() => null);
    if (!created) { setNewForm(f => ({ ...f, saving: false, error: 'Failed to save — please try again.' })); return; }
    // Write client activity log if client linked
    if (newForm.clientId) {
      try {
        const client = await base44.entities.Client.get(newForm.clientId);
        if (client) {
          const log = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
          const h = Math.floor(durationMinutes / 60); const m = durationMinutes % 60;
          const durStr = m === 0 ? `${h}h` : `${h}h ${m}m`;
          log.push({ date: new Date().toISOString(), type: 'Time logged', label: `Time logged: ${durStr} — ${newForm.category}`, category: newForm.category, duration: durStr, description: newForm.task.trim(), teamMember, notes: '' });
          await base44.entities.Client.update(newForm.clientId, { activityLog: JSON.stringify(log) });
        }
      } catch {}
    }
    setNewForm(null);
    onEntryCreated?.(created);
  };

  const totalHeight = CALENDAR_HOURS.length * HOUR_HEIGHT;
  const now = new Date();
  const currentHourDecimal = now.getHours() + now.getMinutes() / 60;
  const showCurrentLine = dateStr === format(now, 'yyyy-MM-dd') && currentHourDecimal >= 7 && currentHourDecimal <= 22;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden select-none">
      {/* Header */}
      <div className="grid border-b border-[#EBEBF5]" style={{ gridTemplateColumns: `${LEFT_GUTTER}px 1fr` }}>
        <div className="border-r border-[#EBEBF5]" />
        <div className="px-3 py-2.5 text-center">
          <p className="text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.06em]">
            {(() => { try { return format(new Date(dateStr), 'EEEE'); } catch { return dateStr; } })()}
          </p>
          <p className="text-[10px] text-[#9CA3AF]">
            {(() => { try { return format(new Date(dateStr), 'd MMM yyyy'); } catch { return ''; } })()}
          </p>
          <p className="text-[9px] text-[#C4C6D4] mt-0.5">Click or drag empty area to add an entry</p>
        </div>
      </div>

      {/* Grid */}
      <div className="overflow-auto" style={{ maxHeight: 'calc(100vh - 420px)' }}
        ref={gridRef}
        onMouseDown={handleGridMouseDown}
      >
        <div className="relative" style={{ height: `${totalHeight}px` }}>
          {/* Hour rows */}
          {CALENDAR_HOURS.map(hour => {
            const top = (hour - 7) * HOUR_HEIGHT;
            return (
              <div key={hour} className="absolute left-0 right-0 cal-empty-row" style={{ top: `${top}px`, height: `${HOUR_HEIGHT}px` }}>
                <div className="absolute left-0 top-0 w-[60px] h-full border-r border-[#EBEBF5] flex items-start justify-end pr-2">
                  <span className="text-[10px] font-bold text-[#5777AB] leading-none">{String(hour).padStart(2, '0')}:00</span>
                </div>
                <div className="cal-empty-row absolute left-[60px] right-0 top-0 border-t border-[#EBEBF5]" />
                <div className="cal-empty-row absolute left-[60px] right-0 top-[30px] border-t border-dashed border-[#D8D8EE]" />
              </div>
            );
          })}

          {/* Ghost block while dragging to create */}
          {ghost && (
            <div className="absolute pointer-events-none z-30 rounded-md"
              style={{
                left: `${LEFT_GUTTER + 2}px`, right: '4px',
                top: `${hourToPx(ghost.startH)}px`,
                height: `${Math.max(12, hourToPx(ghost.endH) - hourToPx(ghost.startH))}px`,
                backgroundColor: '#8403C520',
                border: '2px dashed #8403C5',
              }}>
              <span className="text-[10px] font-bold text-[#8403C5] px-2 py-1 block">
                {fmtDur(Math.round((ghost.endH - ghost.startH) * 60))}
              </span>
            </div>
          )}

          {/* Existing entry blocks */}
          {positioned.map(({ entry, startH, endH, col, totalCols }) => {
            const isDragging = dragging?.entryId === entry.id;
            const dispStartH = isDragging ? dragging.startH : startH;
            const dispEndH = isDragging ? dragging.endH : endH;
            const color = CATEGORY_COLORS[entry.category] || '#9CA3AF';
            const colW = `calc((100% - ${LEFT_GUTTER + 4}px) / ${totalCols})`;
            const leftPx = `calc(${LEFT_GUTTER + 2}px + (100% - ${LEFT_GUTTER + 4}px) / ${totalCols} * ${col})`;
            const blockH = Math.max(24, hourToPx(dispEndH) - hourToPx(dispStartH));

            return (
              <div key={entry.id}
                className="absolute rounded-md overflow-hidden z-10 group"
                style={{
                  left: leftPx, width: colW,
                  top: `${hourToPx(dispStartH)}px`,
                  height: `${Math.min(blockH, totalHeight - hourToPx(dispStartH))}px`,
                  backgroundColor: `${color}18`,
                  borderLeft: `3px solid ${color}`,
                  cursor: isDragging ? 'grabbing' : 'grab',
                  opacity: isDragging ? 0.8 : 1,
                  zIndex: isDragging ? 30 : 10,
                }}
                onMouseDown={(e) => {
                  // Middle of block → move
                  const rect = e.currentTarget.getBoundingClientRect();
                  const relY = e.clientY - rect.top;
                  const pct = relY / rect.height;
                  if (pct > 0.15 && pct < 0.85) {
                    startEntryDrag(e, 'move', entry);
                  }
                }}
                onClick={(e) => {
                  if (!isDragging) { e.stopPropagation(); onOpenEntry?.(entry); }
                }}
              >
                {/* Content */}
                <div className="px-2 py-1 pointer-events-none">
                  <p className="text-[10px] font-semibold leading-tight truncate" style={{ color }}>{entry.category}</p>
                  <p className="text-[10px] font-medium text-[#242450] leading-tight mt-0.5 truncate">{entry.projectTask}</p>
                  <p className="text-[9px] font-bold text-[#242450] mt-0.5">{fmtDur(Math.round((dispEndH - dispStartH) * 60))}</p>
                </div>
                {/* Resize handles */}
                <div className="absolute top-0 left-0 right-0 h-[6px] cursor-n-resize opacity-0 group-hover:opacity-100 bg-current"
                  style={{ backgroundColor: `${color}40` }}
                  onMouseDown={(e) => startEntryDrag(e, 'resize-top', entry)} />
                <div className="absolute bottom-0 left-0 right-0 h-[6px] cursor-s-resize opacity-0 group-hover:opacity-100"
                  style={{ backgroundColor: `${color}40` }}
                  onMouseDown={(e) => startEntryDrag(e, 'resize-bottom', entry)} />
              </div>
            );
          })}

          {/* Untimed entries */}
          {untimed.map((e, ci) => {
            const color = CATEGORY_COLORS[e.category] || '#9CA3AF';
            return (
              <div key={e.id} className="absolute rounded px-1.5 py-0.5 z-10 cursor-pointer hover:opacity-90"
                style={{ left: `${LEFT_GUTTER + 2}px`, right: '4px', top: `${ci * 26}px`, backgroundColor: `${color}12`, borderLeft: `2px solid ${color}` }}
                onClick={() => onOpenEntry?.(e)}>
                <p className="text-[9px] font-medium text-[#242450] truncate">{e.projectTask || '—'}</p>
                <p className="text-[8px] text-[#5777AB]">{fmtDur(e.durationMinutes)}</p>
              </div>
            );
          })}

          {/* Current time line */}
          {showCurrentLine && (
            <div className="absolute left-0 right-0 z-20 pointer-events-none" style={{ top: `${hourToPx(currentHourDecimal)}px` }}>
              <div className="absolute left-[60px] right-0 h-px bg-[#DC2626]" />
              <div className="absolute left-0 w-[60px] flex items-center justify-end pr-2" style={{ marginTop: '-9px' }}>
                <span className="text-[10px] font-bold text-[#DC2626] bg-white px-1 rounded">{format(now, 'HH:mm')}</span>
              </div>
            </div>
          )}

          {/* Inline new-entry form */}
          {newForm && (
            <div className="absolute z-40 bg-white border-2 border-[#8403C5] rounded-xl shadow-xl p-4"
              style={{
                left: `${LEFT_GUTTER + 8}px`, right: '8px',
                top: `${Math.min(hourToPx(newForm.startH), totalHeight - 240)}px`,
                minWidth: '240px',
              }}
              onClick={e => e.stopPropagation()}
              onMouseDown={e => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold text-[#242450]">
                  New entry — {(() => {
                    const sh = newForm.startH; const hh = Math.floor(sh); const mm = Math.round((sh - hh) * 60);
                    const eh = newForm.endH; const ehh = Math.floor(eh); const emm = Math.round((eh - ehh) * 60);
                    return `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}–${String(ehh).padStart(2,'0')}:${String(emm).padStart(2,'0')}`;
                  })()}
                </p>
                <button onClick={() => setNewForm(null)} className="text-[#9CA3AF] hover:text-[#242450]">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              </div>
              <div className="space-y-2">
                <select value={newForm.category} onChange={e => setNewForm(f => ({ ...f, category: e.target.value, task: '' }))}
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none ${!newForm.category && newForm.error ? 'border-[#DC2626]' : 'border-[#EBEBF5] focus:border-[#8403C5]'}`}>
                  <option value="">Category…</option>
                  {CATEGORY_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <TaskPresetSelect
                  category={newForm.category}
                  value={newForm.task}
                  onChange={v => setNewForm(f => ({ ...f, task: v }))}
                  placeholder="Task…"
                  className={`w-full px-2 py-1.5 text-xs border rounded-lg focus:outline-none ${!newForm.task && newForm.error ? 'border-[#DC2626]' : 'border-[#EBEBF5] focus:border-[#8403C5]'}`}
                />
                <select value={newForm.clientId} onChange={e => {
                  const c = clients.find(cl => cl.id === e.target.value);
                  setNewForm(f => ({ ...f, clientId: e.target.value, clientName: c?.name || '' }));
                }} className="w-full px-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]">
                  <option value="">No client</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                {newForm.error && <p className="text-[10px] text-[#DC2626] font-semibold">{newForm.error}</p>}
                <div className="flex gap-2 pt-1">
                  <button onClick={() => setNewForm(null)}
                    className="flex-1 px-2 py-1.5 text-xs text-[#5777AB] border border-[#5777AB] rounded-lg hover:bg-[#EEF2F8]">Cancel</button>
                  <button onClick={handleSaveNew} disabled={newForm.saving}
                    className="flex-1 px-2 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:opacity-50">
                    {newForm.saving ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}