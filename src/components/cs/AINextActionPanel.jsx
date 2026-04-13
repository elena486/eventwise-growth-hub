import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Sparkles, RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';

function buildPrompt(client, alert) {
  const now = new Date();
  const daysSince = client.updated_date ? differenceInDays(now, new Date(client.updated_date)) : null;
  const daysToRenewal = client.renewalDate ? differenceInDays(new Date(client.renewalDate), now) : null;

  return `You are a Customer Success advisor for Eventwise, a B2B SaaS company. 
Suggest the single best next action for this client account.

Client: ${client.name}
Plan: ${client.plan || 'Unknown'}
Status: ${client.status}
Health score: ${client.healthScore || 'Not scored'}/35 — Rating: ${client.healthRating || 'Unknown'}
Last account update: ${daysSince !== null ? `${daysSince} days ago` : 'Unknown'}
Renewal date: ${daysToRenewal !== null ? `in ${daysToRenewal} days` : client.renewalDate || 'Not set'}
Notes: ${client.notes || 'None'}
${alert ? `Alert triggered: ${alert.message} — ${alert.detail}` : ''}

Respond in this exact format (2–3 sentences max):
Action type: [e.g. Quarterly check-in call / Renewal conversation / Onboarding nudge]
Reason: [Brief reason why this is the right action now]
Suggested email subject: [Ready-to-use email subject line]

Be specific, practical, and concise. No filler phrases.`;
}

export default function AINextActionPanel({ client, alert, onClose, onDraftEmail }) {
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  const fetchSuggestion = async () => {
    setLoading(true);
    setError(false);
    setSuggestion(null);
    const result = await base44.integrations.Core.InvokeLLM({ prompt: buildPrompt(client, alert) });
    setSuggestion(result);
    setLoading(false);
  };

  useEffect(() => { fetchSuggestion(); }, [client?.id]);

  return (
    <div className="absolute right-0 top-8 z-50 w-80 bg-white border border-ew-border rounded-xl shadow-xl p-4" onClick={e => e.stopPropagation()}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#8403C5]" />
          <span className="text-sm font-bold text-navy">AI Suggestion</span>
        </div>
        <button onClick={onClose} className="p-1 rounded hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading && (
        <div className="flex items-center gap-2 py-4 text-sm text-ew-muted">
          <div className="w-4 h-4 border-2 border-[#8403C5]/30 border-t-[#8403C5] rounded-full animate-spin" />
          Thinking...
        </div>
      )}

      {error && (
        <div className="py-2">
          <p className="text-sm text-red-500 mb-2">Couldn't generate a suggestion — try again.</p>
          <button onClick={fetchSuggestion} className="flex items-center gap-1.5 text-xs font-medium text-[#8403C5] hover:text-[#6d02a3]">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {suggestion && !loading && (
        <>
          <p className="text-sm text-gray-800 whitespace-pre-wrap leading-relaxed mb-3">{suggestion}</p>
          <p className="text-[10px] text-ew-muted mb-3">AI suggestion — review before sending</p>
          <button
            onClick={() => onDraftEmail(client, suggestion)}
            className="w-full py-2 text-sm font-semibold text-white bg-[#8403C5] hover:bg-[#6d02a3] rounded-lg transition-colors"
          >
            Draft email →
          </button>
        </>
      )}
    </div>
  );
}