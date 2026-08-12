const { handleGenerate } = require('../controllers/generateController');
const { validateInvoice } = require('../utils/validation');
const excelService = require('../services/excelService');
const pdfService = require('../services/pdfService');
const historyService = require('../services/historyService');

jest.mock('../services/excelService');
jest.mock('../services/pdfService');
jest.mock('../services/historyService');

describe('Generate Controller', () => {
  let req, res, next;

  beforeEach(() => {
    req = { body: {} };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
      set: jest.fn(),
      send: jest.fn(),
    };
    next = jest.fn();
    historyService.saveInvoice = jest.fn().mockResolvedValue({ filename: 'test.xlsx' });
  });

  describe('validation failure', () => {
    test('returns 400 when clientName is missing', async () => {
      req.body = {
        header: {
          invoiceNum: 'INV-001',
          date: '2024-01-15',
        },
        items: [{ description: 'Item 1', quantity: 1, unitPrice: 100 }],
        format: 'xlsx',
      };

      await handleGenerate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Failed',
        details: expect.arrayContaining([
          expect.stringMatching(/clientName/),
        ]),
      });
    });

    test('returns 400 when no items provided', async () => {
      req.body = {
        header: {
          clientName: 'Test Client',
          invoiceNum: 'INV-001',
          date: '2024-01-15',
        },
        items: [],
        format: 'xlsx',
      };

      await handleGenerate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Failed',
        details: expect.arrayContaining([
          expect.stringMatching(/items.*line|line.*item/i),
        ]),
      });
    });

    test('returns 400 when invoiceNum is missing', async () => {
      req.body = {
        header: {
          clientName: 'Test Client',
          date: '2024-01-15',
        },
        items: [{ description: 'Service', quantity: 1, unitPrice: 100 }],
        format: 'xlsx',
      };

      await handleGenerate(req, res, next);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        error: 'Validation Failed',
        details: expect.arrayContaining([
          expect.stringMatching(/invoiceNum/),
        ]),
      });
    });
  });

  describe('successful generation', () => {
    const validInvoice = {
      header: {
        clientName: 'Test Client',
        invoiceNum: 'INV-001',
        preparedBy: 'John Doe',
        date: '2024-01-15',
        dueDate: '2024-02-15',
      },
      items: [
        { description: 'Service', quantity: 10, unitPrice: 100 },
      ],
      taxRate: 8.5,
      notes: 'Test notes',
      format: 'xlsx',
    };

    beforeEach(() => {
      req.body = { ...validInvoice };
    });

    test('generates xlsx format', async () => {
      excelService.generate.mockResolvedValueOnce(Buffer.from('xlsx buffer'));

      await handleGenerate(req, res, next);

      expect(excelService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ clientName: 'Test Client' }),
          format: 'xlsx',
        })
      );
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': expect.stringContaining('invoice-INV-001'),
        'Content-Length': expect.any(Number),
      });
      expect(res.send).toHaveBeenCalledWith(Buffer.from('xlsx buffer'));
    });

    test('generates pdf format', async () => {
      pdfService.generate.mockResolvedValueOnce(Buffer.from('pdf buffer'));

      req.body.format = 'pdf';

      await handleGenerate(req, res, next);

      expect(pdfService.generate).toHaveBeenCalledWith(
        expect.objectContaining({
          header: expect.objectContaining({ clientName: 'Test Client' }),
          format: 'pdf',
        })
      );
      expect(res.set).toHaveBeenCalledWith({
        'Content-Type': 'application/pdf',
        'Content-Disposition': expect.stringContaining('invoice-INV-001'),
        'Content-Length': expect.any(Number),
      });
      expect(res.send).toHaveBeenCalledWith(Buffer.from('pdf buffer'));
    });

    test('handles excel generation error', async () => {
      excelService.generate.mockRejectedValueOnce(new Error('Excel generation failed'));

      await handleGenerate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });

    test('handles pdf generation error', async () => {
      pdfService.generate.mockRejectedValueOnce(new Error('PDF generation failed'));

      req.body.format = 'pdf';

      await handleGenerate(req, res, next);

      expect(next).toHaveBeenCalledWith(expect.any(Error));
    });
  });

  describe('tax rate default', () => {
    test('uses default 8.5% tax rate when not specified in valid invoice', async () => {
      const invoiceWithoutTax = {
        header: {
          clientName: 'Test',
          invoiceNum: 'INV-002',
          date: '2024-01-15',
        },
        items: [{ description: 'Service', quantity: 1, unitPrice: 100 }],
        format: 'xlsx',
      };

      req.body = invoiceWithoutTax;
      excelService.generate.mockResolvedValueOnce(Buffer.from('xlsx buffer'));

      await handleGenerate(req, res, next);

      expect(excelService.generate).toHaveBeenCalledWith(
        expect.objectContaining({ taxRate: 8.5 })
      );
    });
  });
});