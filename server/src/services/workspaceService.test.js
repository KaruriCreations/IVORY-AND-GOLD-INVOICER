const {
  getWorkspaceFiles,
  getWorkspaceFileDraft,
  updateWorkspaceFileDraft,
  createWorkspaceFile,
  deleteWorkspaceFile,
  updateWorkspacePresence,
  getWorkspacePresence,
  memoryWorkspaceFiles,
  memoryWorkspacePresence,
} = require('./workspaceService');

describe('Server workspaceService - Multi-File Workspace Engine', () => {
  beforeEach(() => {
    memoryWorkspaceFiles.clear();
    memoryWorkspacePresence.clear();
  });

  test('initializes default primary file if workspace is fresh', async () => {
    const files = await getWorkspaceFiles('team-test');
    expect(files.length).toBe(1);
    expect(files[0].id).toBe('doc_main');
    expect(files[0].name).toBe('Primary Invoice');
  });

  test('creates multiple files in the same workspace', async () => {
    const file1 = await createWorkspaceFile('team-test', null, 'Ruth', 'Wedding Quotation');
    const file2 = await createWorkspaceFile('team-test', null, 'Elvis', 'Gala Dinner');

    expect(file1.id).toBeDefined();
    expect(file2.id).toBeDefined();
    expect(file1.id).not.toBe(file2.id);

    const files = await getWorkspaceFiles('team-test');
    expect(files.length).toBe(3); // doc_main + file1 + file2
  });

  test('updates specific file draft without affecting other files', async () => {
    const file1 = await createWorkspaceFile('team-test', null, 'Ruth', 'Wedding Quotation');
    const file2 = await createWorkspaceFile('team-test', null, 'Elvis', 'Gala Dinner');

    const draft1 = {
      header: { clientName: 'Sarah & David Wedding', invoiceNum: 'QUO-001' },
      sections: [],
    };
    const draft2 = {
      header: { clientName: 'Apex Gala Dinner', invoiceNum: 'QUO-002' },
      sections: [],
    };

    await updateWorkspaceFileDraft('team-test', file1.id, draft1, 'Ruth');
    await updateWorkspaceFileDraft('team-test', file2.id, draft2, 'Elvis');

    const res1 = await getWorkspaceFileDraft('team-test', file1.id);
    const res2 = await getWorkspaceFileDraft('team-test', file2.id);

    expect(res1.draft.header.clientName).toBe('Sarah & David Wedding');
    expect(res2.draft.header.clientName).toBe('Apex Gala Dinner');
  });

  test('tracks user presence per file accurately', () => {
    updateWorkspacePresence('team-test', 'user_1', 'Ruth', 'file_wedding');
    updateWorkspacePresence('team-test', 'user_2', 'Elvis', 'file_gala');

    const presence = getWorkspacePresence('team-test');
    expect(presence.length).toBe(2);
    expect(presence.find((p) => p.userId === 'user_1').fileId).toBe('file_wedding');
    expect(presence.find((p) => p.userId === 'user_2').fileId).toBe('file_gala');
  });

  test('deletes a file when multiple files exist', async () => {
    const file = await createWorkspaceFile('team-test', null, 'Ruth', 'To Delete');
    let files = await getWorkspaceFiles('team-test');
    expect(files.some((f) => f.id === file.id)).toBe(true);

    await deleteWorkspaceFile('team-test', file.id);
    files = await getWorkspaceFiles('team-test');
    expect(files.some((f) => f.id === file.id)).toBe(false);
  });
});
