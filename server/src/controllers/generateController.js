const { validateInvoice } = require('../utils/validation');
const excelService = require('../services/excelService');
const pdfService = require('../services/pdfService');
const { saveInvoice } = require('../services/historyService');

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
    let filename;

    if (format === 'xlsx') {
      buffer = await excelService.generate(data);
      filename = `invoice-${data.header.invoiceNum || 'draft'}.xlsx`;
    }

    if (format === 'pdf') {
      buffer = await pdfService.generate(data);
      filename = `invoice-${data.header.invoiceNum || 'draft'}.pdf`;
    }

    if (buffer) {
      await saveInvoice(format, data, buffer);
    }

    res.set({
      'Content-Type':
        format === 'xlsx'
          ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
          : 'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length,
    });

    return res.send(buffer);
  } catch (err) {
    next(err);
  }
}

module.exports = { handleGenerate };
