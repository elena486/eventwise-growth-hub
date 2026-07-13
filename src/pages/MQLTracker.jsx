import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ChevronDown, ChevronRight, Download, Trash2, Pencil, X } from 'lucide-react';
import { format, parse } from 'date-fns';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { downloadCSV, fmtCsvDate, safe, todayStr } from '@/lib/csvExport';

const SOURCES = ['Website Form', 'Budget Health Check', 'Event Budget Template', 'ROI Calculator', 'EPS 2026', 'LinkedIn', 'Newsletter', 'Referral', 'Other Event', 'Other'];
const ASSIGNEES = ['Chris', 'George', 'Ramesh', 'Elena', 'Eleanor'];
const STATUSES = ['New MQL', 'SQL Accepted', 'SQL Rejected', 'Converted', 'Not qualified'];

const STATUS_STYLES = {
  'New MQL':       'bg-[#F3F4F6] text-[#6B7280]',
  'SQL Accepted':  'bg-[#DCFCE7] text-[#15803D]',
  'SQL Rejected':  'bg-[#FEE2E2] text-[#B91C1C]',
  'Converted':     'bg-[#F3E8FF] text-[#7E22CE]',
  'Not qualified': 'bg-[#F3F4F6] text-[#6B7280]',
};

const QUICK_FILTERS = ['All', 'New MQL', 'SQL Accepted', 'Converted', 'This year', '2025'];

function getMonthCollected(dateStr) {
  if (!dateStr) return '';
  try { return format(new Date(dateStr), 'MMMM yyyy'); } catch { return ''; }
}

function monthSortKey(monthStr) {
  try { return parse(monthStr, 'MMMM yyyy', new Date()).getTime(); } catch { return 0; }
}

const EMPTY_FORM = {
  name: '', company: '', jobTitle: '', email: '',
  source: 'Website Form', leadStatus: 'New MQL',
  assignedTo: 'Chris', dateAdded: format(new Date(), 'yyyy-MM-dd'),
  dateSentToSales: '', notes: '',
};

function MQLForm({ initial, onSave, onClose }) {
  const [form, setForm] = useState(initial || EMPTY_FORM);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    const month = getMonthCollected(form.dateAdded);
    const payload = { ...form, monthCollected: month };
    if (!payload.dateSentToSales) delete payload.dateSentToSales;
    await onSave(payload);
    onClose();
  };

  const ic = 'w-full border border-ew-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
  const lc = 'block text-xs font-medium text-ew-muted mb-1';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <h3 className="text-base font-bold text-navy">{initial ? 'Edit MQL' : 'Add MQL'}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors"><X className="w-4 h-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div><label className={lc}>Name *</label><input required className={ic} value={form.name} onChange={e => set('name', e.target.value)} /></div>
            <div><label className={lc}>Company</label><input className={ic} value={form.company} onChange={e => set('company', e.target.value)} /></div>
            <div><label className={lc}>Job title</label><input className={ic} value={form.jobTitle} onChange={e => set('jobTitle', e.target.value)} /></div>
            <div><label className={lc}>Email</label><input type="email" className={ic} value={form.email} onChange={e => set('email', e.target.value)} /></div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={lc}>Source</label>
              <select className={ic} value={form.source} onChange={e => set('source', e.target.value)}>
                {SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Lead status</label>
              <select className={ic} value={form.leadStatus} onChange={e => set('leadStatus', e.target.value)}>
                {STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Assigned to</label>
              <select className={ic} value={form.assignedTo} onChange={e => set('assignedTo', e.target.value)}>
                {ASSIGNEES.map(a => <option key={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className={lc}>Date added</label>
              <input type="date" className={ic} value={form.dateAdded} onChange={e => set('dateAdded', e.target.value)} />
            </div>
            <div>
              <label className={lc}>Date sent to sales</label>
              <input type="date" className={ic} value={form.dateSentToSales} onChange={e => set('dateSentToSales', e.target.value)} />
            </div>
          </div>
          <div><label className={lc}>Notes</label><textarea className={`${ic} h-20 resize-none`} value={form.notes} onChange={e => set('notes', e.target.value)} /></div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MonthGroup({ month, records, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const sqlCount = records.filter(r => r.leadStatus === 'SQL Accepted').length;
  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ew-bg transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-ew-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ew-muted shrink-0" />}
        <span className="font-semibold text-navy text-sm">{month}</span>
        <span className="text-xs text-ew-muted">{records.length} MQL{records.length !== 1 ? 's' : ''}</span>
        {sqlCount > 0 && <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-[#DCFCE7] text-[#15803D]">{sqlCount} SQL accepted</span>}
      </button>
      {open && (
        <div className="border-t border-ew-border overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer">
              <tr>
                {['Name','Company','Job Title','Email','Source','Status','Assigned To','Date Added','Notes',''].map(h => (
                  <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map((r, i) => (
                <tr key={r.id} className={`border-t border-ew-border group hover:bg-navy/[0.02] ${i % 2 === 1 ? 'bg-[#FAFBFE]' : ''}`}>
                  <td className="px-4 py-2.5 font-medium text-navy whitespace-nowrap">{r.name}</td>
                  <td className="px-4 py-2.5 text-ew-body whitespace-nowrap">{r.company || '—'}</td>
                  <td className="px-4 py-2.5 text-ew-body text-xs whitespace-nowrap">{r.jobTitle || '—'}</td>
                  <td className="px-4 py-2.5 text-ew-body text-xs whitespace-nowrap">{r.email || '—'}</td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><span className="text-xs bg-ew-bg px-2 py-0.5 rounded-full text-ew-body">{r.source || '—'}</span></td>
                  <td className="px-4 py-2.5 whitespace-nowrap"><span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[r.leadStatus] || ''}`}>{r.leadStatus}</span></td>
                  <td className="px-4 py-2.5 text-ew-body text-xs whitespace-nowrap">{r.assignedTo || '—'}</td>
                  <td className="px-4 py-2.5 text-ew-muted text-xs whitespace-nowrap">{r.dateAdded ? format(new Date(r.dateAdded), 'd MMM yyyy') : '—'}</td>
                  <td className="px-4 py-2.5 text-ew-body text-xs max-w-[200px]"><span className="line-clamp-2">{r.notes || '—'}</span></td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => onEdit(r)} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => onDelete(r)} className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function MQLTracker() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [quickFilter, setQuickFilter] = useState('All');
  const [sourceFilter, setSourceFilter] = useState('All');
  const [showForm, setShowForm] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const load = async () => {
    const data = await base44.entities.MQLRecord.list('-dateAdded');
    setRecords(data);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  // Keyboard shortcuts: Escape to close modals, Cmd+N to add MQL
  useEffect(() => {
    const onEscape = () => {
      if (deleteConfirm) { setDeleteConfirm(null); return; }
      if (showForm) { setShowForm(false); setEditRecord(null); }
    };
    const onNew = () => { setEditRecord(null); setShowForm(true); };
    window.addEventListener('ew-escape', onEscape);
    window.addEventListener('ew-new-entry', onNew);
    return () => {
      window.removeEventListener('ew-escape', onEscape);
      window.removeEventListener('ew-new-entry', onNew);
    };
  }, [deleteConfirm, showForm]);

  const filtered = useMemo(() => {
    return records.filter(r => {
      if (sourceFilter !== 'All' && r.source !== sourceFilter) return false;
      if (quickFilter === 'All') return true;
      if (quickFilter === 'New MQL') return r.leadStatus === 'New MQL';
      if (quickFilter === 'SQL Accepted') return r.leadStatus === 'SQL Accepted';
      if (quickFilter === 'Converted') return r.leadStatus === 'Converted';
      if (quickFilter === 'This year') return r.dateAdded && r.dateAdded.startsWith('2026');
      if (quickFilter === '2025') return r.dateAdded && r.dateAdded.startsWith('2025');
      return true;
    });
  }, [records, quickFilter, sourceFilter]);

  // Group by month, sorted most recent first
  const grouped = useMemo(() => {
    const map = {};
    filtered.forEach(r => {
      const m = r.monthCollected || getMonthCollected(r.dateAdded) || 'Unknown';
      if (!map[m]) map[m] = [];
      map[m].push(r);
    });
    return Object.entries(map).sort((a, b) => monthSortKey(b[0]) - monthSortKey(a[0]));
  }, [filtered]);

  // Stats
  const total = records.length;
  const totalSQLs = records.filter(r => r.leadStatus === 'SQL Accepted').length;
  const totalConverted = records.filter(r => r.leadStatus === 'Converted').length;
  const sqlRate = total > 0 ? Math.round((totalSQLs / total) * 100) : 0;
  const convertedRate = total > 0 ? Math.round((totalConverted / total) * 100) : 0;

  const topSource = useMemo(() => {
    const counts = {};
    records.filter(r => r.leadStatus === 'SQL Accepted').forEach(r => { counts[r.source] = (counts[r.source] || 0) + 1; });
    const entries = Object.entries(counts);
    if (!entries.length) return '—';
    return entries.sort((a, b) => b[1] - a[1])[0][0];
  }, [records]);

  // Source chart data
  const sourceChartData = useMemo(() => {
    const counts = {};
    records.forEach(r => { counts[r.source] = (counts[r.source] || 0) + 1; });
    return Object.entries(counts).map(([source, count]) => ({ source, count })).sort((a, b) => b.count - a.count);
  }, [records]);

  const handleSave = async (data) => {
    if (editRecord) {
      const updated = await base44.entities.MQLRecord.update(editRecord.id, data);
      setRecords(prev => prev.map(r => r.id === editRecord.id ? updated : r));
    } else {
      const created = await base44.entities.MQLRecord.create(data);
      setRecords(prev => [created, ...prev]);
    }
    setEditRecord(null);
  };

  const handleDelete = async (rec) => {
    await base44.entities.MQLRecord.delete(rec.id);
    setRecords(prev => prev.filter(r => r.id !== rec.id));
    setDeleteConfirm(null);
  };

  const handleExport = () => {
    if (!records.length) { alert('No data to export'); return; }
    const cols = [
      { label: 'Name', getValue: r => safe(r.name) },
      { label: 'Company', getValue: r => safe(r.company) },
      { label: 'Job Title', getValue: r => safe(r.jobTitle) },
      { label: 'Email', getValue: r => safe(r.email) },
      { label: 'Source', getValue: r => safe(r.source) },
      { label: 'Lead Status', getValue: r => safe(r.leadStatus) },
      { label: 'Assigned To', getValue: r => safe(r.assignedTo) },
      { label: 'Date Added', getValue: r => fmtCsvDate(r.dateAdded) },
      { label: 'Date Sent to Sales', getValue: r => fmtCsvDate(r.dateSentToSales) },
      { label: 'Month Collected', getValue: r => safe(r.monthCollected) },
      { label: 'Notes', getValue: r => safe(r.notes) },
    ];
    downloadCSV(records, cols, `Eventwise_MQL_Tracker_${todayStr()}.csv`);
  };

  const statCard = (label, value, sub) => (
    <div className="bg-white border border-ew-border rounded-xl p-5">
      <p className="text-xs font-semibold text-ew-muted uppercase tracking-[0.1em] mb-1">{label}</p>
      <p className="text-3xl font-bold text-navy">{value}</p>
      {sub && <p className="text-xs text-ew-muted mt-1">{sub}</p>}
    </div>
  );

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">MQL Tracker</h1>
          <p className="text-ew-muted text-sm mt-0.5">Marketing-generated leads — source tracking and sales pipeline contribution</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handleExport} className="h-9 px-3 flex items-center gap-1.5 text-sm font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg transition-colors">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => { setEditRecord(null); setShowForm(true); }} className="h-9 px-4 bg-[#8403C5] hover:bg-[#7002A8] text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors">
            <Plus className="w-4 h-4" /> Add MQL
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCard('Total MQLs', total, 'All time')}
        {statCard('SQLs Accepted', totalSQLs, `${sqlRate}% of total MQLs`)}
        {statCard('Converted to clients', totalConverted, `${convertedRate}% of total MQLs`)}
        {statCard('Top source (by SQLs)', topSource, 'Most SQL-generating channel')}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f} onClick={() => setQuickFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg border whitespace-nowrap transition-colors ${quickFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
        </div>
        <select
          value={sourceFilter}
          onChange={e => setSourceFilter(e.target.value)}
          className="h-9 px-3 text-sm border border-ew-border bg-white rounded-lg focus:outline-none focus:ring-2 focus:ring-navy/20 ml-auto"
        >
          <option value="All">All sources</option>
          {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {/* Table grouped by month */}
      {loading ? (
        <div className="flex items-center justify-center h-40">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : grouped.length === 0 ? (
        <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
          <p className="text-navy font-semibold mb-1">No MQLs found</p>
          <p className="text-ew-muted text-sm">Try a different filter or add a new MQL.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {grouped.map(([month, recs]) => (
            <MonthGroup key={month} month={month} records={recs}
              onEdit={r => { setEditRecord(r); setShowForm(true); }}
              onDelete={setDeleteConfirm}
            />
          ))}
        </div>
      )}

      {/* Source breakdown chart */}
      {sourceChartData.length > 0 && (
        <div className="bg-white border border-ew-border rounded-xl p-6">
          <h2 className="text-sm font-bold text-navy mb-1">MQLs by Source</h2>
          <p className="text-xs text-ew-muted mb-5">Which channels and lead magnets are generating the most leads</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={sourceChartData} margin={{ top: 0, right: 0, left: -10, bottom: 40 }}>
              <XAxis dataKey="source" tick={{ fontSize: 11, fill: '#9CA3AF' }} angle={-30} textAnchor="end" interval={0} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} allowDecimals={false} />
              <Tooltip formatter={(v) => [v, 'MQLs']} />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {sourceChartData.map((_, i) => <Cell key={i} fill="#8403C5" fillOpacity={1 - i * 0.06} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {showForm && (
        <MQLForm
          initial={editRecord ? { ...editRecord } : null}
          onSave={handleSave}
          onClose={() => { setShowForm(false); setEditRecord(null); }}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete MQL?</h3>
            <p className="text-sm text-ew-body mb-5">This will permanently delete <strong>"{deleteConfirm.name}"</strong>. This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}