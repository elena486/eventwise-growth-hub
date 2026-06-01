/**
 * MentionTextarea
 *
 * Works like a normal textarea but shows a @mention dropdown and renders
 * @Name tokens as purple chips via a mirror-div overlay technique:
 *
 *   • Real <textarea> handles all input (cursor, selection, IME, etc.)
 *   • A mirror <div> sits behind it with identical layout; it renders the same
 *     text but replaces @Name tokens with purple chip spans.
 *   • The textarea is made visually transparent (caret stays visible) so only
 *     the mirror content shows through — giving the illusion of inline chips.
 *
 * Same props as before so every existing usage works unchanged.
 */
import React, { useState, useRef, useEffect, useCallback } from 'react';

// ─── Team members ──────────────────────────────────────────────────────────────
const TEAM = [
  { name: 'Chris',      lastName: 'Carter',      role: 'CEO',             email: 'chris@eventwise.com',       color: '#7C3AED' },
  { name: 'Elena',      lastName: 'Brouckaert',  role: 'Marketing',       email: 'elena@eventwise.com',       color: '#0891B2' },
  { name: 'Martinique', lastName: '',            role: 'Customer Success', email: 'martinique@eventwise.com',  color: '#059669' },
  { name: 'George',     lastName: '',            role: 'SDR',             email: 'george@eventwise.com',      color: '#D97706' },
  { name: 'Ramesh',     lastName: '',            role: 'Sales',           email: 'ramesh@eventwise.com',      color: '#DC2626' },
  { name: 'Sreeja',     lastName: '',            role: 'QA',              email: 'sreeja@eventwise.com',      color: '#9333EA' },
  { name: 'David',      lastName: '',            role: 'Operations',      email: 'david@eventwise.com',       color: '#2563EB' },
];
const TEAM_NAMES = TEAM.map(t => t.name);

// ─── Helpers ───────────────────────────────────────────────────────────────────
function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function extractMentions(text = '') {
  const pattern = new RegExp(`@(${TEAM_NAMES.join('|')})(?=[^A-Za-z]|$)`, 'g');
  const found = [];
  let m;
  while ((m = pattern.exec(text)) !== null) {
    if (!found.includes(m[1])) found.push(m[1]);
  }
  return found;
}

/**
 * Convert plain text to HTML for the mirror div.
 * @Name tokens for known team members → purple chip spans.
 * All other content is HTML-escaped.
 */
function textToMirrorHTML(text) {
  if (!text) return '&nbsp;'; // keep min-height
  const namePattern = new RegExp(`(@(${TEAM_NAMES.join('|')}))(?=[^A-Za-z]|$)`, 'g');
  let html = '';
  let lastIndex = 0;
  let match;
  while ((match = namePattern.exec(text)) !== null) {
    // plain text before
    html += escHtml(text.slice(lastIndex, match.index));
    // chip
    html += `<span style="display:inline-block;background:#8403C5;color:#fff;font-size:13px;border-radius:4px;padding:0 4px;margin:0 1px;line-height:1.4;">@${match[2]}</span>`;
    lastIndex = match.index + match[1].length;
  }
  html += escHtml(text.slice(lastIndex));
  // preserve newlines & spaces
  html = html.replace(/\n/g, '<br>').replace(/ {2}/g, ' &nbsp;');
  return html || '&nbsp;';
}

function escHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/**
 * Get the approximate pixel position of the caret inside a textarea.
 * Uses a temporary mirror div to measure.
 */
function getCaretCoords(textarea) {
  const { value, selectionEnd } = textarea;
  const style = window.getComputedStyle(textarea);

  const mirror = document.createElement('div');
  mirror.style.cssText = [
    'position:absolute', 'visibility:hidden', 'overflow:auto',
    'white-space:pre-wrap', 'word-wrap:break-word',
    `width:${style.width}`,
    `font:${style.font}`,
    `font-size:${style.fontSize}`,
    `font-family:${style.fontFamily}`,
    `line-height:${style.lineHeight}`,
    `padding:${style.padding}`,
    `border:${style.border}`,
    `box-sizing:${style.boxSizing}`,
  ].join(';');

  const before = escHtml(value.slice(0, selectionEnd));
  mirror.innerHTML = before.replace(/\n/g, '<br>') + '<span id="__caret__">|</span>';
  document.body.appendChild(mirror);
  const span = mirror.querySelector('#__caret__');
  const mirrorRect = mirror.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  document.body.removeChild(mirror);

  const taRect = textarea.getBoundingClientRect();
  return {
    top: spanRect.top - mirrorRect.top + taRect.height - textarea.scrollTop,
    left: spanRect.left - mirrorRect.left,
  };
}

// ─── MirrorDiv ─────────────────────────────────────────────────────────────────
/**
 * Sits absolutely behind the textarea and renders chip HTML.
 * Must perfectly match the textarea's layout.
 */
function MirrorDiv({ text, textareaRef }) {
  const [mirrorStyle, setMirrorStyle] = useState({});

  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    const cs = window.getComputedStyle(ta);
    setMirrorStyle({
      position: 'absolute',
      top: 0, left: 0,
      width: cs.width,
      height: cs.height,
      padding: cs.padding,
      border: cs.border,
      borderColor: 'transparent',
      fontSize: cs.fontSize,
      fontFamily: cs.fontFamily,
      fontWeight: cs.fontWeight,
      lineHeight: cs.lineHeight,
      letterSpacing: cs.letterSpacing,
      boxSizing: cs.boxSizing,
      whiteSpace: 'pre-wrap',
      wordWrap: 'break-word',
      overflowWrap: 'break-word',
      overflow: 'auto',
      pointerEvents: 'none',
      zIndex: 0,
      color: 'transparent', // plain text invisible; chips are visible via their own color
      background: 'transparent',
      borderRadius: cs.borderRadius,
    });
  }, [text]); // re-measure on text change in case textarea resized

  return (
    <div
      aria-hidden
      style={mirrorStyle}
      dangerouslySetInnerHTML={{ __html: textToMirrorHTML(text) }}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────
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
  const textareaRef = useRef(null);
  const containerRef = useRef(null);

  const [menuOpen, setMenuOpen] = useState(false);
  const [menuItems, setMenuItems] = useState([]);
  const [menuIndex, setMenuIndex] = useState(0);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0 });
  const mentionStartRef = useRef(-1); // index in value where @ was typed

  // ── Handle text change ────────────────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const val = e.target.value;
    onChange(val);

    const caret = e.target.selectionStart;
    const textBefore = val.slice(0, caret);
    const atMatch = textBefore.match(/@([A-Za-z]*)$/);

    if (atMatch && atMatch[1].length >= 1) {
      const q = atMatch[1];
      const items = TEAM.filter(t => t.name.toLowerCase().startsWith(q.toLowerCase()));
      if (items.length > 0) {
        mentionStartRef.current = caret - atMatch[0].length;
        setMenuItems(items);
        setMenuIndex(0);
        setMenuOpen(true);
        // Position dropdown near caret
        try {
          const coords = getCaretCoords(e.target);
          setMenuPos({ top: coords.top + 4, left: Math.max(0, coords.left) });
        } catch {
          setMenuPos({ top: e.target.offsetHeight + 4, left: 0 });
        }
        return;
      }
    }
    setMenuOpen(false);
  }, [onChange]);

  // ── Insert mention ────────────────────────────────────────────────────────
  const insertMention = useCallback((member) => {
    const ta = textareaRef.current;
    const caret = ta.selectionStart;
    const start = mentionStartRef.current;
    const before = value.slice(0, start);
    const after = value.slice(caret);
    const newVal = `${before}@${member.name} ${after}`;
    onChange(newVal);
    setMenuOpen(false);
    setTimeout(() => {
      const newCaret = start + member.name.length + 2;
      ta.setSelectionRange(newCaret, newCaret);
      ta.focus();
    }, 0);
  }, [value, onChange]);

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const handleKeyDown = useCallback((e) => {
    if (menuOpen && menuItems.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setMenuIndex(i => Math.min(i + 1, menuItems.length - 1)); return; }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMenuIndex(i => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); insertMention(menuItems[menuIndex]); return; }
      if (e.key === 'Escape')    { setMenuOpen(false); return; }
    }
    if (onKeyDownProp) onKeyDownProp(e);
  }, [menuOpen, menuItems, menuIndex, insertMention, onKeyDownProp]);

  // ── Blur / save + notifications ───────────────────────────────────────────
  const handleBlur = useCallback(() => {
    setTimeout(async () => {
      setMenuOpen(false);
      if (onSave) onSave(value);
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
    }, 150);
  }, [value, onSave, author, section, appUrl]);

  // ── Textarea style tweaks: make text invisible so mirror shows through ────
  // We keep caret-color visible so cursor is still shown.
  const taStyle = {
    position: 'relative',
    zIndex: 1,
    background: 'transparent',
    color: 'transparent',
    caretColor: '#111827',
    resize: 'none',
  };

  return (
    <div ref={containerRef} style={{ position: 'relative' }}>
      {/* Mirror div (chips visible, behind textarea) */}
      <MirrorDiv text={value} textareaRef={textareaRef} />

      {/* Real textarea (invisible text, real interaction) */}
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
        style={taStyle}
        spellCheck
      />

      {/* @mention dropdown */}
      {menuOpen && menuItems.length > 0 && (
        <div
          className="absolute z-50 bg-white border border-gray-200 rounded-xl shadow-xl py-1 min-w-[200px]"
          style={{ top: menuPos.top, left: menuPos.left, maxHeight: 260, overflowY: 'auto' }}
          onMouseDown={e => e.preventDefault()}
        >
          {menuItems.map((member, i) => (
            <button
              key={member.name}
              type="button"
              onClick={() => insertMention(member)}
              className={`w-full text-left px-3 py-2 flex items-center gap-2.5 transition-colors ${
                i === menuIndex ? 'bg-purple-50' : 'hover:bg-gray-50'
              }`}
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0"
                style={{ background: member.color }}
              >
                {initials(member.name)}
              </div>
              <div className="text-left">
                <p className="text-sm font-semibold text-gray-900 leading-tight">
                  {member.name}{member.lastName ? ` ${member.lastName}` : ''}
                </p>
                <p className="text-xs text-gray-500 leading-tight">{member.role}</p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Utility export (used elsewhere in app) ───────────────────────────────────
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