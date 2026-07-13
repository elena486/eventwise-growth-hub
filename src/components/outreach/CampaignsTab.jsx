import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { startOfWeek, subWeeks, addDays, format, parseISO } from 'date-fns';

const DATE_PRESETS = ['This week', 'Last week', 'Last 4 weeks', 'Last 12 weeks', 'All time'];

const AUDIENCE_STYLES = {
  Events: 'bg-[#EEF2F8] text-[#5777AB]',
  Agencies: 'bg-[#E8F7F2] text-[#1D9E75]',
  Mixed: 'bg-[#F3E8FF] text-[#8403C5]',
  Suppliers: 'bg-[#FFFBEB] text-[#E8A020]',
};

const STATUS_STYLES = {
  Active: 'bg-green-100 text-green-700',
  Paused: 'bg-amber-100 text-amber-700',
  Completed: 'bg-gray-100 text-gray-500',
  Killed: 'bg-red-100 text-red-600',
};

function getRange(preset) {
  const thisMonday = startOfWeek(new Date(), { weekStartsOn: 1 });
  if (preset === 'All time') return { start: new Date(0), end: new Date(8640000000000000) };
  if (preset === 'This week') return { start: thisMonday, end: addDays(thisMonday, 7) };
  if (preset === 'Last week') {
    const lastMonday = subWeeks(thisMonday, 1);
    return { start: lastMonday, end: thisMonday };
  }
  const weeks = preset === 'Last 4 weeks' ? 4 : 12;
  return { start: subWeeks(thisMonday, weeks), end: addDays(thisMonday, 7) };
}

function inRange(dateStr, range) {
  if (!dateStr) return false;
  const d = parseISO(dateStr);
  return d >= range.start && d < range.end;
}

function avg(arr, key) {
  const valid = arr.filter(x => x[key] != null && !isNaN(x[key]));
  return valid.length ? valid.reduce((s, x) => s + x[key], 0) / valid.length : null;
}

function fmtPct(val) {
  return val != null ? val.toFixed(1) + '%' : '—';
}

export default function CampaignsTab({ snapshots }) {
  const [datePreset, setDatePreset] = useState('Last 4 weeks');
  const [audienceFilter, setAudienceFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [tpFilter, setTpFilter] = useState('All');
  const [collapsed, setCollapsed] = useState({});

  const range = getRange(datePreset);

  const allTPs = useMemo(() => {
    return ['All', ...Array.from(new Set(snapshots.map(s => s.touchpoint).filter(Boolean))).sort()];
  }, [snapshots]);

  const filtered = useMemo(() => {
    return snapshots.filter(s => {
      if (!inRange(s.weekCommencing, range)) return false;
      if (audienceFilter !== 'All' && s.audience !== audienceFilter) return false;
      if (statusFilter !== 'All' && s.status !== statusFilter) return false;
      if (tpFilter !== 'All' && s.touchpoint !== tpFilter) return false;
      return true;
    });
  }, [snapshots, range, audienceFilter, statusFilter, tpFilter]);

  const groups = useMemo(() => {
    const map = {};
    filtered.forEach(s => {
      if (!map[s.campaignName]) map[s.campaignName] = [];
      map[s.campaignName].push(s);
    });
    return Object.entries(map).map(([name, snaps]) => {
      snaps.sort((a, b) => (a.touchpoint || '').localeCompare(b.touchpoint || ''));
      return {
        name,
        snapshots: snaps,
        totalSent: snaps.reduce((sum, s) => sum + (s.emailsSent || 0), 0),
        avgOpen: avg(snaps, 'openRate'),
        avgReply: avg(snaps, 'replyRate'),
        totalMeetings: snaps.reduce((sum, s) => sum + (s.meetingsBooked || 0), 0),
        audience: snaps[0]?.audience,
        status: snaps[0]?.status,
      };
    }).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const toggle = (name) => setCollapsed(prev => ({ ...prev, [name]: !prev[name] }));

  const allCollapsed = groups.length > 0 && groups.every(g => collapsed[g.name]);
  const toggleAll = () => {
    if (allCollapsed) setCollapsed({});
    else {
      const next = {};
      groups.forEach(g => { next[g.name] = true; });
      setCollapsed(next);
    }
  };

  if (filtered.length === 0) {
    return (
      <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
        <p className="text-sm text-ew-muted">No campaigns match these filters.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        {DATE_PRESETS.map(p => (
          <button
            key={p}
            onClick={() => setDatePreset(p)}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${datePreset === p ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}
          >
            {p}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          {['All', 'Events', 'Agencies', 'Mixed', 'Suppliers'].map(a => (
            <button
              key={a}
              onClick={() => setAudienceFilter(a)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${audienceFilter === a ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}
            >
              {a}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {['All', 'Active', 'Paused', 'Completed', 'Killed'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${statusFilter === s ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}
            >
              {s}
            </button>
          ))}
          <span className="w-px h-5 bg-ew-border mx-1" />
          {allTPs.map(t => (
            <button
              key={t}
              onClick={() => setTpFilter(t)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${tpFilter === t ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}
            >
              {t}
            </button>
          ))}
        </div>
        <button
          onClick={toggleAll}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-ew-border bg-white text-ew-body hover:bg-ew-bg rounded-lg transition-colors"
        >
          {allCollapsed ? <><ChevronRight className="w-3.5 h-3.5" /> Expand all</> : <><ChevronDown className="w-3.5 h-3.5" /> Collapse all</>}
        </button>
      </div>

      {/* Campaign groups */}
      <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[1000px]">
          <thead className="bg-[#F6F6FB] border-b border-ew-border">
            <tr>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em] w-8"></th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Campaign / Touchpoint</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Variant</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Audience</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Status</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Sent</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Open %</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Reply %</th>
              <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Delivery %</th>
              <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Week</th>
            </tr>
          </thead>
          <tbody>
            {groups.map((g) => {
              const isCollapsed = collapsed[g.name];
              return (
                <React.Fragment key={g.name}>
                  {/* Parent row */}
                  <tr
                    className="border-b border-ew-border bg-[#FAFBFE] hover:bg-[#F6F6FB] cursor-pointer"
                    onClick={() => toggle(g.name)}
                  >
                    <td className="px-3 py-3">
                      {isCollapsed ? <ChevronRight className="w-4 h-4 text-ew-muted" /> : <ChevronDown className="w-4 h-4 text-ew-muted" />}
                    </td>
                    <td className="px-3 py-3">
                      <p className="text-sm font-bold text-navy">{g.name}</p>
                      <p className="text-[10px] text-ew-muted">{g.snapshots.length} touchpoint{g.snapshots.length !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-3 py-3"></td>
                    <td className="px-3 py-3">
                      {g.audience && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AUDIENCE_STYLES[g.audience] || 'bg-gray-100 text-gray-500'}`}>{g.audience}</span>}
                    </td>
                    <td className="px-3 py-3">
                      {g.status && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[g.status] || 'bg-gray-100 text-gray-500'}`}>{g.status}</span>}
                    </td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-navy">{g.totalSent.toLocaleString()}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-navy">{fmtPct(g.avgOpen)}</td>
                    <td className="px-3 py-3 text-right text-xs font-semibold text-[#8403C5]">{fmtPct(g.avgReply)}</td>
                    <td className="px-3 py-3 text-right text-xs text-ew-muted">—</td>
                    <td className="px-3 py-3 text-xs text-ew-muted">—</td>
                  </tr>

                  {/* Child rows */}
                  {!isCollapsed && g.snapshots.map((s, si) => (
                    <tr key={s.id || si} className={`border-b border-ew-border hover:bg-[#F6F6FB] ${si % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                      <td className="px-3 py-2.5"></td>
                      <td className="px-3 py-2.5 pl-8">
                        <span className="text-xs font-semibold text-navy">{s.touchpoint || '—'}</span>
                      </td>
                      <td className="px-3 py-2.5">
                        {s.variant && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-[#F3E8FF] text-[#8403C5]">{s.variant}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {s.audience && <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${AUDIENCE_STYLES[s.audience] || 'bg-gray-100 text-gray-500'}`}>{s.audience}</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {s.status && <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${STATUS_STYLES[s.status] || 'bg-gray-100 text-gray-500'}`}>{s.status}</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{s.emailsSent != null ? s.emailsSent.toLocaleString() : '—'}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{fmtPct(s.openRate)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{fmtPct(s.replyRate)}</td>
                      <td className="px-3 py-2.5 text-right text-xs font-medium text-navy">{fmtPct(s.deliveryRate)}</td>
                      <td className="px-3 py-2.5 text-xs text-ew-muted">{s.weekCommencing ? format(parseISO(s.weekCommencing), 'd MMM yy') : '—'}</td>
                    </tr>
                  ))}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}