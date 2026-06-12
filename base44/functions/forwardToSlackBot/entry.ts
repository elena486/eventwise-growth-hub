import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function formatSlackMessage(payload) {
  const { event, data } = payload;
  const entityName = event.entity_name || 'Unknown';
  const eventType = event.type || 'unknown';

  const emoji = eventType === 'create' ? '🆕' : eventType === 'update' ? '✏️' : '🗑️';
  const eventLabel = eventType === 'create' ? 'created' : eventType === 'update' ? 'updated' : 'deleted';

  let name = data?.companyName || data?.name || data?.clientName || data?.title || '(unnamed)';
  let details = '';

  if (entityName === 'Lead') {
    details = `Stage: ${data?.stage || '—'} · Owner: ${data?.leadOwner || '—'}`;
  } else if (entityName === 'Client') {
    details = `Status: ${data?.status || '—'} · Owner: ${data?.owner || '—'}`;
  } else if (entityName === 'Deal') {
    details = `Plan: ${data?.plan || '—'} · £${data?.monthlyValue || 0}/mo`;
  }

  return {
    text: `${emoji} *${entityName} ${eventLabel}*: ${name}`,
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `${emoji} *${entityName} ${eventLabel}*: *${name}*${details ? '\n' + details : ''}`,
        },
      },
    ],
  };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const webhookUrl = 'https://hooks.slack.com/services/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';

    const payload = await req.json();
    const message = formatSlackMessage(payload);

    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(message),
    });

    const resText = await res.text();
    console.log('Slack webhook response:', res.status, resText);

    const ok = res.ok && resText === 'ok';
    return Response.json({ ok, slackResponse: resText });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});