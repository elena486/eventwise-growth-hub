import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

const CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin', 'Design', 'Content', 'Ops', 'Tech', 'Other', 'Self'];
const ASSIGNEES = ['Elena', 'George', 'Chris', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor', 'Dickie'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

const inputCls = 'w-full text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 focus:outline-none focus:border-[#8403C5] bg-white';

export default function ApproveSuggestedTaskModal({ item, onClose, onApproved }) {
  const [title, setTitle] = useState(item.suggestedTitle || item.subject || '');
  const [description, setDescription] = useState(item.suggestedDescription || '');
  const [category, setCategory] = useState('Operations');
  const [assignee, setAssignee] = useState('Elena');
  const [priority, setPriority] = useState('Medium');
  const [dueDate, setDueDate] = useState('');
  const [saving, setSaving] = useState(false);

  const handleConfirm = async () => {
    if (!title.trim()) return;
    setSaving(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const request = await base44.entities.Request.create({
        title: title.trim(),
        description: description.trim(),
        assignedTo: assignee,
        category,
        priority,
        status: 'To Do',
        deadline: dueDate || undefined,
        requestedBy: item.requestedBy || '',
        submittedAt: new Date().toISOString(),
      });
      await base44.entities.SuggestedTask.update(item.id, {
        status: 'Approved',
        createdRequestId: request.id,
        reviewedBy: 'Elena',
        reviewedDate: today,
      });
      onApproved();
    } catch (e) {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5]">
          <h2 className="text-base font-bold text-[#242450]">Approve & create task</h2>
          <button onClick={onClose} className="text-[#9CA3AF] hover:text-[#242450]"><X className="w-4 h-4" /></button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Title</label>
            <input className={inputCls} value={title} onChange={e => setTitle(e.target.value)} autoFocus />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Description</label>
            <textarea className={inputCls + ' h-20 resize-none'} value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Category</label>
              <select className={inputCls} value={category} onChange={e => setCategory(e.target.value)}>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Assignee</label>
              <select className={inputCls} value={assignee} onChange={e => setAssignee(e.target.value)}>
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Priority</label>
              <select className={inputCls} value={priority} onChange={e => setPriority(e.target.value)}>
                {PRIORITIES.map(p => <option key={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] mb-1.5">Due date <span className="font-normal text-[#9CA3AF]">(optional)</span></label>
              <input type="date" className={inputCls} value={dueDate} onChange={e => setDueDate(e.target.value)} />
            </div>
          </div>
          {item.requestedBy && (
            <div className="text-xs text-[#5777AB] bg-[#F3E8FF] rounded-lg px-3 py-2">
              Requested by: <span className="font-semibold text-[#8403C5]">{item.requestedBy}</span> (detected from sender email)
            </div>
          )}
          <div className="text-xs text-[#9CA3AF]">
            From: {item.senderName || '—'} &lt;{item.senderEmail}&gt;
          </div>
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EBEBF5]">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
          <button onClick={handleConfirm} disabled={saving || !title.trim()}
            className="px-5 py-2 text-sm font-semibold text-white bg-[#8403C5] hover:bg-[#6B02A0] rounded-lg disabled:opacity-40">
            {saving ? 'Creating…' : 'Create task'}
          </button>
        </div>
      </div>
    </div>
  );
}