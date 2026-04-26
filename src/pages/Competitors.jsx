import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, Search, LayoutGrid, List, ExternalLink, GitCompareArrows } from 'lucide-react';
import CompetitorCard from '@/components/competitors/CompetitorCard';
import CompetitorModal from '@/components/competitors/CompetitorModal';
import CompetitorDetail from '@/components/competitors/CompetitorDetail';
import ComparePanel from '@/components/competitors/ComparePanel';

const THREAT_STYLES = {
  High:    'bg-red-50 text-red-600 border-red-200',
  Medium:  'bg-amber-50 text-amber-700 border-amber-200',
  Low:     'bg-green-50 text-green-700 border-green-200',
  Monitor: 'bg-gray-100 text-gray-600 border-gray-200',
};

const CAT_STYLES = {
  'Forecasting Tool':         'bg-blue-50 text-blue-700',
  'Event Management':         'bg-purple-50 text-purple-700',
  'Procurement & Approvals':  'bg-orange-50 text-orange-600',
  'Accounting Software':      'bg-teal-50 text-teal-700',
  'Project Management':       'bg-indigo-50 text-indigo-700',
  'Expense Management':       'bg-pink-50 text-pink-700',
  'Other':                    'bg-gray-100 text-gray-600',
};

const QUICK_FILTERS = [
  { label: 'All', key: 'all' },
  { label: 'High Threat', key: 'High' },
  { label: 'Event Management', key: 'Event Management' },
  { label: 'Accounting / Finance', key: 'accounting' },
  { label: 'Procurement', key: 'Procurement & Approvals' },
];

const THREAT_ORDER = { High: 0, Medium: 1, Low: 2, Monitor: 3 };

const TABLE_COLS = [
  { label: 'Company',                      col: 'companyName' },
  { label: 'Category',                     col: 'category' },
  { label: 'Threat',                       col: 'threatLevel' },
  { label: 'Pricing',                      col: 'pricing' },
  { label: 'Trustpilot',                   col: null },
  { label: 'Target Audience',              col: 'targetAudience' },
  { label: 'Key Features',                 col: 'keyFeatures' },
  { label: 'Main Differences vs Eventwise', col: 'mainDifferences' },
];

function trunc(str, len = 60) {
  if (!str) return '—';
  return str.length > len ? str.slice(0, len) + '…' : str;
}

export default function Competitors() {
  const [competitors, setCompetitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [quickFilter, setQuickFilter] = useState('all');
  const [view, setView] = useState('table'); // default table
  const [showModal, setShowModal] = useState(false);
  const [editCompetitor, setEditCompetitor] = useState(null);
  const [detailCompetitor, setDetailCompetitor] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('threatLevel');
  const [sortDir, setSortDir] = useState('asc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showCompare, setShowCompare] = useState(false);
  const [expandedRow, setExpandedRow] = useState(null);

  const load = async () => {
    const data = await base44.entities.Competitor.list('-created_date');
    setCompetitors(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    setCompetitors(prev => {
      const exists = prev.find(c => c.id === saved.id);
      return exists ? prev.map(c => c.id === saved.id ? saved : c) : [saved, ...prev];
    });
    if (detailCompetitor?.id === saved.id) setDetailCompetitor(saved);
  };

  const handleDelete = async (c) => {
    await base44.entities.Competitor.delete(c.id);
    setCompetitors(prev => prev.filter(x => x.id !== c.id));
    setSelectedIds(prev => prev.filter(id => id !== c.id));
    setDeleteConfirm(null);
    if (detailCompetitor?.id === c.id) setDetailCompetitor(null);
  };

  const openEdit = (c) => { setEditCompetitor(c); setShowModal(true); };
  const openNew = () => { setEditCompetitor(null); setShowModal(true); };

  const toggleSelect = (id) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 4 ? [...prev, id] : prev
    );
  };

  // Filter
  const filtered = competitors.filter(c => {
    const matchSearch = !search || c.companyName?.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (quickFilter === 'High') matchFilter = c.threatLevel === 'High';
    else if (quickFilter === 'accounting') matchFilter = c.category === 'Accounting Software' || c.category === 'Forecasting Tool';
    else if (quickFilter !== 'all') matchFilter = c.category === quickFilter || c.threatLevel === quickFilter;
    return matchSearch && matchFilter;
  });

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    if (sortCol === 'threatLevel') {
      const diff = (THREAT_ORDER[a.threatLevel] ?? 99) - (THREAT_ORDER[b.threatLevel] ?? 99);
      if (diff !== 0) return sortDir === 'asc' ? diff : -diff;
      // secondary: company name alpha
      return a.companyName?.localeCompare(b.companyName);
    }
    const av = a[sortCol] || '';
    const bv = b[sortCol] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const gridSorted = [...filtered].sort((a, b) =>
    (THREAT_ORDER[a.threatLevel] ?? 99) - (THREAT_ORDER[b.threatLevel] ?? 99)
  );

  const handleSort = (col) => {
    if (!col) return;
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const selectedCompetitors = competitors.filter(c => selectedIds.includes(c.id));

  if (detailCompetitor) {
    return (
      <div className="flex-1 overflow-y-auto">
        <CompetitorDetail
          competitor={detailCompetitor}
          onBack={() => setDetailCompetitor(null)}
          onEdit={() => openEdit(detailCompetitor)}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Competitor Intelligence</h1>
          <p className="text-ew-muted text-sm mt-0.5">Internal overview of the competitive landscape</p>
        </div>
        <div className="flex items-center gap-2">
          {selectedIds.length >= 2 && (
            <button
              onClick={() => setShowCompare(true)}
              className="h-9 px-4 bg-[#8403C5] hover:bg-[#7002A8] text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <GitCompareArrows className="w-4 h-4" /> Compare selected ({selectedIds.length})
            </button>
          )}
          {selectedIds.length > 0 && (
            <button onClick={() => setSelectedIds([])} className="h-9 px-3 text-sm text-ew-muted border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">
              Clear
            </button>
          )}
          <button onClick={openNew} className="h-9 px-4 bg-navy hover:bg-navy/90 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors shrink-0">
            <Plus className="w-4 h-4" /> Add Competitor
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative min-w-[180px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ew-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by name…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-ew-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f.key} onClick={() => setQuickFilter(f.key)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap ${quickFilter === f.key ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white border border-ew-border rounded-lg p-1 ml-auto shrink-0">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-navy text-white' : 'text-ew-muted hover:text-navy'}`} title="Grid">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-navy text-white' : 'text-ew-muted hover:text-navy'}`} title="Table">
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center gap-2 text-sm text-ew-body bg-white border border-ew-border rounded-lg px-4 py-2.5">
          <GitCompareArrows className="w-4 h-4 text-[#8403C5]" />
          <span><strong>{selectedIds.length}</strong> selected for comparison {selectedIds.length < 2 ? '— select at least 2' : selectedIds.length === 4 ? '— max 4 reached' : ''}.</span>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
          <div className="text-4xl mb-3">🔍</div>
          <p className="text-sm text-[#6B7280]">No competitors match this filter.</p>
        </div>
      ) : view === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {gridSorted.map(c => (
            <CompetitorCard
              key={c.id}
              competitor={c}
              onClick={() => setDetailCompetitor(c)}
              onEdit={() => openEdit(c)}
              onDelete={() => setDeleteConfirm(c)}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border sticky top-0 z-10">
              <tr>
                {/* Compare checkbox col */}
                <th className="px-3 py-3 w-8" />
                {TABLE_COLS.map(({ label, col }) => (
                  <th
                    key={label}
                    onClick={() => handleSort(col)}
                    className={`px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] whitespace-nowrap ${col ? 'cursor-pointer hover:text-navy transition-colors select-none' : ''}`}
                  >
                    {label}
                    {col && sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
                  </th>
                ))}
                {/* Actions col */}
                <th className="px-4 py-3 w-28" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => {
                const trust = c.customerSatisfaction?.match(/(\d+\.?\d*)\s+on\s+Trustpilot/i)?.[1];
                const isSelected = selectedIds.includes(c.id);
                const isExpanded = expandedRow === c.id;

                return (
                  <React.Fragment key={c.id}>
                    <tr
                      className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors cursor-pointer ${isSelected ? 'bg-purple-50' : i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}
                      onClick={() => setExpandedRow(isExpanded ? null : c.id)}
                    >
                      {/* Compare checkbox */}
                      <td className="px-3 py-3" onClick={e => { e.stopPropagation(); toggleSelect(c.id); }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(c.id)}
                          disabled={!isSelected && selectedIds.length >= 4}
                          className="rounded border-ew-border cursor-pointer accent-[#8403C5]"
                        />
                      </td>
                      {/* Company */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-bold text-navy">{c.companyName}</div>
                        {c.url && (
                          <a href={c.url} target="_blank" rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="inline-flex items-center gap-1 text-[11px] text-ew-muted hover:text-[#8403C5] transition-colors">
                            <ExternalLink className="w-2.5 h-2.5" /> link
                          </a>
                        )}
                      </td>
                      {/* Category */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.category && <span className={`text-[11px] font-medium px-2.5 py-0.5 rounded-full ${CAT_STYLES[c.category] || 'bg-gray-100 text-gray-600'}`}>{c.category}</span>}
                      </td>
                      {/* Threat */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {c.threatLevel && <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${THREAT_STYLES[c.threatLevel]}`}>{c.threatLevel}</span>}
                      </td>
                      {/* Pricing */}
                      <td className="px-4 py-3 text-ew-body text-xs max-w-[160px]">
                        <span className="line-clamp-1">{c.pricing || '—'}</span>
                      </td>
                      {/* Trustpilot */}
                      <td className="px-4 py-3 text-xs font-semibold text-amber-600 whitespace-nowrap">
                        {trust ? `★ ${trust}` : '—'}
                      </td>
                      {/* Target Audience */}
                      <td className="px-4 py-3 text-ew-body text-xs max-w-[140px]">
                        <span className="line-clamp-1">{c.targetAudience || '—'}</span>
                      </td>
                      {/* Key Features */}
                      <td className="px-4 py-3 text-ew-body text-xs max-w-[200px]">
                        <span className="line-clamp-1">{trunc(c.keyFeatures)}</span>
                      </td>
                      {/* Main Differences */}
                      <td className="px-4 py-3 text-ew-body text-xs max-w-[200px]">
                        <span className="line-clamp-1">{trunc(c.mainDifferences)}</span>
                      </td>
                      {/* Actions */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                          <button
                            onClick={() => { toggleSelect(c.id); }}
                            className={`px-2 py-1 text-xs font-medium rounded transition-colors ${isSelected ? 'text-[#8403C5]' : 'text-ew-muted hover:text-[#8403C5]'}`}
                          >
                            {isSelected ? '✓ Selected' : 'Compare'}
                          </button>
                          <button onClick={() => openEdit(c)} className="px-2 py-1 text-xs font-medium text-ew-muted hover:text-navy rounded transition-colors">Edit</button>
                          <button onClick={() => setDeleteConfirm(c)} className="px-2 py-1 text-xs font-medium text-red-400 hover:text-red-600 rounded transition-colors">Delete</button>
                        </div>
                      </td>
                    </tr>
                    {/* Expanded row */}
                    {isExpanded && (
                      <tr className={i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}>
                        <td colSpan={10} className="px-6 pb-4 pt-1">
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs text-ew-body border-t border-ew-border pt-3">
                            {[
                              { label: 'Key Features', val: c.keyFeatures },
                              { label: 'Main Differences vs Eventwise', val: c.mainDifferences },
                              { label: 'Platform Adaptability', val: c.platformAdaptability },
                              { label: 'Target Audience', val: c.targetAudience },
                              { label: 'Market Strategy', val: c.marketStrategy },
                              { label: 'Tech Stack', val: c.techStack },
                              { label: 'Integrations', val: c.integrations },
                              { label: 'Customer Satisfaction', val: c.customerSatisfaction },
                              { label: 'Notes', val: c.notes },
                            ].filter(f => f.val).map(f => (
                              <div key={f.label}>
                                <p className="text-[10px] font-semibold text-ew-muted uppercase tracking-[0.1em] mb-1">{f.label}</p>
                                <p className="leading-relaxed">{f.val}</p>
                              </div>
                            ))}
                          </div>
                          <button
                            onClick={() => setDetailCompetitor(c)}
                            className="mt-3 text-xs font-medium text-[#8403C5] hover:underline"
                          >
                            View full profile →
                          </button>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <CompetitorModal
          competitor={editCompetitor}
          onClose={() => { setShowModal(false); setEditCompetitor(null); }}
          onSaved={handleSaved}
        />
      )}

      {showCompare && (
        <ComparePanel
          competitors={selectedCompetitors}
          onClose={() => setShowCompare(false)}
        />
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete competitor?</h3>
            <p className="text-sm text-ew-body mb-5">Permanently delete <strong>{deleteConfirm.companyName}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}