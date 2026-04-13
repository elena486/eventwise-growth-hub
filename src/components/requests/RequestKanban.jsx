import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { format } from 'date-fns';
import { PRIORITY_STYLES, STATUS_STYLES, STATUSES } from './requestStyles';

export default function RequestKanban({ requests, onStatusChange, onSelect }) {
  const grouped = STATUSES.reduce((acc, s) => { acc[s] = requests.filter(r => r.status === s); return acc; }, {});

  const onDragEnd = (result) => {
    if (!result.destination) return;
    const newStatus = result.destination.droppableId;
    const reqId = result.draggableId;
    onStatusChange(reqId, newStatus);
  };

  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-4 overflow-x-auto pb-4">
        {STATUSES.map(status => (
          <div key={status} className="flex-shrink-0 w-64">
            <div className="flex items-center justify-between mb-3">
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${STATUS_STYLES[status]}`}>{status}</span>
              <span className="text-xs text-ew-muted font-medium">{grouped[status].length}</span>
            </div>
            <Droppable droppableId={status}>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`min-h-[120px] rounded-xl flex flex-col gap-2 p-2 transition-colors ${snapshot.isDraggingOver ? 'bg-[#8403C5]/5 border border-[#8403C5]/20' : 'bg-ew-bg/60'}`}
                >
                  {grouped[status].map((req, index) => (
                    <Draggable key={req.id} draggableId={req.id} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          onClick={() => onSelect(req)}
                          className={`bg-white border rounded-xl p-3 cursor-pointer hover:border-[#8403C5]/30 transition-all ${snapshot.isDragging ? 'shadow-lg border-[#8403C5]/30' : 'border-ew-border'}`}
                        >
                          <p className="text-sm font-semibold text-navy mb-2 leading-snug">{req.title}</p>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {req.requestedBy && (
                              <span className="text-[10px] font-medium bg-navy/10 text-navy px-2 py-0.5 rounded-full">{req.requestedBy}</span>
                            )}
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${PRIORITY_STYLES[req.priority]}`}>{req.priority}</span>
                          </div>
                          {req.deadline && (
                            <p className="text-[10px] text-ew-muted mt-2">Due {format(new Date(req.deadline), 'd MMM')}</p>
                          )}
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
  );
}