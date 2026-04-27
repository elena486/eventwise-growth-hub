import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Plus, SlidersHorizontal, ChevronDown, BarChart2 } from 'lucide-react';

const STATS_COLLAPSED_KEY = 'pipeline_stats_collapsed_v1';
import { Button } from '@/components/ui/button';

import StatsRow from '@/components/pipeline/StatsRow';
import LeadTable from '@/components/pipeline/LeadTable';
import LeadDetailPanel from '@/components/pipeline/LeadDetailPanel';
import ClosedWonModal from '@/components/pipeline/ClosedWonModal';

const OWNER_FILTERS = ['All Leads', "Chris's Leads", "Ramesh's Leads", "George's Leads", 'Lost Leads'];
const OWNER_MAP = {
  "Chris's Leads": 'Chris',
  "Ramesh's Leads": 'Ramesh',
  "George's Leads": 'George',
};

const PROB_OPTIONS = [
  { label: 'All', value: 0 },
  { label: '25%+', value: 25 },
  { label: '50%+', value: 50 },
  { label: '75%+', value: 75 },
];

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function getMonthOptions() {
  const opts = [{ label: 'Any month', value: '' }];
  const now = new Date();
  for (let i = 0; i < 18; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
    opts.push({ label, value: val });
  }
  return opts;
}

export default function Pipeline({ onProposalHandoff, onViewDeals }) {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stageFilter, setStageFilter] = useState(null);
  const [ownerFilter, setOwnerFilter] = useState('All Leads');
  const [probFilter, setProbFilter] = useState(0);
  const [monthFilter, setMonthFilter] = useState('');
  const [closedWonLead, setClosedWonLead] = useState(null);
  const [newLeadId, setNewLeadId] = useState(null);
  const [selectedLead, setSelectedLead] = useState(null);
  const [showConverted, setShowConverted] = useState(false);
  const [showMonthPicker, setShowMonthPicker] = useState(false);
  const [statsCollapsed, setStatsCollapsed] = useState(() => {
    try { return localStorage.getItem(STATS_COLLAPSED_KEY) === 'true'; } catch { return false; }
  });
  const monthPickerRef = useRef(null);

  const toggleStats = () => {
    setStatsCollapsed(v => {
      const next = !v;
      try { localStorage.setItem(STATS_COLLAPSED_KEY, String(next)); } catch {}
      return next;
    });
  };

  useEffect(() => {
    base44.entities.Lead.list('-created_date').then(data => {
      setLeads(data);
      setLoading(false);
    });
  }, []);

  // Listen for undo restore events
  useEffect(() => {
    const handler = () => refresh();
    window.addEventListener('pipeline-refresh', handler);
    return () => window.removeEventListener('pipeline-refresh', handler);
  }, []);

  // Close month picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (monthPickerRef.current && !monthPickerRef.current.contains(e.target)) setShowMonthPicker(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const refresh = async () => {
    const data = await base44.entities.Lead.list('-created_date');
    setLeads(data);
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

  const handleMarkLost = async (id, lostReason) => {
    const now = new Date().toISOString();
    setLeads(prev => prev.map(l => l.id === id ? { ...l, stage: 'Closed Lost', lostReason, lastActivity: now } : l));
    if (selectedLead?.id === id) setSelectedLead(prev => ({ ...prev, stage: 'Closed Lost', lostReason }));
    await base44.entities.Lead.update(id, { stage: 'Closed Lost', lostReason, lastActivity: now });
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

  const handleRowClick = (lead) => setSelectedLead(lead);

  const handleClosedWon = (lead) => {
    setSelectedLead(null);
    setClosedWonLead(lead);
  };

  const handleHandoverConverted = async () => {
    setClosedWonLead(null);
    await refresh();
  };

  const isLostView = ownerFilter === 'Lost Leads';

  // Build display leads
  const activeLeads = leads.filter(l => !l.converted && l.stage !== 'Closed Lost');
  const lostLeads = leads.filter(l => l.stage === 'Closed Lost');
  const convertedLeads = leads.filter(l => l.converted);

  let baseLeads = isLostView ? lostLeads : activeLeads;

  // Owner filter (only for non-lost view)
  if (!isLostView && ownerFilter !== 'All Leads') {
    baseLeads = baseLeads.filter(l => l.leadOwner === OWNER_MAP[ownerFilter]);
  }

  // Stats are based on owner-filtered active leads before prob/month filters
  const statsLeads = baseLeads;

  // Probability filter
  if (probFilter > 0) baseLeads = baseLeads.filter(l => (l.probability || 0) >= probFilter);

  // Month filter
  if (monthFilter) baseLeads = baseLeads.filter(l => l.expectedCloseMonth === monthFilter);

  // Stage filter
  const displayLeads = stageFilter ? baseLeads.filter(l => l.stage === stageFilter) : baseLeads;

  // Stats leads (apply prob + month but not stage filter)
  const filteredStatsLeads = statsLeads
    .filter(l => probFilter === 0 || (l.probability || 0) >= probFilter)
    .filter(l => !monthFilter || l.expectedCloseMonth === monthFilter);

  const selectedMonthLabel = getMonthOptions().find(o => o.value === monthFilter)?.label || 'Any month';

  return (
    <div className="flex flex-1 overflow-hidden">
      {/* Main pipeline area */}
      <div className={`flex flex-col overflow-y-auto transition-all duration-300 ${selectedLead ? 'w-[40%]' : 'w-full'} bg-ew-bg p-8`}>
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h1 className="text-2xl font-bold text-navy">{isLostView ? 'Lost Leads' : 'Warm Leads'}</h1>
            <p className="text-ew-muted text-sm mt-0.5">{isLostView ? 'All closed lost leads' : 'Your active pipeline — updated as you go'}</p>
          </div>
          {!isLostView && (
            <Button onClick={handleAddLead} className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm">
              <Plus className="w-4 h-4 mr-1.5" />Add Lead
            </Button>
          )}
        </div>

        {/* Owner filter bar + toggle */}
        <div className="flex items-center gap-1.5 mb-4 flex-wrap">
          {OWNER_FILTERS.map(f => (
            <button
              key={f}
              onClick={() => { setOwnerFilter(f); setStageFilter(null); }}
              className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors border ${
                ownerFilter === f
                  ? f === 'Lost Leads' ? 'bg-red-600 text-white border-red-600' : 'bg-navy text-white border-navy'
                  : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
              }`}
            >
              {f}
            </button>
          ))}
          {!isLostView && (
            <>
              <span className="w-px h-5 bg-ew-border mx-1" />
              <button
                onClick={toggleStats}
                className={`flex items-center gap-1.5 px-3 py-2 text-sm font-medium rounded-lg transition-colors border ${
                  statsCollapsed ? 'bg-white border-ew-border text-ew-muted hover:bg-ew-bg' : 'bg-[#8403C5] text-white border-[#8403C5]'
                }`}
              >
                <BarChart2 className="w-3.5 h-3.5" />
                {statsCollapsed ? 'Show filters' : 'Hide filters'}
              </button>
            </>
          )}
        </div>

        {!statsCollapsed && !isLostView && (
          <>
            {/* Probability + Month filters */}
            <div className="flex items-center gap-2 mb-5 flex-wrap">
              <SlidersHorizontal className="w-3.5 h-3.5 text-ew-muted" />
              <span className="text-xs text-ew-muted font-medium">Probability:</span>
              {PROB_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => setProbFilter(opt.value)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                    probFilter === opt.value ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <span className="w-px h-4 bg-ew-border mx-1" />
              <span className="text-xs text-ew-muted font-medium">Expected close:</span>
              <div className="relative" ref={monthPickerRef}>
                <button
                  onClick={() => setShowMonthPicker(v => !v)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors border ${
                    monthFilter ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white border-ew-border text-ew-body hover:bg-ew-bg'
                  }`}
                >
                  {selectedMonthLabel}
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showMonthPicker && (
                  <div className="absolute top-full left-0 mt-1 bg-white border border-ew-border rounded-xl shadow-lg z-20 py-1 max-h-48 overflow-y-auto min-w-[140px]">
                    {getMonthOptions().map(opt => (
                      <button
                        key={opt.value}
                        onClick={() => { setMonthFilter(opt.value); setShowMonthPicker(false); }}
                        className={`w-full text-left px-3 py-1.5 text-sm hover:bg-ew-bg transition-colors ${monthFilter === opt.value ? 'text-[#8403C5] font-semibold' : 'text-ew-body'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {(probFilter > 0 || monthFilter) && (
                <button onClick={() => { setProbFilter(0); setMonthFilter(''); }} className="text-xs text-ew-muted hover:text-navy underline">Clear filters</button>
              )}
            </div>

            {/* Stats */}
            <StatsRow leads={filteredStatsLeads} stageFilter={stageFilter} onStageFilter={setStageFilter} panelOpen={!!selectedLead} collapsed={false} />
          </>
        )}

        {/* Stage filter indicator */}
        {stageFilter && (
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm text-ew-body">Filtered: <strong>{stageFilter}</strong></span>
            <button onClick={() => setStageFilter(null)} className="text-xs text-ew-muted hover:text-navy underline">Clear</button>
          </div>
        )}

        {/* Table */}
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" />
          </div>
        ) : displayLeads.length === 0 ? (
          <div className="bg-white border border-ew-border rounded-xl flex flex-col items-center justify-center py-20">
            <span className="text-3xl mb-3">{isLostView ? '❌' : '🎯'}</span>
            <h3 className="text-base font-semibold text-navy mb-1">{isLostView ? 'No lost leads' : 'No warm leads yet'}</h3>
            <p className="text-ew-muted text-sm">{isLostView ? 'No leads marked as Closed Lost.' : 'Add your first lead to start tracking your pipeline.'}</p>
            {!isLostView && (
              <Button onClick={handleAddLead} className="h-9 bg-navy hover:bg-navy/90 text-white font-semibold text-sm mt-5">
                <Plus className="w-4 h-4 mr-1.5" />Add your first lead
              </Button>
            )}
          </div>
        ) : (
          <LeadTable
            leads={displayLeads}
            showOwnerSections={ownerFilter === 'All Leads'}
            onDelete={handleDelete}
            onProposal={handleProposal}
            onUpdateField={handleUpdateField}
            onMarkLost={handleMarkLost}
            newLeadId={newLeadId}
            onRowClick={handleRowClick}
            selectedLeadId={selectedLead?.id}
            isLostView={isLostView}
          />
        )}

        {/* Converted leads toggle */}
        {!isLostView && convertedLeads.length > 0 && (
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

      {/* Closed Won Modal */}
      {closedWonLead && (
        <ClosedWonModal
          lead={closedWonLead}
          onClose={() => setClosedWonLead(null)}
          onConverted={handleHandoverConverted}
        />
      )}
    </div>
  );
}