import React, { useState, useRef, useEffect, useCallback } from 'react';

const TEAM = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];

/**
 * MentionTextarea — a textarea that supports @mention autocomplete.
 *
 * Props:
 *   value        — controlled string value
 *   onChange     — (newValue: string) => void
 *   onSave       — optional (value: string) => void, called on blur/Enter if provided
 *   placeholder  — string
 *   rows         — number
 *   className    — extra classes on the textarea
 *   author       — current user's name (to skip self-notify)
 *   section      — section label for mention emails e.g. "Customer Success / Broadwick / Notes"
 *   appUrl       — link for mention email
 *   autoFocus    — bool
 *   onKeyDown    — passthrough keydown handler
 */
export default function MentionTextarea({
  value = '',
  onChange,
  onSave,
  placeholder,
  rows = 3,
  className = '',
  author,
  section,
  appUrl,
  autoFocus,
  onKeyDown,
}) {
  const [query, setQuery] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const textareaRef = useRef(null);
  const menuRef = useRef(null);
  const mentionStartRef = useRef(-1); // caret position where @ was typed

  const filtered = TEAM.filter(n => n.toLowerCase().startsWith(query.toLowerCase()));

  const handleChange = (e) => {
    const val = e.target.value;
    onChange(val);

    const caret = e.target.selectionStart;
    // Find the @ that precedes the cursor
    const textBefore = val.slice(0, caret);
    const atMatch = textBefore.match(/@([A-Za-z]*)$/);
    if (atMatch) {
      mentionStartRef.current = caret - atMatch[0].length;
      setQuery(atMatch[1]);
      setMenuOpen(true);
      setMenuIndex(0);
      positionMenu(e.target);
    } else {
      setMenuOpen(false);
      setQuery('');
    }
  };

  const positionMenu = (textarea) => {
    // Approximate position by placing below the textarea
    const rect = textarea.getBoundingClientRect();
    const containerRect = textarea.parentElement.getBoundingClientRect();
    setMenuPos({
      top: rect.bottom - containerRect.top,
      left: rect.left - containerRect.left,
    });
  };

  const insertMention = (name) => {
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const start = mentionStartRef.current;
    const before = value.slice(0, start);
    const after = value.slice(caret);
    const newVal = `${before}@${name} ${after}`;
    onChange(newVal);
    setMenuOpen(false);
    setQuery('');
    // restore caret after insert
    setTimeout(() => {
      const newCaret = start + name.length + 2;
      ta.setSelectionRange(newCaret, newCaret);
      ta.focus();
    }, 0);
  };

  const handleKeyDown = (e) => {
    if (menuOpen && filtered.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIndex(i => Math.min(i + 1, filtered.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setMenuIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(filtered[menuIndex]); return; }
      if (e.key === 'Escape') { setMenuOpen(false); return; }
    }
    if (onKeyDown) onKeyDown(e);
  };

  // Extract @mentioned names from text
  const extractMentions = (text) => {
    const matches = text.match(/@([A-Za-z]+)/g) || [];
    return [...new Set(matches.map(m => m.slice(1)).filter(n => TEAM.includes(n)))];
  };

  const handleBlur = async () => {
    // Small delay so click on menu item fires first
    setTimeout(async () => {
      setMenuOpen(false);
      if (onSave) {
        onSave(value);
        // Fire mention notifications
        const mentions = extractMentions(value);
        if (mentions.length > 0) {
          try {
            const { base44 } = await import('@/api/base44Client');
            base44.functions.invoke('notifyMention', {
              mentionedNames: mentions,
              author: author || 'Someone',
              section: section || 'Eventwise HQ',
              text: value,
              appUrl: appUrl || '',
            }).catch(() => {});
          } catch {}
        }
      }
    }, 150);
  };

  // Render value with highlighted mentions
  // (Used in display-only mode — not needed here since this is an input)

  return (
    <div className="relative">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        rows={rows}
        autoFocus={autoFocus}
        className={className}
      />
      {menuOpen && filtered.length > 0 && (
        <div
          ref={menuRef}
          className="absolute z-50 bg-white border border-ew-border rounded-xl shadow-lg py-1 min-w-[140px]"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseDown={e => e.preventDefault()} // prevent textarea blur before click
        >
          {filtered.map((name, i) => (
            <button
              key={name}
              type="button"
              onClick={() => insertMention(name)}
              className={`w-full text-left px-3 py-1.5 text-sm flex items-center gap-2 transition-colors ${i === menuIndex ? 'bg-[#F3E8FF] text-[#8403C5]' : 'text-navy hover:bg-[#F9FAFB]'}`}
            >
              <span className="font-semibold text-[#8403C5]">@</span>{name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Utility: send mention notifications imperatively (call after saving a note).
 * Pass author (string), section (string), text (string), appUrl (string).
 */
export async function sendMentionNotifications({ text, author, section, appUrl }) {
  const TEAM = ['Chris', 'Elena', 'Martinique', 'George', 'Ramesh', 'Sreeja', 'David'];
  const matches = text?.match(/@([A-Za-z]+)/g) || [];
  const mentions = [...new Set(matches.map(m => m.slice(1)).filter(n => TEAM.includes(n)))];
  if (!mentions.length) return;
  try {
    const { base44 } = await import('@/api/base44Client');
    base44.functions.invoke('notifyMention', {
      mentionedNames: mentions,
      author: author || 'Someone',
      section: section || 'Eventwise HQ',
      text: text || '',
      appUrl: appUrl || '',
    }).catch(() => {});
  } catch {}
}