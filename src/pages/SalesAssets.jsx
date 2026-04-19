import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, LayoutGrid, List, Search, ExternalLink, FileText, Video, Mail, Presentation, File, Trash2, Pencil, X } from 'lucide-react';
import { format } from 'date-fns';
import AssetModal from '@/components/sales/AssetModal';

const STATUS_STYLES = {
  Approved: 'bg-emerald-50 text-emerald-700',
  'In Review': 'bg-amber-50 text-amber-700',
  Draft: 'bg-gray-100 text-gray-500',
  Archived: 'bg-gray-100 text-gray-400',
};

const CATEGORY_ICONS = {
  'Email Sequence': Mail,
  'PDF': FileText,
  'Video': Video,
  'Presentation': FileText,
  'Document': File,
  'Other': File,
};

const CATEGORY_COLORS = {
  'Email Sequence': 'bg-purple-50 text-purple-700',
  'PDF': 'bg-red-50 text-red-600',
  'Video': 'bg-blue-50 text-blue-700',
  'Presentation': 'bg-orange-50 text-orange-600',
  'Document': 'bg-teal-50 text-teal-700',
  'Other': 'bg-gray-100 text-gray-600',
};

const QUICK_FILTERS = ['All', 'Approved', 'In Review', 'Email Sequence', 'PDF', 'Video'];
const CATEGORIES = ['Email Sequence', 'PDF', 'Video', 'Presentation', 'Document', 'Other'];

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function CategoryTag({ category }) {
  const Icon = CATEGORY_ICONS[category] || File;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${CATEGORY_COLORS[category] || 'bg-gray-100 text-gray-600'}`}>
      <Icon className="w-3 h-3" />
      {category}
    </span>
  );
}

function AssetCard({ asset, onEdit, onDelete }) {
  return (
    <div className="group bg-white border border-ew-border rounded-xl p-5 flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy leading-snug flex-1">"{asset.title}"</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <CategoryTag category={asset.category} />
        {asset.audience && (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#7E22CE]">{asset.audience}</span>
        )}
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>{asset.status}</span>
      </div>

      {asset.notes && (
        <p className="text-xs text-ew-body line-clamp-2">{asset.notes}</p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap">
        {asset.mondayDocLink && (
          <a href={asset.mondayDocLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-navy hover:text-[#8403C5] transition-colors">
            <ExternalLink className="w-3 h-3" /> Monday Doc
          </a>
        )}
        {asset.fileUrl && (
          <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-navy hover:text-[#8403C5] transition-colors">
            <FileText className="w-3 h-3" /> PDF / File
          </a>
        )}
        {asset.videoLink && (
          <a href={asset.videoLink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 hover:text-blue-800 transition-colors">
            <Video className="w-3 h-3" /> Watch video
          </a>
        )}
      </div>
    </div>
  );
}

export default function SalesAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid'); // 'grid' | 'table'
  const [quickFilter, setQuickFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editAsset, setEditAsset] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('dateAdded');
  const [sortDir, setSortDir] = useState('desc');

  const load = async () => {
    const data = await base44.entities.SalesAsset.list('-created_date');
    setAssets(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleSaved = (saved) => {
    setAssets(prev => {
      const exists = prev.find(a => a.id === saved.id);
      return exists ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev];
    });
  };

  const handleDelete = async (asset) => {
    await base44.entities.SalesAsset.delete(asset.id);
    setAssets(prev => prev.filter(a => a.id !== asset.id));
    setDeleteConfirm(null);
  };

  const openEdit = (asset) => { setEditAsset(asset); setShowModal(true); };
  const openNew = () => { setEditAsset(null); setShowModal(true); };

  // Filtering
  const filtered = assets.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (quickFilter === 'Approved') matchFilter = a.status === 'Approved';
    else if (quickFilter === 'In Review') matchFilter = a.status === 'In Review';
    else if (['Email Sequence', 'PDF', 'Video'].includes(quickFilter)) matchFilter = a.category === quickFilter;
    return matchSearch && matchFilter;
  });

  // Group by category for grid view
  const grouped = CATEGORIES.reduce((acc, cat) => {
    const items = filtered.filter(a => a.category === cat);
    if (items.length > 0) acc[cat] = items;
    return acc;
  }, {});
  const otherItems = filtered.filter(a => !CATEGORIES.includes(a.category));
  if (otherItems.length > 0) grouped['Other'] = otherItems;

  // Sort for table view
  const sortedForTable = [...filtered].sort((a, b) => {
    let av = a[sortCol] || '';
    let bv = b[sortCol] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const Th = ({ label, col }) => (
    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] cursor-pointer select-none hover:text-navy transition-colors"
      onClick={() => col && handleSort(col)}>
      {label}{col && sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Sales Assets</h1>
          <p className="text-ew-muted text-sm mt-0.5">Email sequences, PDFs, videos and documents for outreach</p>
        </div>
        <button onClick={openNew} className="h-9 px-4 bg-navy hover:bg-navy/90 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px] max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ew-muted" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-ew-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20"
          />
        </div>

        {/* Quick filters */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f} onClick={() => setQuickFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border ${quickFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
        </div>

        {/* View toggle */}
        <div className="flex items-center gap-1 bg-white border border-ew-border rounded-lg p-1 ml-auto">
          <button onClick={() => setView('grid')} className={`p-1.5 rounded-md transition-colors ${view === 'grid' ? 'bg-navy text-white' : 'text-ew-muted hover:text-navy'}`} title="Grid view">
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => setView('table')} className={`p-1.5 rounded-md transition-colors ${view === 'table' ? 'bg-navy text-white' : 'text-ew-muted hover:text-navy'}`} title="Table view">
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
          <p className="text-navy font-semibold mb-1">No assets found</p>
          <p className="text-ew-muted text-sm">Try a different filter or add a new asset.</p>
        </div>
      ) : view === 'grid' ? (
        /* Grid view grouped by category */
        <div className="space-y-8">
          {Object.entries(grouped).map(([cat, items]) => (
            <div key={cat}>
              <div className="flex items-center gap-2 mb-3">
                <CategoryTag category={cat} />
                <span className="text-xs text-ew-muted">{items.length} asset{items.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {items.map(a => (
                  <AssetCard key={a.id} asset={a} onEdit={openEdit} onDelete={setDeleteConfirm} />
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        /* Table view */
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <Th label="Title" col="title" />
                <Th label="Category" col="category" />
                <Th label="Audience" col="audience" />
                <Th label="Status" col="status" />
                <Th label="Added by" col="addedBy" />
                <Th label="Date added" col="dateAdded" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Links</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedForTable.map((asset, i) => (
                <tr key={asset.id} className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                  <td className="px-4 py-3 font-medium text-navy max-w-[240px]">
                    <span className="line-clamp-2">"{asset.title}"</span>
                  </td>
                  <td className="px-4 py-3"><CategoryTag category={asset.category} /></td>
                  <td className="px-4 py-3 text-ew-body text-xs">{asset.audience || '—'}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>{asset.status || '—'}</span>
                  </td>
                  <td className="px-4 py-3 text-ew-body text-xs">{asset.addedBy || '—'}</td>
                  <td className="px-4 py-3 text-ew-muted text-xs">{fmtDate(asset.dateAdded || asset.created_date)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {asset.mondayDocLink && <a href={asset.mondayDocLink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-navy hover:text-[#8403C5] transition-colors flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /> Doc</a>}
                      {asset.fileUrl && <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer" className="text-[11px] text-navy hover:text-[#8403C5] transition-colors flex items-center gap-0.5"><FileText className="w-3 h-3" /> File</a>}
                      {asset.videoLink && <a href={asset.videoLink} target="_blank" rel="noopener noreferrer" className="text-[11px] text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-0.5"><Video className="w-3 h-3" /> Video</a>}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => openEdit(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteConfirm(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit modal */}
      {showModal && (
        <AssetModal
          asset={editAsset}
          onClose={() => { setShowModal(false); setEditAsset(null); }}
          onSaved={handleSaved}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete asset?</h3>
            <p className="text-sm text-ew-body mb-5">This will permanently delete <strong>"{deleteConfirm.title}"</strong>. This cannot be undone.</p>
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