import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, RefreshCw, Copy, Check, Mail, Loader2, AlertTriangle } from 'lucide-react';

export default function DraftEmailModal({ lead, entries, currentUser, onClose, onLogSent }) {
  const [loading, setLoading] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);
  const [logged, setLogged] = useState(false);

  const hasActivity = entries.length > 0;

  // Calculate days since last activity
  const sortedDesc = [...entries].sort((a, b) =>
    new Date(b.createdAt || b.datetime || b.date || 0).getTime() - new Date(a.createdAt || a.datetime || a.date || 0).getTime()
  );
  const mostRecent = sortedDesc[0];
  const lastActivityDate = mostRecent ? new Date(mostRecent.createdAt || mostRecent.datetime || mostRecent.date || 0) : null;
  const daysSinceLastActivity = lastActivityDate ? Math.floor((Date.now() - lastActivityDate.getTime()) / 86400000) : 0;
  const isStale = daysSinceLastActivity > 14;

  const generateDraft = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await base44.functions.invoke('draftFollowUpEmail', { lead_id: lead.id });
      setSubject(res.data.subject || '');
      setBody(res.data.body || '');
    } catch (err) {
      setError(err.response?.data?.error || err.message || 'Failed to generate draft');
    }
    setLoading(false);
  };

  useEffect(() => {
    if (hasActivity) generateDraft();
  }, []); // eslint-disable-line

  const handleCopy = () => {
    navigator.clipboard.writeText(`Subject: ${subject}\n\n${body}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogSent = () => {
    const newEntry = {
      id: Date.now(),
      type: 'Email',
      summary: `Subject: ${subject}\n\n${body}`,
      createdAt: new Date().toISOString(),
      addedBy: currentUser || 'Chris',
    };
    onLogSent(newEntry);
    setLogged(true);
    setTimeout(() => onClose(), 1500);
  };

  const inputCls = 'w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[300] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[92vh] flex flex-col" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[#F3E8FF] flex items-center justify-center shrink-0">
              <Mail className="w-4 h-4 text-[#8403C5]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-navy">Draft follow-up email — {lead.companyName}</h2>
              <p className="text-sm text-ew-muted mt-0.5">AI-drafted from activity history — review before sending</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors"><X className="w-4 h-4" /></button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {!hasActivity ? (
            <div className="text-center py-12">
              <p className="text-3xl mb-3">📭</p>
              <p className="text-sm text-ew-body font-medium mb-1">No activity logged yet for this lead</p>
              <p className="text-sm text-ew-muted">Add at least one activity before generating a draft.</p>
            </div>
          ) : loading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3">
              <Loader2 className="w-7 h-7 text-[#8403C5] animate-spin" />
              <p className="text-sm text-ew-muted">Drafting follow-up email from activity history…</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <p className="text-sm text-red-600 font-medium mb-2">Failed to generate draft</p>
              <p className="text-sm text-ew-muted">{error}</p>
              <button onClick={generateDraft} className="mt-4 px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">Try again</button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Stale warning */}
              {isStale && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Last activity was {daysSinceLastActivity} days ago — confirm this lead is still active before sending.</span>
                </div>
              )}

              {/* Logged confirmation */}
              {logged && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 rounded-lg px-4 py-3 text-sm text-emerald-700">
                  <Check className="w-4 h-4" /> Email logged as sent in the Activity Log.
                </div>
              )}

              {/* Subject */}
              <div>
                <label className="block text-[11px] font-semibold text-ew-muted uppercase tracking-[0.08em] mb-1">Subject</label>
                <input className={inputCls} value={subject} onChange={e => setSubject(e.target.value)} />
              </div>

              {/* Body */}
              <div>
                <label className="block text-[11px] font-semibold text-ew-muted uppercase tracking-[0.08em] mb-1">Body</label>
                <textarea className={inputCls + ' min-h-[280px] resize-y'} value={body} onChange={e => setBody(e.target.value)} />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {hasActivity && !loading && !error && !logged && (
          <div className="px-6 py-4 border-t border-ew-border shrink-0 flex justify-between gap-3">
            <button onClick={generateDraft} disabled={loading}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg border border-ew-border transition-colors">
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
            <div className="flex gap-2">
              <button onClick={handleCopy}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg border border-ew-border transition-colors">
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />} {copied ? 'Copied!' : 'Copy to clipboard'}
              </button>
              <button onClick={handleLogSent}
                className="flex items-center gap-1.5 px-5 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">
                <Mail className="w-3.5 h-3.5" /> Log as sent
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}