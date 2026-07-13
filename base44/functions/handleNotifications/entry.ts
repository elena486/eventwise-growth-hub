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
      const requestedBy = data?.requestedBy;
      const title = data?.title || 'Untitled task';
      const recordId = event?.entity_id || '';

      // Resolve the requester — "Requested By" field, falling back to the task
      // creator (created_by_id → User.full_name) when Requested By is blank.
      let requester = requestedBy;
      if (!requester) {
        const creatorId = data?.created_by_id;
        if (creatorId) {
          try {
            const creatorUser = await base44.asServiceRole.entities.User.get(creatorId);
            if (creatorUser?.full_name) requester = creatorUser.full_name.split(' ')[0];
          } catch {}
        }
      }

      if (eventType === 'create' && assignee) {
        if (assignee !== requester) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${requester || 'Someone'} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId,
            actorName: requester || '',
          });
        }
      }

      if (eventType === 'update') {
        const statusChanged = old_data?.status !== data?.status;
        const assigneeChanged = old_data?.assignedTo !== data?.assignedTo;

        // Newly assigned — notify new assignee
        if (assigneeChanged && assignee && assignee !== requester) {
          await notify({
            recipientName: assignee,
            type: 'task_assigned',
            message: `${requester || 'Someone'} assigned you a task: ${title}`,
            navigateTo: 'team-board',
            recordId,
            actorName: requester || '',
          });
        }

        // Requester notifications at two key moments — work started & work done.
        // Skip when the requester is also the assignee (someone self-assigned):
        // no point telling someone they completed their own task.
        if (statusChanged && requester && assignee && requester !== assignee) {
          const newStatus = data.status;
          if (newStatus === 'Done') {
            await notify({
              recipientName: requester,
              type: 'task_completed',
              message: `Your request has been completed: ${title}`,
              navigateTo: 'team-board',
              recordId,
              actorName: assignee,
            });
          } else if (newStatus === 'In Progress') {
            await notify({
              recipientName: requester,
              type: 'task_status_changed',
              message: `${assignee} has started working on your request: ${title}`,
              navigateTo: 'team-board',
              recordId,
              actorName: assignee,
            });
          }
        }

        // Other status changes (Blocked, Waiting, etc.) — keep the assignee informed
        if (statusChanged && assignee && assignee !== requester) {
          const newStatus = data.status;
          if (newStatus !== 'Done' && newStatus !== 'In Progress') {
            await notify({
              recipientName: assignee,
              type: 'task_status_changed',
              message: `Your task "${title}" was updated to ${newStatus}`,
              navigateTo: 'team-board',
              recordId,
              actorName: requester || '',
            });
          }
        }
      }
    }

    // ── SPRINT SUBMISSION ─────────────────────────────────────────────────────
    if (entityName === 'SprintSubmission' && eventType === 'create') {
      const member = data?.memberName || 'A team member';
      const weekStart = data?.weekStart || '';
      const msg = `${member} submitted their sprint update${weekStart ? ` for w/c ${weekStart}` : ''}`;

      for (const recipient of ['Elena', 'Chris', 'Eleanor']) {
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

    // ── LEAVE ENTRY ───────────────────────────────────────────────────────────
    if (entityName === 'LeaveEntry') {
      const person = data?.personName || '';
      const startDate = data?.startDate || '';
      const endDate = data?.endDate || '';
      const status = data?.status || '';
      const oldStatus = old_data?.status || '';

      // Format dates nicely: "3 Jul"
      function fmtDate(d) {
        if (!d) return d;
        try {
          const parts = d.split('-');
          const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
          return `${parseInt(parts[2])} ${months[parseInt(parts[1]) - 1]}`;
        } catch { return d; }
      }
      const fStart = fmtDate(startDate);
      const fEnd = fmtDate(endDate);

      // TRIGGER 1 — Approved (notify the person)
      if (eventType === 'update' && status === 'Approved' && oldStatus !== 'Approved' && person) {
        await notify({
          recipientName: person,
          type: 'leave_approved',
          message: `${person}, your leave request for ${fStart} to ${fEnd} has been approved.`,
          navigateTo: 'leave',
          recordId: event?.entity_id || '',
          actorName: '',
        });
      }

      // TRIGGER 2 — Declined (notify the person)
      if (eventType === 'update' && status === 'Declined' && oldStatus !== 'Declined' && person) {
        await notify({
          recipientName: person,
          type: 'leave_declined',
          message: `${person}, your leave request for ${fStart} to ${fEnd} was not approved. Contact Elena if you have questions.`,
          navigateTo: 'leave',
          recordId: event?.entity_id || '',
          actorName: '',
        });
      }

      // TRIGGER 3 — New request requiring approval (notify Elena)
      if (eventType === 'create' && status === 'Requested' && person) {
        await notify({
          recipientName: 'Elena',
          type: 'leave_requested',
          message: `${person} has requested leave from ${fStart} to ${fEnd}. Review in the Approval Queue.`,
          navigateTo: 'leave',
          recordId: event?.entity_id || '',
          actorName: person,
        });
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