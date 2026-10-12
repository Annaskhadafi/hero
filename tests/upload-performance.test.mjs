import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('S3 upload optimization uses ContentLength and omits broken default ACL', () => {
  const s3Storage = readFileSync('lib/s3-storage.ts', 'utf8')
  const uploadAction = readFileSync('app/actions/upload.ts', 'utf8')
  const clientForm = readFileSync('app/dashboard/hc/rfr/form/client-form.tsx', 'utf8')
  const uploadRoute = readFileSync('app/api/uploads/document/route.ts', 'utf8')

  // lib/s3-storage.ts optimizations
  assert.match(s3Storage, /ContentLength: buffer\.length/)
  assert.doesNotMatch(s3Storage, /export async function uploadAnyFileToS3[\s\S]{0,400}ACL: "public-read"/)
  assert.doesNotMatch(s3Storage, /export async function uploadProfilePhotoToS3[\s\S]{0,400}ACL: "public-read"/)

  // upload.ts timeout and metadata
  assert.match(uploadAction, /uploadAnyFileToS3\(fileToUpload, undefined, AbortSignal\.timeout\(30_000\)\)/)
  assert.match(uploadAction, /fileName: fileToUpload\.name/)
  assert.match(uploadAction, /fileSize: fileToUpload\.size/)

  // client-form.tsx improvements
  assert.match(clientForm, /handleRemoveUploadedFile/)
  assert.match(clientForm, /setUploadProgress/)
  assert.match(clientForm, /accept="\.pdf,\.doc,\.docx,\.jpg,\.jpeg,\.png,\.webp"/)
  assert.match(clientForm, /\/api\/uploads\/document/)

  // upload route
  assert.match(uploadRoute, /export async function POST/)
  assert.match(uploadRoute, /uploadFile\(formData\)/)
})
