import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const ASSIGNEES = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];
const VALID_CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin', 'Design', 'Content', 'Finance', 'Strategy & Planning', 'Other'];
const VALID_PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

function resolveAssignee(name, fallback) {
  const n = (name || '').trim().toLowerCase();
  if (!n) return ASSIGNEES.includes(fallback) ? fallback : 'Elena';
  const match = ASSIGNEES.find(a => a.toLowerCase() === n || a.toLowerCase().startsWith(n) || n.startsWith(a.toLowerCase()));
  if (match) return match;
  if (ASSIGNEES.includes(fallback)) return fallback;
  return 'Elena';
}

function formatDate(dateStr) {
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
}

const SYSTEM_PROMPT = `You are a meeting notes assistant for Elena, Head of Operations at Eventwise. She has just had a 1:1 meeting with a team member and has written free-form notes.

Your job is to:
1. Structure the notes into a clear summary
2. Extract any action items
3. Flag any recurring themes or concerns

Return ONLY a valid JSON object (no markdown fences, no preamble, no commentary) with this exact structure:
{
  "summary": {
    "key_points": [array of strings — main discussion points, 2-6 items],
    "decisions_made": [array of strings — any decisions or agreements reached],
    "concerns_flagged": [array of strings — any performance issues, blockers, or recurring themes worth noting. Empty array if none.],
    "positive_highlights": [array of strings — wins, good news, progress. Empty array if none.]
  },
  "action_items": [
    {
      "task": "clear task title",
      "assigned_to": "name of person responsible — could be Elena, the team member, or someone else mentioned",
      "category": "one of: Marketing, Sales, Operations, Customer Success, Tech/Product, Admin, Finance, Strategy & Planning",
      "priority": "Low or Medium or High or Urgent",
      "context": "one sentence explaining why this task came up"
    }
  ],
  "themes": [array of strings — recurring topics from prior meetings. Empty array if first meeting or no patterns detected.]
}

If there are no action items, return an empty array. If there are no concerns or highlights, return empty arrays. Always include all four summary sub-arrays even if some are empty.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { noteId, rawNotes, teamMember, meetingDate } = body;

    if (!noteId || !rawNotes || !rawNotes.trim() || !teamMember) {
      return Response.json({ error: 'Missing required fields: noteId, rawNotes, teamMember' }, { status: 400 });
    }

    // Fetch prior processed notes for themes comparison (service role — admin operation)
    const prior = await base44.asServiceRole.entities.OneOnOneMeetingNote.filter({ teamMember });
    const priorProcessed = prior.filter(n => n.id !== noteId && n.status === 'Processed' && n.aiSummary);
    const priorContext = priorProcessed.map(n => {
      let s = {};
      try { s = JSON.parse(n.aiSummary); } catch {}
      const pts = s.key_points || [];
      return `${formatDate(n.meetingDate)}: ${pts.join('; ')}`;
    }).join('\n');

    const userMessage = `${priorContext ? `Prior meeting notes for ${teamMember} (use for themes comparison):\n${priorContext}\n\n` : 'This is the first meeting with this person.\n\n'}Meeting notes:\n"""${rawNotes.trim()}"""`;

    // Call Anthropic API directly
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      console.error('ANTHROPIC_API_KEY not set');
      return Response.json({ error: 'Anthropic API key not configured. Contact your admin.' }, { status: 500 });
    }

    const apiResponse = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!apiResponse.ok) {
      const errText = await apiResponse.text();
      console.error('Anthropic API error:', apiResponse.status, errText);
      let errMessage = `Claude API error (${apiResponse.status})`;
      try {
        const errJson = JSON.parse(errText);
        if (errJson.error?.message) errMessage = errJson.error.message;
      } catch {}
      return Response.json({ error: errMessage }, { status: 502 });
    }

    const apiData = await apiResponse.json();
    const textContent = apiData?.content?.[0]?.text;

    if (!textContent) {
      console.error('Anthropic returned no text content:', JSON.stringify(apiData));
      return Response.json({ error: 'AI returned no content. Please try again.' }, { status: 502 });
    }

    // Parse JSON — extract the JSON object robustly (handle markdown fences + commentary)
    let parsed;
    let jsonStr = textContent.trim();
    // Strip markdown code fences if present
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
    }
    // Extract from first { to last } in case Claude added preamble/commentary
    const firstBrace = jsonStr.indexOf('{');
    const lastBrace = jsonStr.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      jsonStr = jsonStr.substring(firstBrace, lastBrace + 1);
    }
    try {
      parsed = JSON.parse(jsonStr);
    } catch (parseErr) {
      console.error('JSON parse failed. Raw Claude response (first 500 chars):', textContent.substring(0, 500));
      return Response.json({ error: 'AI returned a response but it couldn\'t be read. Please try again.' }, { status: 502 });
    }

    const summary = parsed.summary && typeof parsed.summary === 'object' ? parsed.summary : {};
    const actionItems = Array.isArray(parsed.action_items) ? parsed.action_items : [];
    const themes = Array.isArray(parsed.themes) ? parsed.themes : [];

    // Validate meaningful content exists
    const hasSummaryContent =
      (Array.isArray(summary.key_points) && summary.key_points.length > 0) ||
      (Array.isArray(summary.decisions_made) && summary.decisions_made.length > 0) ||
      (Array.isArray(summary.concerns_flagged) && summary.concerns_flagged.length > 0) ||
      (Array.isArray(summary.positive_highlights) && summary.positive_highlights.length > 0);

    if (!hasSummaryContent && actionItems.length === 0) {
      console.error('AI returned empty content. Parsed:', JSON.stringify(parsed));
      return Response.json({ error: 'AI processing returned no content. Please try again.' }, { status: 502 });
    }

    // Save raw notes + AI results to the meeting record
    await base44.asServiceRole.entities.OneOnOneMeetingNote.update(noteId, {
      rawNotes: rawNotes.trim(),
      teamMember,
      meetingDate: meetingDate || undefined,
      aiSummary: JSON.stringify(summary),
      aiActionItems: JSON.stringify(actionItems),
      themes: JSON.stringify(themes),
      status: 'Processed',
    });

    // Remove existing unreviewed pending tasks (keep approved/board ones) then create fresh ones
    await base44.asServiceRole.entities.PendingTaskFromNote.deleteMany({
      sourceMeetingId: noteId,
      status: 'Pending Review',
    });

    if (actionItems.length) {
      await base44.asServiceRole.entities.PendingTaskFromNote.bulkCreate(actionItems.map(a => ({
        sourceMeetingId: noteId,
        teamMember,
        meetingDate: meetingDate || undefined,
        taskTitle: (a.task || 'Untitled task').trim(),
        assignedTo: resolveAssignee(a.assigned_to, teamMember),
        category: VALID_CATEGORIES.includes(a.category) ? a.category : 'Other',
        priority: VALID_PRIORITIES.includes(a.priority) ? a.priority : 'Medium',
        notes: a.context || '',
        status: 'Pending Review',
      })));
    }

    return Response.json({ success: true, summary, actionItems, themes });
  } catch (error) {
    console.error('processOneOnOneNote error:', error);
    return Response.json({ error: error.message || 'Something went wrong' }, { status: 500 });
  }
});