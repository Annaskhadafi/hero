import { readFileSync } from 'node:fs'
import assert from 'node:assert/strict'

const actions = readFileSync(new URL('../app/dashboard/sop-win/actions.ts', import.meta.url), 'utf8')
const upload = readFileSync(new URL('../app/actions/upload.ts', import.meta.url), 'utf8')
const proxy = readFileSync(new URL('../app/api/uploads/[...path]/route.ts', import.meta.url), 'utf8')
const queue = readFileSync(new URL('../lib/sop-win-rag-queue.ts', import.meta.url), 'utf8')
const request = readFileSync(new URL('../components/sop-win/sop-win-request-modal.tsx', import.meta.url), 'utf8')
for (const source of [actions, upload, proxy, queue]) {
  assert.doesNotMatch(source, /\b(?:writeFile|writeFileSync|readFileSync|mkdir|mkdirSync)\s*\(/, 'Upload paths must not read or write local files')
}
assert.doesNotMatch(request, /fallbackUrl|File pendukung siap/)
assert.match(actions, /if \(!isS3UploadConfigured\(\)\)/)
assert.match(upload, /Berkas tidak disimpan secara lokal/)
assert.match(actions, /\/api\/uploads\/\$\{result.key\}/)
console.log('SOP/WIN and shared upload paths require S3 and do not use local file storage')
