const path = require('path');
const fs = require('fs').promises;
const fsSync = require('fs');
const {
  isSupabaseConfigured,
  saveInvoiceToSupabase,
  getHistoryListFromSupabase,
  getInvoiceMetadataFromSupabase,
  deleteInvoiceFromSupabase,
} = require('./supabaseService');

const HISTORY_DIR = path.join(__dirname, '..', '..', 'history');

async function ensureHistoryDir(subDir = '') {
  const target = subDir ? path.join(HISTORY_DIR, subDir) : HISTORY_DIR;
  await fs.mkdir(target, { recursive: true });
  return target;
}

function sanitizeSegment(str, fallback = 'unknown', maxLen = 50) {
  if (!str || typeof str !== 'string') return fallback;
  const cleaned = str
    .trim()
    .replace(/[/\\:*?"<>|]/g, '_')
    .replace(/[^a-zA-Z0-9_.-]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[-_.]+|[-_.]+$/g, '');
  return cleaned.slice(0, maxLen) || fallback;
}

async function saveInvoice(format, invoiceData, buffer, clientId = 'default') {
  const safeClientId = sanitizeSegment(clientId || invoiceData.clientId, 'default', 50);
  const targetDir = await ensureHistoryDir(safeClientId);

  const rawInvoiceNum = invoiceData.header?.invoiceNum || 'draft';
  const rawClientName = invoiceData.header?.clientName || 'client';
  const invoiceNum = sanitizeSegment(rawInvoiceNum, 'draft', 30);
  const clientName = sanitizeSegment(rawClientName, 'client', 30);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const filename = path.basename(`invoice-${invoiceNum}-${clientName}-${timestamp}.${format}`);

  const filePath = path.join(targetDir, filename);
  await fs.writeFile(filePath, buffer);

  // Save JSON sidecar with original form data for re-editing
  const { format: _fmt, ...formData } = invoiceData;
  const sidecarPath = `${filePath}.json`;
  await fs.writeFile(sidecarPath, JSON.stringify({ ...formData, clientId: safeClientId }, null, 2), 'utf-8');

  // Cloud Persistence via Supabase (if configured)
  if (isSupabaseConfigured()) {
    try {
      await saveInvoiceToSupabase({
        filename,
        clientId: safeClientId,
        invoiceNum: String(rawInvoiceNum),
        clientName: String(rawClientName),
        format,
        size: buffer ? buffer.length : 0,
        invoiceData: formData,
      });
    } catch (sbErr) {
      console.warn('[Supabase Sync Error]:', sbErr.message);
    }
  }

  return { filename, filePath, clientId: safeClientId };
}

async function getHistoryList(clientId = 'default') {
  const safeClientId = sanitizeSegment(clientId, 'default', 50);

  // 1. Try fetching from Supabase Cloud DB first
  if (isSupabaseConfigured()) {
    try {
      const cloudItems = await getHistoryListFromSupabase(safeClientId);
      if (Array.isArray(cloudItems) && cloudItems.length > 0) {
        return cloudItems;
      }
    } catch (err) {
      console.warn('[Supabase Fetch Notice]:', err.message);
    }
  }

  // 2. Fallback to local container disk
  const clientDir = await ensureHistoryDir(safeClientId);

  let allFiles = [];
  try {
    allFiles = await fs.readdir(clientDir);
  } catch {
    allFiles = [];
  }

  const sidecarSet = new Set(allFiles.filter((f) => f.endsWith('.json')));

  const fileItems = await Promise.all(
    allFiles.map(async (file) => {
      try {
        const fullPath = path.join(clientDir, file);
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
          clientId: safeClientId,
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

async function findHistoryFilePath(filename, clientId = 'default') {
  const safeFilename = path.basename(filename);
  const safeClientId = sanitizeSegment(clientId, 'default', 50);

  // 1. Check in client-specific dir
  const clientPath = path.join(HISTORY_DIR, safeClientId, safeFilename);
  if (fsSync.existsSync(clientPath)) {
    return clientPath;
  }

  // 2. Check root history dir (backwards compat)
  const rootPath = path.join(HISTORY_DIR, safeFilename);
  if (fsSync.existsSync(rootPath)) {
    return rootPath;
  }

  return clientPath;
}

async function getInvoiceMetadata(filename, clientId = 'default') {
  const safeClientId = sanitizeSegment(clientId, 'default', 50);

  // 1. Try Supabase first
  if (isSupabaseConfigured()) {
    try {
      const cloudData = await getInvoiceMetadataFromSupabase(filename, safeClientId);
      if (cloudData) {
        return cloudData;
      }
    } catch (err) {
      console.warn('[Supabase Metadata Notice]:', err.message);
    }
  }

  // 2. Fallback to local sidecar file
  const filePath = await findHistoryFilePath(filename, safeClientId);
  const sidecarPath = `${filePath}.json`;
  const raw = await fs.readFile(sidecarPath, 'utf-8');
  return JSON.parse(raw);
}

async function deleteHistoryFile(filename, clientId = 'default') {
  const safeClientId = sanitizeSegment(clientId, 'default', 50);

  // Delete from local disk
  const filePath = await findHistoryFilePath(filename, safeClientId);
  if (fsSync.existsSync(filePath)) {
    await fs.unlink(filePath);
  }

  const sidecarPath = `${filePath}.json`;
  try {
    if (fsSync.existsSync(sidecarPath)) {
      await fs.unlink(sidecarPath);
    }
  } catch {
    // Sidecar may not exist for older files — ignore
  }

  // Delete from Supabase
  if (isSupabaseConfigured()) {
    try {
      await deleteInvoiceFromSupabase(filename, safeClientId);
    } catch (sbErr) {
      console.warn('[Supabase Delete Notice]:', sbErr.message);
    }
  }
}

module.exports = {
  saveInvoice,
  getHistoryList,
  getInvoiceMetadata,
  deleteHistoryFile,
  findHistoryFilePath,
  sanitizeSegment,
  HISTORY_DIR,
};