import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { nextMonday, format, parseISO, addWeeks, addDays } from 'date-fns';
import { useAuth } from '@/lib/AuthContext';
import { Check, Send, Calendar } from 'lucide-react';

const DAYS = [
  { key: 'monday', label: 'Mon', full: 'Monday', hoursKey: 'mondayHours' },
  { key: 'tuesday', label: 'Tue', full: 'Tuesday', hoursKey: 'tuesdayHours' },
  { key: 'wednesday', label: 'Wed', full: 'Wednesday', hoursKey: 'wednesdayHours' },
  { key: 'thursday', label: 'Thu', full: 'Thursday', hoursKey: 'thursdayHours' },
  { key: 'friday', label: 'Fri', full: 'Friday', hoursKey: 'fridayHours' },
];

const WEEK_COUNT = 8;

const emptyForm = {
  monday: false, mondayHours: '',
  tuesday: false, tuesdayHours: '',
  wednesday: false, wednesdayHours: '',
  thursday: false, thursdayHours: '',
  friday: false, fridayHours: '',
  notes: '',
};

function formFromRecord(e) {
  return {
    monday: !!e.monday, mondayHours: e.mondayHours || '',
    tuesday: !!e.tuesday, tuesdayHours: e.tuesdayHours || '',
    wednesday: !!e.wednesday, wednesdayHours: e.wednesdayHours || '',
    thursday: !!e.thursday, thursdayHours: e.thursdayHours || '',
    friday: !!e.friday, fridayHours: e.fridayHours || '',
    notes: e.notes || '',
  };
}

export default function MyAvailability() {
  const { user } = useAuth();
  const firstName = user?.full_name?.split(' ')[0] || '';

  // Build the next 8 weeks starting from next Monday
  const baseMonday = nextMonday(new Date());
  const weekOptions = Array.from({ length: WEEK_COUNT }, (_, i) => {
    const monday = addWeeks(baseMonday, i);
    const friday = addDays(monday, 4);
    return {
      value: format(monday, 'yyyy-MM-dd'),
      label: i === 0 ? 'Next week' : `${i + 1} weeks ahead`,
      sub: `${format(monday, 'd MMM')} – ${format(friday, 'd MMM yyyy')}`,
    };
  });

  const [selectedWeek, setSelectedWeek] = useState(weekOptions[0].value);
  const [existingMap, setExistingMap] = useState({});
  const [existing, setExisting] = useState(null);
  const [form, setForm] = useState({ ...emptyForm });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [applyMultiple, setApplyMultiple] = useState(false);
  const [extraWeeks, setExtraWeeks] = useState([]);

  // Fetch all this person's availability records once, build a map by weekCommencing
  useEffect(() => {
    if (!firstName) { setLoading(false); return; }
    base44.entities.WeeklyAvailability.filter({ personName: firstName })
      .then(all => {
        const map = {};
        all.forEach(r => { if (r.weekCommencing) map[r.weekCommencing] = r; });
        setExistingMap(map);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [firstName]);

  // When the selected week (or the record map) changes, pre-fill the form
  useEffect(() => {
    const e = existingMap[selectedWeek] || null;
    setExisting(e);
    setForm(e ? formFromRecord(e) : { ...emptyForm });
  }, [selectedWeek, existingMap]);

  const toggleDay = (key) => setForm(prev => ({ ...prev, [key]: !prev[key] }));
  const setHours = (hoursKey, val) => setForm(prev => ({ ...prev, [hoursKey]: val }));

  const toggleExtraWeek = (value) => {
    setExtraWeeks(prev => prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]);
  };

  const weeksToSave = applyMultiple ? [selectedWeek, ...extraWeeks] : [selectedWeek];
  const selectedOption = weekOptions.find(o => o.value === selectedWeek);

  const handleSubmit = async () => {
    setSaving(true);
    const newMap = { ...existingMap };
    try {
      for (const wc of weeksToSave) {
        const payload = { ...form, personName: firstName, weekCommencing: wc, submittedAt: new Date().toISOString() };
        const rec = newMap[wc];
        if (rec) {
          await base44.entities.WeeklyAvailability.update(rec.id, payload);
          newMap[wc] = { ...rec, ...payload };
        } else {
          const created = await base44.entities.WeeklyAvailability.create(payload);
          newMap[wc] = created;
        }
      }
      setExistingMap(newMap);
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

  const submitLabel = saving
    ? 'Saving…'
    : weeksToSave.length > 1
      ? `Submit for ${weeksToSave.length} weeks`
      : existing ? 'Update Availability' : 'Submit Availability';

  return (
    <div className="bg-white border border-[#EBEBF5] rounded-xl p-6 max-w-3xl">
      <h2 className="text-lg font-bold text-[#242450] mb-1">Log your availability</h2>
      <p className="text-xs text-[#9CA3AF] mb-5">
        Tap each day to toggle working / not working. Add hours if helpful.
      </p>

      {/* Week selector */}
      <div className="mb-5">
        <label className="text-xs font-semibold text-[#5777AB] uppercase tracking-wide flex items-center gap-1.5 mb-1.5">
          <Calendar className="w-3.5 h-3.5" /> Which week?
        </label>
        <div className="relative">
          <select
            value={selectedWeek}
            onChange={e => { setSelectedWeek(e.target.value); setExtraWeeks([]); }}
            className="w-full border border-[#EBEBF5] rounded-lg px-3 py-2.5 text-sm font-medium text-[#242450] bg-white appearance-none focus:outline-none focus:border-[#8403C5] pr-9">
            {weekOptions.map(o => (
              <option key={o.value} value={o.value}>
                {o.label} ({o.sub}){existingMap[o.value] ? ' — already logged' : ''}
              </option>
            ))}
          </select>
          <span className="absolute right-3 top-3 text-[#9CA3AF] pointer-events-none">▾</span>
        </div>
        <p className="text-sm text-[#5777AB] mt-2">
          Week commencing {format(parseISO(selectedWeek), 'EEEE d MMMM yyyy')}
        </p>
        {existing && (
          <p className="text-xs text-[#1D9E75] mt-1 font-medium">
            You've already submitted for this week — edits will update your existing entry.
          </p>
        )}
      </div>

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

      {/* Apply to multiple weeks */}
      <div className="mb-5 p-4 border border-[#EBEBF5] rounded-xl bg-[#F9FAFB]">
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={applyMultiple} onChange={e => { setApplyMultiple(e.target.checked); setExtraWeeks([]); }}
            className="w-4 h-4 rounded border-[#D8D8EE] text-[#8403C5] focus:ring-[#8403C5]" />
          <span className="text-sm font-semibold text-[#242450]">Apply same schedule to additional weeks</span>
        </label>
        {applyMultiple && (
          <div className="mt-3 space-y-1.5">
            <p className="text-xs text-[#5777AB] mb-1">Tick the weeks to copy these same days/hours to:</p>
            {weekOptions.filter(o => o.value !== selectedWeek).map(o => {
              const checked = extraWeeks.includes(o.value);
              const hasRecord = !!existingMap[o.value];
              return (
                <label key={o.value} className="flex items-center gap-2.5 px-3 py-2 bg-white border border-[#EBEBF5] rounded-lg cursor-pointer hover:border-[#D8D8EE] transition-colors">
                  <input type="checkbox" checked={checked} onChange={() => toggleExtraWeek(o.value)}
                    className="w-4 h-4 rounded border-[#D8D8EE] text-[#8403C5] focus:ring-[#8403C5]" />
                  <span className="text-sm font-medium text-[#242450]">{o.label}</span>
                  <span className="text-xs text-[#9CA3AF]">{o.sub}</span>
                  {hasRecord && <span className="ml-auto text-[10px] font-semibold text-[#A16207] bg-[#FFFBEB] px-2 py-0.5 rounded-full">Already logged — will update</span>}
                </label>
              );
            })}
            {extraWeeks.length > 0 && (
              <p className="text-xs text-[#8403C5] font-medium pt-1">
                Will submit for {extraWeeks.length + 1} weeks total (each saved as its own editable record).
              </p>
            )}
          </div>
        )}
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <button onClick={handleSubmit} disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2.5 bg-[#8403C5] text-white text-sm font-semibold rounded-lg hover:bg-[#6B02A0] transition-colors disabled:opacity-60">
          {submitLabel}
          {!saving && (existing ? <Check className="w-4 h-4" /> : <Send className="w-4 h-4" />)}
        </button>
        {saved && <span className="text-sm font-semibold text-[#1D9E75]">Saved!</span>}
        {existing && !saved && !applyMultiple && <span className="text-xs text-[#9CA3AF]">You can edit this until Friday.</span>}
      </div>
    </div>
  );
}