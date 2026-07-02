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

    const record = await base44.asServiceRole.entities.DemoFormResponse.create({
      name: body.name || body['Your name'] || '',
      company: body.company || body['Company name'] || '',
      dateSubmitted: today,
      accountingPlatform: body.accountingPlatform || body['What is your accounting platform?'] || '',
      usesPOs: body.usesPOs || body['Do you use POs (Purchase Orders)?'] || '',
      ticketingPlatforms: body.ticketingPlatforms || body['Which platform(s) do you use to sell tickets?'] || '',
      ticketsSoldAnnually: body.ticketsSoldAnnually || body['How many tickets do you sell annually?'] || '',
      techForwardScore: Number(body.techForwardScore || body['How tech-forward do you feel your organisation is?'] || 0),
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