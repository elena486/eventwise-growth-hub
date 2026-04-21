import React, { useState } from 'react';
import { Pencil, Check, X, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import ReactQuill from 'react-quill';
import { useAuth } from '@/lib/AuthContext';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

const QUILL_MODULES = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['link'],
    ['clean'],
  ],
};
const QUILL_FORMATS = ['header', 'bold', 'italic', 'underline', 'list', 'bullet', 'link'];

const DEFAULT_CONTENT = `
<h2>What we do</h2>
<p>Eventwise is the end-to-end event budgeting platform that gives event organisers, festivals, and agencies complete control of their finances. We replace spreadsheets with a single platform covering budgets, spend tracking, approvals, ticket revenue, and financial reporting — all updating live.</p>

<h2>Core platform features</h2>
<ul>
  <li>Budget creation and live spend tracking</li>
  <li>Approval workflows and budget holder permissions</li>
  <li>Ticket revenue and sales tracking (integrations with Eventbrite, Skiddle, Ticketmaster, See Tickets)</li>
  <li>Scenario planning and cash flow forecasting</li>
  <li>Multi-event reporting and organisation dashboard</li>
  <li>Xero integration — sync department codes, account codes, and payments</li>
</ul>

<h2>Who we serve</h2>
<p>Event planners, festival organisers, and event agencies of all sizes — particularly independent festivals and multi-event businesses in the UK that need proper financial infrastructure without enterprise complexity.</p>

<h2>Business context</h2>
<p>Founded by Chris Carter. UK-based. Currently raising a seed round and in active growth mode. Elena works remotely from South Africa (SAST, UTC+2). Website: <a href="https://eventwise.com" target="_blank">eventwise.com</a></p>
`.trim();

export default function AboutPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  const [titleDraft, setTitleDraft] = useState('');
  const [descDraft, setDescDraft] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  const displayHtml = page.richContent || DEFAULT_CONTENT;
  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  const startEdit = () => {
    setDraft(displayHtml);
    setTitleDraft(page.title || '');
    setDescDraft(page.description || '');
    setEditing(true);
  };

  const saveEdit = () => {
    onUpdate({ ...page, richContent: draft, title: titleDraft, description: descDraft, updatedAt: new Date().toISOString().slice(0, 10) });
    setEditing(false);
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">
        <p className="text-xs text-ew-muted mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {editing ? titleDraft : page.title}
        </p>

        <div className="bg-white rounded-xl border border-ew-border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              {editing ? (
                <>
                  <input autoFocus
                    className="text-xl font-bold text-navy border-b-2 border-[#8403C5] outline-none bg-transparent w-full mb-2"
                    value={titleDraft} onChange={e => setTitleDraft(e.target.value)} placeholder="Page title…" />
                  <input
                    className="text-sm text-ew-muted border-b border-ew-border outline-none bg-transparent w-full"
                    value={descDraft} onChange={e => setDescDraft(e.target.value)} placeholder="Add a description…" />
                </>
              ) : (
                <>
                  <h1 className="text-xl font-bold text-navy mb-1">{page.title}</h1>
                  {page.description ? <p className="text-sm text-ew-muted">{page.description}</p> : <p className="text-sm text-ew-muted/40 italic">No description</p>}
                </>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && !editing && <span className="text-[11px] text-ew-muted hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>}
              {canEdit && (editing ? (
                <>
                  <button onClick={saveEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]"><Check className="w-3 h-3" /> Save</button>
                  <button onClick={() => setEditing(false)} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg"><X className="w-3 h-3" /> Cancel</button>
                </>
              ) : (
                <>
                  <button onClick={startEdit} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg"><Pencil className="w-3 h-3" /> Edit</button>
                  <button onClick={() => setConfirmDelete(true)} className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /></button>
                </>
              ))}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-ew-border overflow-hidden">
          {editing ? (
            <div className="handbook-quill">
              <ReactQuill theme="snow" value={draft} onChange={setDraft} modules={QUILL_MODULES} formats={QUILL_FORMATS} placeholder="Write content here…" style={{ minHeight: 320 }} />
            </div>
          ) : (
            <div className="p-6 prose prose-sm max-w-none handbook-content" dangerouslySetInnerHTML={{ __html: displayHtml }} />
          )}
        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete page?</h3>
            <p className="text-sm text-ew-body mb-5">Delete <strong>{page.title}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={onDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}