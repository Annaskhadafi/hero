import { Pool } from 'pg'
import { S3Client, HeadObjectCommand, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3'
import { serverEnv } from '../lib/server-env'
import { extractS3ObjectKeyFromUrl } from '../lib/resolve-upload-url'
import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import path from 'node:path'
import { createHash } from 'node:crypto'

// Preserve existing keys so database URLs and shared links do not need rewriting.
async function main() {
  const apply = process.argv.includes('--apply')
  const pool = new Pool({ connectionString: serverEnv.databaseUrl, connectionTimeoutMillis: 15000 })
  const client = new S3Client({
    region: serverEnv.s3Region, endpoint: serverEnv.s3Endpoint,
    forcePathStyle: serverEnv.s3ForcePathStyle, maxAttempts: 2,
    credentials: { accessKeyId: serverEnv.s3AccessKeyId, secretAccessKey: serverEnv.s3SecretAccessKey },
  })
  if (!serverEnv.s3BucketName || !serverEnv.s3AccessKeyId || !serverEnv.s3SecretAccessKey) throw new Error('S3 configuration is incomplete')
  const sha = (data: Uint8Array) => createHash('sha256').update(data).digest('hex')
  const report: any[] = []
  try {
    const { rows } = await pool.query(`
      SELECT 'documents' AS source, 'pdf_file_url' AS field, id, pdf_file_url AS url FROM hero_sop_win_documents
      UNION ALL SELECT 'documents', 'docx_file_url', id, docx_file_url FROM hero_sop_win_documents
      UNION ALL SELECT 'revisions', 'pdf_file_url', id, pdf_file_url FROM hero_sop_win_revisions
      UNION ALL SELECT 'revisions', 'docx_file_url', id, docx_file_url FROM hero_sop_win_revisions
      UNION ALL SELECT 'requests', 'file_attachment_url', id, file_attachment_url FROM hero_sop_win_requests
    `)
    const keys = new Set<string>()
    for (const row of rows) {
      if (!row.url) continue
      const raw = extractS3ObjectKeyFromUrl(row.url)
      if (!raw) { report.push({ source: row.source, id: row.id, status: 'unresolved-url' }); continue }
      const key = decodeURIComponent(raw)
      if (key.split('/').some((p) => p === '..' || p === '.') || key.includes('\\') || key.startsWith('/')) throw new Error('Unsafe object key')
      keys.add(key)
    }
    console.log(JSON.stringify({ mode: apply ? 'apply' : 'inventory', uniqueKeys: keys.size }))
    let queue = [...keys]
    if (process.argv.includes('--retry')) {
      const previous = JSON.parse(await readFile('outputs/sop-win-s3/migration.json', 'utf8'))
      const retry = new Set(previous.filter((r: any) => ['error', 'missing-source'].includes(r.status)).map((r: any) => r.key))
      report.push(...previous.filter((r: any) => !retry.has(r.key)))
      queue = queue.filter((key) => retry.has(key))
    }
    await Promise.all(Array.from({ length: 4 }, async () => {
      while (queue.length) {
        const key = queue.shift()!
        try {
          const roots = [path.resolve('public/uploads'), path.resolve('public')]
          if (process.env.UPLOADS_DIR) roots.push(path.resolve(process.env.UPLOADS_DIR))
          const candidates = roots.flatMap((root) => [path.join(root, key), path.join(root, path.basename(key))])
          let local: string | undefined
          for (const candidate of candidates) { try { await access(candidate); local = candidate; break } catch {} }
          let exists = false
          try { await client.send(new HeadObjectCommand({ Bucket: serverEnv.s3BucketName, Key: key }), { abortSignal: AbortSignal.timeout(20000) }); exists = true }
          catch (e: any) { if (e.$metadata?.httpStatusCode !== 404 && e.name !== 'NotFound' && e.name !== 'NoSuchKey') throw e }
          let alternateData: Uint8Array | undefined
          if (!exists && !local) {
            for (const alternate of [`upload/${path.basename(key)}`, `uploads/${path.basename(key)}`, path.basename(key)]) {
              if (alternate === key) continue
              try {
                const found = await client.send(new GetObjectCommand({ Bucket: serverEnv.s3BucketName, Key: alternate }), { abortSignal: AbortSignal.timeout(20000) })
                alternateData = await found.Body!.transformToByteArray(); break
              } catch (e: any) { if (e.$metadata?.httpStatusCode !== 404 && e.name !== 'NoSuchKey' && e.name !== 'NotFound') throw e }
            }
            if (!alternateData) {
              const legacy = rows.find((row) => row.url?.startsWith('/api/v1/uploads/') && decodeURIComponent(extractS3ObjectKeyFromUrl(row.url) || '') === key)
              if (legacy) {
                const base = (process.env.RARAY_VISION_BASE_URL || 'https://vision.chitraparatama.com').replace(/\/api\/v1\/?$/, '')
                const apiKey = process.env.RARAY_VISION_API_KEY || ''
                const response = await fetch(new URL(legacy.url, base), { headers: { 'X-API-Key': apiKey, Authorization: apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}` }, redirect: 'error', signal: AbortSignal.timeout(30000) })
                if (response.ok && response.headers.get('content-type')?.includes('application/pdf')) alternateData = new Uint8Array(await response.arrayBuffer())
              }
            }
          }
          if (!local && !alternateData) { report.push({ key, status: exists ? 's3-only' : 'missing-source' }); continue }
          const data = local ? await readFile(local) : Buffer.from(alternateData!)
          if (!exists && !apply) { report.push({ key, bytes: data.length, status: 'needs-upload' }); continue }
          if (!exists) {
            await client.send(new PutObjectCommand({ Bucket: serverEnv.s3BucketName, Key: key, Body: data,
              IfNoneMatch: '*', ContentLength: data.length,
              ContentType: key.toLowerCase().endsWith('.pdf') ? 'application/pdf' : key.toLowerCase().endsWith('.docx') ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' : 'application/octet-stream',
              Metadata: { sha256: sha(data) },
            }), { abortSignal: AbortSignal.timeout(90000) })
          }
          const remote = await client.send(new GetObjectCommand({ Bucket: serverEnv.s3BucketName, Key: key }), { abortSignal: AbortSignal.timeout(90000) })
          const downloaded = await remote.Body!.transformToByteArray()
          if (sha(downloaded) !== sha(data)) { report.push({ key, status: 'content-conflict' }); continue }
          report.push({ key, bytes: data.length, status: exists ? 'verified-existing' : 'uploaded-verified' })
        } catch (e: any) { report.push({ key, status: 'error', error: e.name || 'Error', httpStatus: e.$metadata?.httpStatusCode }) }
        if (report.length % 20 === 0) console.log(JSON.stringify({ checked: report.length, total: keys.size }))
      }
    }))
    if (apply && process.argv.includes('--normalize-urls')) {
      const verified = new Set(report.filter((r) => ['s3-only', 'verified-existing', 'uploaded-verified'].includes(r.status)).map((r) => r.key))
      let updated = 0
      const tables: Record<string, string> = { documents: 'hero_sop_win_documents', revisions: 'hero_sop_win_revisions', requests: 'hero_sop_win_requests' }
      const connection = await pool.connect()
      await connection.query('BEGIN')
      try {
        for (const row of rows) {
          const key = row.url && extractS3ObjectKeyFromUrl(row.url)
          if (!key || !verified.has(decodeURIComponent(key))) continue
          const proxy = `/api/uploads/${key}`
          if (row.url === proxy) continue
          const result = await connection.query(`UPDATE ${tables[row.source]} SET ${row.field} = $1 WHERE id = $2 AND ${row.field} = $3`, [proxy, row.id, row.url])
          updated += result.rowCount || 0
        }
        await connection.query('COMMIT')
        console.log(JSON.stringify({ normalizedDatabaseUrls: updated }))
      } catch (e) { await connection.query('ROLLBACK'); throw e }
      finally { connection.release() }
    }
  } finally {
    await pool.end(); client.destroy()
    await mkdir('outputs/sop-win-s3', { recursive: true })
    const filename = `outputs/sop-win-s3/${apply ? 'migration' : 'inventory'}.json`
    await writeFile(filename, JSON.stringify(report, null, 2))
    const counts: Record<string, number> = {}
    for (const item of report) counts[item.status] = (counts[item.status] || 0) + 1
    console.log(JSON.stringify({ report: filename, counts }))
    if (report.some((r) => ['error', 'missing-source', 'unresolved-url', 'content-conflict'].includes(r.status))) process.exitCode = 1
  }
}
main().catch((e) => { console.error(e.name, e.message); process.exitCode = 1 })
