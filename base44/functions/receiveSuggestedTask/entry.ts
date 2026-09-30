import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    // Validate shared secret
    const url = new URL(req.url);
    const key = url.searchParams.get('key');
    const expectedKey = secrets.get('SUGGESTED_TASK_WEBHOOK_SECRET');
    if (!expectedKey || key !== expectedKey) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    const source = url.searchParams.get('source') === 'slack' ? 'slack' : 'email';

    // Fetch team members for Requested By detection
    const teamMembers = await base44.asServiceRole.entities.TeamMember.list();

    let senderName, senderEmail, subject, bodyText, receivedDate, sourceLink, matchedMember;

    if (source === 'slack') {
      senderName = payload.senderName || '';
      senderEmail = '';
      subject = '';
      bodyText = payload.message || '';
      receivedDate = payload.receivedDate || new Date().toISOString();
      sourceLink = payload.sourceLink || '';
      // Match by senderName against TeamMember names
      matchedMember = teamMembers.find(m =>
        m.name && m.name.toLowerCase() === String(senderName).toLowerCase()
      );
    } else {
      // Email (default — existing behaviour)
      senderName = payload.senderName || '';
      senderEmail = payload.senderEmail || '';
      subject = payload.subject || '';
      bodyText = payload.body || '';
      receivedDate = payload.receivedDate || new Date().toISOString();
      sourceLink = payload.sourceLink || payload.sourceEmailLink || '';
      // Match by email
      matchedMember = teamMembers.find(m =>
        m.email && m.email.toLowerCase() === String(senderEmail).toLowerCase()
      );
    }

    if (!senderName && !senderEmail) {
      return Response.json({ error: 'Missing senderName or senderEmail' }, { status: 400 });
    }
    if (!bodyText && !subject) {
      return Response.json({ error: 'Missing message or subject' }, { status: 400 });
    }

    // Save raw record
    const record = await base44.asServiceRole.entities.SuggestedTask.create({
      source,
      senderName: senderName || '',
      senderEmail: senderEmail || '',
      subject: subject || '',
      body: bodyText || '',
      receivedDate,
      sourceLink: sourceLink || '',
      sourceEmailLink: sourceLink || '', // backward compat for existing email records
      status: 'Pending review',
      requestedBy: matchedMember ? matchedMember.name : '',
    });

    // Run AI classification
    const trimmedBody = String(bodyText || '').substring(0, 2000);
    const sourceLabel = source === 'slack' ? 'Slack message' : 'email';
    const fromLine = source === 'slack'
      ? `- From: ${senderName || '(unknown)'}`
      : `- From: ${senderName || '(unknown)'} <${senderEmail}>`;
    const subjectLine = subject ? `- Subject: ${subject}\n` : '';

    const aiPrompt = `You are classifying an incoming ${sourceLabel} to decide if it should become a task on a team's To-Do board for an events-finance company called Eventwise.

${source === 'slack' ? 'Slack message' : 'Email'} details:
${fromLine}
${subjectLine}- Message: ${trimmedBody}

Classify this ${sourceLabel}:
1. Is this a genuine task or request that requires someone to DO something? Or is it a newsletter, automated notification, receipt, calendar invite, delivery confirmation, reply-only message, casual chat ("hey", "got 5 min?", "thanks!"), or pure FYI with no actionable ask?
2. If it IS a task, suggest a clean task-style title (not the raw subject line — a clear, concise task title, max 80 chars).
3. If it IS a task, suggest a one-line description summarizing what needs to be done, derived from the message (max 200 chars).
4. Rate your confidence: high, medium, or low.

Rules:
- Newsletters, automated receipts, calendar notifications, delivery confirmations, casual greetings/check-ins, and pure FYI messages with no ask are NOT tasks.
- A message asking someone to review, approve, create, fix, send, schedule, or follow up on something IS a task.
- A reply that just says "thanks" or "looks good" with no new ask is NOT a task.
- If the message is clearly not a task, set isTask to false and leave title/description empty.

Return a JSON object with: isTask (boolean), confidence (high/medium/low), title (string), description (string), reasoning (string).`;

    let classification = null;
    try {
      const aiResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: aiPrompt,
        response_json_schema: {
          type: 'object',
          properties: {
            isTask: { type: 'boolean' },
            confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
            title: { type: 'string' },
            description: { type: 'string' },
            reasoning: { type: 'string' },
          },
          required: ['isTask', 'confidence', 'title', 'description', 'reasoning'],
        },
      });
      classification = typeof aiResult === 'object' && aiResult !== null ? aiResult : null;
    } catch (e) {
      // AI failed — keep in queue for manual review
      return Response.json({ status: 'pending_review', id: record.id, ai_failed: true });
    }

    // Auto-dismiss non-tasks and low-confidence items
    if (!classification || !classification.isTask || classification.confidence === 'low') {
      const reason = !classification
        ? 'AI classification failed — auto-dismissed'
        : !classification.isTask
          ? 'Not a task — auto-dismissed'
          : 'Low confidence — auto-dismissed';
      await base44.asServiceRole.entities.SuggestedTask.update(record.id, {
        status: 'Dismissed',
        aiIsTask: classification?.isTask || false,
        aiConfidence: classification?.confidence || 'low',
        aiReasoning: classification?.reasoning || '',
        suggestedTitle: classification?.title || '',
        suggestedDescription: classification?.description || '',
        dismissedReason: reason,
        reviewedDate: new Date().toISOString().split('T')[0],
      });
      return Response.json({ status: 'auto-dismissed', reason });
    }

    // Task-like with sufficient confidence — update with AI suggestions
    const fallbackTitle = subject || bodyText.substring(0, 80);
    await base44.asServiceRole.entities.SuggestedTask.update(record.id, {
      suggestedTitle: classification.title || fallbackTitle,
      suggestedDescription: classification.description || '',
      aiIsTask: true,
      aiConfidence: classification.confidence,
      aiReasoning: classification.reasoning || '',
    });

    return Response.json({ status: 'pending_review', id: record.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}