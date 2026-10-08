import fs from 'fs';
import path from 'path';
import { resolveUploadUrl, extractS3ObjectKeyFromUrl } from '../lib/resolve-upload-url';

describe('APD Photo URL Resolution & Print Page Integration', () => {
  it('resolves S3 presigned URLs, expired tokens, and raw keys into persistent proxy URLs', () => {
    // 1. Direct CloudHost S3 URL with expired token parameters
    const presignedUrl = 'https://is3.cloudhost.id/onechitra/upload/82f64d78-b19b-449e-b9b2-29ab6e7b5ad1.jpg?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=AKIA...';
    expect(resolveUploadUrl(presignedUrl)).toBe('/api/uploads/upload/82f64d78-b19b-449e-b9b2-29ab6e7b5ad1.jpg');

    // 2. Already relative /api/uploads URL
    const relativeUrl = '/api/uploads/activity-photos/sample.png?v=123';
    expect(resolveUploadUrl(relativeUrl)).toBe('/api/uploads/activity-photos/sample.png');

    // 3. Raw key without protocol
    const rawKey = 'activity-photos/test-image.webp';
    expect(resolveUploadUrl(rawKey)).toBe('/api/uploads/activity-photos/test-image.webp');
  });

  it('uses resolveUploadUrl in APD Print Page rendering to prevent 403 Forbidden', () => {
    const printPageSource = fs.readFileSync(
      path.join(process.cwd(), 'app/print/apd/[id]/page.tsx'),
      'utf8'
    );

    expect(printPageSource).toContain("import { resolveUploadUrl } from '@/lib/resolve-upload-url'");
    expect(printPageSource).toContain('src={resolveUploadUrl(photo.url)}');
    expect(printPageSource).toContain('!trimmed.includes(\'?X-Amz-\')');
  });
});
