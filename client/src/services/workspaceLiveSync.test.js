import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  broadcastLiveDraftUpdate,
  subscribeToLiveWorkspaceSync,
  shouldApplyRemoteDraft,
} from './workspaceLiveSync';

describe('workspaceLiveSync - TDD Real-Time Collaborative Sync', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('shouldApplyRemoteDraft only accepts remote draft if remote is newer and from another user', () => {
    const myUserId = 'user_abc';
    const localTimestamp = '2026-08-17T20:00:00.000Z';
    
    // Same user: reject (already has it)
    expect(
      shouldApplyRemoteDraft(
        { userId: myUserId, timestamp: '2026-08-17T20:01:00.000Z' },
        localTimestamp,
        myUserId
      )
    ).toBe(false);

    // Another user, older timestamp: reject
    expect(
      shouldApplyRemoteDraft(
        { userId: 'user_xyz', timestamp: '2026-08-17T19:59:00.000Z' },
        localTimestamp,
        myUserId
      )
    ).toBe(false);

    // Another user, newer timestamp: accept!
    expect(
      shouldApplyRemoteDraft(
        { userId: 'user_xyz', timestamp: '2026-08-17T20:02:00.000Z' },
        localTimestamp,
        myUserId
      )
    ).toBe(true);
  });

  test('does not broadcast when in private mode', () => {
    const result = broadcastLiveDraftUpdate({
      workspaceId: 'user_123',
      userId: 'user_123',
      draft: { header: { clientName: 'Private Client' } },
    });

    expect(result).toBe(false);
  });

  test('broadcasts updates when in shared workspace', () => {
    const result = broadcastLiveDraftUpdate({
      workspaceId: 'team-kenya',
      userId: 'user_123',
      userLabel: 'Elvis',
      draft: { header: { clientName: 'Team Client' } },
    });

    expect(result).toBe(true);
  });
});
