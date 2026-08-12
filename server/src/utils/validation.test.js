const { validateInvoice } = require('./validation');

describe('Invoice Payload Validation', () => {
  const baseValidPayload = {
    header: {
      clientName: 'Valid Client',
      invoiceNum: 'INV-100',
      preparedBy: 'Preparer',
      date: '2026-08-11',
      dueDate: '2026-08-25',
    },
    items: [
      { description: 'Item 1', quantity: 2, unitPrice: 150 },
    ],
    taxRate: 16,
    format: 'xlsx',
  };

  test('valid payload passes validation', () => {
    const result = validateInvoice(baseValidPayload);
    expect(result.valid).toBe(true);
    expect(result.data.taxRate).toBe(16);
    expect(result.data.format).toBe('xlsx');
  });

  test('defaults taxRate to 8.5 when taxRate is omitted', () => {
    const { taxRate, ...withoutTax } = baseValidPayload;
    const result = validateInvoice(withoutTax);
    expect(result.valid).toBe(true);
    expect(result.data.taxRate).toBe(8.5);
  });

  test('rejects missing clientName', () => {
    const payload = {
      ...baseValidPayload,
      header: { ...baseValidPayload.header, clientName: '' },
    };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('clientName'))).toBe(true);
  });

  test('rejects missing invoiceNum', () => {
    const payload = {
      ...baseValidPayload,
      header: { ...baseValidPayload.header, invoiceNum: '' },
    };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('invoiceNum'))).toBe(true);
  });

  test('rejects empty items array', () => {
    const payload = { ...baseValidPayload, items: [] };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('items'))).toBe(true);
  });

  test('rejects non-positive quantity', () => {
    const payload = {
      ...baseValidPayload,
      items: [{ description: 'Test', quantity: 0, unitPrice: 10 }],
    };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('quantity'))).toBe(true);
  });

  test('rejects negative unit price', () => {
    const payload = {
      ...baseValidPayload,
      items: [{ description: 'Test', quantity: 1, unitPrice: -5 }],
    };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('unitPrice'))).toBe(true);
  });

  test('rejects invalid format', () => {
    const payload = { ...baseValidPayload, format: 'doc' };
    const result = validateInvoice(payload);
    expect(result.valid).toBe(false);
    expect(result.details.some((d) => d.includes('format'))).toBe(true);
  });
});