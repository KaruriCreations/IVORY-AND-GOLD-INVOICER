import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvoice } from './useInvoice';

const DRAFT_KEY = 'ivory_gold_invoice_draft_v1';

describe('useInvoice Hook with Multi-Category Sections, Multi-File & Auto-Save', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  test('initializes with default sections and calculations when no draft exists', () => {
    const { result } = renderHook(() => useInvoice());

    expect(result.current.sections.length).toBe(1);
    expect(result.current.sections[0].title).toBe('CATERING');
    expect(result.current.sections[0].items.length).toBe(1);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.grandTotal).toBe(0);
    expect(result.current.isRestoredFromDraft).toBe(false);
    expect(result.current.activeFileId).toBeDefined();
    expect(result.current.workspaceFiles.length).toBeGreaterThanOrEqual(1);
  });

  test('auto-saves form modifications to active workspace file', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateHeader('clientName', 'Ruth and Elvis');
      result.current.updateHeader('invoiceNum', 'QUO/2026/0233');
    });

    const stored = JSON.parse(localStorage.getItem(DRAFT_KEY));
    expect(stored).toBeDefined();
    expect(stored.header.clientName).toBe('Ruth and Elvis');
    expect(stored.header.invoiceNum).toBe('QUO/2026/0233');
  });

  test('creates new file in workspace and switches to it', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateHeader('clientName', 'Original Client');
    });

    act(() => {
      result.current.createNewFile(null, 'Second File');
    });

    expect(result.current.workspaceFiles.length).toBe(2);
    expect(result.current.activeFile.name).toBe('Second File');
    expect(result.current.header.clientName).toBe(''); // Fresh file
  });

  test('switches between files and restores each file content independently', () => {
    const { result } = renderHook(() => useInvoice());

    const file1Id = result.current.activeFileId;

    act(() => {
      result.current.updateHeader('clientName', 'Client One');
      result.current.updateHeader('invoiceNum', 'QUO-001');
    });

    let file2Id;
    act(() => {
      const f2 = result.current.createNewFile(null, 'File Two');
      file2Id = f2.id;
      result.current.updateHeader('clientName', 'Client Two');
      result.current.updateHeader('invoiceNum', 'QUO-002');
    });

    expect(result.current.header.clientName).toBe('Client Two');

    // Switch back to File 1
    act(() => {
      result.current.switchFile(file1Id);
    });

    expect(result.current.activeFileId).toBe(file1Id);
    expect(result.current.header.clientName).toBe('Client One');
    expect(result.current.header.invoiceNum).toBe('QUO-001');

    // Switch back to File 2
    act(() => {
      result.current.switchFile(file2Id);
    });

    expect(result.current.activeFileId).toBe(file2Id);
    expect(result.current.header.clientName).toBe('Client Two');
    expect(result.current.header.invoiceNum).toBe('QUO-002');
  });

  test('duplicates current active file', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateHeader('clientName', 'Original Event');
      result.current.updateHeader('invoiceNum', 'QUO-ORIG');
    });

    act(() => {
      result.current.duplicateCurrentFile();
    });

    expect(result.current.workspaceFiles.length).toBe(2);
    expect(result.current.header.clientName).toBe('Original Event');
  });

  test('deletes a workspace file', () => {
    const { result } = renderHook(() => useInvoice());

    let file2;
    act(() => {
      file2 = result.current.createNewFile(null, 'To Remove');
    });

    expect(result.current.workspaceFiles.length).toBe(2);

    act(() => {
      result.current.deleteFile(file2.id);
    });

    expect(result.current.workspaceFiles.length).toBe(1);
    expect(result.current.workspaceFiles.some((f) => f.id === file2.id)).toBe(false);
  });

  test('adds a new category section', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.addSection('SOUND & LIGHTING');
    });

    expect(result.current.sections.length).toBe(2);
    const newSection = result.current.sections[1];
    expect(newSection.title).toBe('SOUND & LIGHTING');
    expect(newSection.items.length).toBe(1);
  });

  test('renames a category section title', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateSectionTitle(result.current.sections[0].id, 'GOURMET CATERING');
    });

    expect(result.current.sections[0].title).toBe('GOURMET CATERING');
  });

  test('adds an item to a specific category section and recalculates totals', () => {
    const { result } = renderHook(() => useInvoice());
    const secId = result.current.sections[0].id;

    act(() => {
      result.current.addItem(secId);
    });

    expect(result.current.sections[0].items.length).toBe(2);

    act(() => {
      const newItem = result.current.sections[0].items[1];
      result.current.updateItem(secId, newItem.id, 'quantity', 10);
      result.current.updateItem(secId, newItem.id, 'unitPrice', 1000);
    });

    // Subtotal = 10 * 1000 = 10,000
    expect(result.current.subtotal).toBe(10000);
    expect(result.current.grandTotal).toBe(10000);
  });

  test('loads saved invoice data via loadInvoice for re-editing', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.loadInvoice({
        header: { clientName: 'Safari Club', invoiceNum: 'QUO-999' },
        eventDetails: { venue: 'Nairobi' },
        sections: [
          {
            title: 'CATERING',
            items: [{ description: 'Buffet', quantity: 50, unitPrice: 2000 }],
          },
        ],
        taxRate: 16,
        notes: 'Terms apply',
      });
    });

    expect(result.current.header.clientName).toBe('Safari Club');
    expect(result.current.header.invoiceNum).toBe('QUO-999');
    expect(result.current.eventDetails.venue).toBe('Nairobi');
    expect(result.current.subtotal).toBe(100000);
    expect(result.current.taxAmount).toBe(16000);
    expect(result.current.grandTotal).toBe(116000);
  });

  test('getPayload builds complete multi-section API payload', () => {
    const { result } = renderHook(() => useInvoice());

    const payload = result.current.getPayload('xlsx');
    expect(payload.format).toBe('xlsx');
    expect(payload.sections.length).toBe(1);
    expect(payload.sections[0].title).toBe('CATERING');
  });
});