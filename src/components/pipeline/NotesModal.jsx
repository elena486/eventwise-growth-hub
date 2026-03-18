import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { X } from 'lucide-react';

export default function NotesModal({ lead, onSave, onClose }) {
  const [notes, setNotes] = useState(lead.notes || '');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-ew-border">
          <div>
            <h2 className="text-base font-semibold text-navy">{lead.companyName}</h2>
            <p className="text-xs text-ew-muted">{lead.contactName}</p>
          </div>
          <button onClick={onClose} className="text-ew-muted hover:text-navy transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Add notes about this lead..."
            className="text-sm h-36 resize-none"
            autoFocus
          />
          <div className="flex gap-3">
            <Button onClick={() => onSave(notes)} className="flex-1 h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm">
              Save notes
            </Button>
            <Button variant="outline" onClick={onClose} className="flex-1 h-9 text-sm">
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}