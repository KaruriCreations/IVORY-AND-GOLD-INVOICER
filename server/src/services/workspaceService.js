const {
  isSupabaseConfigured,
  saveWorkspaceDraftToSupabase,
  getWorkspaceDraftFromSupabase,
} = require('./supabaseService');

// In-memory L1 cache for sub-millisecond workspace live drafts & activities
const memoryDrafts = new Map(); // Map<workspaceId, { draft, lastEditedBy, updatedAt }>
const memoryActivities = new Map(); // Map<workspaceId, Array<Activity>>

async function getLiveWorkspaceDraft(workspaceId) {
  if (!workspaceId) return null;

  // 1. Check L1 in-memory cache first
  const cached = memoryDrafts.get(workspaceId);
  if (cached) {
    return cached;
  }

  // 2. Check Supabase if configured
  if (isSupabaseConfigured()) {
    try {
      const cloudDraft = await getWorkspaceDraftFromSupabase(workspaceId);
      if (cloudDraft) {
        memoryDrafts.set(workspaceId, cloudDraft);
        return cloudDraft;
      }
    } catch (err) {
      console.warn('[Workspace Draft Fetch Notice]:', err.message);
    }
  }

  return null;
}

async function updateLiveWorkspaceDraft(workspaceId, draftData, lastEditedBy = 'Team Member') {
  if (!workspaceId || !draftData) return null;

  const now = new Date().toISOString();
  const entry = {
    workspaceId,
    draft: draftData,
    lastEditedBy,
    updatedAt: now,
  };

  // Update in-memory L1 cache
  memoryDrafts.set(workspaceId, entry);

  // Sync to Supabase in background
  if (isSupabaseConfigured()) {
    saveWorkspaceDraftToSupabase(workspaceId, draftData, lastEditedBy).catch((err) => {
      console.warn('[Workspace Draft Sync Notice]:', err.message);
    });
  }

  return entry;
}

function logWorkspaceActivity(workspaceId, activity) {
  if (!workspaceId || !activity) return null;

  const entry = {
    id: `act_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    workspaceId,
    userId: activity.userId || 'anonymous',
    userLabel: activity.userLabel || 'Team Member',
    action: activity.action || 'EDIT',
    details: activity.details || 'Updated invoice',
    timestamp: new Date().toISOString(),
  };

  const list = memoryActivities.get(workspaceId) || [];
  const updated = [entry, ...list].slice(0, 50);
  memoryActivities.set(workspaceId, updated);

  return entry;
}

function getWorkspaceActivities(workspaceId) {
  if (!workspaceId) return [];
  return memoryActivities.get(workspaceId) || [];
}

module.exports = {
  getLiveWorkspaceDraft,
  updateLiveWorkspaceDraft,
  logWorkspaceActivity,
  getWorkspaceActivities,
  memoryDrafts,
  memoryActivities,
};
