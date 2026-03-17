import React from 'react';
import { LOGO_BLACK } from '@/lib/proposalData';

export default function ProposalFooter() {
  return (
    <div className="bg-ew-footer rounded-b-xl px-10 py-6 flex items-center justify-between" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <img src={LOGO_BLACK} alt="Eventwise" className="h-6" />
      <div className="text-right">
        <p className="text-ew-muted text-xs">hello@eventwise.com</p>
        <p className="text-ew-muted text-xs">eventwise.com</p>
      </div>
    </div>
  );
}