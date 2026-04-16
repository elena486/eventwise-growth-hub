import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isThisWeek, isThisMonth } from 'date-fns';
import { Plus, Trash2, Check, X, LayoutList, Columns, Archive, Eye } from 'lucide-react';
import InlineCell from '@/components/shared/InlineCell';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import RequestDetail from './RequestDetail';
import RequestKanban from './RequestKanban';
import { PRIORITY_STYLES, STATUS_STYLES, CATEGORY_STYLES, PRIORITY_ORDER, STATUSES, CATEGORIES, PRIORITIES, REQUESTERS } from './requestStyles';

const PERSON_FILTERS = ['All', 'Chris', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];

const ASSIGNEES = ['Elena', 'George', 'Chris', 'Martinique', 'Sreeja', 'Ramesh'];

export default function RequestBoard({ refresh, assigneeFilter }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [personFilter, setPersonFilter] = useState('All');
  const [showArchived, setShowArchived] = useState(false);
  const [view, setView] = useState('table');
  const [selectedReq, setSelectedReq] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    const data = await base44.entities.Request.list('-created_date', 500);
    setRequests(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, [refresh]);

  const handleUpdate = async (id, field, value) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    await base44.entities.Request.update(id, { [field]: value });
  };

  const handleDelete = async (id) => {
    await base44.entities.Request.delete(id);
    setRequests(prev => prev.filter(r => r.id !== id));
    setDeleteId(null);
  };

  const handleArchiveDone = async () => {
    const done = requests.filter(r => r.status === 'Done' && !r.archived);
    await Promise.all(done.map(r => base44.entities.Request.update(r.id, { archived: true })));
    setRequests(prev => prev.map(r => r.status === 'Done' && !r.archived ? { ...r, archived: true } : r));
  };

  const handleAddTask = async () => {
    const existing = requests;
    const nextNum = existing.length > 0 ? Math.max(...existing.map(r => r.requestNumber || 0)) + 1 : 1;
    const newReq = await base44.entities.Request.create({
      requestNumber: nextNum,
      title: '',
      requestedBy: 'Elena',
      category: 'Self',
      priority: 'Medium',
      status: 'New',
      submittedAt: new Date().toISOString(),
      archived: false,
    });
    setRequests(prev => [newReq, ...prev]);
  };

  const handleKanbanStatusChange = async (id, newStatus) => {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: newStatus } : r));
    await base44.entities.Request.update(id, { status: newStatus });
  };

  const handleDetailUpdate = (updated) => {
    setRequests(prev => prev.map(r => r.id === updated.id ? updated : r));
    setSelectedReq(updated);
  };

  // Stats
  const open = requests.filter(r => r.status !== 'Done' && r.status !== 'Cancelled' && !r.archived);
  const urgent = open.filter(r => r.priority === 'Urgent');
  const dueThisWeek = open.filter(r => r.deadline && isThisWeek(new Date(r.deadline), { weekStartsOn: 1 }));
  const completedThisMonth = requests.filter(r => r.status === 'Done' && r.submittedAt && isThisMonth(new Date(r.submittedAt)));

  // Filtered list
  let filtered = requests.filter(r => showArchived ? r.archived : !r.archived);
  if (assigneeFilter) filtered = filtered.filter(r => r.assignedTo === assigneeFilter);
  if (statusFilter === 'Urgent') filtered = filtered.filter(r => r.priority === 'Urgent');
  else if (statusFilter === 'My tasks') filtered = filtered.filter(r => r.requestedBy === 'Elena' || r.category === 'Self');
  else if (statusFilter !== 'All') filtered = filtered.filter(r => r.status === statusFilter);
  if (personFilter !== 'All') filtered = filtered.filter(r => r.requestedBy === personFilter);

  // Sort: priority then date
  filtered = [...filtered].sort((a, b) => {
    const pd = (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
    if (pd !== 0) return pd;
    return new Date(b.submittedAt || 0) - new Date(a.submittedAt || 0);
  });

  const save = (id, field) => (value) => handleUpdate(id, field, value);

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
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Stats bar */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open requests', value: open.length },
          { label: 'Urgent', value: urgent.length },
          { label: 'Due this week', value: dueThisWeek.length },
          { label: 'Completed this month', value: completedThisMonth.length },
        ].map(s => (
          <div key={s.label} className="bg-white border border-ew-border rounded-xl p-4">
            <p className="text-xs text-ew-muted uppercase tracking-[0.12em] font-medium mb-1">{s.label}</p>
            <p className="text-2xl font-bold text-navy">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'New', 'In Progress', 'Urgent', 'My tasks'].map(f => (
            <button key={f} onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${statusFilter === f ? 'bg-navy text-white' : 'bg-white border border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {PERSON_FILTERS.map(p => (
            <button key={p} onClick={() => setPersonFilter(p)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${personFilter === p ? 'bg-[#8403C5] text-white' : 'bg-white border border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {p}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowArchived(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-ew-border rounded-lg bg-white text-ew-body hover:bg-ew-bg transition-colors">
            {showArchived ? <><Eye className="w-3.5 h-3.5" /> Hide archived</> : <><Archive className="w-3.5 h-3.5" /> Show archived</>}
          </button>
          <button onClick={handleArchiveDone}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-ew-border rounded-lg bg-white text-ew-body hover:bg-ew-bg transition-colors">
            <Archive className="w-3.5 h-3.5" /> Archive done
          </button>
          <button onClick={() => setView(v => v === 'table' ? 'kanban' : 'table')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold border border-ew-border rounded-lg bg-white text-ew-body hover:bg-ew-bg transition-colors">
            {view === 'table' ? <><Columns className="w-3.5 h-3.5" /> Kanban</> : <><LayoutList className="w-3.5 h-3.5" /> Table</>}
          </button>
          <button onClick={handleAddTask}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">
            <Plus className="w-3.5 h-3.5" /> Add Task
          </button>
        </div>
      </div>

      {/* View */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : view === 'kanban' ? (
        <RequestKanban requests={filtered} onStatusChange={handleKanbanStatusChange} onSelect={setSelectedReq} />
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['#', 'Title', 'By', 'Assigned to', 'Category', 'Priority', 'Status', 'Deadline', 'Submitted', 'Notes', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((req, i) => (
                <tr key={req.id} className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                  onClick={() => setSelectedReq(req)}>
                  <td className="px-3 py-3 text-ew-muted text-xs font-medium w-8">{req.requestNumber || i + 1}</td>
                  <td className="px-3 py-3 min-w-[160px] max-w-[220px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.title} onSave={save(req.id, 'title')} placeholder="Task title" className="font-semibold text-navy text-sm" />
                  </td>
                  <td className="px-3 py-3 min-w-[90px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.requestedBy} onSave={save(req.id, 'requestedBy')} type="select" options={REQUESTERS}
                      displayEl={req.requestedBy ? <span className="text-xs font-medium bg-navy/10 text-navy px-2 py-0.5 rounded-full">{req.requestedBy}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[90px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.assignedTo} onSave={save(req.id, 'assignedTo')} type="select" options={ASSIGNEES}
                      displayEl={req.assignedTo ? <span className="text-xs font-medium bg-[#8403C5]/10 text-[#8403C5] px-2 py-0.5 rounded-full">{req.assignedTo}</span> : <span className="text-xs text-ew-muted">—</span>} />
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.category} onSave={save(req.id, 'category')} type="select" options={CATEGORIES}
                      displayEl={req.category ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${CATEGORY_STYLES[req.category] || 'bg-gray-100 text-gray-600'}`}>{req.category}</span> : null} />
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.priority} onSave={save(req.id, 'priority')} type="select" options={PRIORITIES}
                      displayEl={req.priority ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority]}`}>{req.priority}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.status} onSave={save(req.id, 'status')} type="select" options={STATUSES}
                      displayEl={req.status ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[req.status]}`}>{req.status}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.deadline || ''} onSave={save(req.id, 'deadline')} type="date"
                      displayEl={<span className="text-xs text-ew-body">{req.deadline ? format(new Date(req.deadline), 'd MMM yy') : '—'}</span>} />
                  </td>
                  <td className="px-3 py-3 text-xs text-ew-muted whitespace-nowrap">
                    {req.submittedAt ? format(new Date(req.submittedAt), 'd MMM yy') : '—'}
                  </td>
                  <td className="px-3 py-3 max-w-[160px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={req.notes} onSave={save(req.id, 'notes')} type="textarea" placeholder="Add notes…"
                      displayEl={req.notes ? <p className="text-xs text-ew-body truncate max-w-[140px]" title={req.notes}>{req.notes}</p> : null} />
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    {deleteId === req.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(req.id)} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 text-ew-muted hover:bg-ew-bg rounded-lg"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(req.id)} className="p-1.5 text-ew-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={11} className="px-4 py-12 text-center text-ew-muted text-sm">No requests found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this request? This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}