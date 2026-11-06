import { isServerActionSkewError } from '@/components/deployment-skew-handler';

describe('isServerActionSkewError', () => {
  it('detects Next.js failed-to-find-server-action docs URL format', () => {
    const error1 = 'Server Action "4000dd440475dbe3a7e85757fcd4d096d103d7d8d7" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';
    expect(isServerActionSkewError(error1)).toBe(true);

    const error2 = 'Server Action "40cd508dc31651cdb85f6bd80ef30616fed00ca89b" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';
    expect(isServerActionSkewError(error2)).toBe(true);

    const error3 = 'Terjadi kesalahan sistem saat menyimpan: Server Action "40e127ece99003fdbf250b345a2bb304a3d9b1c4e1" was not found on the server. Read more: https://nextjs.org/docs/messages/failed-to-find-server-action';
    expect(isServerActionSkewError(error3)).toBe(true);
  });

  it('detects objects with message or description', () => {
    expect(isServerActionSkewError({ message: 'failed to find server action' })).toBe(true);
    expect(isServerActionSkewError({ description: 'was not found on the server' })).toBe(true);
    expect(isServerActionSkewError(new Error('Failed to find Server Action'))).toBe(true);
  });

  it('ignores standard application errors', () => {
    expect(isServerActionSkewError('Database constraint violation')).toBe(false);
    expect(isServerActionSkewError('Data berhasil disimpan')).toBe(false);
    expect(isServerActionSkewError(null)).toBe(false);
    expect(isServerActionSkewError(undefined)).toBe(false);
  });
});
