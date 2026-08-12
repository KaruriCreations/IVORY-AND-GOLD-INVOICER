const { z } = require('zod');

const lineItemSchema = z.object({
  description: z.string().optional().default(''),
  quantity: z.number().nonnegative().optional().default(0),
  unitPrice: z.number().nonnegative().optional().default(0),
});

const sectionSchema = z.object({
  title: z.string().optional().default('CATEGORY'),
  items: z.array(lineItemSchema).optional().default([]),
});

const invoiceSchema = z.object({
  header: z
    .object({
      clientName: z.string().optional().default(''),
      invoiceNum: z.string().optional().default(''),
      preparedBy: z.string().optional().default(''),
      date: z.string().optional().default(''),
      dueDate: z.string().optional().default(''),
      noOfGuests: z.string().optional().default(''),
      colors: z.string().optional().default(''),
      dateOfFunction: z.string().optional().default(''),
      eventType: z.string().optional().default(''),
      venue: z.string().optional().default(''),
      attn: z.string().optional().default(''),
    })
    .optional()
    .default({}),
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
  sections: z.array(sectionSchema).optional().default([]),
  items: z.array(lineItemSchema).optional().default([]),
  taxRate: z.number().nonnegative().optional().default(0),
  notes: z.string().optional().default(''),
  format: z.enum(['xlsx', 'pdf'], {
    errorMap: () => ({ message: 'Format must be "xlsx" or "pdf"' }),
  }),
});

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
