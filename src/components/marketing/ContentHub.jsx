import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ExternalLink, Calendar, List, Trash2, X } from 'lucide-react';
import { format, startOfWeek, endOfWeek, parseISO, isValid } from 'date-fns';
import ContentItemModal from './ContentItemModal';
import PRModal from './PRModal';
import PRTable from './PRTable';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const PAGES = ['Eventwise Page', 'Personal Chris'];

const STATUS_COLORS = {
  'Ideas': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Ready to Publish': 'bg-purple-50 text-purple-700',
  'Scheduled': 'bg-amber-50 text-amber-700',
  'Published': 'bg-green-50 text-green-700',
  'Cancelled': 'bg-red-50 text-red-500',
};

const VIEWS = [
  { id: 'all', label: 'All Content' },
  { id: 'ready', label: 'Ready to Publish' },
  { id: 'scheduled', label: 'Scheduled' },
  { id: 'published', label: 'Published' },
  { id: 'pr', label: 'PR Coverage' },
  { id: 'ideas_board', label: 'Visual Marketing Ideas' },
  { id: 'lead_magnets', label: 'Lead Magnets' },
];

export default function ContentHub() {
  const [items, setItems] = useState([]);
  const [view, setView] = useState('all');
  const [pageFilter, setPageFilter] = useState('');
  const [calView, setCalView] = useState(false);
  const [thisWeek, setThisWeek] = useState(false);
  const [modal, setModal] = useState(null); // null | { type: 'content' | 'pr', item?: {} }

  const load = () => base44.entities.ContentItem.list('-publishDate', 200).then(setItems);
  useEffect(() => { load(); }, []);

  const handleSave = async (data) => {
    if (data.id) await base44.entities.ContentItem.update(data.id, data);
    else await base44.entities.ContentItem.create(data);
    setModal(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContentItem.delete(id);
    load();
  };

  const filtered = items.filter(item => {
    if (view === 'ready') return item.status === 'Ready to Publish';
    if (view === 'scheduled') return item.status === 'Scheduled';
    if (view === 'published') return item.status === 'Published';
    if (pageFilter && !((item.pagePostedOn || '').includes(pageFilter))) return false;
    if (thisWeek) {
      if (!item.publishDate) return false;
      try {
        const d = parseISO(item.publishDate);
        const now = new Date();
        return d >= startOfWeek(now, { weekStartsOn: 1 }) && d <= endOfWeek(now, { weekStartsOn: 1 });
      } catch { return false; }
    }
    return true;
  });

  if (view === 'pr') return <div className="p-8"><PRTable /><button onClick={() => setModal({ type: 'pr' })} className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors"><Plus className="w-4 h-4" /> New PR Coverage</button>{modal?.type === 'pr' && <PRModal onClose={() => setModal(null)} />}</div>;
  if (view === 'ideas_board') return <IdeasBoard />;
  if (view === 'lead_magnets') return <LeadMagnets />;

  return (
    <div className="p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-3 mb-5 flex-wrap">
        <div className="flex gap-1 bg-white border border-ew-border rounded-lg p-1">
          {VIEWS.map(v => (
            <button key={v.id} onClick={() => setView(v.id)} className={`px-3 py-1 rounded text-xs font-medium transition-colors ${view === v.id ? 'bg-navy text-white' : 'text-ew-body hover:bg-ew-bg'}`}>{v.label}</button>
          ))}
        </div>
        <select className="border border-ew-border rounded-lg px-2 py-1 text-xs text-navy" value={pageFilter} onChange={e => setPageFilter(e.target.value)}>
          <option value="">All pages</option>
          {PAGES.map(p => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={() => setThisWeek(!thisWeek)}
          className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${thisWeek ? 'bg-navy text-white border-navy' : 'border-ew-border text-ew-body hover:bg-ew-bg'}`}
        >
          This week
        </button>
        <button onClick={() => setCalView(!calView)} className={`px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${calView ? 'bg-navy text-white border-navy' : 'border-ew-border text-ew-body hover:bg-ew-bg'}`}>
          <Calendar className="w-3.5 h-3.5 inline mr-1" />Calendar
        </button>
        <div className="ml-auto flex gap-2">
          <button onClick={() => setModal({ type: 'content' })} className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors">
            <Plus className="w-4 h-4" /> New Content
          </button>
          <button onClick={() => setModal({ type: 'pr' })} className="flex items-center gap-1.5 px-4 py-2 border border-ew-border rounded-lg text-sm font-medium text-ew-body hover:bg-ew-bg transition-colors">
            <Plus className="w-4 h-4" /> New PR Coverage
          </button>
        </div>
      </div>

      {/* Grouped table by status */}
      {!calView ? (
        <div className="space-y-6">
          {STATUSES.map(status => {
            const group = filtered.filter(i => i.status === status);
            if (view !== 'all' && group.length === 0) return null;
            return (
              <div key={status}>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                  <span className="text-xs text-ew-muted">{group.length}</span>
                </div>
                {group.length === 0 ? (
                  <p className="text-xs text-ew-muted italic ml-1">No items</p>
                ) : (
                  <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
                    <table className="w-full text-sm">
                      <thead className="bg-ew-footer border-b border-ew-border">
                        <tr>
                          <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Title</th>
                          <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Format</th>
                          <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Page</th>
                          <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Publish Date</th>
                          {status === 'Published' && <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">Performance</th>}
                          <th className="text-left text-xs font-semibold text-ew-muted px-4 py-2">URL</th>
                          <th />
                        </tr>
                      </thead>
                      <tbody>
                        {group.map(item => (
                          <tr key={item.id} className="border-b border-ew-border last:border-0 hover:bg-navy/[0.02] cursor-pointer" onClick={() => setModal({ type: 'content', item })}>
                            <td className="px-4 py-2.5 font-medium text-navy">{item.title}</td>
                            <td className="px-4 py-2.5 text-ew-muted">{item.format || '—'}</td>
                            <td className="px-4 py-2.5 text-ew-muted text-xs">{item.pagePostedOn || '—'}</td>
                            <td className="px-4 py-2.5 text-ew-muted">{item.publishDate || '—'}</td>
                            {status === 'Published' && <td className="px-4 py-2.5 text-ew-body text-xs max-w-[160px] truncate">{item.performance || '—'}</td>}
                            <td className="px-4 py-2.5">
                              {item.publishedUrl ? (
                                <a href={item.publishedUrl} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()} className="text-navy hover:underline flex items-center gap-1">
                                  <ExternalLink className="w-3 h-3" /> View
                                </a>
                              ) : <span className="text-ew-muted">—</span>}
                            </td>
                            <td className="px-4 py-2.5">
                              <button onClick={e => { e.stopPropagation(); handleDelete(item.id); }} className="text-ew-muted hover:text-red-500 p-1"><Trash2 className="w-3.5 h-3.5" /></button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <CalendarView items={filtered} />
      )}

      {modal?.type === 'content' && (
        <ContentItemModal item={modal.item} onSave={handleSave} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'pr' && (
        <PRModal onClose={() => setModal(null)} />
      )}
    </div>
  );
}

function CalendarView({ items }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay();

  const byDay = {};
  items.forEach(item => {
    if (!item.publishDate) return;
    try {
      const d = parseISO(item.publishDate);
      if (d.getFullYear() === year && d.getMonth() === month) {
        const day = d.getDate();
        if (!byDay[day]) byDay[day] = [];
        byDay[day].push(item);
      }
    } catch {}
  });

  const cells = [];
  for (let i = 0; i < (firstDay === 0 ? 6 : firstDay - 1); i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="bg-white border border-ew-border rounded-xl p-5">
      <p className="text-sm font-semibold text-navy mb-4">{format(new Date(year, month, 1), 'MMMM yyyy')}</p>
      <div className="grid grid-cols-7 gap-1">
        {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
          <div key={d} className="text-center text-xs font-semibold text-ew-muted py-1">{d}</div>
        ))}
        {cells.map((day, i) => (
          <div key={i} className={`min-h-[60px] rounded-lg p-1 text-xs ${day ? 'bg-ew-footer' : ''}`}>
            {day && <div className="font-semibold text-navy mb-1">{day}</div>}
            {day && (byDay[day] || []).map(item => (
              <div key={item.id} className="bg-navy text-white rounded px-1 py-0.5 mb-0.5 truncate text-[10px]">{item.title}</div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function IdeasBoard() {
  const [ideas, setIdeas] = useState(localStorage.getItem('ew_visual_ideas') || '');
  return (
    <div className="p-8 max-w-2xl">
      <h2 className="text-base font-bold text-navy mb-2">Visual Marketing Ideas</h2>
      <p className="text-xs text-ew-muted mb-4">Free-form ideas board for visual content concepts. Auto-saved locally.</p>
      <textarea
        className="w-full h-80 border border-ew-border rounded-xl p-4 text-sm text-navy focus:outline-none focus:border-navy resize-none"
        value={ideas}
        onChange={e => { setIdeas(e.target.value); localStorage.setItem('ew_visual_ideas', e.target.value); }}
        placeholder="Jot down visual content ideas…"
      />
    </div>
  );
}

function LeadMagnets() {
  const magnets = [
    { name: 'Budget Health Check', url: '' },
    { name: 'Event Budget Template', url: '' },
  ];
  return (
    <div className="p-8 max-w-xl">
      <h2 className="text-base font-bold text-navy mb-1">Lead Magnets</h2>
      <p className="text-xs text-ew-muted mb-5">Rotate these into post comments and copy after most posts.</p>
      <div className="bg-white border border-ew-border rounded-xl p-5 space-y-4">
        {magnets.map(m => (
          <div key={m.name} className="flex items-center justify-between">
            <span className="text-sm font-medium text-navy">{m.name}</span>
            {m.url ? (
              <a href={m.url} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-xs text-navy hover:underline"><ExternalLink className="w-3 h-3" /> Open</a>
            ) : (
              <span className="text-xs text-ew-muted italic">Link TBC</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}