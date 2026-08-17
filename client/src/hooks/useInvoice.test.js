import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvoice } from './useInvoice';

const DRAFT_KEY = 'ivory_gold_invoice_draft_v1';

describe('useInvoice Hook with Multi-Category Sections, Auto-Save & Recovery', () => {
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
  });

  test('auto-saves form modifications to localStorage', () => {
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

  test('recovers saved draft from localStorage on initial render', () => {
    const preSavedDraft = {
      header: {
        clientName: 'Ruth and Elvis Wedding',
        invoiceNum: 'QUO/2026/0233',
        preparedBy: 'Ivory Team',
        date: '2026-08-17',
        dueDate: '',
      },
      eventDetails: {
        venue: 'Safari Park Hotel',
        eventType: 'Wedding Reception',
        noOfGuests: '350',
        colors: 'Emerald & Gold',
        dateOfFunction: '2026-12-12',
        attn: 'Ruth',
        sectionTitle: '',
      },
      sections: [
        {
          id: 1,
          title: 'DECOR & SETUP',
          items: [{ id: 1, description: 'Gold Chiavari Chairs', quantity: 350, unitPrice: 200 }],
        },
      ],
      taxRate: 16,
      notes: 'Payment required 14 days before event',
      updatedAt: new Date().toISOString(),
    };

    localStorage.setItem(DRAFT_KEY, JSON.stringify(preSavedDraft));

    const { result } = renderHook(() => useInvoice());

    expect(result.current.isRestoredFromDraft).toBe(true);
    expect(result.current.header.clientName).toBe('Ruth and Elvis Wedding');
    expect(result.current.header.invoiceNum).toBe('QUO/2026/0233');
    expect(result.current.eventDetails.venue).toBe('Safari Park Hotel');
    expect(result.current.sections[0].title).toBe('DECOR & SETUP');
    expect(result.current.subtotal).toBe(70000);
    expect(result.current.taxAmount).toBe(11200);
    expect(result.current.grandTotal).toBe(81200);
  });

  test('resetInvoice clears state and removes localStorage draft', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateHeader('clientName', 'Company Event');
    });

    expect(localStorage.getItem(DRAFT_KEY)).not.toBeNull();

    act(() => {
      result.current.resetInvoice();
    });

    expect(result.current.header.clientName).toBe('');
    expect(result.current.isRestoredFromDraft).toBe(false);
    expect(localStorage.getItem(DRAFT_KEY)).toBeNull();
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

  test('removes a category section when more than 1 exists', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.addSection('DECOR');
    });

    expect(result.current.sections.length).toBe(2);
    const decorSecId = result.current.sections[1].id;

    act(() => {
      result.current.removeSection(decorSecId);
    });

    expect(result.current.sections.length).toBe(1);
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