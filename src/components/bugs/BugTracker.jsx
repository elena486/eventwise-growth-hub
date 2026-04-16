import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, differenceInDays, isThisMonth } from 'date-fns';
import { Plus, Trash2, Check, X, ChevronLeft } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import InlineCell from '@/components/shared/InlineCell';
import BugDetail from './BugDetail';

const PRIORITY_STYLES = {
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Critical': 'bg-[#FEE2E2] text-[#B91C1C]',
};
const STATUS_STYLES = {
  'Open': 'bg-[#F3E8FF] text-[#7E22CE]',
  'In Progress': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Waiting on Client': 'bg-[#FEF9C3] text-[#A16207]',
  'Resolved': 'bg-[#DCFCE7] text-[#15803D]',
  'Closed': 'bg-[#F3F4F6] text-[#6B7280]',
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
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Open bugs', value: open.length, color: '#8403C5' },
          { label: 'Critical', value: critical.length, color: '#B91C1C' },
          { label: 'Resolved this month', value: resolvedThisMonth.length, color: '#15803D' },
          { label: 'Avg days to resolve', value: avgDays !== null ? `${avgDays}d` : '—', color: '#1D4ED8' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl p-6" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', borderLeft: `4px solid ${s.color}` }}>
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{s.label}</p>
            <p className="text-3xl font-bold text-[#111827]">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {['All', 'Open', 'Critical'].map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${filter === f ? 'bg-[#242450] text-white' : 'bg-white text-[#374151] hover:bg-[#F9FAFB]'}`}
              style={filter !== f ? { border: '1.5px solid #E5E7EB' } : {}}>
              {f}
            </button>
          ))}
          <span className="w-px h-5 bg-[#EBEBEB] mx-1" />
          <select
            value={clientFilter}
            onChange={e => setClientFilter(e.target.value)}
            className="px-3 py-2 text-xs font-medium rounded-lg bg-white text-[#374151] hover:bg-[#F9FAFB] focus:outline-none"
            style={{ border: '1.5px solid #E5E7EB' }}>
            <option value="">All clients</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <button onClick={handleAdd}
          className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6e02a3] transition-colors">
          <Plus className="w-3.5 h-3.5" /> Log Bug
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl overflow-x-auto" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <table className="w-full text-sm min-w-[900px]">
            <thead>
              <tr className="border-b border-[#EBEBEB]">
                {['#', 'Title', 'Client', 'Priority', 'Status', 'Assigned to', 'Date logged', 'Date resolved', ''].map(h => (
                  <th key={h} className="px-3 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((bug) => (
                <tr key={bug.id}
                  className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors cursor-pointer group"
                  onClick={() => setSelected(bug)}>
                  <td className="px-3 py-3 text-[#9CA3AF] text-xs w-8">{bug.bugNumber}</td>
                  <td className="px-3 py-3 min-w-[180px] max-w-[240px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.title} onSave={save(bug.id, 'title')} placeholder="Bug title" className="font-medium text-[#111827] text-sm" />
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
                      displayEl={<span className="text-xs text-[#374151]">{bug.clientName || '—'}</span>}
                    />
                  </td>
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.priority} onSave={save(bug.id, 'priority')} type="select" options={PRIORITIES}
                      displayEl={bug.priority ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${PRIORITY_STYLES[bug.priority]}`}>{bug.priority}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[130px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.status} onSave={save(bug.id, 'status')} type="select" options={STATUSES}
                      displayEl={bug.status ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${STATUS_STYLES[bug.status]}`}>{bug.status}</span> : null} />
                  </td>
                  <td className="px-3 py-3 min-w-[100px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={bug.assignedTo} onSave={save(bug.id, 'assignedTo')} type="select" options={ASSIGNEES}
                      displayEl={bug.assignedTo ? <span className="text-xs font-medium bg-[#F3F4F6] text-[#374151] px-2 py-0.5 rounded-md">{bug.assignedTo}</span> : <span className="text-xs text-[#9CA3AF]">—</span>} />
                  </td>
                  <td className="px-3 py-3 text-xs text-[#9CA3AF] whitespace-nowrap">{fmtDate(bug.dateLogged)}</td>
                  <td className="px-3 py-3 text-xs text-[#15803D] whitespace-nowrap">{bug.dateResolved ? fmtDate(bug.dateResolved) : '—'}</td>
                  <td className="px-3 py-3 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    {deleteId === bug.id ? (
                      <div className="flex items-center gap-1">
                        <button onClick={() => handleDelete(bug.id)} className="p-1.5 text-white bg-[#EF4444] hover:bg-[#DC2626] rounded-lg"><Check className="w-3 h-3" /></button>
                        <button onClick={() => setDeleteId(null)} className="p-1.5 text-[#9CA3AF] hover:bg-[#F9FAFB] rounded-lg"><X className="w-3 h-3" /></button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteId(bug.id)} className="p-1.5 text-[#9CA3AF] hover:text-[#EF4444] hover:bg-[#FEE2E2] rounded-lg transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <p className="text-sm text-[#6B7280]">No bugs logged. Either everything's working or nobody's checked yet.</p>
                  </td>
                </tr>
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