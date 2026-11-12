import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'
import { isS3UploadConfigured, uploadBufferToS3 } from '@/lib/s3-storage'

/**
 * Centrally saves a generated PDF Uint8Array buffer to S3 or local uploads folder,
 * returning the persistent proxy URL `/api/uploads/${prefix}/${fileName}`.
 */
export async function saveGeneratedPdfUpload(
  buffer: Uint8Array,
  prefix: string,
  filenameIdentifier: string
): Promise<string> {
  const cleanId = filenameIdentifier.replace(/[/\\?%*:|"<>]/g, '_')
  const fileName = `${cleanId}_${Date.now()}_${randomUUID().slice(0, 8)}.pdf`
  const key = `${prefix}/${fileName}`

  if (isS3UploadConfigured()) {
    try {
      const s3Res = await uploadBufferToS3(Buffer.from(buffer), key, 'application/pdf')
      if (s3Res && s3Res.success) {
        return `/api/uploads/${key}`
      }
    } catch (s3Err) {
      console.warn(`[saveGeneratedPdfUpload] S3 upload failed for ${key}, falling back to local:`, s3Err)
    }
  }

  // Local fallback persistence
  const dirPath = join(process.cwd(), 'public', 'uploads', prefix)
  await mkdir(dirPath, { recursive: true })
  const filePath = join(dirPath, fileName)
  await writeFile(filePath, Buffer.from(buffer))
  return `/api/uploads/${prefix}/${fileName}`
}
