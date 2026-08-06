import React from 'react';

/**
 * Read-only display of the `slack_activity_log` field on a Lead.
 * Zapier writes entries to this field (newest at top).
 * Each entry is formatted as: [Date · Time] — Author: message
 */
export default function SlackActivityLog({ value }) {
  const entries = (value || '')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean);

  return (
    <div>
      <div className="mb-1">
        <p className="text-[10px] font-bold text-ew-muted uppercase tracking-[0.18em]">Slack Activity Log</p>
        <p className="text-[11px] text-ew-muted mt-0.5">Updates posted in #pipeline-updates on Slack appear here automatically</p>
      </div>

      {entries.length === 0 ? (
        <div className="bg-[#F7F8FC] border border-dashed border-ew-border rounded-xl px-4 py-6 text-center">
          <p className="text-sm text-ew-muted italic">No Slack updates yet for this lead.</p>
        </div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
          {entries.map((entry, i) => (
            <div
              key={i}
              className={`px-4 py-3 ${i > 0 ? 'border-t border-ew-border' : ''}`}
            >
              <p className="text-sm text-ew-body whitespace-pre-wrap leading-relaxed">{entry}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}