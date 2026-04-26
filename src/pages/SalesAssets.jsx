import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, LayoutGrid, List, Search, ExternalLink, FileText, Video, Mic, Wrench, BookOpen, Presentation, File, Trash2, Pencil, AlertTriangle, Download, ChevronDown, ChevronRight, Mail } from 'lucide-react';
import { format } from 'date-fns';
import AssetModal from '@/components/sales/AssetModal';
import AssetDetailPanel from '@/components/sales/AssetDetailPanel';

export const STATUS_STYLES = {
  'Good to Use':    'bg-emerald-50 text-emerald-700',
  'Needs Update':   'bg-amber-50 text-amber-700',
  'Editing':        'bg-amber-50 text-amber-700',
  'Working on It':  'bg-amber-50 text-amber-700',
  'Chris to Review':'bg-amber-50 text-amber-700',
  'ON HOLD':        'bg-gray-100 text-gray-500',
  'Needs Creating': 'bg-red-50 text-red-600',
};

export const TYPE_ICONS = {
  'Video':      Video,
  'One-Pager':  FileText,
  'Deck':       Presentation,
  'Tool':       Wrench,
  'Guide':      BookOpen,
  'Case Study': File,
  'Podcast':    Mic,
  'Template':   File,
  'Other':      File,
};

export const TYPE_COLORS = {
  'Video':      'bg-blue-50 text-blue-700',
  'One-Pager':  'bg-purple-50 text-purple-700',
  'Deck':       'bg-orange-50 text-orange-600',
  'Tool':       'bg-teal-50 text-teal-700',
  'Guide':      'bg-green-50 text-green-700',
  'Case Study': 'bg-pink-50 text-pink-700',
  'Podcast':    'bg-indigo-50 text-indigo-700',
  'Template':   'bg-cyan-50 text-cyan-700',
  'Other':      'bg-gray-100 text-gray-600',
};

export const TYPES = ['Video', 'One-Pager', 'Deck', 'Tool', 'Guide', 'Case Study', 'Podcast', 'Template', 'Other'];
const QUICK_FILTERS = ['All', 'Good to Use', 'Needs Creating', 'Videos', 'One-Pagers', 'Decks & Presentations'];

// Monday-hosted file URLs that need re-uploading
const isMondayFile = (url) => url && url.includes('monday.com/protected_static');

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function TypeTag({ type }) {
  const Icon = TYPE_ICONS[type] || File;
  return (
    <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[type] || 'bg-gray-100 text-gray-600'}`}>
      <Icon className="w-3 h-3" />
      {type}
    </span>
  );
}

function getEmailCount(asset) {
  try { const p = JSON.parse(asset.emailExamples || '[]'); return Array.isArray(p) ? p.length : 0; } catch { return 0; }
}

function hasNoLink(asset) {
  const hasUrl = !!asset.url;
  const hasFile = asset.fileUrl && !isMondayFile(asset.fileUrl);
  return !hasUrl && !hasFile;
}

function AssetCard({ asset, onEdit, onDelete, onClick }) {
  const needsReupload = isMondayFile(asset.fileUrl);
  const emailCount = getEmailCount(asset);
  const noLink = hasNoLink(asset);

  return (
    <div
      className="group bg-white border border-ew-border rounded-xl p-4 flex flex-col gap-2.5 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-sm font-semibold text-navy leading-snug flex-1">{asset.title}</h3>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0" onClick={e => e.stopPropagation()}>
          <button onClick={() => onEdit(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button onClick={() => onDelete(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <TypeTag type={asset.type} />
        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>{asset.status}</span>
        {emailCount > 0 && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5]">
            <Mail className="w-2.5 h-2.5" /> {emailCount} email{emailCount !== 1 ? 's' : ''}
          </span>
        )}
        {noLink && (
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
            ⚠ No link
          </span>
        )}
      </div>

      {asset.notes && (
        <p className="text-xs text-ew-body line-clamp-2">{asset.notes}</p>
      )}

      <div className="flex items-center gap-2 mt-auto pt-1 flex-wrap" onClick={e => e.stopPropagation()}>
        {asset.url && (
          <a href={asset.url} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-navy hover:text-[#8403C5] transition-colors">
            <ExternalLink className="w-3 h-3" /> Open
          </a>
        )}
        {asset.fileUrl && !needsReupload && (
          <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-medium text-navy hover:text-[#8403C5] transition-colors">
            <Download className="w-3 h-3" /> {asset.fileName || 'Download'}
          </a>
        )}
        {needsReupload && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200" title="This file is hosted on Monday.com and needs to be re-uploaded to Base44 before Monday is cancelled.">
            <AlertTriangle className="w-3 h-3" /> Needs re-upload
          </span>
        )}
        {asset.lastUpdated && (
          <span className="text-[11px] text-ew-muted ml-auto">{fmtDate(asset.lastUpdated)}</span>
        )}
      </div>
    </div>
  );
}

function TypeSection({ type, items, onEdit, onDelete, onView }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-5 py-3.5 hover:bg-ew-bg transition-colors"
      >
        {open ? <ChevronDown className="w-4 h-4 text-ew-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ew-muted shrink-0" />}
        <TypeTag type={type} />
        <span className="text-xs text-ew-muted">{items.length} asset{items.length !== 1 ? 's' : ''}</span>
      </button>
      {open && (
        <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t border-ew-border pt-4">
          {items.map(a => (
            <AssetCard key={a.id} asset={a} onEdit={onEdit} onDelete={onDelete} onClick={() => onView(a)} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SalesAssets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('grid');
  const [quickFilter, setQuickFilter] = useState('All');
  const [search, setSearch] = useState('');
  const [editAsset, setEditAsset] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [sortCol, setSortCol] = useState('type');
  const [sortDir, setSortDir] = useState('asc');
  const [detailAsset, setDetailAsset] = useState(null);

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

  // Filter logic
  const filtered = assets.filter(a => {
    const matchSearch = !search || a.title?.toLowerCase().includes(search.toLowerCase());
    let matchFilter = true;
    if (quickFilter === 'Good to Use') matchFilter = a.status === 'Good to Use';
    else if (quickFilter === 'Needs Creating') matchFilter = a.status === 'Needs Creating';
    else if (quickFilter === 'Videos') matchFilter = a.type === 'Video';
    else if (quickFilter === 'One-Pagers') matchFilter = a.type === 'One-Pager';
    else if (quickFilter === 'Decks & Presentations') matchFilter = a.type === 'Deck';
    return matchSearch && matchFilter;
  });

  // Group by type for grid
  const grouped = TYPES.reduce((acc, t) => {
    const items = filtered.filter(a => a.type === t);
    if (items.length > 0) acc[t] = items;
    return acc;
  }, {});

  // Sort for table
  const sortedForTable = [...filtered].sort((a, b) => {
    const av = a[sortCol] || '';
    const bv = b[sortCol] || '';
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const handleSort = (col) => {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortCol(col); setSortDir('asc'); }
  };

  const Th = ({ label, col }) => (
    <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em] cursor-pointer select-none hover:text-navy transition-colors whitespace-nowrap"
      onClick={() => col && handleSort(col)}>
      {label}{col && sortCol === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : ''}
    </th>
  );

  const needsReuploadCount = assets.filter(a => isMondayFile(a.fileUrl)).length;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <h1 className="text-2xl font-bold text-navy">Sales Assets</h1>
          <p className="text-ew-muted text-sm mt-0.5">Videos, one-pagers, decks, tools and guides for outreach</p>
        </div>
        <button onClick={openNew} className="h-9 px-4 bg-navy hover:bg-navy/90 text-white font-semibold text-sm rounded-lg flex items-center gap-1.5 transition-colors shrink-0">
          <Plus className="w-4 h-4" /> Add Asset
        </button>
      </div>

      {/* Re-upload warning banner */}
      {needsReuploadCount > 0 && (
        <div className="mb-5 flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">
            <strong>{needsReuploadCount} asset{needsReuploadCount !== 1 ? 's' : ''}</strong> have files hosted on Monday.com that need to be re-uploaded to Base44 before Monday is cancelled. Look for the <span className="font-semibold">Needs re-upload</span> badge on cards.
          </p>
        </div>
      )}

      {/* Controls */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="relative min-w-[200px] max-w-xs flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ew-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by title…"
            className="w-full pl-8 pr-3 py-2 text-sm border border-ew-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-navy/20" />
        </div>
        <div className="flex items-center gap-1.5 flex-wrap">
          {QUICK_FILTERS.map(f => (
            <button key={f} onClick={() => setQuickFilter(f)}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-colors border whitespace-nowrap ${quickFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-white border border-ew-border rounded-lg p-1 ml-auto shrink-0">
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
        <div className="space-y-3">
          {Object.entries(grouped).map(([type, items]) => (
            <TypeSection key={type} type={type} items={items} onEdit={openEdit} onDelete={setDeleteConfirm} onView={setDetailAsset} />
          ))}
        </div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <Th label="Title" col="title" />
                <Th label="Type" col="type" />
                <Th label="Status" col="status" />
                <Th label="Added by" col="addedBy" />
                <Th label="Last updated" col="lastUpdated" />
                <th className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">Links</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {sortedForTable.map((asset, i) => {
                const needsReupload = isMondayFile(asset.fileUrl);
                return (
                  <tr key={asset.id} onClick={() => setDetailAsset(asset)} className={`group border-b border-ew-border hover:bg-navy/[0.02] transition-colors cursor-pointer ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    <td className="px-4 py-3 font-medium text-navy max-w-[260px]">
                      <span className="line-clamp-2">{asset.title}</span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap"><TypeTag type={asset.type} /></td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[asset.status] || 'bg-gray-100 text-gray-500'}`}>{asset.status || '—'}</span>
                    </td>
                    <td className="px-4 py-3 text-ew-body text-xs whitespace-nowrap">{asset.addedBy || '—'}</td>
                    <td className="px-4 py-3 text-ew-muted text-xs whitespace-nowrap">{fmtDate(asset.lastUpdated)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {asset.url && (
                          <a href={asset.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-navy hover:text-[#8403C5] transition-colors whitespace-nowrap">
                            <ExternalLink className="w-3 h-3" /> Open
                          </a>
                        )}
                        {asset.fileUrl && !needsReupload && (
                          <a href={asset.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-[11px] text-navy hover:text-[#8403C5] transition-colors whitespace-nowrap">
                            <Download className="w-3 h-3" /> File
                          </a>
                        )}
                        {needsReupload && (
                          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-600 whitespace-nowrap" title="Needs re-upload from Monday">
                            <AlertTriangle className="w-3 h-3" /> Re-upload needed
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => openEdit(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-navy hover:bg-ew-bg transition-colors" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => setDeleteConfirm(asset)} className="p-1.5 rounded-lg text-ew-muted hover:text-red-500 hover:bg-red-50 transition-colors" title="Delete"><Trash2 className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <AssetModal
          asset={editAsset}
          onClose={() => { setShowModal(false); setEditAsset(null); }}
          onSaved={(saved) => { handleSaved(saved); if (detailAsset?.id === saved.id) setDetailAsset(saved); }}
        />
      )}

      {detailAsset && (
        <AssetDetailPanel
          asset={detailAsset}
          onClose={() => setDetailAsset(null)}
          onUpdated={(updated) => { handleSaved(updated); setDetailAsset(updated); }}
          onEdit={() => { openEdit(detailAsset); }}
        />
      )}

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