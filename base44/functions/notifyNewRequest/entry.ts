import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const { requestedBy, recipient, title, category, priority, deadline, description, extraNotes, submittedAt } = await req.json();

  const deadlineStr = deadline || 'No deadline specified';
  const notesStr = extraNotes || 'None';
  const submittedStr = submittedAt ? new Date(submittedAt).toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' }) : new Date().toLocaleString('en-GB', { dateStyle: 'long', timeStyle: 'short' });
  const appUrl = 'https://app.base44.com/apps/AppShell?tab=requests';

  const isGeorge = recipient === 'George';
  const toEmail = isGeorge ? 'george@eventwise.com' : 'elena@eventwise.com';
  const recipientName = isGeorge ? 'George' : 'Elena';

  const body = `A new request has been submitted for ${recipientName}.

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
    to: toEmail,
    subject: `New request for you from ${requestedBy} — ${title}`,
    body,
  });

  return Response.json({ ok: true });
});