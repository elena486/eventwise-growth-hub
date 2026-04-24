import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { ChevronDown, ChevronUp, Zap, X, Sparkles, Mail } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function getAlerts(clients, onboardingRecords) {
  const alerts = [];
  const now = new Date();

  clients.forEach(client => {
    if (client.status === 'Churn') return;

    const lastTouchedDate = client.lastContacted || null;
    const daysSince = lastTouchedDate ? differenceInDays(now, new Date(lastTouchedDate)) : null;

    // Only one contact alert per client (most severe)
    if (daysSince === null || daysSince >= 60) {
      alerts.push({ client, type: 'overdue', severity: 'red', message: 'Overdue for check-in', detail: daysSince !== null ? `${daysSince} days since last contact` : 'Never contacted' });
    } else if (daysSince >= 30) {
      alerts.push({ client, type: 'no-contact', severity: 'amber', message: 'No recent contact', detail: `${daysSince} days since last contact` });
    }

    // Renewal alerts — only one per client
    if (client.renewalDate) {
      const daysToRenewal = differenceInDays(new Date(client.renewalDate), now);
      if (daysToRenewal >= 0 && daysToRenewal <= 30) {
        alerts.push({ client, type: 'renewal-urgent', severity: 'red', message: 'Renewal urgent', detail: `${daysToRenewal} days to renewal` });
      } else if (daysToRenewal > 30 && daysToRenewal <= 60) {
        alerts.push({ client, type: 'renewal-soon', severity: 'amber', message: 'Renewal approaching', detail: `${daysToRenewal} days to renewal` });
      }
    }

    // Health alert — only one per client
    if ((client.status === 'Live' || client.status === 'Onboarding') && client.healthRating === 'Red') {
      alerts.push({ client, type: 'health-red', severity: 'red', message: 'At risk — action needed', detail: `Health score: ${client.healthScore || 0}/35` });
    }
  });

  // Onboarding stalled — deduplicated by clientId
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

  // Deduplicate: only one alert per (clientId + type) pair
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

export default function SmartAlertsPanel({ clients, onSuggestAction, onDraftEmail }) {
  const [open, setOpen] = useState(false); // collapsed by default
  const [onboardingRecords, setOnboardingRecords] = useState([]);
  const [dismissed, setDismissed] = useState(new Set());
  const [suggestions, setSuggestions] = useState({}); // key: clientId::type => suggestion text
  const [loadingSuggestion, setLoadingSuggestion] = useState({}); // key: clientId::type

  useEffect(() => {
    base44.entities.OnboardingRecord.list().then(setOnboardingRecords).catch(() => {});
  }, []);

  const allAlerts = getAlerts(clients, onboardingRecords);
  const alerts = allAlerts.filter(a => !dismissed.has(`${a.client.id}::${a.type}`));

  const dismiss = (alert) => {
    setDismissed(prev => new Set([...prev, `${alert.client.id}::${alert.type}`]));
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
          {alerts.length === 0 ? (
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
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleSuggestAction(alert)}
                          disabled={loading}
                          className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] whitespace-nowrap transition-colors disabled:opacity-50"
                        >
                          <Sparkles className="w-3 h-3" />
                          {loading ? 'Thinking…' : 'Suggest action'}
                        </button>
                        <button
                          onClick={() => dismiss(alert)}
                          className="p-0.5 text-gray-400 hover:text-gray-600 transition-colors rounded"
                          title="Dismiss"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
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
    </div>
  );
}