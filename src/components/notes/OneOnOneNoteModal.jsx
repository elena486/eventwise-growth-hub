import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Loader2, Sparkles } from 'lucide-react';
import { processNoteWithAI } from '@/lib/oneOnOneAI';

const DEFAULT_TEAM = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];

export default function OneOnOneNoteModal({ onClose, onSaved, editNote }) {
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [teamMember, setTeamMember] = useState(editNote?.teamMember || '');
  const [meetingDate, setMeetingDate] = useState(editNote?.meetingDate || format(new Date(), 'yyyy-MM-dd'));
  const [rawNotes, setRawNotes] = useState(editNote?.rawNotes || '');
  const [saving, setSaving] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    base44.entities.TeamMember.list().then(members => {
      const names = members.map(m => m.name).filter(Boolean);
      if (names.length) {
        const merged = Array.from(new Set([...names, ...DEFAULT_TEAM]));
        setTeamMembers(merged);
      }
    }).catch(() => {});
  }, []);

  const canSave = teamMember && meetingDate && rawNotes.trim();

  const handleSave = async (process) => {
    if (!canSave) return;
    if (process) { setProcessing(true); } else { setSaving(true); }
    setError('');
    try {
      // --- Save Draft (no AI) ---
      if (!process) {
        if (editNote) {
          await base44.entities.OneOnOneMeetingNote.update(editNote.id, {
            meetingDate, teamMember, rawNotes: rawNotes.trim(),
          });
        } else {
          await base44.entities.OneOnOneMeetingNote.create({
            meetingDate, teamMember, rawNotes: rawNotes.trim(), status: 'Draft',
          });
        }
        setSaving(false);
        onSaved();
        return;
      }

      // --- Save & Process with AI ---
      let noteId = editNote?.id;
      if (!editNote) {
        const note = await base44.entities.OneOnOneMeetingNote.create({
          meetingDate, teamMember, rawNotes: rawNotes.trim(), status: 'Draft',
        });
        noteId = note.id;
      }

      try {
        await processNoteWithAI(noteId, rawNotes.trim(), teamMember, meetingDate);
      } catch (aiErr) {
        await base44.entities.OneOnOneMeetingNote.update(noteId, { status: 'Failed' });
        throw aiErr;
      }

      setProcessing(false);
      onSaved();
    } catch (e) {
      setError(e.message || 'Something went wrong');
      setProcessing(false);
      setSaving(false);
    }
  };

  const inp = 'w-full border border-ew-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-[#1E1E2E] rounded-2xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border dark:border-gray-700 sticky top-0 bg-white dark:bg-[#1E1E2E]">
          <h2 className="text-lg font-bold text-navy dark:text-white">{editNote ? 'Edit 1:1 Note' : 'New 1:1 Note'}</h2>
          <button onClick={onClose} className="text-ew-muted hover:text-navy dark:hover:text-white transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-ew-muted dark:text-gray-400 mb-1">Team member *</label>
              <select className={inp} value={teamMember} onChange={e => setTeamMember(e.target.value)}>
                <option value="">Select person…</option>
                {teamMembers.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-ew-muted dark:text-gray-400 mb-1">Meeting date *</label>
              <input type="date" className={inp} value={meetingDate} onChange={e => setMeetingDate(e.target.value)} />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-ew-muted dark:text-gray-400 mb-1">Notes *</label>
            <textarea
              rows={10}
              className="w-full border border-ew-border rounded-lg px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 dark:bg-[#2A2A3E] dark:text-white dark:border-gray-600"
              placeholder="Type or paste your meeting notes here..."
              value={rawNotes}
              onChange={e => setRawNotes(e.target.value)}
            />
          </div>
          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>

        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t border-ew-border dark:border-gray-700 sticky bottom-0 bg-white dark:bg-[#1E1E2E]">
          <button
            onClick={() => handleSave(false)}
            disabled={saving || processing || !canSave}
            className="px-4 py-2.5 rounded-lg text-sm font-medium border border-ew-border text-ew-body dark:text-gray-300 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors disabled:opacity-50"
          >
            Save Draft
          </button>
          <button
            onClick={() => handleSave(true)}
            disabled={saving || processing || !canSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-bold text-white bg-[#8403C5] hover:bg-[#7002A8] transition-colors disabled:opacity-50"
          >
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing with AI…</> : <><Sparkles className="w-4 h-4" /> {editNote ? 'Save & Re-process with AI' : 'Save & Process with AI'}</>}
          </button>
        </div>
      </div>
    </div>
  );
}