const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

let broadcastChannel = null;
try {
  if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
    broadcastChannel = new BroadcastChannel('ivory_gold_live_workspace_sync');
  }
} catch {
  // Fallback if BroadcastChannel not supported
}

export function shouldApplyRemoteDraft(remoteEntry, localTimestamp, myUserId) {
  if (!remoteEntry || !remoteEntry.draft && !remoteEntry.timestamp) return false;
  if (remoteEntry.userId && remoteEntry.userId === myUserId) return false;

  const remoteTime = new Date(remoteEntry.timestamp || remoteEntry.updatedAt || 0).getTime();
  const localTime = new Date(localTimestamp || 0).getTime();

  return remoteTime > localTime;
}

// Debounce timer for server sync
let pushTimer = null;

export async function pushRemoteWorkspaceDraft(workspaceId, draft, userLabel = 'Team Member') {
  if (!workspaceId || workspaceId.startsWith('user_') || !draft) return;

  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    try {
      await fetch(`${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/draft`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, lastEditedBy: userLabel }),
      });
    } catch (err) {
      console.warn('Failed to push remote workspace draft:', err);
    }
  }, 250);
}

export function broadcastLiveDraftUpdate({ workspaceId, userId, userLabel, draft, timestamp }) {
  if (!workspaceId || workspaceId === userId || workspaceId.startsWith('user_')) {
    return false;
  }

  const message = {
    type: 'WORKSPACE_DRAFT_UPDATE',
    workspaceId,
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
  pushRemoteWorkspaceDraft(workspaceId, draft, userLabel).catch(() => {});
  return true;
}

export async function fetchRemoteWorkspaceDraft(workspaceId) {
  if (!workspaceId || workspaceId.startsWith('user_')) return null;
  try {
    const res = await fetch(`${API_BASE_URL}/api/workspace/${encodeURIComponent(workspaceId)}/draft`);
    if (!res.ok) return null;
    const json = await res.json();
    return json.data;
  } catch (err) {
    console.warn('Failed to fetch remote workspace draft:', err);
    return null;
  }
}

export function subscribeToLiveWorkspaceSync(workspaceId, onRemoteDraftUpdate, myUserId) {
  if (!workspaceId || workspaceId.startsWith('user_') || typeof onRemoteDraftUpdate !== 'function') {
    return () => {};
  }

  // 1. BroadcastChannel message listener (0ms instant cross-tab/window)
  const handleBroadcast = (event) => {
    const data = event.data;
    if (data && data.type === 'WORKSPACE_DRAFT_UPDATE' && data.workspaceId === workspaceId) {
      if (data.userId !== myUserId) {
        onRemoteDraftUpdate(data);
      }
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBroadcast);
  }

  // 2. Initial fetch & background cloud polling for cross-machine sync
  let isMounted = true;
  const pollServer = async () => {
    if (!isMounted) return;
    const remoteData = await fetchRemoteWorkspaceDraft(workspaceId);
    if (isMounted && remoteData && remoteData.draft) {
      onRemoteDraftUpdate({
        workspaceId,
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
