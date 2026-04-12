import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Pencil, Trash2, Plus, Check, X, ExternalLink } from 'lucide-react';
import ConfirmDialog from '@/components/shared/ConfirmDialog';

const DEFAULT_DATA = {
  handbookUrl: '',
  teamNote: "Elena is based in South Africa (SAST, UTC+2). Rest of team UK-based. Account for 2-hour time difference on calls.",
  techNote: "Credentials not stored here. See [password manager] for logins.",
  team: [
    { id: 1, name: 'Chris Carter', role: 'CEO', responsibilities: 'Sales, product direction, client relationships, investor comms, CS oversight' },
    { id: 2, name: 'Elena Brouckaert', role: 'Head of Ops & Marketing', responsibilities: 'Marketing, reporting, internal tooling, operations, content strategy, proposals' },
    { id: 3, name: 'Martinique', role: 'Customer Success', responsibilities: 'Onboarding, client health, renewals, day-to-day client support' },
    { id: 4, name: 'George', role: 'SDR', responsibilities: 'Outbound lead generation, prospecting, LinkedIn outreach' },
    { id: 5, name: 'Ramesh', role: 'Fractional CRO', responsibilities: 'Sales strategy, pipeline oversight, CRO function (~2 days/week)' },
    { id: 6, name: 'Sreeja', role: 'QA', responsibilities: 'Product testing, bug tracking, release validation' },
    { id: 7, name: 'David', role: 'CFO', responsibilities: 'Financial oversight, investor reporting, board management, funding round management' },
  ],
  tech: [
    { id: 1, tool: 'Eventwise HQ (Base44)', what: 'Internal ops platform — all modules', owner: 'Elena', status: 'Active' },
    { id: 2, tool: 'Apollo.io', what: 'Outbound CRM, sequences, contact database', owner: 'George / Chris', status: 'Active' },
    { id: 3, tool: 'Framer', what: 'Website (eventwise.com)', owner: 'Elena', status: 'Active' },
    { id: 4, tool: 'GitHub Pages (elena486/eventwise-assets)', what: 'HTML sales deck + client deck embedded in Framer', owner: 'Elena', status: 'Active' },
    { id: 5, tool: 'GA4 + Google Search Console', what: 'Website analytics', owner: 'Elena', status: 'Active' },
    { id: 6, tool: 'Looker Studio', what: 'Marketing dashboard', owner: 'Elena', status: 'Active' },
    { id: 7, tool: 'Beehiiv', what: 'Client newsletter (replaced Mailchimp)', owner: 'Elena', status: 'Active' },
    { id: 8, tool: 'Tally', what: 'Forms — Form ID: q4W2Gg. Replaced Typeform.', owner: 'Elena', status: 'Active' },
    { id: 9, tool: 'Canva', what: 'Design assets', owner: 'Elena', status: 'Active' },
    { id: 10, tool: 'Google Workspace', what: 'Email, Drive, Docs, Calendar — all team', owner: 'All', status: 'Active' },
    { id: 11, tool: 'Monday.com', what: 'Being cancelled — replaced by Apollo + Eventwise HQ', owner: 'Elena', status: 'Cancelling' },
    { id: 12, tool: 'Notion', what: 'Being cancelled — replaced by Eventwise HQ + Google Docs', owner: 'Elena', status: 'Cancelling' },
    { id: 13, tool: 'Typeform', what: 'Replaced by Tally', owner: 'Elena', status: 'Cancelled' },
    { id: 14, tool: 'Figma', what: 'Cancelled — not in use', owner: '—', status: 'Cancelled' },
  ],
  assets: [
    { id: 1, asset: 'Website', link: 'https://eventwise.com' },
    { id: 2, asset: 'Sales Deck', link: 'https://elena486.github.io/eventwise-assets/eventwise-sales-deck.html' },
    { id: 3, asset: 'Client Retention Deck', link: 'https://elena486.github.io/eventwise-assets/eventwise-client-deck.html' },
    { id: 4, asset: 'GitHub Repo', link: 'https://github.com/elena486/eventwise-assets' },
    { id: 5, asset: 'Tally Form', link: 'https://tally.so/r/q4W2Gg' },
    { id: 6, asset: 'Looker Studio', link: '' },
    { id: 7, asset: 'Brand constants', link: 'Navy #242450 / Purple #8403C5 / Steel #5777AB / Font: DM Sans' },
  ],
  processes: [
    { id: 1, title: 'Sprint Cadence', bullets: [
      'Weekly updates submitted every Monday by all team via the Sprints tab',
      'Chris reviews dashboard — RAG per person, trend charts, custom date range',
      'Monthly sprint retrospective reviewed by Elena and Chris on their regular call',
    ]},
    { id: 2, title: 'Marketing Reporting', bullets: [
      'Monthly reports built and sent from Marketing > Reporting tab',
      'Sent to Chris by the 5th of each month',
      'Looker Studio dashboard updated monthly as visual companion',
    ]},
    { id: 3, title: 'Sales & Pipeline', bullets: [
      'Outbound managed in Apollo by George',
      'Active deals in Pipeline tab — Closed Won auto-creates a client record in CS tab',
      'Proposals generated and sent from Proposals tab',
    ]},
    { id: 4, title: 'Customer Success & Onboarding', bullets: [
      'All clients in CS tab — Martinique primary owner',
      '9-step onboarding checklist per client',
      'Health scores reviewed monthly — Red accounts flagged immediately',
      'Renewals auto-flagged 60 days in advance',
    ]},
    { id: 5, title: 'Content & LinkedIn', bullets: [
      'Chris LinkedIn ghostwritten and scheduled by Elena — target 3–4 posts/month',
      'Content tracked in Marketing > Content Hub tab',
      'Newsletter sent monthly via Beehiiv',
    ]},
    { id: 6, title: 'Website', bullets: [
      'Framer for all page edits — Elena owns',
      'HTML decks on GitHub Pages — push to repo to update, no Framer changes needed',
    ]},
  ],
  contacts: [
    { id: 1, name: 'John Rostron', org: 'CEO, AIF (Association of Independent Festivals)', context: 'Key industry partner. Target for Festival Congress 2027 sponsorship + Finance Roundtable.' },
    { id: 2, name: 'Archie Edwards', org: 'Content / Agency', context: 'Contact for content shoot days — Eventwise and In The Loop Accounts.' },
  ],
};

const STATUS_COLORS = { Active: 'bg-green-50 text-green-700', Cancelling: 'bg-amber-50 text-amber-700', Cancelled: 'bg-red-50 text-red-500' };

function useEditTable(key, data, setData) {
  const [editId, setEditId] = useState(null);
  const [editRow, setEditRow] = useState({});
  const [confirmId, setConfirmId] = useState(null);

  const startEdit = (row) => { setEditId(row.id); setEditRow({ ...row }); };
  const saveEdit = () => {
    setData(prev => ({ ...prev, [key]: prev[key].map(r => r.id === editId ? editRow : r) }));
    setEditId(null);
  };
  const cancelEdit = () => setEditId(null);
  const confirmDelete = (id) => setConfirmId(id);
  const doDelete = () => {
    setData(prev => ({ ...prev, [key]: prev[key].filter(r => r.id !== confirmId) }));
    setConfirmId(null);
  };
  const addRow = (defaults) => {
    const id = Date.now();
    const row = { id, ...defaults };
    setData(prev => ({ ...prev, [key]: [...prev[key], row] }));
    setEditId(id); setEditRow(row);
  };

  return { editId, editRow, setEditRow, confirmId, setConfirmId, startEdit, saveEdit, cancelEdit, confirmDelete, doDelete, addRow };
}

const ic = "border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-[#8403C5] w-full";

export default function Handbook() {
  const [data, setData] = useState(DEFAULT_DATA);
  const [loaded, setLoaded] = useState(false);
  const [editingUrl, setEditingUrl] = useState(false);
  const [urlDraft, setUrlDraft] = useState('');

  // Persist via HandbookSection entity
  useEffect(() => {
    base44.entities.HandbookSection.filter({ sectionKey: 'main' }).then(results => {
      if (results.length > 0) {
        try { const d = JSON.parse(results[0].data || '{}'); setData(prev => ({ ...DEFAULT_DATA, ...d })); } catch {}
      }
      setLoaded(true);
    });
  }, []);

  const persist = (newData) => {
    base44.entities.HandbookSection.filter({ sectionKey: 'main' }).then(results => {
      const payload = { sectionKey: 'main', data: JSON.stringify(newData) };
      if (results.length > 0) base44.entities.HandbookSection.update(results[0].id, payload);
      else base44.entities.HandbookSection.create(payload);
    });
  };

  const update = (newData) => { setData(newData); persist(newData); };

  const teamEdit = useEditTable('team', data, update);
  const techEdit = useEditTable('tech', data, update);
  const assetEdit = useEditTable('assets', data, update);
  const contactEdit = useEditTable('contacts', data, update);
  const [procConfirmId, setProcConfirmId] = useState(null);

  const SectionHeader = ({ title }) => (
    <h2 className="text-base font-bold text-gray-900 mb-3 pt-1">{title}</h2>
  );

  const EditActions = ({ row, ctrl }) => (
    <div className="flex gap-1 justify-end">
      <button onClick={() => ctrl.startEdit(row)} className="p-1 text-gray-300 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
      <button onClick={() => ctrl.confirmDelete(row.id)} className="p-1 text-gray-300 hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );

  const SaveCancel = ({ ctrl }) => (
    <div className="flex gap-1">
      <button onClick={ctrl.saveEdit} className="p-1 text-green-500"><Check className="w-4 h-4" /></button>
      <button onClick={ctrl.cancelEdit} className="p-1 text-gray-400"><X className="w-4 h-4" /></button>
    </div>
  );

  if (!loaded) return <div className="p-8 text-gray-400 text-sm">Loading...</div>;

  return (
    <div className="flex-1 overflow-y-auto bg-[#f5f6fa] p-6 font-dm">
      {/* Open full handbook button */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
        <div className="flex items-center gap-3 mb-2">
          {editingUrl ? (
            <div className="flex items-center gap-2 flex-1">
              <input className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#8403C5]"
                value={urlDraft} onChange={e => setUrlDraft(e.target.value)} placeholder="https://docs.google.com/..." />
              <button onClick={() => { update({ ...data, handbookUrl: urlDraft }); setEditingUrl(false); }} className="text-green-500"><Check className="w-4 h-4" /></button>
              <button onClick={() => setEditingUrl(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
            </div>
          ) : (
            <>
              <a href={data.handbookUrl || '#'} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 px-5 py-2.5 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#6d02a3] transition-colors">
                📄 Open Full Handbook <ExternalLink className="w-4 h-4" />
              </a>
              <button onClick={() => { setUrlDraft(data.handbookUrl || ''); setEditingUrl(true); }} className="text-gray-300 hover:text-gray-600"><Pencil className="w-3.5 h-3.5" /></button>
            </>
          )}
        </div>
        <p className="text-xs text-gray-400">Full handbook lives in Google Docs. The sections below are a quick-access in-app summary.</p>
      </div>

      <div className="space-y-6 max-w-5xl">
        {/* Section 1 — Team & Roles */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Team & Roles" />
          <table className="w-full text-sm mb-3">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Name</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Role</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Responsibilities</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.team.map(row => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  {teamEdit.editId === row.id ? (
                    <>
                      <td className="px-2 py-1.5"><input className={ic} value={teamEdit.editRow.name} onChange={e => teamEdit.setEditRow(p => ({...p, name: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={teamEdit.editRow.role} onChange={e => teamEdit.setEditRow(p => ({...p, role: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={teamEdit.editRow.responsibilities} onChange={e => teamEdit.setEditRow(p => ({...p, responsibilities: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><SaveCancel ctrl={teamEdit} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{row.role}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.responsibilities}</td>
                      <td className="px-3 py-2"><EditActions row={row} ctrl={teamEdit} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <EditableNote value={data.teamNote} onChange={v => update({ ...data, teamNote: v })} />
          <button onClick={() => teamEdit.addRow({ name: '', role: '', responsibilities: '' })}
            className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline mt-2">
            <Plus className="w-3.5 h-3.5" /> Add Team Member
          </button>
          {teamEdit.confirmId && <ConfirmDialog onConfirm={teamEdit.doDelete} onCancel={() => teamEdit.setConfirmId(null)} />}
        </div>

        {/* Section 2 — Tech Stack */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Tech Stack" />
          <table className="w-full text-sm mb-3">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Tool</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">What it's for</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Owner</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.tech.map(row => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  {techEdit.editId === row.id ? (
                    <>
                      <td className="px-2 py-1.5"><input className={ic} value={techEdit.editRow.tool} onChange={e => techEdit.setEditRow(p => ({...p, tool: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={techEdit.editRow.what} onChange={e => techEdit.setEditRow(p => ({...p, what: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={techEdit.editRow.owner} onChange={e => techEdit.setEditRow(p => ({...p, owner: e.target.value}))} /></td>
                      <td className="px-2 py-1.5">
                        <select className={ic} value={techEdit.editRow.status} onChange={e => techEdit.setEditRow(p => ({...p, status: e.target.value}))}>
                          {['Active','Cancelling','Cancelled'].map(s => <option key={s}>{s}</option>)}
                        </select>
                      </td>
                      <td className="px-2 py-1.5"><SaveCancel ctrl={techEdit} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900 text-xs">{row.tool}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.what}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.owner}</td>
                      <td className="px-3 py-2"><span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLORS[row.status] || 'bg-gray-50 text-gray-500'}`}>{row.status}</span></td>
                      <td className="px-3 py-2"><EditActions row={row} ctrl={techEdit} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <EditableNote value={data.techNote} onChange={v => update({ ...data, techNote: v })} />
          <button onClick={() => techEdit.addRow({ tool: '', what: '', owner: '', status: 'Active' })}
            className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline mt-2">
            <Plus className="w-3.5 h-3.5" /> Add Tool
          </button>
          {techEdit.confirmId && <ConfirmDialog onConfirm={techEdit.doDelete} onCancel={() => techEdit.setConfirmId(null)} />}
        </div>

        {/* Section 3 — Key Assets */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Key Assets & Links" />
          <table className="w-full text-sm mb-3">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Asset</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Link</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.assets.map(row => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  {assetEdit.editId === row.id ? (
                    <>
                      <td className="px-2 py-1.5"><input className={ic} value={assetEdit.editRow.asset} onChange={e => assetEdit.setEditRow(p => ({...p, asset: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={assetEdit.editRow.link} onChange={e => assetEdit.setEditRow(p => ({...p, link: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><SaveCancel ctrl={assetEdit} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900 text-sm">{row.asset}</td>
                      <td className="px-3 py-2">
                        {row.link?.startsWith('http') ? (
                          <a href={row.link} target="_blank" rel="noreferrer" className="text-[#8403C5] hover:underline text-xs flex items-center gap-1"><ExternalLink className="w-3 h-3" />{row.link}</a>
                        ) : <span className="text-xs text-gray-500">{row.link || '—'}</span>}
                      </td>
                      <td className="px-3 py-2"><EditActions row={row} ctrl={assetEdit} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => assetEdit.addRow({ asset: '', link: '' })}
            className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add Asset
          </button>
          {assetEdit.confirmId && <ConfirmDialog onConfirm={assetEdit.doDelete} onCancel={() => assetEdit.setConfirmId(null)} />}
        </div>

        {/* Section 4 — Processes */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Key Processes" />
          <div className="space-y-5">
            {data.processes.map((proc, pi) => (
              <ProcessSection key={proc.id} proc={proc}
                onUpdate={(updated) => {
                  const procs = data.processes.map(p => p.id === proc.id ? updated : p);
                  update({ ...data, processes: procs });
                }}
                onDelete={() => setProcConfirmId(proc.id)}
              />
            ))}
          </div>
          <button onClick={() => {
            const id = Date.now();
            update({ ...data, processes: [...data.processes, { id, title: 'New Section', bullets: [] }] });
          }} className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline mt-4">
            <Plus className="w-3.5 h-3.5" /> Add Process Section
          </button>
          {procConfirmId && <ConfirmDialog
            onConfirm={() => { update({ ...data, processes: data.processes.filter(p => p.id !== procConfirmId) }); setProcConfirmId(null); }}
            onCancel={() => setProcConfirmId(null)}
          />}
        </div>

        {/* Section 5 — Contacts */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <SectionHeader title="Key External Contacts" />
          <table className="w-full text-sm mb-3">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Name</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Organisation</th>
                <th className="text-left text-xs font-semibold text-gray-400 px-3 py-2">Context</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {data.contacts.map(row => (
                <tr key={row.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                  {contactEdit.editId === row.id ? (
                    <>
                      <td className="px-2 py-1.5"><input className={ic} value={contactEdit.editRow.name} onChange={e => contactEdit.setEditRow(p => ({...p, name: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={contactEdit.editRow.org} onChange={e => contactEdit.setEditRow(p => ({...p, org: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><input className={ic} value={contactEdit.editRow.context} onChange={e => contactEdit.setEditRow(p => ({...p, context: e.target.value}))} /></td>
                      <td className="px-2 py-1.5"><SaveCancel ctrl={contactEdit} /></td>
                    </>
                  ) : (
                    <>
                      <td className="px-3 py-2 font-medium text-gray-900">{row.name}</td>
                      <td className="px-3 py-2 text-gray-600 text-xs">{row.org}</td>
                      <td className="px-3 py-2 text-gray-500 text-xs">{row.context}</td>
                      <td className="px-3 py-2"><EditActions row={row} ctrl={contactEdit} /></td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
          <button onClick={() => contactEdit.addRow({ name: '', org: '', context: '' })}
            className="flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline">
            <Plus className="w-3.5 h-3.5" /> Add Contact
          </button>
          {contactEdit.confirmId && <ConfirmDialog onConfirm={contactEdit.doDelete} onCancel={() => contactEdit.setConfirmId(null)} />}
        </div>
      </div>
    </div>
  );
}

function EditableNote({ value, onChange }) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState('');
  return (
    <div className="mt-2">
      {editing ? (
        <div className="flex items-start gap-2">
          <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs outline-none focus:border-[#8403C5]"
            value={draft} onChange={e => setDraft(e.target.value)} />
          <button onClick={() => { onChange(draft); setEditing(false); }} className="text-green-500"><Check className="w-4 h-4" /></button>
          <button onClick={() => setEditing(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
        </div>
      ) : (
        <div className="flex items-start gap-2 group">
          <p className="text-xs text-gray-400 italic flex-1">{value}</p>
          <button onClick={() => { setDraft(value); setEditing(true); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600 transition-opacity"><Pencil className="w-3 h-3" /></button>
        </div>
      )}
    </div>
  );
}

function ProcessSection({ proc, onUpdate, onDelete }) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const [editBullet, setEditBullet] = useState(null);
  const [bulletDraft, setBulletDraft] = useState('');
  const [confirmBullet, setConfirmBullet] = useState(null);

  const saveTitle = () => { onUpdate({ ...proc, title: titleDraft }); setEditingTitle(false); };
  const saveBullet = () => {
    const bullets = proc.bullets.map((b, i) => i === editBullet ? bulletDraft : b);
    onUpdate({ ...proc, bullets }); setEditBullet(null);
  };
  const deleteBullet = () => {
    onUpdate({ ...proc, bullets: proc.bullets.filter((_, i) => i !== confirmBullet) });
    setConfirmBullet(null);
  };
  const addBullet = () => {
    const bullets = [...proc.bullets, 'New bullet point'];
    onUpdate({ ...proc, bullets });
    setEditBullet(bullets.length - 1); setBulletDraft('New bullet point');
  };

  return (
    <div className="border-l-2 border-[#8403C5]/20 pl-4">
      <div className="flex items-center gap-2 mb-2">
        {editingTitle ? (
          <div className="flex items-center gap-2 flex-1">
            <input className="border border-gray-200 rounded px-2 py-1 text-sm font-semibold outline-none focus:border-[#8403C5]"
              value={titleDraft} onChange={e => setTitleDraft(e.target.value)} />
            <button onClick={saveTitle} className="text-green-500"><Check className="w-4 h-4" /></button>
            <button onClick={() => setEditingTitle(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-center gap-2 group flex-1">
            <h3 className="text-sm font-bold text-gray-800">{proc.title}</h3>
            <button onClick={() => { setTitleDraft(proc.title); setEditingTitle(true); }} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
            <button onClick={onDelete} className="opacity-0 group-hover:opacity-100 text-gray-300 hover:text-red-500 ml-auto"><Trash2 className="w-3 h-3" /></button>
          </div>
        )}
      </div>
      <ul className="space-y-1">
        {proc.bullets.map((b, i) => (
          <li key={i} className="group flex items-start gap-2">
            {editBullet === i ? (
              <div className="flex items-center gap-2 flex-1">
                <input className="flex-1 border border-gray-200 rounded px-2 py-0.5 text-xs outline-none focus:border-[#8403C5]"
                  value={bulletDraft} onChange={e => setBulletDraft(e.target.value)} />
                <button onClick={saveBullet} className="text-green-500"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditBullet(null)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
              </div>
            ) : (
              <>
                <span className="text-gray-400 text-xs mt-0.5">•</span>
                <span className="text-xs text-gray-600 flex-1">{b}</span>
                <div className="opacity-0 group-hover:opacity-100 flex gap-1">
                  <button onClick={() => { setEditBullet(i); setBulletDraft(b); }} className="text-gray-300 hover:text-gray-600"><Pencil className="w-3 h-3" /></button>
                  <button onClick={() => setConfirmBullet(i)} className="text-gray-300 hover:text-red-500"><Trash2 className="w-3 h-3" /></button>
                </div>
              </>
            )}
          </li>
        ))}
      </ul>
      <button onClick={addBullet} className="flex items-center gap-1 text-xs text-gray-400 hover:text-[#8403C5] mt-1">
        <Plus className="w-3 h-3" /> Add bullet
      </button>
      {confirmBullet !== null && <ConfirmDialog onConfirm={deleteBullet} onCancel={() => setConfirmBullet(null)} />}
    </div>
  );
}