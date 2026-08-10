import React from 'react';
import { AlertTriangle, Users } from 'lucide-react';
import { formatOverlapRange } from './leaveOverlaps';

/**
 * Lightweight banner surfacing overlapping approved leave (2+ people out
 * on the same day(s)). Informational only — does not block approval.
 */
export default function OverlapWarningBanner({ overlaps }) {
  if (!overlaps || overlaps.length === 0) return null;

  return (
    <div className="mb-4 space-y-2">
      {overlaps.map((o, i) => {
        const high = o.count >= 3;
        return (
          <div
            key={i}
            className={`flex items-start gap-2.5 px-4 py-2.5 rounded-xl border text-sm ${
              high
                ? 'bg-[#FEF2F2] border-[#FECACA] text-[#B91C1C]'
                : 'bg-[#FFFBEB] border-[#FDE68A] text-[#A16207]'
            }`}
          >
            <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${high ? 'text-[#DC2626]' : 'text-[#E8A020]'}`} />
            <div className="flex-1">
              <span className="font-semibold">
                {o.count} people out {formatOverlapRange(o.startDate, o.endDate)}
              </span>
              <span className="opacity-80"> — {o.people.join(', ')}</span>
            </div>
            <Users className={`w-4 h-4 shrink-0 mt-0.5 ${high ? 'text-[#DC2626]' : 'text-[#E8A020]'}`} />
          </div>
        );
      })}
    </div>
  );
}