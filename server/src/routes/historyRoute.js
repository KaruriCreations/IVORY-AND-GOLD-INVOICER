const express = require('express');
const router = express.Router();
const { getHistoryList, deleteHistoryFile, HISTORY_DIR } = require('../services/historyService');
const fs = require('fs');
const path = require('path');

// GET /api/history
router.get('/', async (_req, res) => {
  try {
    const files = await getHistoryList();
    res.json({ success: true, files });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/history/download?filename=...
router.get('/download', (req, res) => {
  try {
    const { filename } = req.query;
    if (!filename) {
      return res.status(400).json({ error: 'Filename required' });
    }

    const safeFilename = path.basename(filename);
    const filePath = path.join(HISTORY_DIR, safeFilename);

    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'File not found' });
    }

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
    await deleteHistoryFile(filename);
    res.json({ success: true, message: 'File deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;