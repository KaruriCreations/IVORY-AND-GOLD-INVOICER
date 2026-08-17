const { validateInvoice } = require('../utils/validation');
const excelService = require('../services/excelService');
const pdfService = require('../services/pdfService');
const { saveInvoice, sanitizeSegment } = require('../services/historyService');

async function handleGenerate(req, res, next) {
  try {
    const validation = validateInvoice(req.body);

    if (!validation.valid) {
      return res.status(400).json({
        error: 'Validation Failed',
        details: validation.details,
      });
    }

    const { data } = validation;
    const { format } = data;

    let buffer;
    const safeInvoiceNum = sanitizeSegment(data.header?.invoiceNum, 'draft', 40);
    const filename = `invoice-${safeInvoiceNum}.${format}`;

    if (format === 'xlsx') {
      buffer = await excelService.generate(data);
    } else if (format === 'pdf') {
      buffer = await pdfService.generate(data);
    }

    const clientId = req.headers?.['x-client-id'] || data.clientId || 'default';

    if (buffer) {
      try {
        await saveInvoice(format, data, buffer, clientId);
      } catch (historyErr) {
        console.error('[History Archive Error]:', historyErr);
      }
    }

    res.set({
      'Content-Type':
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer ? buffer.length : 0,
    });

    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleGenerate };
