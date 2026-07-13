export const PRIORITY_STYLES = {
  Low: 'bg-[#EBEBF5] text-[#242450]',
  Medium: 'bg-[#EEF2F8] text-[#5777AB]',
  High: 'bg-[#FFFBEB] text-[#A16207]',
  Urgent: 'bg-[#FEF2F2] text-[#DC2626]',
};

export const STATUS_STYLES = {
  'To Do': 'bg-[#EBEBF5] text-[#242450]',
  'In Progress': 'bg-[#EEF2F8] text-[#5777AB]',
  'Done': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Blocked': 'bg-[#FEF2F2] text-[#DC2626]',
  // Legacy statuses
  'New': 'bg-[#EBEBF5] text-[#242450]',
  'Waiting': 'bg-[#FEF2F2] text-[#DC2626]',
  'Cancelled': 'bg-[#F3F4F6] text-[#6B7280]',
};

export const CATEGORY_STYLES = {
  Marketing: 'bg-[#FFFBEB] text-[#A16207]',
  Sales: 'bg-[#F3E8FF] text-[#8403C5]',
  Operations: 'bg-[#EEF2F8] text-[#5777AB]',
  'Customer Success': 'bg-[#E8F7F2] text-[#1D9E75]',
  'Tech/Product': 'bg-[#EBEBF5] text-[#242450]',
  Admin: 'bg-[#F3F4F6] text-[#374151]',
  // Legacy categories
  Design: 'bg-[#F3E8FF] text-[#8403C5]',
  Content: 'bg-[#EEF2F8] text-[#5777AB]',
  Ops: 'bg-[#E8F7F2] text-[#1D9E75]',
  Tech: 'bg-[#EBEBF5] text-[#242450]',
  Other: 'bg-[#F3F4F6] text-[#6B7280]',
  Self: 'bg-[#F3E8FF] text-[#8403C5]',
};

export const PRIORITY_ORDER = { Urgent: 0, High: 1, Medium: 2, Low: 3 };

export const BOARD_STATUSES = ['To Do', 'In Progress', 'Done', 'Blocked'];
export const NEW_CATEGORIES = ['Marketing', 'Sales', 'Operations', 'Customer Success', 'Tech/Product', 'Admin'];
export const PRIORITIES = ['Low', 'Medium', 'High', 'Urgent'];
export const TEAM_MEMBERS = ['Chris', 'Elena', 'George', 'Martinique', 'Sreeja', 'Ramesh', 'Eleanor'];

// Map old statuses to new ones for display
export const STATUS_MAP = {
  'New': 'To Do',
  'Waiting': 'Blocked',
  'Cancelled': 'Blocked',
};