import React, { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isPast, differenceInDays, isToday } from 'date-fns';
import { Plus, AlertTriangle, Sparkles, ExternalLink } from 'lucide-react';
import ClientModal from '@/components/clients/ClientModal';
import ClientDetailPanel from '@/components/clients/ClientDetailPanel';
import InlineCell from '@/components/shared/InlineCell';
import SmartAlertsPanel from '@/components/cs/SmartAlertsPanel';
import AINextActionPanel from '@/components/cs/AINextActionPanel';
import AIEmailDraftModal from '@/components/cs/AIEmailDraftModal';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS, initTasks } from '@/lib/csData';

const STATUS_ORDER = ['Live', 'Onboarding', 'Trial', 'Churn'];
const STATUSES = ['Trial', 'Onboarding', 'Live', 'Churn'];
const OWNERS = ['Chris Carter', 'Martinique Keeler'];

const TIER_OPTIONS = ['High', 'Medium', 'Low'];
const TIER_ORDER = { 'High': 0, 'Medium': 1, 'Low': 2 };
const TIER_STYLES = {
  'High': 'bg-[#FEF9C3] text-[#A16207]',
  'Medium': 'bg-[#DBEAFE] text-[#1D4ED8]',
  'Low': 'bg-[#F3F4F6] text-[#6B7280]',
};
const TIER_SHORT = {
  'High': 'High',
  'Medium': 'Medium',
  'Low': 'Low',
};

function LastContactedCell({ date, onLogToday }) {
  if (!date) {
    return (
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-ew-muted italic">Not yet contacted</span>
        <button onClick={e => { e.stopPropagation(); onLogToday(); }}
          className="text-[10px] px-1.5 py-0.5 rounded bg-navy/10 text-navy font-semibold hover:bg-navy/20 transition-colors whitespace-nowrap">Today</button>
      </div>
    );
  }
  const days = differenceInDays(new Date(), new Date(date));
  let cls = 'text-ew-body';
  if (days >= 60) cls = 'text-red-500 font-semibold';
  else if (days >= 30) cls = 'text-amber-600 font-semibold';
  const ago = days === 0 ? 'today' : `${days}d ago`;
  return (
    <div className="flex items-center gap-1.5 flex-wrap">
      <span className={`text-xs ${cls}`}>{format(new Date(date), 'd MMM yyyy')}</span>
      <span className="text-[10px] text-ew-muted">({ago})</span>
      <button onClick={e => { e.stopPropagation(); onLogToday(); }}
        className="text-[10px] px-1.5 py-0.5 rounded bg-navy/10 text-navy font-semibold hover:bg-navy/20 transition-colors whitespace-nowrap">Today</button>
    </div>
  );
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function RenewalCell({ date }) {
  if (!date) return <span className="text-ew-muted text-sm">—</span>;
  const d = new Date(date);
  const diff = differenceInDays(d, new Date());
  if (isPast(d) && diff < 0) return <span className="text-red-500 font-semibold text-xs">⚠ Overdue</span>;
  if (diff <= 60) return <span className="text-amber-600 font-semibold text-xs">{fmtDate(date)} <span className="text-amber-500">(Soon)</span></span>;
  return <span className="text-sm text-ew-body">{fmtDate(date)}</span>;
}

function OwnerAvatar({ owner }) {
  const initials = OWNER_INITIALS[owner] || owner?.[0] || '?';
  const cls = OWNER_COLORS[owner] || 'bg-gray-100 text-gray-600';
  return <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold ${cls}`}>{initials}</span>;
}

function HealthCell({ client }) {
  if (client.status === 'Trial' || client.status === 'Churn') return <span className="text-ew-muted text-sm">—</span>;
  if (!client.healthScore && client.healthScore !== 0) return <span className="text-red-500 text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No data</span>;
  if (client.healthScore === 0) return <span className="text-red-500 text-xs font-medium flex items-center gap-1"><AlertTriangle className="w-3 h-3" />No data</span>;
  const dotCls = HEALTH_DOT[client.healthRating] || 'bg-gray-400';
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${dotCls}`} />
      <span className="text-sm font-semibold text-navy">{client.healthScore}</span>
      <span className="text-xs text-ew-muted">/35</span>
    </span>
  );
}

export default function Clients({ onViewHealth, onViewOnboarding }) {
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('All');
  const [tierFilter, setTierFilter] = useState('All');
  const [showAddModal, setShowAddModal] = useState(false);
  const [detailClient, setDetailClient] = useState(null);
  const [aiPanelClient, setAiPanelClient] = useState(null);
  const [aiPanelAlert, setAiPanelAlert] = useState(null);
  const [emailModal, setEmailModal] = useState(null);
  const aiPanelRef = useRef(null);

  const load = async () => {
    const data = await base44.entities.Client.list('-created_date');
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdateField = async (id, field, value) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await base44.entities.Client.update(id, { [field]: value });
    if (field === 'status' && value === 'Onboarding') {
      const existing = await base44.entities.OnboardingRecord.filter({ clientId: id });
      if (existing.length === 0) {
        const client = clients.find(c => c.id === id);
        await base44.entities.OnboardingRecord.create({
          clientId: id,
          clientName: client?.name || '',
          tasks: JSON.stringify(initTasks()),
          lastUpdated: new Date().toISOString(),
        });
      }
    }
  };

  const handleAddClient = async (form) => {
    const newClient = await base44.entities.Client.create(form);
    if (form.status === 'Onboarding') {
      await base44.entities.OnboardingRecord.create({
        clientId: newClient.id,
        clientName: form.name,
        tasks: JSON.stringify(initTasks()),
        lastUpdated: new Date().toISOString(),
      });
    }
    setShowAddModal(false);
    load();
  };

  const sorted = [...clients]
    .sort((a, b) => {
      const ti = (TIER_ORDER[a.priorityTier] ?? 99) - (TIER_ORDER[b.priorityTier] ?? 99);
      if (ti !== 0) return ti;
      const si = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (si !== 0) return si;
      return (a.healthScore || 0) - (b.healthScore || 0);
    })
    .filter(c => filter === 'All' || c.status === filter)
    .filter(c => tierFilter === 'All' || c.priorityTier === tierFilter);

  const stats = {
    total: clients.length,
    live: clients.filter(c => c.status === 'Live').length,
    onboarding: clients.filter(c => c.status === 'Onboarding').length,
    trial: clients.filter(c => c.status === 'Trial').length,
  };

  const handleLogContactToday = async (id) => {
    const today = format(new Date(), 'yyyy-MM-dd');
    handleUpdateField(id, 'lastContacted', today);
  };

  const save = (id, field) => (value) => handleUpdateField(id, field, value);

  const handleSuggestAction = (client, alert) => {
    setAiPanelClient(client);
    setAiPanelAlert(alert || null);
  };

  const handleDraftEmail = (client, suggestion, emailType) => {
    setAiPanelClient(null);
    setEmailModal({ client, aiSuggestion: suggestion, emailType });
  };

  return (
    <div className="flex-1 bg-[#F7F7F8] overflow-y-auto p-8 font-dm">
      {/* Smart Alerts */}
      {!loading && <SmartAlertsPanel clients={clients} onSuggestAction={handleSuggestAction} />}

      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-[#111827]">Clients</h1>
          <p className="text-[#9CA3AF] text-sm mt-0.5">All Eventwise customer accounts</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 h-10 px-5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6e02a3] transition-colors">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total clients', value: stats.total, color: '#8403C5' },
          { label: 'Live', value: stats.live, color: '#15803D' },
          { label: 'In onboarding', value: stats.onboarding, color: '#1D4ED8' },
          { label: 'In trial', value: stats.trial, color: '#A16207' },
        ].map(c => (
          <div key={c.label} className="bg-white rounded-xl p-6 flex items-start gap-4" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)', borderLeft: `4px solid ${c.color}` }}>
            <div>
              <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em] mb-1">{c.label}</p>
              <p className="text-3xl font-bold text-[#111827]">{c.value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-4 flex-wrap">
        {['All', 'Live', 'Onboarding', 'Trial', 'Churn'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-2 text-sm font-medium rounded-lg transition-colors ${filter === f ? 'bg-[#242450] text-white' : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'}`} style={{ borderWidth: filter === f ? undefined : '1.5px' }}>
            {f}
          </button>
        ))}
        <span className="w-px h-5 bg-[#EBEBEB] mx-1" />
        {['All', ...TIER_OPTIONS].map(f => (
          <button key={f} onClick={() => setTierFilter(f)}
            className={`px-3.5 py-2 text-xs font-medium rounded-lg transition-colors ${tierFilter === f ? 'bg-[#242450] text-white' : 'bg-white border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB]'}`} style={{ borderWidth: tierFilter === f ? undefined : '1.5px' }}>
            {f === 'All' ? 'All Tiers' : f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.06), 0 1px 2px rgba(0,0,0,0.04)' }}>
          <table className="w-full text-sm">
            <thead className="border-b border-[#EBEBEB]">
              <tr>
                {['Client', 'Client Tier', 'Status', 'Plan', 'Owner', 'Health', 'Last Contacted', 'Renewal', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3.5 text-left text-[11px] font-bold text-[#9CA3AF] uppercase tracking-[0.08em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id} className="border-b border-[#F2F2F4] last:border-0 hover:bg-[#F9FAFB] transition-colors">
                  {/* Client name / contact */}
                  <td className="px-4 py-3 min-w-[180px]" onClick={e => e.stopPropagation()}>
                    <InlineCell value={c.name} onSave={save(c.id, 'name')} placeholder="Company name" className="font-semibold text-navy text-sm" />
                    <InlineCell value={c.contactName} onSave={save(c.id, 'contactName')} placeholder="Contact name" className="text-xs text-ew-muted mt-0.5" />
                    <InlineCell value={c.contactEmail} onSave={save(c.id, 'contactEmail')} placeholder="Email" className="text-xs text-ew-muted mt-0.5" />
                    {c.handoffIncomplete && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⚠ Handoff incomplete
                      </span>
                    )}
                  </td>

                  {/* Client Tier */}
                  <td className="px-4 py-3 min-w-[110px]" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.priorityTier}
                      onSave={save(c.id, 'priorityTier')}
                      type="select"
                      options={['', ...TIER_OPTIONS]}
                      displayEl={c.priorityTier
                        ? <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap ${TIER_STYLES[c.priorityTier]}`}>{c.priorityTier}</span>
                        : <span className="text-xs text-ew-muted">—</span>}
                    />
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.status}
                      onSave={save(c.id, 'status')}
                      type="select"
                      options={STATUSES}
                      displayEl={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>}
                    />
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.plan}
                      onSave={save(c.id, 'plan')}
                      type="select"
                      options={['', 'Starter', 'Professional', 'Business']}
                      placeholder="Set plan"
                      className="text-sm text-ew-body"
                    />
                  </td>

                  {/* Owner */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.owner}
                      onSave={save(c.id, 'owner')}
                      type="select"
                      options={OWNERS}
                      displayEl={<OwnerAvatar owner={c.owner} />}
                    />
                  </td>

                  {/* Health */}
                  <td className="px-4 py-3 min-w-[100px] cursor-pointer" onClick={() => setDetailClient(c)}>
                    <HealthCell client={c} />
                  </td>

                  {/* Last Contacted */}
                  <td className="px-4 py-3 min-w-[180px]" onClick={e => e.stopPropagation()}>
                    <div className="flex flex-col gap-0.5">
                      <InlineCell
                        value={c.lastContacted || ''}
                        onSave={save(c.id, 'lastContacted')}
                        type="date"
                        displayEl={<LastContactedCell date={c.lastContacted} onLogToday={() => handleLogContactToday(c.id)} />}
                      />
                    </div>
                  </td>

                  {/* Renewal date */}
                  <td className="px-4 py-3 min-w-[130px]" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.renewalDate || ''}
                      onSave={save(c.id, 'renewalDate')}
                      type="date"
                      displayEl={<RenewalCell date={c.renewalDate} />}
                      placeholder="Set date"
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 max-w-[180px]" onClick={e => e.stopPropagation()}>
                    <InlineCell
                      value={c.notes}
                      onSave={save(c.id, 'notes')}
                      type="textarea"
                      placeholder="Add notes…"
                      displayEl={c.notes ? <p className="text-sm text-ew-body truncate max-w-[160px]" title={c.notes}>{c.notes}</p> : null}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                    <div className="flex items-center gap-1 flex-wrap">
                      {(c.status === 'Live' || c.status === 'Onboarding') && (
                        <button onClick={() => onViewHealth(c)} className="text-xs px-2.5 py-1.5 font-medium text-[#374151] bg-white hover:bg-[#F9FAFB] rounded-lg transition-colors" style={{ border: '1.5px solid #E5E7EB' }}>Health</button>
                      )}
                      {c.status === 'Onboarding' && (
                        <button onClick={() => onViewOnboarding(c)} className="text-xs px-2.5 py-1.5 font-medium text-[#374151] bg-white hover:bg-[#F9FAFB] rounded-lg transition-colors" style={{ border: '1.5px solid #E5E7EB' }}>Onboarding</button>
                      )}
                      <div className="relative" ref={aiPanelClient?.id === c.id ? aiPanelRef : null}>
                        <button
                          onClick={() => aiPanelClient?.id === c.id ? setAiPanelClient(null) : handleSuggestAction(c, null)}
                          className="text-xs px-2.5 py-1.5 font-medium text-[#7E22CE] bg-[#F3E8FF] hover:bg-[#EDE9FE] rounded-lg transition-colors flex items-center gap-1"
                        >
                          <Sparkles className="w-3 h-3" /> AI
                        </button>
                        {aiPanelClient?.id === c.id && (
                          <AINextActionPanel
                            client={c}
                            alert={aiPanelAlert}
                            onClose={() => setAiPanelClient(null)}
                            onDraftEmail={(client, suggestion) => handleDraftEmail(client, suggestion, null)}
                          />
                        )}
                      </div>
                      <button
                        onClick={() => handleDraftEmail(c, null, null)}
                        className="text-xs px-2.5 py-1.5 font-medium text-[#6B7280] hover:text-[#111827] rounded-lg transition-colors"
                      >
                        Draft email
                      </button>
                      <button
                        onClick={() => setDetailClient(c)}
                        className="text-xs px-2.5 py-1.5 font-medium text-[#6B7280] hover:text-[#374151] bg-white hover:bg-[#F9FAFB] rounded-lg transition-colors flex items-center gap-1"
                        style={{ border: '1.5px solid #E5E7EB' }}
                        title="View details"
                      >
                        <ExternalLink className="w-3 h-3" /> View
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={10} className="px-4 py-16 text-center text-[#9CA3AF] text-sm">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <ClientModal client={null} onSave={handleAddClient} onClose={() => setShowAddModal(false)} />
      )}

      {detailClient && (
        <ClientDetailPanel
          client={detailClient}
          onClose={() => setDetailClient(null)}
          onUpdated={(updated) => {
            setClients(prev => prev.map(c => c.id === updated.id ? updated : c));
            setDetailClient(updated);
          }}
        />
      )}

      {emailModal && (
        <AIEmailDraftModal
          client={emailModal.client}
          initialEmailType={emailModal.emailType}
          aiSuggestion={emailModal.aiSuggestion}
          onClose={() => setEmailModal(null)}
          onTouchpointLogged={() => { setEmailModal(null); load(); }}
        />
      )}
    </div>
  );
}