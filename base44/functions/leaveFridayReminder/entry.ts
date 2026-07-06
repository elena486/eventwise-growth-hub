import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let dryRun = false;
    try {
      const body = await req.json();
      if (body && body.dryRun === true) dryRun = true;
    } catch { /* no body — normal scheduled invocation */ }

    // ── Compute next Monday (the week they need to log availability for) ──
    const now = new Date();
    const dayIdx = now.getDay(); // 0=Sun ... 6=Sat
    // Days until next Monday: if today is Monday (1), next Monday is +7; else (8 - dayIdx) % 7
    const daysUntilMonday = dayIdx === 1 ? 7 : (8 - dayIdx) % 7;
    const nextMonday = new Date(now);
    nextMonday.setDate(now.getDate() + daysUntilMonday);
    nextMonday.setHours(0, 0, 0, 0);
    const weekCommencing = nextMonday.toISOString().split('T')[0];

    // ── Team members required to log availability ──
    const teamMembers = await base44.asServiceRole.entities.TeamMember.filter({ availabilityRequired: true });

    // ── Users (to resolve email by first name) ──
    const allUsers = await base44.asServiceRole.entities.User.list('-created_date', 100);

    const results = [];

    for (const member of teamMembers) {
      // Has this person already submitted availability for next week?
      const existing = await base44.asServiceRole.entities.WeeklyAvailability.filter({
        personName: member.name,
        weekCommencing,
      });
      if (existing.length > 0) continue; // already submitted — skip

      // Resolve the user's email
      const matchedUser = allUsers.find(
        (u) => (u.full_name || '').split(' ')[0] === member.name
      );
      const email = matchedUser?.email;

      // ── Bell notification ──
      await base44.asServiceRole.entities.Notification.create({
        recipientName: member.name,
        type: 'mention',
        message: 'Reminder: please log your availability for next week by end of day today.',
        navigateTo: 'leave',
        actorName: 'Eventwise HQ',
        isRead: false,
      });

      // ── Email ──
      if (email) {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Reminder: log your availability for next week',
          body:
            `<p>Hi ${member.name},</p>` +
            `<p>This is a quick reminder to log your availability for next week (commencing <strong>${weekCommencing}</strong>) by end of day today.</p>` +
            `<p>Please go to <strong>Leave → My Availability</strong> in the Eventwise Hub.</p>` +
            `<p>Thanks!<br>Eventwise HQ</p>`,
          from_name: 'Eventwise HQ',
        });
      }

      results.push({ name: member.name, email: email || 'no_email_on_file' });
    }

    if (dryRun) {
      return Response.json({
        ok: true,
        dryRun: true,
        weekCommencing,
        requiredCount: teamMembers.length,
        reminded: results,
      });
    }

    return Response.json({
      ok: true,
      weekCommencing,
      sent: results.length,
      reminded: results,
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});