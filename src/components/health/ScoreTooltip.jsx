import React, { useState } from 'react';

const SCORE_TOOLTIPS = {
  emails: {
    name: 'Emails',
    desc: 'Communication quality',
    levels: [
      { score: 1, text: 'Slow replies, unclear comms, you are chasing constantly' },
      { score: 3, text: 'Generally responsive but occasional delays or unclear asks' },
      { score: 5, text: 'Fast, clear, proactive communication — no chasing needed' },
    ],
  },
  meetings: {
    name: 'Meetings',
    desc: 'Engagement in calls',
    levels: [
      { score: 1, text: 'Missed meetings, passive attendees, no decisions made' },
      { score: 3, text: 'Attends meetings, some engagement, occasional decisions' },
      { score: 5, text: 'Fully engaged, decisions made every meeting, actions followed up' },
    ],
  },
  goals: {
    name: 'Goals',
    desc: 'Alignment on objectives',
    levels: [
      { score: 1, text: 'No clear direction, shifting priorities, misaligned expectations' },
      { score: 3, text: 'Some clarity on goals but still occasional confusion' },
      { score: 5, text: 'Crystal clear goals, aligned on success metrics, easy to execute' },
    ],
  },
  adoption: {
    name: 'Adoption',
    desc: 'Platform usage',
    levels: [
      { score: 1, text: 'Not using the platform, relying on manual processes or you to do everything' },
      { score: 3, text: 'Using some features but not getting full value, some dependency on team' },
      { score: 5, text: 'Fully self-sufficient, using platform properly across all relevant features' },
    ],
  },
  knowledge: {
    name: 'Knowledge',
    desc: 'Understanding of the platform',
    levels: [
      { score: 1, text: 'Repeated basic questions, confused about core features, misusing the platform' },
      { score: 3, text: 'Understands the basics, occasional questions on advanced features' },
      { score: 5, text: 'Confident and capable — rarely needs support, trains their own team' },
    ],
  },
  cx: {
    name: 'CX',
    desc: 'Overall relationship quality',
    levels: [
      { score: 1, text: 'Frustrated, cold tone, active complaints, relationship at risk' },
      { score: 3, text: 'Neutral relationship, professional but not enthusiastic' },
      { score: 5, text: 'Strong positive relationship, advocates for the platform internally' },
    ],
  },
  issues: {
    name: 'Issues',
    desc: 'Problem resolution',
    levels: [
      { score: 1, text: 'Active unresolved blockers, recurring problems, complaints not addressed' },
      { score: 3, text: 'Some issues present but being worked through' },
      { score: 5, text: 'No active blockers, issues resolved quickly, client feels progress' },
    ],
  },
};

export default function ScoreTooltip({ scoreKey, children }) {
  const [visible, setVisible] = useState(false);
  const [hoverTimer, setHoverTimer] = useState(null);
  const info = SCORE_TOOLTIPS[scoreKey];

  if (!info) return children;

  const show = () => {
    const t = setTimeout(() => setVisible(true), 200);
    setHoverTimer(t);
  };

  const hide = () => {
    clearTimeout(hoverTimer);
    setVisible(false);
  };

  return (
    <div className="relative inline-flex" onMouseEnter={show} onMouseLeave={hide}>
      {children}
      {visible && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none"
          style={{ width: 260 }}>
          <div className="rounded-xl shadow-xl p-3" style={{ background: '#1E2035', color: '#fff' }}>
            <p className="text-[12px] font-bold mb-0.5">{info.name}</p>
            <p className="text-[11px] opacity-60 mb-2">{info.desc}</p>
            <div className="space-y-1.5">
              {info.levels.map(l => (
                <div key={l.score} className="flex gap-2 items-start">
                  <span className="text-[11px] font-bold w-4 shrink-0" style={{ color: l.score === 5 ? '#86EFAC' : l.score === 3 ? '#FDE68A' : '#FCA5A5' }}>{l.score}</span>
                  <span className="text-[11px] opacity-80 leading-snug">{l.text}</span>
                </div>
              ))}
            </div>
          </div>
          {/* Arrow */}
          <div className="flex justify-center">
            <div style={{ width: 0, height: 0, borderLeft: '6px solid transparent', borderRight: '6px solid transparent', borderTop: '6px solid #1E2035' }} />
          </div>
        </div>
      )}
    </div>
  );
}