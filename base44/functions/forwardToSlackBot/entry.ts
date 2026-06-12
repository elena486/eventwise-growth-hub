import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();

    const res = await fetch('https://eventwise-slack-bot.onrender.com/webhooks/base44', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-base44-secret': 'gjoIYnyz04FRhVMfaMnAR8D0',
      },
      body: JSON.stringify(payload),
    });

    const resText = await res.text();
    console.log('Slack bot response status:', res.status);
    console.log('Slack bot response body:', resText);

    return Response.json({ ok: true, slackStatus: res.status, slackResponse: resText });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});