import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const VALID_STAGES = ['New Lead', 'Contacted', 'Discovery Call', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'];

async function postReply(base44, channel, threadTs, text) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');
  await fetch('https://slack.com/api/chat.postMessage', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      channel,
      thread_ts: threadTs,
      text,
      username: 'Eventwise Pipeline',
      icon_emoji: ':rocket:',
    }),
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();

    // Slack event data is wrapped under body.data.event
    const event = body?.data?.event;
    if (!event) return Response.json({ ok: true, skipped: 'no event' });

    // Skip bot messages and non-new-message subtypes (edits, deletes, etc.)
    if (event.bot_id || event.subtype) return Response.json({ ok: true, skipped: 'bot/subtype' });

    const text = (event.text || '').trim();
    const channel = event.channel;
    const threadTs = event.thread_ts || event.ts;

    if (!text) return Response.json({ ok: true, skipped: 'empty text' });

    // 1. Invoke LLM to extract structured fields from the message
    const llmRes = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `You are extracting pipeline update information from a Slack message posted in #pipeline-updates.

Extract these fields:
- lead_name: The company or lead name being discussed (string). Required.
- stage_update: The new pipeline stage. Must be ONE of: ${VALID_STAGES.join(', ')}. If unclear or not mentioned, leave blank.
- notes: A concise summary of the update/notes from the message (string). If none, leave blank.
- next_follow_up_date: The next follow-up date in YYYY-MM-DD format. If not mentioned, leave blank.

Return as JSON. If a field isn't mentioned, use an empty string.

Message:
"""${text}"""`,
      response_json_schema: {
        type: 'object',
        properties: {
          lead_name: { type: 'string' },
          stage_update: { type: 'string' },
          notes: { type: 'string' },
          next_follow_up_date: { type: 'string' },
        },
      },
    });

    const extracted = llmRes || {};
    const leadName = (extracted.lead_name || '').trim();
    const stageUpdate = (extracted.stage_update || '').trim();
    const notes = (extracted.notes || '').trim();
    const followUpDate = (extracted.next_follow_up_date || '').trim();

    if (!leadName) {
      await postReply(base44, channel, threadTs, `⚠️ Couldn't detect a lead name in your message — please include the lead/company name.`);
      return Response.json({ ok: true, no_lead_name: true });
    }

    // 2. Fuzzy/partial match against Leads entity
    const allLeads = await base44.asServiceRole.entities.Lead.list('-updated_date', 500);
    const lower = leadName.toLowerCase();
    const matches = allLeads.filter(l => {
      const cn = (l.companyName || '').toLowerCase();
      const fn = `${l.firstName || ''} ${l.lastName || ''}`.trim().toLowerCase();
      const ct = (l.contactName || '').toLowerCase();
      if (!cn && !fn && !ct) return false;
      return (cn && (cn.includes(lower) || lower.includes(cn))) ||
             (fn && (fn.includes(lower) || lower.includes(fn))) ||
             (ct && (ct.includes(lower) || lower.includes(ct)));
    });

    if (matches.length === 0) {
      await postReply(base44, channel, threadTs, `⚠️ No matching lead found for '${leadName}' — please check manually.`);
      return Response.json({ ok: true, no_match: leadName });
    }

    // 3. Update the lead — prefer exact companyName match, else first partial match
    const exactMatch = matches.find(l => (l.companyName || '').toLowerCase() === lower);
    const lead = exactMatch || matches[0];

    // Normalize stage_update to a valid stage enum value
    let normalizedStage = stageUpdate;
    if (stageUpdate && !VALID_STAGES.includes(stageUpdate)) {
      const found = VALID_STAGES.find(s => s.toLowerCase() === stageUpdate.toLowerCase());
      normalizedStage = found || '';
    }

    const update = {};
    if (normalizedStage) update.stage = normalizedStage;
    if (followUpDate) update.followUpReminder = followUpDate;
    if (notes) {
      const ts = new Date().toISOString().split('T')[0];
      const prev = lead.notes ? `${lead.notes}\n\n` : '';
      update.notes = `${prev}[${ts} — via #pipeline-updates]\n${notes}`;
    }

    if (Object.keys(update).length > 0) {
      await base44.asServiceRole.entities.Lead.update(lead.id, update);
    }

    // 4. Reply in thread with confirmation
    const confirmLines = [`✅ Updated *${lead.companyName || leadName}*`];
    if (normalizedStage) confirmLines.push(`• stage: ${normalizedStage}`);
    if (followUpDate) confirmLines.push(`• follow-up: ${followUpDate}`);
    if (notes) confirmLines.push(`• notes: ${notes}`);
    if (Object.keys(update).length === 0) confirmLines.push(`_(no fields to update — all extracted fields were empty)_`);

    await postReply(base44, channel, threadTs, confirmLines.join('\n'));

    return Response.json({ ok: true, updated: lead.id, leadName: lead.companyName, fields: Object.keys(update), extracted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});