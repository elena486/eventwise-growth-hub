import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { format, parseISO } from 'date-fns';
import { Settings, ChevronDown, ChevronRight, X } from 'lucide-react';

const DEFAULT_ENTITLEMENT = 25;
const ADMINS = ['Elena', 'Chris'];
const SUMMARY_PEOPLE = ['George', 'Martinique'];
const FULL_NAMES = { George: 'George Nell', Martinique: 'Martinique Keeler' };

function calcWorkingDays(start, end) {
  if (!start || !end) return 0;
  try {
    let s = new Date(start), e = new Date(end), c = 0;
    while (s <= e) { if (s.getDay() !== 0 && s.getDay() !== 6) c++; s = new Date(s.getTime() + 86400000); }
    return Math.max(c, 1);
  } catch { return 1; }
}

function fmtDate(d) {
  if (!d) return '—';
  try { return format(parseISO(d), 'd MMM yyyy'); } catch { return d; }
}

const AVATAR_COLORS = { George: '#1D4ED8', Martinique: '#8403C5' };
function getAvatarColor(name) { return AVATAR_COLORS[name] || '#5777AB'; }
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_STYLES = {
  Confirmed: 'bg-[#E8F7F2] text-[#1D9E75]',
  Approved:  'bg-[#EEF2F8] text-[#5777AB]',
  Requested: 'bg-[#FFFBEB] text-[#A16207]',
  Declined:  'bg-[#FEF2F2] text-[#DC2626]',
};

export default function LeaveSummarySection() {
  const { user } = useAuth();
  const currentUserName = user?.full_name?.split(' ')[0] || '';
  const isAdmin = ADMINS.includes(currentUserName);

  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [entitlements, setEntitlements] = useState({ George: DEFAULT_ENTITLEMENT, Martinique: DEFAULT_ENTITLEMENT });
  const [settingsDraft, setSettingsDraft] = useState({ George: DEFAULT_ENTITLEMENT, Martinique: DEFAULT_ENTITLEMENT });
  const [savingSettings, setSavingSettings] = useState(false);

  const load = async () => {
    const [allEntries, teamMembers] = await Promise.all([
      base44.entities.LeaveEntry.list(500),
      base44.entities.TeamMember.list(),
    ]);
    setEntries(allEntries);
    setMembers(teamMembers);
    const entMap = { George: DEFAULT_ENTITLEMENT, Martinique: DEFAULT_ENTITLEMENT };
    teamMembers.forEach(m => {
      if (SUMMARY_PEOPLE.includes(m.name)) entMap[m.name] = m.annualLeaveEntitlement || DEFAULT_ENTITLEMENT;
    });
    setEntitlements(entMap);
    setSettingsDraft(entMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const yearEntries = entries.filter(e => {
    if (!SUMMARY_PEOPLE.includes(e.personName)) return false;
    try { return new Date(e.startDate).getFullYear() === year; } catch { return false; }
  });

  const getStats = (name) => {
    const personEntries = yearEntries.filter(e => e.personName === name).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    const valid = (e) => e.status === 'Confirmed' || e.status === 'Approved';
    const annualDays = personEntries.filter(e => e.type === 'Annual Leave' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const sickDays = personEntries.filter(e => e.type === 'Sick' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const otherDays = personEntries.filter(e => e.type === 'Other' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const entitlement = entitlements[name] ?? DEFAULT_ENTITLEMENT;
    const remaining = Math.max(entitlement - annualDays, 0);
    const pct = entitlement > 0 ? Math.min((annualDays / entitlement) * 100, 100) : 0;
    return { annualDays, sickDays, otherDays, entitlement, remaining, pct, entries: personEntries };
  };

  const handleSaveSettings = async () => {
    setSavingSettings(true);
    await Promise.all(SUMMARY_PEOPLE.map(async (name) => {
      const val = parseInt(settingsDraft[name]) || DEFAULT_ENTITLEMENT;
      const member = members.find(m => m.name === name);
      if (member) {
        await base44.entities.TeamMember.update(member.id, { annualLeaveEntitlement: val });
      } else {
        await base44.entities.TeamMember.create({ name, annualLeaveEntitlement: val, availabilityRequired: false });
      }
    }));
    setEntitlements({ ...settingsDraft });
    setSavingSettings(false);
    setShowSettings(false);
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  if (loading) return null;

  return (
    <div className="mb-6">
      {/* Section header with year selector + settings */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-bold text-[#242450]">Leave Summary</h2>
          <div className="flex items-center gap-1">
            {years.map(y => (
              <button key={y} onClick={() => setYear(y)}
                className={`px-2.5 py-1 text-[11px] font-semibold rounded-md border transition-colors ${year === y ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:bg-[#F6F6FB]'}`}>
                {y}
              </button>
            ))}
          </div>
        </div>
        {isAdmin && (
          <button onClick={() => { setSettingsDraft(entitlements); setShowSettings(s => !s); }}
            className="flex items-center gap-1.5 text-xs font-semibold text-[#5777AB] hover:text-[#8403C5] px-2 py-1 rounded-lg hover:bg-[#F3E8FF] transition-colors">
            <Settings className="w-3.5 h-3.5" /> Settings
          </button>
        )}
      </div>

      {/* Inline settings */}
      {showSettings && (
        <div className="bg-white border border-[#EBEBF5] rounded-xl p-5 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-[#242450]">Annual Leave Entitlement</h3>
            <button onClick={() => setShowSettings(false)} className="p-1 rounded hover:bg-[#F6F6FB] text-[#9CA3AF]"><X className="w-3.5 h-3.5" /></button>
          </div>
          <div className="space-y-3">
            {SUMMARY_PEOPLE.map(name => (
              <div key={name} className="flex items-center gap-3">
                <label className="text-sm text-[#242450] flex-1">{FULL_NAMES[name]} — Annual Leave Entitlement:</label>
                <input type="number" min="0" value={settingsDraft[name]}
                  onChange={e => setSettingsDraft(prev => ({ ...prev, [name]: e.target.value }))}
                  className="w-20 px-2 py-1.5 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
                <span className="text-sm text-[#5777AB]">days</span>
              </div>
            ))}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button onClick={() => { setSettingsDraft(entitlements); setShowSettings(false); }}
              className="px-4 py-1.5 text-sm font-medium text-[#5777AB] hover:bg-[#F6F6FB] rounded-lg">Cancel</button>
            <button onClick={handleSaveSettings} disabled={savingSettings}
              className="px-4 py-1.5 text-sm font-semibold bg-[#8403C5] text-white rounded-lg hover:bg-[#6B02A0] disabled:bg-[#D8D8EE]">
              {savingSettings ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {/* Two side-by-side summary blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {SUMMARY_PEOPLE.map(name => {
          const stats = getStats(name);
          const remainingColor = stats.remaining > 10 ? '#1D9E75' : stats.remaining >= 5 ? '#E8A020' : '#DC2626';
          const labelColor = stats.remaining > 10 ? '#1D9E75' : stats.remaining >= 5 ? '#E8A020' : '#DC2626';
          const isExpanded = expandedPerson === name;
          return (
            <div key={name} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
              {/* Person header */}
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#EBEBF5]">
                <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shrink-0" style={{ backgroundColor: getAvatarColor(name) }}>
                  {getInitials(name)}
                </div>
                <div>
                  <span className="text-sm font-bold text-[#242450]">{FULL_NAMES[name]}</span>
                  <span className="ml-2 text-[11px] font-medium text-[#9CA3AF]">{year}</span>
                </div>
              </div>

              {/* 4 stat cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-[#EBEBF5]">
                <div className="bg-white px-3 py-3">
                  <p className="text-xl font-bold text-[#242450]">{stats.annualDays}</p>
                  <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-wide">Annual Taken</p>
                  <p className="text-[9px] text-[#9CA3AF]">out of {stats.entitlement} days</p>
                </div>
                <div className="bg-white px-3 py-3">
                  <p className="text-xl font-bold" style={{ color: remainingColor }}>{stats.remaining}</p>
                  <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-wide">Remaining</p>
                  <p className="text-[9px] text-[#9CA3AF]">days left</p>
                </div>
                <div className="bg-white px-3 py-3">
                  <p className="text-xl font-bold text-[#A16207]">{stats.sickDays}</p>
                  <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-wide">Sick Days</p>
                  <p className="text-[9px] text-[#9CA3AF]">{year}</p>
                </div>
                <div className="bg-white px-3 py-3">
                  <p className="text-xl font-bold text-[#5777AB]">{stats.otherDays}</p>
                  <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-wide">Other Leave</p>
                  <p className="text-[9px] text-[#9CA3AF]">{year}</p>
                </div>
              </div>

              {/* Progress bar */}
              <div className="px-5 py-3 border-t border-[#EBEBF5]">
                <div className="h-2.5 bg-[#EBEBF5] rounded-full overflow-hidden">
                  <div className="h-full rounded-full transition-all bg-[#8403C5]" style={{ width: `${stats.pct}%` }} />
                </div>
                <p className="text-[10px] mt-1.5 font-semibold" style={{ color: labelColor }}>
                  {stats.annualDays} of {stats.entitlement} days used
                </p>
              </div>

              {/* View all entries link */}
              <button onClick={() => setExpandedPerson(isExpanded ? null : name)}
                className="w-full flex items-center justify-center gap-1 px-5 py-2.5 text-xs font-semibold text-[#8403C5] hover:bg-[#F3E8FF] border-t border-[#EBEBF5] transition-colors">
                {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                View all entries
              </button>

              {/* Expandable entries table */}
              {isExpanded && (
                <div className="border-t border-[#EBEBF5] max-h-64 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0">
                      <tr className="border-b border-[#EBEBF5] bg-[#F6F6FB]">
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#5777AB] uppercase">Date</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#5777AB] uppercase">Type</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#5777AB] uppercase">Days</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#5777AB] uppercase">Status</th>
                        <th className="px-4 py-2 text-left text-[10px] font-semibold text-[#5777AB] uppercase">Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.entries.length === 0 ? (
                        <tr><td colSpan={5} className="px-4 py-6 text-center text-xs text-[#9CA3AF]">No entries for {year}</td></tr>
                      ) : stats.entries.map(e => (
                        <tr key={e.id} className="border-b border-[#F2F2F4] last:border-0">
                          <td className="px-4 py-2 text-xs text-[#242450]">{fmtDate(e.startDate)}</td>
                          <td className="px-4 py-2 text-xs text-[#5777AB]">{e.type}</td>
                          <td className="px-4 py-2 text-xs font-semibold text-[#242450]">{calcWorkingDays(e.startDate, e.endDate)}</td>
                          <td className="px-4 py-2">
                            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_STYLES[e.status] || ''}`}>{e.status}</span>
                          </td>
                          <td className="px-4 py-2 text-xs text-[#5777AB] max-w-[150px] truncate">{e.notes || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}