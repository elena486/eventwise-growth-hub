import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

import StatsRow from '@/components/pipeline/StatsRow';
import LeadTable from '@/components/pipeline/LeadTable';
import HandoverModal from '@/components/pipeline/HandoverModal';
import LeadDetailPanel from '@/components/pipeline/LeadDetailPanel';

const OWNER_FILTERS = ['All Leads', "Chris's Leads", "Ramesh's Leads", "George's Leads"];
const OWNER_MAP = {
  "Chris's Leads": 'Chris',
  "Ramesh's Leads": 'Ramesh',
  "George's Leads": 'George',
};

export default function Pipeline({ onProposalHandoff, onViewDeals }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState('All Leads');
  const [closedWonLead, setClosedWonLead] = useState(null);
  const [newLeadId, setNewLeadId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showConverted, setShowConverted] = useState(false);

  useEffect(() => {
    base44.entities.Lead.list('-created_date').then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  const refresh = async () => {
    const data = await base44.entities.Lead.list('-created_date');
    setLeads(data);
    // Keep selectedLead in sync
    if (selectedLead) {
      const updated = data.find(l => l.id === selectedLead.id);
      if (updated) setSelectedLead(updated);
    }
    return data;
  };

  const handleAddLead = async () => {
    const now = new Date().toISOString();
    const newLead = await base44.entities.Lead.create({ companyName: '', stage: 'Contacted', lastActivity: now });
    setLeads(prev => [newLead, ...prev]);
    setNewLeadId(newLead.id);
  };

  const handleDelete = async (id) => {
    await base44.entities.Lead.delete(id);
    if (selectedLead?.id === id) setSelectedLead(null);
    refresh();
  };

  const handleUpdateField = async (id, field, value) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, [field]: value, lastActivity: now } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, [field]: value, lastActivity: now }));
    await base44.entities.Lead.update(id, { [field]: value, lastActivity: now });
    if (field === 'stage' && value === 'Closed Won') {
      const lead = leads.find(l => l.id === id);
      if (lead && !lead.converted) setClosedWonLead({ ...lead, stage: 'Closed Won' });
    }
    refresh();
  };

  const handleLeadUpdate = (updated) => {
    setLeads(prev => prev.map(l => l.id === updated.id ? updated : l));
    setSelectedLead(updated);
  };

  const handleProposal = (lead) => {
    onProposalHandoff({
      companyName: lead.companyName,
      contactName: lead.contactName || '',
      plan: lead.plan?.toLowerCase() || 'starter',
      leadId: lead.id,
    });
  };

  const handleRowClick = (lead) => {
    setSelectedLead(lead);
  };

  const handleClosedWon = (lead) => {
    setSelectedLead(null); // close panel first
    setClosedWonLead(lead);
  };

  const handleHandoverConverted = async (clientId) => {
    setClosedWonLead(null);
    await refresh();
    // Navigate to clients tab if clientId provided
    if (clientId) {
      // no-op for now — user can navigate manually
    }
  };

  // Split active vs converted
  const activeLeads = leads.filter(l => !l.converted);
  const convertedLeads = leads.filter(l => l.converted);

  const ownerFiltered = ownerFilter === 'All Leads'
    ? activeLeads
    : activeLeads.filter(l => l.leadOwner === OWNER_MAP[ownerFilter]);

  const displayLeads = stageFilter
    ? ownerFiltered.filter(l => l.stage === stageFilter)
    : ownerFiltered;

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main pipeline area */}
      <div className={`flex flex-col overflow-y-auto transition-all duration-300 ${selectedLead ? 'w-[40%]' : 'w-full'} bg-ew-bg p-8`}>
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

        {/* Stats */}
        <StatsRow leads={ownerFiltered} stageFilter={stageFilter} onStageFilter={setStageFilter} />

        {/* Stage filter indicator */}
        {stageFilter && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-ew-body">Filtered: <strong>{stageFilter}</strong></span>
            <button onClick={() => setStageFilter(null)} className="text-xs text-ew-muted hover:text-navy underline">Clear</button>
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
            <Button onClick={handleAddLead} className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm">
              <Plus className="w-4 h-4 mr-1.5" />Add your first lead
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
            onRowClick={handleRowClick}
            selectedLeadId={selectedLead?.id}
          />
        )}

        {/* Converted leads toggle */}
        {convertedLeads.length > 0 && (
          <div className="mt-6">
            <button
              onClick={() => setShowConverted(v => !v)}
              className="flex items-center gap-2 text-sm text-ew-muted hover:text-navy transition-colors"
            >
              <span className={`transition-transform ${showConverted ? 'rotate-180' : ''}`}>▼</span>
              {showConverted ? 'Hide' : 'Show'} converted leads ({convertedLeads.length})
            </button>
            {showConverted && (
              <div className="mt-3 bg-white border border-ew-border rounded-xl overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-ew-footer border-b border-ew-border">
                    <tr>
                      {['Company', 'Contact', 'Plan', 'Stage', 'Converted'].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {convertedLeads.map(lead => (
                      <tr key={lead.id}
                        className="border-b border-ew-border last:border-0 hover:bg-navy/[0.02] cursor-pointer transition-colors"
                        onClick={() => setSelectedLead(lead)}
                      >
                        <td className="px-4 py-3 font-semibold text-navy">{lead.companyName}</td>
                        <td className="px-4 py-3 text-ew-muted">{lead.contactName || '—'}</td>
                        <td className="px-4 py-3 text-ew-muted">{lead.plan || '—'}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700">Converted</span>
                        </td>
                        <td className="px-4 py-3 text-ew-muted text-xs">{lead.convertedDate || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedLead && (
        <div className="w-[60%] border-l border-ew-border overflow-hidden flex flex-col">
          <LeadDetailPanel
            lead={selectedLead}
            onClose={() => setSelectedLead(null)}
            onUpdate={handleLeadUpdate}
            onDelete={handleDelete}
            onClosedWon={handleClosedWon}
          />
        </div>
      )}

      {/* Handover Modal */}
      {closedWonLead && (
        <HandoverModal
          lead={closedWonLead}
          onClose={() => setClosedWonLead(null)}
          onConverted={handleHandoverConverted}
        />
      )}
    </div>
  );
}