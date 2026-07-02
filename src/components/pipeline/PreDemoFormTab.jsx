import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { AlertTriangle, ExternalLink } from 'lucide-react';

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'dd/MM/yyyy'); } catch { return d; }
}

function TechScoreChip({ score }) {
  if (score == null || score === '') return <span className="text-ew-muted">—</span>;
  const n = Number(score);
  let cls = '';
  if (n <= 4) cls = 'bg-[#FEF2F2] text-[#DC2626]';
  else if (n <= 7) cls = 'bg-[#FFFBEB] text-[#A16207]';
  else cls = 'bg-[#E8F7F2] text-[#1D9E75]';
  return <span className={`text-sm font-bold px-3 py-1 rounded-full ${cls}`}>{n}/10</span>;
}

function ReadRow({ label, children }) {
  return (
    <div className="py-3 border-b border-[#F2F2F4] last:border-0">
      <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.08em] mb-1">{label}</p>
      <div className="text-sm font-medium text-[#242450]">{children}</div>
    </div>
  );
}

export default function PreDemoFormTab({ leadId, onNavigateToDemoResponses }) {
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!leadId) return;
    setLoading(true);
    base44.entities.DemoFormResponse.filter({ attachedToId: leadId })
      .then(data => setResponse(data?.[0] || null))
      .catch(() => setResponse(null))
      .finally(() => setLoading(false));

    // Real-time sync
    const unsub = base44.entities.DemoFormResponse.subscribe((event) => {
      if (event.type === 'create' && event.data?.attachedToId === leadId) {
        setResponse(event.data);
      } else if (event.type === 'update') {
        if (event.data?.attachedToId === leadId) {
          setResponse(event.data);
        } else if (response?.id === event.id) {
          // Was detached from this lead
          setResponse(null);
        }
      } else if (event.type === 'delete' && response?.id === event.id) {
        setResponse(null);
      }
    });
    return unsub;
  }, [leadId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  if (!response) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center">
          <span className="text-lg">📋</span>
        </div>
        <p className="text-sm font-semibold text-[#242450]">No pre-demo form attached yet</p>
        <p className="text-xs text-ew-muted leading-relaxed max-w-[240px]">
          Attach one from the Demo Responses tab in Sales.
        </p>
        <button
          onClick={onNavigateToDemoResponses}
          className="mt-1 flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-[#8403C5] border border-[#8403C5]/30 bg-[#F3E8FF] hover:bg-[#E9D5FF] rounded-lg transition-colors"
        >
          <ExternalLink className="w-3.5 h-3.5" /> Go to Demo Responses →
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Respondent header */}
      <div className="bg-[#F6F6FB] rounded-xl px-4 py-3 mb-4 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-[#242450]">{response.name}</p>
          {response.company && <p className="text-xs text-ew-muted mt-0.5">{response.company}</p>}
          <p className="text-xs text-ew-muted mt-0.5">Submitted {fmtDate(response.dateSubmitted)}</p>
        </div>
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#E8F7F2] text-[#1D9E75] shrink-0">Attached</span>
      </div>

      {/* Read-only responses */}
      <div>
        <ReadRow label="Accounting Platform">
          {response.accountingPlatform || '—'}
        </ReadRow>
        <ReadRow label="Uses POs (Purchase Orders)">
          {response.usesPOs || '—'}
        </ReadRow>
        <ReadRow label="Ticketing Platform(s)">
          {response.ticketingPlatforms || '—'}
        </ReadRow>
        <ReadRow label="Tickets Sold Annually">
          {response.ticketsSoldAnnually || '—'}
        </ReadRow>
        <ReadRow label="Tech-Forward Score">
          <TechScoreChip score={response.techForwardScore} />
        </ReadRow>
        <ReadRow label="Describe Your Finance Team">
          <p className="text-sm text-[#242450] whitespace-pre-wrap leading-relaxed">
            {response.financeTeamDescription || '—'}
          </p>
        </ReadRow>
      </div>

      <p className="text-[11px] text-ew-muted mt-4 flex items-center gap-1">
        <AlertTriangle className="w-3 h-3" />
        Read-only. To edit, go to the Demo Responses tab in Sales.
      </p>
    </div>
  );
}