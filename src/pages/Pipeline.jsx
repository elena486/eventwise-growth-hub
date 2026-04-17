import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

import StatsRow from '@/components/pipeline/StatsRow';
import LeadTable from '@/components/pipeline/LeadTable';
import ClosedWonModal from '@/components/pipeline/ClosedWonModal';

const OWNER_FILTERS = ['All Leads', "Chris's Leads", "Ramesh's Leads", "Elena's Leads", "George's Leads"];
const OWNER_MAP = {
  "Chris's Leads": 'Chris',
  "Ramesh's Leads": 'Ramesh',
  "Elena's Leads": 'Elena',
  "George's Leads": 'George',
};

export default function Pipeline({ onProposalHandoff, onViewDeals }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState('All Leads');
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

  // Active (non-converted) leads only
  const activeLeads = leads.filter(l => !l.converted);

  // Owner-filtered leads (for stats)
  const ownerFiltered = ownerFilter === 'All Leads'
    ? activeLeads
    : activeLeads.filter(l => l.leadOwner === OWNER_MAP[ownerFilter]);

  // Stage-filtered leads (for table display)
  const displayLeads = stageFilter
    ? ownerFiltered.filter(l => l.stage === stageFilter)
    : ownerFiltered;

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
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

      {/* Owner filter bar */}
      <div className="flex items-center gap-1.5 mb-5 flex-wrap">
        {OWNER_FILTERS.map(f => (
          <button
            key={f}
            onClick={() => { setOwnerFilter(f); setStageFilter(null); }}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
              ownerFilter === f
                ? 'bg-navy text-white border-navy'
                : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Stats — driven by owner-filtered leads */}
      <StatsRow leads={ownerFiltered} stageFilter={stageFilter} onStageFilter={setStageFilter} />

      {/* Stage filter indicator */}
      {stageFilter && (
        <div className="mb-3 flex items-center gap-2">
          <span className="text-sm text-ew-body">Filtered by stage: <strong>{stageFilter}</strong></span>
          <button onClick={() => setStageFilter(null)} className="text-xs text-ew-muted hover:text-navy underline transition-colors">Clear</button>
        </div>
      )}

      {/* Table or empty state */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
        </div>
      ) : displayLeads.length === 0 ? (
        <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
          <div className="w-14 h-14 rounded-2xl bg-ew-bg flex items-center justify-center mb-4">
            <span className="text-3xl">🎯</span>
          </div>
          <h3 className="text-base font-semibold text-navy mb-1">No warm leads yet</h3>
          <p className="text-ew-muted text-sm mb-5">Add your first lead to start tracking your pipeline.</p>
          <Button
            onClick={handleAddLead}
            className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            Add your first lead
          </Button>
        </div>
      ) : (
        <LeadTable
          leads={displayLeads}
          showOwnerSections={ownerFilter === 'All Leads'}
          onDelete={handleDelete}
          onProposal={handleProposal}
          onUpdateField={handleUpdateField}
          newLeadId={newLeadId}
        />
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