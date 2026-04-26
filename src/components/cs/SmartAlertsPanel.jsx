import React, { useState, useEffect } from 'react';
import { differenceInDays, format } from 'date-fns';
import { ChevronDown, ChevronUp, Zap, X, Sparkles, Mail, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function getAlerts(clients, onboardingRecords) {
  const alerts = [];
  const now = new Date();

  clients.forEach(client => {
    if (client.status === 'Churn') return;

    const lastTouchedDate = client.lastContacted || null;
    const daysSince = lastTouchedDate ? differenceInDays(now, new Date(lastTouchedDate)) : null;

    if (daysSince === null || daysSince >= 60) {
      alerts.push({ client, type: 'overdue', severity: 'red', message: 'Overdue for check-in', detail: daysSince !== null ? `${daysSince} days since last contact` : 'Never contacted' });
    } else if (daysSince >= 30) {
      alerts.push({ client, type: 'no-contact', severity: 'amber', message: 'No recent contact', detail: `${daysSince} days since last contact` });
    }

    if (client.renewalDate) {
      const daysToRenewal = differenceInDays(new Date(client.renewalDate), now);
      if (daysToRenewal >= 0 && daysToRenewal <= 30) {
        alerts.push({ client, type: 'renewal-urgent', severity: 'red', message: 'Renewal urgent', detail: `${daysToRenewal} days to renewal` });
      } else if (daysToRenewal > 30 && daysToRenewal <= 60) {
        alerts.push({ client, type: 'renewal-soon', severity: 'amber', message: 'Renewal approaching', detail: `${daysToRenewal} days to renewal` });
      }
    }

    if ((client.status === 'Live' || client.status === 'Onboarding') && client.healthRating === 'Red') {
      alerts.push({ client, type: 'health-red', severity: 'red', message: 'At risk — action needed', detail: `Health score: ${client.healthScore || 0}/35` });
    }
  });

  const onboardingClientIds = new Set();
  onboardingRecords.forEach(rec => {
    if (onboardingClientIds.has(rec.clientId)) return;
    const lastUpdated = rec.lastUpdated ? new Date(rec.lastUpdated) : null;
    if (!lastUpdated) return;
    const days = differenceInDays(now, lastUpdated);
    if (days >= 14) {
      const client = clients.find(c => c.id === rec.clientId);
      if (client && client.status === 'Onboarding') {
        onboardingClientIds.add(rec.clientId);
        alerts.push({ client, type: 'onboarding-stalled', severity: 'amber', message: 'Onboarding stalled', detail: `No progress in ${days} days` });
      }
    }
  });

  const seen = new Set();
  return alerts.filter(a => {
    const key = `${a.client.id}::${a.type}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

const SEVERITY_STYLES = {
  red: { bg: 'bg-red-50', border: 'border-red-200', dot: 'bg-red-500', icon: 'text-red-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', dot: 'bg-amber-400', icon: 'text-amber-500' },
};

export default function SmartAlertsPanel({ clients, onDraftEmail }) {
  const [open, setOpen] = useState(false);
  const [onboardingRecords, setOnboardingRecords] = useState([]);
  const [loadingRecords, setLoadingRecords] = useState(true);
  const [dismissed, setDismissed] = useState(new Set());
  const [suggestions, setSuggestions] = useState({});
  const [loadingSuggestion, setLoadingSuggestion] = useState({});

  // Dismiss confirm state
  const [confirmDismiss, setConfirmDismiss] = useState(null); // key string
  // Completed confirm state
  const [confirmComplete, setConfirmComplete] = useState(null); // { key, alert }
  const [completedNote, setCompletedNote] = useState('');
  const [savingComplete, setSavingComplete] = useState(false);

  useEffect(() => {
    base44.entities.OnboardingRecord.list()
      .then(setOnboardingRecords)
      .catch(() => {})
      .finally(() => setLoadingRecords(false));
  }, []);

  const allAlerts = getAlerts(clients, onboardingRecords);
  const alerts = allAlerts.filter(a => !dismissed.has(`${a.client.id}::${a.type}`));

  const dismiss = (key) => {
    setDismissed(prev => new Set([...prev, key]));
    setConfirmDismiss(null);
  };

  const handleSuggestAction = async (alert) => {
    const key = `${alert.client.id}::${alert.type}`;
    setLoadingSuggestion(prev => ({ ...prev, [key]: true }));
    const prompt = `You are a customer success assistant for Eventwise, a B2B SaaS company. 
Client: ${alert.client.name}
Alert: ${alert.message} — ${alert.detail}
Last contacted: ${alert.client.lastContacted || 'Never'}
CS Owner: ${alert.client.owner || 'Unknown'}

Give a 2-3 sentence suggested action for the CS team. Be specific, practical, and include a suggested email subject line if relevant.`;
    const result = await base44.integrations.Core.InvokeLLM({ prompt });
    setSuggestions(prev => ({ ...prev, [key]: result }));
    setLoadingSuggestion(prev => ({ ...prev, [key]: false }));
  };

  const handleCompleteConfirm = async () => {
    if (!confirmComplete) return;
    setSavingComplete(true);
    const { key, alert } = confirmComplete;
    const today = format(new Date(), 'd MMM yyyy');
    const logLine = `✓ ${alert.message} — actioned on ${today}${completedNote ? `: ${completedNote}` : ''}`;
    const existing = alert.client.notes || '';
    await base44.entities.Client.update(alert.client.id, {
      notes: existing ? `${logLine}\n${existing}` : logLine,
    });
    setDismissed(prev => new Set([...prev, key]));
    setSavingComplete(false);
    setConfirmComplete(null);
    setCompletedNote('');
  };

  return (
    <div className="bg-white border border-ew-border rounded-xl mb-6 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-ew-bg/50 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Zap className="w-4 h-4 text-[#8403C5]" />
          <span className="text-sm font-bold text-navy">Smart Alerts</span>
          {alerts.length > 0 && (
            <span className="text-xs font-semibold bg-[#8403C5]/10 text-[#8403C5] px-2 py-0.5 rounded-full">
              {alerts.length} alert{alerts.length !== 1 ? 's' : ''}
            </span>
          )}
          {dismissed.size > 0 && (
            <span className="text-[11px] text-ew-muted">({dismissed.size} dismissed)</span>
          )}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-ew-muted" /> : <ChevronDown className="w-4 h-4 text-ew-muted" />}
      </button>

      {open && (
        <div className="px-5 pb-4">
          {loadingRecords && clients.length === 0 ? (
            <div className="flex items-center gap-2 py-3 text-sm text-[#9CA3AF]">
              <div className="w-4 h-4 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin shrink-0" />
              Calculating alerts…
            </div>
          ) : alerts.length === 0 ? (
            <p className="text-sm text-green-600 font-medium py-2 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              All clients on track.
            </p>
          ) : (
            <div className="space-y-2">
              {alerts.map((alert) => {
                const key = `${alert.client.id}::${alert.type}`;
                const s = SEVERITY_STYLES[alert.severity];
                const suggestion = suggestions[key];
                const loading = loadingSuggestion[key];
                return (
                  <div key={key} className={`rounded-lg border ${s.bg} ${s.border} overflow-hidden`}>
                    <div className="flex items-start justify-between gap-3 p-3">
                      <div className="flex items-start gap-2 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{alert.client.name}</p>
                          <p className={`text-xs font-medium ${s.icon}`}>{alert.message}</p>
                          <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
                        <button
                          onClick={() => handleSuggestAction(alert)}
                          disabled={loading}
                          className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] whitespace-nowrap transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          {loading ? 'Thinking…' : 'Suggest action'}
                        </button>
                        <button
                          onClick={() => { setConfirmComplete({ key, alert }); setCompletedNote(''); }}
                          className="flex items-center gap-1 text-xs font-semibold text-[#15803D] bg-[#DCFCE7] hover:bg-[#BBF7D0] px-2 py-0.5 rounded-full whitespace-nowrap transition-colors"
                        >
                          <Check className="w-3 h-3" /> Completed
                        </button>
                        {confirmDismiss === key ? (
                          <div className="flex items-center gap-1">
                            <span className="text-[11px] text-gray-600">Dismiss?</span>
                            <button onClick={() => dismiss(key)} className="text-[11px] font-bold text-red-600 hover:text-red-800 px-1.5 py-0.5 rounded hover:bg-red-50">Yes</button>
                            <button onClick={() => setConfirmDismiss(null)} className="text-[11px] text-gray-400 hover:text-gray-600 px-1 py-0.5 rounded">No</button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDismiss(key)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors rounded"
                            title="Dismiss"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                    {suggestion && (
                      <div className="mx-3 mb-3 rounded-lg bg-[#F3E8FF] border border-[#E9D5FF] p-3">
                        <p className="text-xs text-[#374151] leading-relaxed">{suggestion}</p>
                        {onDraftEmail && (
                          <button
                            onClick={() => onDraftEmail(alert.client, suggestion)}
                            className="mt-2 flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:underline"
                          >
                            <Mail className="w-3 h-3" />
                            Draft email →
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Completed confirm modal */}
      {confirmComplete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={() => setConfirmComplete(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-bold text-[#111827] mb-1">Mark as completed?</p>
            <p className="text-xs text-[#9CA3AF] mb-3">
              This will log "✓ {confirmComplete.alert.message}" on <strong>{confirmComplete.alert.client.name}</strong>'s record and dismiss this alert.
            </p>
            <div className="mb-4">
              <label className="block text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.1em] mb-1">Optional note</label>
              <input
                className="w-full text-sm border border-[#EBEBEB] rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
                placeholder="e.g. Called and confirmed renewal…"
                value={completedNote}
                onChange={e => setCompletedNote(e.target.value)}
                autoFocus
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmComplete(null)} className="px-3 py-1.5 text-sm text-[#6B7280] hover:bg-[#F9FAFB] rounded-lg">Cancel</button>
              <button
                onClick={handleCompleteConfirm}
                disabled={savingComplete}
                className="px-4 py-1.5 text-sm font-semibold bg-[#15803D] text-white rounded-lg hover:bg-[#166534] disabled:opacity-60 transition-colors"
              >
                {savingComplete ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}