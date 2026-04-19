import React, { useState } from 'react';
import { X } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function DeclineModal({ record, onClose, onDeclined }) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  const handleDecline = async () => {
    setSaving(true);
    await base44.entities.TimeOffRecord.update(record.id, { status: 'Declined', declineReason: reason });
    onDeclined({ ...record, status: 'Declined', declineReason: reason });
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-bold text-navy">Decline request</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-ew-bg text-ew-muted"><X className="w-4 h-4" /></button>
        </div>
        <p className="text-sm text-ew-body mb-3">Declining time off for <strong>{record.teamMember}</strong>. Add an optional reason:</p>
        <textarea
          className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy/20 h-20 resize-none"
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason (optional)…"
        />
        <div className="flex justify-end gap-3 mt-4">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={handleDecline} disabled={saving}
            className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-40">
            {saving ? 'Declining…' : 'Decline request'}
          </button>
        </div>
      </div>
    </div>
  );
}