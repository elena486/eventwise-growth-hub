import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Optional dry-run flag (used by test invocation to avoid spamming the team)
    let dryRun = false;
    try {
      const body = await req.json();
      if (body && body.dryRun === true) dryRun = true;
    } catch { /* no body — normal scheduled invocation */ }

    // ── Pull recipients dynamically from the Users table ──
    // Send to every app user EXCEPT the external VA.
    const EXCLUDE_EMAILS = ['monnie@intheloopva.com'];
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 100);
    const recipients = allUsers.filter(
      (u) => u.email && !EXCLUDE_EMAILS.includes(u.email.toLowerCase())
    );

    if (recipients.length === 0) {
      return Response.json({ ok: true, sent: 0, reason: 'no_recipients' });
    }

    // ── Determine the current week (Mon–Sun) ──
    const now = new Date();
    const dayIdx = now.getDay(); // 0=Sun ... 6=Sat
    const monday = new Date(now);
    monday.setDate(now.getDate() - ((dayIdx + 6) % 7));
    monday.setHours(0, 0, 0, 0);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    const isoDate = (d) => d.toISOString().split('T')[0];
    const weekStartStr = isoDate(monday);
    const weekEndStr = isoDate(sunday);

    // ── Query leave entries overlapping this week ──
    // Entry overlaps the week when startDate <= weekEnd AND endDate >= weekStart
    const entries = await base44.asServiceRole.entities.LeaveEntry.filter({
      status: { $in: ['Confirmed', 'Approved'] },
      startDate: { $lte: weekEndStr },
      endDate: { $gte: weekStartStr },
    });

    const fmtDate = (d) => {
      if (!d) return '';
      try {
        const parts = d.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
      } catch { return d; }
    };

    entries.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const subject = `Eventwise — Leave digest for week of ${fmtDate(weekStartStr)}`;

    let body;
    if (entries.length === 0) {
      body =
        `<p>Hi,</p>` +
        `<p>No team members are on leave this week (week of <strong>${fmtDate(weekStartStr)}</strong>).</p>` +
        `<p>Have a great week!<br>Eventwise</p>`;
    } else {
      const rows = entries
        .map((e) => {
          const person = e.personName || '—';
          const start = fmtDate(e.startDate);
          const end = fmtDate(e.endDate);
          const type = e.type || 'Leave';
          const dates = start === end ? start : `${start} – ${end}`;
          return (
            `<tr>` +
            `<td style="padding:6px 12px;font-weight:600;">${person}</td>` +
            `<td style="padding:6px 12px;">${dates}</td>` +
            `<td style="padding:6px 12px;">${type}</td>` +
            `</tr>`
          );
        })
        .join('');
      body =
        `<p>Hi,</p>` +
        `<p>Here's the leave summary for the week of <strong>${fmtDate(weekStartStr)}</strong>:</p>` +
        `<table style="border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;">` +
        `<thead><tr style="background:#F6F6FB;">` +
        `<th style="padding:6px 12px;text-align:left;">Team member</th>` +
        `<th style="padding:6px 12px;text-align:left;">Dates</th>` +
        `<th style="padding:6px 12px;text-align:left;">Type</th>` +
        `</tr></thead>` +
        `<tbody>${rows}</tbody>` +
        `</table>` +
        `<p style="margin-top:16px;">Have a great week!<br>Eventwise</p>`;
    }

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        recipients: recipients.map((r) => ({ name: r.full_name, email: r.email })),
        recipientCount: recipients.length,
        entries: entries.map((e) => ({ person: e.personName, start: e.startDate, end: e.endDate, type: e.type, status: e.status })),
        entryCount: entries.length,
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        subject,
      });
    }

    let sent = 0;
    for (const r of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: r.email,
        subject,
        body,
        from_name: 'Eventwise Leave',
      });
      sent++;
    }

    return Response.json({
      ok: true,
      sent,
      recipients: recipients.map((r) => r.email),
      entryCount: entries.length,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});