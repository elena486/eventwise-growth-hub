import React, { useState, useRef } from 'react';
import { Pencil, Trash2, Plus, Check, X, Mail, Upload, User } from 'lucide-react';
import HandbookPageShell from '../HandbookPageShell';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

const DEFAULT_TEAM = [
  { id: 1, name: 'Chris Carter',      role: 'CEO',                    email: 'chris@eventwise.com',  responsibilities: ['Sales, product direction, client relationships', 'Investor comms and board management', 'CS oversight'] },
  { id: 2, name: 'Elena Brouckaert', role: 'Head of Ops & Marketing', email: 'elena@eventwise.com',  responsibilities: ['Marketing, reporting, content strategy', 'Internal tooling and operations', 'Proposals and sales support'] },
  { id: 3, name: 'Martinique',        role: 'Customer Success',        email: '',                     responsibilities: ['Onboarding new clients', 'Client health monitoring and renewals', 'Day-to-day client support'] },
  { id: 4, name: 'George',            role: 'SDR',                     email: 'george@eventwise.com', responsibilities: ['Outbound lead generation and prospecting', 'LinkedIn outreach', 'Apollo sequence management'] },
  { id: 5, name: 'Ramesh',            role: 'Fractional CRO',          email: '',                     responsibilities: ['Sales strategy and pipeline oversight', 'CRO function (~2 days/week)'] },
  { id: 6, name: 'Sreeja',            role: 'QA',                      email: '',                     responsibilities: ['Product testing and bug tracking', 'Release validation', 'QA process ownership'] },
  { id: 7, name: 'David',             role: 'CFO',                     email: '',                     responsibilities: ['Financial oversight and investor reporting', 'Board management', 'Funding round management'] },
];

const ic = 'w-full text-xs border border-ew-border rounded-lg px-2 py-1.5 outline-none focus:border-[#8403C5] bg-white';

function TeamCard({ member, onEdit, onDelete, canEdit }) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 relative group shadow-sm hover:shadow-md transition-shadow">
      {canEdit && (
        <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button onClick={() => onEdit(member)} className="p-1 text-ew-muted hover:text-[#242450] rounded transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
          <button onClick={() => onDelete(member.id)} className="p-1 text-ew-muted hover:text-red-500 rounded transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3 pr-12">
        {member.photoUrl ? (
          <img src={member.photoUrl} alt={member.name} className="w-10 h-10 rounded-full object-cover shrink-0 border border-[#E5E7EB]" />
        ) : (
          <div className="w-10 h-10 rounded-full bg-[#F3E8FF] flex items-center justify-center shrink-0">
            <User className="w-5 h-5 text-[#8403C5]" />
          </div>
        )}
        <div>
          <p className="text-[16px] font-semibold text-[#111827] leading-tight">{member.name}</p>
          {member.email && (
            <a href={`mailto:${member.email}`}
              className="inline-flex items-center gap-1 text-[12px] text-ew-muted hover:text-[#8403C5] transition-colors mt-0.5">
              <Mail className="w-2.5 h-2.5" /> {member.email}
            </a>
          )}
        </div>
      </div>

      <span className="inline-block text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#8403C5] text-white mb-3">
        {member.role}
      </span>

      <ul className="space-y-1">
        {(member.responsibilities || []).map((r, i) => (
          <li key={i} className="flex items-start gap-1.5 text-[13px] text-[#6B7280]">
            <span className="text-[#8403C5] shrink-0 mt-0.5">•</span>
            {r}
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeamEditModal({ member, onSave, onClose }) {
  const [draft, setDraft] = useState({ ...member });
  const [respStr, setRespStr] = useState((member.responsibilities || []).join('\n'));
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const save = () => {
    const responsibilities = respStr.split('\n').map(s => s.trim()).filter(Boolean);
    onSave({ ...draft, responsibilities });
  };

  const handlePhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    setDraft(d => ({ ...d, photoUrl: file_url }));
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h3 className="text-sm font-bold text-navy mb-4">{member.id ? 'Edit Team Member' : 'Add Team Member'}</h3>
        <div className="space-y-3">
          {/* Photo */}
          <div>
            <label className="block text-[11px] font-semibold text-ew-muted mb-1">Photo</label>
            <div className="flex items-center gap-3">
              {draft.photoUrl ? (
                <img src={draft.photoUrl} alt={draft.name} className="w-12 h-12 rounded-full object-cover border border-[#E5E7EB]" />
              ) : (
                <div className="w-12 h-12 rounded-full bg-[#F3E8FF] flex items-center justify-center">
                  <User className="w-6 h-6 text-[#8403C5]" />
                </div>
              )}
              <div className="flex gap-2">
                <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                  className="flex items-center gap-1.5 text-xs text-[#8403C5] border border-[#8403C5] rounded-lg px-3 py-1.5 hover:bg-[#F3E8FF] transition-colors disabled:opacity-40">
                  <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Upload photo'}
                </button>
                {draft.photoUrl && (
                  <button type="button" onClick={() => setDraft(d => ({ ...d, photoUrl: '' }))}
                    className="text-xs text-red-400 hover:text-red-600 px-2">Remove</button>
                )}
              </div>
              <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
            </div>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ew-muted mb-1">Name *</label>
            <input className={ic} value={draft.name} onChange={e => setDraft(d => ({...d, name: e.target.value}))} placeholder="Full name" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ew-muted mb-1">Role *</label>
            <input className={ic} value={draft.role} onChange={e => setDraft(d => ({...d, role: e.target.value}))} placeholder="Job title / role" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ew-muted mb-1">Email</label>
            <input className={ic} type="email" value={draft.email || ''} onChange={e => setDraft(d => ({...d, email: e.target.value}))} placeholder="name@eventwise.com" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-ew-muted mb-1">Responsibilities <span className="font-normal">(one per line)</span></label>
            <textarea className={`${ic} min-h-[100px] resize-none`} value={respStr} onChange={e => setRespStr(e.target.value)} placeholder="One responsibility per line…" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-5">
          <button onClick={onClose} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
          <button onClick={save} disabled={!draft.name || !draft.role}
            className="px-4 py-2 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#7002A8] transition-colors disabled:opacity-40">
            Save
          </button>
        </div>
      </div>
    </div>
  );
}

export default function TeamPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const team = page.team || DEFAULT_TEAM;

  const setTeam = (newTeam) => {
    onUpdate({ ...page, team: newTeam, updatedAt: new Date().toISOString().slice(0, 10) });
  };

  const [editMember, setEditMember] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [addingNew, setAddingNew] = useState(false);

  const handleSave = (saved) => {
    if (saved.id && team.find(m => m.id === saved.id)) {
      setTeam(team.map(m => m.id === saved.id ? saved : m));
    } else {
      setTeam([...team, { ...saved, id: Date.now() }]);
    }
    setEditMember(null);
    setAddingNew(false);
  };

  const doDelete = () => {
    setTeam(team.filter(m => m.id !== deleteConfirm));
    setDeleteConfirm(null);
  };

  return (
    <HandbookPageShell section={section} page={page} onUpdate={onUpdate} onDelete={onDelete}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {team.map(member => (
          <TeamCard
            key={member.id}
            member={member}
            onEdit={setEditMember}
            onDelete={setDeleteConfirm}
            canEdit={canEdit}
          />
        ))}
      </div>

      {/* Add button */}
      {canEdit && (
        <button onClick={() => setAddingNew(true)}
          className="flex items-center gap-1.5 text-sm text-[#8403C5] hover:underline mt-4">
          <Plus className="w-3.5 h-3.5" /> Add team member
        </button>
      )}

      {/* Timezone note */}
      <div className="flex items-start gap-2 mt-5 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
        <span className="text-base shrink-0">🕐</span>
        <p className="text-xs text-amber-700">Elena is based in South Africa (SAST, UTC+2). Rest of team UK-based. Account for 2-hour time difference on calls.</p>
      </div>

      {/* Edit modal */}
      {(editMember || addingNew) && (
        <TeamEditModal
          member={editMember || { id: null, name: '', role: '', email: '', responsibilities: [] }}
          onSave={handleSave}
          onClose={() => { setEditMember(null); setAddingNew(false); }}
        />
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteConfirm(null)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Remove team member?</h3>
            <p className="text-sm text-ew-body mb-5">Remove <strong>{team.find(m => m.id === deleteConfirm)?.name}</strong> from the team page?</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={doDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Remove</button>
            </div>
          </div>
        </div>
      )}
    </HandbookPageShell>
  );
}