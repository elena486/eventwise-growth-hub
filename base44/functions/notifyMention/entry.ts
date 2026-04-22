import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

const EMAIL_MAP = {
  Elena: 'elena@eventwise.com',
  George: 'george@eventwise.com',
  Martinique: 'martinique@eventwise.com',
  Chris: 'chris@eventwise.com',
  Ramesh: 'ramesh@eventwise.com',
  Sreeja: 'sreeja@eventwise.com',
  David: 'david@eventwise.com',
};

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  // mentionedNames: string[] of people mentioned
  // author: string — who wrote it
  // section: string — e.g. "Customer Success / Broadwick / Notes"
  // text: string — full note text
  // appUrl: string — link to the relevant section
  const { mentionedNames, author, section, text, appUrl } = await req.json();

  const link = appUrl || 'https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell';

  const results = [];
  for (const name of mentionedNames) {
    // Don't notify if they mentioned themselves
    if (name === author) continue;
    const toEmail = EMAIL_MAP[name];
    if (!toEmail) continue;

    const body = `${author} mentioned you in ${section}.

They wrote:
"${text}"

View it in Eventwise HQ → ${link}`;

    await base44.asServiceRole.integrations.Core.SendEmail({
      to: toEmail,
      subject: `You were mentioned in Eventwise HQ — ${section}`,
      body,
    });
    results.push(name);
  }

  return Response.json({ ok: true, notified: results });
});