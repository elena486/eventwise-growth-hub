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
    const entries = await base44.asServiceRole.entities.LeaveEntry.filter({
      status: { $in: ['Confirmed', 'Approved'] },
      startDate: { $lte: weekEndStr },
      endDate: { $gte: weekStartStr },
    });

    // ── Query working availability for this week + required team members ──
    const [availability, teamMembers] = await Promise.all([
      base44.asServiceRole.entities.WeeklyAvailability.filter({ weekCommencing: weekStartStr }),
      base44.asServiceRole.entities.TeamMember.list(),
    ]);
    const requiredNames = teamMembers
      .filter((m) => m.availabilityRequired)
      .map((m) => m.name);
    const loggedNames = [...new Set(availability.map((a) => a.personName).filter(Boolean))];
    const workingNames = [...new Set([...loggedNames, ...requiredNames])].sort();
    const getAvail = (name) => availability.find((a) => a.personName === name);

    const fmtDate = (d) => {
      if (!d) return '';
      try {
        const parts = d.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
      } catch { return d; }
    };
    const fmtDateFull = (d) => {
      if (!d) return '';
      try {
        const parts = d.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]} ${parts[0]}`;
      } catch { return d; }
    };

    const DAY_KEYS = ['monday','tuesday','wednesday','thursday','friday'];
    const DAY_LABELS = ['Mon','Tue','Wed','Thu','Fri'];
    const fmtDayLine = (a) => {
      return DAY_KEYS.map((k, i) => {
        if (a[k]) {
          const hours = a[`${k}Hours`];
          return hours ? `${DAY_LABELS[i]} ✓ (${hours})` : `${DAY_LABELS[i]} ✓`;
        }
        return `${DAY_LABELS[i]} –`;
      }).join(' · ');
    };

    entries.sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));

    const subject = `Team Availability This Week — ${fmtDateFull(weekStartStr)}`;

    // ── Build ON LEAVE section ──
    let leaveSection;
    if (entries.length === 0) {
      leaveSection = `<p>No one on leave this week.</p>`;
    } else {
      const leaveRows = entries
        .map((e) => {
          const person = e.personName || '—';
          const type = e.type || 'Leave';
          const start = fmtDate(e.startDate);
          const end = fmtDate(e.endDate);
          const dates = start === end ? start : `${start} to ${end}`;
          return `<tr>` +
            `<td style="padding:6px 12px;font-weight:600;">${person}</td>` +
            `<td style="padding:6px 12px;">${type}</td>` +
            `<td style="padding:6px 12px;">${dates}</td>` +
            `</tr>`;
        })
        .join('');
      leaveSection =
        `<table style="border-collapse:collapse;font-size:14px;font-family:Arial,sans-serif;">` +
        `<thead><tr style="background:#F6F6FB;">` +
        `<th style="padding:6px 12px;text-align:left;">Name</th>` +
        `<th style="padding:6px 12px;text-align:left;">Type</th>` +
        `<th style="padding:6px 12px;text-align:left;">Dates</th>` +
        `</tr></thead>` +
        `<tbody>${leaveRows}</tbody>` +
        `</table>`;
    }

    // ── Build WORKING AVAILABILITY section ──
    let workingSection;
    if (workingNames.length === 0) {
      workingSection = `<p>No working availability logged this week.</p>`;
    } else {
      const workingRows = workingNames
        .map((name) => {
          const a = getAvail(name);
          const line = a
            ? fmtDayLine(a)
            : 'Not yet submitted for this week';
          const style = a ? '' : 'color:#A16207;font-style:italic;';
          return `<p style="margin:4px 0;${style}"><strong>${name}</strong> — ${line}</p>`;
        })
        .join('');
      workingSection = workingRows;
    }

    const body =
      `<p>Hi team,</p>` +
      `<p>Here's a quick overview of team availability this week.</p>` +
      `<h3 style="margin-top:20px;color:#242450;">ON LEAVE</h3>` +
      leaveSection +
      `<h3 style="margin-top:24px;color:#242450;">WORKING AVAILABILITY</h3>` +
      workingSection +
      `<p style="margin-top:20px;">Have a great week,<br>Eventwise HQ</p>`;

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        recipients: recipients.map((r) => ({ name: r.full_name, email: r.email })),
        recipientCount: recipients.length,
        leaveEntries: entries.map((e) => ({ person: e.personName, start: e.startDate, end: e.endDate, type: e.type, status: e.status })),
        leaveCount: entries.length,
        workingNames,
        availability: availability.map((a) => ({ personName: a.personName, weekCommencing: a.weekCommencing })),
        weekStart: weekStartStr,
        weekEnd: weekEndStr,
        subject,
        bodyPreview: body.substring(0, 500),
      });
    }

    let sent = 0;
    for (const r of recipients) {
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: r.email,
        subject,
        body,
        from_name: 'Eventwise HQ',
      });
      sent++;
    }

    return Response.json({
      ok: true,
      sent,
      recipients: recipients.map((r) => r.email),
      leaveCount: entries.length,
      workingCount: workingNames.length,
      weekStart: weekStartStr,
      weekEnd: weekEndStr,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});