import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Plus, ChevronDown, ChevronRight, Loader2, RefreshCw, AlertCircle, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import OneOnOneNoteModal from './OneOnOneNoteModal';
import OneOnOneInsights from './OneOnOneInsights';
import PendingActionItemCard from './PendingActionItemCard';
import { processNoteWithAI } from '@/lib/oneOnOneAI';

const DEFAULT_PEOPLE = ['George', 'Martinique', 'Sreeja'];

function avatar(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}
function parseSummary(note) {
  if (!note.aiSummary) return null;
  try { return JSON.parse(note.aiSummary); } catch { return null; }
}
function parseThemes(note) {
  if (!note.themes) return [];
  try { return JSON.parse(note.themes); } catch { return []; }
}

function PersonCard({ name, stats, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left rounded-xl p-4 border transition-all min-w-[180px] ${active ? 'border-[#8403C5] bg-[#F3E8FF] dark:bg-[#2e1065]' : 'border-ew-border dark:border-gray-700 bg-white dark:bg-[#1E1E2E] hover:border-[#D8D8EE]'}`}
    >
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-9 h-9 rounded-full bg-[#8403C5]/15 text-[#8403C5] dark:text-[#c084fc] text-xs font-bold flex items-center justify-center shrink-0">
          {avatar(name)}
        </div>
        <div className="min-w-0">
          <p className="font-bold text-navy dark:text-white text-sm truncate">{name}</p>
          <p className="text-[11px] text-ew-muted">{stats.count} meeting{stats.count === 1 ? '' : 's'}</p>
        </div>
      </div>
      <p className="text-xs text-ew-muted dark:text-gray-400">
        {stats.lastDate ? `Last: ${format(new Date(stats.lastDate), 'd MMM yyyy')}` : 'No meetings yet'}
      </p>
      {stats.pendingCount > 0 && (
        <span className="inline-flex items-center mt-2 text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-[#A16207] dark:bg-[#451a03] dark:text-[#fbbf24]">
          {stats.pendingCount} pending
        </span>
      )}
    </button>
  );
}

function SummaryList({ title, icon, items, tone }) {
  if (!items || items.length === 0) return null;
  const colorClass = tone === 'amber' ? 'text-[#A16207] dark:text-[#fbbf24]' : tone === 'green' ? 'text-[#1D9E75]' : 'text-navy dark:text-white';
  return (
    <div className="mb-3">
      <p className={`text-xs font-bold mb-1.5 ${colorClass}`}>{icon} {title}</p>
      <ul className="space-y-1 pl-1">
        {items.map((it, i) => (
          <li key={i} className="text-sm text-ew-body dark:text-gray-200 flex items-start gap-2">
            <span className="text-ew-muted mt-1">•</span>
            <span>{it}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function MeetingEntry({ note, pendingItems, onPendingUpdated, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessError, setReprocessError] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const menuRef = useRef(null);

  const summary = parseSummary(note);
  const themes = parseThemes(note);
  const notePending = pendingItems.filter(p => p.sourceMeetingId === note.id);
  const unreviewed = notePending.filter(p => p.status === 'Pending Review');
  const allReviewed = notePending.length > 0 && unreviewed.length === 0;

  const canReprocess = note.rawNotes && note.rawNotes.trim() &&
    (!summary || note.status === 'Draft' || note.status === 'Failed');

  // Close overflow menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e) => { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const handleReprocess = async () => {
    setReprocessing(true);
    setReprocessError('');
    try {
      await processNoteWithAI(note.id, note.rawNotes, note.teamMember, note.meetingDate);
      onPendingUpdated();
    } catch (e) {
      await base44.entities.OneOnOneMeetingNote.update(note.id, { status: 'Failed' });
      setReprocessError(e.message || 'Processing failed');
      onPendingUpdated();
    }
    setReprocessing(false);
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      // Delete unreviewed pending tasks only — approved/board tasks stay
      await base44.entities.PendingTaskFromNote.deleteMany({ sourceMeetingId: note.id, status: 'Pending Review' });
      await base44.entities.OneOnOneMeetingNote.delete(note.id);
      onDelete();
    } catch (e) {
      setDeleting(false);
      setDeleteConfirm(false);
    }
  };

  return (
    <div className="bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="flex items-center gap-3 px-5 py-4 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors">
        <button onClick={() => setOpen(v => !v)} className="flex items-center gap-3 flex-1 min-w-0 text-left">
          {open ? <ChevronDown className="w-4 h-4 text-ew-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ew-muted shrink-0" />}
          <div className="w-8 h-8 rounded-full bg-[#8403C5]/15 text-[#8403C5] dark:text-[#c084fc] text-[10px] font-bold flex items-center justify-center shrink-0">
            {avatar(note.teamMember)}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-bold text-navy dark:text-white text-sm">{note.teamMember}</p>
            <p className="text-xs text-ew-muted">{format(new Date(note.meetingDate), 'd MMMM yyyy')}</p>
          </div>
        </button>

        {note.status === 'Failed' ? (
          <span className="text-xs text-red-500 italic flex items-center gap-1"><AlertCircle className="w-3 h-3" /> Processing failed</span>
        ) : note.status === 'Draft' ? (
          <span className="text-xs text-ew-muted italic">Draft</span>
        ) : summary ? (
          <span className="text-xs text-ew-muted truncate max-w-[200px] hidden sm:block">{(summary.key_points || [])[0] || 'Processed'}</span>
        ) : (
          <span className="text-xs text-red-500 italic">No content</span>
        )}
        {unreviewed.length > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-[#A16207] dark:bg-[#451a03] dark:text-[#fbbf24] shrink-0">
            {unreviewed.length} pending
          </span>
        )}

        {/* Overflow menu */}
        <div className="relative shrink-0" ref={menuRef}>
          <button
            onClick={(e) => { e.stopPropagation(); setMenuOpen(v => !v); }}
            className="p-1.5 rounded-lg text-ew-muted hover:text-navy dark:hover:text-white hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors"
            title="More options"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-44 bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-lg shadow-lg z-30 py-1 overflow-hidden">
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); onEdit(note); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-ew-body dark:text-gray-200 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5" /> Edit note
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setMenuOpen(false); setDeleteConfirm(true); }}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-[#f87171] hover:bg-red-50 dark:hover:bg-[#450a0a] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" /> Delete note
              </button>
            </div>
          )}
        </div>
      </div>

      {open && (
        <div className="px-5 pb-5 border-t border-ew-border dark:border-gray-700 pt-4">
          {canReprocess && (
            <div className="mb-4">
              <button
                onClick={handleReprocess}
                disabled={reprocessing}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-50"
              >
                {reprocessing ? <><Loader2 className="w-4 h-4 animate-spin" /> Processing with AI…</> : <><RefreshCw className="w-4 h-4" /> Re-process with AI</>}
              </button>
              {reprocessError && (
                <p className="text-xs text-red-500 mt-2 flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {reprocessError}</p>
              )}
            </div>
          )}

          {note.status === 'Failed' && !reprocessing && (
            <div className="mb-4 rounded-lg bg-red-50 dark:bg-[#450a0a] border border-red-200 dark:border-[#991b1b] px-4 py-2">
              <p className="text-xs text-red-600 dark:text-[#f87171] flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" /> AI processing failed on the last attempt. Click "Re-process with AI" above to try again.</p>
            </div>
          )}

          {summary ? (
            <>
              <div className="bg-ew-bg dark:bg-[#252535] rounded-xl p-4 mb-4">
                <SummaryList title="Key Points" icon="📋" items={summary.key_points} />
                <SummaryList title="Decisions Made" icon="✅" items={summary.decisions_made} />
                <SummaryList title="Concerns Flagged" icon="⚠️" items={summary.concerns_flagged} tone="amber" />
                <SummaryList title="Highlights" icon="🌟" items={summary.positive_highlights} tone="green" />
                {themes.length > 0 && (
                  <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 dark:bg-[#451a03] dark:border-[#92400e] px-3 py-2">
                    <p className="text-xs font-semibold text-[#A16207] dark:text-[#fbbf24]">🔁 Recurring themes detected: {themes.join(', ')}</p>
                  </div>
                )}
              </div>

              {notePending.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-sm font-bold text-navy dark:text-white">Action Items — Pending Your Review</p>
                  </div>
                  <p className="text-xs text-ew-muted mb-3">Review and approve before these appear on the team To-Do board</p>
                  <div className="space-y-3">
                    {notePending.map(p => (
                      <PendingActionItemCard key={p.id} item={p} onUpdated={onPendingUpdated} />
                    ))}
                  </div>
                  {allReviewed && (
                    <div className="mt-3 rounded-lg bg-[#E8F7F2] border border-[#1D9E75]/30 px-4 py-2 text-center">
                      <p className="text-sm font-semibold text-[#1D9E75]">All action items reviewed ✓</p>
                    </div>
                  )}
                </div>
              )}
            </>
          ) : note.status !== 'Failed' ? (
            <div className="bg-ew-bg dark:bg-[#252535] rounded-xl p-4 text-center">
              <p className="text-sm text-ew-muted dark:text-gray-400">This note is saved as a draft.</p>
              <p className="text-xs text-ew-muted mt-1">Use "Re-process with AI" above to generate a structured summary.</p>
            </div>
          ) : null}

          <details className="mt-4">
            <summary className="text-xs text-ew-muted hover:text-navy dark:hover:text-white cursor-pointer">View raw notes</summary>
            <p className="mt-2 text-sm text-ew-body dark:text-gray-300 whitespace-pre-wrap bg-ew-bg dark:bg-[#252535] rounded-lg p-3">{note.rawNotes}</p>
          </details>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[60] p-4" onClick={() => !deleting && setDeleteConfirm(false)}>
          <div className="bg-white dark:bg-[#1E1E2E] rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <Trash2 className="w-5 h-5 text-red-500" />
              <h3 className="text-base font-bold text-navy dark:text-white">Delete this meeting note?</h3>
            </div>
            <p className="text-sm text-ew-body dark:text-gray-300 mb-5">
              The AI summary and any pending action items will also be deleted.
              Tasks already approved and added to the board will remain.
              This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteConfirm(false)}
                disabled={deleting}
                className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg dark:hover:bg-[#252535] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {deleting ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Deleting…</> : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function OneOnOneNotes() {
  const [notes, setNotes] = useState([]);
  const [pending, setPending] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);

  const load = useCallback(async () => {
    try {
      const [n, p] = await Promise.all([
        base44.entities.OneOnOneMeetingNote.list('-meetingDate', 500),
        base44.entities.PendingTaskFromNote.list('-created_date', 1000),
      ]);
      setNotes(n);
      setPending(p);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const peopleSet = new Set(DEFAULT_PEOPLE);
  notes.forEach(n => n.teamMember && peopleSet.add(n.teamMember));
  const people = Array.from(peopleSet).filter(Boolean);

  const personStats = (name) => {
    const personNotes = notes.filter(n => n.teamMember === name);
    const lastDate = personNotes.length ? personNotes.map(n => n.meetingDate).sort().reverse()[0] : null;
    const noteIds = new Set(personNotes.map(n => n.id));
    const pendingCount = pending.filter(p => noteIds.has(p.sourceMeetingId) && p.status === 'Pending Review').length;
    return { count: personNotes.length, lastDate, pendingCount };
  };

  const filteredNotes = filter === 'all' ? notes : notes.filter(n => n.teamMember === filter);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-6 h-6 text-[#8403C5] animate-spin" />
      </div>
    );
  }

  return (
    <div className="px-8 py-6">
      <div className="flex items-center justify-between mb-5">
        <p className="text-sm text-ew-muted dark:text-gray-400">{notes.length} meeting{notes.length === 1 ? '' : 's'} logged</p>
        <button
          onClick={() => { setEditingNote(null); setShowModal(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors"
        >
          <Plus className="w-4 h-4" /> New 1:1 Note
        </button>
      </div>

      <OneOnOneInsights notes={notes} pending={pending} />

      {/* Person cards */}
      <p className="section-heading mb-3">People</p>
      <div className="flex gap-3 overflow-x-auto pb-2 mb-6" style={{ scrollbarWidth: 'thin' }}>
        {people.map(name => (
          <PersonCard
            key={name}
            name={name}
            stats={personStats(name)}
            active={filter === name}
            onClick={() => setFilter(f => f === name ? 'all' : name)}
          />
        ))}
      </div>

      {/* Filter pills */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <button
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${filter === 'all' ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white dark:bg-[#171730] text-ew-muted border-ew-border dark:border-[#242450] hover:border-[#D8D8EE]'}`}
        >
          All
        </button>
        {people.map(name => (
          <button
            key={name}
            onClick={() => setFilter(name)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-colors border ${filter === name ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white dark:bg-[#171730] text-ew-muted border-ew-border dark:border-[#242450] hover:border-[#D8D8EE]'}`}
          >
            {name.split(' ')[0]}
          </button>
        ))}
      </div>

      {/* Feed */}
      {filteredNotes.length === 0 ? (
        <div className="bg-white dark:bg-[#1E1E2E] border border-dashed border-ew-border dark:border-gray-700 rounded-xl flex flex-col items-center justify-center py-16">
          <p className="font-semibold text-navy dark:text-white mb-1">No 1:1 notes yet</p>
          <p className="text-sm text-ew-muted mb-4">Start by logging your first meeting.</p>
          <button onClick={() => { setEditingNote(null); setShowModal(true); }} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors">
            <Plus className="w-4 h-4" /> New 1:1 Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <MeetingEntry
              key={note.id}
              note={note}
              pendingItems={pending}
              onPendingUpdated={load}
              onEdit={(n) => { setEditingNote(n); setShowModal(true); }}
              onDelete={load}
            />
          ))}
        </div>
      )}

      {showModal && (
        <OneOnOneNoteModal
          editNote={editingNote}
          onClose={() => { setShowModal(false); setEditingNote(null); }}
          onSaved={() => { setShowModal(false); setEditingNote(null); load(); }}
        />
      )}
    </div>
  );
}