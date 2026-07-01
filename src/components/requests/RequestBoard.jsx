import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { format, isPast, isToday, parseISO } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, Filter, Columns, List, Users, ArrowUpDown, ChevronDown, ChevronRight, Archive, RotateCcw, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import AddTaskModal from './AddTaskModal';
import RequestDetail from './RequestDetail';
import { PRIORITY_STYLES, STATUS_STYLES, CATEGORY_STYLES, PRIORITY_ORDER, BOARD_STATUSES, PRIORITIES, TEAM_MEMBERS, NEW_CATEGORIES, STATUS_MAP } from './requestStyles';
import { logActivity } from '@/lib/logActivity';

// Overdue helpers
function getDeadlineStatus(deadline, status) {
  if (!deadline || status === 'Done') return null;
  try {
    const d = parseISO(deadline);
    if (isToday(d)) return 'today';
    if (isPast(d)) return 'overdue';
  } catch {}
  return null;
}

const COLUMN_LABELS = { 'To Do': 'To Do', 'In Progress': 'In Progress', 'Done': 'Done', 'Blocked': 'Blocked' };
const COLUMN_ICONS = { 'To Do': '📋', 'In Progress': '🔄', 'Done': '✅', 'Blocked': '🚫' };

const VIEW_OPTIONS = [
  { id: 'kanban', icon: Columns, label: 'Kanban' },
  { id: 'list', icon: List, label: 'List' },
  { id: 'grouped', icon: Users, label: 'By Assignee' },
];

const LIST_COLUMNS = [
  { key: 'title', label: 'Task', sortable: true },
  { key: 'assignedTo', label: 'Assigned to', sortable: true },
  { key: 'requestedBy', label: 'Requested by', sortable: true },
  { key: 'category', label: 'Category', sortable: true },
  { key: 'priority', label: 'Priority', sortable: true },
  { key: '_displayStatus', label: 'Status', sortable: true },
  { key: 'deadline', label: 'Due date', sortable: true },
  { key: 'submittedAt', label: 'Created', sortable: true },
];

// Resolve current user's team name from auth data — strict exact match only
function resolveUserName(me) {
  if (!me) return null;
  const fullName = me.full_name || '';
  const firstName = fullName.split(' ')[0];
  // Only accept the first name if it exactly matches a known team member
  if (TEAM_MEMBERS.includes(firstName)) return firstName;
  return null;
}

export default function RequestBoard({ refresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // View
  const [view, setView] = useState(() => {
    const saved = localStorage.getItem('request-board-view');
    return (saved === 'list' || saved === 'grouped') ? saved : 'kanban';
  });

  // Sort (list/grouped view)
  const [sortField, setSortField] = useState('priority');
  const [sortDir, setSortDir] = useState('asc');

  // Filters
  const [myTasks, setMyTasks] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterCategory, setFilterCategory] = useState([]);
  const [search, setSearch] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  const [showArchived, setShowArchived] = useState(false);
  const [confirmBulkArchive, setConfirmBulkArchive] = useState(false);

  // Grouped view: collapsed sections
  const [collapsedGroups, setCollapsedGroups] = useState({});

  const load = async () => {
    try {
      const [data, me] = await Promise.all([
        base44.entities.Request.list('-created_date', 500),
        base44.auth.me().catch(() => null),
      ]);
      setRequests(data);
      setCurrentUser(resolveUserName(me));
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  useEffect(() => {
    if (selectedReq) {
      addRecentlyViewed({
        type: 'request', name: selectedReq.title || `Request #${selectedReq.requestNumber || '—'}`,
        section: 'Operations → Team Board', tab: 'team-board', recordId: selectedReq.id,
      });
    }
  }, [selectedReq]);

  useEffect(() => {
    const focusId = sessionStorage.getItem('focus_request_id');
    if (!focusId) return;
    sessionStorage.removeItem('focus_request_id');
    base44.entities.Request.get(focusId).then(req => {
      if (req) {
        setRequests(prev => { const exists = prev.find(r => r.id === req.id); return exists ? prev : [req, ...prev]; });
        setSelectedReq(req);
      }
    }).catch(() => {});
  }, [refresh]);

  const normalizeStatus = (status) => STATUS_MAP[status] || status;

  const displayRequests = useMemo(() => {
    return requests
      .filter(r => showArchived ? r.archived : !r.archived)
      .map(r => ({ ...r, _displayStatus: normalizeStatus(r.status) }));
  }, [requests, showArchived]);

  const filtered = useMemo(() => {
    let result = displayRequests.filter(r => r._displayStatus !== 'Cancelled');

    if (myTasks && currentUser) {
      result = result.filter(r => r.assignedTo === currentUser);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => (r.title || '').toLowerCase().includes(q));
    }

    if (filterAssignee.length > 0) result = result.filter(r => filterAssignee.includes(r.assignedTo));
    if (filterStatus.length > 0) result = result.filter(r => filterStatus.includes(r._displayStatus));
    if (filterPriority.length > 0) result = result.filter(r => filterPriority.includes(r.priority));
    if (filterCategory.length > 0) result = result.filter(r => filterCategory.includes(r.category));

    return result;
  }, [displayRequests, myTasks, currentUser, search, filterAssignee, filterStatus, filterPriority, filterCategory]);

  // Sorted list (for list and grouped views)
  const sorted = useMemo(() => {
    const arr = [...filtered];
    const prioOrder = { Urgent: 0, High: 1, Medium: 2, Low: 3 };
    const statusOrder = { 'To Do': 0, 'In Progress': 1, 'Blocked': 2, 'Done': 3 };

    arr.sort((a, b) => {
      let va, vb;
      switch (sortField) {
        case 'priority': va = prioOrder[a.priority] ?? 4; vb = prioOrder[b.priority] ?? 4; break;
        case '_displayStatus': va = statusOrder[a._displayStatus] ?? 4; vb = statusOrder[b._displayStatus] ?? 4; break;
        case 'title': va = (a.title || '').toLowerCase(); vb = (b.title || '').toLowerCase(); break;
        case 'assignedTo': va = (a.assignedTo || '').toLowerCase(); vb = (b.assignedTo || '').toLowerCase(); break;
        case 'requestedBy': va = (a.requestedBy || '').toLowerCase(); vb = (b.requestedBy || '').toLowerCase(); break;
        case 'category': va = (a.category || '').toLowerCase(); vb = (b.category || '').toLowerCase(); break;
        case 'deadline': va = a.deadline || '9999'; vb = b.deadline || '9999'; break;
        case 'submittedAt': va = a.submittedAt || ''; vb = b.submittedAt || ''; break;
        default: return 0;
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1;
      if (va > vb) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return arr;
  }, [filtered, sortField, sortDir]);

  // Kanban columns
  const columns = useMemo(() => {
    const grouped = BOARD_STATUSES.reduce((acc, s) => { acc[s] = []; return acc; }, {});
    filtered.forEach(r => {
      const col = BOARD_STATUSES.includes(r._displayStatus) ? r._displayStatus : 'To Do';
      if (grouped[col]) grouped[col].push(r);
    });
    Object.keys(grouped).forEach(col => {
      grouped[col].sort((a, b) => {
        const pd = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
        if (pd !== 0) return pd;
        return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
      });
    });
    return grouped;
  }, [filtered]);

  const handleAddTask = async (data) => {
    const nextNum = requests.length > 0 ? Math.max(...requests.map(r => r.requestNumber || 0)) + 1 : 1;
    const newReq = await base44.entities.Request.create({ ...data, requestNumber: nextNum });
    setRequests(prev => [newReq, ...prev]);
    base44.functions.invoke('notifyNewRequest', { ...data, submittedAt: data.submittedAt }).catch(() => {});
    logActivity({ teamMember: currentUser || data.requestedBy || '', actionType: 'Created a task', section: 'To-Do Board', recordName: data.title || '' });
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    if (newStatus === result.source.droppableId) return;
    const reqId = result.draggableId;
    const task = requests.find(r => r.id === reqId);
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    await base44.entities.Request.update(reqId, { status: newStatus });
    if (task) logActivity({ teamMember: currentUser || '', actionType: 'Updated a task status', section: 'To-Do Board', recordName: task.title || '', details: `→ ${newStatus}` });
  };

  const handleDetailUpdate = (updated) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedReq(updated);
  };

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('asc'); }
  };

  const handleSetView = (v) => { setView(v); localStorage.setItem('request-board-view', v); };

  const handleStatusChange = async (id, newStatus) => {
    const task = requests.find(r => r.id === id);
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    await base44.entities.Request.update(id, { status: newStatus });
    if (task) logActivity({ teamMember: currentUser || '', actionType: 'Updated a task status', section: 'To-Do Board', recordName: task.title || '', details: `→ ${newStatus}` });
  };

  const handleArchive = async (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, archived: true } : r));
    await base44.entities.Request.update(id, { archived: true });
  };

  const handleRestore = async (id) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, archived: false, status: 'Done' } : r));
    await base44.entities.Request.update(id, { archived: false, status: 'Done' });
  };

  const handleBulkArchiveDone = async () => {
    const doneIds = requests.filter(r => !r.archived && normalizeStatus(r.status) === 'Done').map(r => r.id);
    setRequests(prev => prev.map(r => doneIds.includes(r.id) ? { ...r, archived: true } : r));
    await Promise.all(doneIds.map(id => base44.entities.Request.update(id, { archived: true })));
    setConfirmBulkArchive(false);
  };

  const doneCount = useMemo(() => requests.filter(r => !r.archived && normalizeStatus(r.status) === 'Done').length, [requests]);

  const hasAnyFilter = myTasks || filterAssignee.length > 0 || filterStatus.length > 0 || filterPriority.length > 0 || filterCategory.length > 0 || search;
  const clearFilters = () => { setMyTasks(false); setFilterAssignee([]); setFilterStatus([]); setFilterPriority([]); setFilterCategory([]); setSearch(''); };
  const toggleFilter = (setter, arr, val) => { setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]); setOpenDropdown(null); };
  const isValidCategory = (cat) => NEW_CATEGORIES.includes(cat);

  const fmtDate = (d) => d ? format(new Date(d), 'd MMM yyyy') : 'No date';
  const fmtShort = (d) => d ? format(new Date(d), 'd MMM yy') : '—';

  const FilterDropdown = ({ label, options, selected, setter, styleMap }) => (
    <div className="relative">
      <button onClick={() => setOpenDropdown(openDropdown === label ? null : label)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${selected.length > 0 ? 'bg-[#F3E8FF] text-[#8403C5] border-[#8403C5]/30' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
        <Filter className="w-3 h-3" /> {label}
        {selected.length > 0 && <span className="bg-[#8403C5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{selected.length}</span>}
      </button>
      {openDropdown === label && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-48 py-1 max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button key={opt} onClick={() => toggleFilter(setter, selected, opt)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242450] hover:bg-[#F6F6FB] transition-colors text-left">
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${selected.includes(opt) ? 'bg-[#8403C5] border-[#8403C5]' : 'border-[#D8D8EE]'}`}>
                {selected.includes(opt) && <span className="text-white text-[9px]">✓</span>}
              </span>
              {styleMap ? <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${styleMap[opt] || ''}`}>{opt}</span> : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const SortHeader = ({ col }) => {
    const isActive = sortField === col.key;
    return (
      <th onClick={() => col.sortable && handleSort(col.key)}
        className={`px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em] select-none ${col.sortable ? 'cursor-pointer hover:text-[#242450] transition-colors' : ''}`}>
        <span className="inline-flex items-center gap-1">
          {col.label}
          {isActive && <ArrowUpDown className={`w-3 h-3 ${sortDir === 'desc' ? 'rotate-180' : ''}`} />}
        </span>
      </th>
    );
  };

  if (selectedReq) {
    return <RequestDetail request={selectedReq} onBack={() => setSelectedReq(null)} onUpdate={handleDetailUpdate} onDelete={(id) => { setRequests(prev => prev.filter(r => r.id !== id)); setSelectedReq(null); }} />;
  }

  return (
    <div style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }} className="bg-[#F6F6FB] font-dm">
      {/* Filter bar */}
      <div className="shrink-0 px-8 pt-5 pb-3">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-2xl font-bold text-[#242450]">Company To-Do Board</h1>
          <div className="flex items-center gap-2">
            {/* View toggle */}
            <div className="flex items-center border border-[#EBEBF5] rounded-lg overflow-hidden bg-white mr-1">
              {VIEW_OPTIONS.map(opt => {
                const Icon = opt.icon;
                return (
                  <button key={opt.id} onClick={() => handleSetView(opt.id)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${view === opt.id ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-[#5777AB] hover:bg-[#F6F6FB]'}`}
                    title={opt.label}>
                    <Icon className="w-3.5 h-3.5" /> {opt.label}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setShowModal(true)}
              className="h-9 px-4 bg-[#8403C5] hover:bg-[#6B02A0] text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors shrink-0">
              <Plus className="w-4 h-4" /> Add Task
            </button>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          <div className="relative min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search tasks…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] transition-colors" />
          </div>
          <button onClick={() => setMyTasks(m => !m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${myTasks ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            My Tasks
          </button>
          <FilterDropdown label="Assignee" options={TEAM_MEMBERS} selected={filterAssignee} setter={setFilterAssignee} />
          <FilterDropdown label="Status" options={BOARD_STATUSES} selected={filterStatus} setter={setFilterStatus} styleMap={STATUS_STYLES} />
          <FilterDropdown label="Priority" options={PRIORITIES} selected={filterPriority} setter={setFilterPriority} styleMap={PRIORITY_STYLES} />
          <FilterDropdown label="Category" options={NEW_CATEGORIES} selected={filterCategory} setter={setFilterCategory} styleMap={CATEGORY_STYLES} />
          <button
            onClick={() => { setShowArchived(s => !s); clearFilters(); }}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showArchived ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            <Archive className="w-3 h-3" /> Archived
          </button>
          {hasAnyFilter && (
            <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-medium text-[#DC2626] hover:underline">Clear all filters</button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div style={{ flex: 1, minHeight: 0, overflow: 'auto', padding: '0 32px 32px' }}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
          </div>
        ) : showArchived ? (
          <ArchivedView requests={displayRequests} onRestore={handleRestore} onSelect={setSelectedReq} isValidCategory={isValidCategory} fmtDate={fmtDate} />
        ) : view === 'kanban' ? (
          <KanbanView columns={columns} onDragEnd={handleDragEnd} onSelect={setSelectedReq} isValidCategory={isValidCategory} onArchive={handleArchive} doneCount={doneCount} onBulkArchive={() => setConfirmBulkArchive(true)} />
        ) : view === 'list' ? (
          <ListView sorted={sorted} sortField={sortField} sortDir={sortDir} onSort={handleSort} onSelect={setSelectedReq} isValidCategory={isValidCategory} fmtDate={fmtDate} onStatusChange={handleStatusChange} />
        ) : (
          <GroupedView sorted={sorted} currentUser={currentUser} collapsedGroups={collapsedGroups} setCollapsedGroups={setCollapsedGroups} sortField={sortField} sortDir={sortDir} onSort={handleSort} onSelect={setSelectedReq} isValidCategory={isValidCategory} fmtDate={fmtDate} onStatusChange={handleStatusChange} />
        )}
      </div>

      {/* Bulk archive confirmation */}
      {confirmBulkArchive && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmBulkArchive(false)}>
          <div className="bg-white rounded-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-2">Archive all done tasks?</h3>
            <p className="text-sm text-[#5777AB] mb-5">Archive {doneCount} completed task{doneCount !== 1 ? 's' : ''}? They won't appear on the board but can be restored from the archive.</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setConfirmBulkArchive(false)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg transition-colors">Cancel</button>
              <button onClick={handleBulkArchiveDone} className="px-4 py-2 text-sm font-semibold bg-[#242450] text-white rounded-lg hover:bg-[#1A1A3A] transition-colors flex items-center gap-1.5"><Archive className="w-3.5 h-3.5" /> Archive all</button>
            </div>
          </div>
        </div>
      )}

      {showModal && <AddTaskModal onClose={() => setShowModal(false)} onSubmit={handleAddTask} />}
      {openDropdown && <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />}
    </div>
  );
}

// ── Kanban Card overflow menu ──
function CardMenu({ req, onArchive }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)} className="p-1 rounded hover:bg-[#F6F6FB] text-[#9CA3AF] hover:text-[#5777AB] transition-colors">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-36 py-1">
            {req._displayStatus === 'Done' && (
              <button onClick={() => { onArchive(req.id); setOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#5777AB] hover:bg-[#F6F6FB] transition-colors">
                <Archive className="w-3 h-3" /> Archive
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ── Kanban View ──
function KanbanView({ columns, onDragEnd, onSelect, isValidCategory, onArchive, doneCount, onBulkArchive }) {
  return (
    <DragDropContext onDragEnd={onDragEnd} style={{ height: '100%' }}>
      <div className="flex gap-4 overflow-x-auto pb-4" style={{ height: '100%' }}>
        {BOARD_STATUSES.map(status => (
          <div key={status} className="flex-shrink-0 w-72 flex flex-col" style={{ height: '100%' }}>
            <div className="flex items-center justify-between mb-3 shrink-0">
              <div className="flex items-center gap-1.5">
                <span className="text-sm">{COLUMN_ICONS[status]}</span>
                <span className="text-xs font-bold text-[#5777AB] uppercase tracking-[0.06em]">{COLUMN_LABELS[status]}</span>
                <span className="text-xs font-medium text-[#9CA3AF] bg-[#EBEBF5] px-2 py-0.5 rounded-full">{columns[status].length}</span>
              </div>
              {status === 'Done' && doneCount > 0 && (
                <button onClick={onBulkArchive} className="text-[10px] text-[#9CA3AF] hover:text-[#5777AB] flex items-center gap-1 transition-colors">
                  <Archive className="w-3 h-3" /> Archive all
                </button>
              )}
            </div>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  style={{ overflowY: 'auto', minHeight: 120 }}
                  className={`flex-1 rounded-xl flex flex-col gap-2 p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-[#8403C5]/5 border border-dashed border-[#8403C5]/30' : 'bg-[#F6F6FB]/60'}`}>
                  {columns[status].map((req, index) => {
                    const dlStatus = getDeadlineStatus(req.deadline, req._displayStatus);
                    return (
                      <Draggable key={req.id} draggableId={req.id} index={index}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                            onClick={() => onSelect(req)}
                            className={`bg-white border rounded-xl p-3.5 cursor-pointer hover:border-[#8403C5]/30 transition-all ${snapshot.isDragging ? 'shadow-lg border-[#8403C5]/40 rotate-1' : 'border-[#EBEBF5]'}`}>
                            <div className="flex items-start justify-between gap-1 mb-2.5">
                              <p className="text-sm font-semibold text-[#242450] leading-snug flex-1">{req.title || <span className="text-[#9CA3AF] italic">Untitled</span>}</p>
                              <CardMenu req={req} onArchive={onArchive} />
                            </div>
                            {req.assignedTo && (
                              <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-5 h-5 rounded-full bg-[#F3E8FF] text-[#8403C5] text-[10px] font-bold flex items-center justify-center shrink-0">
                                  {req.assignedTo.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <span className="text-[11px] font-medium text-[#5777AB]">{req.assignedTo}</span>
                              </div>
                            )}
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {req.priority && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority] || ''}`}>{req.priority}</span>}
                              {req.category && isValidCategory(req.category) && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[req.category] || 'bg-[#EBEBF5] text-[#242450]'}`}>{req.category}</span>}
                            </div>
                            {req.deadline && (
                              <div className={`flex items-center gap-1.5 mt-2 ${dlStatus === 'overdue' ? 'text-[#DC2626]' : dlStatus === 'today' ? 'text-[#A16207]' : 'text-[#5777AB]'}`}>
                                <span className="text-[11px]">Due {format(new Date(req.deadline), 'd MMM yyyy')}</span>
                                {dlStatus === 'overdue' && <span className="text-[9px] font-bold bg-[#FEF2F2] text-[#DC2626] px-1.5 py-0.5 rounded-full uppercase tracking-wide">Overdue</span>}
                                {dlStatus === 'today' && <span className="text-[9px] font-bold bg-[#FFFBEB] text-[#A16207] px-1.5 py-0.5 rounded-full uppercase tracking-wide">Due today</span>}
                              </div>
                            )}
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                  {columns[status].length === 0 && !snapshot.isDraggingOver && (
                    <div className="flex-1 flex items-center justify-center"><p className="text-xs text-[#9CA3AF] italic">No tasks</p></div>
                  )}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
}

// ── List View ──
function ListView({ sorted, sortField, sortDir, onSort, onSelect, isValidCategory, fmtDate, onStatusChange }) {
  const handleSort = (field) => onSort(field);

  if (sorted.length === 0) {
    return <div className="flex items-center justify-center h-48"><p className="text-sm text-[#9CA3AF]">No tasks match your filters.</p></div>;
  }

  return (
    <div className="overflow-auto h-full bg-white rounded-xl border border-[#EBEBF5]">
      <table className="w-full text-sm min-w-[900px]">
        <thead>
          <tr className="border-b border-[#EBEBF5]">
            {LIST_COLUMNS.map(col => (
              <th key={col.key} onClick={() => col.sortable && handleSort(col.key)}
                className={`px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em] select-none whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-[#242450] transition-colors' : ''}`}>
                <span className="inline-flex items-center gap-1">
                  {col.label}
                  {sortField === col.key && <ArrowUpDown className={`w-3 h-3 text-[#8403C5]`} />}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sorted.map(req => (
            <tr key={req.id} onClick={() => onSelect(req)}
              className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F6F6FB] transition-colors cursor-pointer">
              <td className="px-3 py-3 min-w-[180px] max-w-[240px]">
                <p className="font-medium text-[#242450] text-sm truncate">{req.title || <span className="text-[#9CA3AF] italic">Untitled</span>}</p>
              </td>
              <td className="px-3 py-3 whitespace-nowrap">
                {req.assignedTo ? (
                  <div className="flex items-center gap-1.5">
                    <div className="w-5 h-5 rounded-full bg-[#F3E8FF] text-[#8403C5] text-[10px] font-bold flex items-center justify-center shrink-0">
                      {req.assignedTo.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <span className="text-xs font-medium text-[#5777AB]">{req.assignedTo}</span>
                  </div>
                ) : <span className="text-xs text-[#9CA3AF]">—</span>}
              </td>
              <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{req.requestedBy || '—'}</td>
              <td className="px-3 py-3">
                {req.category && isValidCategory(req.category) ? (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[req.category] || 'bg-[#EBEBF5] text-[#242450]'}`}>{req.category}</span>
                ) : <span className="text-xs text-[#9CA3AF]">—</span>}
              </td>
              <td className="px-3 py-3">
                {req.priority ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority] || ''}`}>{req.priority}</span> : <span className="text-xs text-[#9CA3AF]">—</span>}
              </td>
              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                <select value={req._displayStatus} onChange={e => onStatusChange(req.id, e.target.value)}
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none ${STATUS_STYLES[req._displayStatus] || ''}`}>
                  {BOARD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </td>
              <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{fmtDate(req.deadline)}</td>
              <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{req.submittedAt ? format(new Date(req.submittedAt), 'd MMM yy') : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Archived View ──
function ArchivedView({ requests, onRestore, onSelect, isValidCategory, fmtDate }) {
  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-48 gap-2">
        <Archive className="w-8 h-8 text-[#D8D8EE]" />
        <p className="text-sm text-[#9CA3AF]">No archived tasks</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-xl border border-[#EBEBF5] overflow-hidden">
      <table className="w-full text-sm min-w-[700px]">
        <thead>
          <tr className="border-b border-[#EBEBF5]">
            <th className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Task</th>
            <th className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Assigned to</th>
            <th className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Category</th>
            <th className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Priority</th>
            <th className="px-3 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em]">Due date</th>
            <th className="px-3 py-3"></th>
          </tr>
        </thead>
        <tbody>
          {requests.map(req => (
            <tr key={req.id} onClick={() => onSelect(req)} className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F6F6FB] transition-colors cursor-pointer">
              <td className="px-3 py-3 min-w-[180px] max-w-[240px]">
                <p className="font-medium text-[#9CA3AF] text-sm truncate">{req.title || <span className="italic">Untitled</span>}</p>
              </td>
              <td className="px-3 py-3 text-xs text-[#9CA3AF] whitespace-nowrap">{req.assignedTo || '—'}</td>
              <td className="px-3 py-3">
                {req.category && isValidCategory(req.category) ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full opacity-60 bg-[#EBEBF5] text-[#5777AB]`}>{req.category}</span> : <span className="text-xs text-[#9CA3AF]">—</span>}
              </td>
              <td className="px-3 py-3">
                {req.priority ? <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBEBF5] text-[#9CA3AF]">{req.priority}</span> : <span className="text-xs text-[#9CA3AF]">—</span>}
              </td>
              <td className="px-3 py-3 text-xs text-[#9CA3AF] whitespace-nowrap">{fmtDate(req.deadline)}</td>
              <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                <button onClick={() => onRestore(req.id)} className="flex items-center gap-1 text-xs font-semibold text-[#5777AB] hover:text-[#8403C5] transition-colors">
                  <RotateCcw className="w-3 h-3" /> Restore
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Grouped View ──
function GroupedView({ sorted, currentUser, collapsedGroups, setCollapsedGroups, sortField, sortDir, onSort, onSelect, isValidCategory, fmtDate, onStatusChange }) {
  // Group by assignedTo
  const groups = useMemo(() => {
    const map = {};
    sorted.forEach(r => {
      const key = r.assignedTo || 'Unassigned';
      if (!map[key]) map[key] = [];
      map[key].push(r);
    });
    // Order: current user first, then alphabetical
    const keys = Object.keys(map).sort((a, b) => {
      if (a === currentUser) return -1;
      if (b === currentUser) return 1;
      if (a === 'Unassigned') return 1;
      if (b === 'Unassigned') return -1;
      return a.localeCompare(b);
    });
    return keys.map(key => ({ name: key, items: map[key], isMe: key === currentUser }));
  }, [sorted, currentUser]);

  const toggleCollapse = (name) => setCollapsedGroups(prev => ({ ...prev, [name]: !prev[name] }));

  if (groups.length === 0) {
    return <div className="flex items-center justify-center h-48"><p className="text-sm text-[#9CA3AF]">No tasks match your filters.</p></div>;
  }

  return (
    <div className="overflow-auto h-full space-y-4">
      {groups.map(group => {
        const isOpen = !collapsedGroups[group.name];
        return (
          <div key={group.name} className={`bg-white rounded-xl border overflow-hidden ${group.isMe ? 'border-[#8403C5]/20 bg-[#FCFAFF]' : 'border-[#EBEBF5]'}`}>
            {/* Group header */}
            <button onClick={() => toggleCollapse(group.name)}
              className="w-full flex items-center justify-between px-5 py-3 hover:bg-[#F6F6FB]/50 transition-colors">
              <div className="flex items-center gap-2.5">
                {isOpen ? <ChevronDown className="w-4 h-4 text-[#5777AB]" /> : <ChevronRight className="w-4 h-4 text-[#5777AB]" />}
                <div className="flex items-center gap-2">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${group.isMe ? 'bg-[#8403C5] text-white' : 'bg-[#F3E8FF] text-[#8403C5]'}`}>
                    {group.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                  </div>
                  <span className={`text-sm font-bold ${group.isMe ? 'text-[#8403C5]' : 'text-[#242450]'}`}>{group.name}</span>
                  {group.isMe && <span className="text-[10px] font-semibold bg-[#F3E8FF] text-[#8403C5] px-2 py-0.5 rounded-full">You</span>}
                </div>
              </div>
              <span className="text-xs font-medium text-[#9CA3AF] bg-[#EBEBF5] px-2 py-0.5 rounded-full">{group.items.length}</span>
            </button>

            {/* Group table */}
            {isOpen && (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-[#EBEBF5] bg-[#FAFAFD]">
                    {LIST_COLUMNS.filter(c => c.key !== 'assignedTo').map(col => (
                      <th key={col.key} onClick={() => col.sortable && onSort(col.key)}
                        className={`px-3 py-2.5 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em] select-none whitespace-nowrap ${col.sortable ? 'cursor-pointer hover:text-[#242450] transition-colors' : ''}`}>
                        <span className="inline-flex items-center gap-1">
                          {col.label}
                          {sortField === col.key && <ArrowUpDown className="w-3 h-3 text-[#8403C5]" />}
                        </span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {group.items.map(req => (
                    <tr key={req.id} onClick={() => onSelect(req)}
                      className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F6F6FB] transition-colors cursor-pointer">
                      <td className="px-3 py-3 min-w-[180px] max-w-[240px]">
                        <p className="font-medium text-[#242450] text-sm truncate">{req.title || <span className="text-[#9CA3AF] italic">Untitled</span>}</p>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{req.requestedBy || '—'}</td>
                      <td className="px-3 py-3">
                        {req.category && isValidCategory(req.category) ? (
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[req.category] || 'bg-[#EBEBF5] text-[#242450]'}`}>{req.category}</span>
                        ) : <span className="text-xs text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-3">
                        {req.priority ? <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority] || ''}`}>{req.priority}</span> : <span className="text-xs text-[#9CA3AF]">—</span>}
                      </td>
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <select value={req._displayStatus} onChange={e => onStatusChange(req.id, e.target.value)}
                          className={`text-[10px] font-semibold px-2 py-1 rounded-full border-0 outline-none cursor-pointer appearance-none ${STATUS_STYLES[req._displayStatus] || ''}`}>
                          {BOARD_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{fmtDate(req.deadline)}</td>
                      <td className="px-3 py-3 text-xs text-[#5777AB] whitespace-nowrap">{req.submittedAt ? format(new Date(req.submittedAt), 'd MMM yy') : '—'}</td>
                    </tr>
                  ))}
                  {group.items.length === 0 && (
                    <tr><td colSpan={7} className="px-4 py-8 text-center text-xs text-[#9CA3AF] italic">No tasks</td></tr>
                  )}
                </tbody>
              </table>
            )}
          </div>
        );
      })}
    </div>
  );
}