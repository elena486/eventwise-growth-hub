import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Paginate through all channels and find the marketing channel by name.
async function findMarketingChannel(accessToken) {
  let cursor;
  do {
    const url = new URL('https://slack.com/api/conversations.list');
    url.searchParams.set('types', 'public_channel,private_channel');
    url.searchParams.set('limit', '200');
    if (cursor) url.searchParams.set('cursor', cursor);
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    const json = await res.json();
    if (!json.ok) throw new Error(`conversations.list failed: ${json.error}`);
    for (const ch of json.channels || []) {
      if (ch.is_archived) continue;
      if (/marketing/i.test(ch.name)) return ch.id;
    }
    cursor = json.response_metadata?.next_cursor;
  } while (cursor);
  return null;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('slackbot');

    // Safe verification mode: list channels without posting.
    if (body.dryRun) {
      let cursor;
      const names = [];
      do {
        const url = new URL('https://slack.com/api/conversations.list');
        url.searchParams.set('types', 'public_channel,private_channel');
        url.searchParams.set('limit', '200');
        if (cursor) url.searchParams.set('cursor', cursor);
        const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
        const json = await res.json();
        if (!json.ok) return Response.json({ ok: false, error: json.error }, { status: 502 });
        for (const ch of json.channels || []) names.push({ id: ch.id, name: ch.name, is_archived: ch.is_archived });
        cursor = json.response_metadata?.next_cursor;
      } while (cursor);
      const match = names.find(c => /marketing/i.test(c.name) && !c.is_archived);
      return Response.json({ ok: true, match, channels: names });
    }

    // Entity automation payload: { data: <ContentItem>, old_data: <prev ContentItem> (update only) }
    const item = body.data || {};
    const { platform, publishedUrl, status } = item;
    const prevStatus = body.old_data?.status;

    // Only notify when the post transitions TO Published.
    //  - Create: notify only if status is already 'Published'
    //  - Update: notify only if it was NOT 'Published' before and is now 'Published'
    //    (editing an already-published post does not re-notify)
    if (status !== 'Published') {
      return Response.json({ ok: true, skipped: true, reason: `status is '${status || '—'}', not 'Published'` });
    }
    if (prevStatus === 'Published') {
      return Response.json({ ok: true, skipped: true, reason: 'already published — no transition' });
    }

    const channelId = await findMarketingChannel(accessToken);
    if (!channelId) return Response.json({ ok: false, error: 'Marketing channel not found' }, { status: 404 });

    const text = `🚀 New post is live: ${platform || '—'}. Go like, comment, and share within the first hour: ${publishedUrl || ''}`.trim();

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        channel: channelId,
        text,
        username: 'Eventwise Marketing',
        icon_emoji: ':rocket:',
      }),
    });
    const json = await res.json();
    if (!json.ok) return Response.json({ ok: false, error: json.error }, { status: 502 });
    return Response.json({ ok: true, channel: channelId });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
});