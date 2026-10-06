/**
 * TaskPicker — searchable dropdown of To-Do Board tasks.
 * Lets users pick a task to track time against when starting a timer
 * or logging time manually.
 *
 * Props:
 *   value         — selected task ID (or '')
 *   onChange      — (task | null) => void  — called with the full task object, or null to clear
 *   currentUser  — first name of the logged-in user (for default filtering)
 *   className     — classes for the trigger button
 *   compact      — if true, renders a smaller trigger (for nav bar / sidebar)
 */
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Search, Check, ListTodo, X } from 'lucide-react';
import { PRIORITY_STYLES, CATEGORY_STYLES, isAssignee, getAllAssignees } from '@/components/requests/requestStyles';

export default function TaskPicker({ value, onChange, currentUser, className = '', compact = false }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [tasks, setTasks] = useState([]);
  const ref = useRef(null);

  useEffect(() => {
    base44.entities.Request.list('-created_date', 500).then(setTasks).catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    let result = tasks.filter(t => !t.archived && t.status !== 'Done');
    if (!showAll && currentUser) {
      result = result.filter(t => isAssignee(t, currentUser));
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(t => (t.title || '').toLowerCase().includes(q));
    }
    return result.slice(0, 50);
  }, [tasks, showAll, currentUser, search]);

  const selectedTask = tasks.find(t => t.id === value) || (value ? { id: value, title: '' } : null);

  useEffect(() => {
    if (!open) return;
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const triggerClass = className || (compact
    ? 'w-full flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-[#EBEBF5] rounded-lg bg-white text-[#242450] hover:border-[#8403C5]/40'
    : 'w-full flex items-center gap-1.5 px-3 py-2 text-sm border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] text-[#242450] hover:border-[#8403C5]/40');

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className={`${triggerClass} transition-all ${open ? 'border-[#8403C5] ring-2 ring-[#8403C5]/20' : ''}`}
      >
        <ListTodo className={`w-3.5 h-3.5 shrink-0 ${value ? 'text-[#8403C5]' : 'text-[#9CA3AF]'}`} />
        {selectedTask && selectedTask.title ? (
          <span className="flex-1 text-left truncate flex items-center gap-1.5">
            <span className="truncate">{selectedTask.title}</span>
            {selectedTask.priority && !compact && (
              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ${PRIORITY_STYLES[selectedTask.priority] || ''}`}>{selectedTask.priority}</span>
            )}
          </span>
        ) : (
          <span className="flex-1 text-left text-[#9CA3AF]">Track a To-Do task…</span>
        )}
        {value && (
          <span
            role="button"
            tabIndex={0}
            onClick={(e) => { e.stopPropagation(); onChange(null); }}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); onChange(null); } }}
            className="shrink-0 p-0.5 rounded hover:bg-[#EBEBF5] text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
            title="Clear task link"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-xl z-[100] max-h-72 overflow-hidden flex flex-col animate-modal-in">
          {/* Search */}
          <div className="p-2 border-b border-[#EBEBF5] relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-7 pr-2 py-1.5 text-xs border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]"
              autoFocus
            />
          </div>
          {/* Show all toggle */}
          <div className="px-2.5 py-1.5 border-b border-[#EBEBF5] flex items-center justify-between bg-[#FAFBFC]">
            <label className="flex items-center gap-1.5 text-[11px] text-[#5777AB] cursor-pointer select-none">
              <input type="checkbox" checked={showAll} onChange={e => setShowAll(e.target.checked)} className="w-3 h-3 accent-[#8403C5]" />
              Show all tasks
            </label>
            <span className="text-[10px] text-[#9CA3AF]">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          </div>
          {/* Task list */}
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="text-xs text-[#9CA3AF] text-center py-4">No tasks found</p>
            ) : (
              filtered.map(task => (
                <button
                  key={task.id}
                  type="button"
                  onClick={() => { onChange(task); setOpen(false); setSearch(''); }}
                  className={`w-full text-left px-3 py-2 hover:bg-[#F6F6FB] transition-colors border-b border-[#F2F2F4] last:border-0 ${value === task.id ? 'bg-[#F3E8FF]' : ''}`}
                >
                  <div className="flex items-start gap-2">
                    {value === task.id && <Check className="w-3 h-3 text-[#8403C5] shrink-0 mt-0.5" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-[#242450] truncate">{task.title || 'Untitled'}</p>
                      <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                        {task.priority && <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${PRIORITY_STYLES[task.priority] || ''}`}>{task.priority}</span>}
                        {task.category && <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full ${CATEGORY_STYLES[task.category] || 'bg-[#EBEBF5] text-[#242450]'}`}>{task.category}</span>}
                        {(() => { const a = getAllAssignees(task); return a.length > 0 && <span className="text-[9px] text-[#9CA3AF]">· {a.join(', ')}</span>; })()}
                      </div>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}