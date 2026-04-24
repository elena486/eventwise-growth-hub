import React from 'react';
import { X, ClipboardList } from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ONBOARDING_PHASES } from '@/lib/csData';

function getProgress(tasks) {
  if (!tasks || tasks.length === 0) return 0;
  return Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100);
}

function getCurrentPhase(tasks) {
  for (let p = 4; p >= 1; p--) {
    const pt = tasks.filter(t => t.phase === p);
    if (pt.some(t => t.completed)) {
      if (pt.every(t => t.completed)) return p === 4 ? 4 : p + 1;
      return p;
    }
  }
  return 1;
}

export default function OnboardingSummaryPanel({ item, onClose, onOpenChecklist }) {
  const { client, record, tasks } = item;
  const pct = getProgress(tasks);
  const curPhase = getCurrentPhase(tasks);
  const phaseLabel = ONBOARDING_PHASES.find(p => p.phase === curPhase)?.label || '';

  const daysSinceUpdate = record?.lastUpdated
    ? Math.floor((new Date() - new Date(record.lastUpdated)) / (1000 * 60 * 60 * 24))
    : null;

  return (
    <div className="w-80 bg-white border-l border-ew-border flex flex-col h-full shadow-xl">
      <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border shrink-0">
        <h2 className="text-sm font-bold text-navy truncate">{client.name}</h2>
        <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy shrink-0">
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
        {/* Progress */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-2">Overall progress</p>
          <div className="flex items-center gap-3">
            <div className="flex-1 h-2.5 bg-ew-bg rounded-full overflow-hidden">
              <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
            </div>
            <span className="text-sm font-bold text-navy w-10 text-right">{pct}%</span>
          </div>
        </div>

        {/* Details */}
        <div className="space-y-3">
          <Row label="CS owner" value={client.owner || '—'} />
          <Row label="Current phase" value={`Phase ${curPhase} — ${phaseLabel}`} />
          <Row label="Client status" value={client.status || '—'} />
          {record?.lastUpdated && (
            <Row label="Last updated" value={`${daysSinceUpdate}d ago (${format(new Date(record.lastUpdated), 'd MMM yyyy')})`} />
          )}
          {client.trialStartDate && (
            <Row label="Start date" value={format(new Date(client.trialStartDate), 'd MMM yyyy')} />
          )}
        </div>

        {/* Phase breakdown */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.1em] mb-2">Phase breakdown</p>
          <div className="space-y-1.5">
            {ONBOARDING_PHASES.map(({ phase, label }) => {
              const pt = tasks.filter(t => t.phase === phase);
              const done = pt.filter(t => t.completed).length;
              const phasePct = pt.length > 0 ? Math.round((done / pt.length) * 100) : 0;
              return (
                <div key={phase} className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${phasePct === 100 ? 'bg-emerald-500' : phasePct > 0 ? 'bg-amber-400' : 'bg-gray-300'}`} />
                  <span className="text-xs text-ew-body flex-1">Phase {phase} — {label}</span>
                  <span className="text-xs text-ew-muted">{done}/{pt.length}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="px-5 py-4 border-t border-ew-border shrink-0">
        <button
          onClick={onOpenChecklist}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> Open checklist →
        </button>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div>
      <p className="text-[11px] font-medium text-ew-muted mb-0.5">{label}</p>
      <p className="text-sm text-navy">{value}</p>
    </div>
  );
}