import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();

    await fetch('https://eventwise-slack-bot.onrender.com/webhooks/base44', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-base44-secret': 'gjoIYnyz04FRhVMfaMnAR8D0',
      },
      body: JSON.stringify(payload),
    });

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});