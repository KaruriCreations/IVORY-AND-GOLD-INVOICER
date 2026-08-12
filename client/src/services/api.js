const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

const MIME_TYPES = {
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  pdf: 'application/pdf',
};

export async function generateDocument(invoiceData, format) {
  const payload =
    typeof invoiceData === 'function'
      ? invoiceData(format)
      : { ...invoiceData, format };

  const res = await fetch(`${API_BASE_URL}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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

  const filename = `invoice-${payload.header?.invoiceNum || 'draft'}.${format}`;
  const url = URL.createObjectURL(typedBlob);

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();

  // Delay cleanup so the browser has time to register the download with the correct name
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 1000);
}
