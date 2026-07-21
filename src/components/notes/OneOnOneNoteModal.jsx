import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, Loader2, Sparkles } from 'lucide-react';

const ASSIGNEES = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const DEFAULT_TEAM = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];

const SCHEMA = {
  type: 'object',
  properties: {
    summary: {
      type: 'object',
      properties: {
        key_points: { type: 'array', items: { type: 'string' } },
        decisions_made: { type: 'array', items: { type: 'string' } },
        concerns_flagged: { type: 'array', items: { type: 'string' } },
        positive_highlights: { type: 'array', items: { type: 'string' } },
      },
      required: ['key_points'],
    },
    action_items: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          task: { type: 'string' },
          assigned_to: { type: 'string' },
          category: { type: 'string' },
          priority: { type: 'string' },
          context: { type: 'string' },
        },
        required: ['task'],
      },
    },
    themes: { type: 'array', items: { type: 'string' } },
  },
  required: ['summary', 'action_items', 'themes'],
};

function resolveAssignee(name, fallback) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return ASSIGNEES.includes(fallback) ? fallback : 'Elena';
  const match = ASSIGNEES.find(a => a.toLowerCase() === n || a.toLowerCase().startsWith(n) || n.startsWith(a.toLowerCase()));
  if (match) return match;
  if (ASSIGNEES.includes(fallback)) return fallback;
  return 'Elena';
}

export default function OneOnOneNoteModal({ onClose, onSaved }) {
  const [teamMembers, setTeamMembers] = useState(DEFAULT_TEAM);
  const [teamMember, setTeamMember] = useState('');
  const [meetingDate, setMeetingDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rawNotes, setRawNotes] = useState('');
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

  const buildPrompt = (rawNotes, teamMember, priorContext) => {
    return `You are a meeting notes assistant for Elena, Head of Operations at Eventwise. She has just had a 1:1 meeting with a team member and has written free-form notes.

Your job is to:
1. Structure the notes into a clear summary
2. Extract any action items
3. Flag any recurring themes or concerns

Return ONLY a JSON object:
{
  "summary": {
    "key_points": [array of strings — main discussion points, 2-6 items],
    "decisions_made": [array of strings — any decisions or agreements reached],
    "concerns_flagged": [array of strings — any performance issues, blockers, or recurring themes worth noting. Empty array if none.],
    "positive_highlights": [array of strings — wins, good news, progress. Empty array if none.]
  },
  "action_items": [
    {
      "task": string (clear task title),
      "assigned_to": string (name of person responsible — could be Elena, the team member, or someone else mentioned in the notes),
      "category": string (one of: Marketing, Sales, Operations, Customer Success, Tech/Product, Admin, Finance, Strategy & Planning),
      "priority": string (Low/Medium/High/Urgent),
      "context": string (one sentence explaining why this task came up)
    }
  ],
  "themes": [array of strings — any recurring topics that have appeared in previous meetings with this person. Compare against prior meeting notes for this person if available. Empty array if this is the first meeting or no patterns detected.]
}

${priorContext ? `Prior meeting notes for ${teamMember} (use for themes comparison):\n${priorContext}` : 'This is the first meeting with this person.'}

Meeting notes:
"""${rawNotes}"""`;
  };

  const handleSave = async (process) => {
    if (!canSave) return;
    if (process) { setProcessing(true); } else { setSaving(true); }
    setError('');
    try {
      const note = await base44.entities.OneOnOneMeetingNote.create({
        meetingDate, teamMember, rawNotes: rawNotes.trim(), status: 'Draft',
      });

      if (!process) {
        setSaving(false);
        onSaved();
        return;
      }

      const prior = await base44.entities.OneOnOneMeetingNote.filter({ teamMember });
      const priorProcessed = prior.filter(n => n.id !== note.id && n.status === 'Processed' && n.aiSummary);
      const priorContext = priorProcessed.map(n => {
        let s = {};
        try { s = JSON.parse(n.aiSummary); } catch {}
        const pts = s.key_points || [];
        return `${format(new Date(n.meetingDate), 'd MMM yyyy')}: ${pts.join('; ')}`;
      }).join('\n');

      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(rawNotes.trim(), teamMember, priorContext),
        response_json_schema: SCHEMA,
        model: 'claude_sonnet_4_6',
      });

      const summary = res?.summary || {};
      const actionItems = Array.isArray(res?.action_items) ? res.action_items : [];
      const themes = Array.isArray(res?.themes) ? res.themes : [];

      await base44.entities.OneOnOneMeetingNote.update(note.id, {
        aiSummary: JSON.stringify(summary),
        aiActionItems: JSON.stringify(actionItems),
        themes: JSON.stringify(themes),
        status: 'Processed',
      });

      if (actionItems.length) {
        await base44.entities.PendingTaskFromNote.bulkCreate(actionItems.map(a => ({
          sourceMeetingId: note.id,
          teamMember,
          meetingDate,
          taskTitle: (a.task || 'Untitled task').trim(),
          assignedTo: resolveAssignee(a.assigned_to, teamMember),
          category: a.category || 'Other',
          priority: ['Low', 'Medium', 'High', 'Urgent'].includes(a.priority) ? a.priority : 'Medium',
          notes: a.context || '',
          status: 'Pending Review',
        })));
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
          <h2 className="text-lg font-bold text-navy dark:text-white">New 1:1 Note</h2>
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
            {processing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing with AI…</> : <><Sparkles className="w-4 h-4" /> Save &amp; Process with AI</>}
          </button>
        </div>
      </div>
    </div>
  );
}