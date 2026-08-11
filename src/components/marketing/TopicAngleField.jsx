import React, { useState } from 'react';
import { Sparkles, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { TOPIC_ANGLE_OPTIONS, buildSuggestPrompt, isStandardTopic } from './topicAngles';

// Standardised Topic / Angle field: dropdown of fixed themes + an "Other"
// free-text fallback that only appears when "Other" is selected. Includes an
// AI "Suggest" button (shown only when the post body text is available) that
// picks the best-matching option and pre-selects it — fully editable, never
// auto-saved.
//
// Storage convention (preserves existing data):
//   - standard option selected  -> topicAngle = that option string
//   - "Other" selected          -> topicAngle = the free-text value typed
//   - legacy free-text on load  -> shown as "Other" + the text preserved
export default function TopicAngleField({ value, onChange, bodyText, inputClassName }) {
  const std = isStandardTopic(value);
  const [selected, setSelected] = useState(value ? (std ? value : 'Other') : '');
  const [otherText, setOtherText] = useState(std ? '' : value || '');
  const [suggesting, setSuggesting] = useState(false);
  const [aiNote, setAiNote] = useState('');

  const handleSelect = (v) => {
    if (v === 'Other') {
      setSelected('Other');
      onChange(otherText);
    } else if (v === '') {
      setSelected('');
      setOtherText('');
      onChange('');
    } else {
      setSelected(v);
      setOtherText('');
      onChange(v);
    }
  };

  const handleOtherText = (t) => {
    setOtherText(t);
    onChange(t);
  };

  const handleSuggest = async () => {
    const text = (bodyText || '').trim();
    if (!text) return;
    setSuggesting(true);
    setAiNote('');
    try {
      const res = await base44.integrations.Core.InvokeLLM({
        prompt: buildSuggestPrompt(text),
        response_json_schema: {
          type: 'object',
          properties: { suggestion: { type: 'string' } },
        },
      });
      const suggestion = res && res.suggestion ? String(res.suggestion).trim() : '';
      if (isStandardTopic(suggestion)) {
        setSelected(suggestion);
        setOtherText('');
        onChange(suggestion);
        setAiNote('AI suggested: ' + suggestion.split(' — ')[0]);
      } else {
        setSelected('Other');
        onChange(otherText);
        setAiNote('AI suggested: Other — no strong match');
      }
    } catch {
      setAiNote('AI suggestion failed — pick manually.');
    }
    setSuggesting(false);
  };

  const hasBody = !!(bodyText && bodyText.trim());

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-semibold text-ew-muted uppercase tracking-wide">Topic / Angle</label>
        {hasBody && (
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="flex items-center gap-1 text-[11px] font-semibold text-[#8403C5] hover:text-[#6d02a3] disabled:opacity-50 transition-colors"
          >
            {suggesting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
            {suggesting ? 'Suggesting…' : 'Suggest'}
          </button>
        )}
      </div>
      <select
        className={inputClassName}
        value={selected}
        onChange={(e) => handleSelect(e.target.value)}
      >
        <option value="">Select…</option>
        {TOPIC_ANGLE_OPTIONS.map((o) => (
          <option key={o} value={o}>{o}</option>
        ))}
        <option value="Other">Other</option>
      </select>
      {selected === 'Other' && (
        <input
          className={`${inputClassName} mt-2`}
          value={otherText}
          onChange={(e) => handleOtherText(e.target.value)}
          placeholder="Describe the angle…"
        />
      )}
      {aiNote && <p className="text-[11px] text-[#8403C5] mt-1">{aiNote}</p>}
    </div>
  );
}