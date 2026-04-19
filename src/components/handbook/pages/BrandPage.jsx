import React, { useState } from 'react';
import { Pencil, Check, X, ExternalLink } from 'lucide-react';
import HandbookPageShell from '../HandbookPageShell';

const COLOURS = [
  { name: 'Navy', hex: '#242450' },
  { name: 'Purple', hex: '#8403C5' },
  { name: 'Steel Blue', hex: '#5777AB' },
  { name: 'Green', hex: '#1D9E75' },
  { name: 'Off-white', hex: '#F6F6FB', border: true },
];

export default function BrandPage({ section, page, onUpdate, onDelete }) {
  const brandAssetsUrl = page.brandAssetsUrl || '';
  const [editingAssets, setEditingAssets] = useState(false);
  const [assetsDraft, setAssetsDraft] = useState('');

  const saveAssets = () => {
    onUpdate({ ...page, brandAssetsUrl: assetsDraft });
    setEditingAssets(false);
  };

  return (
    <HandbookPageShell section={section} page={page} onUpdate={onUpdate} onDelete={onDelete}>
      <div className="space-y-8">

        {/* Brand Assets Button */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-3">Brand Assets</p>
          <div className="flex items-center gap-3 flex-wrap">
            {editingAssets ? (
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <input autoFocus
                  className="flex-1 text-sm border border-ew-border rounded-lg px-3 py-2 outline-none focus:border-[#8403C5]"
                  value={assetsDraft} onChange={e => setAssetsDraft(e.target.value)}
                  placeholder="https://www.canva.com/… or Google Drive link"
                  onKeyDown={e => { if (e.key === 'Enter') saveAssets(); if (e.key === 'Escape') setEditingAssets(false); }}
                />
                <button onClick={saveAssets} className="text-green-500"><Check className="w-4 h-4" /></button>
                <button onClick={() => setEditingAssets(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
            ) : (
              <>
                {brandAssetsUrl ? (
                  <a href={brandAssetsUrl} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-3 bg-[#8403C5] text-white rounded-lg text-sm font-semibold hover:bg-[#7002A8] transition-colors">
                    <ExternalLink className="w-4 h-4" /> Open Brand Assets →
                  </a>
                ) : (
                  <button onClick={() => { setAssetsDraft(''); setEditingAssets(true); }}
                    className="inline-flex items-center gap-2 px-5 py-3 border-2 border-dashed border-ew-border text-ew-muted rounded-lg text-sm hover:border-[#8403C5] hover:text-[#8403C5] transition-all">
                    + Add Brand Assets link
                  </button>
                )}
                {brandAssetsUrl && (
                  <button onClick={() => { setAssetsDraft(brandAssetsUrl); setEditingAssets(true); }}
                    className="p-1.5 text-ew-muted hover:text-navy rounded transition-colors">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* Colours */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-3">Colours</p>
          <div className="flex flex-wrap gap-4">
            {COLOURS.map(c => (
              <div key={c.hex} className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-lg shrink-0 ${c.border ? 'border border-ew-border' : ''}`}
                  style={{ backgroundColor: c.hex }}
                />
                <div>
                  <p className="text-sm font-semibold text-navy leading-none">{c.name}</p>
                  <p className="text-xs text-ew-muted font-mono mt-0.5">{c.hex}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* Typography */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-3">Typography</p>
          <div className="space-y-1 text-sm text-ew-body">
            <p><span className="font-semibold text-navy">Primary font:</span> DM Sans</p>
            <p><span className="font-semibold text-navy">Fallback:</span> Arial</p>
            <p className="text-ew-muted text-xs mt-2">Usage: DM Sans for all headings and body text. Never use serif fonts.</p>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* Logo */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-3">Logo</p>
          <div className="space-y-1.5 text-sm text-ew-body">
            <p><span className="font-semibold text-navy">White version</span> — use on dark/navy backgrounds</p>
            <p><span className="font-semibold text-navy">Dark version</span> — use on light/white backgrounds</p>
            <p className="text-xs text-ew-muted mt-2">CSS dark mode conversion: <code className="bg-ew-bg px-1.5 py-0.5 rounded font-mono text-[11px]">filter: brightness(0) invert(1)</code></p>
          </div>
        </div>

        <hr className="border-ew-border" />

        {/* Tone of Voice */}
        <div>
          <p className="text-[11px] font-bold text-ew-muted uppercase tracking-[0.12em] mb-3">Tone of Voice</p>
          <p className="text-sm font-semibold text-navy mb-3">Direct. Warm. Honest. Not corporate. Not salesy. Always specific over vague.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="bg-red-50 border border-red-100 rounded-lg p-3">
              <p className="text-[11px] font-bold text-red-500 uppercase tracking-[0.1em] mb-2">Avoid</p>
              <div className="flex flex-wrap gap-1.5">
                {['ecosystem', 'stakeholders', 'scalable solutions', 'game-changing', 'exciting', 'passionate about'].map(w => (
                  <span key={w} className="text-xs bg-red-100 text-red-600 px-2 py-0.5 rounded-full">{w}</span>
                ))}
              </div>
            </div>
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <p className="text-[11px] font-bold text-green-700 uppercase tracking-[0.1em] mb-2">Use</p>
              <ul className="space-y-1">
                {['Real numbers', 'Specific scenarios', 'Plain language', 'Industry-specific context'].map(w => (
                  <li key={w} className="text-xs text-green-700 flex items-center gap-1.5">
                    <span className="text-green-500">✓</span> {w}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </HandbookPageShell>
  );
}