import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { ChevronDown, ChevronRight, Settings, Save } from 'lucide-react';

export default function SummarySettings({ onSaved }) {
  const [open, setOpen] = useState(false);
  const [priorities, setPriorities] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    base44.entities.WeeklyReportSettings.list().then(records => {
      if (records.length > 0) setPriorities(records[0].companyPriorities || '');
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const records = await base44.entities.WeeklyReportSettings.list();
      if (records.length > 0) {
        await base44.entities.WeeklyReportSettings.update(records[0].id, { companyPriorities: priorities });
      } else {
        await base44.entities.WeeklyReportSettings.create({ companyPriorities: priorities });
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      if (onSaved) onSaved(priorities);
    } catch {}
    setSaving(false);
  };

  return (
    <div className="mt-8">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2 text-sm font-semibold text-[#5777AB] hover:text-[#242450] transition-colors">
        {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
        <Settings className="w-4 h-4" /> Summary settings
      </button>
      {open && (
        <div className="mt-3 bg-white border border-[#EBEBF5] rounded-xl p-5">
          <label className="block text-xs font-semibold text-[#242450] mb-2">
            Current company priorities (used to explain why work matters in the summary)
          </label>
          <textarea
            value={priorities}
            onChange={e => setPriorities(e.target.value)}
            placeholder="e.g. Reduce founder involvement in client work. Improve client onboarding and retention. Grow the agency segment."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-[#EBEBF5] rounded-lg bg-white resize-none focus:outline-none focus:border-[#8403C5]"
          />
          <p className="text-xs text-[#9CA3AF] mt-2">Only shown here — never included in the report, Copy or PDF.</p>
          <div className="flex items-center gap-3 mt-3">
            <button onClick={handleSave} disabled={saving || loading}
              className="px-4 py-2 text-sm font-semibold bg-[#8403C5] hover:bg-[#6B02A0] text-white rounded-lg transition-colors disabled:opacity-60 flex items-center gap-1.5">
              <Save className="w-3.5 h-3.5" /> {saving ? 'Saving…' : 'Save'}
            </button>
            {saved && <span className="text-xs text-[#1D9E75] font-medium">✓ Saved</span>}
          </div>
        </div>
      )}
    </div>
  );
}