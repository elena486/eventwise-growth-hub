import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDistanceToNow } from 'date-fns';
import ChecklistView from '@/components/onboarding/ChecklistView';
import OnboardingSummaryPanel from '@/components/onboarding/OnboardingSummaryPanel';
import { ONBOARDING_PHASES, OWNER_INITIALS, OWNER_COLORS } from '@/lib/csData';
import { ClipboardList } from 'lucide-react';

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

function PhaseDots({ tasks }) {
  return (
    <div className="flex items-center gap-1.5">
      {ONBOARDING_PHASES.map(({ phase }) => {
        const pt = tasks.filter(t => t.phase === phase);
        const done = pt.filter(t => t.completed).length;
        const cls = done === 0 ? 'bg-gray-300' : done === pt.length ? 'bg-emerald-500' : 'bg-amber-400';
        return <span key={phase} className={`w-2.5 h-2.5 rounded-full ${cls}`} title={`Phase ${phase}`} />;
      })}
    </div>
  );
}

function OwnerAvatar({ owner }) {
  const initials = OWNER_INITIALS[owner] || '?';
  const cls = OWNER_COLORS[owner] || 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>{initials}</span>;
}

export default function Onboarding({ focusClientId }) {
  const [clients, setClients] = useState([]);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checklist, setChecklist] = useState(null);
  const [summaryPanel, setSummaryPanel] = useState(null);

  const load = async () => {
    const [cls, recs] = await Promise.all([
      base44.entities.Client.filter({ status: 'Onboarding' }),
      base44.entities.OnboardingRecord.list(),
    ]);
    setClients(cls);
    setRecords(recs);
    setLoading(false);
    if (focusClientId) {
      const c = cls.find(cl => cl.id === focusClientId);
      const r = recs.find(r => r.clientId === focusClientId);
      if (c && r) setChecklist({ client: c, record: r });
    }
  };

  useEffect(() => { load(); }, [focusClientId]);

  const handleSaveTasks = async (tasks, transcripts, phaseNotes) => {
    await base44.entities.OnboardingRecord.update(checklist.record.id, {
      tasks: JSON.stringify(tasks),
      transcripts: transcripts ? JSON.stringify(transcripts) : undefined,
      phaseNotes: phaseNotes ? JSON.stringify(phaseNotes) : undefined,
      lastUpdated: new Date().toISOString(),
    });
    setChecklist(null);
    setSummaryPanel(null);
    load();
  };

  const handleGoLive = async () => {
    await base44.entities.Client.update(checklist.client.id, { status: 'Live' });
    setChecklist(null);
    setSummaryPanel(null);
    load();
  };

  const joined = clients.map(c => {
    const rec = records.find(r => r.clientId === c.id);
    const tasks = rec ? (() => { try { return JSON.parse(rec.tasks || '[]'); } catch { return []; } })() : [];
    return { client: c, record: rec, tasks };
  });

  const notStarted = joined.filter(j => !j.tasks.some(t => t.completed));
  const avgPct = joined.length > 0 ? Math.round(joined.reduce((s, j) => s + getProgress(j.tasks), 0) / joined.length) : 0;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-navy">Onboarding</h1>
        <p className="text-ew-muted text-sm mt-0.5">Active client onboarding tracker</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border border-ew-border rounded-xl p-5">
          <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Active onboardings</p>
          <p className="text-2xl font-bold text-navy">{clients.length}</p>
        </div>
        <div className="bg-white border border-ew-border rounded-xl p-5">
          <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Avg completion</p>
          <p className="text-2xl font-bold text-navy">{avgPct}%</p>
        </div>
        <div className="bg-white border border-ew-border rounded-xl p-5">
          <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">Not started</p>
          <p className="text-2xl font-bold text-navy">{notStarted.length}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['Client', 'Phase', 'Progress', 'Phases', 'Last updated', 'Owner', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {joined.map(({ client: c, record, tasks }, i) => {
                const pct = getProgress(tasks);
                const curPhase = getCurrentPhase(tasks);
                const phaseLabel = ONBOARDING_PHASES.find(p => p.phase === curPhase)?.label || '';
                return (
                  <tr
                    key={c.id}
                    className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                    onClick={() => setSummaryPanel({ client: c, record: record || { tasks: '[]' }, tasks })}
                  >
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        className="text-left group"
                        onClick={() => setSummaryPanel({ client: c, record: record || { tasks: '[]' }, tasks })}
                      >
                        <p className="font-semibold text-navy text-sm group-hover:underline">{c.name}</p>
                        <p className="text-xs text-ew-muted">{c.contactName}</p>
                      </button>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-ew-body">Phase {curPhase} — {phaseLabel}</span>
                    </td>
                    <td className="px-4 py-3 min-w-[140px]">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 bg-ew-bg rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs font-semibold text-navy w-8 text-right">{pct}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-3"><PhaseDots tasks={tasks} /></td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-ew-body">
                        {record?.lastUpdated
                          ? formatDistanceToNow(new Date(record.lastUpdated), { addSuffix: true })
                          : '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3"><OwnerAvatar owner={c.owner} /></td>
                    <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setChecklist({ client: c, record: record || { tasks: '[]' } })}
                        className="flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 bg-navy-tint text-navy border border-navy/10 rounded-lg hover:bg-navy hover:text-white transition-colors"
                      >
                        <ClipboardList className="w-3 h-3" /> Checklist
                      </button>
                    </td>
                  </tr>
                );
              })}
              {joined.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-ew-muted text-sm">No active onboardings</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {summaryPanel && !checklist && (
        <OnboardingSummaryPanel
          client={summaryPanel.client}
          record={summaryPanel.record}
          tasks={summaryPanel.tasks}
          onClose={() => setSummaryPanel(null)}
          onOpenChecklist={() => {
            setChecklist({ client: summaryPanel.client, record: summaryPanel.record });
            setSummaryPanel(null);
          }}
        />
      )}

      {checklist && (
        <ChecklistView
          record={checklist.record}
          client={checklist.client}
          onSave={handleSaveTasks}
          onGoLive={handleGoLive}
          onClose={() => setChecklist(null)}
        />
      )}
    </div>
  );
}