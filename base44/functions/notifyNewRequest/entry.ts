import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { requestedBy, title, category, priority, deadline, description, extraNotes, submittedAt } = await req.json();

  const deadlineStr = deadline || 'No deadline specified';
  const notesStr = extraNotes || 'None';
  const submittedStr = submittedAt ? new Date(submittedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const appUrl = 'https://app.base44.com/apps/AppShell?tab=requests';

  const body = `A new request has been submitted.

From: ${requestedBy}
Title: ${title}
Category: ${category}
Priority: ${priority}
Deadline: ${deadlineStr}

Description:
${description}

Additional notes:
${notesStr}

Submitted: ${submittedStr}

View all requests in Eventwise HQ → ${appUrl}`;

  await base44.asServiceRole.integrations.Core.SendEmail({
    to: 'elena@eventwise.com',
    subject: `New request from ${requestedBy} — ${title}`,
    body,
  });

  return Response.json({ ok: true });
});