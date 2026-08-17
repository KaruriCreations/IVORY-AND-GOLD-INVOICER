const HISTORY_STORAGE_KEY = 'ivory_gold_invoice_history_v1';
const CLIENT_ID_KEY = 'ivory_gold_client_id_v1';
const WORKSPACE_KEY = 'ivory_gold_workspace_id_v1';
const MAX_HISTORY_ITEMS = 200;

/**
 * Get or generate persistent individual client ID
 */
export function getClientId() {
  try {
    if (typeof window === 'undefined') return 'default';
    let id = localStorage.getItem(CLIENT_ID_KEY);
    if (!id) {
      id = 'user_' + Math.random().toString(36).substring(2, 10) + '_' + Date.now().toString(36);
      localStorage.setItem(CLIENT_ID_KEY, id);
    }
    return id;
  } catch {
    return 'default';
  }
}

/**
 * Get active workspace ID (defaults to individual client ID)
 */
export function getWorkspaceId() {
  try {
    if (typeof window === 'undefined') return getClientId();
    return localStorage.getItem(WORKSPACE_KEY) || getClientId();
  } catch {
    return getClientId();
  }
}

/**
 * Set shared workspace / team session ID for collaboration across devices
 */
export function setWorkspaceId(workspaceId) {
  try {
    if (typeof window !== 'undefined') {
      if (workspaceId && workspaceId.trim()) {
        localStorage.setItem(WORKSPACE_KEY, workspaceId.trim());
      } else {
        localStorage.removeItem(WORKSPACE_KEY);
      }
    }
  } catch {
    // Ignore
  }
}

/**
 * Get locally persisted history list from localStorage.
 * If targetClientId is the user's personal ID, returns all invoices personally created by this user
 * (including those generated while in a shared workspace).
 * If targetClientId is a team workspace, returns invoices tagged for that workspace.
 */
export function getLocalHistory(targetClientId = null) {
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem(HISTORY_STORAGE_KEY) : null;
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const items = targetClientId
        ? parsed.filter(
            (item) =>
              item.clientId === targetClientId ||
              item.workspaceId === targetClientId ||
              (!item.clientId && !item.workspaceId)
          )
        : parsed;
      return items.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    }
  } catch (err) {
    console.warn('Failed to load local invoice history:', err);
  }
  return [];
}

/**
 * Save / Add an invoice item to local persistent history
 */
export function addLocalHistoryEntry(entry) {
  if (!entry || !entry.name) return;
  try {
    const myClientId = getClientId();
    const activeWorkspaceId = getWorkspaceId();
    const current = getLocalHistory();
    // Check if item with this name already exists
    const existingIndex = current.findIndex((item) => item.name === entry.name);

    const targetWs = entry.workspaceId || entry.clientId || activeWorkspaceId;
    const formattedEntry = {
      name: entry.name,
      format: entry.format || (entry.name.endsWith('.pdf') ? 'pdf' : 'xlsx'),
      size: entry.size || 0,
      createdAt: entry.createdAt || new Date().toISOString(),
      hasMetadata: Boolean(entry.hasMetadata || entry.invoiceData),
      invoiceData: entry.invoiceData || null,
      creatorId: entry.creatorId || myClientId,
      workspaceId: targetWs,
      clientId: targetWs,
      isCreatedByMe: entry.isCreatedByMe !== undefined ? entry.isCreatedByMe : true,
    };

    let updated;
    if (existingIndex >= 0) {
      updated = [...current];
      updated[existingIndex] = { ...updated[existingIndex], ...formattedEntry };
    } else {
      updated = [formattedEntry, ...current];
    }

    // Limit maximum stored items to prevent quota issues
    const trimmed = updated.slice(0, MAX_HISTORY_ITEMS);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmed));
    return trimmed;
  } catch (err) {
    console.warn('Failed to add local history entry:', err);
  }
}

/**
 * Remove an invoice from local persistent history
 */
export function removeLocalHistoryEntry(filename) {
  try {
    const current = getLocalHistory();
    const filtered = current.filter((item) => item.name !== filename);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(filtered));
    return filtered;
  } catch (err) {
    console.warn('Failed to remove local history entry:', err);
  }
}

/**
 * Intelligently merge server history items with locally cached history items
 */
export function mergeServerAndLocalHistory(serverItems = [], localItems = []) {
  const mergedMap = new Map();
  const myClientId = getClientId();
  const activeWorkspaceId = getWorkspaceId();

  // 1. Add all local items first
  localItems.forEach((local) => {
    if (local && local.name) {
      mergedMap.set(local.name, {
        ...local,
        creatorId: local.creatorId || myClientId,
        workspaceId: local.workspaceId || activeWorkspaceId,
        clientId: local.clientId || activeWorkspaceId,
      });
    }
  });

  // 2. Merge server items
  serverItems.forEach((server) => {
    if (!server || !server.name) return;
    const existing = mergedMap.get(server.name);
    if (existing) {
      mergedMap.set(server.name, {
        ...server,
        invoiceData: existing.invoiceData || server.invoiceData || null,
        hasMetadata: existing.hasMetadata || server.hasMetadata,
        creatorId: existing.creatorId || server.creator_id || null,
        workspaceId: existing.workspaceId || server.client_id || activeWorkspaceId,
        clientId: existing.clientId || server.client_id || activeWorkspaceId,
        isCreatedByMe: existing.isCreatedByMe || false,
      });
    } else {
      mergedMap.set(server.name, {
        name: server.name,
        format: server.format || (server.name.endsWith('.pdf') ? 'pdf' : 'xlsx'),
        size: server.size || 0,
        createdAt: server.createdAt || new Date().toISOString(),
        hasMetadata: Boolean(server.hasMetadata),
        invoiceData: null,
        creatorId: server.creator_id || null,
        workspaceId: server.client_id || activeWorkspaceId,
        clientId: server.client_id || activeWorkspaceId,
        isCreatedByMe: false,
      });
    }
  });

  const mergedList = Array.from(mergedMap.values()).sort(
    (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)
  );

  // Sync merged back to local storage
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(mergedList.slice(0, MAX_HISTORY_ITEMS)));
  } catch (err) {
    console.warn('Failed to sync merged history to localStorage:', err);
  }

  return mergedList;
}
