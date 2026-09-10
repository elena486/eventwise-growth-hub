import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const clientId = body.client_id;

    if (!clientId) {
      return Response.json({ error: 'client_id is required' }, { status: 400 });
    }

    // Fetch the client record
    const client = await base44.asServiceRole.entities.Client.get(clientId);
    if (!client) {
      return Response.json({ error: 'Client not found' }, { status: 404 });
    }

    // Try to fetch the associated deal (Trial clients may not have one yet)
    let deal = null;
    try {
      const deals = await base44.asServiceRole.entities.Deal.filter({ clientId });
      deal = deals[0] || null;
    } catch { /* no deal — that's fine for Trial clients */ }

    const monthlyValue = deal?.monthlyValue || 0;
    const annualValue = deal?.annualValue || 0;

    if (client.status === 'Trial') {
      // Trial-specific notification
      const trialMonthly = client.trial_monthly_value || 0;
      const subject = `New trial started: ${client.name || 'Unknown'} — ${client.plan || 'No plan'}`;
      const emailBody = `A new trial has been started in Customer Success.

Client: ${client.name || '—'}
Contact: ${client.contactName || '—'} — ${client.contactEmail || '—'}
Plan being trialled: ${client.plan || '—'} | Monthly value if converted: £${trialMonthly}
Trial start: ${client.trialStartDate || '—'} | Trial end: ${client.trialEndDate || '—'}
Owner: ${client.owner || '—'}

What would make them convert:
${client.what_would_make_them_convert || '—'}

Conversion risk: ${client.conversion_risk || '—'}
Business goals: ${client.business_goals || '—'}
Key pain points: ${client.key_pain_points || '—'}
Objections raised & addressed: ${client.objections_raised_addressed || '—'}
Priority tier: ${client.handover_priority_tier || '—'}
Next steps: ${client.next_steps || '—'}

View full record in Eventwise HQ → Customer Success → Clients`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'martinique@eventwise.com',
        subject: subject,
        body: emailBody,
      });
    } else {
      // Standard new client notification (Closed Won etc.)
      const subscriptionStart = deal?.subscriptionStartDate || client.trialStartDate || '—';
      const subject = `New client created: ${client.name || 'Unknown'} — ${client.plan || 'No plan'}`;
      const emailBody = `A new client record has been created in Customer Success.

Client: ${client.name || '—'}
Contact: ${client.contactName || '—'} — ${client.contactEmail || '—'}
Plan: ${client.plan || '—'} | Monthly: £${monthlyValue} | Annual: £${annualValue}
Start date: ${subscriptionStart}
Owner: ${client.owner || '—'}

Handover details:
Business goals: ${client.business_goals || '—'}
Key pain points: ${client.key_pain_points || '—'}
Priority tier: ${client.handover_priority_tier || '—'}
Next steps: ${client.next_steps || '—'}

View full record in Eventwise HQ → Customer Success → Clients`;

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: 'martinique@eventwise.com',
        subject: subject,
        body: emailBody,
      });
    }

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}