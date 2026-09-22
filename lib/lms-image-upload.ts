export async function uploadLmsImage(
  file: File,
  onProgress?: (progress: number) => void,
) {
  const response = await fetch('/api/uploads/lms-presign', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, contentType: file.type }),
  });
  const ticket = await response.json().catch(() => ({}));

  // Local development can still use the existing server-action fallback.
  if (response.status === 503) return null;
  if (!response.ok || typeof ticket.uploadUrl !== 'string' || typeof ticket.key !== 'string') {
    throw new Error(ticket.error || 'Gagal menyiapkan upload gambar');
  }

  await new Promise<void>((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress?.(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      if (request.status >= 200 && request.status < 300) resolve();
      else reject(new Error('Upload gambar ditolak oleh storage'));
    };
    request.onerror = () => reject(new Error('Koneksi upload gambar terputus'));
    request.open('PUT', ticket.uploadUrl);
    request.setRequestHeader('Content-Type', file.type);
    request.send(file);
  });

  return `/api/uploads/${ticket.key}`;
}
