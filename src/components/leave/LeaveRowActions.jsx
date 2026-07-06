import React, { useState } from 'react';
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';

const ADMINS = ['Elena', 'Chris'];

export function canDeleteLeave(entry, currentUserName) {
  if (ADMINS.includes(currentUserName)) return true;
  if (entry.personName === currentUserName && entry.status === 'Requested') return true;
  return false;
}

export default function LeaveRowActions({ entry, currentUserName, onEdit, onDelete }) {
  const [open, setOpen] = useState(false);
  const canDelete = canDeleteLeave(entry, currentUserName);
  if (!canDelete && !onEdit) return null;

  return (
    <div className="relative inline-block" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="p-1 rounded hover:bg-[#F6F6FB] text-[#9CA3AF] hover:text-[#5777AB] transition-colors">
        <MoreHorizontal className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-32 py-1">
            {onEdit && (
              <button onClick={() => { setOpen(false); onEdit(entry); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242450] hover:bg-[#F6F6FB] transition-colors">
                <Pencil className="w-3 h-3" /> Edit
              </button>
            )}
            {canDelete && (
              <button onClick={() => { setOpen(false); onDelete(entry); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#DC2626] hover:bg-[#FEF2F2] transition-colors">
                <Trash2 className="w-3 h-3" /> Delete
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}