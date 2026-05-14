/**
 * Downloads face-api.js model files to public/models/ during build.
 * Called from nixpacks.toml or package.json build script.
 */
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MODELS_DIR = path.join(__dirname, '..', 'public', 'models')

const BASE_URL = 'https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights'

const MODEL_FILES = [
  'ssd_mobilenetv1_model-weights_manifest.json',
  'ssd_mobilenetv1_model-shard1',
  'ssd_mobilenetv1_model-shard2',
  'tiny_face_detector_model-weights_manifest.json',
  'tiny_face_detector_model-shard1',
  'face_landmark_68_model-weights_manifest.json',
  'face_landmark_68_model-shard1',
  'face_recognition_model-weights_manifest.json',
  'face_recognition_model-shard1',
  'face_recognition_model-shard2',
]

async function downloadFile(url, dest) {
  const response = await fetch(url)
  if (!response.ok) throw new Error(`Failed to download ${url}: ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(dest, buffer)
  return buffer.length
}

async function main() {
  console.log('[face-models] Checking model files...')
  await mkdir(MODELS_DIR, { recursive: true })

  let downloaded = 0
  let skipped = 0

  for (const file of MODEL_FILES) {
    const dest = path.join(MODELS_DIR, file)
    if (existsSync(dest)) {
      skipped++
      continue
    }
    const url = `${BASE_URL}/${file}`
    console.log(`[face-models] Downloading ${file}...`)
    const size = await downloadFile(url, dest)
    console.log(`[face-models] ✓ ${file} (${(size / 1024).toFixed(1)} KB)`)
    downloaded++
  }

  console.log(`[face-models] Done. Downloaded: ${downloaded}, Skipped (cached): ${skipped}`)
}

main().catch((err) => {
  console.error('[face-models] Error:', err.message)
  // Don't fail the build if models can't be downloaded
  process.exit(0)
})
