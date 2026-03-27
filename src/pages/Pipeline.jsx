import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

import StatsRow from '@/components/pipeline/StatsRow';
import LeadTable from '@/components/pipeline/LeadTable';
import ClosedWonModal from '@/components/pipeline/ClosedWonModal';

export default function Pipeline({ onProposalHandoff, onViewDeals }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState(null);
  const [closedWonLead, setClosedWonLead] = useState(null);
  const [newLeadId, setNewLeadId] = useState(null);

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

  const handleAddLead = async () => {
    const now = new Date().toISOString();
    const newLead = await base44.entities.Lead.create({ companyName: '', stage: 'Contacted', lastActivity: now });
    setLeads(prev => [newLead, ...prev]);
    setNewLeadId(newLead.id);
  };

  const handleDelete = async (id) => {
    await base44.entities.Lead.delete(id);
    refresh();
  };

  const handleUpdateField = async (id, field, value) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value, lastActivity: now } : l));
    await base44.entities.Lead.update(id, { [field]: value, lastActivity: now });
    if (field === 'stage' && value === 'Closed Won') {
      const lead = leads.find(l => l.id === id);
      if (lead && !lead.converted) setClosedWonLead({ ...lead, stage: 'Closed Won' });
    }
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
          onClick={handleAddLead}
          className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
        >
          <Plus className="w-4 h-4 mr-1.5" />
          Add Lead
        </Button>
      </div>

      {/* Stats */}
      <StatsRow leads={leads} stageFilter={stageFilter} onStageFilter={setStageFilter} />

      {/* Table or empty state */}
      {loading ? (
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
        <>
          {stageFilter && (
            <div className="mb-3 flex items-center gap-2">
              <span className="text-sm text-ew-body">Filtered by: <strong>{stageFilter}</strong></span>
              <button onClick={() => setStageFilter(null)} className="text-xs text-ew-muted hover:text-navy underline transition-colors">Clear filter</button>
            </div>
          )}
          <LeadTable
            leads={(stageFilter ? leads.filter(l => l.stage === stageFilter) : leads).filter(l => !l.converted)}
            onDelete={handleDelete}
            onProposal={handleProposal}
            onUpdateField={handleUpdateField}
            newLeadId={newLeadId}
          />
          {/* Converted leads section */}
          {leads.filter(l => l.converted).length > 0 && (
            <div className="mt-8">
              <h3 className="text-xs font-semibold text-ew-muted uppercase tracking-[0.15em] mb-3">Converted</h3>
              <div className="bg-white border border-ew-border rounded-xl overflow-hidden opacity-60">
                <table className="w-full text-sm">
                  <tbody>
                    {leads.filter(l => l.converted).map(lead => (
                      <tr key={lead.id} className="border-b border-ew-border last:border-0">
                        <td className="px-4 py-3">
                          <p className="font-semibold text-ew-body">{lead.companyName}</p>
                          <p className="text-xs text-ew-muted">{lead.contactName}</p>
                        </td>
                        <td className="px-4 py-3 text-ew-muted text-xs">Closed Won — converted to client</td>
                        <td className="px-4 py-3 text-right">
                          {lead.dealId && onViewDeals && (
                            <button
                              onClick={onViewDeals}
                              className="flex items-center gap-1 text-xs font-medium text-navy hover:underline ml-auto"
                            >
                              View deal <ArrowRight className="w-3 h-3" />
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}

      {closedWonLead && (
        <ClosedWonModal
          lead={closedWonLead}
          onClose={() => setClosedWonLead(null)}
          onConverted={() => { setClosedWonLead(null); refresh(); }}
        />
      )}


    </div>
  );
}