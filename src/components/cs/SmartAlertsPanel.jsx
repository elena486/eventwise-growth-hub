import React, { useState, useEffect } from 'react';
import { differenceInDays } from 'date-fns';
import { ChevronDown, ChevronUp, AlertTriangle, Clock, TrendingDown, Zap } from 'lucide-react';
import { base44 } from '@/api/base44Client';

function getAlerts(clients, onboardingRecords) {
  const alerts = [];
  const now = new Date();

  clients.forEach(client => {
    if (client.status === 'Churn') return;

    // Last touchpoint — use updated_date as proxy
    const lastTouched = client.updated_date ? new Date(client.updated_date) : null;
    const daysSince = lastTouched ? differenceInDays(now, lastTouched) : null;

    if (daysSince !== null && daysSince >= 60) {
      alerts.push({ client, type: 'overdue', severity: 'red', message: 'Overdue for check-in', detail: `${daysSince} days since last update` });
    } else if (daysSince !== null && daysSince >= 30) {
      alerts.push({ client, type: 'no-contact', severity: 'amber', message: 'No recent contact', detail: `${daysSince} days since last update` });
    }

    // Renewal alerts
    if (client.renewalDate) {
      const daysToRenewal = differenceInDays(new Date(client.renewalDate), now);
      if (daysToRenewal >= 0 && daysToRenewal <= 30) {
        alerts.push({ client, type: 'renewal-urgent', severity: 'red', message: 'Renewal urgent', detail: `${daysToRenewal} days to renewal` });
      } else if (daysToRenewal > 30 && daysToRenewal <= 60) {
        alerts.push({ client, type: 'renewal-soon', severity: 'amber', message: 'Renewal approaching', detail: `${daysToRenewal} days to renewal` });
      }
    }

    // Health score alerts
    if ((client.status === 'Live' || client.status === 'Onboarding') && client.healthRating === 'Red') {
      alerts.push({ client, type: 'health-red', severity: 'red', message: 'At risk — action needed', detail: `Health score: ${client.healthScore || 0}/35` });
    }
  });

  // Onboarding stalled
  onboardingRecords.forEach(rec => {
    const lastUpdated = rec.lastUpdated ? new Date(rec.lastUpdated) : null;
    if (!lastUpdated) return;
    const days = differenceInDays(now, lastUpdated);
    if (days >= 14) {
      const client = clients.find(c => c.id === rec.clientId);
      if (client && client.status === 'Onboarding') {
        alerts.push({ client, type: 'onboarding-stalled', severity: 'amber', message: 'Onboarding stalled', detail: `No progress in ${days} days` });
      }
    }
  });

  return alerts;
}

const SEVERITY_STYLES = {
  red: { bg: 'bg-red-50', border: 'border-red-200', badge: 'bg-red-100 text-red-700', dot: 'bg-red-500', icon: 'text-red-500' },
  amber: { bg: 'bg-amber-50', border: 'border-amber-200', badge: 'bg-amber-100 text-amber-700', dot: 'bg-amber-400', icon: 'text-amber-500' },
};

export default function SmartAlertsPanel({ clients, onSuggestAction }) {
  const [open, setOpen] = useState(true);
  const [onboardingRecords, setOnboardingRecords] = useState([]);

  useEffect(() => {
    base44.entities.OnboardingRecord.list().then(setOnboardingRecords).catch(() => {});
  }, []);

  const alerts = getAlerts(clients, onboardingRecords);

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
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2.5">
              {alerts.map((alert, i) => {
                const s = SEVERITY_STYLES[alert.severity];
                return (
                  <div key={i} className={`flex items-start justify-between gap-3 rounded-lg border p-3 ${s.bg} ${s.border}`}>
                    <div className="flex items-start gap-2 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-1.5 ${s.dot}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{alert.client.name}</p>
                        <p className={`text-xs font-medium ${s.icon.replace('text-', 'text-')}`}>{alert.message}</p>
                        <p className="text-xs text-gray-500 mt-0.5">{alert.detail}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => onSuggestAction(alert.client, alert)}
                      className="flex-shrink-0 text-xs font-semibold text-[#8403C5] hover:text-[#6d02a3] whitespace-nowrap transition-colors"
                    >
                      Suggest action →
                    </button>
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