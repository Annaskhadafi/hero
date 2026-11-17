import test from 'node:test'
import assert from 'node:assert/strict'
import sharp from 'sharp'
import * as ort from 'onnxruntime-node'
import { join } from 'path'
import { existsSync } from 'fs'

test('hazardyolo26n-4.onnx exists in Weight directory and has valid input/output shapes', async () => {
  const modelPath = join(process.cwd(), 'Weight', 'hazardyolo26n-4.onnx')
  assert.equal(existsSync(modelPath), true, 'Model file must exist')

  const session = await ort.InferenceSession.create(modelPath)
  assert.deepEqual(session.inputNames, ['images'])
  assert.deepEqual(session.outputNames, ['output0'])
})

test('sharp pre-processes image to [1, 3, 640, 640] and onnx executes inference in sub-100ms', async () => {
  const modelPath = join(process.cwd(), 'Weight', 'hazardyolo26n-4.onnx')
  const session = await ort.InferenceSession.create(modelPath)

  const dummyBuffer = await sharp({
    create: {
      width: 1280,
      height: 720,
      channels: 3,
      background: { r: 100, g: 100, b: 100 }
    }
  }).jpeg().toBuffer()

  const { data: rawData } = await sharp(dummyBuffer)
    .resize(640, 640, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const planeSize = 640 * 640
  const floatArr = new Float32Array(3 * planeSize)
  for (let i = 0; i < planeSize; i++) {
    floatArr[i] = rawData[i * 3] / 255.0
    floatArr[planeSize + i] = rawData[i * 3 + 1] / 255.0
    floatArr[planeSize * 2 + i] = rawData[i * 3 + 2] / 255.0
  }

  const tensor = new ort.Tensor('float32', floatArr, [1, 3, 640, 640])
  const start = performance.now()
  const outputs = await session.run({ images: tensor })
  const end = performance.now()

  assert.equal(outputs.output0.dims.length, 3)
  assert.equal(outputs.output0.dims[0], 1)
  assert.equal(outputs.output0.dims[1], 300)
  assert.equal(outputs.output0.dims[2], 6)
  assert.ok(end - start < 200, `Inference should be fast (<200ms), took ${(end - start).toFixed(2)}ms`)
})
