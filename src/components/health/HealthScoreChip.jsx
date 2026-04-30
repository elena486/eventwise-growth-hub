import React, { useState, useRef, useEffect } from 'react';
import ReactDOM from 'react-dom';

const TOOLTIP_TEXT = {
  emails: "Communication quality — 1: Chasing constantly, unclear comms — 3: Generally responsive, occasional delays — 5: Fast, clear, proactive communication",
  meetings: "Meeting engagement — 1: Missed meetings, no decisions — 3: Attends, some engagement — 5: Fully engaged, decisions and actions every time",
  goals: "Goal alignment — 1: No clear direction, misaligned — 3: Some clarity, occasional confusion — 5: Crystal clear goals, aligned on success",
  adoption: "Platform usage — 1: Not using platform, full dependency — 3: Using some features, partial value — 5: Fully self-sufficient, uses all features",
  knowledge: "Platform understanding — 1: Repeated basic questions, confused — 3: Understands basics, some questions — 5: Confident, rarely needs support",
  cx: "Relationship quality — 1: Frustrated, complaints, at risk — 3: Neutral, professional — 5: Strong positive relationship, internal advocate",
  issues: "Problem resolution — 1: Active unresolved blockers — 3: Issues present but being addressed — 5: No blockers, fast resolution",
};

const TOOLTIP_WIDTH = 260;

function chipColors(v) {
  if (!v || v === 0) return { bg: '#F3F4F6', text: '#9CA3AF' };
  if (v <= 2) return { bg: '#FEE2E2', text: '#B91C1C' };
  if (v === 3) return { bg: '#FEF9C3', text: '#A16207' };
  return { bg: '#DCFCE7', text: '#15803D' };
}

function Tooltip({ chipRef, text }) {
  const [style, setStyle] = useState({ opacity: 0, top: 0, left: 0, flipBelow: false });

  useEffect(() => {
    if (!chipRef.current) return;
    const rect = chipRef.current.getBoundingClientRect();
    const chipCenterX = rect.left + rect.width / 2;
    const TOOLTIP_HEIGHT_ESTIMATE = 80; // generous estimate
    const GAP = 8;

    let top;
    let flipBelow = false;

    // Default: above the chip
    top = rect.top - TOOLTIP_HEIGHT_ESTIMATE - GAP;

    // If it would go off the top of the viewport, flip to below
    if (top < 0) {
      top = rect.bottom + GAP;
      flipBelow = true;
    }

    // Horizontal: centre on chip, clamp to viewport
    let left = chipCenterX - TOOLTIP_WIDTH / 2;
    if (left + TOOLTIP_WIDTH > window.innerWidth - 8) {
      left = window.innerWidth - TOOLTIP_WIDTH - 8;
    }
    if (left < 8) left = 8;

    setStyle({ opacity: 1, top, left, flipBelow });
  }, [chipRef]);

  return ReactDOM.createPortal(
    <div
      style={{
        position: 'fixed',
        top: style.top,
        left: style.left,
        zIndex: 99999,
        background: '#1E2035',
        color: '#fff',
        fontSize: 13,
        padding: 12,
        borderRadius: 8,
        width: TOOLTIP_WIDTH,
        maxWidth: TOOLTIP_WIDTH,
        boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
        whiteSpace: 'normal',
        pointerEvents: 'none',
        lineHeight: 1.5,
        opacity: style.opacity,
      }}
    >
      {text}
      {/* Arrow */}
      <div style={{
        position: 'absolute',
        ...(style.flipBelow
          ? { bottom: '100%', borderBottom: '6px solid #1E2035', borderTop: 'none' }
          : { top: '100%', borderTop: '6px solid #1E2035', borderBottom: 'none' }),
        left: '50%',
        transform: 'translateX(-50%)',
        width: 0,
        height: 0,
        borderLeft: '6px solid transparent',
        borderRight: '6px solid transparent',
      }} />
    </div>,
    document.body
  );
}

export default function HealthScoreChip({ scoreKey, label, value, onSave, readonly = false }) {
  const [showTooltip, setShowTooltip] = useState(false);
  const [editing, setEditing] = useState(false);
  const tooltipTimer = useRef(null);
  const chipRef = useRef(null);
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
        ref={chipRef}
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

      {/* Tooltip — portalled to body, fixed position */}
      {showTooltip && !editing && TOOLTIP_TEXT[scoreKey] && (
        <Tooltip chipRef={chipRef} text={TOOLTIP_TEXT[scoreKey]} />
      )}
    </div>
  );
}