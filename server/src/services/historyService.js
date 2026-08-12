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

  // Save JSON sidecar with original form data for re-editing
  const { format: _fmt, ...formData } = invoiceData;
  const sidecarPath = `${filePath}.json`;
  await fs.writeFile(sidecarPath, JSON.stringify(formData, null, 2), 'utf-8');

  return { filename, filePath };
}

async function getHistoryList() {
  await ensureHistoryDir();

  const allFiles = await fs.readdir(HISTORY_DIR);
  const sidecarSet = new Set(allFiles.filter((f) => f.endsWith('.json')));

  const fileItems = await Promise.all(
    allFiles.map(async (file) => {
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
          hasMetadata: sidecarSet.has(`${file}.json`),
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

async function getInvoiceMetadata(filename) {
  await ensureHistoryDir();
  const safeFilename = path.basename(filename);
  const sidecarPath = path.join(HISTORY_DIR, `${safeFilename}.json`);
  const raw = await fs.readFile(sidecarPath, 'utf-8');
  return JSON.parse(raw);
}

async function deleteHistoryFile(filename) {
  await ensureHistoryDir();
  const safeFilename = path.basename(filename);
  const filePath = path.join(HISTORY_DIR, safeFilename);
  await fs.unlink(filePath);

  // Also delete the JSON sidecar if it exists
  const sidecarPath = `${filePath}.json`;
  try {
    await fs.unlink(sidecarPath);
  } catch {
    // Sidecar may not exist for older files — ignore
  }
}

module.exports = { saveInvoice, getHistoryList, getInvoiceMetadata, deleteHistoryFile, HISTORY_DIR };