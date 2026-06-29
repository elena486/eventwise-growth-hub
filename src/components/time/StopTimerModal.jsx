import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import TaskPresetSelect from './TaskPresetSelect';
import TranscriptField from './TranscriptField';

const CATEGORIES = [
  'Sales & Outbound', 'Customer Success & Onboarding', 'Marketing & Content',
  'Operations & Admin', 'Product & Tech', 'Finance', 'Strategy & Planning', 'Other',
];

function formatTime(ms) {
  const sec = Math.floor(ms / 1000);
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export default function StopTimerModal({ open, onClose, onSave, data, clients }) {
  const [category, setCategory] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [projectTask, setProjectTask] = useState('');
  const [date, setDate] = useState('');
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('0');
  const [notes, setNotes] = useState('');
  const [transcriptLink, setTranscriptLink] = useState('');
  const [transcriptFileUrl, setTranscriptFileUrl] = useState('');
  const [transcriptFileName, setTranscriptFileName] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data && open) {
      setCategory(data.category || '');
      setClientId(data.clientId || '');
      setClientName(data.clientName || '');
      setProjectTask(data.projectTask || '');
      setDate(data.date || new Date().toISOString().slice(0, 10));
      const h = Math.floor((data.durationMinutes || 0) / 60);
      const m = (data.durationMinutes || 0) % 60;
      setHours(String(h));
      setMinutes(String(m));
      setNotes(data.notes || '');
      setTranscriptLink(data.transcriptLink || '');
      setTranscriptFileUrl(data.transcriptFileUrl || '');
      setTranscriptFileName(data.transcriptFileName || '');
    }
  }, [data, open]);

  if (!open) return null;

  const isValid = category && projectTask.trim() && ((parseInt(hours) || 0) + (parseInt(minutes) || 0)) > 0;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isValid || saving) return;
    setSaving(true);
    const totalMin = (parseInt(hours) || 0) * 60 + (parseInt(minutes) || 0);
    await onSave({
      category, clientId, clientName, projectTask: projectTask.trim(),
      date, durationMinutes: totalMin, notes: notes.trim(),
      transcriptLink: transcriptLink.trim(),
      transcriptFileUrl: transcriptFileUrl || '',
      transcriptFileName: transcriptFileName || '',
    });
    setSaving(false);
  };

  const isStop = data?.mode === 'stop';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-[14px] w-[440px] max-h-[90vh] overflow-y-auto p-8 animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-[#242450]">{isStop ? 'Log your time' : 'Edit entry'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-[#EBEBF5] rounded">
            <X className="w-4 h-4 text-[#5777AB]" />
          </button>
        </div>

        {isStop && data?.durationMs != null && data.durationMs > 0 && (
          <p className="text-sm text-[#5777AB] mb-5">
            Total time: <span className="font-bold text-[#242450] font-mono">{formatTime(data.durationMs)}</span>
          </p>
        )}

        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Category <span className="text-[#DC2626]">*</span></label>
            <select value={category} onChange={e => { setCategory(e.target.value); setProjectTask(''); }}
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 ${!category ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}>
              <option value="">Select…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Client</label>
            <select value={clientId} onChange={e => { setClientId(e.target.value); const c = clients.find(cl => cl.id === e.target.value); setClientName(c?.name || ''); }}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white">
              <option value="">None</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Project / Task <span className="text-[#DC2626]">*</span></label>
            <TaskPresetSelect
              category={category}
              value={projectTask}
              onChange={setProjectTask}
              placeholder="Select a task…"
              className={`w-full px-3 py-2 text-sm border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 ${!projectTask.trim() ? 'border-[#DC2626]' : 'border-[#EBEBF5]'}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Date</label>
              <input type="date" value={date} onChange={e => setDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Time spent</label>
              <div className="flex items-center gap-1.5">
                <input type="number" min="0" value={hours} onChange={e => setHours(e.target.value)}
                  className="w-14 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white" />
                <span className="text-xs text-[#5777AB]">h</span>
                <input type="number" min="0" max="59" value={minutes} onChange={e => setMinutes(e.target.value)}
                  className="w-14 px-2 py-2 text-sm text-center border border-[#EBEBF5] rounded-lg bg-white" />
                <span className="text-xs text-[#5777AB]">m</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1">Notes <span className="font-normal normal-case text-[#9CA3AF]">(optional)</span></label>
            <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2}
              className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white resize-none" />
          </div>

          <TranscriptField
            transcriptLink={transcriptLink}
            onTranscriptLinkChange={setTranscriptLink}
            transcriptFileUrl={transcriptFileUrl}
            transcriptFileName={transcriptFileName}
            onTranscriptFileChange={({ url, name }) => { setTranscriptFileUrl(url); setTranscriptFileName(name); }}
          />

          <div className="flex justify-end gap-2 pt-4 border-t border-[#EBEBF5]">
            <button type="button" onClick={onClose}
              className="px-5 py-2 text-sm font-medium text-[#5777AB] border border-[#5777AB] rounded-lg hover:bg-[#EEF2F8] transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={!isValid || saving}
              className="px-5 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white rounded-lg transition-colors">
              {saving ? 'Saving…' : 'Save Entry'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}