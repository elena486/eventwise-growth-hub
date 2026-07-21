import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X, Loader2 } from 'lucide-react';

const ASSIGNEES = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin', 'Design', 'Content', 'Finance', 'Strategy & Planning', 'Other'];
const PRIORITIES = [
  { value: 'Low', cls: 'bg-gray-100 text-gray-600 dark:bg-[#2A2A3E] dark:text-gray-300' },
  { value: 'Medium', cls: 'bg-blue-50 text-[#5777AB] dark:bg-[#1e1b4b] dark:text-[#93a8cc]' },
  { value: 'High', cls: 'bg-amber-50 text-[#A16207] dark:bg-[#451a03] dark:text-[#fbbf24]' },
  { value: 'Urgent', cls: 'bg-red-50 text-[#DC2626] dark:bg-[#450a0a] dark:text-[#f87171]' },
];

const REQUEST_CATS = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin', 'Design', 'Content', 'Ops', 'Tech', 'Other', 'Self'];
function mapCategory(cat) { return REQUEST_CATS.includes(cat) ? cat : 'Other'; }
const RECIPIENT_ENUM = ['Elena', 'George', 'Eleanor'];

const inp = 'w-full border border-ew-border rounded-lg px-2.5 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600';

export default function PendingActionItemCard({ item, onUpdated }) {
  const [title, setTitle] = useState(item.taskTitle || '');
  const [assignedTo, setAssignedTo] = useState(item.assignedTo || 'Elena');
  const [category, setCategory] = useState(item.category || 'Other');
  const [priority, setPriority] = useState(item.priority || 'Medium');
  const [busy, setBusy] = useState(false);

  const reviewed = item.status !== 'Pending Review';

  const patch = async (fields) => {
    await base44.entities.PendingTaskFromNote.update(item.id, fields);
    onUpdated();
  };

  const handleApprove = async () => {
    setBusy(true);
    try {
      const now = new Date().toISOString();
      const req = await base44.entities.Request.create({
        title: title.trim() || 'Untitled task',
        requestedBy: 'Elena',
        recipient: RECIPIENT_ENUM.includes(assignedTo) ? assignedTo : 'Elena',
        assignedTo: ASSIGNEES.includes(assignedTo) ? assignedTo : 'Elena',
        category: mapCategory(category),
        priority,
        status: 'To Do',
        description: item.notes || '',
        submittedAt: now,
      });
      await base44.entities.Notification.create({
        recipientName: (assignedTo || 'Elena').split(' ')[0],
        type: 'task_assigned',
        message: `A new task has been assigned to you: ${title.trim()}`,
        isRead: false,
        navigateTo: 'team-board',
        recordId: req.id,
        actorName: 'Elena',
      });
      await patch({ status: 'Added to Board', reviewedBy: 'Elena', reviewedAt: now, createdRequestId: req.id, taskTitle: title.trim(), assignedTo, category, priority });
    } catch (e) {
      alert('Could not add to board: ' + (e.message || 'error'));
    }
    setBusy(false);
  };

  const handleReject = async () => {
    setBusy(true);
    try {
      await patch({ status: 'Rejected', reviewedBy: 'Elena', reviewedAt: new Date().toISOString(), taskTitle: title.trim(), assignedTo, category, priority });
    } catch {}
    setBusy(false);
  };

  const statusBadge = () => {
    if (item.status === 'Added to Board') return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F7F2] text-[#1D9E75]">✓ Added to board</span>;
    if (item.status === 'Rejected') return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626]">✗ Rejected</span>;
    if (item.status === 'Approved') return <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#E8F7F2] text-[#1D9E75]">Approved</span>;
    return null;
  };

  return (
    <div className="border border-ew-border dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-[#1E1E2E]">
      <div className="flex items-start justify-between gap-2 mb-3">
        <input
          className={`${inp} font-semibold`}
          value={title}
          onChange={e => setTitle(e.target.value)}
          disabled={reviewed}
        />
        {statusBadge()}
      </div>

      <div className="grid grid-cols-3 gap-3 mb-3">
        <div>
          <label className="block text-[10px] font-medium text-ew-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Assigned to</label>
          <select className={inp} value={assignedTo} onChange={e => setAssignedTo(e.target.value)} disabled={reviewed}>
            {ASSIGNEES.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-ew-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Category</label>
          <select className={inp} value={category} onChange={e => setCategory(e.target.value)} disabled={reviewed}>
            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-[10px] font-medium text-ew-muted dark:text-gray-400 mb-1 uppercase tracking-wide">Priority</label>
          <div className="flex flex-wrap gap-1">
            {PRIORITIES.map(p => (
              <button
                key={p.value}
                type="button"
                disabled={reviewed}
                onClick={() => setPriority(p.value)}
                className={`px-2 py-1 rounded-md text-xs font-semibold border transition-colors ${priority === p.value ? p.cls + ' border-transparent' : 'border-ew-border text-ew-muted dark:text-gray-400 hover:bg-ew-bg dark:hover:bg-[#252535]'}`}
              >
                {p.value}
              </button>
            ))}
          </div>
        </div>
      </div>

      {item.notes && (
        <p className="text-xs text-ew-muted dark:text-gray-400 italic mb-3">{item.notes}</p>
      )}

      {!reviewed && (
        <div className="flex items-center gap-2">
          <button
            onClick={handleApprove}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold bg-[#1D9E75] text-white hover:bg-[#16805e] transition-colors disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} Approve &amp; Add to Board
          </button>
          <button
            onClick={handleReject}
            disabled={busy}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold border border-[#FECACA] text-[#DC2626] hover:bg-[#FEF2F2] dark:hover:bg-[#450a0a] transition-colors disabled:opacity-50"
          >
            <X className="w-4 h-4" /> Reject
          </button>
        </div>
      )}
    </div>
  );
}