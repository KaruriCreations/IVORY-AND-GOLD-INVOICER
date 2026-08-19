import { describe, test, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import HistoryPage from './HistoryPage';
import {
  getActiveWorkspaceFile,
  updateWorkspaceFileDraft,
  clearActiveWorkspaceDraft,
} from '../services/workspaceFilesStore';
import { setWorkspaceId, getClientId } from '../services/historyStore';
import { ToastProvider } from '../components/ui/Toast';

// Mock fetch globally
global.fetch = vi.fn().mockImplementation(() =>
  Promise.resolve({
    ok: true,
    json: () => Promise.resolve({ files: [] }),
  })
);

function renderHistoryPage() {
  return render(
    <MemoryRouter>
      <ToastProvider>
        <HistoryPage />
      </ToastProvider>
    </MemoryRouter>
  );
}

describe('HistoryPage - Active Draft & Workspace Isolation', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('does NOT show active editing session banner when workspace has no draft', () => {
    renderHistoryPage();
    expect(screen.queryByText(/Active Editing Session In Progress/i)).toBeNull();
  });

  test('shows active editing session banner when active workspace has draft', () => {
    const ws = getClientId();
    const file = getActiveWorkspaceFile(ws);
    updateWorkspaceFileDraft(ws, file.id, {
      header: { clientName: 'Safari Ltd', invoiceNum: 'QUO-SAFARI-01' },
      sections: [{ id: 1, title: 'Travel', items: [{ id: 1, description: 'Van Hire', quantity: 1, unitPrice: 15000 }] }],
      taxRate: 0,
      updatedAt: new Date().toISOString(),
    });

    renderHistoryPage();

    expect(screen.getByText(/Active Editing Session In Progress/i)).toBeTruthy();
    expect(screen.getByText(/Safari Ltd/i)).toBeTruthy();
    expect(screen.getByText(/QUO-SAFARI-01/i)).toBeTruthy();
    expect(screen.getByText(/Open Active Session/i)).toBeTruthy();
  });

  test('hides active editing session banner after user discards draft', () => {
    const ws = getClientId();
    const file = getActiveWorkspaceFile(ws);
    updateWorkspaceFileDraft(ws, file.id, {
      header: { clientName: 'Temporary Event', invoiceNum: 'QUO-TEMP-99' },
      sections: [{ id: 1, title: 'Sound', items: [{ id: 1, description: 'Speakers', quantity: 2, unitPrice: 2000 }] }],
    });

    // Mock confirm
    vi.spyOn(window, 'confirm').mockImplementation(() => true);

    renderHistoryPage();
    expect(screen.getByText(/Temporary Event/i)).toBeTruthy();

    const discardBtn = screen.getByTitle(/Discard this draft session/i);
    fireEvent.click(discardBtn);

    expect(screen.queryByText(/Temporary Event/i)).toBeNull();
    expect(screen.queryByText(/Active Editing Session In Progress/i)).toBeNull();
  });

  test('switching from workspace with draft to clean workspace removes the banner', () => {
    // 1. Setup 'mtaa' workspace with a draft
    setWorkspaceId('mtaa');
    const mtaaFile = getActiveWorkspaceFile('mtaa');
    updateWorkspaceFileDraft('mtaa', mtaaFile.id, {
      header: { clientName: 'mtaa', invoiceNum: 'QUO-MTAA-01' },
      sections: [{ id: 1, title: 'Decor', items: [{ id: 1, description: 'Table Setup', quantity: 1, unitPrice: 5000 }] }],
    });

    renderHistoryPage();
    expect(screen.getByText(/QUO-MTAA-01/i)).toBeTruthy();
    expect(screen.getByText(/Active Editing Session In Progress/i)).toBeTruthy();

    // 2. User exits workspace (switches back to private individual session)
    act(() => {
      setWorkspaceId(''); // resets to private clientId and dispatches workspace-changed
    });

    // Banner from 'mtaa' must be gone in private mode!
    expect(screen.queryByText(/QUO-MTAA-01/i)).toBeNull();
    expect(screen.queryByText(/Active Editing Session In Progress/i)).toBeNull();
  });
});
