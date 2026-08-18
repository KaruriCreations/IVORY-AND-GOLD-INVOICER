import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import {
  getWorkspaceFiles,
  getActiveFileId,
  setActiveFileId,
  getActiveWorkspaceFile,
  createWorkspaceFile,
  updateWorkspaceFileDraft,
  duplicateWorkspaceFile,
  renameWorkspaceFile,
  deleteWorkspaceFile,
  importInvoiceToWorkspace,
  subscribeToWorkspaceFiles,
} from './workspaceFilesStore';

describe('workspaceFilesStore - Multi-File Workspace Engine', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('initializes default primary file if workspace is fresh', () => {
    const files = getWorkspaceFiles('team-alpha');
    expect(files.length).toBe(1);
    expect(files[0].id).toBe('doc_main');
    expect(getActiveFileId('team-alpha')).toBe('doc_main');
  });

  test('creates new workspace file and activates it', () => {
    const initialFiles = getWorkspaceFiles('team-alpha');
    expect(initialFiles.length).toBe(1);

    const newFile = createWorkspaceFile('team-alpha', null, 'Wedding Gala Quotation');
    expect(newFile.id).toBeDefined();
    expect(newFile.name).toBe('Wedding Gala Quotation');
    expect(getActiveFileId('team-alpha')).toBe(newFile.id);

    const files = getWorkspaceFiles('team-alpha');
    expect(files.length).toBe(2);
  });

  test('switches active file accurately', () => {
    const file2 = createWorkspaceFile('team-alpha', null, 'Corporate Event');
    expect(getActiveFileId('team-alpha')).toBe(file2.id);

    setActiveFileId('team-alpha', 'doc_main');
    expect(getActiveFileId('team-alpha')).toBe('doc_main');
    expect(getActiveWorkspaceFile('team-alpha').id).toBe('doc_main');
  });

  test('updates specific file draft without affecting other files', () => {
    const fileA = createWorkspaceFile('team-alpha', null, 'Sarah Wedding');
    const fileB = createWorkspaceFile('team-alpha', null, 'Apex Gala');

    const draftA = {
      header: { clientName: 'Sarah & David', invoiceNum: 'QUO-001' },
      sections: [],
    };
    const draftB = {
      header: { clientName: 'Apex Tech Corp', invoiceNum: 'QUO-002' },
      sections: [],
    };

    updateWorkspaceFileDraft('team-alpha', fileA.id, draftA, 'Ruth');
    updateWorkspaceFileDraft('team-alpha', fileB.id, draftB, 'Elvis');

    const files = getWorkspaceFiles('team-alpha');
    const updatedA = files.find((f) => f.id === fileA.id);
    const updatedB = files.find((f) => f.id === fileB.id);

    expect(updatedA.draft.header.clientName).toBe('Sarah & David');
    expect(updatedB.draft.header.clientName).toBe('Apex Tech Corp');
    expect(updatedA.lastEditedBy).toBe('Ruth');
    expect(updatedB.lastEditedBy).toBe('Elvis');
  });

  test('duplicates an existing file with (Copy) title and makes it active', () => {
    const original = createWorkspaceFile(
      'team-alpha',
      { header: { clientName: 'Original Client', invoiceNum: 'QUO-100' } },
      'Original File'
    );

    const copy = duplicateWorkspaceFile('team-alpha', original.id, 'Ruth');
    expect(copy).not.toBeNull();
    expect(copy.id).not.toBe(original.id);
    expect(copy.name).toBe('Original File (Copy)');
    expect(copy.draft.header.clientName).toBe('Original Client');
    expect(getActiveFileId('team-alpha')).toBe(copy.id);
  });

  test('renames a workspace file', () => {
    const file = createWorkspaceFile('team-alpha', null, 'Initial Name');
    const success = renameWorkspaceFile('team-alpha', file.id, 'Updated Clean Title');
    expect(success).toBe(true);

    const files = getWorkspaceFiles('team-alpha');
    const renamed = files.find((f) => f.id === file.id);
    expect(renamed.name).toBe('Updated Clean Title');
  });

  test('deletes a workspace file and falls back to remaining active file', () => {
    const file1 = createWorkspaceFile('team-alpha', null, 'File 1');
    const file2 = createWorkspaceFile('team-alpha', null, 'File 2');

    expect(getWorkspaceFiles('team-alpha').length).toBe(3); // doc_main + file1 + file2
    expect(getActiveFileId('team-alpha')).toBe(file2.id);

    deleteWorkspaceFile('team-alpha', file2.id);

    const filesAfter = getWorkspaceFiles('team-alpha');
    expect(filesAfter.length).toBe(2);
    expect(filesAfter.some((f) => f.id === file2.id)).toBe(false);
    expect(getActiveFileId('team-alpha')).toBe(filesAfter[0].id);
  });

  test('imports invoice from history as new workspace file', () => {
    const historyData = {
      header: { clientName: 'Historic Client', invoiceNum: 'QUO-HIST-01' },
      sections: [{ title: 'CATERING', items: [] }],
    };

    const imported = importInvoiceToWorkspace('team-alpha', historyData, 'Imported Historic Invoice');
    expect(imported).toBeDefined();
    expect(imported.name).toBe('Imported Historic Invoice');
    expect(imported.draft.header.clientName).toBe('Historic Client');
    expect(getActiveFileId('team-alpha')).toBe(imported.id);
  });

  test('notifies subscribers on file list changes', () => {
    let callCount = 0;
    let latestActiveId = null;

    const unsub = subscribeToWorkspaceFiles('team-alpha', ({ activeFileId }) => {
      callCount++;
      latestActiveId = activeFileId;
    });

    const file = createWorkspaceFile('team-alpha', null, 'New Listener Test');
    expect(callCount).toBeGreaterThan(0);
    expect(latestActiveId).toBe(file.id);

    unsub();
  });

  test('authoritative server sync removes files deleted by peers and updates active file if needed', () => {
    const file1 = createWorkspaceFile('team-sync', null, 'Keep Me');
    const file2 = createWorkspaceFile('team-sync', null, 'Delete Remotely');

    expect(getWorkspaceFiles('team-sync').length).toBe(3); // doc_main + file1 + file2
    expect(getActiveFileId('team-sync')).toBe(file2.id);

    // Simulate server returning only [doc_main, file1] (file2 was deleted by peer)
    const current = getWorkspaceFiles('team-sync');
    const serverFiles = current.filter((f) => f.id !== file2.id);

    import('./workspaceFilesStore').then(({ mergeAndPersistFiles }) => {
      mergeAndPersistFiles('team-sync', serverFiles, true);
      const after = getWorkspaceFiles('team-sync');
      expect(after.length).toBe(2);
      expect(after.some((f) => f.id === file2.id)).toBe(false);
      expect(getActiveFileId('team-sync')).toBe(after[0].id);
    });
  });
});
