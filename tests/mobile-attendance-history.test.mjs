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

  assert.match(clientSource, /const EMPTY_TODAY_LOGS: TodayLog\[\] = \[\]/)
  assert.match(clientSource, /todayLogs = EMPTY_TODAY_LOGS/)
  assert.match(clientSource, /useEffect\(\(\) => \{\s*setLogs\(todayLogs\)\s*\}, \[todayLogs\]\)/)
  assert.match(clientSource, /const currentEventType = logs\[0\]\?\.eventType \?\? lastEventType/)
  assert.match(clientSource, /currentEventType === 'checked-in'/)
})

test('face v2 refreshes GPS instead of submitting the cached position', () => {
  const clientSource = read('app/mobile/attendance/face-v2/face-v2-client.tsx')

  assert.match(clientSource, /navigator\.geolocation\.watchPosition/)
  assert.ok((clientSource.match(/maximumAge: 0/g) || []).length >= 2)
  assert.match(clientSource, /position = await getCurrentGps\(\)/)
  assert.doesNotMatch(clientSource, /gpsRef/)
})
