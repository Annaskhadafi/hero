import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('form-wo.ts schema and actions support "draft" status and instant save', () => {
  const source = read('app/actions/form-wo.ts')

  // Check draft in schemas
  assert.match(source, /statusPengajuan: z[\s\S]*?'draft'/)

  // Check createFormWo draft handling (skips signature check and returns early)
  assert.match(source, /const isDraft = parsed\.statusPengajuan === 'draft'/)
  assert.match(source, /if \(!isDraft && \(!parsed\.submitterSignatureUrl/)
  assert.match(source, /if \(isDraft\) \{[\s\S]*?return \{ success: true, noPengajuan, isDraft: true \}/)

  // Check updateFormWo draft handling
  assert.match(source, /if \(nextStatus === 'draft'\) \{[\s\S]*?return \{ success: true, noPengajuan: existing\?\.noPengajuan, isDraft: true \}/)
  assert.match(source, /if \(existing\?\.statusPengajuan === 'draft' && nextStatus !== 'draft'\)/)

  // Check updateFormWoStatus supports draft
  assert.match(source, /status: 'draft' \| 'pending' \| 'approved' \| 'rejected' \| 'diproses'/)

  // Check getFormWoStats includes draft
  assert.match(source, /const draft = rows\.filter\(\(r\) => r\.statusPengajuan === 'draft'\)\.length/)
})

test('form-wo.ts getWaitingWoFromApi uses in-memory caching and timeout guard to prevent slow save blocking', () => {
  const source = read('app/actions/form-wo.ts')

  assert.match(source, /waitingWoCache/)
  assert.match(source, /WAITING_WO_CACHE_TTL/)
  assert.match(source, /AbortController/)
  assert.match(source, /signal: controller\.signal/)
})

test('form-wo-client.tsx implements Simpan Draft button, fast signature save, and Draft status badge & filters', () => {
  const source = read('app/dashboard/repair-retread/form-wo/_components/form-wo-client.tsx')

  // STATUS_CONFIG includes draft
  assert.match(source, /draft: \{[\s\S]*?label: 'Draft'/)

  // FormWoDialog state includes draft and isDraftSaving
  assert.match(source, /'draft' \| 'pending' \| 'approved' \| 'rejected' \| 'diproses'/)
  assert.match(source, /isDraftSaving/)

  // handleSave with draft parameter
  assert.match(source, /const handleSave = \(asDraft: boolean = false\) =>/)
  assert.match(source, /const effectiveStatus = asDraft\s*\?\s*'draft'/)

  // No blocking S3 upload when signature is already profileSig or submitterSignatureUrl
  assert.match(source, /else if \(!sigUrl && isUsingProfileSig && profileSig\)/)

  // DialogFooter has Simpan Draft button
  assert.match(source, /Simpan Draft/)
  assert.match(source, /isPending && isDraftSaving/)

  // Status Pengajuan select in dialog includes Draft option
  assert.match(source, /<SelectItem value="draft">Draft<\/SelectItem>/)

  // Filter in DaftarPengajuanTab includes Draft option
  assert.match(source, /<SelectItem value="draft">Draft<\/SelectItem>/)
})

test('page.tsx reflects draft in stats card', () => {
  const source = read('app/dashboard/repair-retread/form-wo/page.tsx')

  assert.match(source, /stats\.draft/)
})
