import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, isThisMonth } from 'date-fns';
import { Plus, Trash2, Check, X, ChevronLeft } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import InlineCell from '@/components/shared/InlineCell';
import BugDetail from './BugDetail';

const PRIORITY_STYLES = {
  'Low': 'bg-gray-100 text-gray-600',
  'Medium': 'bg-blue-50 text-blue-700',
  'High': 'bg-amber-50 text-amber-700',
  'Critical': 'bg-red-100 text-red-700',
};
const STATUS_STYLES = {
  'Open': 'bg-purple-50 text-[#8403C5]',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Waiting on Client': 'bg-amber-50 text-amber-700',
  'Resolved': 'bg-green-50 text-green-700',
  'Closed': 'bg-gray-100 text-gray-500',
};
const PRIORITY_ORDER = { Critical: 0, High: 1, Medium: 2, Low: 3 };
const STATUS_OPEN_ORDER = { Open: 0, 'In Progress': 1, 'Waiting on Client': 2, Resolved: 3, Closed: 4 };

const REPORTERS = ['Chris', 'Martinique', 'George', 'Sreeja', 'Elena'];
const ASSIGNEES = ['Chris', 'Martinique', 'Sreeja', 'Elena'];
const CATEGORIES = ['Platform Bug', 'Integration Issue', 'Onboarding Issue', 'Data Issue', 'UI Issue', 'Other'];
const STATUSES = ['Open', 'In Progress', 'Waiting on Client', 'Resolved', 'Closed'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

export default function BugTracker() {
  const [bugs, setBugs] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [clientFilter, setClientFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [deleteId, setDeleteId] = useState(null);

  const load = async () => {
    const [b, c] = await Promise.all([
      base44.entities.Bug.list('-created_date', 500),
      base44.entities.Client.list(),
    ]);
    setBugs(b);
    setClients(c);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleAdd = async () => {
    const existing = bugs;
    const nextNum = existing.length > 0 ? Math.max(...existing.map(b => b.bugNumber || 0)) + 1 : 1;
    const newBug = await base44.entities.Bug.create({
      bugNumber: nextNum,
      title: '',
      priority: 'Medium',
      status: 'Open',
      reportedBy: 'Martinique',
      category: 'Platform Bug',
      dateLogged: format(new Date(), 'yyyy-MM-dd'),
    });
    setBugs(prev => [newBug, ...prev]);
  };

  const handleUpdate = async (id, field, value) => {
    setBugs(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
    await base44.entities.Bug.update(id, { [field]: value });
  };

  const handleDelete = async (id) => {
    await base44.entities.Bug.delete(id);
    setBugs(prev => prev.filter(b => b.id !== id));
    setDeleteId(null);
  };

  const handleDetailUpdate = (updated) => {
    setBugs(prev => prev.map(b => b.id === updated.id ? updated : b));
    setSelected(updated);
  };

  // Stats
  const open = bugs.filter(b => b.status === 'Open' || b.status === 'In Progress' || b.status === 'Waiting on Client');
  const critical = bugs.filter(b => b.priority === 'Critical' && b.status !== 'Resolved' && b.status !== 'Closed');
  const resolvedThisMonth = bugs.filter(b => b.status === 'Resolved' && b.dateResolved && isThisMonth(new Date(b.dateResolved)));
  const resolvedWithDays = bugs.filter(b => b.status === 'Resolved' && b.dateLogged && b.dateResolved);
  const avgDays = resolvedWithDays.length > 0
    ? Math.round(resolvedWithDays.reduce((sum, b) => sum + differenceInDays(new Date(b.dateResolved), new Date(b.dateLogged)), 0) / resolvedWithDays.length)
    : null;

  // Filtered
  let filtered = [...bugs];
  if (filter === 'Open') filtered = filtered.filter(b => b.status === 'Open' || b.status === 'In Progress' || b.status === 'Waiting on Client');
  else if (filter === 'Critical') filtered = filtered.filter(b => b.priority === 'Critical');
  if (clientFilter) filtered = filtered.filter(b => b.clientId === clientFilter);

  // Sort: open/critical first
  filtered = filtered.sort((a, b) => {
    const sd = STATUS_OPEN_ORDER[a.status] - STATUS_OPEN_ORDER[b.status];
    if (sd !== 0) return sd;
    return (PRIORITY_ORDER[a.priority] ?? 4) - (PRIORITY_ORDER[b.priority] ?? 4);
  });

  const save = (id, field) => (value) => handleUpdate(id, field, value);

  if (selected) {
    return (
      <BugDetail
        bug={selected}
        clients={clients}
        onBack={() => setSelected(null)}
        onUpdate={handleDetailUpdate}
      />
    );
  }

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open bugs', value: open.length },
          { label: 'Critical', value: critical.length },
          { label: 'Resolved this month', value: resolvedThisMonth.length },
          { label: 'Avg days to resolve', value: avgDays !== null ? `${avgDays}d` : '—' },
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
          {['All', 'Open', 'Critical'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${filter === f ? 'bg-navy text-white' : 'bg-white border border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-ew-border bg-white text-ew-body hover:bg-ew-bg focus:outline-none">
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">
          <Plus className="w-3.5 h-3.5" /> Log Bug
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['#', 'Title', 'Client', 'Priority', 'Status', 'Assigned to', 'Date logged', 'Date resolved', ''].map(h => (
                  <th key={h} className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bug, i) => (
                <tr key={bug.id}
                  className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                  onClick={() => setSelected(bug)}>
                  <td className="px-3 py-3 text-ew-muted text-xs font-medium w-8">{bug.bugNumber || i + 1}</td>
                  <td className="px-3 py-3 min-w-[180px] max-w-[240px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.title} onSave={save(bug.id, 'title')} placeholder="Bug title" className="font-semibold text-navy text-sm" />
                  </td>
                  <td className="px-3 py-3 min-w-[120px]" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={bug.clientId}
                      onSave={async (val) => {
                        const cl = clients.find(c => c.id === val);
                        await handleUpdate(bug.id, 'clientId', val);
                        await handleUpdate(bug.id, 'clientName', cl?.name || '');
                      }}
                      type="select"
                      options={[{ value: '', label: '—' }, ...clients.map(c => ({ value: c.id, label: c.name }))]}
                      displayEl={<span className="text-xs text-ew-body">{bug.clientName || '—'}</span>}
                    />
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.priority} onSave={save(bug.id, 'priority')} type="select" options={PRIORITIES}
                      displayEl={bug.priority ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[bug.priority]}`}>{bug.priority}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[130px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.status} onSave={save(bug.id, 'status')} type="select" options={STATUSES}
                      displayEl={bug.status ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[bug.status]}`}>{bug.status}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[100px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.assignedTo} onSave={save(bug.id, 'assignedTo')} type="select" options={ASSIGNEES}
                      displayEl={bug.assignedTo ? <span className="text-xs font-medium bg-navy/10 text-navy px-2 py-0.5 rounded-full">{bug.assignedTo}</span> : <span className="text-xs text-ew-muted">—</span>} />
                  </td>
                  <td className="px-3 py-3 text-xs text-ew-muted whitespace-nowrap">{fmtDate(bug.dateLogged)}</td>
                  <td className="px-3 py-3 text-xs text-green-600 whitespace-nowrap">{bug.dateResolved ? fmtDate(bug.dateResolved) : '—'}</td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    {deleteId === bug.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(bug.id)} className="p-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 text-ew-muted hover:bg-ew-bg rounded-lg"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(bug.id)} className="p-1.5 text-ew-muted hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-ew-muted text-sm">No bugs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {deleteId && (
        <ConfirmDialog
          message="Are you sure you want to delete this bug report? This cannot be undone."
          onConfirm={() => handleDelete(deleteId)}
          onCancel={() => setDeleteId(null)}
        />
      )}
    </div>
  );
}