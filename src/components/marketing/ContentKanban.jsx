import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Plus, X, CalendarDays, LayoutGrid, GripVertical } from 'lucide-react';
import ContentItemDetail from './ContentItemDetail';
import ContentCalendar from './ContentCalendar';
import ConfirmDialog from '@/components/shared/ConfirmDialog';
import { useToast } from '@/components/shared/Toast';

const STATUSES = ['Ideas', 'In Progress', 'Ready to Publish', 'Scheduled', 'Published', 'Cancelled'];
const STATUS_COLORS = {
  'Ideas': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-50 text-blue-700',
  'Ready to Publish': 'bg-purple-50 text-[#8403C5]',
  'Scheduled': 'bg-amber-50 text-amber-700',
  'Published': 'bg-green-50 text-green-700',
  'Cancelled': 'bg-red-50 text-red-500',
};
const FORMAT_COLORS = {
  'Written': 'bg-blue-50 text-blue-600',
  'Video': 'bg-purple-50 text-purple-600',
  'Carousel': 'bg-orange-50 text-orange-600',
  'Poll': 'bg-green-50 text-green-600',
};
const QUICK_FILTERS = ['All', 'Published', 'Upcoming', 'This Week'];

function getThisWeek() {
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const mon = new Date(now); mon.setDate(now.getDate() + diff); mon.setHours(0,0,0,0);
  const sun = new Date(mon); sun.setDate(mon.getDate() + 6); sun.setHours(23,59,59,999);
  return { start: mon, end: sun };
}

export default function ContentKanban({ calendarView = false, onSetCalendarView, initialSelected = null, onClearSelected }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('All');
  const [selected, setSelected] = useState(initialSelected); // null | 'new' | item
  const [confirmId, setConfirmId] = useState(null);
  const setCalendarView = onSetCalendarView || (() => {});

  React.useEffect(() => {
    if (initialSelected) { setSelected(initialSelected); onClearSelected && onClearSelected(); }
  }, [initialSelected]);

  const toast = useToast();
  const load = () => base44.entities.ContentItem.list('-publishDate', 300).then(setItems);
  useEffect(() => { load(); }, []);

  const filteredItems = items.filter(item => {
    if (filter === 'Published') return item.status === 'Published';
    if (filter === 'Upcoming') {
      if (item.status !== 'Scheduled') return false;
      return !item.publishDate || new Date(item.publishDate) >= new Date();
    }
    if (filter === 'This Week') {
      if (item.status !== 'Scheduled' || !item.publishDate) return false;
      const { start, end } = getThisWeek();
      const d = new Date(item.publishDate);
      return d >= start && d <= end;
    }
    return true;
  });

  const grouped = STATUSES.reduce((acc, s) => {
    acc[s] = filteredItems.filter(i => i.status === s);
    return acc;
  }, {});

  const onDragEnd = async (result) => {
    if (!result.destination) return;
    if (result.source.droppableId === result.destination.droppableId) return;
    const newStatus = result.destination.droppableId;
    const itemId = result.draggableId;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, status: newStatus } : i));
    await base44.entities.ContentItem.update(itemId, { status: newStatus });
    toast.statusUpdated(`✓ Moved to ${newStatus}`);
  };

  const NUM_FIELDS = ['impressions', 'reactions', 'comments', 'reposts', 'linkClicks', 'profileVisits', 'reach'];
  const handleSave = async (data) => {
    const cleaned = { ...data };
    NUM_FIELDS.forEach(f => {
      if (cleaned[f] === '' || cleaned[f] == null) delete cleaned[f];
      else cleaned[f] = Number(cleaned[f]);
    });
    if (cleaned.id) await base44.entities.ContentItem.update(cleaned.id, cleaned);
    else await base44.entities.ContentItem.create(cleaned);
    setSelected(null);
    load();
  };

  const handleDelete = async (id) => {
    await base44.entities.ContentItem.delete(id);
    setConfirmId(null);
    setSelected(null);
    load();
  };

  if (selected) return (
    <ContentItemDetail
      item={selected === 'new' ? null : selected}
      onSave={handleSave}
      onBack={() => setSelected(null)}
      onDelete={handleDelete}
    />
  );

  if (calendarView) return (
    <ContentCalendar items={items} onSelectItem={setSelected} onToggle={() => setCalendarView(false)} onAdd={() => setSelected('new')} onBack={() => setCalendarView(false)} />
  );

  return (
    <div className="flex flex-col flex-1 overflow-hidden bg-[#f5f6fa]">
      {/* Toolbar */}
      <div className="px-6 py-3 bg-white border-b border-gray-100 flex items-center gap-3 shrink-0">
        <div className="flex gap-1">
          {QUICK_FILTERS.map(f => (
            <button key={f} onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors border ${filter === f ? 'bg-[#1a1f3c] text-white border-[#1a1f3c]' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          {/* Calendar button removed — toggle is now in the tab bar above */}
          <button onClick={() => setSelected('new')}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#8403C5] text-white rounded-lg text-xs font-semibold hover:bg-[#6d02a3]">
            <Plus className="w-3.5 h-3.5" /> New Content
          </button>
        </div>
      </div>

      {/* Kanban */}
      <div className="flex-1 overflow-x-auto p-4">
        <DragDropContext onDragEnd={onDragEnd}>
          <div className="flex gap-3 h-full min-w-max">
            {STATUSES.map(status => (
              <div key={status} className="w-56 flex flex-col">
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLORS[status]}`}>{status}</span>
                  <span className="text-xs text-gray-400">{grouped[status].length}</span>
                </div>
                <Droppable droppableId={status}>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps}
                      className={`flex-1 rounded-xl p-2 min-h-[100px] transition-colors ${snapshot.isDraggingOver ? 'bg-purple-50' : 'bg-gray-100'}`}>
                      {grouped[status].map((item, index) => (
                        <Draggable key={item.id} draggableId={item.id} index={index}>
                          {(prov, snap) => (
                            <div ref={prov.innerRef} {...prov.draggableProps}
                              onClick={() => setSelected(item)}
                              className={`bg-white rounded-xl p-3 mb-2 border cursor-pointer shadow-sm hover:shadow-md transition-shadow ${snap.isDragging ? 'shadow-lg border-[#8403C5]/30' : 'border-gray-200'}`}>
                              {/* Drag handle + status */}
                              <div className="flex items-center justify-between mb-2">
                                <span {...prov.dragHandleProps} onClick={e => e.stopPropagation()} className="text-gray-300 hover:text-gray-500 cursor-grab active:cursor-grabbing">
                                  <GripVertical className="w-3.5 h-3.5" />
                                </span>
                                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-500'}`}>{item.status}</span>
                              </div>
                              {item.assetUrl && (
                                <div className="mb-2 -mx-1">
                                  {item.assetUrl.match(/\.(mp4|mov)/i)
                                    ? <video src={item.assetUrl} className="w-full rounded-lg max-h-24 object-cover" muted />
                                    : <img src={item.assetUrl} alt="" className="w-full rounded-lg max-h-24 object-cover" />
                                  }
                                </div>
                              )}
                              <p className="text-xs font-semibold text-gray-900 mb-2 line-clamp-2">{item.title}</p>
                              {item.pagePostedOn && (
                                <div className="flex flex-wrap gap-1 mb-2">
                                  {(item.pagePostedOn || '').split(',').map(p => p.trim()).filter(Boolean).map(p => (
                                    <span key={p} className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${p.includes('Chris') ? 'bg-blue-50 text-blue-600' : 'bg-purple-50 text-[#8403C5]'}`}>{p}</span>
                                  ))}
                                </div>
                              )}
                              <div className="flex items-center justify-between">
                                {item.format && <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${FORMAT_COLORS[item.format] || 'bg-gray-50 text-gray-500'}`}>{item.format}</span>}
                                {item.publishDate && <span className="text-[10px] text-gray-400">{item.publishDate}</span>}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            ))}
          </div>
        </DragDropContext>
      </div>

      {confirmId && (
        <ConfirmDialog onConfirm={() => handleDelete(confirmId)} onCancel={() => setConfirmId(null)} />
      )}
    </div>
  );
}