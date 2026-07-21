import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';

const ASSIGNEES = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const VALID_CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin', 'Design', 'Content', 'Finance', 'Strategy & Planning', 'Other'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

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

export function resolveAssignee(name, fallback) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return ASSIGNEES.includes(fallback) ? fallback : 'Elena';
  const match = ASSIGNEES.find(a => a.toLowerCase() === n || a.toLowerCase().startsWith(n) || n.startsWith(a.toLowerCase()));
  if (match) return match;
  if (ASSIGNEES.includes(fallback)) return fallback;
  return 'Elena';
}

function buildPrompt(rawNotes, teamMember, priorContext) {
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
}

/**
 * Process meeting notes through Claude (claude-sonnet-4-6).
 * Validates the AI response and throws an Error if no meaningful content is returned.
 * The caller is responsible for setting status to "Failed" on the record if this throws.
 */
export async function processNoteWithAI(rawNotes, teamMember, noteId) {
  if (!rawNotes || !rawNotes.trim()) {
    throw new Error('Cannot process an empty note.');
  }

  // Fetch prior processed notes for themes comparison
  const prior = await base44.entities.OneOnOneMeetingNote.filter({ teamMember });
  const priorProcessed = prior.filter(n => n.id !== noteId && n.status === 'Processed' && n.aiSummary);
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

  // Validate the response is a real object
  if (!res || typeof res !== 'object' || Array.isArray(res)) {
    throw new Error('AI returned an invalid response. Please try again.');
  }

  const summary = res.summary && typeof res.summary === 'object' ? res.summary : {};
  const actionItems = Array.isArray(res.action_items) ? res.action_items : [];
  const themes = Array.isArray(res.themes) ? res.themes : [];

  // Confirm we got meaningful content before allowing "Processed"
  const hasSummaryContent =
    (Array.isArray(summary.key_points) && summary.key_points.length > 0) ||
    (Array.isArray(summary.decisions_made) && summary.decisions_made.length > 0) ||
    (Array.isArray(summary.concerns_flagged) && summary.concerns_flagged.length > 0) ||
    (Array.isArray(summary.positive_highlights) && summary.positive_highlights.length > 0);

  if (!hasSummaryContent && actionItems.length === 0) {
    throw new Error('AI processing returned no content. Please try again.');
  }

  return { summary, actionItems, themes };
}

/**
 * Persist AI results to the meeting note record + create pending action items.
 * Only call this after processNoteWithAI has returned valid content.
 */
export async function saveProcessedNote(noteId, teamMember, meetingDate, result) {
  const { summary, actionItems, themes } = result;

  await base44.entities.OneOnOneMeetingNote.update(noteId, {
    aiSummary: JSON.stringify(summary),
    aiActionItems: JSON.stringify(actionItems),
    themes: JSON.stringify(themes),
    status: 'Processed',
  });

  if (actionItems.length) {
    await base44.entities.PendingTaskFromNote.bulkCreate(actionItems.map(a => ({
      sourceMeetingId: noteId,
      teamMember,
      meetingDate,
      taskTitle: (a.task || 'Untitled task').trim(),
      assignedTo: resolveAssignee(a.assigned_to, teamMember),
      category: VALID_CATEGORIES.includes(a.category) ? a.category : 'Other',
      priority: VALID_PRIORITIES.includes(a.priority) ? a.priority : 'Medium',
      notes: a.context || '',
      status: 'Pending Review',
    })));
  }
}