import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, isPast, differenceInDays } from 'date-fns';
import { Plus, AlertTriangle } from 'lucide-react';
import ClientModal from '@/components/clients/ClientModal';
import { STATUS_STYLES, HEALTH_DOT, OWNER_INITIALS, OWNER_COLORS, initTasks } from '@/lib/csData';

const STATUS_ORDER = ['Live', 'Onboarding', 'Trial', 'Churn'];

function fmtDate(d) {
  if (!d) return '—';
  try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; }
}

function RenewalCell({ date }) {
  if (!date) return <span className="text-ew-muted">—</span>;
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
  const [modal, setModal] = useState(null);
  const [expandedNotes, setExpandedNotes] = useState(null);

  const load = async () => {
    const data = await base44.entities.Client.list('-created_date');
    setClients(data);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const sorted = [...clients]
    .sort((a, b) => {
      const si = STATUS_ORDER.indexOf(a.status) - STATUS_ORDER.indexOf(b.status);
      if (si !== 0) return si;
      return (a.healthScore || 0) - (b.healthScore || 0);
    })
    .filter(c => filter === 'All' || c.status === filter);

  const handleSave = async (form) => {
    if (modal.type === 'edit') {
      await base44.entities.Client.update(modal.client.id, form);
      // If moved to Onboarding, ensure onboarding record exists
      if (form.status === 'Onboarding') {
        const existing = await base44.entities.OnboardingRecord.filter({ clientId: modal.client.id });
        if (existing.length === 0) {
          await base44.entities.OnboardingRecord.create({
            clientId: modal.client.id,
            clientName: form.name,
            tasks: JSON.stringify(initTasks()),
            lastUpdated: new Date().toISOString(),
          });
        }
      }
    } else {
      const newClient = await base44.entities.Client.create(form);
      if (form.status === 'Onboarding') {
        await base44.entities.OnboardingRecord.create({
          clientId: newClient.id,
          clientName: form.name,
          tasks: JSON.stringify(initTasks()),
          lastUpdated: new Date().toISOString(),
        });
      }
    }
    setModal(null);
    load();
  };

  const stats = {
    total: clients.length,
    live: clients.filter(c => c.status === 'Live').length,
    onboarding: clients.filter(c => c.status === 'Onboarding').length,
    trial: clients.filter(c => c.status === 'Trial').length,
  };

  const FILTER_TABS = ['All', 'Live', 'Onboarding', 'Trial', 'Churn'];

  return (
    <div className="flex-1 bg-ew-bg overflow-y-auto p-8 font-dm">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-navy">Clients</h1>
          <p className="text-ew-muted text-sm mt-0.5">All Eventwise customer accounts</p>
        </div>
        <button onClick={() => setModal({ type: 'add' })} className="flex items-center gap-1.5 h-9 px-4 text-sm font-semibold bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors">
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
        {FILTER_TABS.map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3.5 py-1.5 text-sm font-medium rounded-lg transition-colors ${filter === f ? 'bg-navy text-white' : 'bg-white border border-ew-border text-ew-body hover:bg-ew-bg'}`}
          >
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
                {['Client', 'Status', 'Owner', 'Health', 'Renewal', 'Notes', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-ew-muted uppercase tracking-[0.12em]">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((c, i) => (
                <tr key={c.id} className={`border-b border-ew-border last:border-0 hover:bg-navy/[0.02] transition-colors ${i % 2 === 1 ? 'bg-[#FAFBFE]' : 'bg-white'}`}>
                  <td className="px-4 py-3 min-w-[160px]">
                    <p className="font-semibold text-navy text-sm">{c.name}</p>
                    <p className="text-xs text-ew-muted mt-0.5">{c.contactName}</p>
                    {c.handoffIncomplete && (
                      <span className="inline-flex items-center gap-1 mt-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                        ⚠ Handoff incomplete
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${STATUS_STYLES[c.status] || 'bg-gray-100 text-gray-600'}`}>{c.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    <OwnerAvatar owner={c.owner} />
                  </td>
                  <td className="px-4 py-3 min-w-[100px]">
                    <HealthCell client={c} />
                  </td>
                  <td className="px-4 py-3 min-w-[120px]">
                    <RenewalCell date={c.renewalDate} />
                  </td>
                  <td className="px-4 py-3 max-w-[180px]">
                    {c.notes ? (
                      <p
                        className={`text-sm text-ew-body cursor-pointer hover:text-navy transition-colors ${expandedNotes === c.id ? '' : 'truncate'}`}
                        onClick={() => setExpandedNotes(expandedNotes === c.id ? null : c.id)}
                      >
                        {c.notes}
                      </p>
                    ) : <span className="text-ew-muted-light text-sm italic">—</span>}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => setModal({ type: 'edit', client: c })} className="text-xs px-2.5 py-1.5 font-medium text-ew-body border border-ew-border rounded-lg hover:bg-ew-bg transition-colors">Edit</button>
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
                <tr><td colSpan={7} className="px-4 py-12 text-center text-ew-muted text-sm">No clients found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ClientModal
          client={modal.type === 'edit' ? modal.client : null}
          onSave={handleSave}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}