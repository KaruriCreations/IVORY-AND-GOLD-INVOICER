const { z } = require('zod');

const lineItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unitPrice: z.number().nonnegative('Unit price cannot be negative'),
});

const sectionSchema = z.object({
  title: z.string().default('CATEGORY'),
  items: z.array(lineItemSchema).default([]),
});

const invoiceSchema = z.object({
  header: z.object({
    clientName: z.string().min(1, 'Client name is required'),
    invoiceNum: z.string().min(1, 'Invoice number is required'),
    preparedBy: z.string().optional().default(''),
    date: z.string().min(1, 'Date is required'),
    dueDate: z.string().optional().default(''),
    noOfGuests: z.string().optional().default(''),
    colors: z.string().optional().default(''),
    dateOfFunction: z.string().optional().default(''),
    eventType: z.string().optional().default(''),
    venue: z.string().optional().default(''),
    attn: z.string().optional().default(''),
  }),
  eventDetails: z
    .object({
      noOfGuests: z.string().optional().default(''),
      colors: z.string().optional().default(''),
      dateOfFunction: z.string().optional().default(''),
      eventType: z.string().optional().default(''),
      venue: z.string().optional().default(''),
      attn: z.string().optional().default(''),
      sectionTitle: z.string().optional().default('CATERING'),
    })
    .optional()
    .default({}),
  sections: z.array(sectionSchema).optional(),
  items: z.array(lineItemSchema).optional(),
  taxRate: z.number().nonnegative().default(8.5),
  notes: z.string().optional().default(''),
  format: z.enum(['xlsx', 'pdf'], {
    errorMap: () => ({ message: 'Format must be "xlsx" or "pdf"' }),
  }),
}).refine(
  (data) => {
    const hasItems = data.items && data.items.length > 0;
    const hasSectionItems =
      data.sections &&
      data.sections.some((s) => s.items && s.items.length > 0);
    return hasItems || hasSectionItems;
  },
  {
    message: 'At least one line item is required across sections',
    path: ['items'],
  }
);

function validateInvoice(data) {
  const result = invoiceSchema.safeParse(data);
  if (!result.success) {
    const details = result.error.issues.map(
      (issue) => `${issue.path.join('.')}: ${issue.message}`
    );
    return { valid: false, details };
  }
  return { valid: true, data: result.data };
}

module.exports = { validateInvoice, invoiceSchema };
