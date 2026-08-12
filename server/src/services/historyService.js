const path = require('path');
const fs = require('fs').promises;

const HISTORY_DIR = path.join(__dirname, '..', '..', 'history');

async function ensureHistoryDir() {
  await fs.mkdir(HISTORY_DIR, { recursive: true });
}

async function saveInvoice(format, invoiceData, buffer) {
  await ensureHistoryDir();

  const invoiceNum = invoiceData.header?.invoiceNum || 'draft';
  const clientName = (invoiceData.header?.clientName || 'client')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 30);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = `invoice-${invoiceNum}-${clientName}-${timestamp}.${format}`;

  const filePath = path.join(HISTORY_DIR, filename);
  await fs.writeFile(filePath, buffer);

  return { filename, filePath };
}

async function getHistoryList() {
  await ensureHistoryDir();

  const files = await fs.readdir(HISTORY_DIR);
  const fileItems = await Promise.all(
    files.map(async (file) => {
      try {
        const fullPath = path.join(HISTORY_DIR, file);
        const stat = await fs.stat(fullPath);
        if (!stat.isFile()) return null;

        const isPdf = file.endsWith('.pdf');
        const isXlsx = file.endsWith('.xlsx');
        if (!isPdf && !isXlsx) return null;

        return {
          name: file,
          size: stat.size,
          createdAt: stat.mtime.toISOString(),
          format: isPdf ? 'pdf' : 'xlsx',
        };
      } catch {
        return null;
      }
    })
  );

  return fileItems
    .filter(Boolean)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
}

async function deleteHistoryFile(filename) {
  await ensureHistoryDir();
  // Prevent directory traversal
  const safeFilename = path.basename(filename);
  const filePath = path.join(HISTORY_DIR, safeFilename);
  await fs.unlink(filePath);
}

module.exports = { saveInvoice, getHistoryList, deleteHistoryFile, HISTORY_DIR };