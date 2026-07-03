import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    if (req.method !== 'POST') {
      return Response.json({ error: 'Method not allowed' }, { status: 405 });
    }

    const base44 = createClientFromRequest(req);

    let body;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const today = new Date().toISOString().split('T')[0];

    // Log incoming payload keys so Zapier field-name mismatches are visible
    console.log('zapierDemoForm body keys:', Object.keys(body));
    console.log('zapierDemoForm raw body:', JSON.stringify(body).slice(0, 1000));

    // Resolve tech-forward score from any of the known field names Zapier might use
    const rawScore = body.techForwardScore
      ?? body['How tech-forward do you feel your organisation is?']
      ?? body['How tech-forward do you feel your organization is?']
      ?? body['How tech forward do you feel your organisation is?']
      ?? body.techForward
      ?? body.tech_forward_score
      ?? null;
    // Coerce to number; null/empty → null (not 0, so unanswered stays blank)
    let techForwardScore = null;
    if (rawScore !== null && rawScore !== '' && rawScore !== undefined) {
      const n = Number(rawScore);
      techForwardScore = Number.isNaN(n) ? null : n;
    }
    console.log('zapierDemoForm resolved techForwardScore:', techForwardScore, '(raw:', rawScore, ')');

    const record = await base44.asServiceRole.entities.DemoFormResponse.create({
      name: body.name || body['Your name'] || '',
      company: body.company || body['Company name'] || '',
      dateSubmitted: today,
      accountingPlatform: body.accountingPlatform || body['What is your accounting platform?'] || '',
      usesPOs: body.usesPOs || body['Do you use POs (Purchase Orders)?'] || '',
      ticketingPlatforms: body.ticketingPlatforms || body['Which platform(s) do you use to sell tickets?'] || '',
      ticketsSoldAnnually: body.ticketsSoldAnnually || body['How many tickets do you sell annually?'] || '',
      techForwardScore,
      financeTeamDescription: body.financeTeamDescription || body['Describe your finance team'] || '',
      status: 'New',
      attachedToId: '',
      attachedToName: '',
    });

    return Response.json({ success: true, id: record.id }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});