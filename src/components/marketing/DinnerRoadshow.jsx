import React, { useState, useRef, useCallback, useContext, createContext } from 'react';
import { ChevronDown, ChevronRight, Plus, Download, X, ExternalLink, Star, Pencil, Clock, Check } from 'lucide-react';
import { format } from 'date-fns';

// ─── Activity Log Context ─────────────────────────────────────────────────────

const ActivityContext = createContext(null);

function useActivity() {
  return useContext(ActivityContext);
}

function fmtNow() {
  return format(new Date(), 'd MMM yyyy, HH:mm');
}

// ─── Shared Helpers ───────────────────────────────────────────────────────────

const ic = 'w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white';
const labelCls = 'block text-[11px] font-semibold text-gray-400 uppercase tracking-[0.08em] mb-1';

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
  return <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${colors[color] || colors.gray}`}>{label}</span>;
}

// "Saved" toast — lightweight, no library
function SavedToast({ show }) {
  if (!show) return null;
  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-[#242450] text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xl animate-toast-in pointer-events-none">
      <Check className="w-3.5 h-3.5 text-green-400" /> Saved
    </div>
  );
}

function useSavedToast() {
  const [show, setShow] = useState(false);
  const timer = useRef(null);
  const flash = useCallback(() => {
    setShow(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShow(false), 1500);
  }, []);
  return [show, flash];
}

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

// Inline editable text cell — click to edit, blur/enter to save
function InlineText({ value, onChange, placeholder = '—', multiline = false, className = '' }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef(null);

  const commit = () => {
    setEditing(false);
    if (draft !== value) onChange(draft);
  };

  if (editing) {
    return multiline ? (
      <textarea
        ref={ref}
        autoFocus
        className={`w-full text-sm border border-[#8403C5]/40 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white resize-none min-h-[64px] ${className}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
      />
    ) : (
      <input
        ref={ref}
        autoFocus
        className={`w-full text-sm border border-[#8403C5]/40 rounded px-2 py-1 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 bg-white ${className}`}
        value={draft}
        onChange={e => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={e => { if (e.key === 'Enter') commit(); if (e.key === 'Escape') { setDraft(value); setEditing(false); } }}
      />
    );
  }

  return (
    <span
      className={`cursor-text hover:bg-gray-50 rounded px-1 py-0.5 min-w-[40px] inline-block text-sm ${!value ? 'text-gray-300 italic' : ''} ${className}`}
      onClick={() => { setDraft(value); setEditing(true); }}
      title="Click to edit"
    >
      {value || placeholder}
    </span>
  );
}

// Inline select cell
function InlineSelect({ value, options, onChange }) {
  return (
    <select
      className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#8403C5]/30"
      value={value}
      onChange={e => onChange(e.target.value)}
    >
      {options.map(o => <option key={o}>{o}</option>)}
    </select>
  );
}

// Inline date cell
function InlineDate({ value, onChange }) {
  return (
    <input
      type="date"
      className="text-xs border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none"
      value={value}
      onChange={e => onChange(e.target.value)}
    />
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
  concept: 'Intimate dinner events for 20 people, themed around AI & Technology in Events. Private dining room with course-based seating rotation for networking. Guest speaker presenting practical tech use cases between courses. Positioned as an industry discussion, not an Eventwise sales event.',
  status: 'Planning',
  pilotCity: 'London',
  owner: 'Chris Carter',
  logisticsLead: 'Monnie Carter',
  marketingLead: 'Elena',
  targetDate: '',
  frequency: 'TBD',
  expansionCities: 'Manchester, Bristol, Edinburgh, Newcastle',
  budgetRange: '£5,000 – £6,000 per event',
};

const statusColor = { Planning: 'blue', Active: 'green', 'On Hold': 'amber', Complete: 'gray' };

function OverviewSection() {
  const [data, setData] = useState(OVERVIEW_DEFAULTS);
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const update = (field, value) => {
    setData(d => ({ ...d, [field]: value }));
    flash();
    log(`Overview: "${field}" updated`);
  };

  const color = statusColor[data.status] || 'gray';

  const rows = [
    { label: 'Concept', field: 'concept', multiline: true },
    { label: 'Pilot City', field: 'pilotCity' },
    { label: 'Owner', field: 'owner' },
    { label: 'Logistics Lead', field: 'logisticsLead' },
    { label: 'Marketing Lead', field: 'marketingLead' },
    { label: 'Expansion Cities', field: 'expansionCities' },
    { label: 'Budget Range', field: 'budgetRange' },
  ];

  return (
    <SectionCard title="Project Overview" icon="🗓" defaultOpen={true}>
      <SavedToast show={show} />
      <div className="mb-4 flex items-center gap-3 flex-wrap">
        <h3 className="text-lg font-bold text-[#242450]">Eventwise Dinner Roadshow</h3>
        <Badge label={data.status} color={color} />
        {data.targetDate && <span className="text-xs text-gray-400">Target: {data.targetDate}</span>}
      </div>
      <div className="divide-y divide-gray-100">
        {rows.map(r => (
          <div key={r.field} className="flex gap-4 py-2.5 items-start">
            <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide pt-1">{r.label}</span>
            <div className="flex-1">
              <InlineText value={data[r.field]} onChange={v => update(r.field, v)} multiline={r.multiline} />
            </div>
          </div>
        ))}
        <div className="flex gap-4 py-2.5 items-center">
          <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Status</span>
          <InlineSelect value={data.status} options={['Planning', 'Active', 'On Hold', 'Complete']} onChange={v => update('status', v)} />
        </div>
        <div className="flex gap-4 py-2.5 items-center">
          <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Target Date</span>
          <InlineDate value={data.targetDate} onChange={v => update('targetDate', v)} />
        </div>
        <div className="flex gap-4 py-2.5 items-center">
          <span className="w-36 shrink-0 text-[11px] font-bold text-gray-400 uppercase tracking-wide">Frequency</span>
          <InlineSelect value={data.frequency} options={['Annual', 'Twice Yearly', 'TBD']} onChange={v => update('frequency', v)} />
        </div>
      </div>
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
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const addGuest = () => {
    if (!form.name.trim()) return;
    const g = { ...form, id: Date.now() };
    setGuests(prev => [...prev, g]);
    setForm(EMPTY_GUEST);
    setShowForm(false);
    flash();
    log(`Guest added: "${form.name}"`);
  };

  const update = (id, field, value) => {
    setGuests(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    flash();
    log(`Guest list: "${field}" updated`);
  };

  const remove = (id, name) => {
    setGuests(prev => prev.filter(x => x.id !== id));
    log(`Guest removed: "${name}"`);
  };

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
      <SavedToast show={show} />
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
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        {[['City', CITIES, filterCity, setFilterCity], ['Type', GUEST_TYPES, filterType, setFilterType], ['Status', INVITE_STATUSES, filterStatus, setFilterStatus]].map(([label, opts, val, set]) => (
          <select key={label} className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
            value={val} onChange={e => set(e.target.value)}>
            <option value="All">All {label}s</option>
            {opts.map(o => <option key={o}>{o}</option>)}
          </select>
        ))}
      </div>
      {showForm && (
        <div className="bg-[#FAFBFE] border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div><label className={labelCls}>Name *</label><input className={ic} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
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
            <button onClick={addGuest} disabled={!form.name.trim()} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg disabled:opacity-40">Add</button>
          </div>
        </div>
      )}
      {filtered.length === 0 ? (
        <div className="text-center py-10 border border-dashed border-gray-200 rounded-xl">
          <p className="text-sm text-gray-400">No guests yet — add your first invite above.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b border-gray-200">
              {['Name', 'Company', 'Role', 'Type', 'City', 'Status', 'Notes', 'Added By', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-colors">
                  <td className="px-3 py-2"><InlineText value={g.name} onChange={v => update(g.id, 'name', v)} /></td>
                  <td className="px-3 py-2"><InlineText value={g.company} onChange={v => update(g.id, 'company', v)} /></td>
                  <td className="px-3 py-2"><InlineText value={g.role} onChange={v => update(g.id, 'role', v)} /></td>
                  <td className="px-3 py-2"><InlineSelect value={g.type} options={GUEST_TYPES} onChange={v => update(g.id, 'type', v)} /></td>
                  <td className="px-3 py-2"><InlineSelect value={g.city} options={CITIES} onChange={v => update(g.id, 'city', v)} /></td>
                  <td className="px-3 py-2"><InlineSelect value={g.inviteStatus} options={INVITE_STATUSES} onChange={v => update(g.id, 'inviteStatus', v)} /></td>
                  <td className="px-3 py-2 max-w-[120px]"><InlineText value={g.notes} onChange={v => update(g.id, 'notes', v)} /></td>
                  <td className="px-3 py-2"><InlineText value={g.addedBy} onChange={v => update(g.id, 'addedBy', v)} /></td>
                  <td className="px-3 py-2"><button onClick={() => remove(g.id, g.name)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button></td>
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
const EMPTY_VENUE = { name: '', area: '', capacity: '', privateRoom: 'TBC', av: 'TBC', cost: '', url: '', status: 'To Research', notes: '', selected: false };

const INITIAL_VENUES = [
  { id: 1, name: 'The Ninth', area: 'Fitzrovia', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£65pp', url: 'theninthlondon.com', status: 'Shortlisted', notes: 'Seats exactly 20, elegant but relaxed feel', selected: false },
  { id: 2, name: '10 Greek Street', area: 'Soho', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£55pp', url: '10greekstreet.com', status: 'Shortlisted', notes: 'Intimate, feels like entertaining at home', selected: false },
  { id: 3, name: 'Boisdale of Belgravia', area: 'Belgravia', capacity: 20, privateRoom: 'Yes', av: 'Yes', cost: '~£70pp', url: 'boisdale.co.uk', status: 'Shortlisted', notes: 'Classic private members feel, good for senior crowd', selected: false },
  { id: 4, name: 'Vinoteca Farringdon', area: 'Farringdon', capacity: 30, privateRoom: 'Yes', av: 'TBC', cost: '~£50pp + £30pp wine tasting', url: 'vinoteca.co.uk', status: 'To Research', notes: 'Wine tasting add-on could be a nice touch', selected: false },
  { id: 5, name: 'Hakkasan Mayfair', area: 'Mayfair', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: 'Premium — est. £100pp+', url: 'hakkasan.com', status: 'To Research', notes: 'Dragon Room seats exactly 20, dedicated service and optional sommelier — high-end option, good for senior crowd, would make a statement for the pilot', selected: false },
  { id: 6, name: 'Morchella', area: 'Clerkenwell', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£60pp', url: 'morchella.co.uk', status: 'Shortlisted', notes: 'Basement Garden seats 18–22, living walls and Mediterranean small plates — creative and intimate without being stuffy, good fit for progressive festival crowd', selected: false },
  { id: 7, name: 'Luca', area: 'Clerkenwell', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£70pp', url: 'luca.restaurant', status: 'Shortlisted', notes: 'Three private rooms, largest seats 20 — British seasonal through Italian lens, elegant but relaxed, well-regarded food credentials', selected: false },
  { id: 8, name: 'Balthazar', area: 'Covent Garden', capacity: 24, privateRoom: 'Yes', av: 'TBC', cost: '~£65pp', url: 'balthazarlondon.com', status: 'To Research', notes: 'Le Petit Salon Privé seats up to 24 — buzzy, central, Covent Garden location easy for all guests to reach', selected: false },
  { id: 9, name: 'Barrafina Coal Drops Yard', area: "King's Cross", capacity: 22, privateRoom: 'Yes', av: 'TBC', cost: '~£65pp', url: 'barrafina.co.uk', status: 'Shortlisted', notes: 'Private room seats 8–22, Spanish food, King\'s Cross very accessible, Coal Drops Yard setting feels current and interesting — strong contender for pilot', selected: false },
  { id: 10, name: 'The Pem', area: 'Westminster', capacity: 20, privateRoom: 'Yes', av: 'TBC', cost: '~£75pp', url: 'thepemrestaurant.com', status: 'To Research', notes: 'Harben private dining room seats 8–20, also available for standing receptions of 30 — more formal and grand, suits senior/established festival operators', selected: false },
  { id: 11, name: 'Story Cellar', area: 'Seven Dials', capacity: 18, privateRoom: 'Yes', av: 'TBC', cost: '~£70pp', url: 'restaurantstory.co.uk', status: 'To Research', notes: 'Seats up to 18 so slightly under target — worth a call to confirm flexibility, Seven Dials location great, strong wow factor', selected: false },
  { id: 12, name: 'Bleeding Heart', area: 'Farringdon', capacity: 20, privateRoom: 'Yes', av: 'Yes', cost: '~£55pp', url: 'bleedingheart.co.uk', status: 'To Research', notes: 'Classic corporate private dining, specifically suited to 20-person business dinners, reliable with a strong wine list — solid fallback option', selected: false },
];

function VenueSection() {
  const [venues, setVenues] = useState(INITIAL_VENUES);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_VENUE);
  const [filterStatus, setFilterStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const update = (id, field, value) => {
    setVenues(v => v.map(x => x.id === id ? { ...x, [field]: value } : x));
    flash();
    log(`Venue "${venues.find(v => v.id === id)?.name}": ${field} updated`);
  };

  const startEdit = (v) => { setEditingId(v.id); setEditDraft({ ...v }); };
  const saveEdit = () => {
    setVenues(v => v.map(x => x.id === editingId ? { ...editDraft } : x));
    flash();
    log(`Venue "${editDraft.name}" edited`);
    setEditingId(null);
  };

  const addVenue = () => {
    if (!form.name.trim()) return;
    const v = { ...form, id: Date.now() };
    setVenues(prev => [...prev, v]);
    setForm(EMPTY_VENUE);
    setShowForm(false);
    flash();
    log(`Venue added: "${form.name}"`);
  };

  const toggleSelect = (id) => {
    setVenues(v => v.map(x => ({ ...x, selected: x.id === id ? !x.selected : false })));
    const name = venues.find(v => v.id === id)?.name;
    log(`Venue "${name}" marked as selected`);
  };

  const remove = (id) => {
    const name = venues.find(v => v.id === id)?.name;
    setVenues(v => v.filter(x => x.id !== id));
    log(`Venue removed: "${name}"`);
  };

  const sorted = [...venues].sort((a, b) => (b.selected ? 1 : 0) - (a.selected ? 1 : 0));
  const filtered = sorted.filter(v => filterStatus === 'All' || v.status === filterStatus);

  return (
    <SectionCard title="Venue Shortlist" icon="🏛">
      <SavedToast show={show} />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <select className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-700"
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
            <div><label className={labelCls}>Area</label><input className={ic} value={form.area} onChange={e => setForm(f => ({ ...f, area: e.target.value }))} /></div>
            <div><label className={labelCls}>Capacity</label><input type="number" className={ic} value={form.capacity} onChange={e => setForm(f => ({ ...f, capacity: e.target.value }))} /></div>
            <div><label className={labelCls}>Estimated Cost</label><input className={ic} value={form.cost} onChange={e => setForm(f => ({ ...f, cost: e.target.value }))} /></div>
            <div><label className={labelCls}>Private Room</label>
              <select className={ic} value={form.privateRoom} onChange={e => setForm(f => ({ ...f, privateRoom: e.target.value }))}>
                {['Yes', 'No', 'TBC'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>AV Capability</label>
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
          <div key={v.id} className={`border rounded-xl p-4 transition-all group ${v.selected ? 'border-[#242450] bg-[#242450]/5 ring-1 ring-[#242450]/20' : 'border-gray-200 bg-white hover:border-gray-300'}`}>
            {editingId === v.id ? (
              <div className="grid grid-cols-2 gap-3">
                <div><label className={labelCls}>Name</label><input className={ic} value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} /></div>
                <div><label className={labelCls}>Area</label><input className={ic} value={editDraft.area} onChange={e => setEditDraft(d => ({ ...d, area: e.target.value }))} /></div>
                <div><label className={labelCls}>Capacity</label><input type="number" className={ic} value={editDraft.capacity} onChange={e => setEditDraft(d => ({ ...d, capacity: e.target.value }))} /></div>
                <div><label className={labelCls}>Cost</label><input className={ic} value={editDraft.cost} onChange={e => setEditDraft(d => ({ ...d, cost: e.target.value }))} /></div>
                <div><label className={labelCls}>Private Room</label>
                  <select className={ic} value={editDraft.privateRoom} onChange={e => setEditDraft(d => ({ ...d, privateRoom: e.target.value }))}>
                    {['Yes', 'No', 'TBC'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>AV</label>
                  <select className={ic} value={editDraft.av} onChange={e => setEditDraft(d => ({ ...d, av: e.target.value }))}>
                    {['Yes', 'No', 'TBC'].map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>Status</label>
                  <select className={ic} value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                    {VENUE_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div><label className={labelCls}>URL</label><input className={ic} value={editDraft.url} onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))} /></div>
                <div className="col-span-2"><label className={labelCls}>Notes</label><input className={ic} value={editDraft.notes} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} /></div>
                <div className="col-span-2 flex gap-2 justify-end">
                  <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                  <button onClick={saveEdit} className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg">Save</button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`font-semibold text-sm ${v.selected ? 'text-[#242450]' : 'text-gray-800'}`}>{v.name}</span>
                    {v.selected && <Badge label="Selected" color="navy" />}
                    <Badge label={v.status} color={venueStatusColor[v.status]} />
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap mb-1.5">
                    <span>📍 {v.area}</span>
                    <span>👥 {v.capacity} cap</span>
                    <span>🚪 Private: {v.privateRoom}</span>
                    <span>🎤 AV: {v.av}</span>
                    <span>💷 {v.cost}</span>
                    {v.url && <a href={`https://${v.url}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-0.5 text-[#8403C5] hover:underline"><ExternalLink className="w-3 h-3" /> {v.url}</a>}
                  </div>
                  {v.notes && <p className="text-xs text-gray-400 italic">{v.notes}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => startEdit(v)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-gray-400 hover:text-[#8403C5] hover:bg-purple-50 transition-all" title="Edit"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => toggleSelect(v.id)} className={`p-1.5 rounded-lg transition-colors ${v.selected ? 'text-[#242450] bg-[#242450]/10' : 'text-gray-300 hover:text-[#242450] hover:bg-gray-100'}`} title="Mark as Selected">
                    <Star className={`w-4 h-4 ${v.selected ? 'fill-[#242450]' : ''}`} />
                  </button>
                  <button onClick={() => remove(v.id)} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 p-1.5 rounded-lg transition-all"><X className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ─── Section 4: Speaker Tracker ───────────────────────────────────────────────

const SPEAKER_SOURCES = ['Chris Network', 'LinkedIn', 'Agency', 'Inbound', 'Other'];
const SPEAKER_STATUSES = ['Identified', 'Approached', 'In Conversation', 'Confirmed', 'Declined'];
const EMPTY_SPEAKER = { name: '', company: '', topic: '', source: 'Chris Network', fee: '', status: 'Identified', notes: '', url: '' };

function SpeakerSection() {
  const [speakers, setSpeakers] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_SPEAKER);
  const [filterStatus, setFilterStatus] = useState('All');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const addSpeaker = () => {
    if (!form.name.trim()) return;
    setSpeakers(s => [...s, { ...form, id: Date.now() }]);
    setForm(EMPTY_SPEAKER);
    setShowForm(false);
    flash();
    log(`Speaker added: "${form.name}"`);
  };

  const update = (id, field, value) => {
    setSpeakers(s => s.map(x => x.id === id ? { ...x, [field]: value } : x));
    flash();
    const name = speakers.find(s => s.id === id)?.name;
    log(`Speaker "${name}": ${field} updated to "${value}"`);
  };

  const startEdit = (s) => { setEditingId(s.id); setEditDraft({ ...s }); };
  const saveEdit = () => {
    setSpeakers(s => s.map(x => x.id === editingId ? { ...editDraft } : x));
    flash();
    log(`Speaker "${editDraft.name}" edited`);
    setEditingId(null);
  };

  const remove = (id) => {
    const name = speakers.find(s => s.id === id)?.name;
    setSpeakers(s => s.filter(x => x.id !== id));
    log(`Speaker removed: "${name}"`);
  };

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
            <div className="col-span-2"><label className={labelCls}>Topic/Angle</label><input className={ic} value={form.topic} onChange={e => setForm(f => ({ ...f, topic: e.target.value }))} /></div>
            <div><label className={labelCls}>Source</label>
              <select className={ic} value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))}>
                {SPEAKER_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label className={labelCls}>Speaker Fee</label><input className={ic} value={form.fee} onChange={e => setForm(f => ({ ...f, fee: e.target.value }))} /></div>
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
              {['Name', 'Company', 'Topic', 'Source', 'Fee', 'Status', 'Notes', 'URL', ''].map(h => (
                <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {filtered.map(s => (
                editingId === s.id ? (
                  <tr key={s.id} className="border-b border-gray-100 bg-purple-50">
                    <td colSpan={9} className="px-3 py-3">
                      <div className="grid grid-cols-3 gap-2">
                        <input className={ic} placeholder="Name" value={editDraft.name} onChange={e => setEditDraft(d => ({ ...d, name: e.target.value }))} />
                        <input className={ic} placeholder="Company" value={editDraft.company} onChange={e => setEditDraft(d => ({ ...d, company: e.target.value }))} />
                        <input className={ic} placeholder="Topic" value={editDraft.topic} onChange={e => setEditDraft(d => ({ ...d, topic: e.target.value }))} />
                        <select className={ic} value={editDraft.source} onChange={e => setEditDraft(d => ({ ...d, source: e.target.value }))}>
                          {SPEAKER_SOURCES.map(o => <option key={o}>{o}</option>)}
                        </select>
                        <input className={ic} placeholder="Fee" value={editDraft.fee} onChange={e => setEditDraft(d => ({ ...d, fee: e.target.value }))} />
                        <select className={ic} value={editDraft.status} onChange={e => setEditDraft(d => ({ ...d, status: e.target.value }))}>
                          {SPEAKER_STATUSES.map(o => <option key={o}>{o}</option>)}
                        </select>
                        <input className={ic} placeholder="Notes" value={editDraft.notes} onChange={e => setEditDraft(d => ({ ...d, notes: e.target.value }))} />
                        <input className={ic} placeholder="URL" value={editDraft.url} onChange={e => setEditDraft(d => ({ ...d, url: e.target.value }))} />
                        <div className="flex gap-2 items-center">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button onClick={saveEdit} className="px-3 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg">Save</button>
                        </div>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={s.id} className={`border-b border-gray-100 last:border-0 group transition-colors ${s.status === 'Confirmed' ? 'bg-green-50' : 'hover:bg-gray-50'}`}>
                    <td className="px-3 py-2.5 font-medium text-[#242450]">{s.name}</td>
                    <td className="px-3 py-2.5 text-gray-600">{s.company}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs max-w-[140px]">{s.topic}</td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{s.source}</td>
                    <td className="px-3 py-2.5 text-gray-600 text-xs whitespace-nowrap">{s.fee}</td>
                    <td className="px-3 py-2.5"><InlineSelect value={s.status} options={SPEAKER_STATUSES} onChange={v => update(s.id, 'status', v)} /></td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs max-w-[120px] truncate">{s.notes}</td>
                    <td className="px-3 py-2.5">{s.url && <a href={s.url.startsWith('http') ? s.url : `https://${s.url}`} target="_blank" rel="noopener noreferrer" className="text-[#8403C5] hover:underline text-xs flex items-center gap-0.5"><ExternalLink className="w-3 h-3" /></a>}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button onClick={() => startEdit(s)} className="p-1 text-gray-400 hover:text-[#8403C5]"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => remove(s.id)} className="p-1 text-gray-300 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                      </div>
                    </td>
                  </tr>
                )
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
  { id: 5, item: 'AV / Mic Setup', estimated: 350, actual: '', status: 'TBC', notes: "Only if venue doesn't include" },
  { id: 6, item: 'Printed Menus & Light Branding', estimated: 150, actual: '', status: 'TBC', notes: 'Menus, table cards, banner' },
];

function BudgetSection() {
  const [items, setItems] = useState(INITIAL_BUDGET);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ item: '', estimated: '', actual: '', status: 'Not Started', notes: '' });
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const update = (id, field, value) => {
    setItems(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    flash();
    const name = items.find(x => x.id === id)?.item;
    log(`Budget "${name}": ${field} updated`);
  };

  const remove = (id) => {
    const name = items.find(x => x.id === id)?.item;
    setItems(prev => prev.filter(x => x.id !== id));
    log(`Budget item removed: "${name}"`);
  };

  const addItem = () => {
    if (!form.item.trim()) return;
    setItems(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ item: '', estimated: '', actual: '', status: 'Not Started', notes: '' });
    setShowForm(false);
    flash();
    log(`Budget item added: "${form.item}"`);
  };

  const totalEst = items.reduce((s, x) => s + (parseFloat(x.estimated) || 0), 0);
  const totalAct = items.reduce((s, x) => s + (parseFloat(x.actual) || 0), 0);
  const budgetStatus = totalEst < 7000 ? { label: 'Within Budget', color: 'green' }
    : totalEst <= 9000 ? { label: 'Review Needed', color: 'amber' }
    : { label: 'Over Budget', color: 'red' };

  return (
    <SectionCard title="Budget Tracker" icon="💷">
      <SavedToast show={show} />
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
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {items.map(x => (
              <tr key={x.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50 group transition-colors">
                <td className="px-3 py-2"><InlineText value={x.item} onChange={v => update(x.id, 'item', v)} /></td>
                <td className="px-3 py-2">
                  <input type="number" className="w-24 text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#8403C5]/30"
                    value={x.estimated} onChange={e => update(x.id, 'estimated', e.target.value)} />
                </td>
                <td className="px-3 py-2">
                  <input type="number" className="w-24 text-sm border border-gray-200 rounded px-2 py-1 bg-white focus:outline-none focus:ring-1 focus:ring-[#8403C5]/30"
                    value={x.actual} onChange={e => update(x.id, 'actual', e.target.value)} placeholder="—" />
                </td>
                <td className="px-3 py-2"><InlineSelect value={x.status} options={BUDGET_STATUSES} onChange={v => update(x.id, 'status', v)} /></td>
                <td className="px-3 py-2"><InlineText value={x.notes} onChange={v => update(x.id, 'notes', v)} /></td>
                <td className="px-3 py-2"><button onClick={() => remove(x.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
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
  const [show, flash] = useSavedToast();
  const log = useActivity();

  const update = (id, field, value) => {
    setActions(prev => prev.map(x => x.id === id ? { ...x, [field]: value } : x));
    flash();
    const name = actions.find(x => x.id === id)?.action;
    log(`Action "${name}": ${field} updated to "${value}"`);
  };

  const remove = (id) => {
    const name = actions.find(x => x.id === id)?.action;
    setActions(prev => prev.filter(x => x.id !== id));
    log(`Action removed: "${name}"`);
  };

  const addAction = () => {
    if (!form.action.trim()) return;
    setActions(prev => [...prev, { ...form, id: Date.now() }]);
    setForm({ action: '', owner: 'Chris', due: '', status: 'Not Started', notes: '' });
    setShowForm(false);
    flash();
    log(`Action added: "${form.action}"`);
  };

  const filtered = actions
    .filter(a => (filterOwner === 'All' || a.owner === filterOwner) && (filterStatus === 'All' || a.status === filterStatus))
    .sort((a, b) => (a.status === 'Done' ? 1 : 0) - (b.status === 'Done' ? 1 : 0));

  const openCount = actions.filter(a => a.status !== 'Done').length;

  return (
    <SectionCard title="Action Tracker" icon="✅">
      <SavedToast show={show} />
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <Badge label={`${openCount} Open Actions`} color="amber" />
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
              <th key={h} className="px-3 py-2.5 text-left text-[10px] font-bold text-gray-400 uppercase tracking-wide whitespace-nowrap">{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {filtered.map(a => (
              <tr key={a.id} className={`border-b border-gray-100 last:border-0 group transition-colors ${a.status === 'Done' ? 'bg-green-50 opacity-70' : 'hover:bg-gray-50'}`}>
                <td className={`px-3 py-2 ${a.status === 'Done' ? 'line-through text-gray-400' : ''}`}>
                  <InlineText value={a.action} onChange={v => update(a.id, 'action', v)} />
                </td>
                <td className="px-3 py-2"><InlineSelect value={a.owner} options={ACTION_OWNERS} onChange={v => update(a.id, 'owner', v)} /></td>
                <td className="px-3 py-2"><InlineDate value={a.due} onChange={v => update(a.id, 'due', v)} /></td>
                <td className="px-3 py-2"><InlineSelect value={a.status} options={ACTION_STATUSES} onChange={v => update(a.id, 'status', v)} /></td>
                <td className="px-3 py-2"><InlineText value={a.notes} onChange={v => update(a.id, 'notes', v)} /></td>
                <td className="px-3 py-2"><button onClick={() => remove(a.id)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"><X className="w-3.5 h-3.5" /></button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </SectionCard>
  );
}

// ─── Section 7: Notes & Context (editable) ───────────────────────────────────

const NOTES_DEFAULT = `AIF PARTNERSHIP
Eventwise is building a growing partnership with AIF (Association of Independent Festivals). An email has been sent to John Rostron (AIF CEO) proposing sponsorship of the Festival Congress 2027 morning coffee slot and a Finance Roundtable session. The dinner roadshow is a separate, Eventwise-owned initiative running in parallel.

FORMAT RATIONALE
Course-based seating rotation chosen to maximise networking across all 20 guests. AI in Events theme chosen as a timely, practical topic relevant to both festival organisers and production agencies. Deliberately positioned as an industry event, not a product demo or sales dinner.

PILOT APPROACH
Start in London for feedback and refinement before expanding regionally. Target timing: October–November 2026 or January–March 2027. Free to attend for the pilot; potential to introduce a £50–100 ticket price if the format proves successful.

SPEAKER APPROACH
Do not use a speaker agency for the pilot. Identify someone through Chris's network — ideally a festival/event tech founder, consultant, or practitioner who has real experience deploying AI in live events. Warm referral preferred. Budget: £500–£2,500.

VENUE APPROACH
Central London. Private dining room for exactly 20. Must have AV/mic capability or be able to accommodate it. Midweek preferred (Tue/Wed) for 15–20% venue cost saving. Minimum spend model preferred over flat hire fee where possible.`;

function NotesContextSection() {
  const [open, setOpen] = useState(false);
  const [notes, setNotes] = useState(NOTES_DEFAULT);
  const [lastEdited, setLastEdited] = useState(null);
  const [show, flash] = useSavedToast();
  const log = useActivity();
  const timer = useRef(null);

  const handleChange = (val) => {
    setNotes(val);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      setLastEdited(fmtNow());
      flash();
      log('Background & Research Notes updated');
    }, 800);
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      <SavedToast show={show} />
      <button className="w-full flex items-center justify-between px-6 py-4 bg-[#242450] text-white text-left hover:bg-[#1a1a3a] transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <span>📋</span>
          <span className="text-sm font-semibold tracking-wide">Background & Research Notes</span>
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && (
        <div className="px-6 py-5">
          <textarea
            className="w-full text-sm text-gray-700 leading-relaxed bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#8403C5]/20 resize-none"
            rows={20}
            value={notes}
            onChange={e => handleChange(e.target.value)}
            placeholder="Add background notes, research, context…"
          />
          {lastEdited && (
            <p className="text-xs text-gray-400 mt-2">Last edited on {lastEdited}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Section 8: Activity Log ──────────────────────────────────────────────────

function ActivityLogSection({ entries }) {
  const [open, setOpen] = useState(false);
  const [showAll, setShowAll] = useState(false);
  const displayed = showAll ? entries.slice(0, 50) : entries.slice(0, 10);

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden mb-5">
      <button className="w-full flex items-center justify-between px-6 py-4 bg-[#242450] text-white text-left hover:bg-[#1a1a3a] transition-colors" onClick={() => setOpen(o => !o)}>
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 opacity-70" />
          <span className="text-sm font-semibold tracking-wide">Activity Log</span>
          {entries.length > 0 && <span className="text-[11px] font-semibold bg-white/20 px-2 py-0.5 rounded-full">{entries.length}</span>}
        </div>
        {open ? <ChevronDown className="w-4 h-4 opacity-60" /> : <ChevronRight className="w-4 h-4 opacity-60" />}
      </button>
      {open && (
        <div className="px-6 py-4">
          {entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No activity yet — edits and changes will appear here automatically.</p>
          ) : (
            <>
              <div className="space-y-0 divide-y divide-gray-100">
                {displayed.map((e, i) => (
                  <div key={i} className="flex items-start gap-3 py-2.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#8403C5]/40 mt-2 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700">{e.message}</span>
                    </div>
                    <span className="text-xs text-gray-400 shrink-0 whitespace-nowrap">{e.time}</span>
                  </div>
                ))}
              </div>
              {entries.length > 10 && !showAll && (
                <button onClick={() => setShowAll(true)} className="mt-3 text-xs text-[#8403C5] hover:underline font-medium">
                  Load more ({entries.length - 10} remaining)
                </button>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main Export ──────────────────────────────────────────────────────────────

export default function DinnerRoadshow() {
  const [activityLog, setActivityLog] = useState([]);

  const logActivity = useCallback((message) => {
    setActivityLog(prev => [{ message, time: fmtNow() }, ...prev].slice(0, 50));
  }, []);

  return (
    <ActivityContext.Provider value={logActivity}>
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
          <ActivityLogSection entries={activityLog} />
        </div>
      </div>
    </ActivityContext.Provider>
  );
}