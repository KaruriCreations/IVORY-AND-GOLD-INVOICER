const { saveInvoice, sanitizeSegment, getHistoryList, getInvoiceMetadata, deleteHistoryFile } = require('./historyService');
const fs = require('fs').promises;

describe('historyService', () => {
  describe('sanitizeSegment', () => {
    test('replaces slashes and colons with underscores', () => {
      expect(sanitizeSegment('QUO/2026/0233')).toBe('QUO_2026_0233');
      expect(sanitizeSegment('INV:123\\456')).toBe('INV_123_456');
    });

    test('replaces illegal characters and collapses multiple underscores', () => {
      expect(sanitizeSegment('Ruth & Elvis (Wedding)')).toBe('Ruth_Elvis_Wedding');
    });

    test('falls back to default if string is empty or invalid', () => {
      expect(sanitizeSegment('', 'draft')).toBe('draft');
      expect(sanitizeSegment(null, 'client')).toBe('client');
      expect(sanitizeSegment('///', 'fallback')).toBe('fallback');
    });
  });

  describe('saveInvoice and history retrieval', () => {
    const testData = {
      header: {
        invoiceNum: 'QUO/2026/0233',
        clientName: 'Ruth and Elvis',
      },
      sections: [],
      items: [],
      taxRate: 0,
      notes: 'Test',
    };
    let createdFilename;

    afterAll(async () => {
      if (createdFilename) {
        try {
          await deleteHistoryFile(createdFilename);
        } catch {
          // ignore cleanup errors
        }
      }
    });

    test('successfully saves invoice with slashes in invoiceNum without throwing ENOENT', async () => {
      const dummyBuffer = Buffer.from('mock pdf content');
      const result = await saveInvoice('pdf', testData, dummyBuffer);

      expect(result).toBeDefined();
      expect(result.filename).toBeDefined();
      expect(result.filename).not.toContain('/');
      expect(result.filename).toContain('QUO_2026_0233');
      expect(result.filename).toContain('Ruth_and_Elvis');

      createdFilename = result.filename;

      const metadata = await getInvoiceMetadata(result.filename);
      expect(metadata.header.invoiceNum).toBe('QUO/2026/0233');
      expect(metadata.header.clientName).toBe('Ruth and Elvis');
    });

    test('isolates history files between different client IDs', async () => {
      const dummyBuffer = Buffer.from('mock pdf content');
      const clientAData = { header: { invoiceNum: 'INV-A-100', clientName: 'Client A' } };
      const clientBData = { header: { invoiceNum: 'INV-B-200', clientName: 'Client B' } };

      const resA = await saveInvoice('pdf', clientAData, dummyBuffer, 'user_tenant_alpha');
      const resB = await saveInvoice('xlsx', clientBData, dummyBuffer, 'user_tenant_beta');

      const listA = await getHistoryList('user_tenant_alpha');
      const listB = await getHistoryList('user_tenant_beta');

      expect(listA.some((f) => f.name === resA.filename)).toBe(true);
      expect(listA.some((f) => f.name === resB.filename)).toBe(false);

      expect(listB.some((f) => f.name === resB.filename)).toBe(true);
      expect(listB.some((f) => f.name === resA.filename)).toBe(false);

      // Cleanup
      await deleteHistoryFile(resA.filename, 'user_tenant_alpha');
      await deleteHistoryFile(resB.filename, 'user_tenant_beta');
    });
  });
});
