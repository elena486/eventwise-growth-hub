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
  const { requestedBy, recipient, title, category, priority, deadline, description, extraNotes, submittedAt } = await req.json();

  const toEmail = EMAIL_MAP[recipient];
  if (!toEmail) return Response.json({ ok: false, error: 'Unknown recipient' }, { status: 400 });

  const deadlineStr = deadline ? deadline : 'No deadline specified';
  const submittedStr = submittedAt
    ? new Date(submittedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' })
    : new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });

  const appUrl = 'https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=requests';

  let body = `You have a new request in Eventwise HQ.

From: ${requestedBy}
Title: ${title}
Category: ${category}
Priority: ${priority}
Deadline: ${deadlineStr}

Description:
${description}`;

  if (extraNotes) {
    body += `\n\nNotes: ${extraNotes}`;
  }

  body += `\n\nSubmitted: ${submittedStr}

View all requests → ${appUrl}`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: toEmail,
    subject: `New request from ${requestedBy} — ${title}`,
    body,
  });

  return Response.json({ ok: true });
});