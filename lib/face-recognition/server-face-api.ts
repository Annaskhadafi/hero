import path from 'path'
import sharp from 'sharp'

let faceApiPromise: Promise<any> | null = null

async function getFaceApi() {
  if (!faceApiPromise) {
    faceApiPromise = (async () => {
      const faceapi = await import('face-api.js')

      const modelPath = path.join(process.cwd(), 'public', 'models')
      await faceapi.nets.ssdMobilenetv1.loadFromDisk(modelPath)
      await faceapi.nets.faceLandmark68Net.loadFromDisk(modelPath)
      await faceapi.nets.faceRecognitionNet.loadFromDisk(modelPath)
      return faceapi
    })()
  }

  return faceApiPromise
}

export async function extractServerFaceEmbedding(imageBuffer: Buffer) {
  const faceapi = await getFaceApi()
  const { data, info } = await sharp(imageBuffer)
    .rotate()
    .resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true })
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true })

  const tensor = faceapi.tf.tensor3d(new Uint8Array(data), [info.height, info.width, info.channels])
  try {
    const detection = await faceapi
      .detectSingleFace(tensor, new faceapi.SsdMobilenetv1Options())
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
}

export function resetServerFaceApiForTests() {
  faceApiPromise = null
}
