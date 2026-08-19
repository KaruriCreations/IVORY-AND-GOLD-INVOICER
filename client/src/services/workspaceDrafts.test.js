import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  getWorkspaceFiles,
  getActiveWorkspaceFile,
  updateWorkspaceFileDraft,
  getActiveWorkspaceDraftInfo,
  clearActiveWorkspaceDraft,
  createWorkspaceFile,
} from './workspaceFilesStore';
import { getClientId, setWorkspaceId, getWorkspaceId } from './historyStore';

const LEGACY_DRAFT_KEY = 'ivory_gold_invoice_draft_v1';

describe('Workspace Draft Isolation & Active Editing Session (TDD)', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('returns null for active draft info when workspace is fresh/empty', () => {
    const ws = 'team-alpha';
    const draftInfo = getActiveWorkspaceDraftInfo(ws);
    expect(draftInfo).toBeNull();
  });

  test('returns draft info when editing within active workspace', () => {
    const ws = 'team-mtaa';
    const file = getActiveWorkspaceFile(ws);
    
    const draftData = {
      header: {
        clientName: 'mtaa',
        invoiceNum: 'QUO-2026-999',
        preparedBy: 'Admin',
      },
      sections: [
        {
          id: 1,
          title: 'DECOR',
          items: [{ id: 1, description: 'Gold Arches', quantity: 2, unitPrice: 5000 }],
        },
      ],
      taxRate: 16,
      notes: 'Payment upon delivery',
      updatedAt: new Date().toISOString(),
    };

    updateWorkspaceFileDraft(ws, file.id, draftData, 'Editor Ruth');

    const draftInfo = getActiveWorkspaceDraftInfo(ws);
    expect(draftInfo).not.toBeNull();
    expect(draftInfo.clientName).toBe('mtaa');
    expect(draftInfo.invoiceNum).toBe('QUO-2026-999');
    expect(draftInfo.itemCount).toBe(1);
    expect(draftInfo.grandTotal).toBe(11600); // (2*5000) + 16% = 10000 + 1600 = 11600
  });

  test('exiting/switching workspace isolates drafts and does not leak "mtaa" into private session', () => {
    const privateWs = getClientId();
    const teamWs = 'mtaa';

    // 1. User works in team workspace 'mtaa' and saves a draft
    setWorkspaceId(teamWs);
    const teamFile = getActiveWorkspaceFile(teamWs);
    const teamDraft = {
      header: {
        clientName: 'mtaa',
        invoiceNum: 'QUO-MTAA-01',
      },
      sections: [
        {
          id: 1,
          title: 'FLOWERS',
          items: [{ id: 1, description: 'Roses', quantity: 1, unitPrice: 3000 }],
        },
      ],
      taxRate: 0,
      updatedAt: new Date().toISOString(),
    };
    updateWorkspaceFileDraft(teamWs, teamFile.id, teamDraft, 'Member');

    // Verify team workspace has the draft
    expect(getActiveWorkspaceDraftInfo(teamWs)).not.toBeNull();
    expect(getActiveWorkspaceDraftInfo(teamWs).clientName).toBe('mtaa');

    // 2. User exits team workspace (reverts to private workspace)
    setWorkspaceId(''); // resets to private clientId
    const currentWs = getWorkspaceId();
    expect(currentWs).toBe(privateWs);

    // 3. The private workspace MUST NOT show the "mtaa" draft!
    const privateDraftInfo = getActiveWorkspaceDraftInfo(currentWs);
    expect(privateDraftInfo).toBeNull();

    // 4. Global legacy key must not contain the team workspace draft
    const legacyRaw = localStorage.getItem(LEGACY_DRAFT_KEY);
    if (legacyRaw) {
      const parsedLegacy = JSON.parse(legacyRaw);
      expect(parsedLegacy?.header?.clientName).not.toBe('mtaa');
    }
  });

  test('switching between two different workspaces shows their own respective drafts', () => {
    const ws1 = 'workspace-alpha';
    const ws2 = 'workspace-beta';

    const file1 = getActiveWorkspaceFile(ws1);
    const file2 = getActiveWorkspaceFile(ws2);

    updateWorkspaceFileDraft(ws1, file1.id, {
      header: { clientName: 'Alpha Client', invoiceNum: 'QUO-A' },
      sections: [{ id: 1, title: 'A', items: [{ id: 1, description: 'Item A', quantity: 1, unitPrice: 100 }] }],
    });

    updateWorkspaceFileDraft(ws2, file2.id, {
      header: { clientName: 'Beta Client', invoiceNum: 'QUO-B' },
      sections: [{ id: 1, title: 'B', items: [{ id: 1, description: 'Item B', quantity: 2, unitPrice: 200 }] }],
    });

    const info1 = getActiveWorkspaceDraftInfo(ws1);
    const info2 = getActiveWorkspaceDraftInfo(ws2);

    expect(info1.clientName).toBe('Alpha Client');
    expect(info2.clientName).toBe('Beta Client');
  });

  test('clearing/discarding active workspace draft resets draft info to null', () => {
    const ws = 'workspace-clear-test';
    const file = getActiveWorkspaceFile(ws);

    updateWorkspaceFileDraft(ws, file.id, {
      header: { clientName: 'Temporary Draft', invoiceNum: 'TEMP-01' },
      sections: [{ id: 1, title: 'TEMP', items: [{ id: 1, description: 'Temp', quantity: 1, unitPrice: 10 }] }],
    });

    expect(getActiveWorkspaceDraftInfo(ws)).not.toBeNull();

    clearActiveWorkspaceDraft(ws);
    expect(getActiveWorkspaceDraftInfo(ws)).toBeNull();
  });
});
