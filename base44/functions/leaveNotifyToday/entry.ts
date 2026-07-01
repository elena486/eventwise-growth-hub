import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Find all leave entries that START today and are confirmed/approved
    const entries = await base44.asServiceRole.entities.LeaveEntry.filter({
      startDate: todayStr,
      status: { $in: ['Confirmed', 'Approved'] },
    });

    if (entries.length === 0) {
      return Response.json({ ok: true, sent: 0 });
    }

    const ALL_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'David'];

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
      const endDate = entry.endDate || '';
      const fEnd = fmtDate(endDate);
      const returnsLater = endDate > todayStr;
      const msg = returnsLater
        ? `${person} is out today and returns on ${fEnd}.`
        : `${person} is out today.`;

      for (const member of ALL_MEMBERS) {
        if (member === person) continue; // don't notify yourself
        await base44.asServiceRole.entities.Notification.create({
          recipientName: member,
          type: 'leave_today',
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