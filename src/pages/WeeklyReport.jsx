import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns';
import { ChevronLeft, ChevronRight, AlertTriangle, Copy, Download } from 'lucide-react';
import { fetchReportData, buildFlags, generateAISummary, formatDuration, TEAM_MEMBERS } from '@/lib/weeklyReportData';
import { formatReportAsText, generateReportPDF } from '@/lib/weeklyReportFormat';
import PersonReport from '@/components/weekly-report/PersonReport';
import TeamPersonCard from '@/components/weekly-report/TeamPersonCard';
import ReportSkeleton from '@/components/weekly-report/ReportSkeleton';

export default function WeeklyReport() {
  const [user, setUser] = useState(null);
  const [person, setPerson] = useState('');
  const [weekStart, setWeekStart] = useState(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [reportData, setReportData] = useState(null);
  const [generating, setGenerating] = useState(false);
  const [aiSummary, setAiSummary] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [flags, setFlags] = useState([]);
  const [flagsOpen, setFlagsOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    base44.auth.me().then(me => {
      setUser(me);
      const first = me?.full_name?.split(' ')[0] || '';
      if (TEAM_MEMBERS.includes(first)) setPerson(first);
    }).catch(() => {});
  }, []);

  const viewingPersonName = user?.full_name?.split(' ')[0] || '';
  const isElena = viewingPersonName === 'Elena';
  const isElenaOrChris = isElena || viewingPersonName === 'Chris';
  const personOptions = isElenaOrChris ? [...TEAM_MEMBERS, 'Whole team'] : (person ? [person] : []);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;
  const currentWeekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const isPastWeek = weekStart.getTime() < currentWeekStart.getTime();

  // Auto-generate when person or week changes
  useEffect(() => {
    if (!person) return;

    let cancelled = false;
    setGenerating(true);
    setAiError(false);
    setAiSummary('');
    setFlags([]);
    setFlagsOpen(false);
    setReportData(null);

    (async () => {
      try {
        const data = await fetchReportData(person, weekStart);
        if (cancelled) return;
        setReportData(data);
        if (isElena) {
          setFlags(buildFlags(data.reportByPerson, data.isWholeTeam, viewingPersonName));
        }
        setAiLoading(true);
        try {
          const summary = await generateAISummary(data);
          if (cancelled) return;
          setAiSummary(summary);
        } catch {
          if (!cancelled) setAiError(true);
        } finally {
          if (!cancelled) setAiLoading(false);
        }
      } catch {
        if (!cancelled) setReportData(null);
      }
      if (!cancelled) setGenerating(false);
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [person, weekStart]);

  const handleViewPerson = (personName) => setPerson(personName);

  const handleRegenerateSummary = async () => {
    if (!reportData) return;
    setAiError(false);
    setAiLoading(true);
    try {
      const summary = await generateAISummary(reportData);
      setAiSummary(summary);
    } catch {
      setAiError(true);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCopy = async () => {
    if (!reportData) return;
    const text = formatReportAsText(reportData, aiSummary);
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const handleDownloadPDF = () => {
    if (!reportData) return;
    generateReportPDF(reportData, aiSummary);
  };

  const handlePrevWeek = () => setWeekStart(subWeeks(weekStart, 1));
  const handleNextWeek = () => setWeekStart(addWeeks(weekStart, 1));
  const handleThisWeek = () => setWeekStart(startOfWeek(new Date(), { weekStartsOn: 1 }));
  const handleLastWeek = () => setWeekStart(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1));
  const handleDatePick = (e) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    if (!isNaN(date)) setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  };

  // Team totals
  let totalDone = 0, totalInProgress = 0, totalBlocked = 0, totalTime = 0;
  let prevTotalDone = 0, prevTotalInProgress = 0, prevTotalBlocked = 0, prevTotalTime = 0;
  if (reportData?.isWholeTeam) {
    for (const r of Object.values(reportData.reportByPerson)) {
      totalDone += r.stats.completed;
      totalInProgress += r.stats.inProgress;
      totalBlocked += r.stats.blocked;
      totalTime += r.stats.hoursLogged;
    }
    for (const s of Object.values(reportData.prevStatsByPerson)) {
      prevTotalDone += s.completed;
      prevTotalInProgress += s.inProgress;
      prevTotalBlocked += s.blocked;
      prevTotalTime += s.hoursLogged;
    }
  }

  const showReport = reportData && !generating;

  return (
    <div className="h-full overflow-y-auto bg-[#F6F6FB] font-dm">
      {/* Controls */}
      <div className="px-8 pt-6 pb-4 shrink-0">
        <h1 className="text-2xl font-bold text-[#242450] mb-4">Weekly Report</h1>
        <div className="flex items-center gap-3 flex-wrap">
          <select value={person} onChange={e => setPerson(e.target.value)}
            className="px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white focus:outline-none focus:border-[#8403C5] min-w-[160px]">
            {personOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>

          <div className="flex items-center gap-2 bg-white border border-[#EBEBF5] rounded-lg px-2 py-1.5">
            <button onClick={handlePrevWeek} className="p-1 rounded hover:bg-[#F6F6FB] text-[#5777AB]"><ChevronLeft className="w-4 h-4" /></button>
            <span className="text-sm font-medium text-[#242450] min-w-[140px] text-center">{weekLabel}</span>
            <button onClick={handleNextWeek} className="p-1 rounded hover:bg-[#F6F6FB] text-[#5777AB]"><ChevronRight className="w-4 h-4" /></button>
            <input type="date" onChange={handleDatePick} className="px-2 py-1 text-xs border border-[#EBEBF5] rounded text-[#242450]" />
          </div>

          <div className="flex items-center gap-1.5">
            <button onClick={handleThisWeek}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${!isPastWeek ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              This week
            </button>
            <button onClick={handleLastWeek}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${weekStart.getTime() === subWeeks(currentWeekStart, 1).getTime() ? 'bg-[#242450] text-white border-[#242450]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:border-[#D8D8EE]'}`}>
              Last week
            </button>
          </div>
        </div>
      </div>

      {/* Report area */}
      <div className="px-8 pb-8">
        {/* Action buttons */}
        {showReport && (
          <div className="flex items-center gap-2 mb-6">
            <button onClick={handleCopy}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-[#EBEBF5] bg-white text-[#242450] hover:bg-[#F6F6FB] rounded-lg transition-colors">
              <Copy className="w-4 h-4" /> {copied ? '✓ Copied' : 'Copy'}
            </button>
            <button onClick={handleDownloadPDF}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold border border-[#EBEBF5] bg-white text-[#242450] hover:bg-[#F6F6FB] rounded-lg transition-colors">
              <Download className="w-4 h-4" /> Download PDF
            </button>
          </div>
        )}

        {generating && !reportData ? (
          <ReportSkeleton />
        ) : reportData ? (
          <>
            {reportData.isWholeTeam ? (
              <div>
                {/* Team stat tiles */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <TeamStatTile label="Completed" value={totalDone} delta={totalDone - prevTotalDone} prev={prevTotalDone} />
                  <TeamStatTile label="In progress" value={totalInProgress} delta={totalInProgress - prevTotalInProgress} prev={prevTotalInProgress} />
                  <TeamStatTile label="Blocked" value={totalBlocked} delta={totalBlocked - prevTotalBlocked} prev={prevTotalBlocked} />
                  <TeamStatTile label="Hours logged" value={formatDuration(totalTime)} delta={totalTime - prevTotalTime} prev={prevTotalTime} isHours />
                </div>

                {isPastWeek && (
                  <p className="text-xs text-[#9CA3AF] italic mb-4">Task statuses reflect today, not that week.</p>
                )}

                {/* Team AI summary */}
                <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-6">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-bold text-[#242450]">Team summary</h3>
                    {!aiLoading && !aiError && aiSummary && (
                      <button onClick={handleRegenerateSummary} className="text-xs text-[#8403C5] hover:underline font-medium">
                        Regenerate summary
                      </button>
                    )}
                  </div>
                  {aiLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
                      <p className="text-sm text-[#5777AB]">Generating summary…</p>
                    </div>
                  ) : aiError ? (
                    <div>
                      <p className="text-sm text-[#5777AB] mb-2">Summary unavailable, try again</p>
                      <button onClick={handleRegenerateSummary} className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg transition-colors">Regenerate summary</button>
                    </div>
                  ) : (
                    <p className="text-sm text-[#242450] leading-relaxed">{aiSummary}</p>
                  )}
                </div>

                {/* Person cards */}
                <div className="grid grid-cols-2 gap-4">
                  {reportData.people.map(p => (
                    <TeamPersonCard key={p} person={p} report={reportData.reportByPerson[p]} isElena={isElena} onViewPerson={handleViewPerson} />
                  ))}
                </div>
              </div>
            ) : (
              <PersonReport
                report={Object.values(reportData.reportByPerson)[0]}
                prevStats={Object.values(reportData.prevStatsByPerson)[0]}
                isElena={isElena}
                isPastWeek={isPastWeek}
                aiSummary={aiSummary}
                aiLoading={aiLoading}
                aiError={aiError}
                onRegenerateSummary={handleRegenerateSummary}
              />
            )}

            {/* Flags (Elena only, not on own report) */}
            {isElena && flags.length > 0 && (
              <div className="mt-6">
                <button onClick={() => setFlagsOpen(o => !o)}
                  className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold text-[#A16207] bg-[#FFFBEB] border border-[#FDE68A] rounded-lg hover:bg-[#FEF3C7] transition-colors">
                  <AlertTriangle className="w-4 h-4" /> Flags for 1:1s ({flags.length})
                  <ChevronRight className={`w-4 h-4 transition-transform ${flagsOpen ? 'rotate-90' : ''}`} />
                </button>
                {flagsOpen && (
                  <div className="mt-3 bg-[#FFFBEB] border border-[#FDE68A] rounded-xl p-4 space-y-2">
                    {flags.map((f, i) => (
                      <p key={i} className="text-sm text-[#A16207]">{f}</p>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );
}

function TeamStatTile({ label, value, delta, prev, isHours }) {
  const showDelta = prev > 0 && delta !== 0;
  const deltaText = isHours
    ? `${delta > 0 ? '+' : '-'}${formatDuration(Math.abs(delta))} vs last week`
    : `${delta > 0 ? '+' : ''}${delta} vs last week`;

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-4">
      <p className="text-2xl font-bold text-[#8403C5]">{value}</p>
      <p className="text-xs text-[#5777AB] uppercase tracking-wide mt-1">{label}</p>
      {showDelta && <p className="text-[11px] text-[#9CA3AF] mt-0.5">{deltaText}</p>}
    </div>
  );
}