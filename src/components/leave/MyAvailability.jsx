import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { nextMonday, format, parseISO } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { Check, Send } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Mon', full: 'Monday', hoursKey: 'mondayHours' },
  { key: 'tuesday', label: 'Tue', full: 'Tuesday', hoursKey: 'tuesdayHours' },
  { key: 'wednesday', label: 'Wed', full: 'Wednesday', hoursKey: 'wednesdayHours' },
  { key: 'thursday', label: 'Thu', full: 'Thursday', hoursKey: 'thursdayHours' },
  { key: 'friday', label: 'Fri', full: 'Friday', hoursKey: 'fridayHours' },
];

const emptyForm = {
  monday: false, mondayHours: '',
  tuesday: false, tuesdayHours: '',
  wednesday: false, wednesdayHours: '',
  thursday: false, thursdayHours: '',
  friday: false, fridayHours: '',
  notes: '',
};

export default function MyAvailability() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';
  const weekCommencing = format(nextMonday(new Date()), 'yyyy-MM-dd');

  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!firstName) { setLoading(false); return; }
    base44.entities.WeeklyAvailability.filter({ personName: firstName, weekCommencing })
      .then(data => {
        if (data.length > 0) {
          const e = data[0];
          setExisting(e);
          setForm({
            monday: !!e.monday, mondayHours: e.mondayHours || '',
            tuesday: !!e.tuesday, tuesdayHours: e.tuesdayHours || '',
            wednesday: !!e.wednesday, wednesdayHours: e.wednesdayHours || '',
            thursday: !!e.thursday, thursdayHours: e.thursdayHours || '',
            friday: !!e.friday, fridayHours: e.fridayHours || '',
            notes: e.notes || '',
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [firstName, weekCommencing]);

  const toggleDay = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }));
  const setHours = (hoursKey, val) => setForm(prev => ({ ...prev, [hoursKey]: val }));

  const handleSubmit = async () => {
    setSaving(true);
    const payload = { ...form, personName: firstName, weekCommencing, submittedAt: new Date().toISOString() };
    try {
      if (existing) {
        await base44.entities.WeeklyAvailability.update(existing.id, payload);
      } else {
        const created = await base44.entities.WeeklyAvailability.create(payload);
        setExisting(created);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { /* bubble */ }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
      </div>
    );
  }

  if (!firstName) {
    return (
      <div className="bg-white border border-[#EBEBF5] rounded-xl p-8 text-center">
        <p className="text-sm text-[#5777AB]">We couldn't identify your account. Please refresh and try again.</p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-6 max-w-3xl">
      <h2 className="text-lg font-bold text-[#242450] mb-1">Log your availability for next week</h2>
      <p className="text-sm text-[#5777AB] mb-1">
        Week commencing {format(parseISO(weekCommencing), 'EEEE d MMMM yyyy')}
      </p>
      <p className="text-xs text-[#9CA3AF] mb-5">
        Tap each day to toggle working / not working. Add hours if helpful.
      </p>

      {/* 5-day grid */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 mb-5">
        {DAYS.map(day => {
          const on = form[day.key];
          return (
            <div key={day.key}
              className={`border rounded-xl p-3 transition-colors ${on ? 'border-[#1D9E75] bg-[#E8F7F2]' : 'border-[#EBEBF5] bg-[#F9FAFB]'}`}>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-bold text-[#242450]">{day.label}</span>
                <button type="button" onClick={() => toggleDay(day.key)}
                  className={`relative inline-flex h-5 w-9 rounded-full transition-colors ${on ? 'bg-[#1D9E75]' : 'bg-[#D8D8EE]'}`}>
                  <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${on ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <p className={`text-[10px] font-semibold mb-2 ${on ? 'text-[#1D9E75]' : 'text-[#9CA3AF]'}`}>
                {on ? 'Working' : 'Not working'}
              </p>
              {on && (
                <input type="text" value={form[day.hoursKey]} onChange={e => setHours(day.hoursKey, e.target.value)}
                  placeholder="e.g. 9am-5pm"
                  className="w-full text-xs px-2 py-1.5 border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5] bg-white" />
              )}
            </div>
          );
        })}
      </div>

      {/* Notes */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-[#5777AB] uppercase tracking-wide">Notes (optional)</label>
        <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))}
          placeholder="e.g. travelling Thursday, online from 3pm"
          rows={2}
          className="w-full mt-1.5 text-sm px-3 py-2 border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5] bg-white resize-none" />
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6B02A0] transition-colors disabled:opacity-60">
          {saving ? 'Saving…' : existing ? 'Update Availability' : 'Submit Availability'}
          {!saving && (existing ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
        </button>
        {saved && <span className="text-sm font-semibold text-[#1D9E75]">Saved!</span>}
        {existing && !saved && <span className="text-xs text-[#9CA3AF]">You can edit this until Friday.</span>}
      </div>
    </div>
  );
}