import { getServerSession } from '@/lib/auth-session'
import { isS3UploadConfigured, uploadAnyFileToS3 } from '@/lib/s3-storage'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

export const runtime = 'nodejs'

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0) {
      return Response.json({ error: 'File tidak valid.' }, { status: 400 })
    }
    const isImage = file.type.startsWith('image/')
    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')
    if (!isImage && !isPdf) {
      return Response.json({ error: 'File harus berupa gambar atau PDF.' }, { status: 400 })
    }
    if (file.size > MAX_EVIDENCE_SIZE) {
      return Response.json({ error: 'Ukuran evidence maksimal 10 MB.' }, { status: 413 })
    }

    if (isS3UploadConfigured()) {
      try {
        const s3Result = await uploadAnyFileToS3(file, 'activity-photos')
        if (s3Result.url) {
          return Response.json(s3Result)
        }
      } catch (s3Err) {
        console.warn('[activity-presign] S3 upload failed, falling back to local storage:', s3Err)
      }
    }

    // Local disk fallback
    const ext = file.name.split('.').pop()?.toLowerCase() || (isImage ? 'jpg' : 'pdf')
    const fileName = `${Date.now()}-${randomUUID()}.${ext}`
    const relativePath = `/uploads/activity-photos/${fileName}`
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'activity-photos')

    await mkdir(uploadDir, { recursive: true })
    const buffer = Buffer.from(await file.arrayBuffer())
    await writeFile(join(uploadDir, fileName), buffer)

    return Response.json({
      url: relativePath,
      key: `activity-photos/${fileName}`,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    })
  } catch (error) {
    console.error('Activity evidence upload failed:', error)
    return Response.json({ error: 'Gagal upload evidence.' }, { status: 500 })
  }
}
