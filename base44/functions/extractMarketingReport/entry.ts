import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const PROMPT = `You are a marketing analyst for Eventwise, a B2B SaaS company for event financial management.
You are given a marketing report document (PDF, Word, or image) from a previous month — possibly built in Looker Studio, GA4, or an older internal format. Your job is to locate and extract the following metrics and return them as a single JSON object.

Fields to extract (use empty string for month, 0 for year, and empty string for text fields if a value cannot be confidently found — never guess or estimate):
- month: the calendar month name the report covers, e.g. "February". Match any phrasing like "Feb 2026", "February 2026", "Reporting period: Feb".
- year: the year as a number, e.g. 2026.
- websiteSessions: total website sessions from GA4. Look for labels like "Sessions", "Website Sessions", "GA4 Sessions", "Total Sessions".
- chrisLIImpressions: total impressions for Chris Carter's personal LinkedIn. Look for "Chris LinkedIn", "Personal LinkedIn", "Chris Carter impressions", "Personal impressions".
- companyImpressions: total impressions for the Eventwise company LinkedIn page. Look for "Company Impressions", "Page Impressions", "Eventwise Page", "Company Page impressions".
- newsletterOpenRate: newsletter open rate as a plain number (e.g. 42.5 means 42.5%). Look for "Open Rate", "Beehiiv open rate", "Email open rate".
- narrative: any executive summary / narrative / commentary text present in the document, as a single string. Empty string if none.
- additionalMetrics: an array of objects, each { "label": string, "value": string }, for every other notable number found in the document that does NOT map to the four fields above. Examples: "New Users", "Organic Traffic", "Search Console clicks", "Top post impressions", "Engagement rate", "New followers". Capture the label exactly as shown and the value as a string. Empty array if none.

Rules:
- Only extract numbers you can read with confidence. Do not guess, estimate, or default to zero — if a stat is missing or unclear, leave the field empty / 0 / empty array as appropriate.
- For newsletterOpenRate, strip the % sign and return the numeric value only.
- Return ONLY the JSON object, no commentary.`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { file_url } = await req.json();
    if (!file_url) return Response.json({ error: 'Missing file_url' }, { status: 400 });

    const res = await base44.integrations.Core.InvokeLLM({
      prompt: PROMPT,
      file_urls: [file_url],
      model: 'claude_sonnet_4_6',
      response_json_schema: {
        type: 'object',
        properties: {
          month: { type: 'string' },
          year: { type: 'number' },
          websiteSessions: { type: 'number' },
          chrisLIImpressions: { type: 'number' },
          companyImpressions: { type: 'number' },
          newsletterOpenRate: { type: 'number' },
          narrative: { type: 'string' },
          additionalMetrics: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                label: { type: 'string' },
                value: { type: 'string' },
              },
            },
          },
        },
      },
    });

    // Normalise: ensure additionalMetrics is an array
    const extracted = { ...(res || {}) };
    if (!Array.isArray(extracted.additionalMetrics)) extracted.additionalMetrics = [];

    return Response.json({ success: true, extracted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});