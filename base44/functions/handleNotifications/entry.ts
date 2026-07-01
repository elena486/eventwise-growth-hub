import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// CS owners notified for time entries logged against clients
const CS_OWNERS = { 'Martinique': 'Martinique', 'Chris': 'Chris' };
const ALL_CLIENTS_NOTIFYEE = 'Martinique'; // default CS notifyee

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const payload = await req.json();
    const { event, data, old_data } = payload;
    const entityName = event?.entity_name;
    const eventType = event?.type;

    async function notify({ recipientName, type, message, navigateTo = '', recordId = '', actorName = '' }) {
      await base44.asServiceRole.entities.Notification.create({
        recipientName, type, message, isRead: false, navigateTo, recordId, actorName,
      });
    }

    // ── REQUEST / TASK (To-Do Board) ──────────────────────────────────────────
    if (entityName === 'Request') {
      const assignee = data?.assignedTo;
      const creator = data?.requestedBy;
      const title = data?.title || 'Untitled task';
      const actor = user?.full_name?.split(' ')[0] || 'Someone';

      if (eventType === 'create' && assignee) {
        // Task assigned to someone — notify assignee (not if they assigned themselves)
        if (assignee !== actor) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${actor} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId: data.id || '',
            actorName: actor,
          });
        }
      }

      if (eventType === 'update' && assignee) {
        const statusChanged = old_data?.status !== data?.status;
        const assigneeChanged = old_data?.assignedTo !== data?.assignedTo;

        // New assignee — notify them
        if (assigneeChanged && assignee && assignee !== actor) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${actor} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId: data.id || '',
            actorName: actor,
          });
        }

        // Status changed — notify current assignee (if not themselves)
        if (statusChanged && !assigneeChanged && assignee !== actor) {
          const newStatus = data.status;
          if (newStatus === 'Done') {
            // Also notify creator if different from actor
            if (creator && creator !== actor) {
              await notify({
                recipientName: creator,
                type: 'task_completed',
                message: `${actor} marked your task as done: ${title}`,
                navigateTo: 'team-board',
                recordId: data.id || '',
                actorName: actor,
              });
            }
          } else {
            await notify({
              recipientName: assignee,
              type: 'task_status_changed',
              message: `Your task "${title}" was updated to ${newStatus}`,
              navigateTo: 'team-board',
              recordId: data.id || '',
              actorName: actor,
            });
          }
        }
      }
    }

    // ── SPRINT SUBMISSION ─────────────────────────────────────────────────────
    if (entityName === 'SprintSubmission' && eventType === 'create') {
      const member = data?.memberName || 'A team member';
      const weekStart = data?.weekStart || '';
      const actor = user?.full_name?.split(' ')[0] || member;
      const msg = `${member} submitted their sprint update${weekStart ? ` for w/c ${weekStart}` : ''}`;

      // Notify Elena and Chris
      for (const recipient of ['Elena', 'Chris']) {
        if (recipient !== member) {
          await notify({
            recipientName: recipient,
            type: 'sprint_submitted',
            message: msg,
            navigateTo: 'sprints',
            recordId: data.id || '',
            actorName: member,
          });
        }
      }
    }

    // ── TIME ENTRY — notify CS owner when logged against a client by someone else ──
    if (entityName === 'TimeEntry' && eventType === 'create') {
      const clientId = data?.clientId;
      const clientName = data?.clientName;
      const loggedBy = data?.teamMember;
      const category = data?.category || '';
      const task = data?.projectTask || '';
      const dur = data?.durationMinutes || 0;
      const durStr = dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`;

      if (clientId && clientName && loggedBy) {
        // Find the client to get its CS owner
        const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
        const client = clients[0];
        if (client) {
          const ownerFull = client.owner || '';
          const ownerFirst = ownerFull.split(' ')[0];
          // Only notify if logged by someone OTHER than the CS owner
          if (ownerFirst && ownerFirst !== loggedBy) {
            await notify({
              recipientName: ownerFirst,
              type: 'time_logged_cs',
              message: `${loggedBy} logged ${durStr} against ${clientName}: ${task}`,
              navigateTo: 'clients',
              recordId: clientId,
              actorName: loggedBy,
            });
          }
        }
      }
    }

    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});