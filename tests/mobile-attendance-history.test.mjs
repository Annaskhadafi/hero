import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import test from 'node:test'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('mobile attendance page passes todayLogs and enforces dynamic rendering', () => {
  const rootPageSource = read('app/mobile/attendance/page.tsx')
  const v2PageSource = read('app/mobile/attendance/face-v2/page.tsx')

  assert.match(rootPageSource, /export const dynamic = ['"]force-dynamic['"]/)
  assert.match(v2PageSource, /export const dynamic = ['"]force-dynamic['"]/)

  assert.match(rootPageSource, /getAttendancePageData/)
  assert.match(rootPageSource, /todayLogs=\{logs\}/)
  assert.match(rootPageSource, /shiftOptions=\{data\.shiftOptions \|\| \[\]\}/)
})

test('face recognition v2 route revalidates mobile attendance paths', () => {
  const routeSource = read('app/api/mobile/v2/face-recognition/route.ts')

  assert.match(routeSource, /import \{ revalidatePath \} from ['"]next\/cache['"]/)
  assert.match(routeSource, /revalidatePath\(['"]\/mobile\/attendance['"]\)/)
  assert.match(routeSource, /revalidatePath\(['"]\/mobile\/attendance\/face-v2['"]\)/)
})

test('face v2 client component syncs logs state when todayLogs prop updates', () => {
  const clientSource = read('app/mobile/attendance/face-v2/face-v2-client.tsx')

  assert.match(clientSource, /useEffect\(\(\) => \{\s*setLogs\(todayLogs\)\s*\}, \[todayLogs\]\)/)
})
