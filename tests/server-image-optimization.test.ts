import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import { optimizeImageBufferToWebp } from '../lib/server-image-optimization'

test('optimizeImageBufferToWebp converts raw PNG/JPEG to WebP', async () => {
  // Create a synthetic 1000x1000 PNG image
  const rawPng = await sharp({
    create: {
      width: 1000,
      height: 1000,
      channels: 4,
      background: { r: 50, g: 120, b: 200, alpha: 1 },
    },
  })
    .png()
    .toBuffer()

  assert.ok(rawPng.length > 0)

  const result = await optimizeImageBufferToWebp(rawPng, 'sample-photo.png', 'image/png')

  assert.equal(result.wasOptimized, true)
  assert.equal(result.contentType, 'image/webp')
  assert.equal(result.fileName, 'sample-photo.webp')
  assert.ok(result.buffer.length > 0)

  // Verify the output buffer is indeed a valid WebP image readable by sharp
  const metadata = await sharp(result.buffer).metadata()
  assert.equal(metadata.format, 'webp')
  assert.equal(metadata.width, 1000)
  assert.equal(metadata.height, 1000)
})

test('optimizeImageBufferToWebp downscales oversized images to maxDimension', async () => {
  // Create a synthetic 3000x2000 image
  const rawLarge = await sharp({
    create: {
      width: 3000,
      height: 2000,
      channels: 3,
      background: { r: 255, g: 0, b: 0 },
    },
  })
    .jpeg()
    .toBuffer()

  const result = await optimizeImageBufferToWebp(
    rawLarge,
    'camera-photo.jpg',
    'image/jpeg',
    { maxDimension: 1920 }
  )

  assert.equal(result.wasOptimized, true)
  assert.equal(result.fileName, 'camera-photo.webp')

  const metadata = await sharp(result.buffer).metadata()
  assert.equal(metadata.format, 'webp')
  assert.ok(metadata.width <= 1920)
  assert.ok(metadata.height <= 1920)
})

test('optimizeImageBufferToWebp completely bypasses PDFs and Office documents', async () => {
  const fakePdfBuffer = Buffer.from('%PDF-1.4 Fake PDF Content')
  const result = await optimizeImageBufferToWebp(
    fakePdfBuffer,
    'laporan.pdf',
    'application/pdf'
  )

  assert.equal(result.wasOptimized, false)
  assert.equal(result.contentType, 'application/pdf')
  assert.equal(result.fileName, 'laporan.pdf')
  assert.deepEqual(result.buffer, fakePdfBuffer)
})

test('optimizeImageBufferToWebp bypasses animated GIFs and SVGs', async () => {
  const fakeSvg = Buffer.from('<svg></svg>')
  const result = await optimizeImageBufferToWebp(
    fakeSvg,
    'logo.svg',
    'image/svg+xml'
  )

  assert.equal(result.wasOptimized, false)
  assert.equal(result.fileName, 'logo.svg')
})
