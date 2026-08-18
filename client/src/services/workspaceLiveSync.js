const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ivory_gold_live_workspace_sync_v2');
  }
} catch {
  // Fallback if BroadcastChannel not supported
}

export function shouldApplyRemoteDraft(remoteEntry, localTimestamp, myUserId, activeFileId) {
  if (!remoteEntry || (!remoteEntry.draft && !remoteEntry.timestamp)) return false;
  if (remoteEntry.userId && remoteEntry.userId === myUserId) return false;
  // If a fileId is specified, ensure it matches the current active file
  if (remoteEntry.fileId && activeFileId && remoteEntry.fileId !== activeFileId) {
    return false;
  }

  const remoteTime = new Date(remoteEntry.timestamp || remoteEntry.updatedAt || 0).getTime();
  const localTime = new Date(localTimestamp || 0).getTime();

  return remoteTime > localTime;
}

// Debounce timer for server draft sync
const pushTimers = new Map(); // Map<fileKey, timer>

export async function pushRemoteWorkspaceDraft(workspaceId, fileId, draft, userLabel = 'Team Member') {
  if (!workspaceId || workspaceId.startsWith('user_') || !draft || !fileId) return;

  const key = `${workspaceId}:${fileId}`;
  if (pushTimers.has(key)) {
    clearTimeout(pushTimers.get(key));
  }

  const timer = setTimeout(async () => {
    try {
      await fetch(
        `${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId)}/draft`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ draft, lastEditedBy: userLabel }),
        }
      );
    } catch (err) {
      console.warn('Failed to push remote workspace file draft:', err);
    }
  }, 250);

  pushTimers.set(key, timer);
}

/**
 * Broadcast live draft update scoped to a specific file
 */
export function broadcastLiveDraftUpdate({ workspaceId, fileId, userId, userLabel, draft, timestamp }) {
  if (!workspaceId || workspaceId === userId || workspaceId.startsWith('user_')) {
    return false;
  }

  const targetFileId = fileId || 'doc_main';
  const message = {
    type: 'WORKSPACE_DRAFT_UPDATE',
    workspaceId,
    fileId: targetFileId,
    userId,
    userLabel: userLabel || 'Team Member',
    draft,
    timestamp: timestamp || new Date().toISOString(),
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (e) {
      console.warn('Broadcast error:', e);
    }
  }

  // Push to server in background
  pushRemoteWorkspaceDraft(workspaceId, targetFileId, draft, userLabel).catch(() => {});
  return true;
}

/**
 * Broadcast presence heartbeat (so peers know who is in which file)
 */
export function broadcastPresenceHeartbeat({ workspaceId, fileId, userId, userLabel }) {
  if (!workspaceId || workspaceId === userId || workspaceId.startsWith('user_')) {
    return false;
  }

  const message = {
    type: 'WORKSPACE_PRESENCE_HEARTBEAT',
    workspaceId,
    fileId: fileId || 'doc_main',
    userId,
    userLabel: userLabel || 'Team Member',
    timestamp: Date.now(),
  };

  if (broadcastChannel) {
    try {
      broadcastChannel.postMessage(message);
    } catch (e) {
      console.warn('Broadcast presence error:', e);
    }
  }

  // Also send heartbeat to server in background
  fetch(`${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/presence`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId, userLabel, fileId: fileId || 'doc_main' }),
  }).catch(() => {});

  return true;
}

/**
 * Fetch remote files list for workspace
 */
export async function fetchRemoteWorkspaceFiles(workspaceId) {
  if (!workspaceId || workspaceId.startsWith('user_')) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/files`);
    if (!res.ok) return [];
    const json = await res.json();
    return json.files || [];
  } catch (err) {
    console.warn('Failed to fetch remote workspace files:', err);
    return [];
  }
}

/**
 * Fetch remote file draft for specific file
 */
export async function fetchRemoteWorkspaceFileDraft(workspaceId, fileId) {
  if (!workspaceId || workspaceId.startsWith('user_') || !fileId) return null;
  try {
    const res = await fetch(
      `${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/files/${encodeURIComponent(fileId)}/draft`
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Failed to fetch remote file draft:', err);
    return null;
  }
}

/**
 * Subscribe to real-time live sync for the active file
 */
export function subscribeToLiveWorkspaceSync(workspaceId, activeFileId, onRemoteDraftUpdate, myUserId) {
  if (!workspaceId || workspaceId.startsWith('user_') || typeof onRemoteDraftUpdate !== 'function') {
    return () => {};
  }

  const targetFileId = activeFileId || 'doc_main';

  // 1. BroadcastChannel message listener (0ms instant cross-tab/window)
  const handleBroadcast = (event) => {
    const data = event.data;
    if (data && data.type === 'WORKSPACE_DRAFT_UPDATE' && data.workspaceId === workspaceId) {
      // Only apply if message is for THIS active file and from another user
      if (data.fileId === targetFileId && data.userId !== myUserId) {
        onRemoteDraftUpdate(data);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Initial fetch & background cloud polling for cross-machine sync on active file
  let isMounted = true;
  const pollServer = async () => {
    if (!isMounted) return;
    const remoteData = await fetchRemoteWorkspaceFileDraft(workspaceId, targetFileId);
    if (isMounted && remoteData && remoteData.draft) {
      onRemoteDraftUpdate({
        workspaceId,
        fileId: targetFileId,
        userId: 'remote_server',
        userLabel: remoteData.lastEditedBy || 'Team Member',
        draft: remoteData.draft,
        timestamp: remoteData.updatedAt,
      });
    }
  };

  pollServer();
  const pollInterval = setInterval(pollServer, 3000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}

/**
 * Subscribe to workspace presence updates
 */
export function subscribeToWorkspacePresence(workspaceId, onPresenceUpdate, myUserId) {
  if (!workspaceId || workspaceId.startsWith('user_') || typeof onPresenceUpdate !== 'function') {
    return () => {};
  }

  const handleBroadcast = (event) => {
    const data = event.data;
    if (data && data.type === 'WORKSPACE_PRESENCE_HEARTBEAT' && data.workspaceId === workspaceId) {
      onPresenceUpdate(data);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // Poll server presence periodically
  let isMounted = true;
  const pollPresence = async () => {
    if (!isMounted) return;
    try {
      const res = await fetch(`${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/presence`);
      if (res.ok && isMounted) {
        const json = await res.json();
        if (json.active) {
          json.active.forEach((p) => {
            if (p.userId !== myUserId) {
              onPresenceUpdate(p);
            }
          });
        }
      }
    } catch {
      // ignore
    }
  };

  pollPresence();
  const pollInterval = setInterval(pollPresence, 5000);

  return () => {
    isMounted = false;
    clearInterval(pollInterval);
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBroadcast);
    }
  };
}
