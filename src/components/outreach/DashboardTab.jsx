import React, { useState, useMemo } from 'react';
import { Sparkles, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { base44 } from '@/api/base44Client';
import { startOfWeek, subWeeks, addDays, format, parseISO } from 'date-fns';

const DATE_PRESETS = ['This week', 'Last week', 'Last 4 weeks', 'Last 12 weeks', 'All time'];

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

function getPriorRange(preset) {
  if (preset === 'All time') return null;
  const current = getRange(preset);
  const duration = current.end - current.start;
  return { start: new Date(current.start.getTime() - duration), end: current.start };
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

function calcStats(snaps) {
  return {
    totalSent: snaps.reduce((s, c) => s + (c.emailsSent || 0), 0),
    avgOpen: avg(snaps, 'openRate'),
    avgReply: avg(snaps, 'replyRate'),
    totalMeetings: snaps.reduce((s, c) => s + (c.meetingsBooked || 0), 0),
  };
}

function fmtPct(val) {
  return val != null ? val.toFixed(1) + '%' : '—';
}

function fmtNum(val) {
  return val != null ? val.toLocaleString('en-GB') : '—';
}

function StatCard({ label, value, sub, delta }) {
  return (
    <div className="bg-white border border-ew-border rounded-xl p-5 relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#8403C5]" />
      <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-1">{label}</p>
      <p className="text-3xl font-bold text-navy">{value}</p>
      {delta != null && (
        <p className={`text-[11px] font-semibold mt-1 flex items-center gap-0.5 ${delta >= 0 ? 'text-[#1D9E75]' : 'text-[#DC2626]'}`}>
          {delta >= 0 ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
          {Math.abs(delta).toFixed(1)}% vs prior
        </p>
      )}
      {sub && !delta && <p className="text-[11px] text-ew-muted mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardTab({ snapshots, subjectLines, uploads, onRefresh }) {
  const [datePreset, setDatePreset] = useState('Last 4 weeks');
  const [regenerating, setRegenerating] = useState(false);

  const range = getRange(datePreset);
  const priorRange = getPriorRange(datePreset);

  const filtered = useMemo(() => {
    return snapshots.filter(s => inRange(s.weekCommencing, range));
  }, [snapshots, range]);

  const priorFiltered = useMemo(() => {
    if (!priorRange) return [];
    return snapshots.filter(s => inRange(s.weekCommencing, priorRange));
  }, [snapshots, priorRange]);

  const current = calcStats(filtered);
  const prior = calcStats(priorFiltered);

  const calcDelta = (curr, prev) => {
    if (prev == null || prev === 0 || curr == null) return null;
    return ((curr - prev) / Math.abs(prev)) * 100;
  };

  // AI insights — most recent upload
  const latestUpload = uploads[0];
  const latestSummary = latestUpload ? JSON.parse(latestUpload.aiSummary || '{}') : {};
  const aiObservations = latestSummary.ai_observations || '';

  // Trend data
  const trendData = useMemo(() => {
    const byWeek = {};
    filtered.forEach(s => {
      const week = s.weekCommencing;
      if (!byWeek[week]) byWeek[week] = { week, openRates: [], replyRates: [] };
      if (s.openRate != null) byWeek[week].openRates.push(s.openRate);
      if (s.replyRate != null) byWeek[week].replyRates.push(s.replyRate);
    });
    return Object.values(byWeek)
      .map(w => ({
        week: w.week,
        label: format(parseISO(w.week), 'd MMM'),
        openRate: w.openRates.length ? w.openRates.reduce((a, b) => a + b, 0) / w.openRates.length : null,
        replyRate: w.replyRates.length ? w.replyRates.reduce((a, b) => a + b, 0) / w.replyRates.length : null,
      }))
      .sort((a, b) => a.week.localeCompare(b.week));
  }, [filtered]);

  // Subject lines for period
  const periodSubjectLines = useMemo(() => {
    return subjectLines
      .filter(s => inRange(s.weekCommencing, range))
      .sort((a, b) => (b.openRate || 0) - (a.openRate || 0));
  }, [subjectLines, range]);

  const handleRegenerate = async () => {
    if (!latestUpload || regenerating) return;
    setRegenerating(true);
    try {
      const fileUrls = JSON.parse(latestUpload.fileUrls || '[]');
      const files = fileUrls.length > 0 ? fileUrls : [{ url: latestUpload.fileUrl, name: latestUpload.fileName }];
      const sls = JSON.parse(latestUpload.subjectLines || '[]');
      const response = await base44.functions.invoke('processApolloUpload', {
        files,
        subjectLines: sls,
        commentary: latestUpload.georgesNotes || '',
      });
      const aiResult = response.data;
      if (aiResult.summary) {
        const newSummary = JSON.stringify(aiResult.summary);
        await base44.entities.ApolloWeeklyUpload.update(latestUpload.id, { aiSummary: newSummary });
        const weekSnaps = snapshots.filter(s => s.weekCommencing === latestUpload.weekOf);
        if (weekSnaps.length > 0) {
          await base44.entities.OutreachWeeklySnapshot.bulkUpdate(
            weekSnaps.map(s => ({ id: s.id, aiSummary: newSummary }))
          );
        }
        onRefresh();
      }
    } catch (e) {
      console.error('Regenerate error:', e);
    }
    setRegenerating(false);
  };

  const weekLabel = latestUpload?.weekOf
    ? `${format(parseISO(latestUpload.weekOf), 'd MMM')} – ${format(addDays(parseISO(latestUpload.weekOf), 4), 'd MMM yyyy')}`
    : '';

  return (
    <div className="space-y-6">
      {/* Date filter */}
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

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Emails Sent" value={fmtNum(current.totalSent)} delta={datePreset !== 'All time' ? calcDelta(current.totalSent, prior.totalSent) : null} />
        <StatCard label="Avg Open Rate" value={fmtPct(current.avgOpen)} delta={datePreset !== 'All time' ? calcDelta(current.avgOpen, prior.avgOpen) : null} />
        <StatCard label="Avg Reply Rate" value={fmtPct(current.avgReply)} delta={datePreset !== 'All time' ? calcDelta(current.avgReply, prior.avgReply) : null} />
        <StatCard label="Meetings Booked" value={fmtNum(current.totalMeetings)} delta={datePreset !== 'All time' ? calcDelta(current.totalMeetings, prior.totalMeetings) : null} />
      </div>

      {/* AI Insights card */}
      {aiObservations && (
        <div className="bg-gradient-to-br from-[#F3E8FF] to-[#EEF2FF] border border-[#8403C5]/20 rounded-xl p-5">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h2 className="text-sm font-bold text-navy flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-[#8403C5]" /> Campaign Intelligence
              </h2>
              {weekLabel && <p className="text-[11px] text-ew-muted mt-0.5">{weekLabel}</p>}
            </div>
            <button
              onClick={handleRegenerate}
              disabled={regenerating}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-white border border-[#8403C5]/30 text-[#8403C5] rounded-lg hover:bg-[#F3E8FF] transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3 h-3 ${regenerating ? 'animate-spin' : ''}`} />
              {regenerating ? 'Regenerating...' : 'Regenerate'}
            </button>
          </div>
          <p className="text-sm text-ew-body leading-relaxed">{aiObservations}</p>
        </div>
      )}

      {/* Trend charts */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Trends</h2>
        {trendData.length < 2 ? (
          <div className="bg-white border border-ew-border rounded-xl p-8 flex flex-col items-center gap-3 text-center">
            <TrendingUp className="w-8 h-8 text-ew-muted opacity-40" />
            <p className="text-sm text-ew-muted">Trends will appear once 2+ weeks of data have been uploaded</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {[
              { title: 'Open Rate % over time', key: 'openRate', color: '#242450' },
              { title: 'Reply Rate % over time', key: 'replyRate', color: '#8403C5' },
            ].map(chart => (
              <div key={chart.key} className="bg-white border border-ew-border rounded-xl p-5">
                <p className="text-xs font-semibold text-ew-body mb-4">{chart.title}</p>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #EBEBF5' }}
                      formatter={v => [v?.toFixed(1) + '%', chart.title]}
                    />
                    <Line type="monotone" dataKey={chart.key} stroke={chart.color} strokeWidth={2} dot={{ r: 3, fill: chart.color }} connectNulls />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Subject line performance table */}
      <div>
        <h2 className="text-sm font-bold text-navy mb-3">Subject Line Performance</h2>
        {periodSubjectLines.length === 0 ? (
          <div className="bg-white border border-ew-border rounded-xl p-8 text-center">
            <p className="text-sm text-ew-muted">No subject lines logged yet — add them when generating your weekly report</p>
          </div>
        ) : (
          <div className="bg-white border border-ew-border rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F6F6FB] border-b border-ew-border">
                <tr>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Subject Line</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Open %</th>
                  <th className="px-3 py-3 text-right text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Reply %</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Variant/Note</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Week</th>
                  <th className="px-3 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.1em]">Campaign</th>
                </tr>
              </thead>
              <tbody>
                {periodSubjectLines.map((sl, i) => (
                  <tr key={sl.id || i} className={`border-b border-ew-border hover:bg-[#F6F6FB] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                    <td className="px-3 py-3 font-medium text-navy max-w-[300px] truncate">{sl.subjectLine}</td>
                    <td className="px-3 py-3 text-right font-semibold text-navy">{fmtPct(sl.openRate)}</td>
                    <td className="px-3 py-3 text-right font-semibold text-navy">{fmtPct(sl.replyRate)}</td>
                    <td className="px-3 py-3 text-xs text-ew-body">{sl.variantNote || '—'}</td>
                    <td className="px-3 py-3 text-xs text-ew-muted">{sl.weekCommencing ? format(parseISO(sl.weekCommencing), 'd MMM') : '—'}</td>
                    <td className="px-3 py-3 text-xs text-ew-muted">{sl.campaign || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}