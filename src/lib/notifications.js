import { base44 } from '@/api/base44Client';

/**
 * Create a notification record for a recipient.
 */
export async function createNotification({ recipientName, type, message, navigateTo = '', recordId = '', actorName = '' }) {
  if (!recipientName || !message) return;
  try {
    await base44.entities.Notification.create({
      recipientName,
      type,
      message,
      isRead: false,
      navigateTo,
      recordId,
      actorName,
    });
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
}

/**
 * Mark a single notification as read.
 */
export async function markNotificationRead(id) {
  try {
    await base44.entities.Notification.update(id, { isRead: true });
  } catch {}
}

/**
 * Mark all notifications for a recipient as read.
 */
export async function markAllNotificationsRead(recipientName) {
  try {
    await base44.entities.Notification.updateMany(
      { recipientName, isRead: false },
      { $set: { isRead: true } }
    );
  } catch {}
}