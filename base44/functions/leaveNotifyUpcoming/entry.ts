import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Find entries starting in exactly 2 days
    const twoDaysFromNow = new Date();
    twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);
    const targetDateStr = twoDaysFromNow.toISOString().split('T')[0];

    const entries = await base44.asServiceRole.entities.LeaveEntry.filter({
      startDate: targetDateStr,
      status: { $in: ['Confirmed', 'Approved'] },
    });

    if (entries.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    function fmtDate(d) {
      if (!d) return d;
      try {
        const parts = d.split('-');
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
      } catch { return d; }
    }

    let sent = 0;
    for (const entry of entries) {
      const person = entry.personName || '';
      const fStart = fmtDate(entry.startDate);
      const fEnd = fmtDate(entry.endDate);
      const msg = `Reminder: ${person} is on leave from ${fStart} to ${fEnd} starting in 2 days.`;

      for (const recipient of ['Elena', 'Chris', 'Eleanor']) {
        if (recipient === person) continue;
        await base44.asServiceRole.entities.Notification.create({
          recipientName: recipient,
          type: 'leave_reminder',
          message: msg,
          isRead: false,
          navigateTo: 'leave',
          recordId: entry.id || '',
          actorName: person,
        });
        sent++;
      }
    }

    return Response.json({ ok: true, sent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});