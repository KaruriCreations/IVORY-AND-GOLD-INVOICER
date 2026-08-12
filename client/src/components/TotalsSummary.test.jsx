import { describe, test, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import TotalsSummary from './TotalsSummary';

describe('TotalsSummary Component', () => {
  test('renders subtotal, estimated tax, and grand total in KSh currency format', () => {
    const setTaxRate = vi.fn();

    render(
      <TotalsSummary
        subtotal={8500}
        taxRate={8.5}
        setTaxRate={setTaxRate}
        taxAmount={722.5}
        grandTotal={9222.5}
      />
    );

    expect(screen.getByText('Subtotal')).toBeTruthy();
    expect(screen.getByText('KSh8,500.00')).toBeTruthy();
    expect(screen.getByText('Estimated Tax')).toBeTruthy();
    expect(screen.getByText('KSh722.50')).toBeTruthy();
    expect(screen.getByText('Grand Total')).toBeTruthy();
    expect(screen.getByText('KSh9,222.50')).toBeTruthy();
  });

  test('calls setTaxRate when tax rate input changes', () => {
    const setTaxRate = vi.fn();

    render(
      <TotalsSummary
        subtotal={5000}
        taxRate={10}
        setTaxRate={setTaxRate}
        taxAmount={500}
        grandTotal={5500}
      />
    );

    const input = screen.getByRole('spinbutton');
    fireEvent.change(input, { target: { value: '16' } });

    expect(setTaxRate).toHaveBeenCalledWith(16);
  });
});
