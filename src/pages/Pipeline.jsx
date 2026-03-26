import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { format } from 'date-fns';
import StatsRow from '@/components/pipeline/StatsRow';
import LeadTable from '@/components/pipeline/LeadTable';
import LeadModal from '@/components/pipeline/LeadModal';
import NotesModal from '@/components/pipeline/NotesModal';

export default function Pipeline({ onProposalHandoff }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  useEffect(() => {
    base44.entities.Lead.list('-created_date').then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const data = await base44.entities.Lead.list('-created_date');
    setLeads(data);
  };

  const handleSave = async (formData) => {
    if (modal.type === 'edit') {
      await base44.entities.Lead.update(modal.lead.id, formData);
    } else {
      await base44.entities.Lead.create(formData);
    }
    setModal(null);
    refresh();
  };

  const handleDelete = async (id) => {
    await base44.entities.Lead.delete(id);
    refresh();
  };

  const handleUpdateField = async (id, field, value) => {
    await base44.entities.Lead.update(id, { [field]: value, lastActivity: format(new Date(), 'yyyy-MM-dd') });
    refresh();
  };

  const handleSaveNotes = async (notes) => {
    await base44.entities.Lead.update(modal.lead.id, { notes });
    setModal(null);
    refresh();
  };

  const handleProposal = (lead) => {
    onProposalHandoff({
      companyName: lead.companyName,
      contactName: lead.contactName || '',
      plan: lead.plan?.toLowerCase() || 'starter',
      leadId: lead.id,
    });
  };

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Warm Leads</h1>
          <p className="text-ew-muted text-sm mt-0.5">Your active pipeline — updated as you go</p>
        </div>
        <Button
          onClick={() => setModal({ type: 'add' })}
          className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <StatsRow leads={leads} />

      {/* Table or empty state */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : leads.length === 0 ? (
        <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-ew-bg flex items-center justify-center mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-base font-semibold text-navy mb-1">No warm leads yet</h3>
          <p className="text-ew-muted text-sm mb-5">Add your first lead to start tracking your pipeline.</p>
          <Button
            onClick={() => setModal({ type: 'add' })}
            className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add your first lead
          </Button>
        </div>
      ) : (
        <LeadTable
          leads={leads}
          onEdit={lead => setModal({ type: 'edit', lead })}
          onDelete={handleDelete}
          onProposal={handleProposal}
          onUpdateField={handleUpdateField}
          onOpenNotes={lead => setModal({ type: 'notes', lead })}
        />
      )}

      {/* Modals */}
      {(modal?.type === 'add' || modal?.type === 'edit') && (
        <LeadModal
          lead={modal.type === 'edit' ? modal.lead : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
      {modal?.type === 'notes' && (
        <NotesModal
          lead={modal.lead}
          onSave={handleSaveNotes}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}