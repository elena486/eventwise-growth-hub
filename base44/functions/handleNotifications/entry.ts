import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Entity automations are called by the system — use service role directly
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
      // Use requestedBy as the actor (who made the change) — best available proxy
      const actor = old_data?.assignedTo !== data?.assignedTo
        ? (creator || 'Someone')
        : (creator || 'Someone');

      if (eventType === 'create' && assignee) {
        if (assignee !== creator) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${creator || 'Someone'} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId: event?.entity_id || '',
            actorName: creator || '',
          });
        }
      }

      if (eventType === 'update') {
        const statusChanged = old_data?.status !== data?.status;
        const assigneeChanged = old_data?.assignedTo !== data?.assignedTo;

        // Newly assigned — notify new assignee
        if (assigneeChanged && assignee && assignee !== creator) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${creator || 'Someone'} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId: event?.entity_id || '',
            actorName: creator || '',
          });
        }

        // Status changed
        if (statusChanged && assignee) {
          const newStatus = data.status;
          if (newStatus === 'Done') {
            // Notify creator that their task is done
            if (creator && creator !== assignee) {
              await notify({
                recipientName: creator,
                type: 'task_completed',
                message: `${assignee} marked your task as done: ${title}`,
                navigateTo: 'team-board',
                recordId: event?.entity_id || '',
                actorName: assignee,
              });
            }
          } else {
            // Notify assignee of status change (if not self-update)
            if (assignee !== creator) {
              await notify({
                recipientName: assignee,
                type: 'task_status_changed',
                message: `Your task "${title}" was updated to ${newStatus}`,
                navigateTo: 'team-board',
                recordId: event?.entity_id || '',
                actorName: creator || '',
              });
            }
          }
        }
      }
    }

    // ── SPRINT SUBMISSION ─────────────────────────────────────────────────────
    if (entityName === 'SprintSubmission' && eventType === 'create') {
      const member = data?.memberName || 'A team member';
      const weekStart = data?.weekStart || '';
      const msg = `${member} submitted their sprint update${weekStart ? ` for w/c ${weekStart}` : ''}`;

      for (const recipient of ['Elena', 'Chris']) {
        if (recipient !== member) {
          await notify({
            recipientName: recipient,
            type: 'sprint_submitted',
            message: msg,
            navigateTo: 'sprints',
            recordId: event?.entity_id || '',
            actorName: member,
          });
        }
      }
    }

    // ── TIME ENTRY — notify CS owner when logged against a client ──
    if (entityName === 'TimeEntry' && eventType === 'create') {
      const clientId = data?.clientId;
      const clientName = data?.clientName;
      const loggedBy = data?.teamMember;
      const task = data?.projectTask || '';
      const dur = data?.durationMinutes || 0;
      const durStr = dur >= 60 ? `${Math.floor(dur / 60)}h${dur % 60 > 0 ? ` ${dur % 60}m` : ''}` : `${dur}m`;

      if (clientId && clientName && loggedBy) {
        const clients = await base44.asServiceRole.entities.Client.filter({ id: clientId });
        const client = clients[0];
        if (client) {
          const ownerFull = client.owner || '';
          const ownerFirst = ownerFull.split(' ')[0];
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