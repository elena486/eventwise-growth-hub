import { base44 } from '@/api/base44Client';

export async function logActivity({ teamMember, actionType, section, recordName = '', details = '' }) {
  try {
    await base44.entities.ActivityLog.create({
      teamMember,
      actionType,
      section,
      recordName,
      details,
    });
  } catch {}
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