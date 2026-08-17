import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  getLocalHistory,
  addLocalHistoryEntry,
  removeLocalHistoryEntry,
  mergeServerAndLocalHistory,
  getClientId,
  getWorkspaceId,
  setWorkspaceId,
} from './historyStore';

const HISTORY_KEY = 'ivory_gold_invoice_history_v1';

describe('historyStore - Persistent Client History', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('returns empty array when no history exists', () => {
    expect(getLocalHistory()).toEqual([]);
  });

  test('adds and retrieves a history entry', () => {
    const entry = {
      name: 'invoice-QUO_2026_0233-Ruth_and_Elvis.pdf',
      format: 'pdf',
      size: 12345,
      createdAt: '2026-08-17T18:35:00.000Z',
      invoiceData: { header: { invoiceNum: 'QUO/2026/0233', clientName: 'Ruth and Elvis' } },
    };

    addLocalHistoryEntry(entry);

    const history = getLocalHistory();
    expect(history.length).toBe(1);
    expect(history[0].name).toBe('invoice-QUO_2026_0233-Ruth_and_Elvis.pdf');
    expect(history[0].hasMetadata).toBe(true);
    expect(history[0].invoiceData.header.clientName).toBe('Ruth and Elvis');
  });

  test('removes a history entry by filename', () => {
    addLocalHistoryEntry({
      name: 'file1.pdf',
      format: 'pdf',
    });
    addLocalHistoryEntry({
      name: 'file2.xlsx',
      format: 'xlsx',
    });

    expect(getLocalHistory().length).toBe(2);

    removeLocalHistoryEntry('file1.pdf');

    const history = getLocalHistory();
    expect(history.length).toBe(1);
    expect(history[0].name).toBe('file2.xlsx');
  });

  test('merges server items with local items preserving local invoiceData', () => {
    const localItem = {
      name: 'invoice-QUO-001.pdf',
      format: 'pdf',
      size: 20000,
      createdAt: '2026-08-17T10:00:00.000Z',
      hasMetadata: true,
      invoiceData: { header: { clientName: 'Safari Club' } },
    };
    addLocalHistoryEntry(localItem);

    const serverItems = [
      {
        name: 'invoice-QUO-001.pdf',
        format: 'pdf',
        size: 20000,
        createdAt: '2026-08-17T10:00:00.000Z',
        hasMetadata: true,
      },
      {
        name: 'invoice-QUO-002.xlsx',
        format: 'xlsx',
        size: 15000,
        createdAt: '2026-08-17T12:00:00.000Z',
        hasMetadata: false,
      },
    ];

    const merged = mergeServerAndLocalHistory(serverItems, getLocalHistory());

    expect(merged.length).toBe(2);
    // Newer item first
    expect(merged[0].name).toBe('invoice-QUO-002.xlsx');
    expect(merged[1].name).toBe('invoice-QUO-001.pdf');
    // Local invoiceData preserved on merged item
    expect(merged[1].invoiceData).toEqual({ header: { clientName: 'Safari Club' } });

    // Also verified persisted to localStorage
    expect(getLocalHistory().length).toBe(2);
  });

  test('getClientId generates and preserves persistent individual client ID', () => {
    const id1 = getClientId();
    expect(id1).toBeDefined();
    expect(id1).toContain('user_');

    const id2 = getClientId();
    expect(id2).toBe(id1);
  });

  test('workspace ID defaults to client ID and updates with setWorkspaceId', () => {
    const clientId = getClientId();
    expect(getWorkspaceId()).toBe(clientId);

    setWorkspaceId('team-kenya-events');
    expect(getWorkspaceId()).toBe('team-kenya-events');

    // Filtered local history for specific workspace
    addLocalHistoryEntry({
      name: 'team-doc.pdf',
      format: 'pdf',
      clientId: 'team-kenya-events',
    });
    addLocalHistoryEntry({
      name: 'private-doc.xlsx',
      format: 'xlsx',
      clientId: clientId,
    });

    const teamHistory = getLocalHistory('team-kenya-events');
    expect(teamHistory.length).toBe(1);
    expect(teamHistory[0].name).toBe('team-doc.pdf');

    const privateHistory = getLocalHistory(clientId);
    expect(privateHistory.length).toBe(1);
    expect(privateHistory[0].name).toBe('private-doc.xlsx');

    // Resetting workspace returns to individual client ID
    setWorkspaceId('');
    expect(getWorkspaceId()).toBe(clientId);
  });
});
