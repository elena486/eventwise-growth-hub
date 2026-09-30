import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const cutoff = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString();

    const page = await base44.asServiceRole.entities.SuggestedTask.filter(
      { status: 'Pending review', created_date: { $lt: cutoff } },
      { limit: 500 }
    );
    const oldItems = page.items || page;

    let expired = 0;
    for (const item of oldItems) {
      await base44.asServiceRole.entities.SuggestedTask.update(item.id, {
        status: 'Expired',
        dismissedReason: 'Auto-expired after 14 days with no action',
        reviewedDate: new Date().toISOString().split('T')[0],
      });
      expired++;
    }

    return Response.json({ expired });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}