import React from 'react';
import { X, Link2 } from 'lucide-react';
import { format, parseISO } from 'date-fns';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function TechScoreChip({ score }) {
  if (score == null || score === '') return <span className="text-[#9CA3AF]">—</span>;
  const n = Number(score);
  let cls = '';
  if (n <= 4) cls = 'bg-[#FEF2F2] text-[#DC2626]';
  else if (n <= 7) cls = 'bg-[#FFFBEB] text-[#A16207]';
  else cls = 'bg-[#E8F7F2] text-[#1D9E75]';
  return (
    <span className={`text-sm font-bold px-3 py-1 rounded-full ${cls}`}>{n}/10</span>
  );
}

function StatusPill({ status }) {
  if (status === 'Attached') {
    return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#E8F7F2] text-[#1D9E75]">Attached</span>;
  }
  return <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-[#F3E8FF] text-[#8403C5]">New</span>;
}

function FieldRow({ label, value, large }) {
  return (
    <div className="py-3 border-b border-[#F2F2F4] last:border-0">
      <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{label}</p>
      {large
        ? <p className="text-sm text-[#242450] leading-relaxed whitespace-pre-wrap">{value || '—'}</p>
        : <p className="text-sm font-medium text-[#242450]">{value || '—'}</p>
      }
    </div>
  );
}

export default function DemoResponseDetailPanel({ record, onClose, onAttach }) {
  const isAttached = record.status === 'Attached';

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />

      {/* Panel */}
      <div className="fixed right-0 top-0 h-full w-[480px] bg-white border-l border-[#EBEBF5] z-50 flex flex-col shadow-xl overflow-hidden">
        {/* Header */}
        <div className="shrink-0 flex items-center justify-between px-6 py-4 border-b border-[#EBEBF5] bg-[#242450]">
          <h2 className="text-sm font-bold text-white">Response Detail</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4 text-white/70" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {/* Summary section */}
          <div className="px-6 py-5 border-b border-[#EBEBF5]">
            <h3 className="text-xl font-bold text-[#242450]">{record.name}</h3>
            {record.company && <p className="text-sm text-[#5777AB] mt-0.5">{record.company}</p>}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <StatusPill status={record.status} />
              <span className="text-xs text-[#9CA3AF]">Submitted {fmtDate(record.dateSubmitted)}</span>
            </div>
            {isAttached && record.attachedToName && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-[#5777AB]">
                <Link2 className="w-3 h-3" />
                <span>Linked to: <span className="font-semibold text-[#242450]">{record.attachedToName}</span></span>
              </div>
            )}
          </div>

          {/* Attach button */}
          <div className="px-6 py-4 border-b border-[#EBEBF5]">
            {isAttached ? (
              <div className="flex items-center gap-2 px-4 py-2.5 bg-[#E8F7F2] rounded-lg">
                <Link2 className="w-4 h-4 text-[#1D9E75]" />
                <span className="text-sm font-semibold text-[#1D9E75]">Attached ✓</span>
                {record.attachedToName && (
                  <span className="text-sm text-[#242450] ml-1">— {record.attachedToName}</span>
                )}
              </div>
            ) : (
              <button
                onClick={() => onAttach(record)}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#8403C5] hover:bg-[#6B02A0] text-white text-sm font-semibold rounded-lg transition-colors">
                <Link2 className="w-4 h-4" /> Attach to Pipeline Item
              </button>
            )}
          </div>

          {/* Form responses */}
          <div className="px-6 py-4">
            <p className="text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-3">Pre-Demo Questionnaire Responses</p>
            <div>
              <FieldRow label="Accounting Platform" value={record.accountingPlatform} />
              <FieldRow label="Uses POs (Purchase Orders)" value={record.usesPOs} />
              <FieldRow label="Ticketing Platform(s)" value={record.ticketingPlatforms} />
              <FieldRow label="Tickets Sold Annually" value={record.ticketsSoldAnnually} />
              <div className="py-3 border-b border-[#F2F2F4]">
                <p className="text-[10px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1.5">Tech-Forward Score</p>
                <TechScoreChip score={record.techForwardScore} />
              </div>
              <FieldRow label="Describe your finance team" value={record.financeTeamDescription} large />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}