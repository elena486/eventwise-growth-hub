import React, { useRef, useEffect, useCallback, useState } from 'react';

// ─── Team config ──────────────────────────────────────────────────────────────

const TEAM = [
  { name: 'Chris',       role: 'CEO',               email: 'chris@eventwise.com',       color: '#7C3AED' },
  { name: 'Elena',       role: 'Marketing',          email: 'elena@eventwise.com',       color: '#0891B2' },
  { name: 'Martinique',  role: 'Customer Success',   email: 'martinique@eventwise.com',  color: '#059669' },
  { name: 'George',      role: 'SDR',                email: 'george@eventwise.com',      color: '#D97706' },
  { name: 'Ramesh',      role: 'Sales',              email: 'ramesh@eventwise.com',      color: '#DC2626' },
  { name: 'Sreeja',      role: 'QA',                 email: 'sreeja@eventwise.com',      color: '#9333EA' },
  { name: 'David',       role: 'Operations',         email: 'david@eventwise.com',       color: '#2563EB' },
];
const TEAM_NAMES = TEAM.map(t => t.name);

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

// ─── HTML ↔ Text serialisation ────────────────────────────────────────────────

const CHIP_CLASS = 'mention-chip';

/**
 * Parse plain text (@Name markers) into HTML for contentEditable.
 * @Name tokens for known team members become non-editable chip spans.
 */
function textToHTML(text) {
  if (!text) return '';
  // Split on @Name boundaries (only known names)
  const namePattern = new RegExp(`(@(${TEAM_NAMES.join('|')}))(?=[^A-Za-z]|$)`, 'g');
  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    // Plain text before the mention
    const before = text.slice(lastIndex, match.index);
    if (before) result += escapeHtml(before);
    // Chip
    result += `<span class="${CHIP_CLASS}" data-mention="${match[2]}" contenteditable="false" spellcheck="false">@${match[2]}</span>`;
    lastIndex = match.index + match[1].length;
  }
  if (lastIndex < text.length) result += escapeHtml(text.slice(lastIndex));
  // Newlines → <br>
  return result.replace(/\n/g, '<br>');
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Walk the DOM of the contentEditable and rebuild the plain-text value.
 * chip spans → @Name, text nodes → text, BR → \n
 */
function domToText(container) {
  let text = '';
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      text += node.textContent;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.dataset && node.dataset.mention) {
        text += `@${node.dataset.mention}`;
      } else if (node.tagName === 'BR') {
        text += '\n';
      } else {
        for (const child of node.childNodes) walk(child);
        if (node.tagName === 'DIV' || node.tagName === 'P') text += '\n';
      }
    }
  };
  for (const child of container.childNodes) walk(child);
  return text.replace(/\n$/, ''); // trim trailing newline
}

// ─── Cursor helpers ───────────────────────────────────────────────────────────

function getCaretCharOffset(container) {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0) return 0;
  const range = sel.getRangeAt(0);
  const preCaretRange = range.cloneRange();
  preCaretRange.selectNodeContents(container);
  preCaretRange.setEnd(range.endContainer, range.endOffset);
  // Walk pre-caret nodes to get plain-text offset
  const tmp = document.createElement('div');
  tmp.appendChild(preCaretRange.cloneContents());
  return domToText(tmp).length;
}

function setCaretAtCharOffset(container, offset) {
  let remaining = offset;
  const walk = (node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      if (remaining <= node.textContent.length) {
        const sel = window.getSelection();
        const range = document.createRange();
        range.setStart(node, remaining);
        range.collapse(true);
        sel.removeAllRanges();
        sel.addRange(range);
        return true;
      }
      remaining -= node.textContent.length;
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      if (node.dataset && node.dataset.mention) {
        const charsForChip = node.dataset.mention.length + 1; // @Name
        if (remaining <= charsForChip) {
          // Place caret after chip
          const sel = window.getSelection();
          const range = document.createRange();
          range.setStartAfter(node);
          range.collapse(true);
          sel.removeAllRanges();
          sel.addRange(range);
          return true;
        }
        remaining -= charsForChip;
      } else {
        for (const child of node.childNodes) {
          if (walk(child)) return true;
        }
      }
    }
    return false;
  };
  for (const child of container.childNodes) {
    if (walk(child)) return;
  }
  // Fallback: move to end
  const sel = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  range.collapse(false);
  sel.removeAllRanges();
  sel.addRange(range);
}

// ─── Extract @mentions from plain text ───────────────────────────────────────

function extractMentions(text) {
  const namePattern = new RegExp(`@(${TEAM_NAMES.join('|')})(?=[^A-Za-z]|$)`, 'g');
  const found = [];
  let m;
  while ((m = namePattern.exec(text)) !== null) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found;
}

// ─── Main component ───────────────────────────────────────────────────────────

/**
 * MentionTextarea — contentEditable div with @mention chip support.
 *
 * Props (same as before so all existing usages work unchanged):
 *   value, onChange, onSave, placeholder, rows, className,
 *   author, section, appUrl, autoFocus, onKeyDown
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
  onKeyDown: onKeyDownProp,
}) {
  const divRef = useRef(null);
  const lastValueRef = useRef(value); // tracks what we last set as innerHTML
  const suppressUpdateRef = useRef(false);

  // Dropdown state
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const mentionQueryRef = useRef('');     // text after @
  const mentionStartRef = useRef(-1);    // caret char offset where @ was typed

  // ── Sync external value → innerHTML (only when changed from outside) ──────
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    if (value === lastValueRef.current) return; // no change
    lastValueRef.current = value;
    const offset = getCaretCharOffset(el);
    suppressUpdateRef.current = true;
    el.innerHTML = textToHTML(value);
    suppressUpdateRef.current = false;
    try { setCaretAtCharOffset(el, offset); } catch {}
  }, [value]);

  // ── Initial render ────────────────────────────────────────────────────────
  useEffect(() => {
    const el = divRef.current;
    if (!el) return;
    el.innerHTML = textToHTML(value);
    lastValueRef.current = value;
    if (autoFocus) { el.focus(); }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Get caret pixel position for dropdown ────────────────────────────────
  const getCaretPosition = useCallback(() => {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return { top: 0, left: 0 };
    const range = sel.getRangeAt(0).cloneRange();
    range.collapse(true);
    const rect = range.getBoundingClientRect();
    const containerRect = divRef.current.getBoundingClientRect();
    return {
      top: rect.bottom - containerRect.top + 4,
      left: Math.max(0, rect.left - containerRect.left),
    };
  }, []);

  // ── On content change ─────────────────────────────────────────────────────
  const handleInput = useCallback(() => {
    if (suppressUpdateRef.current) return;
    const el = divRef.current;
    if (!el) return;
    const text = domToText(el);
    lastValueRef.current = text;
    onChange(text);

    // Detect @query at cursor
    const charOffset = getCaretCharOffset(el);
    const textBefore = text.slice(0, charOffset);
    const atMatch = textBefore.match(/@([A-Za-z]*)$/);

    if (atMatch && atMatch[1].length >= 1) {
      const q = atMatch[1];
      const items = TEAM.filter(t => t.name.toLowerCase().startsWith(q.toLowerCase()));
      if (items.length > 0) {
        mentionQueryRef.current = q;
        mentionStartRef.current = charOffset - atMatch[0].length;
        setMenuItems(items);
        setMenuIndex(0);
        setMenuPos(getCaretPosition());
        setMenuOpen(true);
        return;
      }
    }
    setMenuOpen(false);
  }, [onChange, getCaretPosition]);

  // ── Insert mention chip ───────────────────────────────────────────────────
  const insertMention = useCallback((member) => {
    const el = divRef.current;
    if (!el) return;

    const currentText = domToText(el);
    const caretOffset = getCaretCharOffset(el);
    const start = mentionStartRef.current;

    // Replace @query with @Name in the plain text
    const before = currentText.slice(0, start);
    const after = currentText.slice(caretOffset);
    const newText = `${before}@${member.name} ${after}`;

    suppressUpdateRef.current = true;
    el.innerHTML = textToHTML(newText);
    lastValueRef.current = newText;
    suppressUpdateRef.current = false;
    onChange(newText);

    // Place caret after the inserted chip + space
    const newCaret = start + member.name.length + 2; // @Name + space
    try { setCaretAtCharOffset(el, newCaret); } catch {}
    el.focus();

    setMenuOpen(false);
  }, [onChange]);

  // ── Keyboard handling ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (menuOpen && menuItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIndex(i => Math.min(i + 1, menuItems.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMenuIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(menuItems[menuIndex]); return; }
      if (e.key === 'Escape')    { setMenuOpen(false); return; }
    }
    if (onKeyDownProp) onKeyDownProp(e);
  }, [menuOpen, menuItems, menuIndex, insertMention, onKeyDownProp]);

  // ── Blur / save ───────────────────────────────────────────────────────────
  const handleBlur = useCallback(() => {
    setTimeout(async () => {
      setMenuOpen(false);
      const text = domToText(divRef.current);
      if (onSave) onSave(text);
      const mentions = extractMentions(text);
      if (mentions.length > 0) {
        try {
          const { base44 } = await import('@/api/base44Client');
          base44.functions.invoke('notifyMention', {
            mentionedNames: mentions,
            author: author || 'Someone',
            section: section || 'Eventwise HQ',
            text,
            appUrl: appUrl || '',
          }).catch(() => {});
        } catch {}
      }
    }, 150);
  }, [onSave, author, section, appUrl]);

  // ── Paste — strip HTML, keep plain text ──────────────────────────────────
  const handlePaste = useCallback((e) => {
    e.preventDefault();
    const text = e.clipboardData.getData('text/plain');
    document.execCommand('insertText', false, text);
  }, []);

  // ── Computed min-height from rows ─────────────────────────────────────────
  const minHeight = `${rows * 1.6}rem`;

  // Strip textarea-specific classes that don't apply to divs
  const divClass = className
    .replace(/\bresize-none\b/g, '')
    .replace(/\bh-\d+\b/g, '')
    .trim();

  return (
    <div className="relative">
      {/* Chip styles injected once */}
      <style>{`
        .mention-chip {
          display: inline-block;
          background: #8403C5;
          color: #fff;
          font-size: 13px;
          border-radius: 4px;
          padding: 0 4px;
          margin: 0 1px;
          line-height: 1.4;
          cursor: default;
          user-select: all;
        }
        .dark .mention-chip {
          background: #a855f7;
        }
        [contenteditable]:empty:before {
          content: attr(data-placeholder);
          color: #9CA3AF;
          pointer-events: none;
        }
      `}</style>

      <div
        ref={divRef}
        contentEditable
        suppressContentEditableWarning
        data-placeholder={placeholder || ''}
        onInput={handleInput}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onPaste={handlePaste}
        spellCheck
        className={`${divClass} overflow-y-auto whitespace-pre-wrap break-words outline-none`}
        style={{ minHeight, cursor: 'text' }}
      />

      {/* Mention dropdown */}
      {menuOpen && menuItems.length > 0 && (
        <div
          className="absolute z-50 bg-white border border-ew-border rounded-xl shadow-xl py-1 min-w-[180px] dark:bg-[#1E1E2E] dark:border-gray-700"
          style={{ top: menuPos.top, left: menuPos.left }}
          onMouseDown={e => e.preventDefault()}
        >
          {menuItems.map((member, i) => (
            <button
              key={member.name}
              type="button"
              onClick={() => insertMention(member)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                i === menuIndex
                  ? 'bg-[#F3E8FF] dark:bg-[#3B0764]'
                  : 'hover:bg-[#F9FAFB] dark:hover:bg-[#252535]'
              }`}
            >
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-bold shrink-0"
                style={{ background: member.color }}
              >
                {initials(member.name)}
              </div>
              <div>
                <p className="text-sm font-semibold text-navy dark:text-white leading-tight">{member.name}</p>
                <p className="text-[11px] text-ew-muted leading-tight">{member.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Utility export ───────────────────────────────────────────────────────────

export async function sendMentionNotifications({ text, author, section, appUrl }) {
  const mentions = extractMentions(text || '');
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