import { getServerSession } from '@/lib/auth-session'
import { createDirectS3UploadUrl, isS3UploadConfigured } from '@/lib/s3-storage'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isS3UploadConfigured()) {
    return Response.json({ error: 'S3 upload belum dikonfigurasi.' }, { status: 503 })
  }

  try {
    const { fileName, contentType } = await request.json()
    if (
      typeof fileName !== 'string' ||
      !fileName.trim() ||
      typeof contentType !== 'string' ||
      !contentType.startsWith('image/')
    ) {
      return Response.json({ error: 'Evidence harus berupa gambar.' }, { status: 400 })
    }

    return Response.json(
      await createDirectS3UploadUrl(fileName.slice(0, 200), contentType, 'activity-photos')
    )
  } catch {
    return Response.json({ error: 'Gagal menyiapkan upload evidence.' }, { status: 500 })
  }
}
