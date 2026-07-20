import { getServerSession } from '@/lib/auth-session'
import { isS3UploadConfigured, uploadAnyFileToS3 } from '@/lib/s3-storage'

export const runtime = 'nodejs'

const MAX_EVIDENCE_SIZE = 10 * 1024 * 1024

export async function POST(request: Request) {
  const session = await getServerSession()
  if (!session?.user?.email) return Response.json({ error: 'Unauthorized' }, { status: 401 })
  if (!isS3UploadConfigured()) {
    return Response.json({ error: 'S3 upload belum dikonfigurasi.' }, { status: 503 })
  }

  try {
    const file = (await request.formData()).get('file')
    if (!(file instanceof File) || file.size === 0 || !file.type.startsWith('image/')) {
      return Response.json({ error: 'Evidence harus berupa gambar.' }, { status: 400 })
    }
    if (file.size > MAX_EVIDENCE_SIZE) {
      return Response.json({ error: 'Ukuran evidence maksimal 10 MB.' }, { status: 413 })
    }

    return Response.json(await uploadAnyFileToS3(file, 'activity-photos'))
  } catch (error) {
    console.error('Activity evidence upload failed:', error)
    return Response.json({ error: 'Gagal upload evidence.' }, { status: 500 })
  }
}
