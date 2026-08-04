import { createClientFromRequest } from 'npm:@base44/sdk@0.8.41';

const ELENA = 'Elena';
const DMS_TARGET = 10;

// Johannesburg = UTC+2 (no DST). Dates in checklist records use the browser
// local date (Johannesburg), so we compute today / Monday in UTC+2 to match.
function jhbNow() {
  return new Date(Date.now() + 2 * 60 * 60 * 1000);
}
function jhbDateStr() {
  return jhbNow().toISOString().slice(0, 10);
}
function jhbMondayStr() {
  const d = jhbNow();
  const day = d.getUTCDay();
  const offset = day === 0 ? 6 : day - 1;
  const monday = new Date(d);
  monday.setUTCDate(d.getUTCDate() - offset);
  return monday.toISOString().slice(0, 10);
}

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const reminderType = (body && body.reminder_type) || 'daily';

    const today = jhbDateStr();
    const monday = jhbMondayStr();
    const dow = jhbNow().getUTCDay(); // 0 Sun .. 6 Sat

    const send = async (message: string) => {
      const recent = await base44.asServiceRole.entities.Notification.filter(
        { recipientName: ELENA },
        '-created_date',
        25
      );
      const todayStr = new Date().toDateString();
      const dup = recent.some(
        (n: any) =>
          n.type === 'checklist_reminder' &&
          n.message === message &&
          n.created_date &&
          new Date(n.created_date).toDateString() === todayStr
      );
      if (dup) return false;
      await base44.asServiceRole.entities.Notification.create({
        recipientName: ELENA,
        type: 'checklist_reminder',
        message,
        isRead: false,
        navigateTo: 'marketing',
      });
      return true;
    };

    if (reminderType === 'daily') {
      if (dow < 1 || dow > 5) return Response.json({ ok: true, skipped: 'weekend' });
      const sent = await send(
        '📋 Daily LinkedIn checklist — don\u2019t forget your 10 comments and replies today'
      );
      return Response.json({ ok: true, sent });
    }

    if (reminderType === 'thursday') {
      if (dow !== 4) return Response.json({ ok: true, skipped: 'not thursday' });
      const recs = await base44.asServiceRole.entities.MarketingDailyChecklistLog.filter({
        createdBy: ELENA,
      });
      const weekRecs = recs.filter((r: any) => r.date >= monday && r.date <= today);
      const dms = weekRecs.reduce((mx: number, r: any) => Math.max(mx, r.dmsCount || 0), 0);
      const blog = weekRecs.some((r: any) => r.blogPublished);

      let blogSent = false;
      let dmsSent = false;
      if (!blog) {
        blogSent = await send(
          '✍\uFE0F Weekly blog reminder — have you published this week\u2019s post?'
        );
      }
      if (dms < DMS_TARGET) {
        dmsSent = await send(
          `\u{1F4AC} LinkedIn DMs — you\u2019ve done ${dms}/${DMS_TARGET} this week. Keep going!`
        );
      }
      return Response.json({ ok: true, blogSent, dmsSent, dms, blog });
    }

    return Response.json({ ok: true, skipped: 'unknown type' });
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
}