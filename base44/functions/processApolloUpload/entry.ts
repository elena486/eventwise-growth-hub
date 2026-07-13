import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SYSTEM_PROMPT = `You are an outreach analytics assistant for Eventwise, a B2B SaaS company. George runs cold email sequences via Apollo targeting event organisers and agencies in the UK.

You will be given:
1. Apollo sequence analytics data (CSV or screenshot)
2. A manually entered table of subject lines tested this week with open and reply rates
3. Optional commentary from George

Extract key metrics and produce a factual weekly summary.

RULES:
- Never give instructions or recommendations. State observations and facts only.
- Do not use phrases like 'George should', 'we recommend', 'consider', 'prioritise'
- If a metric is not available, return null
- Use exact campaign names from the data — no truncation or placeholder text
- Keep ai_observations to 2-3 factual sentences only
- Infer audience (Events/Agencies/Mixed/Suppliers) from sequence names if possible
- Extract status, touchpoint, and variant from the data if available

Return ONLY a JSON object, no preamble or markdown:
{
  "headline_numbers": {
    "emails_sent": number or null,
    "avg_open_rate": string or null,
    "avg_click_rate": string or null,
    "avg_reply_rate": string or null,
    "meetings_booked": number or null
  },
  "top_performing": [
    {
      "subject_line": string,
      "open_rate": string or null,
      "reply_rate": string or null,
      "variant": string or null,
      "observation": string (one factual sentence)
    }
  ],
  "underperforming": [
    {
      "subject_line": string,
      "open_rate": string or null,
      "reply_rate": string or null,
      "variant": string or null,
      "observation": string (one factual sentence)
    }
  ],
  "campaign_snapshot": [
    {
      "name": string,
      "audience": "Events" | "Agencies" | "Mixed" | "Suppliers" | null,
      "status": "Active" | "Paused" | "Completed" | "Killed" | null,
      "touchpoint": string or null,
      "variant": string or null,
      "emails_sent": number or null,
      "open_rate": string or null,
      "click_rate": string or null,
      "reply_rate": string or null,
      "delivery_rate": string or null,
      "meetings_booked": number or null
    }
  ],
  "ai_observations": string,
  "data_quality_note": string or null
}

Top performing = highest open rate subject lines (up to 3).
Underperforming = lowest open rate or 0% reply rate subject lines (up to 3).
If no subject lines were entered manually, set top_performing and underperforming to empty arrays.`;

function bytesToBase64(bytes) {
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const end = Math.min(i + chunkSize, bytes.length);
    binary += String.fromCharCode.apply(null, bytes.subarray(i, end));
  }
  return btoa(binary);
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { files, subjectLines, commentary } = await req.json();

    if (!files || !Array.isArray(files) || files.length === 0) {
      return Response.json({ error: 'At least one file is required' }, { status: 400 });
    }

    const contentBlocks = [];

    for (const f of files) {
      const fileRes = await fetch(f.url);
      if (!fileRes.ok) continue;
      const fileBuffer = await fileRes.arrayBuffer();
      const bytes = new Uint8Array(fileBuffer);
      const ext = (f.name || '').split('.').pop().toLowerCase();

      if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
        const base64Data = bytesToBase64(bytes);
        const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';
        contentBlocks.push({
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data }
        });
      } else if (ext === 'pdf') {
        const base64Data = bytesToBase64(bytes);
        contentBlocks.push({
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
        });
      } else if (ext === 'csv') {
        const textContent = new TextDecoder().decode(bytes);
        contentBlocks.push({ type: 'text', text: `CSV data from ${f.name}:\n${textContent}` });
      } else if (ext === 'xlsx') {
        const XLSX = await import('npm:xlsx@0.18.5');
        const workbook = XLSX.read(bytes, { type: 'array' });
        const sheetsText = workbook.SheetNames.map(name => {
          const sheet = workbook.Sheets[name];
          return `=== Sheet: ${name} ===\n${XLSX.utils.sheet_to_csv(sheet)}`;
        }).join('\n\n');
        contentBlocks.push({ type: 'text', text: `Spreadsheet data from ${f.name}:\n${sheetsText}` });
      } else {
        const textContent = new TextDecoder().decode(bytes);
        contentBlocks.push({ type: 'text', text: `Data from ${f.name}:\n${textContent}` });
      }
    }

    const validSubjectLines = (subjectLines || []).filter(s => s.subject_line && s.subject_line.trim());
    if (validSubjectLines.length > 0) {
      const slText = validSubjectLines.map((s, i) =>
        `${i + 1}. "${s.subject_line}" — Open: ${s.open_rate || 'N/A'}%, Reply: ${s.reply_rate || 'N/A'}%, Variant/Note: ${s.variant || 'N/A'}`
      ).join('\n');
      contentBlocks.push({ type: 'text', text: `Subject lines tested this week (manually entered):\n${slText}` });
    }

    if (commentary && commentary.trim()) {
      contentBlocks.push({ type: 'text', text: `George's commentary: ${commentary.trim()}` });
    }

    contentBlocks.push({ type: 'text', text: 'Analyze all the data above and return the JSON summary as specified.' });

    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY secret is not configured' }, { status: 500 });
    }

    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: contentBlocks }]
    };

    const apiRes = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(requestBody)
    });

    if (!apiRes.ok) {
      const errText = await apiRes.text();
      return Response.json(
        { error: `Anthropic API error (${apiRes.status}): ${errText.substring(0, 500)}` },
        { status: 500 }
      );
    }

    const aiResponse = await apiRes.json();
    const responseText = aiResponse.content?.[0]?.text || '';

    if (!responseText) {
      return Response.json({ error: 'Empty response from Claude' }, { status: 500 });
    }

    let summary;
    try {
      const codeBlockMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (codeBlockMatch) {
        summary = JSON.parse(codeBlockMatch[1].trim());
      } else {
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          summary = JSON.parse(jsonMatch[0]);
        } else {
          summary = JSON.parse(responseText.trim());
        }
      }
    } catch (e) {
      return Response.json(
        { error: 'Failed to parse AI response as JSON', raw: responseText.substring(0, 1000) },
        { status: 500 }
      );
    }

    return Response.json({ summary });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});