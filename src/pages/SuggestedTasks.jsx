import React, { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, parseISO } from 'date-fns';
import { Check, X, ExternalLink, Inbox, Clock, ChevronDown, ChevronRight } from 'lucide-react';
import ApproveSuggestedTaskModal from '@/components/suggested-tasks/ApproveSuggestedTaskModal';

export default function SuggestedTasks() {
  const { user } = useAuth();
  const isElena = (user?.email || '').toLowerCase().includes('elena');
  const [pending, setPending] = useState([]);
  const [dismissed, setDismissed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [approveItem, setApproveItem] = useState(null);
  const [dismissConfirm, setDismissConfirm] = useState(null);
  const [logOpen, setLogOpen] = useState(false);

  const load = useCallback(async () => {
    try {
      // Safety-net expiry on page load (workflow runs daily too)
      await base44.functions.invoke('expireOldSuggestedTasks', {});
    } catch {}
    try {
      const [pendPage, dismPage] = await Promise.all([
        base44.entities.SuggestedTask.filter({ status: 'Pending review' }, { sort: '-receivedDate', limit: 100 }),
        base44.entities.SuggestedTask.filter({ status: { $in: ['Dismissed', 'Expired'] } }, { sort: '-reviewedDate', limit: 50 }),
      ]);
      setPending(pendPage.items || []);
      setDismissed(dismPage.items || []);
    } catch {}
    setLoading(false);
    window.dispatchEvent(new CustomEvent('suggested-tasks-changed'));
  }, []);

  useEffect(() => { if (isElena) load(); }, [isElena, load]);

  const handleDismiss = async (item) => {
    await base44.entities.SuggestedTask.update(item.id, {
      status: 'Dismissed',
      reviewedBy: 'Elena',
      reviewedDate: new Date().toISOString().split('T')[0],
      dismissedReason: 'Dismissed by reviewer',
    });
    setDismissConfirm(null);
    load();
  };

  const handleApproved = () => {
    setApproveItem(null);
    load();
  };

  if (!isElena) {
    return <div className="p-8 text-sm text-[#9CA3AF]">Access restricted to Elena.</div>;
  }

  if (loading) {
    return (
      <div className="h-full overflow-y-auto bg-[#F6F6FB] p-8">
        <div className="w-6 h-6 border-2 border-[#EBEBF5] border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto bg-[#F6F6FB] font-dm">
      <div className="px-8 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[#242450] mb-1">Suggested Tasks</h1>
        <p className="text-sm text-[#5777AB]">
          {pending.length > 0
            ? `${pending.length} ${pending.length === 1 ? 'item' : 'items'} waiting for review`
            : 'No items waiting for review'}
        </p>
      </div>

      <div className="px-8 pb-8">
        {/* Pending items */}
        {pending.length === 0 ? (
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-12 text-center">
            <Inbox className="w-10 h-10 text-[#D8D8EE] mx-auto mb-3" />
            <p className="text-sm text-[#9CA3AF]">The queue is empty — emails classified as tasks will appear here for review.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {pending.map(item => (
              <div key={item.id} className="bg-white border border-[#EBEBF5] rounded-xl p-5">
                <div className="flex items-start justify-between gap-4 mb-2">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-[#242450]">{item.suggestedTitle || item.subject}</h3>
                    {item.suggestedDescription && (
                      <p className="text-sm text-[#5777AB] mt-1">{item.suggestedDescription}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button onClick={() => setApproveItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#8403C5] hover:bg-[#6B02A0] rounded-lg transition-colors">
                      <Check className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button onClick={() => setDismissConfirm(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#5777AB] border border-[#EBEBF5] hover:bg-[#F6F6FB] rounded-lg transition-colors">
                      <X className="w-3.5 h-3.5" /> Dismiss
                    </button>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs text-[#9CA3AF] mt-3 flex-wrap">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-semibold ${item.source === 'slack' ? 'bg-[#E8F7F2] text-[#1D9E75]' : 'bg-[#EEF2F8] text-[#5777AB]'}`}>
                    {item.source === 'slack' ? 'Slack' : 'Email'}
                  </span>
                  <span>From: {item.senderName || '—'}{item.senderEmail ? ` <${item.senderEmail}>` : ''}</span>
                  {item.receivedDate && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {(() => { try { return format(parseISO(item.receivedDate), 'd MMM yyyy, HH:mm'); } catch { return item.receivedDate; } })()}
                    </span>
                  )}
                  {item.requestedBy && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5] font-semibold">
                      Requested by: {item.requestedBy}
                    </span>
                  )}
                  {(item.sourceLink || item.sourceEmailLink) && (
                    <a href={item.sourceLink || item.sourceEmailLink} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[#5777AB] hover:text-[#8403C5]">
                      <ExternalLink className="w-3 h-3" /> {item.source === 'slack' ? 'Open in Slack' : 'Open email'}
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Dismissed / Expired log */}
        {dismissed.length > 0 && (
          <div className="mt-8">
            <button onClick={() => setLogOpen(o => !o)}
              className="flex items-center gap-2 text-sm font-medium text-[#9CA3AF] hover:text-[#5777AB] transition-colors">
              {logOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              Dismissed & expired log ({dismissed.length})
            </button>
            {logOpen && (
              <div className="mt-3 bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
                {dismissed.map((item, i) => (
                  <div key={item.id} className={`flex items-center justify-between gap-3 px-4 py-3 ${i > 0 ? 'border-t border-[#F2F2F4]' : ''}`}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${item.status === 'Expired' ? 'bg-[#FEF2F2] text-[#DC2626]' : 'bg-[#EBEBF5] text-[#5777AB]'}`}>
                          {item.status}
                        </span>
                        <p className="text-sm text-[#242450] truncate">{item.suggestedTitle || item.subject}</p>
                      </div>
                      {item.dismissedReason && <p className="text-xs text-[#9CA3AF] mt-0.5">{item.dismissedReason}</p>}
                    </div>
                    <span className="text-xs text-[#9CA3AF] shrink-0">
                      {item.reviewedDate ? format(parseISO(item.reviewedDate), 'd MMM yyyy') : ''}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {approveItem && (
        <ApproveSuggestedTaskModal item={approveItem} onClose={() => setApproveItem(null)} onApproved={handleApproved} />
      )}

      {dismissConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setDismissConfirm(null)}>
          <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-2">Dismiss this suggestion?</h3>
            <p className="text-sm text-[#5777AB] mb-5">No task will be created. This moves it to the dismissed log.</p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setDismissConfirm(null)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
              <button onClick={() => handleDismiss(dismissConfirm)} className="px-4 py-2 text-sm font-semibold text-white bg-[#DC2626] hover:bg-[#B91C1C] rounded-lg">Dismiss</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}