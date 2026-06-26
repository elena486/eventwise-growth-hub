import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { TASK_PRESETS } from './taskPresets';
import { bustTaskPresetCache } from './TaskPresetSelect';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';

const CATEGORY_LABELS = Object.keys(TASK_PRESETS);

export default function TaskTemplateManager() {
  const [templates, setTemplates] = useState({}); // { category: [{id, taskName}] }
  const [loading, setLoading] = useState(true);
  const [addingTo, setAddingTo] = useState(null); // category being added to
  const [newTaskName, setNewTaskName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    const rows = await base44.entities.TaskTemplate.list().catch(() => []);
    const map = {};
    // Seed from static presets if no DB rows exist for a category
    CATEGORY_LABELS.forEach(cat => {
      map[cat] = [];
    });
    rows.forEach(r => {
      if (!map[r.category]) map[r.category] = [];
      map[r.category].push({ id: r.id, taskName: r.taskName });
    });
    // For any category with no DB rows, pre-populate from static (so admin sees them)
    CATEGORY_LABELS.forEach(cat => {
      if (map[cat].length === 0 && TASK_PRESETS[cat]) {
        // Don't auto-create — show static ones as read-only hints
      }
    });
    setTemplates(map);
    setLoading(false);
    bustTaskPresetCache();
  };

  useEffect(() => { load(); }, []);

  const getTasksForCategory = (cat) => {
    const dbTasks = templates[cat] || [];
    if (dbTasks.length > 0) return { tasks: dbTasks, fromDb: true };
    // Fall back to static presets for display
    const staticTasks = (TASK_PRESETS[cat] || []).map(name => ({ id: null, taskName: name }));
    return { tasks: staticTasks, fromDb: false };
  };

  const handleAddTask = async (cat) => {
    if (!newTaskName.trim()) return;
    setSaving(true);
    await base44.entities.TaskTemplate.create({ category: cat, taskName: newTaskName.trim() });
    setNewTaskName('');
    setAddingTo(null);
    await load();
    setSaving(false);
  };

  const handleEditSave = async (id) => {
    if (!editingName.trim()) return;
    setSaving(true);
    await base44.entities.TaskTemplate.update(id, { taskName: editingName.trim() });
    setEditingId(null);
    setEditingName('');
    await load();
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task template?')) return;
    await base44.entities.TaskTemplate.delete(id);
    await load();
    bustTaskPresetCache();
  };

  const handleSeedCategory = async (cat) => {
    // Create all static presets as DB rows for this category so admin can manage them
    const statics = TASK_PRESETS[cat] || [];
    setSaving(true);
    await Promise.all(statics.map(name => base44.entities.TaskTemplate.create({ category: cat, taskName: name })));
    await load();
    setSaving(false);
  };

  if (loading) {
    return <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>;
  }

  return (
    <div className="max-w-[860px] mx-auto pt-4 space-y-6">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h2 className="text-lg font-bold text-[#242450]">Manage Task Templates</h2>
          <p className="text-sm text-[#5777AB] mt-0.5">Edit the preset tasks available in the Project / Task dropdown for each category.</p>
        </div>
      </div>

      {CATEGORY_LABELS.map(cat => {
        const { tasks, fromDb } = getTasksForCategory(cat);
        const isAddingHere = addingTo === cat;

        return (
          <div key={cat} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            {/* Category header */}
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBF5] bg-[#F6F6FB]">
              <span className="text-sm font-bold text-[#242450]">{cat}</span>
              <span className="text-[11px] text-[#9CA3AF]">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</span>
            </div>

            {/* Tasks list */}
            <div className="divide-y divide-[#F2F2F4]">
              {!fromDb && tasks.length > 0 && (
                <div className="px-5 py-3 bg-[#FFFBEB] flex items-center justify-between gap-3">
                  <p className="text-xs text-[#A16207]">These are the default tasks. Click "Edit defaults" to make them editable.</p>
                  <button
                    onClick={() => handleSeedCategory(cat)}
                    disabled={saving}
                    className="text-xs font-semibold text-[#8403C5] bg-[#F3E8FF] hover:bg-[#EDE9FE] px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap"
                  >
                    Edit defaults
                  </button>
                </div>
              )}

              {tasks.map((task, i) => (
                <div key={task.id || i} className="flex items-center gap-3 px-5 py-2.5 group hover:bg-[#F6F6FB] transition-colors">
                  {editingId === task.id ? (
                    <div className="flex-1 flex items-center gap-2">
                      <input
                        autoFocus
                        value={editingName}
                        onChange={e => setEditingName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleEditSave(task.id); if (e.key === 'Escape') { setEditingId(null); setEditingName(''); } }}
                        className="flex-1 px-2 py-1 text-sm border border-[#8403C5]/40 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
                      />
                      <button onClick={() => handleEditSave(task.id)} disabled={saving} className="p-1.5 text-[#1D9E75] hover:bg-[#E8F7F2] rounded-lg">
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => { setEditingId(null); setEditingName(''); }} className="p-1.5 text-[#9CA3AF] hover:bg-[#EBEBF5] rounded-lg">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <>
                      <span className="flex-1 text-sm text-[#242450]">{task.taskName}</span>
                      {fromDb && task.id && (
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingId(task.id); setEditingName(task.taskName); }}
                            className="p-1.5 text-[#9CA3AF] hover:text-[#8403C5] hover:bg-[#F3E8FF] rounded-lg"
                            title="Rename"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(task.id)}
                            className="p-1.5 text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}

              {tasks.length === 0 && (
                <div className="px-5 py-4 text-sm text-[#9CA3AF] italic">No tasks yet — add one below.</div>
              )}
            </div>

            {/* Add task row */}
            {fromDb || tasks.length === 0 ? (
              <div className="px-5 py-3 border-t border-[#EBEBF5]">
                {isAddingHere ? (
                  <div className="flex items-center gap-2">
                    <input
                      autoFocus
                      value={newTaskName}
                      onChange={e => setNewTaskName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleAddTask(cat); if (e.key === 'Escape') { setAddingTo(null); setNewTaskName(''); } }}
                      placeholder="Task name…"
                      className="flex-1 px-3 py-1.5 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 focus:border-[#8403C5]"
                    />
                    <button onClick={() => handleAddTask(cat)} disabled={saving || !newTaskName.trim()}
                      className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:opacity-50 transition-colors">
                      {saving ? '…' : 'Add'}
                    </button>
                    <button onClick={() => { setAddingTo(null); setNewTaskName(''); }}
                      className="p-1.5 text-[#9CA3AF] hover:bg-[#EBEBF5] rounded-lg">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => { setAddingTo(cat); setNewTaskName(''); }}
                    className="flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:text-[#6B02A0] transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add task
                  </button>
                )}
              </div>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}