import React from 'react';
import { format } from 'date-fns';
import { ArrowLeft, Paperclip } from 'lucide-react';
import { PRIORITY_STYLES, STATUS_STYLES, CATEGORY_STYLES } from './requestStyles';
import InlineCell from '@/components/shared/InlineCell';
import { base44 } from '@/api/base44Client';

const STATUSES = ['New', 'In Progress', 'Waiting', 'Done', 'Cancelled'];
const CATEGORIES = ['Marketing', 'Design', 'Content', 'Ops', 'Tech', 'Other', 'Self'];
const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];

export default function RequestDetail({ request, onBack, onUpdate }) {
  const save = (field) => async (value) => {
    await base44.entities.Request.update(request.id, { [field]: value });
    onUpdate({ ...request, [field]: value });
  };

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm max-w-3xl">
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-ew-muted hover:text-navy mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to board
      </button>

      <div className="flex items-start justify-between mb-6">
        <div>
          <p className="text-xs text-ew-muted font-medium mb-1">#{request.requestNumber}</p>
          <h2 className="text-xl font-bold text-navy">{request.title}</h2>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[request.priority]}`}>{request.priority}</span>
          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[request.status]}`}>{request.status}</span>
        </div>
      </div>

      <div className="bg-white border border-ew-border rounded-xl divide-y divide-ew-border">
        <Row label="Title"><InlineCell value={request.title} onSave={save('title')} className="text-sm text-navy font-semibold" /></Row>
        <Row label="Requested by"><InlineCell value={request.requestedBy} onSave={save('requestedBy')} className="text-sm text-ew-body" /></Row>
        <Row label="Category">
          <InlineCell value={request.category} onSave={save('category')} type="select" options={CATEGORIES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORY_STYLES[request.category] || 'bg-gray-100 text-gray-600'}`}>{request.category}</span>} />
        </Row>
        <Row label="Priority">
          <InlineCell value={request.priority} onSave={save('priority')} type="select" options={PRIORITIES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${PRIORITY_STYLES[request.priority]}`}>{request.priority}</span>} />
        </Row>
        <Row label="Status">
          <InlineCell value={request.status} onSave={save('status')} type="select" options={STATUSES}
            displayEl={<span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[request.status]}`}>{request.status}</span>} />
        </Row>
        <Row label="Deadline"><InlineCell value={request.deadline || ''} onSave={save('deadline')} type="date" displayEl={<span className="text-sm text-ew-body">{request.deadline ? format(new Date(request.deadline), 'd MMM yyyy') : '—'}</span>} /></Row>
        <Row label="Submitted">{request.submittedAt ? format(new Date(request.submittedAt), 'd MMM yyyy, HH:mm') : '—'}</Row>
        <Row label="Description">
          <InlineCell value={request.description} onSave={save('description')} type="textarea"
            displayEl={<p className="text-sm text-ew-body whitespace-pre-wrap">{request.description || <span className="text-ew-muted italic">No description</span>}</p>} />
        </Row>
        <Row label="Extra context">
          <InlineCell value={request.extraNotes} onSave={save('extraNotes')} type="textarea"
            displayEl={<p className="text-sm text-ew-body whitespace-pre-wrap">{request.extraNotes || <span className="text-ew-muted italic">None</span>}</p>} />
        </Row>
        <Row label="Elena's notes">
          <InlineCell value={request.notes} onSave={save('notes')} type="textarea" placeholder="Add notes…"
            displayEl={request.notes ? <p className="text-sm text-ew-body whitespace-pre-wrap">{request.notes}</p> : null} />
        </Row>
        {request.attachmentUrl && (
          <Row label="Attachment">
            <a href={request.attachmentUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline">
              <Paperclip className="w-3.5 h-3.5" />
              {request.attachmentName || 'View attachment'}
            </a>
          </Row>
        )}
      </div>
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="px-5 py-4 flex items-start gap-6">
      <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide w-32 shrink-0 pt-0.5">{label}</p>
      <div className="flex-1 min-w-0 text-sm text-ew-body">{children}</div>
    </div>
  );
}