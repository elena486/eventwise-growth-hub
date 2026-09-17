import React, { useState, useRef, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { DEFAULT_ACCOUNTING_SERVICES } from '@/lib/proposalData';
import { X, Send, Sparkles, Check, AlertCircle, MessageSquare } from 'lucide-react';

const PLAN_LABELS = {
  starter: 'Starter (£299/mo)',
  professional: 'Professional (£499/mo)',
  business: 'Business (£799/mo)',
};
const ONBOARDING_LABELS = {
  essential: 'Success Essential (Free)',
  plus: 'Success Plus (£1,500)',
  premium: 'Success Premium (£5,000)',
};
const SERVICE_TYPE_LABELS = {
  not_included: 'Not included',
  included_in_plan: 'Included in plan',
  included_in_fee: 'Included in accounting service fee',
  separate_fee: 'Separate fee',
};

const RESPONSE_SCHEMA = {
  type: 'object',
  properties: {
    response_type: { type: 'string', enum: ['apply', 'clarify'] },
    message: { type: 'string', description: 'Explanation when clarifying, or brief note when applying' },
    changes: {
      type: 'object',
      properties: {
        companyName: { type: 'string' },
        companyIsNew: { type: 'boolean' },
        contactName: { type: 'string' },
        contactEmail: { type: 'string' },
        date: { type: 'string', description: 'yyyy-MM format' },
        validUntil: { type: 'string', description: 'yyyy-MM-dd format' },
        plan: { type: 'string', enum: ['starter', 'professional', 'business'] },
        customPrice: { type: 'string' },
        accountingServiceType: { type: 'string', enum: ['not_included', 'included_in_plan', 'included_in_fee', 'separate_fee'] },
        accountingPrice: { type: 'string' },
        accountingServices: { type: 'array', items: { type: 'boolean' }, description: 'Full 8-element array' },
        onboarding: { type: 'string', enum: ['essential', 'plus', 'premium'] },
        showAllOnboarding: { type: 'boolean' },
        notes: { type: 'string' },
      },
    },
    summary_lines: { type: 'array', items: { type: 'string' } },
  },
  required: ['response_type'],
};

function buildPrompt(request, form, leadNames) {
  const currentServices = DEFAULT_ACCOUNTING_SERVICES
    .map((s, i) => `   ${i}: ${s} — ${form.accountingServices[i] ? 'ON' : 'OFF'}`)
    .join('\n');

  return `You are an AI assistant for the Eventwise Proposal Generator. You parse natural language edit requests and map them to structured form fields.

CURRENT FORM STATE:
- Company: ${form.companyName || '(empty)'}
- Contact name: ${form.contactName || '(empty)'}
- Contact email: ${form.contactEmail || '(empty)'}
- Month/Year: ${form.date || '(empty)'}
- Valid until: ${form.validUntil || '(empty)'}
- Plan: ${form.plan} (${PLAN_LABELS[form.plan]})
- Custom price: ${form.customPrice || '(none — using standard)'}
- Accounting service type: ${form.accountingServiceType} (${SERVICE_TYPE_LABELS[form.accountingServiceType]})
- Accounting price: ${form.accountingPrice || '(empty)'}
- Accounting services (8 checkboxes):
${currentServices}
- Onboarding: ${form.onboarding} (${ONBOARDING_LABELS[form.onboarding]})
- Show all onboarding packages: ${form.showAllOnboarding}
- Notes: ${form.notes || '(empty)'}

AVAILABLE COMPANIES (existing leads):
${leadNames.length > 0 ? leadNames.join(', ') : '(none yet)'}

EDITABLE FIELDS — you can ONLY edit these. If a request asks for anything else (layout, design, colors, "make it look nicer", new sections, etc.), set response_type to "clarify" and explain you can only edit structured fields.

1. companyName — Company name. If it matches an available company above, set companyIsNew to false. If not, set companyIsNew to true.
2. contactName — Contact name (free text)
3. contactEmail — Contact email (free text)
4. date — "yyyy-MM" format (e.g. "2026-09"). Parse "October 2026" → "2026-10".
5. validUntil — "yyyy-MM-dd" format (e.g. "2026-10-15"). Parse "30 days", "end of October", etc. Today is ${new Date().toISOString().slice(0, 10)}.
6. plan — "starter", "professional", or "business". Map "Starter"→"starter", "Professional"→"professional", "Business"→"business".
7. customPrice — Custom monthly price as string (e.g. "250"). Empty string "" to use standard.
8. accountingServiceType — "not_included", "included_in_plan", "included_in_fee", or "separate_fee".
9. accountingPrice — Annual accounting price as string (e.g. "8500").
10. accountingServices — Full 8-element boolean array (copy current state, toggle requested items). Services in order:
${DEFAULT_ACCOUNTING_SERVICES.map((s, i) => `   ${i}: ${s}`).join('\n')}
11. onboarding — "essential", "plus", or "premium". Map "Essential"/"Success Essential"→"essential", "Plus"/"Success Plus"→"plus", "Premium"/"Success Premium"→"premium".
12. showAllOnboarding — boolean. true = show all 3 packages side by side. false = show only selected.
13. notes — Free text. If user says "add a note", append to existing notes with a newline. If "set/change notes", replace. Always return the FULL new notes string.

RULES:
- Only include fields in "changes" that the user actually requested. Omit unchanged fields.
- If the request is ambiguous or references something not editable, set response_type to "clarify" and explain in "message".
- If you can partially fulfill a request (e.g. "remove purchase order management and add a note..."), apply the parts you can and set response_type to "clarify" with a message explaining what couldn't be done (e.g. "purchase order management is a plan feature, not a toggleable accounting service — I've added the note but can't toggle that").
- summary_lines: human-readable bullet points of each change, e.g. ["Plan → Business (£799/mo)", "Contact → Sarah Jones (sarah@festival.com)"].
- For accountingServices, always return all 8 elements representing the new state.

User request: "${request}"`;
}

export default function ProposalChatPanel({ form, setForm, leads = [] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [pendingChange, setPendingChange] = useState(null);
  const scrollRef = useRef(null);
  const inputRef = useRef(null);

  const leadNames = leads.map(l => l.companyName).filter(Boolean);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, pendingChange, loading]);

  useEffect(() => {
    if (isOpen && inputRef.current) inputRef.current.focus();
  }, [isOpen]);

  const applyChanges = (changes) => {
    setForm(prev => {
      const next = { ...prev };
      if (changes.companyName !== undefined) {
        next.companyName = changes.companyName;
        if (changes.contactName === undefined) {
          const lead = leads.find(l => l.companyName === changes.companyName);
          if (lead?.contactName) next.contactName = lead.contactName;
        }
      }
      if (changes.contactName !== undefined) next.contactName = changes.contactName;
      if (changes.contactEmail !== undefined) next.contactEmail = changes.contactEmail;
      if (changes.date !== undefined) next.date = changes.date;
      if (changes.validUntil !== undefined) next.validUntil = changes.validUntil;
      if (changes.plan !== undefined) next.plan = changes.plan;
      if (changes.customPrice !== undefined) next.customPrice = changes.customPrice;
      if (changes.accountingServiceType !== undefined) next.accountingServiceType = changes.accountingServiceType;
      if (changes.accountingPrice !== undefined) next.accountingPrice = changes.accountingPrice;
      if (Array.isArray(changes.accountingServices) && changes.accountingServices.length === 8) {
        next.accountingServices = changes.accountingServices;
      }
      if (changes.onboarding !== undefined) next.onboarding = changes.onboarding;
      if (changes.showAllOnboarding !== undefined) next.showAllOnboarding = changes.showAllOnboarding;
      if (changes.notes !== undefined) next.notes = changes.notes;
      return next;
    });
  };

  const handleSubmit = async () => {
    const text = input.trim();
    if (!text || loading || pendingChange) return;

    setMessages(prev => [...prev, { role: 'user', content: text }]);
    setInput('');
    setLoading(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: buildPrompt(text, form, leadNames),
        response_json_schema: RESPONSE_SCHEMA,
      });

      if (result.response_type === 'apply' && result.changes) {
        setPendingChange({
          changes: result.changes,
          summaryLines: result.summary_lines || [],
          companyIsNew: result.changes.companyIsNew,
          companyName: result.changes.companyName,
        });
      } else {
        setMessages(prev => [...prev, { role: 'assistant', content: result.message || 'I couldn\'t process that request.' }]);
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.' }]);
    }
    setLoading(false);
  };

  const handleConfirm = () => {
    if (!pendingChange) return;
    applyChanges(pendingChange.changes);
    setMessages(prev => [...prev, { role: 'assistant', content: '✓ Changes applied to the proposal.' }]);
    setPendingChange(null);
  };

  const handleCancel = () => {
    setMessages(prev => [...prev, { role: 'assistant', content: '✗ Changes discarded.' }]);
    setPendingChange(null);
  };

  return (
    <>
      {/* Floating button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 bg-[#8403C5] text-white rounded-full shadow-lg hover:bg-[#7002A8] transition-colors"
        >
          <MessageSquare className="w-5 h-5" />
          <span className="text-sm font-semibold">AI Edit</span>
        </button>
      )}

      {/* Chat panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[600px] max-h-[calc(100vh-48px)] bg-white rounded-2xl shadow-2xl border border-ew-border flex flex-col overflow-hidden animate-modal-in">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-ew-border bg-[#8403C5] shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-white" />
              <span className="text-sm font-semibold text-white">AI Proposal Editor</span>
            </div>
            <button onClick={() => setIsOpen(false)} className="text-white/70 hover:text-white transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3 bg-ew-bg">
            {messages.length === 0 && !pendingChange && !loading && (
              <div className="text-center py-8">
                <Sparkles className="w-8 h-8 text-[#8403C5]/30 mx-auto mb-2" />
                <p className="text-sm text-ew-muted">Tell me what to change in the proposal…</p>
                <p className="text-xs text-ew-muted/70 mt-1">e.g. "Switch to Business plan and set contact to Sarah Jones"</p>
              </div>
            )}
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-[#8403C5] text-white rounded-br-md'
                    : 'bg-white border border-ew-border text-ew-body rounded-bl-md'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-white border border-ew-border rounded-2xl rounded-bl-md px-4 py-3 text-sm text-ew-muted">
                  <span className="inline-flex gap-1">
                    <span className="w-1.5 h-1.5 bg-ew-muted rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-ew-muted rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></span>
                    <span className="w-1.5 h-1.5 bg-ew-muted rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </span>
                </div>
              </div>
            )}

            {/* Pending changes confirmation card */}
            {pendingChange && (
              <div className="bg-white border border-[#8403C5]/30 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-[#8403C5]" />
                  <span className="text-sm font-semibold text-navy">Proposed changes</span>
                </div>
                <div className="space-y-1.5">
                  {pendingChange.summaryLines.map((line, i) => (
                    <div key={i} className="flex items-start gap-2 text-sm text-ew-body">
                      <span className="text-[#1D9E75] font-bold mt-0.5 shrink-0">→</span>
                      <span>{line}</span>
                    </div>
                  ))}
                </div>
                {pendingChange.companyIsNew && (
                  <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                    <span>"{pendingChange.companyName}" is not in your existing company list. The name will be set but no new lead record will be created.</span>
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleConfirm} className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors">
                    <Check className="w-4 h-4" /> Apply changes
                  </button>
                  <button onClick={handleCancel} className="px-3 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg border border-ew-border transition-colors">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="px-3 py-3 border-t border-ew-border bg-white shrink-0">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }}
                placeholder={pendingChange ? 'Confirm or cancel the changes above…' : 'Tell me what to change...'}
                rows={1}
                className="flex-1 text-sm border border-ew-border rounded-xl px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 max-h-24"
                disabled={loading || !!pendingChange}
              />
              <button
                onClick={handleSubmit}
                disabled={!input.trim() || loading || !!pendingChange}
                className="p-2.5 bg-[#8403C5] text-white rounded-xl hover:bg-[#7002A8] transition-colors disabled:opacity-40 shrink-0"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}