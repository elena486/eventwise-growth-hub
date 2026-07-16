import React from 'react';
import { ArrowRightLeft } from 'lucide-react';

export default function MovePipelineModal({ lead, targetPipeline, onConfirm, onCancel }) {
  if (!lead) return null;
  const isCold = targetPipeline === 'cold';
  const targetLabel = isCold ? 'Cold' : 'Warm';
  const currentLabel = isCold ? 'Warm' : 'Cold';
  const accent = isCold ? '#5777AB' : '#E8A020';

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[200] p-4" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6 animate-modal-in" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-2.5 mb-3">
          <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg ${isCold ? 'bg-blue-50' : 'bg-orange-50'}`}>
            {isCold ? '❄️' : '🔥'}
          </div>
          <h3 className="text-base font-bold text-navy">Move to {targetLabel} Pipeline</h3>
        </div>
        <p className="text-sm text-ew-body mb-5">
          Move <span className="font-semibold text-navy">{lead.companyName || 'this lead'}</span> to the {isCold ? '❄️ Cold' : '🔥 Warm'} Pipeline? They will no longer appear in the {currentLabel} Pipeline. All data, activity log, notes, attached files and demo form responses move with them — in the same stage.
        </p>
        <div className="flex justify-end gap-3">
          <button onClick={onCancel} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg transition-colors">Cancel</button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 text-sm font-semibold text-white rounded-lg transition-colors flex items-center gap-1.5 hover:opacity-90"
            style={{ backgroundColor: accent }}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" /> Move to {targetLabel}
          </button>
        </div>
      </div>
    </div>
  );
}