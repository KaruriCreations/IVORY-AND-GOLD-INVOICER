import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  recordWorkspaceActivity,
  getWorkspaceActivities,
  clearWorkspaceActivities,
  subscribeToWorkspaceActivity,
  getUserDisplayLabel,
  setUserDisplayName,
} from './workspaceCollabStore';

describe('workspaceCollabStore - TDD Suite for Workspace Activity & Collaboration', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('getUserDisplayLabel defaults to short user id and can be customized', () => {
    const defaultLabel = getUserDisplayLabel('user_abc12345');
    expect(defaultLabel).toBe('User abc12345');

    setUserDisplayName('Elvis');
    expect(getUserDisplayLabel('user_abc12345')).toBe('Elvis');
  });

  test('does not record activities in private mode (workspaceId === clientId)', () => {
    const res = recordWorkspaceActivity({
      workspaceId: 'user_123',
      userId: 'user_123',
      action: 'ADD_ITEM',
      details: 'Added line item "Gold Chairs"',
    });

    expect(res).toBeNull();
    const list = getWorkspaceActivities('user_123');
    expect(list).toEqual([]);
  });

  test('records and retrieves activities when in a shared team workspace', () => {
    const activity = recordWorkspaceActivity({
      workspaceId: 'team-kenya',
      userId: 'user_xyz789',
      userLabel: 'Sarah',
      action: 'ADD_ITEM',
      details: 'Added 50x Chiavari Chairs (KES 25,000)',
    });

    expect(activity).toBeDefined();
    expect(activity.workspaceId).toBe('team-kenya');
    expect(activity.userLabel).toBe('Sarah');
    expect(activity.details).toContain('Chiavari Chairs');

    const history = getWorkspaceActivities('team-kenya');
    expect(history.length).toBe(1);
    expect(history[0].action).toBe('ADD_ITEM');
  });

  test('limits activity history to prevent unbounded growth and sorts newest first', () => {
    for (let i = 1; i <= 5; i++) {
      recordWorkspaceActivity({
        workspaceId: 'team-kenya',
        userId: `user_${i}`,
        action: 'UPDATE_FIELD',
        details: `Updated field ${i}`,
      });
    }

    const history = getWorkspaceActivities('team-kenya');
    expect(history.length).toBe(5);
    expect(history[0].details).toBe('Updated field 5'); // Newest first
  });

  test('notifies subscribers in real-time when activity is logged', () => {
    const listener = vi.fn();
    const unsubscribe = subscribeToWorkspaceActivity('team-kenya', listener);

    recordWorkspaceActivity({
      workspaceId: 'team-kenya',
      userId: 'user_abc',
      userLabel: 'Elvis',
      action: 'ADD_SECTION',
      details: 'Added section "SOUND & LIGHTING"',
    });

    expect(listener).toHaveBeenCalledTimes(1);
    expect(listener).toHaveBeenCalledWith(
      expect.objectContaining({
        workspaceId: 'team-kenya',
        userLabel: 'Elvis',
        action: 'ADD_SECTION',
      })
    );

    unsubscribe();

    recordWorkspaceActivity({
      workspaceId: 'team-kenya',
      userId: 'user_abc',
      action: 'DELETE_ITEM',
      details: 'Deleted item',
    });

    // Should not receive calls after unsubscribe
    expect(listener).toHaveBeenCalledTimes(1);
  });

  test('clears activities for a workspace', () => {
    recordWorkspaceActivity({
      workspaceId: 'team-kenya',
      userId: 'user_abc',
      action: 'ADD_ITEM',
      details: 'Item A',
    });

    expect(getWorkspaceActivities('team-kenya').length).toBe(1);
    clearWorkspaceActivities('team-kenya');
    expect(getWorkspaceActivities('team-kenya').length).toBe(0);
  });
});
