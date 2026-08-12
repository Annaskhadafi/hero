import path from 'path'
import sharp from 'sharp'

let faceApiPromise: Promise<any> | null = null

async function getFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      try {
        const faceapi = await import('face-api.js')

        const modelPath = path.join(process.cwd(), 'public', 'models')
        await faceapi.nets.tinyFaceDetector.loadFromDisk(modelPath)
        await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
        await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
        return faceapi
      } catch (err) {
        console.error('[server-face-api] Failed to initialize face-api.js:', err)
        return null
      }
    })()
  }

  return faceApiPromise
}

export async function warmupServerFaceApi() {
  await getFaceApi()
  return { warmed: true }
}

export async function extractServerFaceEmbedding(imageBuffer: Buffer) {
  try {
    const faceapi = await getFaceApi()
    if (!faceapi) {
      return null
    }

    const { data, info } = await sharp(imageBuffer)
      .rotate()
      .resize({ width: 416, height: 416, fit: 'inside', withoutEnlargement: true })
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true })

    const tensor = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels])
    try {
      const detectorOptions = new faceapi.TinyFaceDetectorOptions({
        inputSize: 416,
        scoreThreshold: 0.45,
      })
      const detection = await faceapi
        .detectSingleFace(tensor, detectorOptions)
        .withFaceLandmarks()
        .withFaceDescriptor()

      if (!detection) {
        return null
      }

      return {
        embedding: Array.from(detection.descriptor) as number[],
        detectionScore: Number(detection.detection.score || 0),
      }
    } finally {
      tensor.dispose()
    }
  } catch (err) {
    console.error('[server-face-api] extractServerFaceEmbedding failed:', err)
    return null
  }
}

export function resetServerFaceApiForTests() {
  faceApiPromise = null
}
