import React, { useState, useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend } from 'recharts';
import { Download, TrendingUp, LayoutGrid } from 'lucide-react';
import { format, parseISO } from 'date-fns';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIME_BUCKETS = [
  { label: 'Morning', min: 6, max: 10 },
  { label: 'Mid-morning', min: 10, max: 12 },
  { label: 'Lunchtime', min: 12, max: 14 },
  { label: 'Afternoon', min: 14, max: 17 },
  { label: 'Evening', min: 17, max: 20 },
  { label: 'Night', min: 20, max: 24 },
];

function hasPerf(item) {
  return item.status === 'Published' && (
    item.impressions != null || item.reactions != null || item.comments != null ||
    item.reposts != null || item.reach != null || item.linkClicks != null
  );
}

function engRate(item) {
  const imp = item.impressions;
  if (!imp || imp === 0) return null;
  return ((( item.reactions || 0) + (item.comments || 0) + (item.reposts || 0)) / imp) * 100;
}

function engRateReach(item) {
  const r = item.reach;
  if (!r || r === 0) return null;
  return (((item.reactions || 0) + (item.comments || 0) + (item.reposts || 0)) / r) * 100;
}

function avg(arr) {
  const valid = arr.filter(v => v != null && !isNaN(v));
  if (!valid.length) return null;
  return valid.reduce((a, b) => a + b, 0) / valid.length;
}

function fmt1(n) { return n == null ? '—' : n.toFixed(1); }
function fmtN(n) { return n == null ? '—' : Math.round(n).toLocaleString('en-GB'); }

function StatCard({ label, value, sub }) {
  return (
    <div className="bg-white border border-ew-border rounded-xl p-4">
      <p className="text-[11px] font-semibold text-ew-muted uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-bold text-navy">{value}</p>
      {sub && <p className="text-xs text-ew-muted mt-0.5">{sub}</p>}
    </div>
  );
}

const SORT_COLS = [
  { key: 'impressions', label: 'Impressions' },
  { key: 'engRate', label: 'Eng. Rate %' },
  { key: 'reactions', label: 'Reactions' },
  { key: 'comments', label: 'Comments' },
  { key: 'reposts', label: 'Reposts' },
];

const LEADERBOARD_FILTERS = ['All', 'Personal Chris', 'Eventwise Page', 'Written', 'Video', 'Carousel', 'Poll'];

export default function ContentAnalytics({ items, onBack, onOpenItem }) {
  const [leaderboardSort, setLeaderboardSort] = useState('impressions');
  const [leaderboardFilter, setLeaderboardFilter] = useState('All');
  const [topicSort, setTopicSort] = useState('impressions');
  const [aiRecommendation, setAiRecommendation] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const published = useMemo(() => items.filter(hasPerf), [items]);

  if (published.length < 3) {
    return (
      <div className="flex flex-col flex-1 items-center justify-center p-12 bg-[#f5f6fa]">
        <TrendingUp className="w-12 h-12 text-ew-muted mb-4" />
        <h3 className="text-lg font-bold text-navy mb-2">Not enough data yet</h3>
        <p className="text-ew-muted text-sm text-center max-w-sm mb-6">Add performance data to published posts to see analytics. You need at least 3 posts with performance data.</p>
        <button onClick={onBack} className="flex items-center gap-1.5 px-4 py-2 bg-navy text-white rounded-lg text-sm font-semibold hover:bg-navy/90 transition-colors">
          <LayoutGrid className="w-4 h-4" /> Go to Board
        </button>
      </div>
    );
  }

  // ── OVERVIEW ──────────────────────────────────────────────────────────────
  const allEngRates = published.map(engRate).filter(v => v != null);
  const avgEngRate = avg(allEngRates);
  const avgImpressions = avg(published.map(i => i.impressions).filter(v => v != null));
  const best = [...published].sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0];

  // ── FORMAT PERFORMANCE ────────────────────────────────────────────────────
  const FORMATS = ['Written', 'Video', 'Carousel', 'Poll'];
  const formatData = FORMATS.map(fmt => {
    const posts = published.filter(i => i.format === fmt);
    const avgImp = avg(posts.map(i => i.impressions).filter(v => v != null));
    const avgEng = avg(posts.map(engRate).filter(v => v != null));
    const bestPost = posts.length ? [...posts].sort((a, b) => (engRate(b) || 0) - (engRate(a) || 0))[0] : null;
    return { format: fmt, count: posts.length, avgImpressions: avgImp, avgEngRate: avgEng, bestPost };
  }).filter(f => f.count > 0).sort((a, b) => (b.avgEngRate || 0) - (a.avgEngRate || 0));

  // ── PAGE PERFORMANCE ──────────────────────────────────────────────────────
  const pagePerf = ['Personal Chris', 'Eventwise Page'].map(page => {
    const posts = published.filter(i => (i.pagePostedOn || '').includes(page));
    return {
      page,
      count: posts.length,
      avgImp: avg(posts.map(i => i.impressions).filter(v => v != null)),
      avgEng: avg(posts.map(engRate).filter(v => v != null)),
      totalImp: posts.reduce((s, i) => s + (i.impressions || 0), 0),
    };
  });

  // ── LEADERBOARD ───────────────────────────────────────────────────────────
  const leaderFiltered = published.filter(i => {
    if (leaderboardFilter === 'All') return true;
    if (['Personal Chris', 'Eventwise Page'].includes(leaderboardFilter)) return (i.pagePostedOn || '').includes(leaderboardFilter);
    return i.format === leaderboardFilter;
  });
  const leaderSorted = [...leaderFiltered].sort((a, b) => {
    if (leaderboardSort === 'engRate') return (engRate(b) || 0) - (engRate(a) || 0);
    return (b[leaderboardSort] || 0) - (a[leaderboardSort] || 0);
  });

  // ── TOPIC/ANGLE ───────────────────────────────────────────────────────────
  const topicMap = {};
  published.forEach(i => {
    const t = (i.topicAngle || '').trim() || '(No topic)';
    if (!topicMap[t]) topicMap[t] = [];
    topicMap[t].push(i);
  });
  const topicData = Object.entries(topicMap).map(([topic, posts]) => ({
    topic,
    count: posts.length,
    avgImp: avg(posts.map(i => i.impressions).filter(v => v != null)),
    avgEng: avg(posts.map(engRate).filter(v => v != null)),
    bestPost: [...posts].sort((a, b) => (b.impressions || 0) - (a.impressions || 0))[0],
  })).sort((a, b) => (topicSort === 'impressions' ? (b.avgImp || 0) - (a.avgImp || 0) : (b.avgEng || 0) - (a.avgEng || 0)));

  // ── TREND OVER TIME ───────────────────────────────────────────────────────
  const monthMap = {};
  published.forEach(i => {
    if (!i.publishDate) return;
    try {
      const m = format(parseISO(i.publishDate), 'MMM yyyy');
      if (!monthMap[m]) monthMap[m] = [];
      monthMap[m].push(i);
    } catch {}
  });
  const trendData = Object.entries(monthMap)
    .sort((a, b) => new Date(a[0]) - new Date(b[0]))
    .map(([month, posts]) => ({
      month,
      avgImpressions: avg(posts.map(i => i.impressions).filter(v => v != null)),
      avgEngRate: avg(posts.map(engRate).filter(v => v != null)),
      count: posts.length,
    }));

  // ── BEST TIME TO POST ─────────────────────────────────────────────────────
  const postsWithTime = published.filter(i => i.timePublished && i.publishDate && i.impressions);

  const showTimingInsights = postsWithTime.length >= 5;

  // Day of week analysis
  const dayMap = {};
  postsWithTime.forEach(i => {
    try {
      const d = parseISO(i.publishDate);
      const day = DAYS[d.getDay()];
      if (!dayMap[day]) dayMap[day] = [];
      dayMap[day].push(i);
    } catch {}
  });
  const dayData = DAYS.filter(d => dayMap[d]).map(day => ({
    day: day.slice(0, 3),
    fullDay: day,
    avgImpressions: avg(dayMap[day].map(i => i.impressions).filter(v => v != null)),
    avgEngRate: avg(dayMap[day].map(engRate).filter(v => v != null)),
    count: dayMap[day].length,
  }));
  const bestDay = dayData.length ? [...dayData].sort((a, b) => (b.avgEngRate || 0) - (a.avgEngRate || 0))[0] : null;

  // Time bucket analysis
  const bucketMap = {};
  postsWithTime.forEach(i => {
    try {
      const [h] = (i.timePublished || '00:00').split(':').map(Number);
      const bucket = TIME_BUCKETS.find(b => h >= b.min && h < b.max) || TIME_BUCKETS[TIME_BUCKETS.length - 1];
      if (!bucketMap[bucket.label]) bucketMap[bucket.label] = [];
      bucketMap[bucket.label].push(i);
    } catch {}
  });
  const bucketData = TIME_BUCKETS.filter(b => bucketMap[b.label]).map(b => ({
    label: b.label,
    avgImpressions: avg(bucketMap[b.label].map(i => i.impressions).filter(v => v != null)),
    avgEngRate: avg(bucketMap[b.label].map(engRate).filter(v => v != null)),
    count: bucketMap[b.label].length,
  })).sort((a, b) => (b.avgEngRate || 0) - (a.avgEngRate || 0));
  const bestBucket = bucketData[0] || null;

  // ── CSV Export ────────────────────────────────────────────────────────────
  const exportCSV = () => {
    const headers = ['Title', 'Format', 'Page', 'Publish Date', 'Topic/Angle', 'Impressions', 'Reactions', 'Comments', 'Reposts', 'Link Clicks', 'Reach', 'Engagement Rate %'];
    const rows = published.map(i => [
      i.title, i.format, i.pagePostedOn, i.publishDate, i.topicAngle,
      i.impressions, i.reactions, i.comments, i.reposts, i.linkClicks, i.reach,
      fmt1(engRate(i))
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'content-performance.csv'; a.click();
  };

  // ── AI Recommendation ─────────────────────────────────────────────────────
  const generateAI = async () => {
    setAiLoading(true);
    const summary = dayData.slice(0, 3).map(d => `${d.fullDay}: avg ${fmtN(d.avgImpressions)} impressions, ${fmt1(d.avgEngRate)}% eng rate`).join('; ');
    const bucketSummary = bucketData.slice(0, 3).map(b => `${b.label}: avg ${fmtN(b.avgImpressions)} impressions, ${fmt1(b.avgEngRate)}% eng rate`).join('; ');
    const prompt = `Based on LinkedIn post performance data: Days: ${summary}. Time buckets: ${bucketSummary}. Best day: ${bestDay?.fullDay}. Best time: ${bestBucket?.label}. Write one concise sentence recommendation like: "Based on your published posts, [day] between [time range] tends to perform best. Consider scheduling future posts in this window." Use the actual data provided.`;
    try {
      const { base44: b44 } = await import('@/api/base44Client');
      const res = await b44.integrations.Core.InvokeLLM({ prompt });
      setAiRecommendation(res);
    } catch { setAiRecommendation('Unable to generate recommendation.'); }
    setAiLoading(false);
  };

  const thClass = "text-left text-[11px] font-semibold text-ew-muted uppercase tracking-wide px-3 py-2 cursor-pointer hover:text-navy select-none";

  return (
    <div className="flex flex-col flex-1 overflow-y-auto bg-[#f5f6fa] p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-navy">Content Analytics</h2>
          <p className="text-sm text-ew-muted mt-0.5">{published.length} published posts with performance data</p>
        </div>
        <button onClick={exportCSV} className="flex items-center gap-1.5 px-3 py-2 border border-ew-border bg-white rounded-lg text-xs font-medium text-ew-body hover:bg-ew-bg transition-colors">
          <Download className="w-3.5 h-3.5" /> Export CSV
        </button>
      </div>

      {/* SECTION 1 — Overview */}
      <div className="grid grid-cols-4 gap-3 mb-8">
        <StatCard label="Posts analysed" value={published.length} />
        <StatCard label="Avg impressions" value={fmtN(avgImpressions)} sub="per post" />
        <StatCard label="Avg engagement rate" value={`${fmt1(avgEngRate)}%`} />
        <div className="bg-white border border-ew-border rounded-xl p-4 cursor-pointer hover:border-[#8403C5]/40 transition-colors" onClick={() => best && onOpenItem && onOpenItem(best)}>
          <p className="text-[11px] font-semibold text-ew-muted uppercase tracking-wide mb-1">Best performing post</p>
          <p className="text-sm font-bold text-navy line-clamp-2">{best?.title || '—'}</p>
          {best && <p className="text-xs text-ew-muted mt-1">{fmtN(best.impressions)} impressions · {fmt1(engRate(best))}% eng rate</p>}
        </div>
      </div>

      {/* SECTION 2 — Format Performance */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-navy mb-4">Format Performance</h3>
        <div className="grid grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={formatData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="format" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
              <Bar dataKey="avgImpressions" fill="#8403C5" name="Avg Impressions" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr>
                <th className={thClass}>Format</th>
                <th className={thClass}>Posts</th>
                <th className={thClass}>Avg Imp.</th>
                <th className={thClass}>Avg Eng %</th>
                <th className={thClass}>Best post</th>
              </tr></thead>
              <tbody>
                {formatData.map(f => (
                  <tr key={f.format} className="border-t border-ew-border">
                    <td className="px-3 py-2 font-medium text-navy">{f.format}</td>
                    <td className="px-3 py-2 text-ew-muted">{f.count}</td>
                    <td className="px-3 py-2">{fmtN(f.avgImpressions)}</td>
                    <td className="px-3 py-2 font-semibold text-[#8403C5]">{fmt1(f.avgEngRate)}%</td>
                    <td className="px-3 py-2 text-xs text-ew-body truncate max-w-[140px]" title={f.bestPost?.title}>{f.bestPost?.title || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SECTION 3 — Page Performance */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-navy mb-4">Page Performance</h3>
        <div className="grid grid-cols-2 gap-4">
          {pagePerf.map(p => (
            <div key={p.page} className={`rounded-xl p-4 border ${p.page.includes('Chris') ? 'border-blue-200 bg-blue-50' : 'border-purple-200 bg-purple-50'}`}>
              <p className="text-sm font-bold text-navy mb-3">{p.page}</p>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-[10px] text-ew-muted uppercase">Posts</p><p className="font-bold text-navy">{p.count}</p></div>
                <div><p className="text-[10px] text-ew-muted uppercase">Avg impressions</p><p className="font-bold text-navy">{fmtN(p.avgImp)}</p></div>
                <div><p className="text-[10px] text-ew-muted uppercase">Avg eng rate</p><p className="font-bold text-[#8403C5]">{fmt1(p.avgEng)}%</p></div>
                <div><p className="text-[10px] text-ew-muted uppercase">Total impressions</p><p className="font-bold text-navy">{fmtN(p.totalImp)}</p></div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 4 — Leaderboard */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
          <h3 className="text-sm font-bold text-navy">Top Posts Leaderboard</h3>
          <div className="flex gap-1 flex-wrap">
            {LEADERBOARD_FILTERS.map(f => (
              <button key={f} onClick={() => setLeaderboardFilter(f)}
                className={`px-2.5 py-1 text-xs font-medium rounded-full border transition-colors ${leaderboardFilter === f ? 'bg-navy text-white border-navy' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
                {f}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <th className={thClass}>#</th>
                <th className={thClass}>Title</th>
                <th className={thClass}>Page</th>
                <th className={thClass}>Format</th>
                <th className={thClass}>Topic/Angle</th>
                {SORT_COLS.map(c => (
                  <th key={c.key} className={thClass + (leaderboardSort === c.key ? ' text-[#8403C5]' : '')} onClick={() => setLeaderboardSort(c.key)}>
                    {c.label}{leaderboardSort === c.key ? ' ↓' : ''}
                  </th>
                ))}
                <th className={thClass}>Date</th>
              </tr>
            </thead>
            <tbody>
              {leaderSorted.map((item, idx) => (
                <tr key={item.id} className="border-b border-ew-border last:border-0 hover:bg-navy/[0.02] cursor-pointer" onClick={() => onOpenItem && onOpenItem(item)}>
                  <td className="px-3 py-2 font-bold text-ew-muted">{idx + 1}</td>
                  <td className="px-3 py-2 font-medium text-navy max-w-[180px] truncate" title={item.title}>{item.title}</td>
                  <td className="px-3 py-2 text-xs text-ew-muted">{item.pagePostedOn || '—'}</td>
                  <td className="px-3 py-2 text-xs text-ew-muted">{item.format || '—'}</td>
                  <td className="px-3 py-2 text-xs text-ew-muted max-w-[120px] truncate">{item.topicAngle || '—'}</td>
                  <td className="px-3 py-2">{fmtN(item.impressions)}</td>
                  <td className="px-3 py-2">{fmtN(item.reactions)}</td>
                  <td className="px-3 py-2">{fmtN(item.comments)}</td>
                  <td className="px-3 py-2">{fmtN(item.reposts)}</td>
                  <td className="px-3 py-2 font-semibold text-[#8403C5]">{fmt1(engRate(item))}%</td>
                  <td className="px-3 py-2 text-xs text-ew-muted">{item.publishDate || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 5 — Topic/Angle Analysis */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-navy">Topic / Angle Analysis</h3>
          <div className="flex gap-1">
            {['impressions', 'engRate'].map(k => (
              <button key={k} onClick={() => setTopicSort(k)}
                className={`px-2.5 py-1 text-xs font-medium rounded-lg border transition-colors ${topicSort === k ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'}`}>
                {k === 'impressions' ? 'By impressions' : 'By eng rate'}
              </button>
            ))}
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                <th className={thClass}>Topic / Angle</th>
                <th className={thClass}>Posts</th>
                <th className={thClass}>Avg impressions</th>
                <th className={thClass}>Avg eng rate %</th>
                <th className={thClass}>Best post</th>
              </tr>
            </thead>
            <tbody>
              {topicData.map(t => (
                <tr key={t.topic} className="border-b border-ew-border last:border-0">
                  <td className="px-3 py-2 font-medium text-navy">{t.topic}</td>
                  <td className="px-3 py-2 text-ew-muted">{t.count}</td>
                  <td className="px-3 py-2">{fmtN(t.avgImp)}</td>
                  <td className="px-3 py-2 font-semibold text-[#8403C5]">{fmt1(t.avgEng)}%</td>
                  <td className="px-3 py-2 text-xs text-ew-body truncate max-w-[180px]" title={t.bestPost?.title}>{t.bestPost?.title || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 6 — Trend Over Time */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-navy mb-4">Trend Over Time</h3>
        <ResponsiveContainer width="100%" height={240}>
          <LineChart data={trendData} margin={{ top: 4, right: 20, left: -16, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="month" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="left" tick={{ fontSize: 11 }} />
            <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} unit="%" />
            <Tooltip
              contentStyle={{ fontSize: 11, borderRadius: 8 }}
              formatter={(val, name, props) => {
                if (name === 'Avg Eng Rate %') return [`${fmt1(val)}%`, name];
                return [fmtN(val), name];
              }}
              labelFormatter={(label, payload) => {
                const count = payload?.[0]?.payload?.count;
                return `${label}${count ? ` (${count} posts)` : ''}`;
              }}
            />
            <Legend />
            <Line yAxisId="left" type="monotone" dataKey="avgImpressions" stroke="#8403C5" strokeWidth={2} dot={{ r: 4 }} name="Avg Impressions" connectNulls />
            <Line yAxisId="right" type="monotone" dataKey="avgEngRate" stroke="#5777AB" strokeWidth={2} dot={{ r: 4 }} name="Avg Eng Rate %" connectNulls />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* SECTION 7 — Best Time to Post */}
      <div className="bg-white border border-ew-border rounded-xl p-5 mb-6">
        <h3 className="text-sm font-bold text-navy mb-1">Best Time to Post</h3>
        <p className="text-xs text-ew-muted mb-4">Based on posts with a published time and performance data</p>

        {!showTimingInsights ? (
          <p className="text-sm text-ew-muted italic">Post more content with time data to unlock timing insights — need at least 5 posts.</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-6 mb-5">
              {/* Best day of week */}
              <div>
                <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-3">Best day of week</p>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={dayData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8 }} />
                    <Bar dataKey="avgEngRate" name="Avg Eng Rate %" radius={[4,4,0,0]}
                      fill="#9CA3AF"
                      label={false}
                    >
                      {dayData.map((entry, i) => (
                        <rect key={i} fill={entry.fullDay === bestDay?.fullDay ? '#8403C5' : '#9CA3AF'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                {bestDay && (
                  <p className="text-xs text-ew-body mt-2">
                    <span className="font-semibold text-[#8403C5]">Best day: {bestDay.fullDay}</span> — avg {fmtN(bestDay.avgImpressions)} impressions, {fmt1(bestDay.avgEngRate)}% engagement rate
                  </p>
                )}
              </div>

              {/* Best time of day */}
              <div>
                <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide mb-3">Best time of day</p>
                <div className="space-y-2">
                  {bucketData.map((b, i) => (
                    <div key={b.label} className="flex items-center gap-2">
                      <span className="text-xs text-ew-body w-24 shrink-0">{b.label}</span>
                      <div className="flex-1 bg-gray-100 rounded-full h-5 relative overflow-hidden">
                        <div
                          className="h-full rounded-full flex items-center pl-2"
                          style={{
                            width: `${Math.max(8, ((b.avgEngRate || 0) / (bucketData[0]?.avgEngRate || 1)) * 100)}%`,
                            background: i === 0 ? '#8403C5' : '#5777AB',
                          }}
                        >
                          <span className="text-[10px] text-white font-semibold whitespace-nowrap">{fmt1(b.avgEngRate)}%</span>
                        </div>
                      </div>
                      <span className="text-xs text-ew-muted w-8">{b.count}p</span>
                    </div>
                  ))}
                </div>
                {bestBucket && (
                  <p className="text-xs text-ew-body mt-3">
                    <span className="font-semibold text-[#8403C5]">Best time: {bestBucket.label}</span> — avg {fmtN(bestBucket.avgImpressions)} impressions, {fmt1(bestBucket.avgEngRate)}% engagement rate
                  </p>
                )}
              </div>
            </div>

            {/* AI Recommendation */}
            <div className="border-t border-ew-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-semibold text-ew-muted uppercase tracking-wide">✨ Timing Recommendation</p>
              </div>
              {aiRecommendation ? (
                <p className="text-sm text-ew-body bg-[#F9F5FF] rounded-lg p-3">{aiRecommendation}</p>
              ) : (
                <button onClick={generateAI} disabled={aiLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-[#8403C5] hover:bg-[#6d02a3] text-white rounded-lg text-sm font-semibold transition-colors disabled:opacity-50">
                  {aiLoading ? 'Generating…' : '✨ Generate AI recommendation'}
                </button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}