import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { Plus, ChevronDown, ChevronRight, Loader2 } from 'lucide-react';
import OneOnOneNoteModal from './OneOnOneNoteModal';
import OneOnOneInsights from './OneOnOneInsights';
import PendingActionItemCard from './PendingActionItemCard';

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

function MeetingEntry({ note, pendingItems, onPendingUpdated }) {
  const [open, setOpen] = useState(false);
  const summary = parseSummary(note);
  const themes = parseThemes(note);
  const notePending = pendingItems.filter(p => p.sourceMeetingId === note.id);
  const unreviewed = notePending.filter(p => p.status === 'Pending Review');
  const allReviewed = notePending.length > 0 && unreviewed.length === 0;

  return (
    <div className="bg-white dark:bg-[#1E1E2E] border border-ew-border dark:border-gray-700 rounded-xl overflow-hidden">
      <button onClick={() => setOpen(v => !v)} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-ew-bg dark:hover:bg-[#252535] transition-colors text-left">
        {open ? <ChevronDown className="w-4 h-4 text-ew-muted shrink-0" /> : <ChevronRight className="w-4 h-4 text-ew-muted shrink-0" />}
        <div className="w-8 h-8 rounded-full bg-[#8403C5]/15 text-[#8403C5] dark:text-[#c084fc] text-[10px] font-bold flex items-center justify-center shrink-0">
          {avatar(note.teamMember)}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-navy dark:text-white text-sm">{note.teamMember}</p>
          <p className="text-xs text-ew-muted">{format(new Date(note.meetingDate), 'd MMMM yyyy')}</p>
        </div>
        {note.status === 'Draft' ? (
          <span className="text-xs text-ew-muted italic">Draft — not yet processed</span>
        ) : summary ? (
          <span className="text-xs text-ew-muted truncate max-w-[200px] hidden sm:block">{(summary.key_points || [])[0] || 'Processed'}</span>
        ) : null}
        {unreviewed.length > 0 && (
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-amber-50 text-[#A16207] dark:bg-[#451a03] dark:text-[#fbbf24] shrink-0">
            {unreviewed.length} pending
          </span>
        )}
      </button>

      {open && (
        <div className="px-5 pb-5 border-t border-ew-border dark:border-gray-700 pt-4">
          {note.status === 'Draft' ? (
            <div className="bg-ew-bg dark:bg-[#252535] rounded-xl p-4 text-center">
              <p className="text-sm text-ew-muted dark:text-gray-400">This note is saved as a draft.</p>
              <p className="text-xs text-ew-muted mt-1">Open and re-process to generate a structured summary.</p>
            </div>
          ) : summary ? (
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
          ) : (
            <p className="text-sm text-ew-muted">No structured summary available.</p>
          )}

          <details className="mt-4">
            <summary className="text-xs text-ew-muted hover:text-navy dark:hover:text-white cursor-pointer">View raw notes</summary>
            <p className="mt-2 text-sm text-ew-body dark:text-gray-300 whitespace-pre-wrap bg-ew-bg dark:bg-[#252535] rounded-lg p-3">{note.rawNotes}</p>
          </details>
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
          onClick={() => setShowModal(true)}
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
          <button onClick={() => setShowModal(true)} className="flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#7002A8] transition-colors">
            <Plus className="w-4 h-4" /> New 1:1 Note
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotes.map(note => (
            <MeetingEntry key={note.id} note={note} pendingItems={pending} onPendingUpdated={load} />
          ))}
        </div>
      )}

      {showModal && (
        <OneOnOneNoteModal onClose={() => setShowModal(false)} onSaved={() => { setShowModal(false); load(); }} />
      )}
    </div>
  );
}