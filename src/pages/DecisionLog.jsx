import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, parseISO } from 'date-fns';
import {
  Search, Plus, ChevronDown, ChevronRight, Pencil, Trash2, X, Check,
  Gavel, Calendar, Users, Tag, Eye, AlertCircle, Loader2,
} from 'lucide-react';

const AREAS = ['Sprints', 'To-Do Board', 'Time Off', 'Pipeline', 'Tech Stack', 'Wiki', 'Marketing', 'HR', 'Other'];
const STATUSES = ['Active', 'Superseded', 'Under Review'];
const VISIBILITY = ['Team-visible', 'Elena & Chris only'];

const TEAM = ['Chris', 'Elena', 'George', 'Ramesh', 'Eleanor', 'Martinique', 'Sreeja'];

const AREA_STYLES = {
  Sprints: 'bg-[#F3E8FF] text-[#8403C5]',
  'To-Do Board': 'bg-[#EEF2F8] text-[#5777AB]',
  'Time Off': 'bg-[#E8F7F2] text-[#1D9E75]',
  Pipeline: 'bg-[#FFFBEB] text-[#A16207]',
  'Tech Stack': 'bg-[#EEF2F8] text-[#5777AB]',
  Wiki: 'bg-[#F3E8FF] text-[#8403C5]',
  Marketing: 'bg-[#E8F7F2] text-[#1D9E75]',
  HR: 'bg-[#FEF2F2] text-[#DC2626]',
  Other: 'bg-[#EBEBF5] text-[#242450]',
};

const STATUS_STYLES = {
  Active: 'bg-[#E8F7F2] text-[#1D9E75]',
  Superseded: 'bg-[#EBEBF5] text-[#5777AB]',
  'Under Review': 'bg-[#FFFBEB] text-[#A16207]',
};

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

const inputCls = 'w-full text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] bg-white';
const labelCls = 'block text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.06em] mb-1.5';

export default function DecisionLog() {
  const { user } = useAuth();
  const isElenaChris = (user?.email || '').toLowerCase().includes('elena') || (user?.email || '').toLowerCase().includes('chris');

  const [decisions, setDecisions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [areaFilter, setAreaFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [makerFilter, setMakerFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [editing, setEditing] = useState(null); // decision being edited/created

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.Decision.list('-date_decided', 500);
      setDecisions(data || []);
    } catch (e) {
      console.error('DecisionLog load error', e);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  // Visibility gate: hide "Elena & Chris only" from non-Elena/Chris users
  const visible = useMemo(() => {
    return decisions.filter(d => {
      if (d.visibility === 'Elena & Chris only' && !isElenaChris) return false;
      return true;
    });
  }, [decisions, isElenaChris]);

  const filtered = useMemo(() => {
    return visible.filter(d => {
      if (areaFilter !== 'all' && d.related_area !== areaFilter) return false;
      if (statusFilter !== 'all' && d.status !== statusFilter) return false;
      if (makerFilter !== 'all' && !(d.decision_makers || '').toLowerCase().includes(makerFilter.toLowerCase())) return false;
      const q = search.trim().toLowerCase();
      if (q && !(`${d.decision_title} ${d.decision_description}`.toLowerCase().includes(q))) return false;
      return true;
    });
  }, [visible, areaFilter, statusFilter, makerFilter, search]);

  const toggleExpand = (id) => setExpanded(p => ({ ...p, [id]: !p[id] }));

  const handleSave = async (data) => {
    // Enforce HR default visibility
    let payload = { ...data };
    if (payload.related_area === 'HR' && !payload.visibility) payload.visibility = 'Elena & Chris only';
    if (editing?.id) {
      const updated = await base44.entities.Decision.update(editing.id, payload);
      setDecisions(prev => prev.map(d => d.id === updated.id ? updated : d));
    } else {
      const created = await base44.entities.Decision.create(payload);
      setDecisions(prev => [created, ...prev]);
    }
    setEditing(null);
  };

  const handleDelete = async (id) => {
    await base44.entities.Decision.delete(id);
    setDecisions(prev => prev.filter(d => d.id !== id));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 pt-6 pb-4 shrink-0 border-b border-[#EBEBF5] bg-white">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-[#242450] flex items-center gap-2">
              <Gavel className="w-5 h-5 text-[#8403C5]" /> Decision Log
            </h1>
            <p className="text-sm text-[#5777AB] mt-0.5">A record of significant operational decisions — why they were made and what else was considered.</p>
          </div>
          {isElenaChris && (
            <button onClick={() => setEditing({})} className="btn-primary">
              <Plus className="w-4 h-4" /> New decision
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[220px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search title or description…"
              className="w-full text-sm border border-[#EBEBF5] rounded-lg pl-9 pr-3 py-2 outline-none focus:border-[#8403C5] bg-white"
            />
          </div>
          <select value={areaFilter} onChange={e => setAreaFilter(e.target.value)} className="text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] bg-white text-[#242450]">
            <option value="all">All areas</option>
            {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] bg-white text-[#242450]">
            <option value="all">All statuses</option>
            {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
          <select value={makerFilter} onChange={e => setMakerFilter(e.target.value)} className="text-sm border border-[#EBEBF5] rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] bg-white text-[#242450]">
            <option value="all">All decision makers</option>
            {TEAM.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto px-8 py-5 bg-[#F6F6FB]">
        {filtered.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-16 text-center">
            <Gavel className="w-8 h-8 text-[#D8D8EE] mx-auto mb-3" />
            <p className="text-sm font-medium text-[#5777AB]">No decisions match your filters</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(d => {
              const open = !!expanded[d.id];
              return (
                <div key={d.id} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden transition-shadow hover:shadow-sm">
                  {/* Compact row */}
                  <div
                    className="flex items-center gap-3 px-5 py-3.5 cursor-pointer hover:bg-[#FAFAFA] transition-colors"
                    onClick={() => toggleExpand(d.id)}
                  >
                    <div className="shrink-0 text-[#9CA3AF]">
                      {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-[#242450] truncate">{d.decision_title}</h3>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AREA_STYLES[d.related_area] || AREA_STYLES.Other}`}>{d.related_area}</span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[d.status] || STATUS_STYLES.Active}`}>{d.status}</span>
                        {d.visibility === 'Elena & Chris only' && (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] flex items-center gap-1">
                            <Eye className="w-2.5 h-2.5" /> Restricted
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="text-xs text-[#9CA3AF] flex items-center gap-1">
                        <Calendar className="w-3 h-3" /> {fmtDate(d.date_decided)}
                      </span>
                      {isElenaChris && (
                        <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => setEditing(d)} className="p-1 text-[#9CA3AF] hover:text-[#242450] rounded"><Pencil className="w-3.5 h-3.5" /></button>
                          <button onClick={() => { if (window.confirm('Delete this decision?')) handleDelete(d.id); }} className="p-1 text-[#9CA3AF] hover:text-[#DC2626] rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Expanded detail */}
                  {open && (
                    <div className="px-5 pb-5 pt-1 border-t border-[#EBEBF5] bg-[#FAFAFA]">
                      {d.decision_description && (
                        <div className="mt-4">
                          <p className={labelCls}>Decision</p>
                          <p className="text-sm text-[#1A1A3A] leading-relaxed whitespace-pre-wrap">{d.decision_description}</p>
                        </div>
                      )}
                      {d.context_background && (
                        <div className="mt-4">
                          <p className={labelCls}>Context & background</p>
                          <p className="text-sm text-[#1A1A3A] leading-relaxed whitespace-pre-wrap">{d.context_background}</p>
                        </div>
                      )}
                      {d.alternatives_considered && (
                        <div className="mt-4">
                          <p className={labelCls}>Alternatives considered</p>
                          <p className="text-sm text-[#1A1A3A] leading-relaxed whitespace-pre-wrap">{d.alternatives_considered}</p>
                        </div>
                      )}
                      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-xs text-[#5777AB]">
                        {d.decision_makers && (
                          <span className="flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> {d.decision_makers}</span>
                        )}
                        {d.review_date && (
                          <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" /> Review by {fmtDate(d.review_date)}</span>
                        )}
                        <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> {d.related_area}</span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit/Create modal */}
      {editing && (
        <DecisionModal
          decision={editing}
          onClose={() => setEditing(null)}
          onSave={handleSave}
        />
      )}
    </div>
  );
}

function DecisionModal({ decision, onClose, onSave }) {
  const [form, setForm] = useState({
    decision_title: decision.decision_title || '',
    date_decided: decision.date_decided || new Date().toISOString().slice(0, 10),
    decision_description: decision.decision_description || '',
    context_background: decision.context_background || '',
    alternatives_considered: decision.alternatives_considered || '',
    decision_makers: decision.decision_makers || '',
    related_area: decision.related_area || 'Other',
    status: decision.status || 'Active',
    review_date: decision.review_date || '',
    visibility: decision.visibility || 'Team-visible',
  });
  const [saving, setSaving] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  // Auto-default HR to restricted visibility
  useEffect(() => {
    if (form.related_area === 'HR' && form.visibility === 'Team-visible') {
      set('visibility', 'Elena & Chris only');
    }
  }, [form.related_area]);

  const submit = async () => {
    if (!form.decision_title.trim() || !form.date_decided) return;
    setSaving(true);
    try { await onSave(form); } catch (e) { console.error(e); setSaving(false); }
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5] sticky top-0 bg-white z-10">
          <h2 className="text-base font-bold text-[#242450]">{decision.id ? 'Edit decision' : 'New decision'}</h2>
          <button onClick={onClose} className="p-1 text-[#9CA3AF] hover:text-[#242450] rounded"><X className="w-5 h-5" /></button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={labelCls}>Title *</label>
            <input className={inputCls} value={form.decision_title} onChange={e => set('decision_title', e.target.value)} placeholder="e.g. Moved Sprints to self-assessed status model" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelCls}>Date decided *</label>
              <input type="date" className={inputCls} value={form.date_decided} onChange={e => set('date_decided', e.target.value)} />
            </div>
            <div>
              <label className={labelCls}>Review date (optional)</label>
              <input type="date" className={inputCls} value={form.review_date} onChange={e => set('review_date', e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className={labelCls}>Related area *</label>
              <select className={inputCls} value={form.related_area} onChange={e => set('related_area', e.target.value)}>
                {AREAS.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Status</label>
              <select className={inputCls} value={form.status} onChange={e => set('status', e.target.value)}>
                {STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Visibility</label>
              <select className={inputCls} value={form.visibility} onChange={e => set('visibility', e.target.value)}>
                {VISIBILITY.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className={labelCls}>Decision makers</label>
            <input className={inputCls} value={form.decision_makers} onChange={e => set('decision_makers', e.target.value)} placeholder="e.g. Elena, Chris" />
          </div>
          <div>
            <label className={labelCls}>What was decided</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={form.decision_description} onChange={e => set('decision_description', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Context & background</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={form.context_background} onChange={e => set('context_background', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Alternatives considered</label>
            <textarea className={`${inputCls} min-h-[80px]`} value={form.alternatives_considered} onChange={e => set('alternatives_considered', e.target.value)} />
          </div>
          {form.related_area === 'HR' && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#B91C1C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>HR-tagged decisions default to "Elena & Chris only" visibility and won't be shown to other team members.</span>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-6 py-4 border-t border-[#EBEBF5] sticky bottom-0 bg-white">
          <button onClick={onClose} className="btn-secondary">Cancel</button>
          <button onClick={submit} disabled={saving || !form.decision_title.trim() || !form.date_decided} className="btn-primary disabled:opacity-50">
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />} {decision.id ? 'Save changes' : 'Create decision'}
          </button>
        </div>
      </div>
    </div>
  );
}