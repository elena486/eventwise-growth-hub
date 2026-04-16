import React from 'react';

export default function ConfirmDialog({ message, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full" style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.12)' }}>
        <p className="text-sm text-[#374151] leading-relaxed mb-6">{message || 'Are you sure you want to delete this? This cannot be undone.'}</p>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="px-5 py-2 text-sm font-medium text-[#374151] bg-white border border-[#E5E7EB] rounded-lg hover:bg-[#F9FAFB] transition-colors" style={{ borderWidth: '1.5px' }}>Cancel</button>
          <button onClick={onConfirm} className="px-5 py-2 text-sm font-semibold text-white bg-[#EF4444] rounded-lg hover:bg-[#DC2626] transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}