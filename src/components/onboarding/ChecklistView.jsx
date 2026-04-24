import React, { useState } from 'react';
import { ONBOARDING_PHASES } from '@/lib/csData';
import { X, ChevronDown, ChevronRight, Plus } from 'lucide-react';
import TranscriptSection from '@/components/shared/TranscriptSection';

function phaseTasks(tasks, phase) {
  return tasks.filter(t => t.phase === phase);
}

function phaseCompletion(tasks, phase) {
  const pt = phaseTasks(tasks, phase);
  if (pt.length === 0) return 0;
  return Math.round((pt.filter(t => t.completed).length / pt.length) * 100);
}

const ic = 'w-full text-xs border border-ew-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-navy/20 bg-white placeholder:text-ew-muted-light';

export default function ChecklistView({ record, client, onSave, onGoLive, onClose }) {
  const [tasks, setTasks] = useState(() => {
    try { return JSON.parse(record.tasks || '[]'); } catch { return []; }
  });
  const [phaseNotes, setPhaseNotes] = useState(() => {
    try { return JSON.parse(record.phaseNotes || '{}'); } catch { return {}; }
  });
  const [transcripts, setTranscripts] = useState(() => {
    try { return JSON.parse(record.transcripts || '[]'); } catch { return []; }
  });
  const [collapsed, setCollapsed] = useState({});
  const [saving, setSaving] = useState(false);
  const [confirmGoLive, setConfirmGoLive] = useState(false);

  const toggleTask = (taskId) => {
    setTasks(prev => prev.map(t =>
      t.id === taskId
        ? { ...t, completed: !t.completed, completedDate: !t.completed ? new Date().toISOString().split('T')[0] : null }
        : t
    ));
  };

  const updateTaskField = (taskId, field, value) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, [field]: value } : t));
  };

  const addTask = (phase) => {
    const newTask = {
      id: `custom-${Date.now()}`,
      phase,
      taskName: '',
      completed: false,
      completedDate: null,
      notes: '',
      dueDate: '',
      isCustom: true,
    };
    setTasks(prev => [...prev, newTask]);
  };

  const updateTaskName = (taskId, name) => {
    setTasks(prev => prev.map(t => t.id === taskId ? { ...t, taskName: name } : t));
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(tasks, transcripts, phaseNotes);
    setSaving(false);
  };

  const handleGoLive = () => {
    setConfirmGoLive(false);
    onGoLive();
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
                  <div className="px-4 pt-3 pb-2">
                    {/* Phase notes */}
                    <textarea
                      className={ic + ' h-14 resize-none mb-3 block w-full'}
                      placeholder="Phase notes — add context about this phase…"
                      value={phaseNotes[phase] || ''}
                      onChange={e => setPhaseNotes(prev => ({ ...prev, [phase]: e.target.value }))}
                    />
                    <div className="divide-y divide-ew-border border border-ew-border rounded-lg overflow-hidden">
                      {phaseTks.map((task) => (
                        <div key={task.id || task.taskName} className="px-3 py-3 bg-white">
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={task.completed}
                              onChange={() => toggleTask(task.id || task.taskName)}
                              className="mt-0.5 w-4 h-4 accent-navy cursor-pointer shrink-0"
                            />
                            <div className="flex-1 min-w-0">
                              {task.isCustom ? (
                                <input
                                  className={ic + ' font-medium mb-1.5'}
                                  placeholder="Task name…"
                                  value={task.taskName}
                                  onChange={e => updateTaskName(task.id, e.target.value)}
                                />
                              ) : (
                                <p className={`text-sm font-medium mb-1.5 ${task.completed ? 'line-through text-ew-muted' : 'text-navy'}`}>{task.taskName}</p>
                              )}
                              {task.completed && task.completedDate && (
                                <p className="text-[11px] text-ew-muted mb-1">Completed {task.completedDate}</p>
                              )}
                              <div className="grid grid-cols-2 gap-2">
                                <input
                                  className={ic}
                                  placeholder="Add notes…"
                                  value={task.notes || ''}
                                  onChange={e => updateTaskField(task.id || task.taskName, 'notes', e.target.value)}
                                />
                                <input
                                  type="date"
                                  className={ic}
                                  title="Due date"
                                  value={task.dueDate || ''}
                                  onChange={e => updateTaskField(task.id || task.taskName, 'dueDate', e.target.value)}
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <button
                      onClick={() => addTask(phase)}
                      className="mt-2 flex items-center gap-1 text-xs font-medium text-[#8403C5] hover:underline px-1"
                    >
                      <Plus className="w-3 h-3" /> Add task
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Transcripts section */}
          <div className="pb-2">
            <TranscriptSection transcripts={transcripts} onChange={setTranscripts} />
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-ew-border shrink-0 flex items-center justify-between gap-3">
          <button
            onClick={() => setConfirmGoLive(true)}
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

      {/* Go-Live confirm */}
      {confirmGoLive && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200] p-4" onClick={() => setConfirmGoLive(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Mark as Go-Live?</h3>
            <p className="text-sm text-ew-body mb-5">This will mark <strong>{client.name}</strong> as Live and archive the onboarding record. This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmGoLive(false)} className="px-4 py-2 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={handleGoLive} className="px-4 py-2 text-sm font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Confirm Go-Live</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}