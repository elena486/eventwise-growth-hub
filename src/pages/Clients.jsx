import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isPast, differenceInDays } from 'date-fns';
import { Plus, AlertTriangle } from 'lucide-react';
import ClientModal from '@/components/clients/ClientModal';
import InlineCell from '@/components/shared/InlineCell';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS, initTasks } from '@/lib/csData';

const STATUS_ORDER = ['Live', 'Onboarding', 'Trial', 'Churn'];
const STATUSES = ['Trial', 'Onboarding', 'Live', 'Churn'];
const OWNERS = ['Chris Carter', 'Martinique Keeler'];
const SECONDARY_OWNERS = ['Chris Carter', 'Martinique Keeler', 'None'];

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
  const [showAddModal, setShowAddModal] = useState(false);

  const load = async () => {
    const data = await base44.entities.Client.list('-created_date');
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const handleUpdateField = async (id, field, value) => {
    setClients(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c));
    await base44.entities.Client.update(id, { [field]: value });
    // If moved to Onboarding, create checklist if not exists
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
      const si = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (si !== 0) return si;
      return (a.healthScore || 0) - (b.healthScore || 0);
    })
    .filter(c => filter === 'All' || c.status === filter);

  const stats = {
    total: clients.length,
    live: clients.filter(c => c.status === 'Live').length,
    onboarding: clients.filter(c => c.status === 'Onboarding').length,
    trial: clients.filter(c => c.status === 'Trial').length,
  };

  const save = (id, field) => (value) => handleUpdateField(id, field, value);

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="text-ew-muted text-sm mt-0.5">All Eventwise customer accounts</p>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">
          <Plus className="w-4 h-4" /> Add Client
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total clients', value: stats.total },
          { label: 'Live', value: stats.live },
          { label: 'In onboarding', value: stats.onboarding },
          { label: 'In trial', value: stats.trial },
        ].map(c => (
          <div key={c.label} className="bg-white border border-ew-border rounded-xl p-5">
            <p className="text-xs font-medium text-ew-muted uppercase tracking-[0.12em] mb-1">{c.label}</p>
            <p className="text-2xl font-bold text-navy">{c.value}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-1.5 mb-5">
        {['All', 'Live', 'Onboarding', 'Trial', 'Churn'].map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === f ? 'bg-navy text-white' : 'bg-white border border-ew-border text-ew-body hover:bg-ew-bg'}`}>
            {f}
          </button>
        ))}
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center h-48"><div className="w-6 h-6 border-2 border-navy/20 border-t-navy rounded-full animate-spin" /></div>
      ) : (
        <div className="bg-white border border-ew-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-ew-footer border-b border-ew-border">
              <tr>
                {['Client', 'Status', 'Plan', 'Owner', 'Health', 'Renewal', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id} className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                  {/* Client name / contact */}
                  <td className="px-4 py-3 min-w-[180px]">
                    <InlineCell value={c.name} onSave={save(c.id, 'name')} placeholder="Company name" className="font-semibold text-navy text-sm" />
                    <InlineCell value={c.contactName} onSave={save(c.id, 'contactName')} placeholder="Contact name" className="text-xs text-ew-muted mt-0.5" />
                    <InlineCell value={c.contactEmail} onSave={save(c.id, 'contactEmail')} placeholder="Email" className="text-xs text-ew-muted mt-0.5" />
                    {c.handoffIncomplete && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⚠ Handoff incomplete
                      </span>
                    )}
                  </td>

                  {/* Status */}
                  <td className="px-4 py-3">
                    <InlineCell
                      value={c.status}
                      onSave={save(c.id, 'status')}
                      type="select"
                      options={STATUSES}
                      displayEl={<span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>}
                    />
                  </td>

                  {/* Plan */}
                  <td className="px-4 py-3">
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
                  <td className="px-4 py-3">
                    <InlineCell
                      value={c.owner}
                      onSave={save(c.id, 'owner')}
                      type="select"
                      options={OWNERS}
                      displayEl={<OwnerAvatar owner={c.owner} />}
                    />
                  </td>

                  {/* Health — read-only display */}
                  <td className="px-4 py-3 min-w-[100px]">
                    <HealthCell client={c} />
                  </td>

                  {/* Renewal date */}
                  <td className="px-4 py-3 min-w-[130px]">
                    <InlineCell
                      value={c.renewalDate || ''}
                      onSave={save(c.id, 'renewalDate')}
                      type="date"
                      displayEl={<RenewalCell date={c.renewalDate} />}
                      placeholder="Set date"
                    />
                  </td>

                  {/* Notes */}
                  <td className="px-4 py-3 max-w-[180px]">
                    <InlineCell
                      value={c.notes}
                      onSave={save(c.id, 'notes')}
                      type="textarea"
                      placeholder="Add notes…"
                      displayEl={c.notes ? <p className="text-sm text-ew-body truncate max-w-[160px]" title={c.notes}>{c.notes}</p> : null}
                    />
                  </td>

                  {/* Actions */}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 flex-wrap">
                      {(c.status === 'Live' || c.status === 'Onboarding') && (
                        <button onClick={() => onViewHealth(c)} className="text-xs px-2.5 py-1.5 font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">Health</button>
                      )}
                      {c.status === 'Onboarding' && (
                        <button onClick={() => onViewOnboarding(c)} className="text-xs px-2.5 py-1.5 font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">Onboarding</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-ew-muted text-sm">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAddModal && (
        <ClientModal client={null} onSave={handleAddClient} onClose={() => setShowAddModal(false)} />
      )}
    </div>
  );
}