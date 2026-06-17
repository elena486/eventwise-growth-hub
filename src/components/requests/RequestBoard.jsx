import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { addRecentlyViewed } from '@/utils/recentlyViewed';
import { format } from 'date-fns';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, Search, X, Filter } from 'lucide-react';
import AddTaskModal from './AddTaskModal';
import RequestDetail from './RequestDetail';
import { PRIORITY_STYLES, STATUS_STYLES, CATEGORY_STYLES, PRIORITY_ORDER, BOARD_STATUSES, PRIORITIES, TEAM_MEMBERS, NEW_CATEGORIES, STATUS_MAP } from './requestStyles';

const COLUMN_LABELS = {
  'To Do': 'To Do',
  'In Progress': 'In Progress',
  'Done': 'Done',
  'Blocked': 'Blocked',
};

const COLUMN_ICONS = {
  'To Do': '📋',
  'In Progress': '🔄',
  'Done': '✅',
  'Blocked': '🚫',
};

export default function RequestBoard({ refresh }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedReq, setSelectedReq] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  // Filters
  const [myTasks, setMyTasks] = useState(false);
  const [filterAssignee, setFilterAssignee] = useState([]);
  const [filterStatus, setFilterStatus] = useState([]);
  const [filterPriority, setFilterPriority] = useState([]);
  const [filterCategory, setFilterCategory] = useState([]);
  const [search, setSearch] = useState('');

  // Dropdown open states
  const [openDropdown, setOpenDropdown] = useState(null);

  const load = async () => {
    try {
      const [data, me] = await Promise.all([
        base44.entities.Request.list('-created_date', 500),
        base44.auth.me().catch(() => null),
      ]);
      setRequests(data);
      if (me) {
        const name = me.full_name?.split(' ')[0] || me.email?.split('@')[0] || '';
        setCurrentUser(name);
      }
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  // Track recently viewed
  useEffect(() => {
    if (selectedReq) {
      addRecentlyViewed({
        type: 'request',
        name: selectedReq.title || `Request #${selectedReq.requestNumber || '—'}`,
        section: 'Operations → Team To Do',
        tab: 'requests',
        recordId: selectedReq.id,
      });
    }
  }, [selectedReq]);

  // Focus request from global search
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

  // Normalize status for display
  const normalizeStatus = (status) => STATUS_MAP[status] || status;

  const displayRequests = useMemo(() => {
    return requests.filter(r => !r.archived).map(r => ({
      ...r,
      _displayStatus: normalizeStatus(r.status),
    }));
  }, [requests]);

  // Filtered requests
  const filtered = useMemo(() => {
    let result = displayRequests.filter(r => r._displayStatus !== 'Cancelled');

    if (myTasks && currentUser) {
      result = result.filter(r => r.assignedTo === currentUser || r.requestedBy === currentUser);
    }

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(r => (r.title || '').toLowerCase().includes(q));
    }

    if (filterAssignee.length > 0) {
      result = result.filter(r => filterAssignee.includes(r.assignedTo));
    }

    if (filterStatus.length > 0) {
      result = result.filter(r => filterStatus.includes(r._displayStatus));
    }

    if (filterPriority.length > 0) {
      result = result.filter(r => filterPriority.includes(r.priority));
    }

    if (filterCategory.length > 0) {
      result = result.filter(r => filterCategory.includes(r.category));
    }

    return result;
  }, [displayRequests, myTasks, currentUser, search, filterAssignee, filterStatus, filterPriority, filterCategory]);

  // Group by board status columns
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
    const existing = requests;
    const nextNum = existing.length > 0 ? Math.max(...existing.map(r => r.requestNumber || 0)) + 1 : 1;
    const newReq = await base44.entities.Request.create({
      ...data,
      requestNumber: nextNum,
    });
    setRequests(prev => [newReq, ...prev]);

    base44.functions.invoke('notifyNewRequest', {
      requestedBy: data.requestedBy,
      recipient: data.recipient,
      title: data.title,
      category: data.category,
      priority: data.priority,
      deadline: data.deadline,
      description: data.description,
      submittedAt: data.submittedAt,
    }).catch(() => {});
  };

  const handleDragEnd = async (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const oldStatus = result.source.droppableId;
    if (newStatus === oldStatus) return;

    const reqId = result.draggableId;
    setRequests(prev => prev.map(r => r.id === reqId ? { ...r, status: newStatus } : r));
    await base44.entities.Request.update(reqId, { status: newStatus });
  };

  const handleDetailUpdate = (updated) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedReq(updated);
  };

  const hasAnyFilter = myTasks || filterAssignee.length > 0 || filterStatus.length > 0 || filterPriority.length > 0 || filterCategory.length > 0 || search;
  const clearFilters = () => {
    setMyTasks(false);
    setFilterAssignee([]);
    setFilterStatus([]);
    setFilterPriority([]);
    setFilterCategory([]);
    setSearch('');
  };

  const toggleFilter = (setter, arr, val) => {
    setter(arr.includes(val) ? arr.filter(v => v !== val) : [...arr, val]);
    setOpenDropdown(null);
  };

  const FilterDropdown = ({ label, options, selected, setter, styleMap }) => (
    <div className="relative">
      <button
        onClick={() => setOpenDropdown(openDropdown === label ? null : label)}
        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
          selected.length > 0 ? 'bg-[#F3E8FF] text-[#8403C5] border-[#8403C5]/30' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'
        }`}
      >
        <Filter className="w-3 h-3" />
        {label}
        {selected.length > 0 && <span className="bg-[#8403C5] text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">{selected.length}</span>}
      </button>
      {openDropdown === label && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-48 py-1 max-h-52 overflow-y-auto">
          {options.map(opt => (
            <button
              key={opt}
              onClick={() => toggleFilter(setter, selected, opt)}
              className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242450] hover:bg-[#F6F6FB] transition-colors text-left"
            >
              <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                selected.includes(opt) ? 'bg-[#8403C5] border-[#8403C5]' : 'border-[#D8D8EE]'
              }`}>
                {selected.includes(opt) && <span className="text-white text-[9px]">✓</span>}
              </span>
              {styleMap ? <span className={`text-[11px] font-semibold px-1.5 py-0.5 rounded-full ${styleMap[opt] || ''}`}>{opt}</span> : opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  // Only show category tag if it's one of the valid categories
  const isValidCategory = (cat) => NEW_CATEGORIES.includes(cat);

  if (selectedReq) {
    return (
      <RequestDetail
        request={selectedReq}
        onBack={() => setSelectedReq(null)}
        onUpdate={handleDetailUpdate}
      />
    );
  }

  return (
    <div className="flex-1 bg-[#F6F6FB] overflow-hidden flex flex-col font-dm">
      {/* Filter bar */}
      <div className="shrink-0 px-8 pt-5 pb-3">
        <div className="flex items-center justify-between mb-0.5">
          <h1 className="text-2xl font-bold text-[#242450]">Company To-Do Board</h1>
          <button
            onClick={() => setShowModal(true)}
            className="h-9 px-4 bg-[#8403C5] hover:bg-[#6B02A0] text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" /> Add Task
          </button>
        </div>
        <div className="flex items-center gap-2 flex-wrap mt-3">
          {/* Search */}
          <div className="relative min-w-[160px]">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search tasks…"
              className="w-full pl-8 pr-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5] transition-colors"
            />
          </div>

          {/* My Tasks toggle */}
          <button
            onClick={() => setMyTasks(m => !m)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${
              myTasks ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'
            }`}
          >
            My Tasks
          </button>

          <FilterDropdown label="Assignee" options={TEAM_MEMBERS} selected={filterAssignee} setter={setFilterAssignee} />
          <FilterDropdown label="Status" options={BOARD_STATUSES} selected={filterStatus} setter={setFilterStatus} styleMap={STATUS_STYLES} />
          <FilterDropdown label="Priority" options={PRIORITIES} selected={filterPriority} setter={setFilterPriority} styleMap={PRIORITY_STYLES} />
          <FilterDropdown label="Category" options={NEW_CATEGORIES} selected={filterCategory} setter={setFilterCategory} styleMap={CATEGORY_STYLES} />

          {hasAnyFilter && (
            <button onClick={clearFilters} className="px-3 py-1.5 text-xs font-medium text-[#DC2626] hover:underline">
              Clear all filters
            </button>
          )}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
          </div>
        ) : (
          <DragDropContext onDragEnd={handleDragEnd}>
            <div className="flex gap-4 h-full overflow-x-auto pb-2">
              {BOARD_STATUSES.map(status => (
                <div key={status} className="flex-shrink-0 w-72 flex flex-col">
                  {/* Column header */}
                  <div className="flex items-center justify-between mb-3 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm">{COLUMN_ICONS[status]}</span>
                      <span className="text-xs font-bold text-[#5777AB] uppercase tracking-[0.06em]">{COLUMN_LABELS[status]}</span>
                    </div>
                    <span className="text-xs font-medium text-[#9CA3AF] bg-[#EBEBF5] px-2 py-0.5 rounded-full">{columns[status].length}</span>
                  </div>

                  {/* Droppable column */}
                  <Droppable droppableId={status}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`flex-1 rounded-xl flex flex-col gap-2 p-2 transition-colors min-h-[200px] ${
                          snapshot.isDraggingOver ? 'bg-[#8403C5]/5 border border-dashed border-[#8403C5]/30' : 'bg-[#F6F6FB]/60'
                        }`}
                      >
                        {columns[status].map((req, index) => (
                          <Draggable key={req.id} draggableId={req.id} index={index}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                {...provided.dragHandleProps}
                                onClick={() => setSelectedReq(req)}
                                className={`bg-white border rounded-xl p-3.5 cursor-pointer hover:border-[#8403C5]/30 transition-all ${
                                  snapshot.isDragging ? 'shadow-lg border-[#8403C5]/40 rotate-1' : 'border-[#EBEBF5]'
                                }`}
                              >
                                {/* Title */}
                                <p className="text-sm font-semibold text-[#242450] mb-2.5 leading-snug">{req.title || <span className="text-[#9CA3AF] italic">Untitled</span>}</p>

                                {/* Meta row */}
                                <div className="flex items-center gap-2 flex-wrap mb-2">
                                  {req.assignedTo && (
                                    <div className="flex items-center gap-1.5">
                                      <div className="w-5 h-5 rounded-full bg-[#F3E8FF] text-[#8403C5] text-[10px] font-bold flex items-center justify-center shrink-0">
                                        {req.assignedTo.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                                      </div>
                                      <span className="text-[11px] font-medium text-[#5777AB]">{req.assignedTo}</span>
                                    </div>
                                  )}
                                </div>

                                {/* Badges */}
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  {req.priority && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority] || ''}`}>
                                      {req.priority}
                                    </span>
                                  )}
                                  {req.category && isValidCategory(req.category) && (
                                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[req.category] || 'bg-[#EBEBF5] text-[#242450]'}`}>
                                      {req.category}
                                    </span>
                                  )}
                                </div>

                                {/* Due date */}
                                {req.deadline && (
                                  <p className="text-[11px] text-[#5777AB] mt-2">
                                    Due {format(new Date(req.deadline), 'd MMM yyyy')}
                                  </p>
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                        {columns[status].length === 0 && !snapshot.isDraggingOver && (
                          <div className="flex-1 flex items-center justify-center">
                            <p className="text-xs text-[#9CA3AF] italic">No tasks</p>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              ))}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* Add Task Modal */}
      {showModal && (
        <AddTaskModal
          onClose={() => setShowModal(false)}
          onSubmit={handleAddTask}
        />
      )}

      {/* Close dropdowns on outside click */}
      {openDropdown && (
        <div className="fixed inset-0 z-40" onClick={() => setOpenDropdown(null)} />
      )}
    </div>
  );
}