import { getClientId, getWorkspaceId } from './historyStore';
import { getUserDisplayLabel } from './workspaceCollabStore';

const WS_FILES_PREFIX = 'ivory_gold_ws_files_v1_';
const WS_ACTIVE_FILE_PREFIX = 'ivory_gold_ws_active_file_v1_';
const LEGACY_DRAFT_KEY = 'ivory_gold_invoice_draft_v1';
const RAW_API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function getApiUrl(path) {
  if (RAW_API_URL) return `${RAW_API_URL}${path}`;
  if (typeof window !== 'undefined' && window.location?.origin) {
    return `${window.location.origin}${path}`;
  }
  return `http://localhost:3001${path}`;
}

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ivory_gold_live_workspace_sync_v2');
  }
} catch {
  // ignore
}

// In-memory event bus for workspace files updates
const listeners = new Map(); // Map<workspaceId, Set<callback>>

function notifyListeners(workspaceId) {
  const set = listeners.get(workspaceId);
  if (set) {
    const files = getWorkspaceFiles(workspaceId);
    const activeFileId = getActiveFileId(workspaceId);
    set.forEach((cb) => {
      try {
        cb({ files, activeFileId });
      } catch (err) {
        console.warn('WorkspaceFiles subscriber error:', err);
      }
    });
  }
}

function broadcastFilesListChanged(workspaceId, files) {
  if (!broadcastChannel || !workspaceId || workspaceId.startsWith('user_')) return;
  try {
    broadcastChannel.postMessage({
      type: 'WORKSPACE_FILES_CHANGED',
      workspaceId,
      files,
      timestamp: Date.now(),
    });
  } catch (e) {
    console.warn('Failed to broadcast files change:', e);
  }
}

// Listen for broadcast file changes from other tabs/windows
if (broadcastChannel) {
  broadcastChannel.addEventListener('message', (event) => {
    const data = event.data;
    if (data && data.type === 'WORKSPACE_FILES_CHANGED' && data.workspaceId) {
      if (Array.isArray(data.files)) {
        mergeAndPersistFiles(data.workspaceId, data.files);
      } else {
        syncWorkspaceFilesWithServer(data.workspaceId).catch(() => {});
      }
    }
  });
}

/**
 * Generate a friendly display name for a file based on invoice header data
 */
export function formatFileTitle(draft, fallback = 'Untitled Invoice') {
  if (!draft) return fallback;
  const clientName = draft.header?.clientName?.trim();
  const invoiceNum = draft.header?.invoiceNum?.trim();
  if (clientName && invoiceNum) return `${clientName} (${invoiceNum})`;
  if (clientName) return `${clientName} Quotation`;
  if (invoiceNum) return `Invoice ${invoiceNum}`;
  return fallback;
}

/**
 * Create a fresh default blank file
 */
export function createDefaultFile(id = 'doc_main', name = 'Primary Invoice', draft = null) {
  const now = new Date().toISOString();
  return {
    id,
    name,
    invoiceNum: draft?.header?.invoiceNum || 'QUO-2026-001',
    clientName: draft?.header?.clientName || '',
    draft: draft || null,
    lastEditedBy: 'Team Member',
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * Retrieve all files for a given workspace from localStorage
 */
export function getWorkspaceFiles(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  const myClientId = getClientId();
  const isPrivateWs = ws === myClientId || ws.startsWith('user_');
  try {
    const storageKey = `${WS_FILES_PREFIX}${ws}`;
    const raw = typeof window !== 'undefined' ? localStorage.getItem(storageKey) : null;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }

    // Auto-migrate legacy draft only for private workspace if present
    let initialDraft = null;
    if (isPrivateWs && typeof window !== 'undefined') {
      const legacyRaw = localStorage.getItem(LEGACY_DRAFT_KEY);
      if (legacyRaw) {
        try {
          initialDraft = JSON.parse(legacyRaw);
        } catch {
          // ignore
        }
      }
    }

    const defaultName = initialDraft ? formatFileTitle(initialDraft, 'Primary Invoice') : 'Primary Invoice';
    const defaultFile = createDefaultFile('doc_main', defaultName, initialDraft);
    if (typeof window !== 'undefined') {
      localStorage.setItem(storageKey, JSON.stringify([defaultFile]));
      localStorage.setItem(`${WS_ACTIVE_FILE_PREFIX}${ws}`, defaultFile.id);
    }
    return [defaultFile];
  } catch (err) {
    console.warn('Failed to get workspace files:', err);
    return [createDefaultFile()];
  }
}

/**
 * Get active file ID for workspace
 */
export function getActiveFileId(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  try {
    const activeKey = `${WS_ACTIVE_FILE_PREFIX}${ws}`;
    const activeId = typeof window !== 'undefined' ? localStorage.getItem(activeKey) : null;
    if (activeId) {
      const files = getWorkspaceFiles(ws);
      if (files.some((f) => f.id === activeId)) {
        return activeId;
      }
    }
    const files = getWorkspaceFiles(ws);
    const fallbackId = files[0]?.id || 'doc_main';
    if (typeof window !== 'undefined') {
      localStorage.setItem(activeKey, fallbackId);
    }
    return fallbackId;
  } catch {
    return 'doc_main';
  }
}

/**
 * Set active file ID for workspace
 */
export function setActiveFileId(workspaceId, fileId) {
  const ws = workspaceId || getWorkspaceId();
  if (!fileId) return;
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${WS_ACTIVE_FILE_PREFIX}${ws}`, fileId);
    }
    notifyListeners(ws);
  } catch (err) {
    console.warn('Failed to set active file ID:', err);
  }
}

/**
 * Get the active file object directly
 */
export function getActiveWorkspaceFile(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  const activeId = getActiveFileId(ws);
  const files = getWorkspaceFiles(ws);
  return files.find((f) => f.id === activeId) || files[0] || createDefaultFile();
}

/**
 * Save / update file list in localStorage
 */
function persistFiles(workspaceId, files) {
  const ws = workspaceId || getWorkspaceId();
  try {
    if (typeof window !== 'undefined') {
      localStorage.setItem(`${WS_FILES_PREFIX}${ws}`, JSON.stringify(files));
    }
  } catch (err) {
    console.warn('Failed to persist workspace files:', err);
  }
}

/**
 * Merge remote server files with local cache (authoritative deletion and addition)
 */
export function mergeAndPersistFiles(workspaceId, incomingFiles = [], isAuthoritative = false) {
  if (!workspaceId || !Array.isArray(incomingFiles) || incomingFiles.length === 0) return;
  const ws = workspaceId;
  const current = getWorkspaceFiles(ws);
  const activeId = getActiveFileId(ws);

  if (isAuthoritative) {
    // Authoritative sync from server: remote files is the canonical list
    const serverMap = new Map(incomingFiles.map((f) => [f.id, f]));
    const updatedList = incomingFiles.map((sf) => {
      const local = current.find((lf) => lf.id === sf.id);
      if (!local) return sf;
      const sTime = new Date(sf.updatedAt || 0).getTime();
      const lTime = new Date(local.updatedAt || 0).getTime();
      if (sTime >= lTime || !local.draft) {
        return { ...local, ...sf, draft: sf.draft || local.draft };
      }
      return { ...sf, ...local, draft: local.draft || sf.draft };
    });

    const wasActiveFileDeleted = !serverMap.has(activeId);
    persistFiles(ws, updatedList);

    if (wasActiveFileDeleted && updatedList.length > 0) {
      setActiveFileId(ws, updatedList[0].id);
    } else {
      notifyListeners(ws);
    }
    return;
  }

  // Non-authoritative / broadcast merge
  const map = new Map();
  incomingFiles.forEach((incoming) => {
    if (incoming && incoming.id) {
      const existing = current.find((c) => c.id === incoming.id);
      if (existing) {
        map.set(incoming.id, { ...existing, ...incoming, draft: incoming.draft || existing.draft });
      } else {
        map.set(incoming.id, incoming);
      }
    }
  });

  const merged = Array.from(map.values());
  const wasActiveDeleted = !map.has(activeId);
  persistFiles(ws, merged);

  if (wasActiveDeleted && merged.length > 0) {
    setActiveFileId(ws, merged[0].id);
  } else {
    notifyListeners(ws);
  }
}

/**
 * Fetch and sync workspace files from server
 */
export async function syncWorkspaceFilesWithServer(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  if (!ws || ws.startsWith('user_')) return getWorkspaceFiles(ws);

  try {
    const res = await fetch(getApiUrl(`/api/workspace/${encodeURIComponent(ws)}/files`));
    if (!res.ok) return getWorkspaceFiles(ws);
    const json = await res.json();
    const serverFiles = json.files || [];
    if (serverFiles.length > 0) {
      mergeAndPersistFiles(ws, serverFiles, true);
    }
    return getWorkspaceFiles(ws);
  } catch (err) {
    console.warn('Failed to sync workspace files with server:', err);
    return getWorkspaceFiles(ws);
  }
}

/**
 * Create a new file in workspace and activate it
 */
export function createWorkspaceFile(workspaceId, initialDraft = null, customName = '', userLabel = '') {
  const ws = workspaceId || getWorkspaceId();
  const myId = getClientId();
  const author = userLabel || getUserDisplayLabel(myId);
  const files = getWorkspaceFiles(ws);

  const fileId = `file_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const now = new Date().toISOString();
  const invoiceNum = initialDraft?.header?.invoiceNum || `QUO-${new Date().getFullYear()}-${String(files.length + 1).padStart(3, '0')}`;
  const clientName = initialDraft?.header?.clientName || '';
  const calculatedName = customName || (clientName ? `${clientName} (${invoiceNum})` : `Quotation #${files.length + 1}`);

  const newFile = {
    id: fileId,
    name: calculatedName,
    invoiceNum,
    clientName,
    draft: initialDraft,
    lastEditedBy: author,
    createdAt: now,
    updatedAt: now,
  };

  const updated = [...files, newFile];
  persistFiles(ws, updated);
  setActiveFileId(ws, fileId);

  // Broadcast instantly to all local tabs
  broadcastFilesListChanged(ws, updated);

  // Sync to server if shared workspace
  if (ws && !ws.startsWith('user_') && ws !== myId) {
    fetch(getApiUrl(`/api/workspace/${encodeURIComponent(ws)}/files`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: fileId, initialDraft, lastEditedBy: author, name: calculatedName }),
    }).catch(() => {});
  }

  notifyListeners(ws);
  return newFile;
}

/**
 * Update the draft & metadata of a specific file in workspace
 */
export function updateWorkspaceFileDraft(workspaceId, fileId, draftData, userLabel = '') {
  const ws = workspaceId || getWorkspaceId();
  const myId = getClientId();
  const isPrivateWs = ws === myId || ws.startsWith('user_');
  const author = userLabel || getUserDisplayLabel(myId);
  const files = getWorkspaceFiles(ws);

  const targetIdx = files.findIndex((f) => f.id === fileId);
  const now = new Date().toISOString();

  const clientName = draftData?.header?.clientName?.trim() || '';
  const invoiceNum = draftData?.header?.invoiceNum?.trim() || '';
  const calculatedName = clientName
    ? `${clientName} (${invoiceNum || 'Quotation'})`
    : files[targetIdx]?.name || 'Invoice File';

  let updatedFile;
  if (targetIdx >= 0) {
    updatedFile = {
      ...files[targetIdx],
      name: calculatedName,
      clientName: clientName || files[targetIdx].clientName,
      invoiceNum: invoiceNum || files[targetIdx].invoiceNum,
      draft: draftData,
      lastEditedBy: author,
      updatedAt: now,
    };
    files[targetIdx] = updatedFile;
  } else {
    updatedFile = {
      id: fileId,
      name: calculatedName,
      clientName,
      invoiceNum,
      draft: draftData,
      lastEditedBy: author,
      createdAt: now,
      updatedAt: now,
    };
    files.push(updatedFile);
  }

  persistFiles(ws, files);

  // Only sync to legacy key if editing in private individual session
  if (isPrivateWs && fileId === getActiveFileId(ws) && typeof window !== 'undefined') {
    try {
      if (draftData) {
        localStorage.setItem(LEGACY_DRAFT_KEY, JSON.stringify(draftData));
      } else {
        localStorage.removeItem(LEGACY_DRAFT_KEY);
      }
    } catch {
      // ignore
    }
  }

  notifyListeners(ws);
  return updatedFile;
}

/**
 * Duplicate an existing workspace file and switch to it
 */
export function duplicateWorkspaceFile(workspaceId, fileId, userLabel = '') {
  const ws = workspaceId || getWorkspaceId();
  const files = getWorkspaceFiles(ws);
  const source = files.find((f) => f.id === fileId);
  if (!source) return null;

  const clonedDraft = source.draft ? JSON.parse(JSON.stringify(source.draft)) : null;
  if (clonedDraft && clonedDraft.header) {
    const currentNum = clonedDraft.header.invoiceNum || '';
    clonedDraft.header.invoiceNum = currentNum ? `${currentNum}-COPY` : '';
  }

  const copyName = `${source.name || 'Invoice'} (Copy)`;
  return createWorkspaceFile(ws, clonedDraft, copyName, userLabel);
}

/**
 * Rename a workspace file
 */
export function renameWorkspaceFile(workspaceId, fileId, newName, userLabel = '') {
  const ws = workspaceId || getWorkspaceId();
  const files = getWorkspaceFiles(ws);
  const target = files.find((f) => f.id === fileId);
  if (!target) return false;

  target.name = newName.trim() || target.name;
  target.updatedAt = new Date().toISOString();
  if (userLabel) target.lastEditedBy = userLabel;

  persistFiles(ws, files);
  broadcastFilesListChanged(ws, files);

  // Sync to server if shared workspace
  const myId = getClientId();
  if (ws && !ws.startsWith('user_') && ws !== myId && target.draft) {
    fetch(getApiUrl(`/api/workspace/${encodeURIComponent(ws)}/files/${encodeURIComponent(fileId)}/draft`), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ draft: target.draft, lastEditedBy: userLabel, name: target.name }),
    }).catch(() => {});
  }

  notifyListeners(ws);
  return true;
}

/**
 * Delete a workspace file
 */
export function deleteWorkspaceFile(workspaceId, fileId) {
  const ws = workspaceId || getWorkspaceId();
  const files = getWorkspaceFiles(ws);
  const activeId = getActiveFileId(ws);

  if (files.length <= 1) {
    // If only one file, reset it to blank default
    const reset = [createDefaultFile('doc_main', 'Primary Invoice', null)];
    persistFiles(ws, reset);
    setActiveFileId(ws, 'doc_main');
    broadcastFilesListChanged(ws, reset);
    notifyListeners(ws);
    return true;
  }

  const filtered = files.filter((f) => f.id !== fileId);
  persistFiles(ws, filtered);

  if (activeId === fileId) {
    setActiveFileId(ws, filtered[0].id);
  }

  broadcastFilesListChanged(ws, filtered);

  // Delete from server in background
  const myId = getClientId();
  if (ws && !ws.startsWith('user_') && ws !== myId) {
    fetch(getApiUrl(`/api/workspace/${encodeURIComponent(ws)}/files/${encodeURIComponent(fileId)}`), {
      method: 'DELETE',
    }).catch(() => {});
  }

  notifyListeners(ws);
  return true;
}

/**
 * Import a document from History directly as a workspace file
 */
export function importInvoiceToWorkspace(workspaceId, invoiceData, customName = '') {
  if (!invoiceData) return null;
  const ws = workspaceId || getWorkspaceId();
  const title = customName || formatFileTitle(invoiceData, 'Imported Invoice');
  return createWorkspaceFile(ws, invoiceData, title);
}

/**
 * Subscribe to workspace files and active file changes
 */
export function subscribeToWorkspaceFiles(workspaceId, callback) {
  const ws = workspaceId || getWorkspaceId();
  if (!ws || typeof callback !== 'function') return () => {};

  if (!listeners.has(ws)) {
    listeners.set(ws, new Set());
  }

  const set = listeners.get(ws);
  set.add(callback);

  // Initial sync with server in background
  syncWorkspaceFilesWithServer(ws).catch(() => {});

    return () => {
    set.delete(callback);
    if (set.size === 0) {
      listeners.delete(ws);
    }
  };
}

/**
 * Check if draft contains meaningful data entered by a user
 */
export function hasMeaningfulDraftData(draft) {
  if (!draft || typeof draft !== 'object') return false;
  const clientName = draft.header?.clientName?.trim() || '';
  const invoiceNum = draft.header?.invoiceNum?.trim() || '';
  const preparedBy = draft.header?.preparedBy?.trim() || '';
  const sections = draft.sections || [];
  const items = sections.flatMap((s) => s.items || []);
  const validItems = items.filter((i) => i.description?.trim() || Number(i.quantity) > 0 || Number(i.unitPrice) > 0);
  const notes = draft.notes?.trim() || '';
  const eventVenue = draft.eventDetails?.venue?.trim() || '';
  const eventType = draft.eventDetails?.eventType?.trim() || '';

  return Boolean(clientName || invoiceNum || preparedBy || validItems.length > 0 || notes || eventVenue || eventType);
}

/**
 * Get structured active draft info scoped strictly to a given workspace.
 * Returns null if no active draft exists or if the draft is blank.
 */
export function getActiveWorkspaceDraftInfo(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  try {
    const activeFile = getActiveWorkspaceFile(ws);
    const draft = activeFile?.draft;

    if (!draft || !hasMeaningfulDraftData(draft)) {
      return null;
    }

    const clientName = draft.header?.clientName?.trim() || '';
    const invoiceNum = draft.header?.invoiceNum?.trim() || '';
    const sections = draft.sections || [];
    const items = sections.flatMap((s) => s.items || []);
    const validItems = items.filter((i) => i.description?.trim() || Number(i.quantity) > 0 || Number(i.unitPrice) > 0);

    const subtotal = validItems.reduce((acc, i) => acc + (Number(i.quantity) || 0) * (Number(i.unitPrice) || 0), 0);
    const taxRate = Number(draft.taxRate) || 0;
    const grandTotal = Math.round((subtotal + subtotal * (taxRate / 100)) * 100) / 100;

    return {
      workspaceId: ws,
      fileId: activeFile.id,
      fileName: activeFile.name,
      clientName: clientName || 'Untitled Client',
      invoiceNum: invoiceNum || 'Draft Invoice',
      itemCount: validItems.length,
      grandTotal,
      updatedAt: draft.updatedAt || activeFile.updatedAt,
      draftData: draft,
    };
  } catch (err) {
    console.warn('Failed to get active workspace draft info:', err);
    return null;
  }
}

/**
 * Clear/reset the active draft for a workspace
 */
export function clearActiveWorkspaceDraft(workspaceId) {
  const ws = workspaceId || getWorkspaceId();
  const activeId = getActiveFileId(ws);
  const updated = updateWorkspaceFileDraft(ws, activeId, null);

  const myClientId = getClientId();
  if (ws === myClientId || ws.startsWith('user_')) {
    try {
      localStorage.removeItem(LEGACY_DRAFT_KEY);
    } catch {
      // ignore
    }
  }
  return updated;
}
