import { NextRequest, NextResponse } from 'next/server'
import {
  isS3UploadConfigured,
  uploadAnyFileToS3,
  uploadAttendancePhotoToS3,
} from '@/lib/s3-storage'
import { optimizeUploadFile } from '@/lib/server-image-optimization'
import { getServerSession } from '@/lib/auth-session'
import { getMaestroServerSession } from '@/lib/maestro-session'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024
const MAX_PDF_FILE_SIZE = 15 * 1024 * 1024
const MAX_DOC_FILE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024

const BANNED_EXTENSIONS = new Set([
  'html', 'htm', 'xhtml', 'svg', 'exe', 'js', 'mjs', 'ts', 'php', 'phtml',
  'sh', 'bash', 'bat', 'cmd', 'ps1', 'vbs', 'cgi', 'pl', 'py', 'jsp', 'asp', 'aspx',
])

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Requested-With, Accept',
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: CORS_HEADERS,
  })
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const rawTarget =
      (formData.get('uploadTarget') as string | null) ||
      (formData.get('folder') as string | null)
    const uploadTarget = rawTarget?.trim() || 'upload'

    // Public targets allow uploads without active web session (mobile APK inspection, public CV)
    const isPublicTarget =
      uploadTarget === 'hse-osm' ||
      uploadTarget === 'public-career-cv' ||
      uploadTarget === 'attendance'

    if (!isPublicTarget) {
      const session = await getServerSession()
      const maestroSession = !session?.user ? await getMaestroServerSession() : null
      const hasAuth = Boolean(session?.user?.email || session?.user?.id || maestroSession?.user?.email || maestroSession?.user?.id)

      if (!hasAuth) {
        return NextResponse.json(
          { success: false, error: 'Unauthorized: Sesi login diperlukan untuk unggah berkas.' },
          { status: 401, headers: CORS_HEADERS }
        )
      }
    }

    const file = formData.get('file') as File | null
    if (!file) {
      return NextResponse.json(
        { success: false, error: 'File tidak ditemukan dalam form data.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const fileName = file.name || 'photo.webp'
    const fileExt = fileName.split('.').pop()?.toLowerCase() || ''
    if (BANNED_EXTENSIONS.has(fileExt) || file.type === 'image/svg+xml') {
      return NextResponse.json(
        { success: false, error: 'Tipe file ini dilarang demi alasan keamanan.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    const isImage =
      (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|jfif)$/i.test(fileName)) &&
      file.type !== 'image/svg+xml'

    if (isImage && file.size > MAX_IMAGE_FILE_SIZE) {
      return NextResponse.json(
        { success: false, error: 'Ukuran foto maksimal 15MB.' },
        { status: 400, headers: CORS_HEADERS }
      )
    }

    if (!isS3UploadConfigured()) {
      return NextResponse.json(
        { success: false, error: 'S3 Cloud Storage belum dikonfigurasi.' },
        { status: 500, headers: CORS_HEADERS }
      )
    }

    // Optimize raster images
    const fileToUpload = isImage
      ? await optimizeUploadFile(file, {
          maxDimension: uploadTarget === 'hse-osm' ? 1400 : 1600,
          quality: 78,
        })
      : file

    const result =
      uploadTarget === 'attendance'
        ? await uploadAttendancePhotoToS3(fileToUpload)
        : await uploadAnyFileToS3(fileToUpload, uploadTarget)

    const proxyUrl = `/api/uploads/${result.key}`

    return NextResponse.json(
      {
        success: true,
        url: proxyUrl,
        readableUrl: proxyUrl,
        fileName: fileToUpload.name,
        fileSize: fileToUpload.size,
      },
      { status: 200, headers: CORS_HEADERS }
    )
  } catch (error: any) {
    console.error('[API /api/upload error]:', error)
    return NextResponse.json(
      { success: false, error: error?.message || 'Gagal mengunggah berkas.' },
      { status: 500, headers: CORS_HEADERS }
    )
  }
}
