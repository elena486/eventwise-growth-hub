const STORAGE_KEY = 'eventwise_recently_viewed';
const MAX_ITEMS = 10;

// Entry shape: { type, name, section, tab, recordId, timestamp, sectionId? }

export function getRecentlyViewed() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function addRecentlyViewed(entry) {
  const items = getRecentlyViewed();
  // Remove existing entry with same type+recordId
  const filtered = items.filter(i => !(i.type === entry.type && i.recordId === entry.recordId));
  // Prepend the new entry
  const updated = [{ ...entry, timestamp: Date.now() }, ...filtered];
  // Keep max 10
  const trimmed = updated.slice(0, MAX_ITEMS);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  return trimmed;
}

export function clearRecentlyViewed() {
  localStorage.removeItem(STORAGE_KEY);
}

export const TYPE_META = {
  lead: { icon: '📊', label: 'Lead' },
  deal: { icon: '💼', label: 'Deal' },
  client: { icon: '👤', label: 'Client' },
  bug: { icon: '🐛', label: 'Bug' },
  request: { icon: '✅', label: 'Task' },
  competitor: { icon: '🏢', label: 'Competitor' },
  wiki: { icon: '📄', label: 'Wiki page' },
  content: { icon: '📝', label: 'Content' },
};

export function formatRelativeTime(timestamp) {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes === 1) return '1 min ago';
  if (minutes < 60) return `${minutes} min ago`;
  if (hours === 1) return '1 hour ago';
  if (hours < 24) return `${hours} hours ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const date = new Date(timestamp);
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}