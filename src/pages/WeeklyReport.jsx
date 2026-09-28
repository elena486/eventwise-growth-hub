import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { startOfWeek, endOfWeek, addWeeks, subWeeks, format } from 'date-fns';
import { ChevronLeft, ChevronRight, Sparkles, AlertTriangle, Copy, Download } from 'lucide-react';
import { fetchReportData, buildFlags, generateAISummary, formatDuration, TEAM_MEMBERS } from '@/lib/weeklyReportData';
import { formatReportAsText, generateReportPDF } from '@/lib/weeklyReportFormat';
import PersonReport from '@/components/weekly-report/PersonReport';

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

  const isElena = (user?.email || '').toLowerCase().includes('elena');
  const isElenaOrChris = isElena || (user?.email || '').toLowerCase().includes('chris');
  const personOptions = isElenaOrChris ? [...TEAM_MEMBERS, 'Whole team'] : (person ? [person] : []);

  const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });
  const weekLabel = `${format(weekStart, 'd MMM')} – ${format(weekEnd, 'd MMM yyyy')}`;

  const handleGenerate = async () => {
    if (!person) return;
    setGenerating(true);
    setAiError(false);
    setAiSummary('');
    setFlags([]);
    try {
      const data = await fetchReportData(person, weekStart);
      setReportData(data);

      if (isElena) {
        setFlags(buildFlags(data.reportByPerson, data.isWholeTeam));
      }

      setAiLoading(true);
      try {
        const summary = await generateAISummary(data);
        setAiSummary(summary);
      } catch {
        setAiError(true);
      } finally {
        setAiLoading(false);
      }
    } catch {
      setReportData(null);
    }
    setGenerating(false);
  };

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
  const handleDatePick = (e) => {
    if (!e.target.value) return;
    const date = new Date(e.target.value);
    if (!isNaN(date)) setWeekStart(startOfWeek(date, { weekStartsOn: 1 }));
  };

  // Team totals
  let totalDone = 0, totalTime = 0;
  if (reportData?.isWholeTeam) {
    for (const r of Object.values(reportData.reportByPerson)) {
      totalDone += r.done.length;
      totalTime += r.totalTime;
    }
  }

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

          <button onClick={handleGenerate} disabled={generating || !person}
            className="px-5 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] disabled:bg-[#D8D8EE] disabled:text-[#9CA3AF] text-white rounded-lg transition-colors">
            {generating ? 'Generating…' : 'Generate report'}
          </button>
        </div>
      </div>

      {/* Report */}
      {reportData && (
        <div className="px-8 pb-8">
          {/* Action buttons */}
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

          {/* AI Summary */}
          <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-6">
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-[#8403C5]" />
              <h2 className="text-sm font-bold text-[#242450]">Summary</h2>
            </div>
            {aiLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
                <p className="text-sm text-[#5777AB]">Generating summary…</p>
              </div>
            ) : aiError ? (
              <div>
                <p className="text-sm text-[#5777AB] mb-2">Summary unavailable, try again</p>
                <button onClick={handleRegenerateSummary}
                  className="px-3 py-1.5 text-xs font-semibold bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg transition-colors">
                  Regenerate summary
                </button>
              </div>
            ) : (
              <p className="text-sm text-[#242450] leading-relaxed">{aiSummary}</p>
            )}
          </div>

          {/* Team totals */}
          {reportData.isWholeTeam && (
            <div className="bg-[#F3E8FF] border border-[#8403C5]/20 rounded-xl p-5 mb-6">
              <div className="flex items-center gap-8">
                <div>
                  <p className="text-2xl font-bold text-[#8403C5]">{totalDone}</p>
                  <p className="text-xs text-[#5777AB] uppercase tracking-wide">Tasks done</p>
                </div>
                <div>
                  <p className="text-2xl font-bold text-[#8403C5]">{formatDuration(totalTime)}</p>
                  <p className="text-xs text-[#5777AB] uppercase tracking-wide">Total time</p>
                </div>
              </div>
            </div>
          )}

          {/* Report sections */}
          {reportData.isWholeTeam ? (
            <div className="space-y-6">
              {reportData.people.map(p => (
                <PersonReport key={p} person={p} report={reportData.reportByPerson[p]} />
              ))}
            </div>
          ) : (
            <PersonReport person={null} report={Object.values(reportData.reportByPerson)[0]} />
          )}

          {/* Flags (Elena only) */}
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
                    <p key={i} className="text-sm text-[#A16207] flex items-start gap-2">
                      <span className="text-[#E8A020] mt-0.5">•</span> {f}
                    </p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}