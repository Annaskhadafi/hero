import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

test('mobile dashboard groups item requests and exposes tire damage detection', () => {
  const source = readFileSync(
    path.join(process.cwd(), 'components/mobile/mobile-dashboard-services.tsx'),
    'utf8'
  )

  assert.match(source, /title: 'Request Barang'/)
  assert.match(source, /title: 'Deteksi Kerusakan Ban'/)
  assert.match(source, /href: '\/mobile\/hse\/tire-damage'/)
  assert.match(source, /setRequestOpen\(true\)/)
  assert.match(source, /href: '\/mobile\/apd'/)
  assert.match(source, /href: '\/mobile\/material'/)
  assert.match(source, /href: '\/mobile\/tools'/)
})
