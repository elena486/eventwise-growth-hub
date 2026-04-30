import React, { useState, useRef } from 'react';

const TOOLTIP_TEXT = {
  emails: "Communication quality — 1: Chasing constantly, unclear comms — 3: Generally responsive, occasional delays — 5: Fast, clear, proactive communication",
  meetings: "Meeting engagement — 1: Missed meetings, no decisions — 3: Attends, some engagement — 5: Fully engaged, decisions and actions every time",
  goals: "Goal alignment — 1: No clear direction, misaligned — 3: Some clarity, occasional confusion — 5: Crystal clear goals, aligned on success",
  adoption: "Platform usage — 1: Not using platform, full dependency — 3: Using some features, partial value — 5: Fully self-sufficient, uses all features",
  knowledge: "Platform understanding — 1: Repeated basic questions, confused — 3: Understands basics, some questions — 5: Confident, rarely needs support",
  cx: "Relationship quality — 1: Frustrated, complaints, at risk — 3: Neutral, professional — 5: Strong positive relationship, internal advocate",
  issues: "Problem resolution — 1: Active unresolved blockers — 3: Issues present but being addressed — 5: No blockers, fast resolution",
};

function chipColors(v) {
  if (!v || v === 0) return { bg: '#F3F4F6', text: '#9CA3AF' };
  if (v <= 2) return { bg: '#FEE2E2', text: '#B91C1C' };
  if (v === 3) return { bg: '#FEF9C3', text: '#A16207' };
  return { bg: '#DCFCE7', text: '#15803D' };
}

/**
 * HealthScoreChip
 * Props:
 *   scoreKey   — one of: emails, meetings, goals, adoption, knowledge, cx, issues
 *   label      — display label below chip
 *   value      — current score (1-5 or null/0)
 *   onSave     — (newValue: number) => void
 *   readonly   — boolean (no click-to-edit)
 */
export default function HealthScoreChip({ scoreKey, label, value, onSave, readonly = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [editing, setEditing] = useState(false);
  const tooltipTimer = useRef(null);
  const { bg, text } = chipColors(value);

  const handleMouseEnter = () => {
    clearTimeout(tooltipTimer.current);
    tooltipTimer.current = setTimeout(() => setShowTooltip(true), 200);
  };

  const handleMouseLeave = () => {
    clearTimeout(tooltipTimer.current);
    setShowTooltip(false);
  };

  const handleSelect = (v) => {
    setEditing(false);
    if (onSave) onSave(v);
  };

  return (
    <div
      className="flex flex-col items-center gap-0.5"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ position: 'relative' }}
    >
      {/* Chip */}
      <div
        onClick={() => { if (!readonly) setEditing(e => !e); }}
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          backgroundColor: bg,
          color: text,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 14,
          fontWeight: 700,
          cursor: readonly ? 'default' : 'pointer',
          flexShrink: 0,
          userSelect: 'none',
          transition: 'box-shadow 0.15s',
          boxShadow: editing ? '0 0 0 2px #8403C5' : undefined,
        }}
      >
        {value || '—'}
      </div>

      {/* Label */}
      <span style={{ fontSize: 9, color: '#9CA3AF', lineHeight: 1.2, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {label}
      </span>

      {/* Inline dropdown for edit */}
      {editing && !readonly && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 4,
            background: '#fff',
            border: '1px solid #E5E7EB',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            zIndex: 10000,
            overflow: 'hidden',
            minWidth: 40,
          }}
          onMouseLeave={() => setEditing(false)}
        >
          {[1, 2, 3, 4, 5].map(n => {
            const { bg: dBg, text: dText } = chipColors(n);
            return (
              <div
                key={n}
                onClick={(e) => { e.stopPropagation(); handleSelect(n); }}
                style={{
                  width: 40,
                  height: 32,
                  backgroundColor: n === value ? dBg : '#fff',
                  color: n === value ? dText : '#374151',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                  borderBottom: n < 5 ? '1px solid #F3F4F6' : 'none',
                }}
                onMouseEnter={e => { e.currentTarget.style.backgroundColor = dBg; e.currentTarget.style.color = dText; }}
                onMouseLeave={e => { e.currentTarget.style.backgroundColor = n === value ? dBg : '#fff'; e.currentTarget.style.color = n === value ? dText : '#374151'; }}
              >
                {n}
              </div>
            );
          })}
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && !editing && TOOLTIP_TEXT[scoreKey] && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 8,
            zIndex: 9999,
            background: '#1E2035',
            color: '#fff',
            fontSize: 13,
            padding: 12,
            borderRadius: 8,
            maxWidth: 260,
            boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
            whiteSpace: 'normal',
            pointerEvents: 'none',
            lineHeight: 1.5,
          }}
        >
          {TOOLTIP_TEXT[scoreKey]}
          {/* Arrow */}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '6px solid transparent',
            borderRight: '6px solid transparent',
            borderTop: '6px solid #1E2035',
          }} />
        </div>
      )}
    </div>
  );
}