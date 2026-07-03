import React, { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { MoreHorizontal, Link2 } from 'lucide-react';
import DemoResponseDetailPanel from '@/components/sales/DemoResponseDetailPanel';
import AttachToPipelineModal from '@/components/sales/AttachToPipelineModal';

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
    <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${cls}`}>{n}/10</span>
  );
}

function StatusPill({ status }) {
  if (status === 'Attached') {
    return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#E8F7F2] text-[#1D9E75]">Attached</span>;
  }
  return <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5]">New</span>;
}

function RowMenu({ record, onAttach }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative" onClick={e => e.stopPropagation()}>
      <button onClick={() => setOpen(o => !o)}
        className="p-1 rounded hover:bg-[#F6F6FB] text-[#9CA3AF] hover:text-[#5777AB] transition-colors">
        <MoreHorizontal className="w-3.5 h-3.5" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-full mt-1 bg-white border border-[#EBEBF5] rounded-lg shadow-lg z-50 w-44 py-1">
            {record.status === 'New' ? (
              <button
                onClick={() => { setOpen(false); onAttach(record); }}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-[#242450] hover:bg-[#F6F6FB] transition-colors">
                <Link2 className="w-3 h-3" /> Attach to Pipeline
              </button>
            ) : (
              <div className="px-3 py-1.5 text-xs text-[#9CA3AF] cursor-default flex items-center gap-1.5">
                <Link2 className="w-3 h-3" /> Attached ✓
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

export default function DemoFormResponses() {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selected, setSelected] = useState(null);
  const [attachTarget, setAttachTarget] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const data = await base44.entities.DemoFormResponse.list('-dateSubmitted', 500);
      setRecords(data);
    } catch {}
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const displayed = useMemo(() => {
    if (filter === 'new') return records.filter(r => r.status === 'New');
    return records;
  }, [records, filter]);

  const handleAttached = (recordId, leadId, leadName) => {
    setRecords(prev => prev.map(r =>
      r.id === recordId ? { ...r, status: 'Attached', attachedToId: leadId, attachedToName: leadName } : r
    ));
    if (selected?.id === recordId) {
      setSelected(prev => ({ ...prev, status: 'Attached', attachedToId: leadId, attachedToName: leadName }));
    }
    setAttachTarget(null);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-[#F6F6FB] font-dm">
      {/* Header */}
      <div className="shrink-0 px-8 pt-6 pb-4">
        <h1 className="text-2xl font-bold text-[#242450]">Demo Form Responses</h1>
        <p className="text-[13px] text-[#5777AB] mt-1">Pre-demo questionnaire submissions — synced automatically via Zapier</p>

        {/* Filter pills */}
        <div className="flex items-center gap-2 mt-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === 'all' ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            All
          </button>
          <button
            onClick={() => setFilter('new')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${filter === 'new' ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
            New only
          </button>
          <span className="text-xs text-[#9CA3AF] ml-2">{displayed.length} record{displayed.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
          </div>
        ) : displayed.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-48 gap-2">
            <p className="text-sm text-[#5777AB] font-medium">No responses yet</p>
            <p className="text-xs text-[#9CA3AF]">Records will appear here automatically when the Google Form is submitted</p>
          </div>
        ) : (
          <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
            <table className="w-full text-sm min-w-[800px]">
              <thead>
                <tr className="border-b border-[#EBEBF5]">
                  {['Name', 'Company', 'Date Submitted', 'Accounting Platform', 'Ticketing Platform(s)', 'Tech Score', 'Status', 'Attached To', ''].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-bold text-[#5777AB] uppercase tracking-[0.08em] whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {displayed.map(r => (
                  <tr key={r.id}
                    onClick={() => setSelected(r)}
                    className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F6F6FB] transition-colors cursor-pointer">
                    <td className="px-4 py-3 font-semibold text-[#242450] whitespace-nowrap">{r.name || '—'}</td>
                    <td className="px-4 py-3 text-[#5777AB] whitespace-nowrap">{r.company || '—'}</td>
                    <td className="px-4 py-3 text-[#5777AB] whitespace-nowrap">{fmtDate(r.dateSubmitted)}</td>
                    <td className="px-4 py-3 text-[#242450] whitespace-nowrap">{r.accountingPlatform || '—'}</td>
                    <td className="px-4 py-3 text-[#5777AB] whitespace-nowrap">{r.ticketingPlatforms || '—'}</td>
                    <td className="px-4 py-3"><TechScoreChip score={r.techForwardScore} /></td>
                    <td className="px-4 py-3"><StatusPill status={r.status} /></td>
                    <td className="px-4 py-3 text-[#5777AB] whitespace-nowrap text-xs">{r.attachedToName || '—'}</td>
                    <td className="px-4 py-3">
                      <RowMenu record={r} onAttach={setAttachTarget} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selected && (
        <DemoResponseDetailPanel
          record={selected}
          onClose={() => setSelected(null)}
          onAttach={(rec) => setAttachTarget(rec)}
          onUpdated={(updated) => {
            setRecords(prev => prev.map(r => r.id === updated.id ? updated : r));
            setSelected(updated);
          }}
          onDeleted={(id) => {
            setRecords(prev => prev.filter(r => r.id !== id));
            setSelected(null);
          }}
        />
      )}

      {/* Attach modal */}
      {attachTarget && (
        <AttachToPipelineModal
          record={attachTarget}
          onClose={() => setAttachTarget(null)}
          onAttached={handleAttached}
        />
      )}
    </div>
  );
}