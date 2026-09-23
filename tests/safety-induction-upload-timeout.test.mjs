import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('guest signature upload bounds both S3 attempts', () => {
  const action = readFileSync('app/actions/safety-induction.ts', 'utf8')
  const storage = readFileSync('lib/s3-storage.ts', 'utf8')
  const upload = storage.slice(
    storage.indexOf('export async function uploadAnyFileToS3'),
    storage.indexOf('export async function createDirectS3UploadUrl'),
  )

  assert.match(action, /uploadAnyFileToS3\(file, undefined, AbortSignal\.timeout\(20_000\)\)/)
  assert.equal(upload.match(/\{ abortSignal \}/g)?.length, 2)
  assert.match(action, /Upload tanda tangan terlalu lama/)
})
