import React, { useState, useCallback } from 'react';
import { ChevronDown, ChevronRight, Plus, Download, X, ExternalLink, Star } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';

function SectionCard({ title, icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      <button
        className="w-full flex items-center justify-between px-6 py-4 bg-[#242450] text-white text-left hover:bg-[#1a1a3a] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          {icon && <span>{icon}</span>}
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && <div className="px-6 py-5">{children}</div>}
    </div>
  );
}

function Badge({ label, color }) {
  const colors = {
    green: 'bg-[#DCFCE7] text-[#15803D]',
    amber: 'bg-[#FEF9C3] text-[#A16207]',
    red: 'bg-[#FEE2E2] text-[#B91C1C]',
    blue: 'bg-[#DBEAFE] text-[#1D4ED8]',
    purple: 'bg-[#F3E8FF] text-[#7E22CE]',
    gray: 'bg-[#F3F4F6] text-[#6B7280]',
    navy: 'bg-[#242450] text-white',
  };
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{label}</span>
  );
}

function exportToCSV(data, filename, columns) {
  const header = columns.map(c => c.label).join(',');
  const rows = data.map(row => columns.map(c => `"${(row[c.key] || '').toString().replace(/"/g, '""')}"`).join(','));
  const csv = [header, ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

// ─── Section 1: Overview ──────────────────────────────────────────────────────

const OVERVIEW_DEFAULTS = {
  status: 'Planning',
  targetDate: '',
  frequency: 'TBD',
  expansionCities: 'Manchester, Bristol, Edinburgh, Newcastle',
  budgetRange: '£5,000 – £6,000 per event',
};

function OverviewSection() {
  const [data, setData] = useState(OVERVIEW_DEFAULTS);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(data);

  const save = () => { setData(draft); setEditing(false); };
  const cancel = () => { setDraft(data); setEditing(false); };

  const rows = [
    { label: 'Concept', value: 'Intimate dinner events for 20 people, themed around AI & Technology in Events. Private dining room with course-based seating rotation for networking. Guest speaker presenting practical tech use cases between courses. Positioned as an industry discussion, not an Eventwise sales event.' },
    { label: 'Pilot City', value: 'London' },
    { label: 'Owner', value: 'Chris Carter' },
    { label: 'Logistics Lead', value: 'Monnie Carter' },
    { label: 'Marketing Lead', value: 'Elena' },
  ];

  const statusColor = { Planning: 'blue', Active: 'green', 'On Hold': 'amber', Complete: 'gray' }[data.status] || 'gray';

  return (
    <SectionCard title="Project Overview" icon="🗓" defaultOpen={true}>
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold text-[#242450]">Eventwise Dinner Roadshow</h3>
          <div className="flex items-center gap-2 mt-1">
            <Badge label={data.status} color={statusColor} />
            {data.targetDate && <span className="text-xs text-gray-400">Target: {data.targetDate}</span>}
          </div>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="text-xs font-semibold text-[#8403C5] hover:underline">Edit details</button>
        )}
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Status</label>
              <select className={ic} value={draft.status} onChange={e => setDraft(d => ({ ...d, status: e.target.value }))}>
                {['Planning', 'Active', 'On Hold', 'Complete'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Target Date</label>
              <input type="date" className={ic} value={draft.targetDate} onChange={e => setDraft(d => ({ ...d, targetDate: e.target.value }))} />
            </div>
            <div>
              <label className={labelCls}>Frequency</label>
              <select className={ic} value={draft.frequency} onChange={e => setDraft(d => ({ ...d, frequency: e.target.value }))}>
                {['Annual', 'Twice Yearly', 'TBD'].map(f => <option key={f}>{f}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Budget Range</label>
              <input className={ic} value={draft.budgetRange} onChange={e => setDraft(d => ({ ...d, budgetRange: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={labelCls}>Expansion Cities</label>
              <input className={ic} value={draft.expansionCities} onChange={e => setDraft(d => ({ ...d, expansionCities: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button onClick={cancel} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={save} className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">Save</button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-0">
          {rows.map(r => (
            <div key={r.label} className="flex gap-4 py-2.5 border-b border-gray-100 last:border-0">
              <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">{r.label}</span>
              <span className="text-sm text-[#374151] leading-relaxed">{r.value}</span>
            </div>
          ))}
          <div className="flex gap-4 py-2.5 border-b border-gray-100">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">Status</span>
            <Badge label={data.status} color={statusColor} />
          </div>
          <div className="flex gap-4 py-2.5 border-b border-gray-100">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">Target Date</span>
            <span className="text-sm text-[#374151]">{data.targetDate || '—'}</span>
          </div>
          <div className="flex gap-4 py-2.5 border-b border-gray-100">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">Frequency</span>
            <span className="text-sm text-[#374151]">{data.frequency}</span>
          </div>
          <div className="flex gap-4 py-2.5 border-b border-gray-100">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">Expansion Cities</span>
            <span className="text-sm text-[#374151]">{data.expansionCities}</span>
          </div>
          <div className="flex gap-4 py-2.5">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-0.5">Budget Range</span>
            <span className="text-sm text-[#374151]">{data.budgetRange}</span>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Section 2: Guest List ────────────────────────────────────────────────────

const GUEST_TYPES = ['Prospect', 'Existing Client', 'Industry Contact', 'Speaker'];
const CITIES = ['London', 'Manchester', 'Bristol', 'Edinburgh', 'Newcastle', 'Other'];
const INVITE_STATUSES = ['To Invite', 'Invited', 'Confirmed', 'Declined', 'Waitlist'];

const inviteStatusColor = { 'To Invite': 'gray', 'Invited': 'blue', 'Confirmed': 'green', 'Declined': 'red', 'Waitlist': 'amber' };

const EMPTY_GUEST = { name: '', company: '', role: '', type: 'Prospect', city: 'London', inviteStatus: 'To Invite', notes: '', addedBy: '' };

function GuestListSection() {
  const [guests, setGuests] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_GUEST);
  const [filterCity, setFilterCity] = useState('All');
  const [filterType, setFilterType] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const addGuest = () => {
    if (!form.name.trim()) return;
    setGuests(g => [...g, { ...form, id: Date.now() }]);
    setForm(EMPTY_GUEST);
    setShowForm(false);
  };

  const removeGuest = (id) => setGuests(g => g.filter(x => x.id !== id));

  const filtered = guests.filter(g =>
    (filterCity === 'All' || g.city === filterCity) &&
    (filterType === 'All' || g.type === filterType) &&
    (filterStatus === 'All' || g.inviteStatus === filterStatus)
  );

  const confirmedCount = guests.filter(g => g.inviteStatus === 'Confirmed').length;

  const csvCols = [
    { key: 'name', label: 'Name' }, { key: 'company', label: 'Company' }, { key: 'role', label: 'Role/Title' },
    { key: 'type', label: 'Type' }, { key: 'city', label: 'City' }, { key: 'inviteStatus', label: 'Invite Status' },
    { key: 'notes', label: 'Notes' }, { key: 'addedBy', label: 'Added By' },
  ];

  return (
    <SectionCard title="Guest List Tracker" icon="👥">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge label={`${confirmedCount} Confirmed`} color="green" />
          <Badge label={`${guests.length} Total`} color="gray" />
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => exportToCSV(guests, 'dinner-roadshow-guests.csv', csvCols)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-gray-200 rounded-lg text-gray-600 hover:bg-gray-50">
            <Download className="w-3.5 h-3.5" /> Export CSV
          </button>
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
            <Plus className="w-3.5 h-3.5" /> Add Guest
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[['City', CITIES, filterCity, setFilterCity], ['Type', GUEST_TYPES, filterType, setFilterType], ['Status', INVITE_STATUSES, filterStatus, setFilterStatus]].map(([label, opts, val, set]) => (
          <select key={label} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-700"
            value={val} onChange={e => set(e.target.value)}>
            <option value="All">All {label}s</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>

      {/* Add form */}
      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Name *</label><input className={ic} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" /></div>
            <div><label className={labelCls}>Company</label><input className={ic} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div><label className={labelCls}>Role/Title</label><input className={ic} value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} /></div>
            <div><label className={labelCls}>Type</label>
              <select className={ic} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value }))}>
                {GUEST_TYPES.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>City</label>
              <select className={ic} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))}>
                {CITIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Invite Status</label>
              <select className={ic} value={form.inviteStatus} onChange={e => setForm(f => ({ ...f, inviteStatus: e.target.value }))}>
                {INVITE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Added By</label><input className={ic} value={form.addedBy} onChange={e => setForm(f => ({ ...f, addedBy: e.target.value }))} /></div>
            <div><label className={labelCls}>Notes</label><input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_GUEST); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addGuest} disabled={!form.name.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {/* Table */}
      {filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No guests yet — add your first invite above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Name', 'Company', 'Role', 'Type', 'City', 'Status', 'Notes', 'Added By', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2.5 font-medium text-[#242450]">{g.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{g.company}</td>
                  <td className="px-3 py-2.5 text-gray-600">{g.role}</td>
                  <td className="px-3 py-2.5"><Badge label={g.type} color="blue" /></td>
                  <td className="px-3 py-2.5 text-gray-600">{g.city}</td>
                  <td className="px-3 py-2.5"><Badge label={g.inviteStatus} color={inviteStatusColor[g.inviteStatus]} /></td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{g.notes}</td>
                  <td className="px-3 py-2.5 text-gray-400 text-xs">{g.addedBy}</td>
                  <td className="px-3 py-2.5"><button onClick={() => removeGuest(g.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Section 3: Venue Shortlist ───────────────────────────────────────────────

const VENUE_STATUSES = ['To Research', 'Shortlisted', 'Contacted', 'Visited', 'Booked', 'Rejected'];
const venueStatusColor = { 'To Research': 'gray', 'Shortlisted': 'blue', 'Contacted': 'amber', 'Visited': 'purple', 'Booked': 'green', 'Rejected': 'red' };

const INITIAL_VENUES = [
  { id: 1, name: 'The Ninth', area: 'Fitzrovia', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£65pp', url: 'theninthlondon.com', status: 'Shortlisted', notes: 'Seats exactly 20, elegant but relaxed feel', selected: false },
  { id: 2, name: '10 Greek Street', area: 'Soho', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£55pp', url: '10greekstreet.com', status: 'Shortlisted', notes: 'Intimate, feels like entertaining at home', selected: false },
  { id: 3, name: 'Boisdale of Belgravia', area: 'Belgravia', capacity: 20, privateRoom: 'Yes', av: 'Yes', cost: '~£70pp', url: 'boisdale.co.uk', status: 'Shortlisted', notes: 'Classic private members feel, good for senior crowd', selected: false },
  { id: 4, name: 'Vinoteca Farringdon', area: 'Farringdon', capacity: 30, privateRoom: 'Yes', av: 'TBC', cost: '~£50pp + £30pp wine tasting', url: 'vinoteca.co.uk', status: 'To Research', notes: 'Wine tasting add-on could be a nice touch', selected: false },
];

const EMPTY_VENUE = { name: '', area: '', capacity: '', privateRoom: 'TBC', av: 'TBC', cost: '', url: '', status: 'To Research', notes: '', selected: false };

function VenueSection() {
  const [venues, setVenues] = useState(INITIAL_VENUES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_VENUE);
  const [filterStatus, setFilterStatus] = useState('All');

  const addVenue = () => {
    if (!form.name.trim()) return;
    setVenues(v => [...v, { ...form, id: Date.now() }]);
    setForm(EMPTY_VENUE);
    setShowForm(false);
  };

  const toggleSelect = (id) => setVenues(v => v.map(x => ({ ...x, selected: x.id === id ? !x.selected : false })));
  const updateStatus = (id, status) => setVenues(v => v.map(x => x.id === id ? { ...x, status } : x));
  const removeVenue = (id) => setVenues(v => v.filter(x => x.id !== id));

  const sorted = [...venues].sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0));
  const filtered = sorted.filter(v => filterStatus === 'All' || v.status === filterStatus);

  return (
    <SectionCard title="Venue Shortlist" icon="🏛">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 focus:outline-none bg-white text-gray-700"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {VENUE_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
          <Plus className="w-3.5 h-3.5" /> Add Venue
        </button>
      </div>

      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Venue Name *</label><input className={ic} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className={labelCls}>Area</label><input className={ic} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} placeholder="e.g. Soho" /></div>
            <div><label className={labelCls}>Capacity</label><input type="number" className={ic} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div><label className={labelCls}>Estimated Cost</label><input className={ic} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} placeholder="e.g. £65pp" /></div>
            <div><label className={labelCls}>Private Room</label>
              <select className={ic} value={form.privateRoom} onChange={e => setForm(f => ({ ...f, privateRoom: e.target.value }))}>
                {['Yes', 'No', 'TBC'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>AV/Speaker Capability</label>
              <select className={ic} value={form.av} onChange={e => setForm(f => ({ ...f, av: e.target.value }))}>
                {['Yes', 'No', 'TBC'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Status</label>
              <select className={ic} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {VENUE_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Website URL</label><input className={ic} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
            <div className="col-span-2"><label className={labelCls}>Notes</label><input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_VENUE); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addVenue} disabled={!form.name.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(v => (
          <div key={v.id} className={`border rounded-xl p-4 transition-all ${v.selected ? 'border-[#242450] bg-[#242450]/5 ring-1 ring-[#242450]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1 flex-wrap">
                  <span className={`font-semibold text-sm ${v.selected ? 'text-[#242450]' : 'text-gray-800'}`}>{v.name}</span>
                  {v.selected && <Badge label="Selected" color="navy" />}
                  <Badge label={v.status} color={venueStatusColor[v.status]} />
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-2">
                  <span>📍 {v.area}</span>
                  <span>👥 {v.capacity} capacity</span>
                  <span>🚪 Private room: {v.privateRoom}</span>
                  <span>🎤 AV: {v.av}</span>
                  <span>💷 {v.cost}</span>
                  {v.url && <a href={`https://${v.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[#8403C5] hover:underline"><ExternalLink className="w-3 h-3" /> {v.url}</a>}
                </div>
                {v.notes && <p className="text-xs text-gray-500 italic">{v.notes}</p>}
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                  value={v.status} onChange={e => updateStatus(v.id, e.target.value)}>
                  {VENUE_STATUSES.map(s => <option key={s}>{s}</option>)}
                </select>
                <button onClick={() => toggleSelect(v.id)}
                  className={`p-1.5 rounded-lg transition-colors ${v.selected ? 'text-[#242450] bg-[#242450]/10' : 'text-gray-300 hover:text-[#242450] hover:bg-gray-100'}`}
                  title={v.selected ? 'Deselect' : 'Mark as Selected'}>
                  <Star className={`w-4 h-4 ${v.selected ? 'fill-[#242450]' : ''}`} />
                </button>
                <button onClick={() => removeVenue(v.id)} className="text-gray-300 hover:text-red-500 transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section 4: Speaker Tracker ───────────────────────────────────────────────

const SPEAKER_SOURCES = ['Chris Network', 'LinkedIn', 'Agency', 'Inbound', 'Other'];
const SPEAKER_STATUSES = ['Identified', 'Approached', 'In Conversation', 'Confirmed', 'Declined'];
const speakerStatusColor = { 'Identified': 'gray', 'Approached': 'blue', 'In Conversation': 'amber', 'Confirmed': 'green', 'Declined': 'red' };

const EMPTY_SPEAKER = { name: '', company: '', topic: '', source: 'Chris Network', fee: '', status: 'Identified', notes: '', url: '' };

function SpeakerSection() {
  const [speakers, setSpeakers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_SPEAKER);
  const [filterStatus, setFilterStatus] = useState('All');

  const addSpeaker = () => {
    if (!form.name.trim()) return;
    setSpeakers(s => [...s, { ...form, id: Date.now() }]);
    setForm(EMPTY_SPEAKER);
    setShowForm(false);
  };

  const updateStatus = (id, status) => setSpeakers(s => s.map(x => x.id === id ? { ...x, status } : x));
  const removeSpeaker = (id) => setSpeakers(s => s.filter(x => x.id !== id));

  const filtered = speakers.filter(s => filterStatus === 'All' || s.status === filterStatus);

  return (
    <SectionCard title="Speaker Tracker" icon="🎤">
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 mb-4 text-sm text-gray-500 italic">
        For the pilot dinner, prioritise speakers from Chris's existing network in the events/festival tech space. A warm contact speaking for £500–£2,500 will land better than an agency booking. Target: someone who has built or deployed AI tools for festivals or live events.
      </div>
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
          value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
          <option value="All">All Statuses</option>
          {SPEAKER_STATUSES.map(s => <option key={s}>{s}</option>)}
        </select>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
          <Plus className="w-3.5 h-3.5" /> Add Speaker
        </button>
      </div>

      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Name *</label><input className={ic} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div><label className={labelCls}>Company/Org</label><input className={ic} value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} /></div>
            <div className="col-span-2"><label className={labelCls}>Topic/Angle</label><input className={ic} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} placeholder="e.g. AI in festival operations" /></div>
            <div><label className={labelCls}>Source</label>
              <select className={ic} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {SPEAKER_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Speaker Fee</label><input className={ic} value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} placeholder="e.g. £1,000–£2,000 or TBC" /></div>
            <div><label className={labelCls}>Status</label>
              <select className={ic} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {SPEAKER_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>LinkedIn/Website</label><input className={ic} value={form.url} onChange={e => setForm(f => ({ ...f, url: e.target.value }))} /></div>
            <div className="col-span-2"><label className={labelCls}>Notes</label><input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => { setShowForm(false); setForm(EMPTY_SPEAKER); }} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addSpeaker} disabled={!form.name.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No speakers added yet.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Name', 'Company', 'Topic', 'Source', 'Fee', 'Status', 'Notes', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id} className={`border-b border-gray-100 last:border-0 transition-colors ${s.status === 'Confirmed' ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                  <td className="px-3 py-2.5 font-medium text-[#242450]">{s.name}</td>
                  <td className="px-3 py-2.5 text-gray-600">{s.company}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[150px]">{s.topic}</td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs">{s.source}</td>
                  <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{s.fee}</td>
                  <td className="px-3 py-2.5">
                    <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                      value={s.status} onChange={e => updateStatus(s.id, e.target.value)}>
                      {SPEAKER_STATUSES.map(st => <option key={st}>{st}</option>)}
                    </select>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{s.notes}</td>
                  <td className="px-3 py-2.5"><button onClick={() => removeSpeaker(s.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Section 5: Budget ────────────────────────────────────────────────────────

const BUDGET_STATUSES = ['Not Started', 'In Progress', 'Paid', 'TBC'];

const INITIAL_BUDGET = [
  { id: 1, item: 'Venue / Private Dining Room', estimated: 1500, actual: '', status: 'TBC', notes: 'Minimum spend or hire fee' },
  { id: 2, item: 'Food (3 courses, 20 people)', estimated: 1400, actual: '', status: 'TBC', notes: 'Est. £70pp' },
  { id: 3, item: 'Wine & Drinks', estimated: 900, actual: '', status: 'TBC', notes: 'Est. £45pp' },
  { id: 4, item: 'Speaker Fee', estimated: 1500, actual: '', status: 'TBC', notes: 'Depends on source — aim for network contact' },
  { id: 5, item: 'AV / Mic Setup', estimated: 350, actual: '', status: 'TBC', notes: 'Only if venue doesn\'t include' },
  { id: 6, item: 'Printed Menus & Light Branding', estimated: 150, actual: '', status: 'TBC', notes: 'Menus, table cards, banner' },
];

function BudgetSection() {
  const [items, setItems] = useState(INITIAL_BUDGET);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item: '', estimated: '', actual: '', status: 'Not Started', notes: '' });

  const update = (id, field, value) => setItems(items => items.map(x => x.id === id ? { ...x, [field]: value } : x));
  const removeItem = (id) => setItems(items => items.filter(x => x.id !== id));
  const addItem = () => {
    if (!form.item.trim()) return;
    setItems(i => [...i, { ...form, id: Date.now() }]);
    setForm({ item: '', estimated: '', actual: '', status: 'Not Started', notes: '' });
    setShowForm(false);
  };

  const totalEst = items.reduce((s, x) => s + (parseFloat(x.estimated) || 0), 0);
  const totalAct = items.reduce((s, x) => s + (parseFloat(x.actual) || 0), 0);

  const budgetStatus = totalEst < 7000 ? { label: 'Within Budget', color: 'green' }
    : totalEst <= 9000 ? { label: 'Review Needed', color: 'amber' }
    : { label: 'Over Budget', color: 'red' };

  return (
    <SectionCard title="Budget Tracker" icon="💷">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge label={budgetStatus.label} color={budgetStatus.color} />
          <span className="text-xs text-gray-400">Estimated total: £{totalEst.toLocaleString()}</span>
        </div>
        <button onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
          <Plus className="w-3.5 h-3.5" /> Add Line Item
        </button>
      </div>

      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Item *</label><input className={ic} value={form.item} onChange={e => setForm(f => ({ ...f, item: e.target.value }))} /></div>
            <div><label className={labelCls}>Estimated (£)</label><input type="number" className={ic} value={form.estimated} onChange={e => setForm(f => ({ ...f, estimated: e.target.value }))} /></div>
            <div><label className={labelCls}>Actual (£)</label><input type="number" className={ic} value={form.actual} onChange={e => setForm(f => ({ ...f, actual: e.target.value }))} /></div>
            <div><label className={labelCls}>Status</label>
              <select className={ic} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {BUDGET_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Notes</label><input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addItem} disabled={!form.item.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            {['Item', 'Estimated (£)', 'Actual (£)', 'Status', 'Notes', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
                <td className="px-3 py-2.5 font-medium text-gray-800">{x.item}</td>
                <td className="px-3 py-2.5">
                  <input type="number" className="w-24 text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none" value={x.estimated} onChange={e => update(x.id, 'estimated', e.target.value)} />
                </td>
                <td className="px-3 py-2.5">
                  <input type="number" className="w-24 text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none" value={x.actual} onChange={e => update(x.id, 'actual', e.target.value)} placeholder="—" />
                </td>
                <td className="px-3 py-2.5">
                  <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                    value={x.status} onChange={e => update(x.id, 'status', e.target.value)}>
                    {BUDGET_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{x.notes}</td>
                <td className="px-3 py-2.5"><button onClick={() => removeItem(x.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
            {/* Totals row */}
            <tr className="bg-gray-50 border-t-2 border-gray-200 font-semibold">
              <td className="px-3 py-2.5 text-[#242450]">Total</td>
              <td className="px-3 py-2.5 text-[#242450]">£{totalEst.toLocaleString()}</td>
              <td className="px-3 py-2.5 text-[#242450]">{totalAct > 0 ? `£${totalAct.toLocaleString()}` : '—'}</td>
              <td colSpan={3} />
            </tr>
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Section 6: Action Tracker ────────────────────────────────────────────────

const ACTION_OWNERS = ['Chris', 'Elena', 'Monnie', 'Chris + Elena'];
const ACTION_STATUSES = ['Not Started', 'In Progress', 'Done', 'Blocked'];
const actionStatusColor = { 'Not Started': 'gray', 'In Progress': 'blue', 'Done': 'green', 'Blocked': 'red' };

const INITIAL_ACTIONS = [
  { id: 1, action: 'Finalise pilot event date', owner: 'Chris', due: '', status: 'Not Started', notes: '' },
  { id: 2, action: 'Confirm guest target number (aim for 20)', owner: 'Chris', due: '', status: 'Not Started', notes: '' },
  { id: 3, action: 'Begin building London guest list', owner: 'Chris + Elena', due: '', status: 'Not Started', notes: '' },
  { id: 4, action: 'Research and shortlist venues', owner: 'Monnie', due: '', status: 'Not Started', notes: '' },
  { id: 5, action: 'Identify and approach pilot speaker', owner: 'Chris', due: '', status: 'Not Started', notes: '' },
  { id: 6, action: 'Confirm pilot budget with Chris', owner: 'Elena', due: '', status: 'Not Started', notes: '' },
  { id: 7, action: 'Draft guest invitation copy', owner: 'Elena', due: '', status: 'Not Started', notes: '' },
  { id: 8, action: 'Book venue', owner: 'Monnie', due: '', status: 'Not Started', notes: 'Pending date + guest number confirmation' },
];

function ActionSection() {
  const [actions, setActions] = useState(INITIAL_ACTIONS);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ action: '', owner: 'Chris', due: '', status: 'Not Started', notes: '' });
  const [filterOwner, setFilterOwner] = useState('All');
  const [filterStatus, setFilterStatus] = useState('All');

  const update = (id, field, value) => setActions(a => a.map(x => x.id === id ? { ...x, [field]: value } : x));
  const removeAction = (id) => setActions(a => a.filter(x => x.id !== id));
  const addAction = () => {
    if (!form.action.trim()) return;
    setActions(a => [...a, { ...form, id: Date.now() }]);
    setForm({ action: '', owner: 'Chris', due: '', status: 'Not Started', notes: '' });
    setShowForm(false);
  };

  const filtered = actions
    .filter(a =>
      (filterOwner === 'All' || a.owner === filterOwner) &&
      (filterStatus === 'All' || a.status === filterStatus)
    )
    .sort((a, b) => (a.status === 'Done' ? 1 : 0) - (b.status === 'Done' ? 1 : 0));

  const openCount = actions.filter(a => a.status !== 'Done').length;

  return (
    <SectionCard title="Action Tracker" icon="✅">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Badge label={`${openCount} Open Actions`} color="amber" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {[['Owner', ACTION_OWNERS, filterOwner, setFilterOwner], ['Status', ACTION_STATUSES, filterStatus, setFilterStatus]].map(([label, opts, val, set]) => (
            <select key={label} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
              value={val} onChange={e => set(e.target.value)}>
              <option value="All">All {label}s</option>
              {opts.map(o => <option key={o}>{o}</option>)}
            </select>
          ))}
          <button onClick={() => setShowForm(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8]">
            <Plus className="w-3.5 h-3.5" /> Add Action
          </button>
        </div>
      </div>

      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className={labelCls}>Action *</label><input className={ic} value={form.action} onChange={e => setForm(f => ({ ...f, action: e.target.value }))} /></div>
            <div><label className={labelCls}>Owner</label>
              <select className={ic} value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))}>
                {ACTION_OWNERS.map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Due Date</label><input type="date" className={ic} value={form.due} onChange={e => setForm(f => ({ ...f, due: e.target.value }))} /></div>
            <div><label className={labelCls}>Status</label>
              <select className={ic} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                {ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Notes</label><input className={ic} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 justify-end">
            <button onClick={() => setShowForm(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
            <button onClick={addAction} disabled={!form.action.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-gray-200">
        <table className="w-full text-sm">
          <thead><tr className="bg-gray-50 border-b border-gray-200">
            {['Action', 'Owner', 'Due Date', 'Status', 'Notes', ''].map(h => (
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={`border-b border-gray-100 last:border-0 transition-colors ${a.status === 'Done' ? 'bg-green-50 opacity-70' : 'hover:bg-gray-50'}`}>
                <td className={`px-3 py-2.5 font-medium ${a.status === 'Done' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{a.action}</td>
                <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{a.owner}</td>
                <td className="px-3 py-2.5">
                  <input type="date" className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
                    value={a.due} onChange={e => update(a.id, 'due', e.target.value)} />
                </td>
                <td className="px-3 py-2.5">
                  <select className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white"
                    value={a.status} onChange={e => update(a.id, 'status', e.target.value)}>
                    {ACTION_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </td>
                <td className="px-3 py-2.5 text-xs text-gray-500">{a.notes}</td>
                <td className="px-3 py-2.5"><button onClick={() => removeAction(a.id)} className="text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Section 7: Notes & Context ───────────────────────────────────────────────

function NotesContextSection() {
  const [open, setOpen] = useState(false);
  const sections = [
    {
      title: 'AIF Partnership',
      body: "Eventwise is building a growing partnership with AIF (Association of Independent Festivals). An email has been sent to John Rostron (AIF CEO) proposing sponsorship of the Festival Congress 2027 morning coffee slot and a Finance Roundtable session. The dinner roadshow is a separate, Eventwise-owned initiative running in parallel."
    },
    {
      title: 'Format Rationale',
      body: "Course-based seating rotation chosen to maximise networking across all 20 guests. AI in Events theme chosen as a timely, practical topic relevant to both festival organisers and production agencies. Deliberately positioned as an industry event, not a product demo or sales dinner."
    },
    {
      title: 'Pilot Approach',
      body: "Start in London for feedback and refinement before expanding regionally. Target timing: October–November 2026 or January–March 2027. Free to attend for the pilot; potential to introduce a £50–100 ticket price if the format proves successful."
    },
    {
      title: 'Speaker Approach',
      body: "Do not use a speaker agency for the pilot. Identify someone through Chris's network — ideally a festival/event tech founder, consultant, or practitioner who has real experience deploying AI in live events. Warm referral preferred. Budget: £500–£2,500."
    },
    {
      title: 'Venue Approach',
      body: "Central London. Private dining room for exactly 20. Must have AV/mic capability or be able to accommodate it. Midweek preferred (Tue/Wed) for 15–20% venue cost saving. Minimum spend model preferred over flat hire fee where possible."
    },
  ];

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      <button
        className="w-full flex items-center justify-between px-6 py-4 bg-[#242450] text-white text-left hover:bg-[#1a1a3a] transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="text-sm font-semibold tracking-wide">Background & Research Notes</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && (
        <div className="px-6 py-5 bg-gray-50 space-y-4">
          {sections.map(s => (
            <div key={s.title}>
              <p className="text-[11px] font-bold text-[#242450] uppercase tracking-[0.12em] mb-1.5">{s.title}</p>
              <p className="text-sm text-gray-600 leading-relaxed">{s.body}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function DinnerRoadshow() {
  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F7F8] p-8 font-dm">
      <div className="max-w-5xl mx-auto">
        <div className="mb-7">
          <h1 className="text-2xl font-semibold text-[#111827]">Dinner Roadshow</h1>
          <p className="text-sm text-gray-400 mt-0.5">Intimate AI & Technology in Events dinners — pilot in London</p>
        </div>
        <OverviewSection />
        <GuestListSection />
        <VenueSection />
        <SpeakerSection />
        <BudgetSection />
        <ActionSection />
        <NotesContextSection />
      </div>
    </div>
  );
}