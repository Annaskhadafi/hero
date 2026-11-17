import { extractS3ObjectKeyFromUrl, resolveUploadUrl } from '../lib/resolve-upload-url'
import { resolveClientUploadUrl } from '../lib/client-upload-url'

test('SOP/WIN keys keep nested document numbers and remove signed query strings', () => {
  const key = 'upload/1213d1809b_WIN/SVC.SEM-028/03-Prosedur_Pergantian.pdf'
  const url = `https://is3.cloudhost.id/onechitra/${key}?X-Amz-Signature=expired`
  expect(extractS3ObjectKeyFromUrl(url)).toBe(key)
  expect(resolveUploadUrl(url)).toBe(`/api/uploads/${key}`)
  expect(resolveClientUploadUrl(url)).toBe(`/api/uploads/${key}`)
})
