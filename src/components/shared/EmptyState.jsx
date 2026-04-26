import React from 'react';

/**
 * Reusable empty state component.
 * Props: icon (emoji string), message (string), action ({ label, onClick })
 */
export default function EmptyState({ icon, message, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      {icon && <div className="text-4xl mb-3 opacity-60">{icon}</div>}
      <p className="text-sm text-[#6B7280] max-w-xs leading-relaxed">{message}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 flex items-center gap-1.5 px-4 py-2 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6d02a3] transition-colors"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}