import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

const PROMPTS = {
  website: `You are reading a Google Analytics 4 dashboard screenshot. Extract every visible number and return ONLY a JSON object with these exact keys (use null for any not visible): active_users, sessions, new_users, engaged_sessions_pct, avg_engagement_time_seconds, top_traffic_source, organic_search_sessions, gsc_impressions, gsc_clicks, gsc_avg_position. After the JSON on a new line write NARRATIVE: followed by a 2-3 sentence plain English summary of what the numbers mean for the Eventwise website — what went well, what needs attention, one focus for next month.`,
  chrisLI: `You are reading a LinkedIn personal analytics screenshot for Chris Carter. Extract every visible number and return ONLY a JSON object with these exact keys (use null for any not visible): impressions, unique_reach, reactions, comments, reposts, new_connections, profile_views, post_count. After the JSON on a new line write NARRATIVE: followed by a 2-3 sentence summary of LinkedIn performance this month.`,
  company: `You are reading a LinkedIn company page analytics screenshot for Eventwise. Extract every visible number and return ONLY a JSON object with these exact keys (use null for any not visible): page_impressions, new_followers, total_followers, reactions, clicks, engagement_rate. After the JSON on a new line write NARRATIVE: followed by a 2-3 sentence summary.`,
  newsletter: `You are reading a Beehiiv email newsletter analytics screenshot. Extract every visible number and return ONLY a JSON object with these exact keys (use null for any not visible): open_rate, click_rate, total_subscribers, new_subscribers, unsubscribes, emails_sent. After the JSON on a new line write NARRATIVE: followed by a 2-3 sentence summary.`,
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { platform, images } = await req.json();
    // images: array of { base64: string, media_type: string }

    if (!platform || !images || images.length === 0) {
      return Response.json({ error: 'Missing platform or images' }, { status: 400 });
    }

    const prompt = PROMPTS[platform];
    if (!prompt) return Response.json({ error: 'Unknown platform' }, { status: 400 });

    // Build content array: one image block per screenshot, then the text prompt
    const content = [
      ...images.map(img => ({
        type: 'image',
        source: {
          type: 'base64',
          media_type: img.media_type,
          data: img.base64,
        },
      })),
      { type: 'text', text: prompt },
    ];

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': Deno.env.get('ANTHROPIC_API_KEY'),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-opus-4-6',
        max_tokens: 1000,
        messages: [{ role: 'user', content }],
      }),
    });

    if (!response.ok) {
      const err = await response.text();
      return Response.json({ error: `Claude API error: ${err}` }, { status: 500 });
    }

    const data = await response.json();
    const rawText = data.content[0].text;

    // Split at NARRATIVE:
    const narrativeSplit = rawText.split(/NARRATIVE:/i);
    const jsonPart = narrativeSplit[0].trim();
    const narrative = narrativeSplit[1]?.trim() || '';

    // Parse JSON — try to extract from code fences first, then raw
    let extracted;
    try {
      const fenceMatch = jsonPart.match(/```(?:json)?\s*([\s\S]*?)```/);
      const clean = fenceMatch ? fenceMatch[1].trim() : jsonPart.replace(/```json?\n?/g, '').replace(/```/g, '').trim();
      extracted = JSON.parse(clean);
    } catch {
      // Try extracting first { ... } block from the full rawText
      try {
        const jsonMatch = rawText.match(/\{[\s\S]*?\}/);
        if (jsonMatch) extracted = JSON.parse(jsonMatch[0]);
        else return Response.json({ success: false, rawText, narrative });
      } catch {
        return Response.json({ success: false, rawText, narrative });
      }
    }

    return Response.json({ success: true, extracted, narrative });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});