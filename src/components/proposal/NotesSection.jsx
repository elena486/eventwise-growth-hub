import React from 'react';

export default function NotesSection({ notes }) {
  if (!notes || !notes.trim()) return null;

  return (
    <div className="px-10 py-10 border-t border-ew-border">
      <p className="text-[11px] font-semibold text-green uppercase tracking-[0.2em] mb-2">Additional notes</p>
      <h2 className="text-2xl font-bold text-navy mb-5">Notes from Chris</h2>
      <p className="text-ew-body text-sm leading-relaxed whitespace-pre-wrap">{notes}</p>
    </div>
  );
}