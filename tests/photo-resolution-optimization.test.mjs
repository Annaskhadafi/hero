import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import path from 'node:path'

const projectRoot = process.cwd()

function read(relativePath) {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8')
}

test('photo url optimization and resolution contract', () => {
  const photoUrlSource = read('lib/photo-url.ts')
  const resolveUrlSource = read('lib/resolve-upload-url.ts')
  const viewRouteSource = read('app/api/activity-photos/view/route.ts')
  const uploadsRouteSource = read('app/api/uploads/[...path]/route.ts')

  // 1. Photo URL helper routes width and HEIC to /api/activity-photos/view
  assert.match(photoUrlSource, /\(width && width > 0\) \|\| isHeic/)
  assert.match(photoUrlSource, /\/api\/activity-photos\/view\?/)

  // 2. Resolve upload URL maps bare filenames to activity-photos to avoid ERR_BLOCKED_BY_ORB
  assert.match(resolveUrlSource, /activity-photos\/\$\{cleanPath\}/)
  assert.match(resolveUrlSource, /!cleanPath\.includes\("\/"\)/)

  // 3. Fast native Sharp HEIF decoding in view route without event loop lockup
  assert.match(viewRouteSource, /masterBuffer = await sharp\(inputBuffer\)/)
  assert.match(viewRouteSource, /heic-decode WASM/)
  assert.match(viewRouteSource, /candidatePaths/)

  // 4. Uploads proxy returns 404 for missing image files to prevent <img> rendering HTML
  assert.match(uploadsRouteSource, /isImageFile/)
  assert.match(uploadsRouteSource, /status: 404/)
})
