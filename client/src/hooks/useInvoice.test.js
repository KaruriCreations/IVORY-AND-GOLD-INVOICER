import { describe, test, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useInvoice } from './useInvoice';

describe('useInvoice Hook with Multi-Category Sections', () => {
  test('initializes with default sections and calculations', () => {
    const { result } = renderHook(() => useInvoice());

    expect(result.current.sections.length).toBe(2);
    expect(result.current.sections[0].title).toBe('CATERING');
    expect(result.current.sections[1].title).toBe('DECOR & VENUE STYLING');

    // Section 1: 400 * 1200 = 480,000 + 45,000 = 525,000
    // Section 2: 40 * 1500 = 60,000 + 85,000 = 145,000
    // Subtotal = 670,000
    expect(result.current.subtotal).toBe(670000);
    expect(result.current.grandTotal).toBe(670000);
  });

  test('adds a new category section', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.addSection('SOUND & LIGHTING');
    });

    expect(result.current.sections.length).toBe(3);
    const newSection = result.current.sections[2];
    expect(newSection.title).toBe('SOUND & LIGHTING');
    expect(newSection.items.length).toBe(1);
  });

  test('renames a category section title', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.updateSectionTitle(1, 'GOURMET CATERING');
    });

    expect(result.current.sections[0].title).toBe('GOURMET CATERING');
  });

  test('adds an item to a specific category section and recalculates totals', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.addItem(1);
    });

    expect(result.current.sections[0].items.length).toBe(3);

    act(() => {
      const newItem = result.current.sections[0].items[2];
      result.current.updateItem(1, newItem.id, 'quantity', 10);
      result.current.updateItem(1, newItem.id, 'unitPrice', 1000);
    });

    // Subtotal increased by 10 * 1000 = 10,000 -> 680,000
    expect(result.current.subtotal).toBe(680000);
  });

  test('removes a category section when more than 1 exists', () => {
    const { result } = renderHook(() => useInvoice());

    act(() => {
      result.current.removeSection(2);
    });

    expect(result.current.sections.length).toBe(1);
    expect(result.current.subtotal).toBe(525000);
  });

  test('getPayload builds complete multi-section API payload', () => {
    const { result } = renderHook(() => useInvoice());

    const payload = result.current.getPayload('xlsx');
    expect(payload.format).toBe('xlsx');
    expect(payload.sections.length).toBe(2);
    expect(payload.sections[0].title).toBe('CATERING');
    expect(payload.items.length).toBe(4);
  });
});