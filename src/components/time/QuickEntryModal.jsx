import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { CATEGORY_LABELS } from './categoryColors';
import TaskPresetSelect from './TaskPresetSelect';
import { Link } from 'lucide-react';
import LeadSelect from './LeadSelect';

const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];

export default function QuickEntryModal({ open, onClose, onSaved, initial }) {
  const [date, setDate] = useState('');
  const [teamMember, setTeamMember] = useState('');
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [leadId, setLeadId] = useState('');
  const [leadName, setLeadName] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [startTime, setStartTime] = useState('');
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const [notes, setNotes] = useState('');
  const [transcriptLink, setTranscriptLink] = useState('');
  const [clients, setClients] = useState([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isEdit = !!initial?.id;

  useEffect(() => {
    if (!open) return;
    base44.auth.me().then(me => {
      if (me?.full_name) {
        const first = me.full_name.split(' ')[0];
        if (TEAM_MEMBERS.includes(first)) setTeamMember(first);
      }
    }).catch(() => {});
    base44.entities.Client.list().then(c => setClients(c)).catch(() => {});

    if (initial) {
      const h = Math.floor((initial.durationMinutes || 0) / 60);
      const m = (initial.durationMinutes || 0) % 60;
      setDate(initial.date || '');
      setCategory(initial.category || '');
      setClientId(initial.clientId || '');
      setClientName(initial.clientName || '');
      setLeadId(initial.leadId || '');
      setLeadName(initial.leadName || '');
      setProjectTask(initial.projectTask || '');
      setStartTime(initial.startTime || '');
      setHours(String(h));
      setMinutes(String(m));
      setNotes(initial.notes || '');
      setTranscriptLink(initial.transcriptLink || '');
    } else {
      setDate(initial?.date || new Date().toISOString().slice(0, 10));
      setCategory(initial?.category || '');
      setClientId('');
      setClientName('');
      setLeadId('');
      setLeadName('');
      setProjectTask('');
      setStartTime(initial?.startTime || '');
      setHours('');
      setMinutes('');
      setNotes('');
      setTranscriptLink('');
    }
  }, [open, initial]);

  const handleSave = async () => {
    const h = parseInt(hours) || 0;
    const m = parseInt(minutes) || 0;
    const totalMin = h * 60 + m;
    if (!teamMember || !category || !projectTask.trim() || totalMin <= 0) return;

    setSaving(true);
    try {
      const payload = {
        date,
        teamMember: initial?.teamMember || teamMember,
        category,
        projectTask: projectTask.trim(),
        durationMinutes: totalMin,
        notes: notes.trim() || undefined,
        transcriptLink: transcriptLink.trim() || undefined,
        ...(clientId ? { clientId, clientName } : {}),
        ...(leadId ? { leadId, leadName } : {}),
      };

      if (isEdit) {
        await base44.entities.TimeEntry.update(initial.id, payload);
      } else {
        await base44.entities.TimeEntry.create(payload);
      }

      // Activity log for client
      if (clientId) {
        try {
          const client = await base44.entities.Client.get(clientId);
          if (client) {
            const currentLog = (() => { try { return JSON.parse(client.activityLog || '[]'); } catch { return []; } })();
            const durH = Math.floor(totalMin / 60);
            const durM = totalMin % 60;
            const durStr = durM === 0 ? `${durH}h` : `${durH}h ${durM}m`;
            currentLog.push({
              date: new Date().toISOString(),
              type: 'Time logged',
              label: `Time logged: ${durStr} — ${category}`,
              category,
              duration: durStr,
              description: projectTask.trim(),
              teamMember: initial?.teamMember || teamMember,
              notes: notes.trim() || '',
              transcriptLink: transcriptLink.trim() || '',
            });
            await base44.entities.Client.update(clientId, { activityLog: JSON.stringify(currentLog) });
          }
        } catch {}
      }

      onSaved?.();
      onClose();
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!isEdit || !window.confirm('Delete this time entry?')) return;
    setDeleting(true);
    try {
      await base44.entities.TimeEntry.delete(initial.id);
      onSaved?.();
      onClose();
    } catch {} finally {
      setDeleting(false);
    }
  };

  if (!open) return null;

  const isValid = teamMember && category && projectTask.trim() && ((parseInt(hours) || 0) + (parseInt(minutes) || 0)) > 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-[#242450] mb-4">{isEdit ? 'Edit entry' : 'Log time'}</h3>
        <div className="space-y-3">
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Team member</label>
            <select value={teamMember} onChange={e => setTeamMember(e.target.value)} disabled={!!initial?.teamMember}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg disabled:bg-[#F6F6FB] disabled:text-[#5777AB]">
              <option value="">Select…</option>
              {TEAM_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Category</label>
            <select value={category} onChange={e => { setCategory(e.target.value); setProjectTask(''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg">
              <option value="">Select…</option>
              {CATEGORY_LABELS.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Client <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); if (e.target.value) { setLeadId(''); setLeadName(''); } }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Sales Company <span className="font-normal normal-case text-[#9CA3AF]">(optional — prospect)</span></label>
            <LeadSelect
              value={leadId}
              onChange={(id, name) => { setLeadId(id); setLeadName(name); if (id) { setClientId(''); setClientName(''); } }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Project / Task</label>
            <TaskPresetSelect
              category={category}
              value={projectTask}
              onChange={setProjectTask}
              placeholder="Select a task…"
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
            />
          </div>
          {startTime && (
            <div>
              <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Start time</label>
              <input type="time" value={startTime} onChange={e => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Hours</label>
              <input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Minutes</label>
              <input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg" />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1">Notes <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg resize-none" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#5777AB] uppercase mb-1 flex items-center gap-1">
              <Link className="w-3 h-3" /> Transcript link <span className="font-normal normal-case text-[#9CA3AF] ml-1">(optional)</span>
            </label>
            <input
              type="url"
              value={transcriptLink}
              onChange={e => setTranscriptLink(e.target.value)}
              placeholder="Paste meeting transcript link (e.g. Fireflies, Otter, Google Doc)"
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg"
            />
          </div>
        </div>
        <div className="flex justify-end gap-2 mt-5 pt-4 border-t border-[#EBEBF5]">
          {isEdit && (
            <button onClick={handleDelete} disabled={deleting}
              className="px-4 py-2 text-sm text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg mr-auto">
              {deleting ? 'Deleting…' : 'Delete'}
            </button>
          )}
          <button onClick={onClose} className="px-4 py-2 text-sm text-[#5777AB] hover:bg-gray-100 rounded-lg">Cancel</button>
          <button onClick={handleSave} disabled={!isValid || saving}
            className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF]">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}