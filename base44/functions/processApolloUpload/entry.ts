import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const SYSTEM_PROMPT = `You are an outreach analytics assistant for Eventwise, a B2B SaaS company. Eventwise's sales rep George runs cold email sequences via Apollo targeting event organisers and agencies in the UK.

You will be given Apollo sequence analytics data (as a CSV, spreadsheet, PDF or screenshot). Extract the key metrics and produce a clean plain-English weekly summary.

Return ONLY a JSON object with exactly these fields, no preamble or markdown:
{
  "headline_numbers": {
    "emails_sent": number or null,
    "avg_open_rate": string e.g. "52.3%" or null,
    "avg_click_rate": string or null,
    "avg_reply_rate": string or null,
    "meetings_booked": number or null
  },
  "top_performing": [
    {
      "subject_line": string,
      "campaign": string,
      "open_rate": string,
      "click_rate": string,
      "reply_rate": string,
      "why": string (one sentence plain English)
    }
  ],
  "underperforming": [
    {
      "subject_line": string,
      "campaign": string,
      "issue": string (one sentence plain English)
    }
  ],
  "campaign_snapshot": [
    {
      "name": string,
      "status": string,
      "emails_sent": number,
      "open_rate": string
    }
  ],
  "ai_observations": string (2-3 sentences plain English — patterns, what is working, what to change next week),
  "data_quality_note": string or null
}`;

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

    const { fileUrl, fileName } = await req.json();

    if (!fileUrl || !fileName) {
      return Response.json({ error: 'fileUrl and fileName are required' }, { status: 400 });
    }

    // 1. Fetch the uploaded file
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      return Response.json({ error: `Failed to fetch file: ${fileRes.status}` }, { status: 500 });
    }
    const fileBuffer = await fileRes.arrayBuffer();
    const bytes = new Uint8Array(fileBuffer);

    // 2. Determine file type and build message content
    const ext = (fileName || '').split('.').pop().toLowerCase();
    let userContent;

    if (ext === 'png' || ext === 'jpg' || ext === 'jpeg') {
      // Image screenshot — base64 encode and send as image
      const base64Data = bytesToBase64(bytes);
      const mediaType = ext === 'png' ? 'image/png' : 'image/jpeg';
      userContent = [
        {
          type: 'image',
          source: { type: 'base64', media_type: mediaType, data: base64Data }
        },
        {
          type: 'text',
          text: 'Analyze the Apollo analytics data shown in this image and return the JSON summary.'
        }
      ];
    } else if (ext === 'pdf') {
      // PDF — base64 encode and send as document
      const base64Data = bytesToBase64(bytes);
      userContent = [
        {
          type: 'document',
          source: { type: 'base64', media_type: 'application/pdf', data: base64Data }
        },
        {
          type: 'text',
          text: 'Analyze the Apollo analytics data in this PDF and return the JSON summary.'
        }
      ];
    } else if (ext === 'csv') {
      // CSV — extract text and send as plain text
      const textContent = new TextDecoder().decode(bytes);
      userContent = 'Here is the Apollo analytics data:\n\n' + textContent;
    } else if (ext === 'xlsx') {
      // XLSX — parse with SheetJS and convert to CSV text
      const XLSX = await import('npm:xlsx@0.18.5');
      const workbook = XLSX.read(bytes, { type: 'array' });
      const sheetsText = workbook.SheetNames.map(name => {
        const sheet = workbook.Sheets[name];
        const csv = XLSX.utils.sheet_to_csv(sheet);
        return `=== Sheet: ${name} ===\n${csv}`;
      }).join('\n\n');
      userContent = 'Here is the Apollo analytics data:\n\n' + sheetsText;
    } else {
      // Fallback — decode as text
      const textContent = new TextDecoder().decode(bytes);
      userContent = 'Here is the Apollo analytics data:\n\n' + textContent;
    }

    // 3. Build Anthropic API request
    const requestBody = {
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [{
        role: 'user',
        content: userContent
      }]
    };

    // 4. Call Anthropic API
    const apiKey = Deno.env.get('ANTHROPIC_API_KEY');
    if (!apiKey) {
      return Response.json({ error: 'ANTHROPIC_API_KEY secret is not configured' }, { status: 500 });
    }

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

    // 5. Parse JSON from response (handle markdown code blocks)
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