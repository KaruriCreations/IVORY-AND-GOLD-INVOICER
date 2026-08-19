import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import WorkspaceActivityFeed from './WorkspaceActivityFeed';
import {
  recordWorkspaceActivity,
  getWorkspaceActivities,
  clearWorkspaceActivities,
  markWorkspaceActivitiesAsRead,
  getUnreadActivitiesCount,
} from '../../services/workspaceCollabStore';
import { setWorkspaceId, getClientId } from '../../services/historyStore';
import { ToastProvider } from './Toast';

function renderFeed() {
  return render(
    <ToastProvider>
      <WorkspaceActivityFeed />
    </ToastProvider>
  );
}

describe('WorkspaceActivityFeed Component (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
    setWorkspaceId('team-safari');
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('shows unread notification badge count when there are unread activities', () => {
    recordWorkspaceActivity({
      workspaceId: 'team-safari',
      userId: 'user_teammate',
      userLabel: 'Sarah',
      action: 'ADD_ITEM',
      details: 'Added VIP Table',
    });

    renderFeed();

    // Button should show "1" badge
    const badge = screen.getByTestId('activity-unread-badge') || screen.getByText('1');
    expect(badge).toBeTruthy();
  });

  test('resets notification count back to zero when user opens/views workspace feed', () => {
    recordWorkspaceActivity({
      workspaceId: 'team-safari',
      userId: 'user_teammate',
      userLabel: 'Sarah',
      action: 'ADD_ITEM',
      details: 'Added Floral Centerpiece',
    });

    renderFeed();

    // Initially unread count is 1
    expect(getUnreadActivitiesCount('team-safari')).toBe(1);

    // User clicks button to open and view the feed
    const triggerBtn = screen.getByRole('button', { name: /Live Workspace Feed/i });
    fireEvent.click(triggerBtn);

    // Unread notification badge must now be gone / reset to 0
    expect(screen.queryByTestId('activity-unread-badge')).toBeNull();
    expect(getUnreadActivitiesCount('team-safari')).toBe(0);
  });

  test('clears the entire workspace feed and resets notification badge when clear button is clicked', () => {
    recordWorkspaceActivity({
      workspaceId: 'team-safari',
      userId: 'user_teammate',
      userLabel: 'Sarah',
      action: 'ADD_ITEM',
      details: 'Added sound system',
    });

    // Mock window.confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderFeed();

    // Open feed
    const triggerBtn = screen.getByRole('button', { name: /Live Workspace Feed/i });
    fireEvent.click(triggerBtn);

    expect(screen.getByText(/Added sound system/i)).toBeTruthy();

    // Click Clear Feed button
    const clearBtn = screen.getByTitle(/Clear all workspace activity history/i) || screen.getByText(/Clear Feed/i);
    fireEvent.click(clearBtn);

    // Activities list in storage and UI should be cleared
    expect(getWorkspaceActivities('team-safari')).toEqual([]);
    expect(screen.queryByText(/Added sound system/i)).toBeNull();
    expect(screen.getByText(/No recent team actions/i)).toBeTruthy();
  });
});
