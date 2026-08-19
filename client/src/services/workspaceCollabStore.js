const USER_NAME_KEY = 'ivory_gold_user_display_name_v1';
const COLLAB_STORAGE_PREFIX = 'ivory_gold_collab_activity_v1_';
const MAX_ACTIVITIES = 50;

// In-memory event bus for instant real-time UI notification
const listeners = new Map(); // Map<workspaceId, Set<callback>>

/**
 * Get or format display name for a user
 */
export function getUserDisplayLabel(userId) {
  try {
    if (typeof window !== 'undefined') {
      const customName = localStorage.getItem(USER_NAME_KEY);
      if (customName && customName.trim()) {
        return customName.trim();
      }
    }
  } catch {
    // Ignore
  }

  if (!userId) return 'Team Member';
  const cleanId = String(userId).replace(/^user_/, '');
  return `User ${cleanId.slice(0, 8)}`;
}

/**
 * Set a customized display name for this user (e.g. "Ruth", "Elvis", "Lead Planner")
 */
export function setUserDisplayName(name) {
  try {
    if (typeof window !== 'undefined') {
      if (name && name.trim()) {
        localStorage.setItem(USER_NAME_KEY, name.trim());
      } else {
        localStorage.removeItem(USER_NAME_KEY);
      }
    }
  } catch {
    // Ignore
  }
}

let lastActivityTime = 0;
function getMonotonicTimestamp() {
  const now = Date.now();
  lastActivityTime = Math.max(now, lastActivityTime + 1);
  return new Date(lastActivityTime).toISOString();
}

/**
 * Record a collaborative activity (only active for shared workspaces)
 */
export function recordWorkspaceActivity({
  workspaceId,
  userId,
  userLabel,
  action,
  details,
}) {
  // If private mode (workspaceId equals userId, or no workspace), do nothing
  if (!workspaceId || workspaceId === userId || workspaceId.startsWith('user_')) {
    return null;
  }

  const finalUserLabel = userLabel || getUserDisplayLabel(userId);
  const activity = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspaceId,
    userId: userId || 'anonymous',
    userLabel: finalUserLabel,
    action: action || 'EDIT',
    details: details || 'Made changes to invoice',
    timestamp: getMonotonicTimestamp(),
  };

  try {
    const storageKey = `${COLLAB_STORAGE_PREFIX}${workspaceId}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    let existing = [];
    if (raw) {
      existing = JSON.parse(raw);
      if (!Array.isArray(existing)) existing = [];
    }

    const updated = [activity, ...existing].slice(0, MAX_ACTIVITIES);
    localStorage.setItem(storageKey, JSON.stringify(updated));
  } catch (err) {
    console.warn('Failed to persist workspace activity:', err);
  }

  // Notify active listeners for this workspace
  const workspaceListeners = listeners.get(workspaceId);
  if (workspaceListeners) {
    workspaceListeners.forEach((callback) => {
      try {
        callback(activity);
      } catch (cbErr) {
        console.warn('Workspace subscriber error:', cbErr);
      }
    });
  }

  return activity;
}

/**
 * Get activity history for a shared workspace
 */
export function getWorkspaceActivities(workspaceId) {
  if (!workspaceId || workspaceId.startsWith('user_')) return [];
  try {
    const storageKey = `${COLLAB_STORAGE_PREFIX}${workspaceId}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    }
  } catch (err) {
    console.warn('Failed to load workspace activities:', err);
  }
  return [];
}

const LAST_VIEWED_PREFIX = 'ivory_gold_collab_last_viewed_v1_';

/**
 * Get the timestamp when the user last viewed the workspace feed
 */
export function getWorkspaceLastViewedTime(workspaceId) {
  if (!workspaceId) return null;
  try {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(`${LAST_VIEWED_PREFIX}${workspaceId}`);
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Mark all current workspace activities as viewed/read (resets notification count to 0)
 */
export function markWorkspaceActivitiesAsRead(workspaceId) {
  if (!workspaceId) return new Date().toISOString();
  const activities = getWorkspaceActivities(workspaceId);
  const now = activities.length > 0 ? activities[0].timestamp : new Date().toISOString();
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${LAST_VIEWED_PREFIX}${workspaceId}`, now);
    }
  } catch {
    // ignore
  }
  return now;
}

/**
 * Get count of unread workspace activities since user last viewed the feed
 */
export function getUnreadActivitiesCount(workspaceId) {
  if (!workspaceId || workspaceId.startsWith('user_')) return 0;
  const activities = getWorkspaceActivities(workspaceId);
  if (activities.length === 0) return 0;

  const lastViewed = getWorkspaceLastViewedTime(workspaceId);
  if (!lastViewed) {
    return activities.length;
  }

  const lastViewedTime = new Date(lastViewed).getTime();
  return activities.filter((act) => new Date(act.timestamp).getTime() > lastViewedTime).length;
}

/**
 * Clear activity history for a workspace
 */
export function clearWorkspaceActivities(workspaceId) {
  if (!workspaceId) return;
  try {
    const storageKey = `${COLLAB_STORAGE_PREFIX}${workspaceId}`;
    localStorage.removeItem(storageKey);
    markWorkspaceActivitiesAsRead(workspaceId);
  } catch (err) {
    console.warn('Failed to clear workspace activities:', err);
  }

  // Notify active listeners with clear event
  const workspaceListeners = listeners.get(workspaceId);
  if (workspaceListeners) {
    workspaceListeners.forEach((callback) => {
      try {
        callback({ type: 'CLEAR_ACTIVITIES', workspaceId });
      } catch (cbErr) {
        console.warn('Workspace subscriber error:', cbErr);
      }
    });
  }
}

/**
 * Subscribe to real-time activity events on a shared workspace
 */
export function subscribeToWorkspaceActivity(workspaceId, callback) {
  if (!workspaceId || typeof callback !== 'function') return () => {};

  if (!listeners.has(workspaceId)) {
    listeners.set(workspaceId, new Set());
  }

  const set = listeners.get(workspaceId);
  set.add(callback);

  // Return unsubscribe function
  return () => {
    set.delete(callback);
    if (set.size === 0) {
      listeners.delete(workspaceId);
    }
  };
}

