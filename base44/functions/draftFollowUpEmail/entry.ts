import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const leadId = body.lead_id;

    if (!leadId) return Response.json({ error: 'lead_id is required' }, { status: 400 });

    // Fetch the lead
    const lead = await base44.entities.Lead.get(leadId);
    if (!lead) return Response.json({ error: 'Lead not found' }, { status: 404 });

    // Parse activity log
    let entries: any[] = [];
    try { entries = JSON.parse(lead.activityLog || '[]'); } catch {}

    if (entries.length === 0) {
      return Response.json({ error: 'NO_ACTIVITY' }, { status: 400 });
    }

    // Sort entries chronologically (oldest first)
    const sorted = [...entries].sort((a, b) => {
      const aTime = new Date(a.createdAt || a.datetime || a.date || 0).getTime();
      const bTime = new Date(b.createdAt || b.datetime || b.date || 0).getTime();
      return aTime - bTime;
    });

    // Compile activity history text
    const activityText = sorted.map((e, i) => {
      const rawDate = e.createdAt || e.datetime || e.date || '';
      let dateStr = 'Unknown date';
      if (rawDate) {
        try { dateStr = new Date(rawDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }); } catch {}
      }
      const type = e.type || 'Note';
      const summary = e.summary || e.description || e.label || '';
      const addedBy = e.addedBy || '';
      return `${i + 1}. [${dateStr}] ${type}${addedBy ? ` (${addedBy})` : ''}: ${summary}`;
    }).join('\n');

    // Include Slack activity log if present
    const slackLog = lead.slack_activity_log || '';

    // Compile deal info
    const dealInfoParts: string[] = [
      `Stage: ${lead.stage || 'New Lead'}`,
      `Probability: ${lead.probability != null ? lead.probability + '%' : 'Not set'}`,
    ];
    if (lead.dealValueMonthly) dealInfoParts.push(`Monthly value: £${lead.dealValueMonthly}`);
    if (lead.setupFee) dealInfoParts.push(`Setup fee: £${lead.setupFee}`);
    if (lead.plan) dealInfoParts.push(`Plan: ${lead.plan}`);
    const dealInfo = dealInfoParts.join('\n');

    const prompt = `You are a sales assistant helping draft a follow-up email to a pipeline lead. Read the activity history below and draft a follow-up email.

Activity history (chronological order):
${activityText}

${slackLog ? `Additional Slack pipeline updates:\n${slackLog}\n\n` : ''}Deal context:
${dealInfo}

Instructions:
- Infer from the most recent Email or Slack entry whether the lead has gone quiet (no reply), raised an objection, or responded positively.
- Match tone accordingly: a light nudge for no reply, direct address of the specific concern for an objection, a push toward next step/demo for positive engagement.
- Reference specific details from the logged notes rather than generic filler.
- Keep the email concise and professional, written as ready-to-send (no placeholders like [Name]).
- Sign off as the Eventwise team.
- Return JSON with "subject" and "body" fields. The body should be the plain text email body (no "Subject:" line, no headers).`;

    const result = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: {
          subject: { type: 'string' },
          body: { type: 'string' },
        },
        required: ['subject', 'body'],
      },
    });

    return Response.json({ subject: result.subject, body: result.body });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}