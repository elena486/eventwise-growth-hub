import React, { useState } from 'react';
import { ONBOARDING_PHASES } from '@/lib/csData';
import { format } from 'date-fns';
import { X, ChevronDown, ChevronRight } from 'lucide-react';
import TranscriptSection from '@/components/shared/TranscriptSection';

function phaseTasks(tasks, phase) {
  return tasks.filter(t => t.phase === phase);
}

function phaseCompletion(tasks, phase) {
  const pt = phaseTasks(tasks, phase);
  if (pt.length === 0) return 0;
  return Math.round((pt.filter(t => t.completed).length / pt.length) * 100);
}

export default function ChecklistView({ record, client, onSave, onGoLive, onClose }) {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(record.tasks || '[]'); } catch { return []; }
  });
  const [transcripts, setTranscripts] = useState(() => {
    try { return JSON.parse(record.transcripts || '[]'); } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);

  const toggleTask = (phase, taskName) => {
    setTasks(prev => prev.map(t =>
      t.phase === phase && t.taskName === taskName
        ? { ...t, completed: !t.completed, completedDate: !t.completed ? new Date().toISOString().split('T')[0] : null }
        : t
    ));
  };

  const updateNotes = (phase, taskName, notes) => {
    setTasks(prev => prev.map(t =>
      t.phase === phase && t.taskName === taskName ? { ...t, notes } : t
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(tasks, transcripts);
    setSaving(false);
  };

  const totalPct = tasks.length > 0 ? Math.round((tasks.filter(t => t.completed).length / tasks.length) * 100) : 0;

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <div>
            <h2 className="text-base font-bold text-navy">{client.name} — Onboarding</h2>
            <p className="text-xs text-ew-muted mt-0.5">{totalPct}% complete</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy"><X className="w-4 h-4" /></button>
        </div>

        {/* Progress bar */}
        <div className="px-6 pt-3 pb-2 shrink-0">
          <div className="h-2 bg-ew-bg rounded-full overflow-hidden">
            <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${totalPct}%` }} />
          </div>
        </div>

        {/* Phases */}
        <div className="flex-1 overflow-y-auto px-6 py-3 space-y-4">
          {ONBOARDING_PHASES.map(({ phase, label }) => {
            const pct = phaseCompletion(tasks, phase);
            const isCollapsed = collapsed[phase];
            const phaseTks = phaseTasks(tasks, phase);
            return (
              <div key={phase} className="border border-ew-border rounded-xl overflow-hidden">
                <button
                  className="w-full flex items-center justify-between px-4 py-3 bg-ew-footer hover:bg-ew-bg transition-colors"
                  onClick={() => setCollapsed(p => ({ ...p, [phase]: !p[phase] }))}
                >
                  <div className="flex items-center gap-3">
                    {isCollapsed ? <ChevronRight className="w-4 h-4 text-ew-muted" /> : <ChevronDown className="w-4 h-4 text-ew-muted" />}
                    <span className="font-semibold text-sm text-navy">Phase {phase} — {label}</span>
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${pct === 100 ? 'bg-emerald-50 text-emerald-700' : pct > 0 ? 'bg-amber-50 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {pct === 100 ? 'Complete' : pct > 0 ? 'In progress' : 'Not started'}
                    </span>
                  </div>
                  <span className="text-xs text-ew-muted">{phaseTks.filter(t => t.completed).length}/{phaseTks.length}</span>
                </button>
                {!isCollapsed && (
                  <div className="divide-y divide-ew-border">
                    {phaseTks.map((task) => (
                      <div key={task.taskName} className="px-4 py-3">
                        <div className="flex items-start gap-3">
                          <input
                            type="checkbox"
                            checked={task.completed}
                            onChange={() => toggleTask(task.phase, task.taskName)}
                            className="mt-0.5 w-4 h-4 accent-navy cursor-pointer"
                          />
                          <div className="flex-1">
                            <p className={`text-sm font-medium ${task.completed ? 'line-through text-ew-muted' : 'text-navy'}`}>{task.taskName}</p>
                            {task.completed && task.completedDate && (
                              <p className="text-[11px] text-ew-muted mt-0.5">Completed {task.completedDate}</p>
                            )}
                            <input
                              className="mt-1.5 w-full text-xs border border-ew-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy/20 bg-white placeholder:text-ew-muted-light"
                              placeholder="Add notes…"
                              value={task.notes || ''}
                              onChange={e => updateNotes(task.phase, task.taskName, e.target.value)}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

          {/* Transcripts section */}
          <div className="pb-4">
            <TranscriptSection
              transcripts={transcripts}
              onChange={setTranscripts}
            />
          </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={onGoLive}
            className="px-4 py-2 text-sm font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg hover:bg-emerald-100 transition-colors"
          >
            Mark as Go-Live →
          </button>
          <div className="flex gap-2">
            <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
            <button onClick={handleSave} disabled={saving} className="px-4 py-2 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors disabled:opacity-50">
              {saving ? 'Saving…' : 'Save progress'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}