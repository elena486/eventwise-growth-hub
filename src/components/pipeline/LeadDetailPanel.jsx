import React, { useState, useEffect, useRef, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import MentionTextarea, { sendMentionNotifications } from '@/components/shared/MentionTextarea';
import {
  X, Mail, ExternalLink, Phone, Plus, Pencil, Trash2,
  Check, ChevronDown, ChevronUp, AlertTriangle, Star, Link
} from 'lucide-react';
import MultiFileUpload from '@/components/shared/MultiFileUpload';
import StageBadge from './Stagebadge';
import { logActivity } from '@/lib/logActivity';

// ─── Constants ────────────────────────────────────────────────────────────────

const STAGES = ['New Lead', 'Contacted', 'Discovery Call', 'Demo Booked', 'Proposal Sent', 'Negotiation', 'Closed Won', 'Closed Lost', 'On Hold'];
const PLANS = ['Starter', 'Growth', 'Scale', 'Professional', 'Custom'];
const LEAD_OWNERS = ['Chris', 'Ramesh', 'Elena', 'George', 'Martinique', 'Sreeja'];
const CONTRACT_LENGTHS = ['Monthly rolling', '6 months', '12 months', '24 months'];
const INDUSTRIES = ['Festival', 'Event Organiser', 'Event Agency', 'Corporate Events', 'Venue', 'Accountancy', 'Other'];
const HEARD_ABOUT = ['LinkedIn', 'Referral', 'Inbound', 'Outbound', 'Event', 'EPS (Event Production Show)', 'EBL (Event Buyers Live)', 'AAA (Access All Areas)', 'Other'];
const ACCOUNTING_SERVICE_OPTIONS = ['Not included', 'Included in plan', 'Included in accounting service fee', 'Separate fee'];
const ONBOARDING_PLANS = ['Basic', 'Standard', 'Enterprise', 'Option 1'];
const LOG_TYPES = ['Call', 'Email', 'Demo', 'Meeting', 'LinkedIn', 'Note', 'Time logged'];
const LOG_MEMBERS = ['Chris', 'Ramesh', 'George', 'Elena', 'Martinique', 'Sreeja'];
const TRANSCRIPT_TYPES = ['Call', 'Meeting', 'Demo'];

const LOG_TYPE_ICONS = {
  Call: '📞',
  Email: '✉️',
  Demo: '🎥',
  Meeting: '🤝',
  LinkedIn: '💼',
  Note: '📝',
  'Time logged': '⏱',
};
const PROPOSAL_STATUSES = ['Not sent', 'Sent', 'Accepted', 'Declined'];

const LOG_TYPE_STYLES = {
  Call: 'bg-blue-100 text-blue-700',
  Email: 'bg-gray-100 text-gray-600',
  Demo: 'bg-purple-100 text-purple-700',
  Meeting: 'bg-green-100 text-green-700',
  LinkedIn: 'bg-[#DBEAFE] text-[#1D4ED8]',
  Note: 'bg-amber-100 text-amber-700',
  'Time logged': 'bg-[#FFFBEB] text-[#A16207]',
};

function fmtActivityDate(isoOrDate) {
  if (!isoOrDate) return '';
  try {
    const d = new Date(isoOrDate);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    const time = format(d, 'HH:mm');
    if (isToday) return `Today at ${time}`;
    const isThisYear = d.getFullYear() === now.getFullYear();
    return format(d, isThisYear ? 'd MMM' : 'd MMM yyyy') + ` at ${time}`;
  } catch { return String(isoOrDate); }
}

function nowDateTimeLocal() {
  const d = new Date();
  return format(d, "yyyy-MM-dd'T'HH:mm");
}

// TABS are computed dynamically based on data — see below in component

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmt(n) { return '£' + Math.round(n || 0).toLocaleString('en-GB'); }
function fmtDate(d) { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d || '—'; } }
function fmtDateTime(d) { try { return format(new Date(d), 'd MMM yyyy, HH:mm'); } catch { return d || '—'; } }
function todayStr() { return format(new Date(), 'yyyy-MM-dd'); }

function SectionTitle({ children }) {
  return <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em] mb-3">{children}</p>;
}

function FieldRow({ label, children }) {
  return (
    <div className="mb-3">
      <label className="block text-[11px] font-medium text-ew-muted mb-1">{label}</label>
      {children}
    </div>
  );
}

const ic = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

function Toggle({ value, onChange }) {
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={() => onChange(!value)}
        className={`relative inline-flex h-5 w-9 rounded-full transition-colors shrink-0 ${value ? 'bg-[#8403C5]' : 'bg-gray-200'}`}>
        <span className={`inline-block w-3.5 h-3.5 bg-white rounded-full shadow transition-transform mt-0.5 ${value ? 'translate-x-4' : 'translate-x-1'}`} />
      </button>
      <span className="text-sm text-ew-body">{value ? 'Yes' : 'No'}</span>
    </div>
  );
}

// ─── Multi-contact editor ─────────────────────────────────────────────────────

function ContactsSection({ contacts, onChange }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const addContact = () => {
    if (contacts.length >= 5) return;
    onChange([...contacts, { id: Date.now(), firstName: '', lastName: '', jobTitle: '', email: '', phone: '', primary: contacts.length === 0 }]);
  };

  const updateContact = (id, field, value) => onChange(contacts.map(c => c.id === id ? { ...c, [field]: value } : c));
  const setPrimary = (id) => onChange(contacts.map(c => ({ ...c, primary: c.id === id })));
  const deleteContact = (id) => {
    const remaining = contacts.filter(c => c.id !== id);
    if (contacts.find(c => c.id === id)?.primary && remaining.length > 0) remaining[0] = { ...remaining[0], primary: true };
    onChange(remaining);
    setDeleteConfirm(null);
  };

  const ic2 = 'w-full text-sm border border-ew-border rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

  return (
    <div>
      <div className="space-y-3">
        {contacts.map((contact, idx) => (
          <div key={contact.id} className={`border rounded-xl p-4 ${contact.primary ? 'border-[#8403C5]/30 bg-[#FAFBFE]' : 'border-ew-border bg-white'}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <button onClick={() => setPrimary(contact.id)} title={contact.primary ? 'Primary contact' : 'Set as primary'}
                  className={`transition-colors ${contact.primary ? 'text-amber-400' : 'text-gray-300 hover:text-amber-400'}`}>
                  <Star className={`w-4 h-4 ${contact.primary ? 'fill-amber-400' : ''}`} />
                </button>
                <span className="text-[11px] font-semibold text-ew-muted uppercase tracking-wide">
                  {contact.primary ? 'Primary contact' : `Contact ${idx + 1}`}
                </span>
              </div>
              <button onClick={() => { if (contact.primary) setDeleteConfirm(contact.id); else deleteContact(contact.id); }}
                className="text-ew-muted hover:text-red-500 transition-colors">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input className={ic2} placeholder="First name" value={contact.firstName || ''} onChange={e => updateContact(contact.id, 'firstName', e.target.value)} />
              <input className={ic2} placeholder="Last name" value={contact.lastName || ''} onChange={e => updateContact(contact.id, 'lastName', e.target.value)} />
              <input className={ic2 + ' col-span-2'} placeholder="Job title" value={contact.jobTitle || ''} onChange={e => updateContact(contact.id, 'jobTitle', e.target.value)} />
              <div className="relative">
                <input className={ic2 + ' pr-7'} type="email" placeholder="Email" value={contact.email || ''} onChange={e => updateContact(contact.id, 'email', e.target.value)} />
                {contact.email && <a href={`mailto:${contact.email}`} className="absolute right-2 top-2 text-ew-muted hover:text-[#8403C5]"><Mail className="w-3.5 h-3.5" /></a>}
              </div>
              <input className={ic2} placeholder="Phone" value={contact.phone || ''} onChange={e => updateContact(contact.id, 'phone', e.target.value)} />
            </div>
          </div>
        ))}
      </div>
      <button onClick={addContact} disabled={contacts.length >= 5}
        className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-[#8403C5] hover:underline disabled:opacity-40 disabled:cursor-not-allowed">
        <Plus className="w-3 h-3" /> Add contact {contacts.length >= 5 && <span className="text-ew-muted font-normal">(max 5)</span>}
      </button>
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-2">Delete primary contact?</p>
            <p className="text-sm text-ew-body mb-4">This is the primary contact. Are you sure?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => deleteContact(deleteConfirm)} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Activity Log ─────────────────────────────────────────────────────────────

function groupEntriesByDate(entries) {
  const groups = {};
  const today = new Date().toDateString();
  const yesterday = new Date(Date.now() - 86400000).toDateString();
  entries.forEach(entry => {
    let d; try { d = new Date(entry.createdAt || entry.datetime || entry.date); } catch { d = new Date(); }
    let key;
    if (d.toDateString() === today) key = 'Today';
    else if (d.toDateString() === yesterday) key = 'Yesterday';
    else { try { key = format(d, 'd MMM yyyy'); } catch { key = 'Earlier'; } }
    if (!groups[key]) groups[key] = [];
    groups[key].push(entry);
  });
  return groups;
}

function ActivityLog({ entries, onSave, currentUser }) {
  const [adding, setAdding] = useState(false);
  const [newEntry, setNewEntry] = useState({ type: 'Note', datetime: nowDateTimeLocal(), summary: '', addedBy: currentUser || 'Chris', transcriptLink: '', transcriptFileUrl: '', transcriptFileName: '' });
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [uploadingFile, setUploadingFile] = useState(false);

  const openForm = (defaultType = 'Note') => {
    setNewEntry({ type: defaultType, datetime: nowDateTimeLocal(), summary: '', addedBy: currentUser || 'Chris', transcriptLink: '', transcriptFileUrl: '', transcriptFileName: '' });
    setAdding(true);
  };

  const canSave = () => {
    if (newEntry.type === 'Time logged') return !!(newEntry.category && newEntry.description && newEntry.duration);
    return !!newEntry.summary.trim();
  };

  const addEntry = () => {
    if (!canSave()) return;
    const iso = newEntry.datetime ? new Date(newEntry.datetime).toISOString() : new Date().toISOString();
    onSave([{ ...newEntry, id: Date.now(), createdAt: iso }, ...entries]);
    setAdding(false);
  };

  const saveEdit = (id) => {
    onSave(entries.map(e => e.id === id ? { ...e, ...editDraft } : e));
    setEditingId(null);
  };

  const deleteEntry = (id) => {
    onSave(entries.filter(e => e.id !== id));
    setDeleteConfirm(null);
  };

  const handleFileUpload = async (file, target) => {
    setUploadingFile(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      if (target === 'new') setNewEntry(n => ({ ...n, transcriptFileUrl: file_url, transcriptFileName: file.name }));
      else setEditDraft(d => ({ ...d, transcriptFileUrl: file_url, transcriptFileName: file.name }));
    } catch {}
    setUploadingFile(false);
  };

  const grouped = groupEntriesByDate([...entries].sort((a, b) => new Date(b.createdAt || b.datetime || b.date || 0) - new Date(a.createdAt || a.datetime || a.date || 0)));
  const groupOrder = Object.keys(grouped);

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <SectionTitle>Activity Log</SectionTitle>
        {!adding && (
          <button onClick={() => openForm('Note')}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#8403C5] hover:bg-[#7002A8] rounded-lg transition-colors">
            <Plus className="w-3.5 h-3.5" /> Log activity
          </button>
        )}
      </div>

      {/* Add form */}
      {adding && (
        <div className="bg-[#F7F8FC] border border-ew-border rounded-xl p-4 mb-5 space-y-3">
          {/* Type selector */}
          <div>
            <label className="block text-[11px] font-medium text-ew-muted mb-2">Type</label>
            <div className="flex flex-wrap gap-1.5">
              {LOG_TYPES.map(t => (
                <button key={t} type="button"
                  onClick={() => setNewEntry(n => ({ ...n, type: t }))}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    newEntry.type === t
                      ? (LOG_TYPE_STYLES[t] || 'bg-amber-100 text-amber-700') + ' border-transparent ring-2 ring-offset-1 ring-[#8403C5]/30'
                      : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
                  }`}>
                  <span>{LOG_TYPE_ICONS[t]}</span>{t}
                </button>
              ))}
            </div>
          </div>

          {/* Date + time */}
          <div>
            <label className="block text-[11px] font-medium text-ew-muted mb-1">Date &amp; time</label>
            <input type="datetime-local" className={ic + ' text-sm'}
              value={newEntry.datetime}
              onChange={e => setNewEntry(n => ({ ...n, datetime: e.target.value }))} />
          </div>

          {/* Time logged fields */}
          {newEntry.type === 'Time logged' ? (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-ew-muted mb-1">Category <span className="text-red-400">*</span></label>
                  <input className={ic} value={newEntry.category || ''} onChange={e => setNewEntry(n => ({ ...n, category: e.target.value }))} placeholder="e.g. Sales & Outbound" />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-ew-muted mb-1">Duration <span className="text-red-400">*</span></label>
                  <input className={ic} value={newEntry.duration || ''} onChange={e => setNewEntry(n => ({ ...n, duration: e.target.value }))} placeholder="e.g. 1h 30m" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ew-muted mb-1">Task / Description <span className="text-red-400">*</span></label>
                <input className={ic} value={newEntry.description || ''} onChange={e => setNewEntry(n => ({ ...n, description: e.target.value }))} placeholder="What was worked on?" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-ew-muted mb-1">Notes <span className="font-normal">(optional)</span></label>
                <textarea className={ic + ' h-16 resize-none'} value={newEntry.summary || ''} onChange={e => setNewEntry(n => ({ ...n, summary: e.target.value }))} />
              </div>
            </>
          ) : (
            <div>
              <label className="block text-[11px] font-medium text-ew-muted mb-1">Summary <span className="text-red-400">*</span></label>
              <MentionTextarea
                className={ic + ' h-24 resize-none'}
                value={newEntry.summary}
                onChange={v => setNewEntry(n => ({ ...n, summary: v }))}
                placeholder="What happened? Key points, outcomes, anything relevant..."
                rows={4}
                author={newEntry.addedBy}
                section="Pipeline / Activity Log"
                appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline"
              />
            </div>
          )}

          {/* Transcript — for Call/Meeting/Demo */}
          {TRANSCRIPT_TYPES.includes(newEntry.type) && (
            <div>
              <label className="block text-[11px] font-medium text-ew-muted mb-1">Transcript link <span className="font-normal">(optional)</span></label>
              <input className={ic} value={newEntry.transcriptLink || ''} onChange={e => setNewEntry(n => ({ ...n, transcriptLink: e.target.value }))} placeholder="https://…" />
              <div className="mt-1.5 flex items-center gap-2">
                <label className="text-[11px] text-ew-muted">Or upload file:</label>
                <label className="cursor-pointer text-[11px] text-[#8403C5] hover:underline">
                  {uploadingFile ? 'Uploading…' : newEntry.transcriptFileName ? `✓ ${newEntry.transcriptFileName}` : 'Choose file'}
                  <input type="file" className="hidden" disabled={uploadingFile} onChange={e => { if (e.target.files?.[0]) handleFileUpload(e.target.files[0], 'new'); }} />
                </label>
                {newEntry.transcriptFileName && <button onClick={() => setNewEntry(n => ({ ...n, transcriptFileUrl: '', transcriptFileName: '' }))} className="text-[11px] text-ew-muted hover:text-red-500"><X className="w-3 h-3" /></button>}
              </div>
            </div>
          )}

          {/* Added by */}
          <div>
            <label className="block text-[11px] font-medium text-ew-muted mb-1">Added by</label>
            <select className={ic} value={newEntry.addedBy}
              onChange={e => setNewEntry(n => ({ ...n, addedBy: e.target.value }))}>
              {LOG_MEMBERS.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>

          <div className="flex gap-2 justify-end pt-1">
            <button onClick={() => setAdding(false)}
              className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg border border-ew-border transition-colors">Cancel</button>
            <button onClick={addEntry} disabled={!canSave()}
              className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40 transition-colors">Save</button>
          </div>
        </div>
      )}

      {/* Feed grouped by date */}
      {entries.length === 0 && !adding ? (
        <div className="text-center py-10 border border-dashed border-ew-border rounded-xl">
          <p className="text-2xl mb-2">📋</p>
          <p className="text-sm text-ew-muted">No activity logged yet.</p>
          <button onClick={() => openForm('Note')} className="mt-3 text-xs text-[#8403C5] hover:underline font-semibold">Log your first entry</button>
        </div>
      ) : (
        <div className="space-y-4">
          {groupOrder.map(group => (
            <div key={group}>
              <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-2 px-1">{group}</p>
              <div className="space-y-2">
                {grouped[group].map(entry => (
                  <div key={entry.id}
                    className="group flex gap-3 bg-white border border-ew-border rounded-xl p-3.5 hover:border-[#8403C5]/30 transition-colors">
                    {editingId === entry.id ? (
                      <div className="flex-1 space-y-2">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {LOG_TYPES.map(t => (
                            <button key={t} type="button"
                              onClick={() => setEditDraft(d => ({ ...d, type: t }))}
                              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition-colors ${
                                editDraft.type === t
                                  ? (LOG_TYPE_STYLES[t] || 'bg-amber-100 text-amber-700') + ' border-transparent'
                                  : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
                              }`}>
                              <span>{LOG_TYPE_ICONS[t]}</span>{t}
                            </button>
                          ))}
                        </div>
                        <input type="datetime-local" className={ic + ' text-xs py-1.5'}
                          value={editDraft.datetime || ''}
                          onChange={e => setEditDraft(d => ({ ...d, datetime: e.target.value }))} />
                        {editDraft.type === 'Time logged' ? (
                          <>
                            <input className={ic} value={editDraft.category || ''} onChange={e => setEditDraft(d => ({ ...d, category: e.target.value }))} placeholder="Category" />
                            <input className={ic} value={editDraft.duration || ''} onChange={e => setEditDraft(d => ({ ...d, duration: e.target.value }))} placeholder="Duration" />
                            <input className={ic} value={editDraft.description || ''} onChange={e => setEditDraft(d => ({ ...d, description: e.target.value }))} placeholder="Task / Description" />
                          </>
                        ) : null}
                        <textarea className={ic + ' h-16 resize-none text-sm'}
                          value={editDraft.summary || ''}
                          placeholder={editDraft.type === 'Time logged' ? 'Notes (optional)' : 'Summary'}
                          onChange={e => setEditDraft(d => ({ ...d, summary: e.target.value }))} />
                        {TRANSCRIPT_TYPES.includes(editDraft.type) && (
                          <input className={ic} value={editDraft.transcriptLink || ''} onChange={e => setEditDraft(d => ({ ...d, transcriptLink: e.target.value }))} placeholder="Transcript link (https://…)" />
                        )}
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditingId(null)}
                            className="px-2 py-1 text-xs text-ew-body hover:bg-ew-bg rounded">Cancel</button>
                          <button onClick={() => saveEdit(entry.id)}
                            className="px-3 py-1 text-xs font-semibold bg-[#8403C5] text-white rounded">Save</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-xl shrink-0 mt-0.5">{LOG_TYPE_ICONS[entry.type] || '📝'}</div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${LOG_TYPE_STYLES[entry.type] || 'bg-gray-100 text-gray-600'}`}>{entry.type}</span>
                            {entry.addedBy && <span className="text-[11px] text-ew-muted">{entry.addedBy}</span>}
                            <span className="text-[11px] text-ew-muted">· {fmtActivityDate(entry.createdAt || entry.datetime || entry.date)}</span>
                          </div>
                          {entry.type === 'Time logged' ? (
                            <div>
                              {entry.category && <span className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#EBEBF5] text-[#5777AB] mr-1.5 mb-1">{entry.category}</span>}
                              {entry.duration && <span className="inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#A16207] mr-1.5 mb-1">⏱ {entry.duration}</span>}
                              {entry.description && <p className="text-sm text-ew-body font-medium">{entry.description}</p>}
                              {entry.summary && <p className="text-xs text-ew-muted mt-0.5">{entry.summary}</p>}
                            </div>
                          ) : (
                            <p className="text-sm text-ew-body whitespace-pre-wrap">{entry.summary || entry.label || entry.description || ''}</p>
                          )}
                          {(entry.transcriptLink || entry.transcriptFileUrl || entry.transcriptFileName) && (
                            <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                              {entry.transcriptLink && (
                                <a href={entry.transcriptLink} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-[#5777AB] bg-[#EEF2F8] px-2 py-0.5 rounded-full hover:text-[#8403C5]">
                                  <Link className="w-3 h-3" /> Transcript
                                </a>
                              )}
                              {entry.transcriptFileUrl && (
                                <a href={entry.transcriptFileUrl} target="_blank" rel="noopener noreferrer"
                                  className="flex items-center gap-1 text-[11px] text-[#5777AB] bg-[#EEF2F8] px-2 py-0.5 rounded-full hover:text-[#8403C5]">
                                  <Link className="w-3 h-3" /> {entry.transcriptFileName || 'File'}
                                </a>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                          <button
                            onClick={() => {
                              setEditingId(entry.id);
                              const dtVal = entry.createdAt ? format(new Date(entry.createdAt), "yyyy-MM-dd'T'HH:mm") : (entry.datetime || entry.date || '');
                              setEditDraft({ type: entry.type, datetime: dtVal, summary: entry.summary || '', category: entry.category || '', duration: entry.duration || '', description: entry.description || '', transcriptLink: entry.transcriptLink || '', transcriptFileUrl: entry.transcriptFileUrl || '', transcriptFileName: entry.transcriptFileName || '' });
                            }}
                            className="p-1 text-ew-muted hover:text-navy rounded"><Pencil className="w-3 h-3" /></button>
                          <button onClick={() => setDeleteConfirm(entry.id)}
                            className="p-1 text-ew-muted hover:text-red-500 rounded"><X className="w-3 h-3" /></button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Delete this activity entry?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={() => deleteEntry(deleteConfirm)} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── External Links editor ────────────────────────────────────────────────────

function ExternalLinksEditor({ links, onChange }) {
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const addLink = () => onChange([...links, { id: Date.now(), label: '', url: '' }]);
  const updateLink = (id, field, val) => onChange(links.map(l => l.id === id ? { ...l, [field]: val } : l));
  const removeLink = () => { onChange(links.filter(l => l.id !== deleteConfirm)); setDeleteConfirm(null); };

  return (
    <div>
      <div className="space-y-2 mb-2">
        {links.map(link => (
          <div key={link.id} className="flex items-center gap-2">
            <input className={ic + ' flex-1 text-xs py-1.5'} placeholder="Label" value={link.label} onChange={e => updateLink(link.id, 'label', e.target.value)} />
            <input className={ic + ' flex-2 text-xs py-1.5'} placeholder="https://…" value={link.url} onChange={e => updateLink(link.id, 'url', e.target.value)} />
            {link.url && <a href={link.url} target="_blank" rel="noopener noreferrer" className="text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-3.5 h-3.5" /></a>}
            <button onClick={() => setDeleteConfirm(link.id)} className="text-ew-muted hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
          </div>
        ))}
      </div>
      <button onClick={addLink} className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline"><Plus className="w-3 h-3" /> Add link</button>
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-xs p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-semibold text-navy mb-3">Remove this link?</p>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setDeleteConfirm(null)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={removeLink} className="px-3 py-1.5 text-sm font-semibold bg-red-600 text-white rounded-lg">Remove</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

function showToast(msg, color = 'bg-emerald-600') {
  const el = document.createElement('div');
  el.className = `fixed bottom-6 left-1/2 -translate-x-1/2 z-[9999] ${color} text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xl animate-toast-in`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.remove(), 2500);
}

export default function LeadDetailPanel({ lead, onClose, onUpdate, onDelete, onClosedWon, isNew = false, onSaved }) {
  const [data, setData] = useState(lead);
  const [activeTab, setActiveTab] = useState('contacts');
  const [currentUserFirst, setCurrentUserFirst] = useState('');
  const [lostPrompt, setLostPrompt] = useState(false);
  const [lostReason, setLostReason] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [cancelConfirm, setCancelConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [quickNote, setQuickNote] = useState('');
  const [markDoneMode, setMarkDoneMode] = useState(false);
  const [newNextAction, setNewNextAction] = useState('');
  const [newNextActionDue, setNewNextActionDue] = useState('');
  const saveTimer = useRef(null);
  const isDirty = useRef(false);
  const dataRef = useRef(data);

  useEffect(() => { setData(lead); if (!isNew) logActivity({ teamMember: '', actionType: 'Viewed a lead', section: 'Sales', recordName: lead.companyName }); }, [lead.id]);

  useEffect(() => {
    base44.auth.me().then(me => {
      if (me?.full_name) setCurrentUserFirst(me.full_name.split(' ')[0]);
    }).catch(() => {});
  }, []);

  const extLinks = (() => { try { return JSON.parse(data.externalLinks || '[]'); } catch { return []; } })();
  const leadFiles = (() => { try { const p = JSON.parse(data.fileUrl || '[]'); return Array.isArray(p) ? p : []; } catch { return data.fileUrl ? [{ name: data.fileName || data.fileUrl, url: data.fileUrl }] : []; } })();
  const contacts = (() => { try { const p = JSON.parse(data.contacts || '[]'); return Array.isArray(p) ? p : []; } catch { return []; } })();
  const primaryContact = contacts.find(c => c.primary) || contacts[0];
  const primaryDisplayName = primaryContact ? [primaryContact.firstName, primaryContact.lastName].filter(Boolean).join(' ') : (data.contactName || '');

  const saveContacts = (newContacts) => {
    const primary = newContacts.find(c => c.primary) || newContacts[0];
    const newContactName = primary ? [primary.firstName, primary.lastName].filter(Boolean).join(' ') : '';
    autoSave({ contacts: JSON.stringify(newContacts), contactName: newContactName });
  };

  const autoSave = useCallback((updates) => {
    setData(prev => {
      const merged = { ...prev, ...updates };
      dataRef.current = merged;
      if (!isNew) {
        clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(async () => {
          const now = new Date().toISOString();
          await base44.entities.Lead.update(merged.id, { ...updates, lastActivity: now });
          onUpdate({ ...merged, lastActivity: now });
        }, 500);
      } else {
        isDirty.current = true;
      }
      return merged;
    });
  }, [isNew]);

  const f = (field) => (e) => autoSave({ [field]: e.target.value });

  const handleStageChange = (newStage) => {
    if (newStage === 'Closed Won' && !data.converted) { onClosedWon({ ...data, stage: 'Closed Won' }); return; }
    autoSave({ stage: newStage });
  };

  const handleMarkLost = async () => {
    autoSave({ stage: 'Closed Lost', lostReason });
    setLostPrompt(false);
  };

  const handleDelete = async () => {
    await base44.entities.Lead.delete(data.id);
    onDelete(data.id);
    onClose();
  };

  const handleSaveNew = async () => {
    const current = dataRef.current;
    if (!current.companyName?.trim()) return;
    setSaving(true);
    const now = new Date().toISOString();
    const created = await base44.entities.Lead.create({ ...current, stage: current.stage || 'New Lead', lastActivity: now });
    setSaving(false);
    logActivity({ teamMember: '', actionType: 'Added a lead', section: 'Sales', recordName: created.companyName, details: created.plan || '' });
    onSaved(created);
  };

  const handleCancelNew = () => {
    if (isDirty.current) { setCancelConfirm(true); } else { onClose(); }
  };

  const annual = (parseFloat(data.dealValueMonthly) || 0) * 12;

  // Dynamic tab labels
  const currentLogEntries = (() => { try { return JSON.parse(data.activityLog || '[]'); } catch { return []; } })();
  const logEntries = currentLogEntries;
  const activityCount = currentLogEntries.length;
  const isNextActionOverdue = data.nextActionDue && new Date(data.nextActionDue) < new Date() && data.nextAction;

  const TABS = [
    { id: 'contacts', label: 'Contacts' },
    { id: 'deal', label: 'Deal Info' },
    { id: 'activity', label: activityCount > 0 ? `Activity Log (${activityCount})` : 'Activity Log' },
    { id: 'objections', label: 'Objections & Intel' },
    { id: 'nextsteps', label: isNextActionOverdue ? 'Next Steps ⚠' : 'Next Steps' },
    { id: 'files', label: 'Files & Docs' },
  ];

  const handleQuickNote = () => {
    if (!quickNote.trim()) return;
    const entries = currentLogEntries;
    const newEntry = { id: Date.now(), type: 'Note', summary: quickNote.trim(), createdAt: new Date().toISOString(), addedBy: 'George' };
    const updated = [newEntry, ...entries];
    autoSave({ activityLog: JSON.stringify(updated), lastActivity: newEntry.createdAt });
    setQuickNote('');
    showToast('✓ Note saved');
  };

  const handleMarkDone = () => {
    // Log completion in activity log
    const entries = currentLogEntries;
    const doneEntry = { id: Date.now(), type: 'Note', summary: `✅ Next action completed: "${data.nextAction}"`, createdAt: new Date().toISOString(), addedBy: 'George' };
    const updated = [doneEntry, ...entries];
    autoSave({ activityLog: JSON.stringify(updated), nextAction: '', nextActionDue: '', lastActivity: doneEntry.createdAt });
    setMarkDoneMode(true);
  };

  const handleSetNewNextAction = () => {
    if (!newNextAction.trim()) return;
    autoSave({ nextAction: newNextAction.trim(), nextActionDue: newNextActionDue || null });
    setMarkDoneMode(false);
    setNewNextAction('');
    setNewNextActionDue('');
    showToast('✓ Next action set');
  };

  const nextDueCls = () => {
    if (!data.nextActionDue) return ic;
    const d = new Date(data.nextActionDue);
    const now = new Date();
    const diffDays = (d - now) / 86400000;
    if (diffDays < 0) return ic + ' border-red-400 bg-red-50 text-red-700';
    if (diffDays < 2) return ic + ' border-amber-400 bg-amber-50 text-amber-700';
    return ic + ' border-green-400 bg-green-50 text-green-700';
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-ew-border overflow-hidden">
      {/* Fixed Header */}
      <div className="shrink-0 px-6 pt-5 pb-0 border-b border-ew-border">
        <div className="flex items-start justify-between gap-4 mb-2">
          <div className="flex-1 min-w-0">
            <input
              className="text-xl font-bold text-navy bg-transparent border-none outline-none w-full hover:bg-ew-bg focus:bg-ew-bg rounded px-1 -ml-1 transition-colors"
              value={data.companyName || ''} onChange={f('companyName')} placeholder="Company name"
              autoFocus={isNew}
            />
            {primaryDisplayName && <p className="text-sm text-ew-muted px-1 -ml-1 mt-0.5">{primaryDisplayName}</p>}
          </div>
          {isNew ? (
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleCancelNew} className="px-3 py-1.5 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg border border-ew-border transition-colors">Cancel</button>
              <button onClick={handleSaveNew} disabled={saving || !data.companyName?.trim()}
                className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40 transition-colors">
                {saving ? 'Saving…' : 'Save lead'}
              </button>
              <button onClick={handleCancelNew} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg transition-colors"><X className="w-5 h-5" /></button>
            </div>
          ) : (
            <button onClick={onClose} className="p-1.5 text-ew-muted hover:text-navy hover:bg-ew-bg rounded-lg shrink-0 transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-3 mb-3 flex-wrap">
          <StageBadge stage={data.stage} />
          {data.converted && <span className="text-xs text-green-700 font-semibold bg-green-50 px-2.5 py-0.5 rounded-full">✓ Converted {data.convertedDate ? fmtDate(data.convertedDate) : ''}</span>}
          {!data.converted && data.stage !== 'Closed Won' && (
            <button onClick={() => onClosedWon({ ...data, stage: 'Closed Won' })} className="px-3 py-1 text-xs font-semibold bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">🎉 Closed Won</button>
          )}
          {data.lastActivity && <span className="text-[11px] text-ew-muted ml-auto">Updated {fmtDateTime(data.lastActivity)}</span>}
        </div>

        {/* Assigned To — visible on both new and existing leads */}
        <div className="flex items-center gap-2 mb-3">
          <label className="text-[11px] font-medium text-ew-muted whitespace-nowrap">Assigned to</label>
          <select
            className="flex-1 text-sm border border-ew-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white"
            value={data.leadOwner || ''}
            onChange={e => autoSave({ leadOwner: e.target.value })}
          >
            <option value="">Unassigned</option>
            {LEAD_OWNERS.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
          {currentUserFirst && LEAD_OWNERS.includes(currentUserFirst) && data.leadOwner !== currentUserFirst && (
            <button
              onClick={() => autoSave({ leadOwner: currentUserFirst })}
              className="px-2.5 py-1.5 text-xs font-semibold text-[#8403C5] border border-[#8403C5]/30 bg-[#F3E8FF] hover:bg-[#E9D5FF] rounded-lg transition-colors whitespace-nowrap"
            >
              Assign to me
            </button>
          )}
        </div>

        {/* Quick note bar */}
        {!isNew && (
          <div className="flex items-center gap-2 mb-3">
            <input
              className="flex-1 text-sm border border-ew-border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white"
              placeholder="Add a quick note or update..."
              value={quickNote}
              onChange={e => setQuickNote(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleQuickNote(); }}
            />
            <button onClick={handleQuickNote} disabled={!quickNote.trim()}
              className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40 transition-colors whitespace-nowrap">
              Log
            </button>
          </div>
        )}

        {/* Tab bar */}
        <div className="flex items-center gap-0 -mb-px overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap relative shrink-0 ${
                activeTab === tab.id ? 'text-[#8403C5] font-semibold' : tab.id === 'nextsteps' && isNextActionOverdue ? 'text-amber-600 hover:text-amber-700' : 'text-ew-muted hover:text-navy'
              }`}>
              {tab.label}
              {activeTab === tab.id && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#8403C5] rounded-t-full" />}
              {tab.id === 'nextsteps' && isNextActionOverdue && activeTab !== 'nextsteps' && (
                <span className="absolute top-1.5 right-0 w-1.5 h-1.5 bg-amber-500 rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Scrollable tab content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">

        {/* CONTACTS TAB */}
        {activeTab === 'contacts' && (
          <div className="space-y-5">
            {data.converted && (
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-green-600" />
                <span>Converted on {data.convertedDate ? fmtDate(data.convertedDate) : 'an earlier date'}.</span>
              </div>
            )}
            <div>
              <SectionTitle>Contacts</SectionTitle>
              <ContactsSection contacts={contacts} onChange={saveContacts} />
            </div>
            <div>
              <SectionTitle>Company Info</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="LinkedIn URL">
                  <div className="relative">
                    <input className={ic + ' pr-8'} value={data.linkedInUrl || ''} onChange={f('linkedInUrl')} placeholder="https://linkedin.com/in/…" />
                    {data.linkedInUrl && <a href={data.linkedInUrl} target="_blank" rel="noopener noreferrer" className="absolute right-2.5 top-2.5 text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-4 h-4" /></a>}
                  </div>
                </FieldRow>
                <FieldRow label="Company website">
                  <div className="relative">
                    <input className={ic + ' pr-8'} value={data.companyWebsite || ''} onChange={f('companyWebsite')} placeholder="https://…" />
                    {data.companyWebsite && <a href={data.companyWebsite} target="_blank" rel="noopener noreferrer" className="absolute right-2.5 top-2.5 text-ew-muted hover:text-[#8403C5]"><ExternalLink className="w-4 h-4" /></a>}
                  </div>
                </FieldRow>
                <FieldRow label="Industry">
                  <select className={ic} value={data.industry || ''} onChange={f('industry')}>
                    <option value="">Select…</option>
                    {INDUSTRIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FieldRow>
                <FieldRow label="How they heard about Eventwise">
                  <select className={ic} value={data.heardAbout || ''} onChange={f('heardAbout')}>
                    <option value="">Select…</option>
                    {HEARD_ABOUT.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FieldRow>
              </div>
            </div>
            {data.notes && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium text-ew-muted">Notes</span>
                  <button onClick={() => setActiveTab('nextsteps')} className="text-[11px] text-[#8403C5] hover:underline font-medium">Edit in Next Steps →</button>
                </div>
                <div className="bg-gray-50 border border-ew-border rounded-lg px-3 py-2">
                  <p className="text-sm text-ew-body line-clamp-2 whitespace-pre-wrap">{data.notes}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* DEAL INFO TAB */}
        {activeTab === 'deal' && (
          <div>
            <SectionTitle>Deal Info</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Plan">
                <select className={ic} value={data.plan || ''} onChange={e => autoSave({ plan: e.target.value })}>
                  <option value="">Select…</option>
                  {PLANS.map(p => <option key={p}>{p}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Monthly value">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                  <input type="number" className={ic + ' pl-7'} value={data.dealValueMonthly || ''} onChange={f('dealValueMonthly')} placeholder="0" />
                </div>
                <p className="text-xs text-ew-muted mt-1">{fmt(annual)} / year</p>
              </FieldRow>
              <FieldRow label="One-off setup fee">
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                  <input type="number" className={ic + ' pl-7'} value={data.setupFee || ''} onChange={f('setupFee')} placeholder="0" />
                </div>
              </FieldRow>
              <FieldRow label="Accounting service">
                <select className={ic} value={data.accountingService || 'Not included'} onChange={e => autoSave({ accountingService: e.target.value })}>
                  {ACCOUNTING_SERVICE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </FieldRow>
              {data.accountingService === 'Separate fee' && (
                <FieldRow label="Accounting fee (£/month)">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-sm text-ew-muted">£</span>
                    <input type="number" className={ic + ' pl-7'} value={data.accountingServiceFee || ''} onChange={f('accountingServiceFee')} placeholder="0" />
                  </div>
                </FieldRow>
              )}
              <FieldRow label="Onboarding plan">
                <select className={ic} value={data.onboardingPlan || ''} onChange={f('onboardingPlan')}>
                  <option value="">Select…</option>
                  {ONBOARDING_PLANS.map(p => <option key={p}>{p}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Proposed start date">
                <input type="date" className={ic} value={data.proposedStartDate || ''} onChange={f('proposedStartDate')} />
              </FieldRow>
              <FieldRow label="Contract length">
                <select className={ic} value={data.contractLength || ''} onChange={f('contractLength')}>
                  <option value="">Select…</option>
                  {CONTRACT_LENGTHS.map(c => <option key={c}>{c}</option>)}
                </select>
              </FieldRow>
              <FieldRow label="Probability %">
                <div className="relative">
                  <input type="number" min="0" max="100" className={ic + ' pr-7'} value={data.probability || ''} onChange={f('probability')} placeholder="e.g. 70" />
                  <span className="absolute right-3 top-2.5 text-sm text-ew-muted">%</span>
                </div>
              </FieldRow>
              <FieldRow label="Expected close month">
                <input type="month" className={ic} value={data.expectedCloseMonth || ''} onChange={f('expectedCloseMonth')} />
              </FieldRow>
              <FieldRow label="Timeline to decision">
                <input className={ic} value={data.timelineToDecision || ''} onChange={f('timelineToDecision')} placeholder="e.g. End of April" />
              </FieldRow>
              <FieldRow label="Competitors evaluating">
                <input className={ic} value={data.competitorsEvaluating || ''} onChange={f('competitorsEvaluating')} placeholder="e.g. Cvent, spreadsheets" />
              </FieldRow>
            </div>
          </div>
        )}

        {/* ACTIVITY LOG TAB */}
        {activeTab === 'activity' && (
          <div className="space-y-5">
            <ActivityLog
              entries={logEntries}
              currentUser={currentUserFirst}
              onSave={entries => {
                const mostRecent = entries[0];
                const lastActivity = mostRecent?.createdAt || new Date().toISOString();
                autoSave({ activityLog: JSON.stringify(entries), lastActivity });
              }}
            />
            <div>
              <SectionTitle>Demo</SectionTitle>
              <div className="grid grid-cols-2 gap-3">
                <FieldRow label="Demo completed">
                  <Toggle value={!!data.demoCompleted} onChange={val => autoSave({ demoCompleted: val })} />
                </FieldRow>
                {data.demoCompleted && (
                  <FieldRow label="Demo date">
                    <input type="date" className={ic} value={data.demoDate || ''} onChange={f('demoDate')} />
                  </FieldRow>
                )}
                {data.demoCompleted && (
                  <div className="col-span-2">
                    <FieldRow label="Demo notes">
                      <textarea className={ic + ' h-20 resize-none'} value={data.demoNotes || ''} onChange={f('demoNotes')} placeholder="What was discussed?" />
                    </FieldRow>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* OBJECTIONS & INTEL TAB */}
        {activeTab === 'objections' && (
          <div>
            <SectionTitle>Objections & Intelligence</SectionTitle>
            <div className="space-y-3">
              <FieldRow label="Objections raised">
                <MentionTextarea className={ic + ' h-20 resize-none'} value={data.objections || ''} onChange={v => autoSave({ objections: v })} placeholder="What concerns or objections has the prospect raised?" rows={3} section={`Pipeline / ${data.companyName} / Objections`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
              </FieldRow>
              <FieldRow label="How objections were addressed">
                <MentionTextarea className={ic + ' h-20 resize-none'} value={data.objectionsAddressed || ''} onChange={v => autoSave({ objectionsAddressed: v })} placeholder="How have you handled these?" rows={3} section={`Pipeline / ${data.companyName} / Objections`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
              </FieldRow>
              <FieldRow label="Key pain points identified">
                <MentionTextarea className={ic + ' h-20 resize-none'} value={data.painPoints || ''} onChange={v => autoSave({ painPoints: v })} placeholder="What financial or operational problems are they trying to solve?" rows={3} section={`Pipeline / ${data.companyName} / Pain Points`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
              </FieldRow>
              <div>
                <label className="block text-[11px] font-medium text-ew-muted mb-1">🔒 Internal only — not shared with prospect</label>
                <MentionTextarea className="w-full text-sm border border-amber-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-amber-300/40 bg-amber-50 h-20 resize-none" value={data.internalNotes || ''} onChange={v => autoSave({ internalNotes: v })} placeholder="Internal notes…" rows={3} section={`Pipeline / ${data.companyName} / Internal Notes`} appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline" />
              </div>
            </div>
          </div>
        )}

        {/* NEXT STEPS TAB */}
        {activeTab === 'nextsteps' && (
          <div>
            {/* Prominent next action block */}
            <div className="bg-[#F7F8FC] border border-ew-border rounded-xl p-4 mb-4">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.18em]">Next Action</p>
                {data.nextAction && !markDoneMode && (
                  <button onClick={handleMarkDone}
                    className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors">
                    <Check className="w-3.5 h-3.5" /> Mark as done
                  </button>
                )}
              </div>
              <input className="w-full text-base font-semibold text-navy bg-white border border-ew-border rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 mb-2"
                value={data.nextAction || ''} onChange={f('nextAction')} placeholder="What needs to happen next?" />
              <div className="flex items-center gap-2">
                <label className="text-[11px] font-medium text-ew-muted whitespace-nowrap">Due date:</label>
                <input type="date" className={`text-sm border rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 flex-1 ${
                  data.nextActionDue ? (() => {
                    const diffDays = (new Date(data.nextActionDue) - new Date()) / 86400000;
                    if (diffDays < 0) return 'border-red-400 bg-red-50 text-red-700 font-semibold';
                    if (diffDays < 2) return 'border-amber-400 bg-amber-50 text-amber-700';
                    return 'border-green-400 bg-green-50 text-green-700';
                  })() : 'border-ew-border bg-white'
                }`}
                  value={data.nextActionDue || ''} onChange={f('nextActionDue')} />
                {data.nextActionDue && (() => {
                  const diffDays = (new Date(data.nextActionDue) - new Date()) / 86400000;
                  if (diffDays < 0) return <span className="text-xs font-semibold text-red-600 whitespace-nowrap">⚠ Overdue</span>;
                  if (diffDays < 1) return <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">Due today</span>;
                  if (diffDays < 2) return <span className="text-xs font-semibold text-amber-600 whitespace-nowrap">Due tomorrow</span>;
                  return null;
                })()}
              </div>

              {/* Mark as Done — set new next action */}
              {markDoneMode && (
                <div className="mt-3 p-3 bg-white border border-emerald-200 rounded-xl">
                  <p className="text-sm font-semibold text-navy mb-2">✅ Done! What's the next step?</p>
                  <input className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 mb-2 bg-white"
                    value={newNextAction} onChange={e => setNewNextAction(e.target.value)}
                    placeholder="e.g. Follow up after demo" autoFocus />
                  <div className="flex items-center gap-2 mb-2">
                    <label className="text-xs text-ew-muted whitespace-nowrap">Due:</label>
                    <input type="date" className="flex-1 text-sm border border-ew-border rounded-lg px-3 py-1.5 focus:outline-none bg-white"
                      value={newNextActionDue} onChange={e => setNewNextActionDue(e.target.value)} />
                  </div>
                  <div className="flex gap-2 justify-end">
                    <button onClick={() => setMarkDoneMode(false)} className="px-3 py-1.5 text-xs text-ew-body hover:bg-ew-bg rounded-lg">Skip</button>
                    <button onClick={handleSetNewNextAction} disabled={!newNextAction.trim()}
                      className="px-4 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">Set next action</button>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Follow-up reminder">
                <input type="date" className={ic} value={data.followUpReminder || ''} onChange={f('followUpReminder')} />
              </FieldRow>
              <FieldRow label="Follow-up note">
                <input className={ic} value={data.followUpNote || ''} onChange={f('followUpNote')} placeholder="Optional note…" />
              </FieldRow>
              <div className="col-span-2">
                <FieldRow label="Stage">
                  <select className={ic} value={data.stage || ''} onChange={e => handleStageChange(e.target.value)}>
                    {STAGES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </FieldRow>
              </div>
              <div className="col-span-2">
                <FieldRow label="Notes">
                  <MentionTextarea
                    className={ic + ' resize-none'}
                    rows={4}
                    value={data.notes || ''}
                    onChange={v => autoSave({ notes: v })}
                    placeholder="General notes about this lead — context, history, anything useful..."
                    section={`Pipeline / ${data.companyName} / Notes`}
                    appUrl="https://app.base44.com/apps/68036e9feb8b4d9b7625aaa5/AppShell?tab=pipeline"
                  />
                </FieldRow>
              </div>
            </div>
            <div className="border-t border-ew-border pt-4 mt-4 flex items-center gap-4">
              <button onClick={() => setLostPrompt(true)} className="text-sm text-ew-muted hover:text-gray-700 underline transition-colors">Mark as Lost</button>
              <button onClick={() => setDeleteConfirm(true)} className="text-sm text-red-500 hover:text-red-700 underline transition-colors">Delete this lead</button>
            </div>
            {lostPrompt && (
              <div className="border border-ew-border rounded-xl p-4 bg-[#F7F8FC] mt-4">
                <p className="text-sm font-semibold text-navy mb-2">Why was this lead lost? <span className="font-normal text-ew-muted">(optional)</span></p>
                <textarea className={ic + ' h-16 resize-none mb-3'} value={lostReason} onChange={e => setLostReason(e.target.value)} placeholder="e.g. Went with a competitor, budget cut…" />
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLostPrompt(false)} className="px-3 py-1.5 text-sm text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
                  <button onClick={handleMarkLost} className="px-3 py-1.5 text-sm font-semibold bg-gray-700 text-white rounded-lg hover:bg-gray-800">Mark as Lost</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* FILES & DOCUMENTS TAB */}
        {activeTab === 'files' && (
          <div>
            <SectionTitle>Files & Documents</SectionTitle>
            <div className="grid grid-cols-2 gap-3">
              <FieldRow label="Proposal status">
                <select className={ic} value={data.proposalStatus || 'Not sent'} onChange={f('proposalStatus')}>
                  {PROPOSAL_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
              </FieldRow>
              {data.proposalStatus && data.proposalStatus !== 'Not sent' && (
                <FieldRow label="Proposal sent date">
                  <input type="date" className={ic} value={data.proposalSentDate || ''} onChange={f('proposalSentDate')} />
                </FieldRow>
              )}
            </div>
            <div className="mt-3">
              <label className="block text-[11px] font-medium text-ew-muted mb-2">External links</label>
              <ExternalLinksEditor links={extLinks} onChange={links => autoSave({ externalLinks: JSON.stringify(links) })} />
            </div>
            <div className="mt-4">
              <label className="block text-[11px] font-medium text-ew-muted mb-2">File attachments</label>
              <MultiFileUpload files={leadFiles} onChange={files => autoSave({ fileUrl: JSON.stringify(files), fileName: files.map(f => f.name).join(', ') })} />
            </div>
          </div>
        )}
      </div>

      {/* Cancel confirm (new lead) */}
      {cancelConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setCancelConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Discard this lead?</h3>
            <p className="text-sm text-ew-body mb-5">Your changes will not be saved.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setCancelConfirm(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Keep editing</button>
              <button onClick={onClose} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Discard</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDeleteConfirm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete this lead?</h3>
            <p className="text-sm text-ew-body mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={handleDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete permanently</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}