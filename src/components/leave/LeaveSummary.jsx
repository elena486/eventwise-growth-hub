import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { format, parseISO } from 'date-fns';
import { ChevronDown, ChevronRight } from 'lucide-react';

const DEFAULT_ENTITLEMENT = 25;
const ALL_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'David'];

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

const AVATAR_COLORS = ['#8403C5', '#1D4ED8', '#15803D', '#A16207', '#B91C1C', '#7E22CE', '#0284C7', '#0F766E'];
function getAvatarColor(name) {
  let h = 0;
  for (let i = 0; i < (name || '').length; i++) h = name.charCodeAt(i) + ((h << 5) - h);
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length];
}
function getInitials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

const STATUS_STYLES = {
  Confirmed: 'bg-[#E8F7F2] text-[#1D9E75]',
  Approved: 'bg-[#EEF2F8] text-[#5777AB]',
  Requested: 'bg-[#FFFBEB] text-[#A16207]',
  Declined: 'bg-[#FEF2F2] text-[#DC2626]',
};

export default function LeaveSummary({ currentUserName }) {
  const currentYear = new Date().getFullYear();
  const [year, setYear] = useState(currentYear);
  const [entries, setEntries] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedPerson, setExpandedPerson] = useState(null);
  const [entitlements, setEntitlements] = useState({});
  const [savingEntitlement, setSavingEntitlement] = useState(null);

  const load = async () => {
    setLoading(true);
    const [allEntries, teamMembers] = await Promise.all([
      base44.entities.LeaveEntry.list(500),
      base44.entities.TeamMember.list(),
    ]);
    setEntries(allEntries);
    setMembers(teamMembers);
    const entMap = {};
    ALL_MEMBERS.forEach(m => { entMap[m] = DEFAULT_ENTITLEMENT; });
    teamMembers.forEach(m => { if (m.name) entMap[m.name] = m.annualLeaveEntitlement || DEFAULT_ENTITLEMENT; });
    setEntitlements(entMap);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const yearEntries = entries.filter(e => {
    try { return new Date(e.startDate).getFullYear() === year; } catch { return false; }
  });

  const personMap = {};
  yearEntries.forEach(e => {
    if (!personMap[e.personName]) personMap[e.personName] = [];
    personMap[e.personName].push(e);
  });

  const persons = Object.keys(personMap).sort((a, b) => {
    if (a === 'George') return -1;
    if (b === 'George') return 1;
    if (a === 'Martinique') return -1;
    if (b === 'Martinique') return 1;
    return a.localeCompare(b);
  });

  const getStats = (name) => {
    const personEntries = (personMap[name] || []).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
    const valid = (e) => e.status === 'Confirmed' || e.status === 'Approved';
    const annualDays = personEntries.filter(e => e.type === 'Annual Leave' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const sickDays = personEntries.filter(e => e.type === 'Sick' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const otherDays = personEntries.filter(e => e.type === 'Other' && valid(e)).reduce((s, e) => s + calcWorkingDays(e.startDate, e.endDate), 0);
    const entitlement = entitlements[name] ?? DEFAULT_ENTITLEMENT;
    const remaining = Math.max(entitlement - annualDays, 0);
    const pct = entitlement > 0 ? Math.min((annualDays / entitlement) * 100, 100) : 0;
    return { annualDays, sickDays, otherDays, entitlement, remaining, pct, entries: personEntries };
  };

  const handleEntitlementChange = async (name, value) => {
    const numVal = parseInt(value) || 0;
    setEntitlements(prev => ({ ...prev, [name]: numVal }));
    setSavingEntitlement(name);
    const member = members.find(m => m.name === name);
    if (member) {
      await base44.entities.TeamMember.update(member.id, { annualLeaveEntitlement: numVal });
    } else {
      await base44.entities.TeamMember.create({ name, annualLeaveEntitlement: numVal, availabilityRequired: false });
      const teamMembers = await base44.entities.TeamMember.list();
      setMembers(teamMembers);
    }
    setSavingEntitlement(null);
  };

  const years = [currentYear - 1, currentYear, currentYear + 1];

  if (loading) return (
    <div className="flex items-center justify-center h-32">
      <div className="w-5 h-5 border-2 border-[#8403C5]/20 border-t-[#8403C5] rounded-full animate-spin" />
    </div>
  );

  return (
    <div>
      {/* Year selector */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[15px] font-bold text-[#242450]">Leave Summary — {year}</h2>
        <div className="flex items-center gap-1">
          {years.map(y => (
            <button key={y} onClick={() => setYear(y)}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${year === y ? 'bg-[#8403C5] text-white border-[#8403C5]' : 'bg-white text-[#5777AB] border-[#EBEBF5] hover:bg-[#F6F6FB]'}`}>
              {y}
            </button>
          ))}
        </div>
      </div>

      {/* Entitlement Settings */}
      <div className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden mb-6">
        <div className="px-5 py-3.5 border-b border-[#EBEBF5] bg-[#F6F6FB]">
          <h3 className="text-sm font-bold text-[#242450]">Annual Leave Entitlement Settings</h3>
          <p className="text-xs text-[#5777AB] mt-0.5">Set each team member's annual leave entitlement (days). Default: 25.</p>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-[#EBEBF5]">
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Person</th>
              <th className="px-4 py-2.5 text-left text-[11px] font-semibold text-[#5777AB] uppercase tracking-[0.08em]">Entitlement (days)</th>
            </tr>
          </thead>
          <tbody>
            {ALL_MEMBERS.map(name => (
              <tr key={name} className="border-b border-[#F2F2F4] last:border-0">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold text-white shrink-0" style={{ backgroundColor: getAvatarColor(name) }}>
                      {getInitials(name)}
                    </div>
                    <span className="text-sm font-semibold text-[#242450]">{name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" value={entitlements[name] ?? DEFAULT_ENTITLEMENT}
                      onChange={e => handleEntitlementChange(name, e.target.value)}
                      className="w-20 px-2 py-1 text-sm border border-[#EBEBF5] rounded-lg focus:outline-none focus:border-[#8403C5]" />
                    {savingEntitlement === name && <span className="text-xs text-[#9CA3AF]">Saving…</span>}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Cards */}
      {persons.length === 0 ? (
        <div className="bg-white border border-[#EBEBF5] rounded-xl px-6 py-12 text-center">
          <p className="text-sm text-[#5777AB]">No leave entries for {year}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {persons.map(name => {
            const stats = getStats(name);
            const barColor = stats.pct < 50 ? '#1D9E75' : stats.pct <= 80 ? '#E8A020' : '#DC2626';
            const isExpanded = expandedPerson === name;
            return (
              <div key={name} className="bg-white border border-[#EBEBF5] rounded-xl overflow-hidden">
                <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#EBEBF5]">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold text-white shrink-0" style={{ backgroundColor: getAvatarColor(name) }}>
                      {getInitials(name)}
                    </div>
                    <div>
                      <span className="text-sm font-bold text-[#242450]">{name}</span>
                      <span className="ml-2 text-[11px] font-medium text-[#9CA3AF]">{year}</span>
                    </div>
                  </div>
                  <button onClick={() => setExpandedPerson(isExpanded ? null : name)}
                    className="flex items-center gap-1 text-xs font-semibold text-[#8403C5] hover:bg-[#F3E8FF] px-2 py-1 rounded-lg transition-colors">
                    {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    View all entries
                  </button>
                </div>

                <div className="px-5 py-4 space-y-3">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-xs font-semibold text-[#5777AB]">Annual Leave</span>
                      <span className="text-xs font-bold text-[#242450]">{stats.annualDays} / {stats.entitlement} days</span>
                    </div>
                    <div className="h-2 bg-[#EBEBF5] rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${stats.pct}%`, backgroundColor: barColor }} />
                    </div>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-[10px] text-[#9CA3AF]">{Math.round(stats.pct)}% used</span>
                      <span className="text-[10px] font-semibold" style={{ color: barColor }}>{stats.remaining} days remaining</span>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <div className="bg-[#FFFBEB] rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#A16207] uppercase tracking-wide">Sick Days</p>
                      <p className="text-lg font-bold text-[#A16207]">{stats.sickDays}</p>
                    </div>
                    <div className="bg-[#EEF2F8] rounded-lg px-3 py-2">
                      <p className="text-[10px] font-semibold text-[#5777AB] uppercase tracking-wide">Other Leave</p>
                      <p className="text-lg font-bold text-[#5777AB]">{stats.otherDays}</p>
                    </div>
                  </div>
                </div>

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
                        {stats.entries.map(e => (
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
      )}
    </div>
  );
}