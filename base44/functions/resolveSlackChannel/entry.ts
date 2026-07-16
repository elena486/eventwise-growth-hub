import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const targetName = (body.channelName || 'pipeline-updates').replace(/^#/, '');

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    let channels = [];
    let cursor = '';
    for (let i = 0; i < 20; i++) {
      const url = new URL('https://slack.com/api/conversations.list');
      url.searchParams.set('limit', '200');
      url.searchParams.set('types', 'public_channel,private_channel');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${accessToken}` },
      });
      const data = await res.json();
      if (!data.ok) return Response.json({ error: data.error }, { status: 500 });
      channels = channels.concat(data.channels || []);
      if (!data.response_metadata?.next_cursor) break;
      cursor = data.response_metadata.next_cursor;
    }

    const target = channels.find(c => c.name === targetName);
    return Response.json({
      found: !!target,
      channelId: target?.id,
      channelName: target?.name,
      searchedFor: targetName,
      totalChannels: channels.length,
      sampleChannels: channels.slice(0, 30).map(c => ({ id: c.id, name: c.name })),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});