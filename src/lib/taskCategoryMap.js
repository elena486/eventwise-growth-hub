/**
 * Maps Request (To-Do Board) categories to TimeEntry categories.
 * Used when a user picks a To-Do task to track time against — the
 * time entry's category auto-fills from the task's category.
 */
const TASK_TO_TIME_CATEGORY = {
  'Marketing': 'Marketing & Content',
  'Sales': 'Sales & Outbound',
  'Operations': 'Operations & Admin',
  'Ops': 'Operations & Admin',
  'Customer Success': 'Customer Success & Onboarding',
  'Tech/Product': 'Product & Tech',
  'Tech': 'Product & Tech',
  'Admin': 'Operations & Admin',
  'Design': 'Other',
  'Content': 'Marketing & Content',
  'Other': 'Other',
  'Self': 'Other',
  'Finance': 'Finance',
  'Strategy & Planning': 'Strategy & Planning',
};

export function mapTaskCategoryToTimeCategory(taskCategory) {
  return TASK_TO_TIME_CATEGORY[taskCategory] || 'Other';
}