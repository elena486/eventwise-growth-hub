import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format, startOfWeek } from 'date-fns';
import { Calendar, Check } from 'lucide-react';
import ChecklistCounter from './ChecklistCounter';
import ChecklistHistory from './ChecklistHistory';

const PERSON = 'Elena';
const COMMENTS_TARGET = 10;
const DMS_TARGET = 10;

export default function DailyChecklist() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    base44.entities.MarketingDailyChecklistLog.filter({ createdBy: PERSON })
      .then(setRecords)
      .catch(() => {})
      .finally(() => setLoading(false));
    const unsub = base44.entities.MarketingDailyChecklistLog.subscribe((event) => {
      if (event.type === 'create') setRecords(prev => [event.data, ...prev]);
      else if (event.type === 'update') setRecords(prev => prev.map(r => r.id === event.id ? event.data : r));
      else if (event.type === 'delete') setRecords(prev => prev.filter(r => r.id !== event.id));
    });
    return unsub;
  }, []);

  const today = format(new Date(), 'yyyy-MM-dd');
  const monday = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');

  const todayRec = records.find(r => r.date === today);
  const thisWeekRecs = records.filter(r => r.date >= monday && r.date <= today);
  const latestThisWeek = thisWeekRecs.slice().sort((a, b) => (a.date < b.date ? 1 : -1))[0];

  const commentsCount = todayRec?.commentsCount ?? 0;
  const repliesDone = !!todayRec?.repliesDone;
  const dmsCount = latestThisWeek?.dmsCount ?? 0;
  const blogPublished = thisWeekRecs.some(r => r.blogPublished);

  const ensureToday = useCallback(async () => {
    if (todayRec) return todayRec;
    const carry = latestThisWeek || { dmsCount: 0, blogPublished: false };
    const created = await base44.entities.MarketingDailyChecklistLog.create({
      date: today,
      createdBy: PERSON,
      commentsCount: 0,
      commentsDone: false,
      repliesDone: false,
      dmsCount: carry.dmsCount || 0,
      dmsDone: (carry.dmsCount || 0) >= DMS_TARGET,
      blogPublished: !!carry.blogPublished,
    });
    setRecords(prev => [...prev, created]);
    return created;
  }, [todayRec, latestThisWeek, today]);

  const run = async (fn) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };

  const bumpComments = (delta) => run(async () => {
    const rec = await ensureToday();
    const next = Math.max(0, (rec.commentsCount || 0) + delta);
    await base44.entities.MarketingDailyChecklistLog.update(rec.id, { commentsCount: next, commentsDone: next >= COMMENTS_TARGET });
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, commentsCount: next, commentsDone: next >= COMMENTS_TARGET } : r));
  });

  const toggleReplies = () => run(async () => {
    const rec = await ensureToday();
    const next = !rec.repliesDone;
    await base44.entities.MarketingDailyChecklistLog.update(rec.id, { repliesDone: next });
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, repliesDone: next } : r));
  });

  const bumpDms = (delta) => run(async () => {
    const rec = await ensureToday();
    const next = Math.max(0, (rec.dmsCount || 0) + delta);
    await base44.entities.MarketingDailyChecklistLog.update(rec.id, { dmsCount: next, dmsDone: next >= DMS_TARGET });
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, dmsCount: next, dmsDone: next >= DMS_TARGET } : r));
  });

  const toggleBlog = () => run(async () => {
    const rec = await ensureToday();
    const next = !blogPublished;
    await base44.entities.MarketingDailyChecklistLog.update(rec.id, { blogPublished: next });
    setRecords(prev => prev.map(r => r.id === rec.id ? { ...r, blogPublished: next } : r));
  });

  if (loading) {
    return (
      <div className="bg-white border-b border-[#EBEBF5] px-6 py-4 flex items-center gap-3 shrink-0">
        <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
        <span className="text-sm text-[#9CA3AF]">Loading daily checklist…</span>
      </div>
    );
  }

  return (
    <div className="bg-white border-b border-[#EBEBF5] px-6 py-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-[#F3E8FF] flex items-center justify-center shrink-0">
            <Calendar className="w-4.5 h-4.5 text-[#8403C5]" />
          </div>
          <div>
            <h2 className="text-base font-bold text-[#242450] leading-tight">Daily LinkedIn Checklist</h2>
            <p className="text-[11px] text-[#9CA3AF]">{format(new Date(), 'EEEE d MMMM yyyy')}</p>
          </div>
        </div>
        <span className="text-[10px] font-semibold uppercase tracking-wide text-[#5777AB] bg-[#EEF2F8] px-2.5 py-1 rounded">Elena</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-x-8 gap-y-5">
        {/* Daily tasks */}
        <div className="space-y-4">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Daily tasks</p>
          <ChecklistCounter
            label="Comments on industry posts / leads"
            count={commentsCount}
            target={COMMENTS_TARGET}
            onIncrement={() => bumpComments(1)}
            onDecrement={() => bumpComments(-1)}
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#242450]">Reply to all LinkedIn comments</p>
              <p className="text-[11px] text-[#9CA3AF]">Aim to reply within 60 minutes</p>
            </div>
            <button onClick={toggleReplies} disabled={busy}
              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${repliesDone ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'border-[#D8D8EE] text-transparent hover:border-[#8403C5]'}`}>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Weekly tasks */}
        <div className="space-y-4 lg:border-l lg:border-[#EBEBF5] lg:pl-8">
          <p className="text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">Weekly tasks <span className="normal-case font-normal text-[#9CA3AF]">(reset Mondays)</span></p>
          <ChecklistCounter
            label="DM relevant LinkedIn followers"
            count={dmsCount}
            target={DMS_TARGET}
            onIncrement={() => bumpDms(1)}
            onDecrement={() => bumpDms(-1)}
            disabled={busy}
          />
          <div className="flex items-center justify-between gap-3 pt-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-[#242450]">Publish weekly blog (SEO keywords)</p>
              <p className="text-[11px] text-[#9CA3AF]">Incorporate Google Search Console keywords</p>
            </div>
            <button onClick={toggleBlog} disabled={busy}
              className={`w-7 h-7 rounded-lg border-2 flex items-center justify-center shrink-0 transition-colors ${blogPublished ? 'bg-[#1D9E75] border-[#1D9E75] text-white' : 'border-[#D8D8EE] text-transparent hover:border-[#8403C5]'}`}>
              <Check className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <ChecklistHistory records={records} />
    </div>
  );
}