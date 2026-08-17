import { addLocalHistoryEntry, getWorkspaceId } from './historyStore';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MIME_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function generateDocument(invoiceData, format) {
  const activeClientId = getWorkspaceId();
  const rawPayload =
    typeof invoiceData === 'function'
      ? invoiceData(format)
      : { ...invoiceData, format };

  const payload = {
    ...rawPayload,
    clientId: rawPayload.clientId || activeClientId,
  };

  const res = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Client-Id': activeClientId,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errorData = await res
      .json()
      .catch(() => ({ error: 'Unknown error' }));
    throw new Error(errorData.error || `Server responded with ${res.status}`);
  }

  // Read raw buffer and re-wrap with explicit MIME so browser treats it correctly
  const arrayBuffer = await res.arrayBuffer();
  const typedBlob = new Blob([arrayBuffer], {
    type: MIME_TYPES[format] || 'application/octet-stream',
  });

  const rawNum = payload.header?.invoiceNum || 'draft';
  const safeInvoiceNum =
    String(rawNum)
      .trim()
      .replace(/[/\\:*?"<>|]/g, '_')
      .replace(/[^a-zA-Z0-9_.-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^[-_.]+|[-_.]+$/g, '') || 'draft';
  const downloadFilename = `invoice-${safeInvoiceNum}.${format}`;
  const url = URL.createObjectURL(typedBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = downloadFilename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Save to persistent local history store so history is NEVER lost on page refresh or server spin-down
  try {
    const clientSafe = String(payload.header?.clientName || 'client')
      .trim()
      .replace(/[^a-zA-Z0-9_-]/g, '_')
      .slice(0, 30) || 'client';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const archivedName = `invoice-${safeInvoiceNum}-${clientSafe}-${timestamp}.${format}`;

    addLocalHistoryEntry({
      name: archivedName,
      format,
      invoiceData: payload,
      size: typedBlob.size,
      createdAt: new Date().toISOString(),
      hasMetadata: true,
    });
  } catch (historyErr) {
    console.warn('Failed to archive invoice locally:', historyErr);
  }

  // Delay cleanup so the browser has time to register the download with the correct name
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
