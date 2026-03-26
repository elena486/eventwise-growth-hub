import React from 'react';
import { LOGO_BLACK } from '@/lib/proposalData';

export default function ProposalFooter({ contactName, contactEmail }) {
  const preparedFor = [contactName, contactEmail].filter(Boolean).join(' · ');

  return (
    <div className="bg-ew-footer rounded-b-xl px-10 py-6 flex items-center justify-between" style={{ printColorAdjust: 'exact', WebkitPrintColorAdjust: 'exact' }}>
      <img src={LOGO_BLACK} alt="Eventwise" className="h-6" />
      <div className="text-right">
        <p className="text-ew-muted text-xs">hello@eventwise.com</p>
        <p className="text-ew-muted text-xs">eventwise.com</p>
        {preparedFor && (
          <p className="text-ew-muted text-xs mt-1">Prepared for {preparedFor}</p>
        )}
      </div>
    </div>
  );
}