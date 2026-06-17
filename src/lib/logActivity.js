import { base44 } from '@/api/base44Client';

let _cachedName = null;
async function resolveTeamMember() {
  if (_cachedName) return _cachedName;
  try {
    const me = await base44.auth.me();
    if (me?.full_name) {
      const first = me.full_name.split(' ')[0];
      const members = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh'];
      if (members.includes(first)) {
        _cachedName = first;
        return first;
      }
    }
  } catch {}
  return '';
}

export async function logActivity({ teamMember, actionType, section, recordName = '', details = '' }) {
  if (!actionType || !section) return;
  try {
    const member = teamMember || await resolveTeamMember();
    if (!member) return;
    await base44.entities.ActivityLog.create({ teamMember: member, actionType, section, recordName, details });
  } catch (err) {
    console.error('[logActivity] Failed:', err?.message || err);
  }
}

export const SECTION_COLORS = {
  'Sprints': '#8403C5',
  'Time & Capacity': '#5777AB',
  'To-Do Board': '#1D9E75',
  'Customer Success': '#14B8A6',
  'Sales': '#E8A020',
  'Competitors': '#DC2626',
  'Time Off': '#6366F1',
  'Authentication': '#9CA3AF',
};

export const MEMBER_COLORS = {
  'Chris': '#8403C5',
  'Elena': '#1D9E75',
  'George': '#E8A020',
  'Martinique': '#0EA5E9',
  'Sreeja': '#DC2626',
  'Ramesh': '#5777AB',
};