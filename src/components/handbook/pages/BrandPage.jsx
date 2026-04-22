import React, { useState, useCallback, useRef } from 'react';
import { Pencil, Check, X, Trash2, Plus, Copy, Upload } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { base44 } from '@/api/base44Client';

const ALLOWED_EDITORS = ['chris@eventwise.com', 'elena@eventwise.com'];

const DEFAULT_COLOURS = [
  { id: 1, name: 'Navy',       hex: '#242450' },
  { id: 2, name: 'Purple',     hex: '#8403C5' },
  { id: 3, name: 'Steel Blue', hex: '#5777AB' },
  { id: 4, name: 'Green',      hex: '#1D9E75' },
  { id: 5, name: 'Off-white',  hex: '#F6F6FB' },
];

const DEFAULT_TOV_USE    = ['Direct', 'Warm', 'Honest', 'Specific over vague', 'Real numbers', 'Plain language'];
const DEFAULT_TOV_AVOID  = ['Corporate', 'Salesy', '"Ecosystem"', '"Stakeholders"', '"Game-changing"', '"Exciting"', '"Passionate about"'];

// ─── Colour Swatch ────────────────────────────────────────────────────────────
function ColourSwatch({ colour, onEdit, onDelete, canEdit }) {
  const [copied, setCopied] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({ name: colour.name, hex: colour.hex });

  const copy = (e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(colour.hex).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  };

  const save = () => { onEdit({ ...colour, ...draft }); setEditing(false); };

  const isLight = (hex) => {
    const c = hex.replace('#', '');
    const r = parseInt(c.substr(0,2),16), g = parseInt(c.substr(2,2),16), b = parseInt(c.substr(4,2),16);
    return (r*299 + g*587 + b*114) / 1000 > 180;
  };

  return (
    <div className="flex flex-col items-center group relative">
      {editing ? (
        <div className="bg-white border border-ew-border rounded-xl p-3 shadow-lg w-40 space-y-2 z-10">
          <input
            className="w-full text-xs border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5]"
            value={draft.name} onChange={e => setDraft(d => ({ ...d, name: e.target.value }))} placeholder="Colour name"
          />
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={draft.hex}
              onChange={e => setDraft(d => ({ ...d, hex: e.target.value }))}
              className="w-8 h-8 rounded border border-ew-border cursor-pointer p-0"
            />
            <input
              className="flex-1 text-xs border border-ew-border rounded px-2 py-1.5 outline-none focus:border-[#8403C5] font-mono"
              value={draft.hex} onChange={e => setDraft(d => ({ ...d, hex: e.target.value }))} placeholder="#000000"
            />
          </div>
          <div className="flex gap-1 justify-end">
            <button onClick={() => setEditing(false)} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-3.5 h-3.5" /></button>
            <button onClick={save} className="p-1 text-green-500 hover:text-green-700"><Check className="w-3.5 h-3.5" /></button>
          </div>
        </div>
      ) : (
        <>
          <div
            className="w-16 h-16 rounded-2xl shadow-md border border-black/10 relative flex items-center justify-center mb-2 cursor-pointer transition-transform hover:scale-105"
            style={{ backgroundColor: colour.hex }}
          >
            {canEdit && (
              <div className="absolute -top-1.5 -right-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                <button onClick={() => { setDraft({ name: colour.name, hex: colour.hex }); setEditing(true); }}
                  className="w-5 h-5 bg-white border border-ew-border rounded-full flex items-center justify-center shadow-sm hover:border-[#8403C5]">
                  <Pencil className="w-2.5 h-2.5 text-navy" />
                </button>
                <button onClick={() => onDelete(colour.id)}
                  className="w-5 h-5 bg-white border border-ew-border rounded-full flex items-center justify-center shadow-sm hover:border-red-400">
                  <X className="w-2.5 h-2.5 text-red-400" />
                </button>
              </div>
            )}
          </div>
          <p className="text-xs font-semibold text-[#111827] mb-0.5">{colour.name}</p>
          <button
            onClick={copy}
            className="font-mono text-[11px] text-ew-muted hover:text-[#8403C5] transition-colors flex items-center gap-1 group/hex"
          >
            {colour.hex}
            <Copy className="w-2.5 h-2.5 opacity-0 group-hover/hex:opacity-100 transition-opacity" />
          </button>
          {copied && (
            <span className="absolute -bottom-5 text-[10px] font-semibold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Copied!</span>
          )}
        </>
      )}
    </div>
  );
}

// ─── Font Preview ─────────────────────────────────────────────────────────────
function FontPreview({ name, family, description, sample, canEdit }) {
  return (
    <div className="bg-[#FAFBFE] border border-ew-border rounded-xl p-5 group relative">
      {canEdit && (
        <button className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity p-1 text-ew-muted hover:text-navy rounded">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      )}
      <p style={{ fontFamily: family, fontSize: 32, fontWeight: 700, lineHeight: 1.1, color: '#242450' }} className="mb-1">
        {name}
      </p>
      <p className="text-xs font-semibold text-[#8403C5] mb-2">{description}</p>
      <p style={{ fontFamily: family, fontSize: 15, color: '#374151', lineHeight: 1.6 }}>
        {sample}
      </p>
    </div>
  );
}

// ─── Logo Upload Zone ─────────────────────────────────────────────────────────
function LogoZone({ label, bg, textColour, logoUrl, onUpload, onRemove, canEdit }) {
  const [uploading, setUploading] = useState(false);
  const inputRef = React.useRef(null);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const { file_url } = await base44.integrations.Core.UploadFile({ file });
    onUpload(file_url);
    setUploading(false);
    e.target.value = '';
  };

  return (
    <div className="flex-1 min-w-0">
      <p className="text-xs font-semibold text-[#374151] mb-2">{label}</p>
      <div
        className="rounded-xl border-2 border-ew-border flex flex-col items-center justify-center p-6 min-h-[140px] relative"
        style={{ backgroundColor: bg }}
      >
        {logoUrl ? (
          <>
            <img src={logoUrl} alt={label} className="max-h-16 max-w-full object-contain" />
            {canEdit && (
              <button onClick={onRemove}
                className="absolute top-2 right-2 w-6 h-6 bg-black/20 hover:bg-black/40 text-white rounded-full flex items-center justify-center transition-colors">
                <X className="w-3 h-3" />
              </button>
            )}
          </>
        ) : (
          <p style={{ color: textColour }} className="text-xs opacity-60 text-center">{label.includes('Dark') ? 'For dark/navy backgrounds' : 'For light/white backgrounds'}</p>
        )}
      </div>
      {canEdit && (
        <>
          <button
            onClick={() => inputRef.current?.click()}
            disabled={uploading}
            className="mt-2 flex items-center gap-1.5 text-xs text-[#8403C5] hover:underline disabled:opacity-40"
          >
            <Upload className="w-3 h-3" /> {uploading ? 'Uploading…' : 'Upload logo'}
          </button>
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFile} />
        </>
      )}
    </div>
  );
}

// ─── TOV List ─────────────────────────────────────────────────────────────────
function TOVList({ items, colour, bgColour, prefix, onUpdate, canEdit }) {
  const [editIdx, setEditIdx] = useState(null);
  const [editVal, setEditVal] = useState('');

  const save = (idx) => {
    const updated = items.map((it, i) => i === idx ? editVal : it);
    onUpdate(updated);
    setEditIdx(null);
  };

  const remove = (idx) => onUpdate(items.filter((_, i) => i !== idx));

  const add = () => {
    const updated = [...items, 'New item'];
    onUpdate(updated);
    setEditIdx(updated.length - 1);
    setEditVal('New item');
  };

  return (
    <div className="flex-1 min-w-0">
      <div className="space-y-1.5 mb-3">
        {items.map((item, i) => (
          <div key={i} className="group flex items-center gap-2">
            {editIdx === i ? (
              <>
                <input
                  autoFocus
                  value={editVal}
                  onChange={e => setEditVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') save(i); if (e.key === 'Escape') setEditIdx(null); }}
                  className="flex-1 text-sm border border-ew-border rounded px-2 py-1 outline-none focus:border-[#8403C5]"
                />
                <button onClick={() => save(i)} className="text-green-500"><Check className="w-3.5 h-3.5" /></button>
                <button onClick={() => setEditIdx(null)} className="text-gray-400"><X className="w-3.5 h-3.5" /></button>
              </>
            ) : (
              <>
                <span className={`shrink-0 w-4 h-4 rounded-full flex items-center justify-center text-white text-[10px] font-bold`} style={{ backgroundColor: colour }}>
                  {prefix}
                </span>
                <span className="text-sm flex-1" style={{ color: '#374151' }}>{item}</span>
                {canEdit && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex gap-0.5">
                    <button onClick={() => { setEditIdx(i); setEditVal(item); }} className="p-0.5 text-ew-muted hover:text-navy"><Pencil className="w-3 h-3" /></button>
                    <button onClick={() => remove(i)} className="p-0.5 text-ew-muted hover:text-red-500"><X className="w-3 h-3" /></button>
                  </div>
                )}
              </>
            )}
          </div>
        ))}
      </div>
      {canEdit && (
        <button onClick={add} className="flex items-center gap-1 text-xs text-[#8403C5] hover:underline">
          <Plus className="w-3 h-3" /> Add
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BrandPage({ section, page, onUpdate, onDelete }) {
  const { user } = useAuth();
  const canEdit = ALLOWED_EDITORS.includes(user?.email?.toLowerCase());
  const [confirmDelete, setConfirmDelete] = useState(false);

  const data = page.brandData || {};
  const colours   = data.colours   || DEFAULT_COLOURS;
  const tovUse    = data.tovUse    || DEFAULT_TOV_USE;
  const tovAvoid  = data.tovAvoid  || DEFAULT_TOV_AVOID;
  const assetsUrl = data.assetsUrl || '';
  const darkLogo  = data.darkLogo  || '';
  const lightLogo = data.lightLogo || '';

  const save = (patch) => {
    onUpdate({ ...page, brandData: { ...data, ...patch }, updatedAt: new Date().toISOString().slice(0, 10) });
  };

  const fmtDate = (d) => { try { return format(new Date(d), 'd MMM yyyy'); } catch { return d; } };

  return (
    <div className="flex-1 overflow-y-auto bg-[#F7F8FC] p-8">
      <div className="max-w-3xl mx-auto">

        {/* Breadcrumb */}
        <p className="text-xs text-ew-muted mb-4">
          {section.label.replace(/^[^\w]+/, '').trim()} › {page.title}
        </p>

        {/* Header card */}
        <div className="bg-white rounded-xl border border-ew-border p-6 mb-4">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-[#242450] mb-1">{page.title}</h1>
              {page.description
                ? <p className="text-sm italic text-[#6B7280]">{page.description}</p>
                : <p className="text-sm italic text-[#9CA3AF]">Brand colours, fonts, logos and tone of voice</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {page.updatedAt && <span className="text-[11px] text-[#9CA3AF] hidden sm:block">Updated {fmtDate(page.updatedAt)}</span>}
              {canEdit && (
                <button onClick={() => setConfirmDelete(true)}
                  className="p-1.5 text-ew-muted hover:text-red-500 rounded-lg hover:bg-red-50 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
          <hr className="border-ew-border mt-4" />
        </div>

        {/* Content card */}
        <div className="bg-white rounded-xl border border-ew-border shadow-sm p-6 space-y-8">

          {/* ── Brand Assets Link ── */}
          <section>
            <h2 className="text-base font-semibold text-[#242450] mb-3">Brand Assets</h2>
            {canEdit && (
              <div className="mb-3">
                <label className="block text-xs font-medium text-[#6B7280] mb-1">Brand Assets Link (Canva / Google Drive)</label>
                <input
                  type="url"
                  className="w-full text-sm border border-ew-border rounded-lg px-3 py-2 outline-none focus:border-[#8403C5] focus:ring-2 focus:ring-[#8403C5]/10"
                  placeholder="https://www.canva.com/…"
                  value={assetsUrl}
                  onChange={e => save({ assetsUrl: e.target.value })}
                />
              </div>
            )}
            {assetsUrl ? (
              <a
                href={assetsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-[#8403C5] text-[#8403C5] font-semibold text-sm rounded-xl hover:bg-[#8403C5] hover:text-white transition-all"
              >
                Open Brand Assets →
              </a>
            ) : (
              <button disabled className="inline-flex items-center gap-2 px-4 py-2.5 border-2 border-ew-border text-ew-muted font-semibold text-sm rounded-xl opacity-50 cursor-not-allowed">
                Add link above to enable
              </button>
            )}
          </section>

          <hr className="border-ew-border" />

          {/* ── Colours ── */}
          <section>
            <h2 className="text-base font-semibold text-[#242450] mb-4">Colours</h2>
            <div className="flex flex-wrap gap-6">
              {colours.map(c => (
                <ColourSwatch
                  key={c.id}
                  colour={c}
                  canEdit={canEdit}
                  onEdit={(updated) => save({ colours: colours.map(x => x.id === updated.id ? updated : x) })}
                  onDelete={(id) => save({ colours: colours.filter(x => x.id !== id) })}
                />
              ))}
              {canEdit && (
                <button
                  onClick={() => save({ colours: [...colours, { id: Date.now(), name: 'New Colour', hex: '#000000' }] })}
                  className="flex flex-col items-center gap-2 group"
                >
                  <div className="w-16 h-16 rounded-2xl border-2 border-dashed border-ew-border flex items-center justify-center group-hover:border-[#8403C5] transition-colors">
                    <Plus className="w-5 h-5 text-ew-muted group-hover:text-[#8403C5] transition-colors" />
                  </div>
                  <span className="text-xs text-ew-muted group-hover:text-[#8403C5] transition-colors">Add colour</span>
                </button>
              )}
            </div>
          </section>

          <hr className="border-ew-border" />

          {/* ── Typography ── */}
          <section>
            <h2 className="text-base font-semibold text-[#242450] mb-4">Typography</h2>
            <div className="space-y-3">
              <FontPreview
                name="DM Sans"
                family="'DM Sans', sans-serif"
                description="Primary font — used for all headings and body text"
                sample="The quick brown fox jumps over the lazy dog"
                canEdit={canEdit}
              />
              <FontPreview
                name="Arial"
                family="Arial, sans-serif"
                description="Fallback font — system default when DM Sans is unavailable"
                sample="The quick brown fox jumps over the lazy dog"
                canEdit={canEdit}
              />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-3 italic">Never use serif fonts. DM Sans is imported via Google Fonts.</p>
          </section>

          <hr className="border-ew-border" />

          {/* ── Logo ── */}
          <section>
            <h2 className="text-base font-semibold text-[#242450] mb-4">Logo</h2>
            <div className="flex gap-4">
              <LogoZone
                label="Dark Logo"
                bg="#242450"
                textColour="#ffffff"
                logoUrl={darkLogo}
                canEdit={canEdit}
                onUpload={(url) => save({ darkLogo: url })}
                onRemove={() => save({ darkLogo: '' })}
              />
              <LogoZone
                label="Light Logo"
                bg="#FFFFFF"
                textColour="#242450"
                logoUrl={lightLogo}
                canEdit={canEdit}
                onUpload={(url) => save({ lightLogo: url })}
                onRemove={() => save({ lightLogo: '' })}
              />
            </div>
            <p className="text-xs text-[#9CA3AF] mt-3 font-mono">CSS dark mode conversion: filter: brightness(0) invert(1)</p>
          </section>

          <hr className="border-ew-border" />

          {/* ── Tone of Voice ── */}
          <section>
            <h2 className="text-base font-semibold text-[#242450] mb-4">Tone of Voice</h2>
            <div className="grid grid-cols-2 gap-6">
              <div>
                <p className="text-sm font-semibold text-green-700 mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-green-600 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✓</span>
                  Use
                </p>
                <TOVList
                  items={tovUse}
                  colour="#1D9E75"
                  bgColour="#F0FDF4"
                  prefix="✓"
                  canEdit={canEdit}
                  onUpdate={(items) => save({ tovUse: items })}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-red-600 mb-3 flex items-center gap-1.5">
                  <span className="w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold">✗</span>
                  Avoid
                </p>
                <TOVList
                  items={tovAvoid}
                  colour="#EF4444"
                  bgColour="#FEF2F2"
                  prefix="✗"
                  canEdit={canEdit}
                  onUpdate={(items) => save({ tovAvoid: items })}
                />
              </div>
            </div>
          </section>

        </div>
      </div>

      {confirmDelete && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setConfirmDelete(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-base font-bold text-navy mb-2">Delete page?</h3>
            <p className="text-sm text-ew-body mb-5">Delete <strong>{page.title}</strong>? This cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmDelete(false)} className="px-4 py-2 text-sm font-medium text-ew-body hover:bg-ew-bg rounded-lg">Cancel</button>
              <button onClick={onDelete} className="px-4 py-2 text-sm font-semibold bg-red-600 text-white rounded-lg hover:bg-red-700">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}