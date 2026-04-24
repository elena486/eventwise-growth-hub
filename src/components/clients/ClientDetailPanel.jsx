import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format } from 'date-fns';
import { X, MessageSquareOff, CheckCircle2, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS } from '@/lib/csData';
import TranscriptSection from '@/components/shared/TranscriptSection';

const PRIORITY_STYLES = {
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Critical': 'bg-[#FEE2E2] text-[#B91C1C]',
};
const BUG_STATUS_STYLES = {
  'Open': 'bg-[#F3E8FF] text-[#7E22CE]',
  'In Progress': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Waiting on Client': 'bg-[#FEF9C3] text-[#A16207]',
  'Resolved': 'bg-[#DCFCE7] text-[#15803D]',
  'Closed': 'bg-[#F3F4F6] text-[#6B7280]',
};

const TIER_STYLES = {
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
};

export default function ClientDetailPanel({ client, onClose, onUpdated, onViewBug }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const [logging, setLogging] = useState(false);
  const [done, setDone] = useState(false);
  const [bugs, setBugs] = useState([]);
  const [bugsOpen, setBugsOpen] = useState(false);

  useEffect(() => {
    if (client?.id) {
      base44.entities.Bug.filter({ clientId: client.id }).then(setBugs).catch(() => setBugs([]));
    }
  }, [client?.id]);

  const noReplyEntries = (() => {
    try { return JSON.parse(client.noReplyLog || '[]'); } catch { return []; }
  })();

  const handleLogNoReply = async () => {
    setLogging(true);
    const today = format(new Date(), 'yyyy-MM-dd');
    const displayDate = format(new Date(), 'd MMM yyyy');
    const newEntry = { date: today, note: `No reply logged — ${displayDate}` };
    const updatedLog = JSON.stringify([newEntry, ...noReplyEntries]);

    // Append to notes so it appears in the activity history
    const currentNotes = client.notes || '';
    const noteEntry = `[No reply — ${displayDate}]`;
    const updatedNotes = currentNotes ? `${noteEntry}\n${currentNotes}` : noteEntry;

    await base44.entities.Client.update(client.id, {
      noReplyLog: updatedLog,
      notes: updatedNotes,
    });

    onUpdated({ ...client, noReplyLog: updatedLog, notes: updatedNotes });
    setLogging(false);
    setDone(true);
    setShowConfirm(false);
    setTimeout(() => setDone(false), 2000);
  };

  const latestNoReply = noReplyEntries[0];

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-md max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-6 py-4 border-b border-[#EBEBEB]">
          <div>
            <h2 className="text-base font-bold text-[#111827]">{client.name}</h2>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              {client.status && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[client.status] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                  {client.status}
                </span>
              )}
              {client.priorityTier && (
                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${TIER_STYLES[client.priorityTier] || 'bg-[#F3F4F6] text-[#6B7280]'}`}>
                  {client.priorityTier} priority
                </span>
              )}
              {latestNoReply && (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#FEF9C3] text-[#A16207] border border-amber-200">
                  No reply — {format(new Date(latestNoReply.date), 'd MMM yyyy')}
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-[#F7F7F8] text-[#9CA3AF] hover:text-[#374151] transition-colors ml-2 shrink-0">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Details */}
        <div className="px-6 py-4 space-y-3 text-sm">
          {client.contactName && (
            <Row label="Contact" value={client.contactName} />
          )}
          {client.contactEmail && (
            <Row label="Email" value={client.contactEmail} />
          )}
          {client.owner && (
            <Row label="Owner" value={client.owner} />
          )}
          {client.plan && (
            <Row label="Plan" value={client.plan} />
          )}
          {client.renewalDate && (
            <Row label="Renewal" value={format(new Date(client.renewalDate), 'd MMM yyyy')} />
          )}
          {client.lastContacted && (
            <Row label="Last contacted" value={format(new Date(client.lastContacted), 'd MMM yyyy')} />
          )}
          {client.healthScore > 0 && (
            <Row label="Health score" value={`${client.healthScore}/35 (${client.healthRating})`} />
          )}
        </div>

        {/* Notes / Activity */}
        {client.notes && (
          <div className="px-6 pb-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5">Notes & Activity</p>
            <div className="bg-[#F7F7F8] rounded-lg p-3 text-sm text-[#374151] whitespace-pre-wrap">{client.notes}</div>
          </div>
        )}

        {/* Transcripts */}
        <div className="px-6 pb-4">
          <TranscriptSection
            transcripts={(() => { try { return JSON.parse(client.transcripts || '[]'); } catch { return []; } })()}
            onChange={async (val) => {
              const updated = { ...client, transcripts: JSON.stringify(val) };
              await base44.entities.Client.update(client.id, { transcripts: JSON.stringify(val) });
              onUpdated(updated);
            }}
          />
        </div>

        {/* No Reply log history */}
        {noReplyEntries.length > 0 && (
          <div className="px-6 pb-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5">No Reply History</p>
            <div className="space-y-1">
              {noReplyEntries.map((e, i) => (
                <div key={i} className="flex items-center gap-2 text-xs text-[#A16207] bg-[#FEF9C3] px-2.5 py-1.5 rounded-lg">
                  <MessageSquareOff className="w-3 h-3 shrink-0" />
                  {e.note}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Bugs section */}
        <div className="px-6 pb-4">
          <button
            className="w-full flex items-center justify-between py-2 text-left"
            onClick={() => setBugsOpen(o => !o)}
          >
            <div className="flex items-center gap-2">
              {bugsOpen ? <ChevronDown className="w-3.5 h-3.5 text-[#9CA3AF]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#9CA3AF]" />}
              <span className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">Bugs ({bugs.length})</span>
            </div>
          </button>
          {bugsOpen && (
            <div className="space-y-1.5 mt-1">
              {bugs.length === 0 ? (
                <p className="text-xs text-[#9CA3AF] italic pl-5">No bugs logged for this client.</p>
              ) : bugs.map(b => (
                <div key={b.id} className="flex items-center justify-between gap-2 bg-[#F7F7F8] rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${PRIORITY_STYLES[b.priority] || ''}`}>{b.priority}</span>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded whitespace-nowrap ${BUG_STATUS_STYLES[b.status] || ''}`}>{b.status}</span>
                    <span className="text-xs text-[#374151] truncate">{b.title || 'Untitled'}</span>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">{b.dateLogged || ''}</span>
                    {onViewBug && (
                      <button onClick={() => onViewBug(b)} className="text-[#8403C5] hover:text-[#6d02a3] transition-colors" title="View bug">
                        <ExternalLink className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 pt-2 border-t border-[#EBEBEB] flex items-center gap-2 flex-wrap">
          {done ? (
            <span className="flex items-center gap-1.5 text-sm text-[#15803D] font-medium">
              <CheckCircle2 className="w-4 h-4" /> No reply logged
            </span>
          ) : showConfirm ? (
            <div className="flex-1">
              <p className="text-sm text-[#374151] mb-2">
                Log no reply from <strong>{client.name}</strong>? This will be visible on their record and in the health view.
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleLogNoReply}
                  disabled={logging}
                  className="px-4 py-2 text-sm font-semibold bg-[#A16207] text-white rounded-lg hover:bg-[#92400E] transition-colors disabled:opacity-60"
                >
                  {logging ? 'Logging…' : 'Confirm'}
                </button>
                <button
                  onClick={() => setShowConfirm(false)}
                  className="px-4 py-2 text-sm font-medium text-[#6B7280] hover:bg-[#F7F7F8] rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-[#A16207] bg-[#FEF9C3] hover:bg-[#FDE68A] rounded-lg transition-colors border border-amber-200"
            >
              <MessageSquareOff className="w-3.5 h-3.5" />
              No Reply
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-start gap-2">
      <span className="text-[#9CA3AF] text-xs w-28 shrink-0 pt-0.5">{label}</span>
      <span className="text-[#374151] text-sm">{value}</span>
    </div>
  );
}