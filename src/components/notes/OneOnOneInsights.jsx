import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Sparkles, Loader2, ChevronDown, ChevronRight, RefreshCw, CalendarClock, ListTodo } from 'lucide-react';

export default function OneOnOneInsights({ notes, pending }) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [themes, setThemes] = useState([]);
  const [openItems, setOpenItems] = useState([]);
  const [overdue, setOverdue] = useState([]);
  const [generated, setGenerated] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const processed = notes.filter(n => n.status === 'Processed' && n.aiSummary);
      if (processed.length) {
        const context = processed.map(n => {
          let s = {};
          try { s = JSON.parse(n.aiSummary); } catch {}
          return `${n.teamMember} (${format(new Date(n.meetingDate), 'd MMM yyyy')}): ${(s.key_points || []).join('; ')}`;
        }).join('\n');
        const res = await base44.integrations.Core.InvokeLLM({
          prompt: `Analyse these 1:1 meeting notes across the team and identify recurring themes that come up across multiple meetings or people. Return ONLY a JSON object: { "themes": [array of short strings] }.\n\nNotes:\n${context}`,
          response_json_schema: { type: 'object', properties: { themes: { type: 'array', items: { type: 'string' } } }, required: ['themes'] },
          model: 'claude_sonnet_4_6',
        });
        setThemes(Array.isArray(res?.themes) ? res.themes : []);
      } else {
        setThemes([]);
      }

      // Open action items + overdue from data
      const added = pending.filter(p => p.status === 'Added to Board' && p.createdRequestId);
      const reqs = await Promise.all(added.map(p => base44.entities.Request.get(p.createdRequestId).catch(() => null)));
      const now = Date.now();
      const open = [];
      const od = [];
      added.forEach((p, i) => {
        const r = reqs[i];
        if (!r) return;
        if (r.status !== 'Done' && r.status !== 'Cancelled') {
          open.push({ title: p.taskTitle, person: p.teamMember, status: r.status });
          const reviewedAt = p.reviewedAt ? new Date(p.reviewedAt).getTime() : 0;
          if (reviewedAt && now - reviewedAt > 14 * 24 * 3600 * 1000) {
            od.push({ title: p.taskTitle, person: p.teamMember, date: p.meetingDate });
          }
        }
      });
      setOpenItems(open);
      setOverdue(od);
      setGenerated(true);
    } catch {}
    setLoading(false);
  };

  useEffect(() => {
    if (open && !generated && !loading) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <div className="bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden mb-6">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-2 px-5 py-4 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors text-left"
      >
        {open ? <ChevronDown className="w-4 h-4 text-ew-muted" /> : <ChevronRight className="w-4 h-4 text-ew-muted" />}
        <Sparkles className="w-4 h-4 text-[#8403C5]" />
        <span className="font-bold text-navy dark:text-white text-sm">AI Insights</span>
        <span className="text-xs text-ew-muted dark:text-gray-400">— cross-meeting analysis</span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-ew-border dark:border-gray-700 pt-4">
          {loading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-sm text-ew-muted">
              <Loader2 className="w-4 h-4 animate-spin" /> Generating insights…
            </div>
          ) : (
            <>
              {/* Recurring themes */}
              <div className="rounded-xl border border-amber-200 bg-amber-50 dark:bg-[#451a03] dark:border-[#92400e] p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-[#A16207] dark:text-[#fbbf24] mb-2">
                  🔁 Recurring Themes Across All 1:1s
                </p>
                {themes.length ? (
                  <ul className="space-y-1">
                    {themes.map((t, i) => (
                      <li key={i} className="text-sm text-[#1A1A3A] dark:text-gray-200 flex items-start gap-2">
                        <span className="text-amber-500 mt-0.5">•</span> {t}
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-ew-muted dark:text-gray-400">No recurring themes detected yet.</p>}
              </div>

              {/* Open action items */}
              <div className="rounded-xl border border-ew-border dark:border-gray-700 p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-navy dark:text-white mb-2">
                  <ListTodo className="w-4 h-4 text-[#8403C5]" /> Open Action Items
                </p>
                {openItems.length ? (
                  <ul className="space-y-1.5">
                    {openItems.map((it, i) => (
                      <li key={i} className="text-sm text-ew-body dark:text-gray-200 flex items-center justify-between">
                        <span>{it.title}</span>
                        <span className="text-xs text-ew-muted">{it.person} · {it.status}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-ew-muted dark:text-gray-400">No open action items from meeting notes.</p>}
              </div>

              {/* Overdue follow-ups */}
              <div className="rounded-xl border border-red-200 bg-red-50 dark:bg-[#450a0a] dark:border-[#991b1b] p-4">
                <p className="flex items-center gap-1.5 text-sm font-bold text-[#DC2626] dark:text-[#f87171] mb-2">
                  <CalendarClock className="w-4 h-4" /> Overdue Follow-ups (14+ days)
                </p>
                {overdue.length ? (
                  <ul className="space-y-1.5">
                    {overdue.map((it, i) => (
                      <li key={i} className="text-sm text-[#1A1A3A] dark:text-gray-200 flex items-center justify-between">
                        <span>{it.title}</span>
                        <span className="text-xs text-ew-muted">{it.person} · {it.date ? format(new Date(it.date), 'd MMM yyyy') : ''}</span>
                      </li>
                    ))}
                  </ul>
                ) : <p className="text-sm text-ew-muted dark:text-gray-400">No overdue follow-ups.</p>}
              </div>

              <button
                onClick={generate}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:text-[#7002A8] transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate Insights
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}