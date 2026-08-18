const {
  isSupabaseConfigured,
  saveWorkspaceDraftToSupabase,
  getWorkspaceDraftFromSupabase,
} = require('./supabaseService');

// In-memory L1 cache for workspace live files, drafts, activities & presence
// Map<workspaceId, Map<fileId, { id, name, invoiceNum, clientName, draft, lastEditedBy, updatedAt, createdAt }>>
const memoryWorkspaceFiles = new Map();
// Map<workspaceId, Map<userId, { userId, userLabel, fileId, lastSeen }>>
const memoryWorkspacePresence = new Map();
// Map<workspaceId, Array<Activity>>
const memoryActivities = new Map();

const PRESENCE_TIMEOUT_MS = 30000; // 30 seconds

function ensureWorkspaceFiles(workspaceId) {
  if (!memoryWorkspaceFiles.has(workspaceId)) {
    memoryWorkspaceFiles.set(workspaceId, new Map());
  }
  const filesMap = memoryWorkspaceFiles.get(workspaceId);
  if (filesMap.size === 0) {
    const defaultId = 'doc_main';
    const now = new Date().toISOString();
    filesMap.set(defaultId, {
      id: defaultId,
      name: 'Primary Invoice',
      invoiceNum: 'QUO-2026-001',
      clientName: '',
      draft: null,
      lastEditedBy: 'Team Member',
      createdAt: now,
      updatedAt: now,
    });
  }
  return filesMap;
}

/**
 * Get list of all files in workspace with summary metadata and draft data
 */
async function getWorkspaceFiles(workspaceId) {
  if (!workspaceId) return [];
  const filesMap = ensureWorkspaceFiles(workspaceId);
  const presenceList = getWorkspacePresence(workspaceId);

  return Array.from(filesMap.values()).map((file) => {
    const activeUsers = presenceList.filter((p) => p.fileId === file.id);
    return {
      id: file.id,
      name: file.name || file.draft?.header?.clientName || 'Untitled Invoice',
      invoiceNum: file.invoiceNum || file.draft?.header?.invoiceNum || '',
      clientName: file.clientName || file.draft?.header?.clientName || '',
      lastEditedBy: file.lastEditedBy || 'Team Member',
      createdAt: file.createdAt,
      updatedAt: file.updatedAt,
      hasDraft: Boolean(file.draft),
      draft: file.draft || null,
      activeUsers,
    };
  });
}

/**
 * Get draft for a specific file in workspace
 */
async function getWorkspaceFileDraft(workspaceId, fileId) {
  if (!workspaceId || !fileId) return null;
  const filesMap = ensureWorkspaceFiles(workspaceId);
  const file = filesMap.get(fileId);
  if (file && file.draft) {
    return {
      workspaceId,
      fileId,
      name: file.name,
      draft: file.draft,
      lastEditedBy: file.lastEditedBy,
      updatedAt: file.updatedAt,
    };
  }

  // Fallback to Supabase if configured and not cached in memory
  if (isSupabaseConfigured()) {
    try {
      const cloudKey = fileId === 'doc_main' ? workspaceId : `${workspaceId}__${fileId}`;
      const cloudDraft = await getWorkspaceDraftFromSupabase(cloudKey);
      if (cloudDraft && cloudDraft.draft) {
        if (file) {
          file.draft = cloudDraft.draft;
          file.lastEditedBy = cloudDraft.lastEditedBy;
          file.updatedAt = cloudDraft.updatedAt;
        }
        return {
          workspaceId,
          fileId,
          name: file?.name || 'Invoice File',
          draft: cloudDraft.draft,
          lastEditedBy: cloudDraft.lastEditedBy,
          updatedAt: cloudDraft.updatedAt,
        };
      }
    } catch (err) {
      console.warn('[Workspace Cloud File Fetch Notice]:', err.message);
    }
  }

  return file ? { workspaceId, fileId, name: file.name, draft: file.draft, lastEditedBy: file.lastEditedBy, updatedAt: file.updatedAt } : null;
}

/**
 * Create or update draft for a specific file in workspace
 */
async function updateWorkspaceFileDraft(workspaceId, fileId, draftData, userLabel = 'Team Member', fileName = '') {
  if (!workspaceId || !fileId || !draftData) return null;
  const filesMap = ensureWorkspaceFiles(workspaceId);
  const now = new Date().toISOString();

  let file = filesMap.get(fileId);
  const clientName = draftData.header?.clientName?.trim() || '';
  const invoiceNum = draftData.header?.invoiceNum?.trim() || '';
  const calculatedName = fileName || (clientName ? `${clientName} (${invoiceNum || 'Quotation'})` : (file?.name || 'Invoice File'));

  if (!file) {
    file = {
      id: fileId,
      name: calculatedName,
      invoiceNum,
      clientName,
      draft: draftData,
      lastEditedBy: userLabel,
      createdAt: now,
      updatedAt: now,
    };
    filesMap.set(fileId, file);
  } else {
    file.draft = draftData;
    file.name = fileName || (clientName ? `${clientName} (${invoiceNum || 'Quotation'})` : file.name);
    file.invoiceNum = invoiceNum || file.invoiceNum;
    file.clientName = clientName || file.clientName;
    file.lastEditedBy = userLabel;
    file.updatedAt = now;
  }

  // Sync draft to Supabase for persistent cloud storage
  if (isSupabaseConfigured()) {
    const cloudKey = fileId === 'doc_main' ? workspaceId : `${workspaceId}__${fileId}`;
    saveWorkspaceDraftToSupabase(cloudKey, draftData, userLabel).catch((err) => {
      console.warn('[Workspace Draft Cloud Sync Notice]:', err.message);
    });
  }

  return {
    workspaceId,
    fileId,
    name: file.name,
    draft: file.draft,
    lastEditedBy: file.lastEditedBy,
    updatedAt: file.updatedAt,
  };
}

/**
 * Create a brand new file in workspace (preserves custom ID if supplied by client)
 */
async function createWorkspaceFile(workspaceId, initialDraft = null, userLabel = 'Team Member', fileName = '', customId = null) {
  if (!workspaceId) return null;
  const filesMap = ensureWorkspaceFiles(workspaceId);
  const fileId = customId || `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();

  const clientName = initialDraft?.header?.clientName?.trim() || '';
  const invoiceNum = initialDraft?.header?.invoiceNum?.trim() || `QUO-${new Date().getFullYear()}-${String(filesMap.size + 1).padStart(3, '0')}`;
  const name = fileName || (clientName ? `${clientName} (${invoiceNum})` : `Quotation #${filesMap.size + 1}`);

  const newFile = {
    id: fileId,
    name,
    invoiceNum,
    clientName,
    draft: initialDraft,
    lastEditedBy: userLabel,
    createdAt: now,
    updatedAt: now,
  };

  filesMap.set(fileId, newFile);
  return newFile;
}

/**
 * Delete a file from workspace
 */
async function deleteWorkspaceFile(workspaceId, fileId) {
  if (!workspaceId || !fileId) return false;
  const filesMap = ensureWorkspaceFiles(workspaceId);
  
  let deleted = false;
  if (filesMap.size <= 1) {
    // If only one file left, clear draft instead of deleting completely
    const onlyFile = filesMap.get(fileId);
    if (onlyFile) {
      onlyFile.draft = null;
      onlyFile.name = 'Primary Invoice';
      onlyFile.updatedAt = new Date().toISOString();
      deleted = true;
    }
  } else {
    deleted = filesMap.delete(fileId);
  }

  // Clear presence entries for the deleted file
  const presenceMap = memoryWorkspacePresence.get(workspaceId);
  if (presenceMap) {
    for (const [userId, entry] of presenceMap.entries()) {
      if (entry.fileId === fileId) {
        const remaining = Array.from(filesMap.keys());
        entry.fileId = remaining[0] || 'doc_main';
      }
    }
  }

  return deleted;
}

/**
 * Update user live presence on a file
 */
function updateWorkspacePresence(workspaceId, userId, userLabel, fileId) {
  if (!workspaceId || !userId) return null;
  if (!memoryWorkspacePresence.has(workspaceId)) {
    memoryWorkspacePresence.set(workspaceId, new Map());
  }
  const presenceMap = memoryWorkspacePresence.get(workspaceId);
  const entry = {
    userId,
    userLabel: userLabel || 'Team Member',
    fileId: fileId || 'doc_main',
    lastSeen: Date.now(),
  };
  presenceMap.set(userId, entry);
  return entry;
}

/**
 * Get active users and their active files in workspace
 */
function getWorkspacePresence(workspaceId) {
  if (!workspaceId) return [];
  const presenceMap = memoryWorkspacePresence.get(workspaceId);
  if (!presenceMap) return [];

  const now = Date.now();
  const active = [];
  for (const [userId, entry] of presenceMap.entries()) {
    if (now - entry.lastSeen <= PRESENCE_TIMEOUT_MS) {
      active.push({
        userId: entry.userId,
        userLabel: entry.userLabel,
        fileId: entry.fileId,
        lastSeen: entry.lastSeen,
      });
    } else {
      presenceMap.delete(userId);
    }
  }
  return active;
}

/**
 * Legacy single-draft backwards compatibility
 */
async function getLiveWorkspaceDraft(workspaceId) {
  return getWorkspaceFileDraft(workspaceId, 'doc_main');
}

async function updateLiveWorkspaceDraft(workspaceId, draftData, lastEditedBy = 'Team Member') {
  return updateWorkspaceFileDraft(workspaceId, 'doc_main', draftData, lastEditedBy);
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
    fileId: activity.fileId || null,
    fileName: activity.fileName || null,
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
  getWorkspaceFiles,
  getWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  createWorkspaceFile,
  deleteWorkspaceFile,
  updateWorkspacePresence,
  getWorkspacePresence,
  getLiveWorkspaceDraft,
  updateLiveWorkspaceDraft,
  logWorkspaceActivity,
  getWorkspaceActivities,
  memoryWorkspaceFiles,
  memoryWorkspacePresence,
  memoryActivities,
};
