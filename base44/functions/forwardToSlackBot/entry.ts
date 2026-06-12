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

    const botToken = Deno.env.get('SLACK_BOT_TOKEN');
    if (!botToken) return Response.json({ error: 'SLACK_BOT_TOKEN not set' }, { status: 500 });

    const payload = await req.json();
    const message = formatSlackMessage(payload);

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${botToken}`,
      },
      body: JSON.stringify({
        channel: '#crm-updates',
        ...message,
      }),
    });

    const resData = await res.json();
    console.log('Slack API response:', JSON.stringify(resData));

    return Response.json({ ok: resData.ok, slackResponse: resData });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});