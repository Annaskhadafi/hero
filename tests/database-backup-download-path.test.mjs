import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

test('S3 backups use a dedicated temp directory and preserve downloaded bytes', async () => {
  const source = readFileSync(new URL('../lib/database-backup.ts', import.meta.url), 'utf8')
  const ast = ts.createSourceFile('backup.ts', source, ts.ScriptTarget.Latest, true)
  const declaration = ast.statements.find(node =>
    ts.isFunctionDeclaration(node) && node.name?.text === 'downloadBackupFromS3')
  assert.ok(declaration)
  const code = ts.transpile(declaration.getText(ast), { target: ts.ScriptTarget.ES2022 })
  const tempRoot = path.resolve('test-system-temp')
  const bytes = Uint8Array.from([31, 139, 8, 0])
  const operations = []
  const context = vm.createContext({
    path, Buffer,
    os: { tmpdir: () => tempRoot },
    fs: {
      mkdirSync: (dir, options) => operations.push(['mkdir', dir, options.recursive]),
      writeFileSync: (file, data) => operations.push(['write', file, data]),
    },
    serverEnv: { s3BucketName: 'test-bucket' },
    GetObjectCommand: class { constructor(input) { this.input = input } },
    getS3Client: () => ({ send: async () => ({
      Body: { transformToByteArray: async () => bytes },
    }) }),
  })
  vm.runInContext(code, context)
  const result = await context.downloadBackupFromS3('database-backups/hero/2026/09/hero-test.sql.gz')
  const expectedDir = path.join(tempRoot, 'hero-backups')
  const expectedFile = path.join(expectedDir, 'hero-test.sql.gz')
  assert.equal(result, expectedFile)
  assert.deepEqual(operations, [
    ['mkdir', expectedDir, true],
    ['write', expectedFile, Buffer.from(bytes)],
  ])
})
