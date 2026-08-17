const express = require('express');
const router = express.Router();
const {
  getHistoryList,
  getInvoiceMetadata,
  deleteHistoryFile,
  findHistoryFilePath,
} = require('../services/historyService');
const fs = require('fs');

// Helper to extract clientId from header, query, or body
function getRequestClientId(req) {
  return req.headers?.['x-client-id'] || req.query?.clientId || req.body?.clientId || 'default';
}

// GET /api/history
router.get('/', async (req, res) => {
  try {
    const clientId = getRequestClientId(req);
    const files = await getHistoryList(clientId);
    res.json({ success: true, files, clientId });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history/metadata?filename=...
router.get('/metadata', async (req, res) => {
  try {
    const { filename } = req.query;
    const clientId = getRequestClientId(req);
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }
    const metadata = await getInvoiceMetadata(filename, clientId);
    res.json({ success: true, data: metadata });
  } catch (err) {
    if (err.code === 'ENOENT') {
      return res.status(404).json({ success: false, error: 'No metadata found for this file' });
    }
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history/download?filename=...
router.get('/download', async (req, res) => {
  try {
    const { filename } = req.query;
    const clientId = getRequestClientId(req);
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const filePath = await findHistoryFilePath(filename, clientId);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

    const safeFilename = require('path').basename(filename);
    const fileContent = fs.readFileSync(filePath);
    res.set({
      'Content-Type':
        safeFilename.endsWith('.pdf')
          ? 'application/pdf'
          : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="${safeFilename}"`,
      'Content-Length': fileContent.length,
    });

    return res.send(fileContent);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/history/:filename
router.delete('/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    const clientId = getRequestClientId(req);
    await deleteHistoryFile(filename, clientId);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;