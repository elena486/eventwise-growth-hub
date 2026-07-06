import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Check, X } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function calcWorkingDays(start, end) {
  if (!start || !end) return 0;
  try {
    let s = new Date(start), e = new Date(end), count = 0;
    while (s <= e) {
      const d = s.getDay();
      if (d !== 0 && d !== 6) count++;
      s = new Date(s.getTime() + 86400000);
    }
    return Math.max(count, 1);
  } catch { return 1; }
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

const AVATAR_COLORS = {
  George: 'bg-[#1D4ED8]', Martinique: 'bg-[#8403C5]',
};

function Avatar({ name }) {
  const initials = (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const color = AVATAR_COLORS[name] || 'bg-[#5777AB]';
  return (
    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0 ${color}`}>
      {initials}
    </div>
  );
}

export default function ApprovalQueue({ currentUserName, onApproved }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [declineConfirm, setDeclineConfirm] = useState(null);

  const load = async () => {
    setLoading(true);
    const data = await base44.entities.LeaveEntry.filter({ status: 'Requested' }, 'startDate', 200);
    setEntries(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleApprove = async (entry) => {
    await base44.entities.LeaveEntry.update(entry.id, { status: 'Approved', approvedBy: currentUserName });
    await base44.entities.Notification.create({
      recipientName: entry.personName,
      type: 'task_status_changed',
      message: `${currentUserName} approved your ${entry.type} request (${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate)}).`,
      actorName: currentUserName,
      navigateTo: 'leave',
      recordId: entry.id,
    });
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    onApproved?.();
  };

  const handleDecline = async (entry) => {
    await base44.entities.LeaveEntry.update(entry.id, { status: 'Declined' });
    await base44.entities.Notification.create({
      recipientName: entry.personName,
      type: 'task_status_changed',
      message: `${currentUserName} declined your ${entry.type} request (${fmtDate(entry.startDate)} – ${fmtDate(entry.endDate)}).`,
      actorName: currentUserName,
      navigateTo: 'leave',
      recordId: entry.id,
    });
    setEntries(prev => prev.filter(e => e.id !== entry.id));
    setDeclineConfirm(null);
  };

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <h2 className="text-[15px] font-bold text-[#242450]">Approval Queue</h2>
        {entries.length > 0 && (
          <span className="px-2 py-0.5 text-xs font-bold bg-[#FEF9C3] text-[#A16207] rounded-full">{entries.length} pending</span>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-10 text-center">
          <p className="text-sm font-medium text-[#5777AB]">No pending leave requests</p>
        </div>
      ) : (
        <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#EBEBF5] bg-[#F6F6FB]">
                {['Person', 'Type', 'Start', 'End', 'Days', 'Notes', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {entries.map(entry => {
                const days = calcWorkingDays(entry.startDate, entry.endDate);
                return (
                  <tr key={entry.id} className="border-b border-[#EBEBF5] hover:bg-[#F9FAFB] transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Avatar name={entry.personName} />
                        <span className="text-sm font-semibold text-[#242450]">{entry.personName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#EEF2F8] text-[#5777AB]">{entry.type}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#1A1A3A]">{fmtDate(entry.startDate)}</td>
                    <td className="px-4 py-3 text-sm text-[#1A1A3A]">{fmtDate(entry.endDate)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#242450]">{days}</td>
                    <td className="px-4 py-3 text-xs text-[#5777AB] max-w-[180px]">
                      <span className="line-clamp-2">{entry.notes || '—'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => handleApprove(entry)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#E8F7F2] text-[#1D9E75] hover:bg-[#1D9E75] hover:text-white rounded-lg transition-colors"
                        >
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button
                          onClick={() => setDeclineConfirm(entry)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold bg-[#FEF2F2] text-[#DC2626] hover:bg-[#DC2626] hover:text-white rounded-lg transition-colors"
                        >
                          <X className="w-3 h-3" /> Decline
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {declineConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeclineConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-[#242450] mb-2">Decline request?</h3>
            <p className="text-sm text-[#5777AB] mb-5">
              Decline <strong>{declineConfirm.personName}</strong>'s {declineConfirm.type} request ({fmtDate(declineConfirm.startDate)} – {fmtDate(declineConfirm.endDate)})? This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeclineConfirm(null)} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
              <button onClick={() => handleDecline(declineConfirm)} className="px-4 py-2 text-sm font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]">Confirm Decline</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}