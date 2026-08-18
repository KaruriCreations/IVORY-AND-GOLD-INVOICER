import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  broadcastLiveDraftUpdate,
  broadcastPresenceHeartbeat,
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
        myUserId,
        'doc_main'
      )
    ).toBe(false);

    // Another user, older timestamp: reject
    expect(
      shouldApplyRemoteDraft(
        { userId: 'user_xyz', timestamp: '2026-08-17T19:59:00.000Z' },
        localTimestamp,
        myUserId,
        'doc_main'
      )
    ).toBe(false);

    // Another user, newer timestamp, same file: accept!
    expect(
      shouldApplyRemoteDraft(
        { userId: 'user_xyz', fileId: 'doc_main', timestamp: '2026-08-17T20:02:00.000Z' },
        localTimestamp,
        myUserId,
        'doc_main'
      )
    ).toBe(true);

    // Another user, newer timestamp, DIFFERENT file: reject (does not overwrite active file!)
    expect(
      shouldApplyRemoteDraft(
        { userId: 'user_xyz', fileId: 'file_other', timestamp: '2026-08-17T20:02:00.000Z' },
        localTimestamp,
        myUserId,
        'file_active'
      )
    ).toBe(false);
  });

  test('does not broadcast when in private mode', () => {
    const result = broadcastLiveDraftUpdate({
      workspaceId: 'user_123',
      fileId: 'doc_main',
      userId: 'user_123',
      draft: { header: { clientName: 'Private Client' } },
    });

    expect(result).toBe(false);
  });

  test('broadcasts updates when in shared workspace', () => {
    const result = broadcastLiveDraftUpdate({
      workspaceId: 'team-kenya',
      fileId: 'file_wedding',
      userId: 'user_123',
      userLabel: 'Elvis',
      draft: { header: { clientName: 'Team Client' } },
    });

    expect(result).toBe(true);
  });

  test('broadcasts presence heartbeats in shared workspace', () => {
    const result = broadcastPresenceHeartbeat({
      workspaceId: 'team-kenya',
      fileId: 'file_wedding',
      userId: 'user_123',
      userLabel: 'Ruth',
    });

    expect(result).toBe(true);
  });
});
