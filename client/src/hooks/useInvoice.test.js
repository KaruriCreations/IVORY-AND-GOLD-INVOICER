import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvoice } from './useInvoice';

describe('useInvoice Hook with Multi-Category Sections & Re-editing', () => {
  test('initializes with default sections and calculations', () => {
    const { result } = renderHook(() => useInvoice());

    expect(result.current.sections.length).toBe(1);
    expect(result.current.sections[0].title).toBe('CATERING');
    expect(result.current.sections[0].items.length).toBe(1);
    expect(result.current.subtotal).toBe(0);
    expect(result.current.grandTotal).toBe(0);
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