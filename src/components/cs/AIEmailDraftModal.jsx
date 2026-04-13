import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Sparkles, Copy, Check, RefreshCw } from 'lucide-react';
import { differenceInDays } from 'date-fns';

const EMAIL_TYPES = [
  'Quarterly Check-in',
  'Renewal Conversation',
  'Onboarding Follow-up',
  'Health Check',
  'General Outreach',
];

function buildEmailPrompt(client, emailType, aiSuggestion) {
  const now = new Date();
  const daysSince = client.updated_date ? differenceInDays(now, new Date(client.updated_date)) : null;
  const daysToRenewal = client.renewalDate ? differenceInDays(new Date(client.renewalDate), now) : null;
  const firstName = (client.contactName || client.name || '').split(' ')[0];

  return `Write a ready-to-send email for a Customer Success manager at Eventwise (a B2B SaaS for event finance management).

Email type: ${emailType}
To: ${firstName} at ${client.name}
Plan: ${client.plan || 'Eventwise'}
Health: ${client.healthScore || 'Not scored'}/35 — ${client.healthRating || ''}
Last account update: ${daysSince !== null ? `${daysSince} days ago` : 'Unknown'}
Renewal: ${daysToRenewal !== null ? `in ${daysToRenewal} days` : 'Not set'}
Notes: ${client.notes || 'None'}
${aiSuggestion ? `Context from AI suggestion: ${aiSuggestion}` : ''}

Rules:
- 3–4 short paragraphs max
- Warm, professional, brief — not salesy
- Open directly with the reason for reaching out (no "I hope this finds you well")
- Include a clear, simple call to action at the end
- Sign off as Chris / Martinique (use "Chris" if owner is Chris Carter, otherwise "Martinique")
- Owner: ${client.owner || 'Martinique'}

Return only the email body (no subject line). Plain text.`;
}

export default function AIEmailDraftModal({ client, initialEmailType, aiSuggestion, onClose, onTouchpointLogged }) {
  const [emailType, setEmailType] = useState(initialEmailType || EMAIL_TYPES[0]);
  const [draft, setDraft] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [logging, setLogging] = useState(false);
  const [logged, setLogged] = useState(false);

  const generate = async (type) => {
    setLoading(true);
    setError(false);
    setDraft('');
    const result = await base44.integrations.Core.InvokeLLM({ prompt: buildEmailPrompt(client, type, aiSuggestion) });
    setDraft(result);
    setLoading(false);
  };

  useEffect(() => { generate(emailType); }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleLogTouchpoint = async () => {
    setLogging(true);
    await base44.entities.Client.update(client.id, { notes: `[Touchpoint logged ${new Date().toLocaleDateString('en-GB')}] ${client.notes || ''}`.trim() });
    setLogging(false);
    setLogged(true);
    setTimeout(() => { onTouchpointLogged(); onClose(); }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-ew-border shrink-0">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#8403C5]" />
            <span className="text-sm font-bold text-navy">Draft Email — {client.name}</span>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted hover:text-navy transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Email type selector */}
        <div className="px-5 py-3 border-b border-ew-border shrink-0">
          <div className="flex items-center gap-2 flex-wrap">
            {EMAIL_TYPES.map(t => (
              <button
                key={t}
                onClick={() => { setEmailType(t); generate(t); }}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${emailType === t ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'border-ew-border text-ew-body hover:border-[#8403C5]/40 hover:text-[#8403C5]'}`}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {loading && (
            <div className="flex items-center gap-2 py-6 text-sm text-ew-muted justify-center">
              <div className="w-5 h-5 border-2 border-[#8403C5]/30 border-t-[#8403C5] rounded-full animate-spin" />
              Thinking...
            </div>
          )}
          {error && (
            <div className="py-2">
              <p className="text-sm text-red-500 mb-2">Couldn't generate a suggestion — try again.</p>
              <button onClick={() => generate(emailType)} className="flex items-center gap-1.5 text-xs font-medium text-[#8403C5] hover:text-[#6d02a3]">
                <RefreshCw className="w-3 h-3" /> Retry
              </button>
            </div>
          )}
          {draft && !loading && (
            <>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full text-sm text-gray-800 leading-relaxed border border-ew-border rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20"
                rows={12}
              />
              <p className="text-[10px] text-ew-muted mt-2">AI suggestion — review before sending</p>
            </>
          )}
        </div>

        {/* Footer actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-ew-border shrink-0">
          <button
            onClick={handleCopy}
            disabled={!draft || loading}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold border border-ew-border text-ew-body rounded-lg hover:bg-ew-bg disabled:opacity-40 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy to clipboard'}
          </button>
          <button
            onClick={handleLogTouchpoint}
            disabled={logging || logged}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 disabled:opacity-60 transition-colors ml-auto"
          >
            {logged ? <Check className="w-3.5 h-3.5" /> : null}
            {logged ? 'Logged!' : logging ? 'Logging…' : 'Mark touchpoint logged'}
          </button>
        </div>
      </div>
    </div>
  );
}