import React from 'react';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

export default function LeaveDeleteConfirm({ entry, onConfirm, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-base font-bold text-[#242450] mb-2">Delete leave entry?</h3>
        <p className="text-sm text-[#5777AB] mb-5">
          Are you sure you want to delete this leave entry for <strong>{entry.personName}</strong> ({fmtDate(entry.startDate)} to {fmtDate(entry.endDate)})? This cannot be undone.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
          <button onClick={onConfirm} className="px-4 py-2 text-sm font-semibold bg-[#DC2626] text-white rounded-lg hover:bg-[#B91C1C]">Confirm</button>
        </div>
      </div>
    </div>
  );
}