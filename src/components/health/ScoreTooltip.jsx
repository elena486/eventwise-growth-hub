import React, { useRef, useState } from 'react';

const SCORE_TOOLTIPS = {
  emails: {
    name: 'Emails — Communication quality',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Slow replies, chasing constantly, unclear comms' },
      { score: 3, stars: '★★★☆☆', text: 'Generally responsive, occasional delays' },
      { score: 5, stars: '★★★★★', text: 'Fast, clear, proactive — no chasing needed' },
    ],
  },
  meetings: {
    name: 'Meetings — Engagement in calls',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Missed meetings, passive, no decisions made' },
      { score: 3, stars: '★★★☆☆', text: 'Attends, some engagement, occasional decisions' },
      { score: 5, stars: '★★★★★', text: 'Fully engaged, decisions made, actions followed up' },
    ],
  },
  goals: {
    name: 'Goals — Alignment on objectives',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'No clear direction, shifting priorities, misaligned' },
      { score: 3, stars: '★★★☆☆', text: 'Some clarity but occasional confusion' },
      { score: 5, stars: '★★★★★', text: 'Crystal clear goals, aligned on success metrics' },
    ],
  },
  adoption: {
    name: 'Adoption — Platform usage',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Not using the platform, fully dependent on team' },
      { score: 3, stars: '★★★☆☆', text: 'Using some features, not getting full value' },
      { score: 5, stars: '★★★★★', text: 'Fully self-sufficient, using all relevant features' },
    ],
  },
  knowledge: {
    name: 'Knowledge — Understanding of platform',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Repeated basic questions, confused, misusing platform' },
      { score: 3, stars: '★★★☆☆', text: 'Understands basics, occasional questions' },
      { score: 5, stars: '★★★★★', text: 'Confident, rarely needs support, trains own team' },
    ],
  },
  cx: {
    name: 'CX — Relationship quality',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Frustrated, cold tone, active complaints, at risk' },
      { score: 3, stars: '★★★☆☆', text: 'Neutral, professional but not enthusiastic' },
      { score: 5, stars: '★★★★★', text: 'Strong positive relationship, internal advocate' },
    ],
  },
  issues: {
    name: 'Issues — Problem resolution',
    levels: [
      { score: 1, stars: '★☆☆☆☆', text: 'Active unresolved blockers, recurring complaints' },
      { score: 3, stars: '★★★☆☆', text: 'Some issues present but being worked through' },
      { score: 5, stars: '★★★★★', text: 'No blockers, issues resolved quickly' },
    ],
  },
};

export default function ScoreTooltip({ scoreKey, children }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);
  const info = SCORE_TOOLTIPS[scoreKey];

  if (!info) return children;

  const show = () => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), 300);
  };

  const hide = () => {
    clearTimeout(timerRef.current);
    setVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div
          className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-[9999] pointer-events-none"
          style={{ width: 260 }}
        >
          <div className="rounded-xl shadow-2xl p-3" style={{ background: '#1E2035', color: '#fff' }}>
            <p className="text-[12px] font-bold mb-2 leading-snug">{info.name}</p>
            <div className="space-y-1.5">
              {info.levels.map(l => (
                <div key={l.score} className="flex gap-2 items-start">
                  <span className="text-[11px] shrink-0 leading-snug" style={{ color: l.score === 5 ? '#86EFAC' : l.score === 3 ? '#FDE68A' : '#FCA5A5' }}>
                    {l.stars}
                  </span>
                  <span className="text-[11px] opacity-85 leading-snug">{l.text}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="flex justify-center">
            <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1E2035' }} />
          </div>
        </div>
      )}
    </div>
  );
}