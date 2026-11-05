'use server'

import {
  getS3ObjectReadUrl,
  isS3UploadConfigured,
  uploadAnyFileToS3,
  uploadAttendancePhotoToS3,
} from '@/lib/s3-storage'
import { optimizeUploadFile } from '@/lib/server-image-optimization'
import { getServerSession } from '@/lib/auth-session'
import { getMaestroServerSession } from '@/lib/maestro-session'
import { db } from '@/db'
import { hcContractReviewApprovals } from '@/db/schema/hero'
import { eq } from 'drizzle-orm'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const MAX_IMAGE_FILE_SIZE = 15 * 1024 * 1024
const MAX_PDF_FILE_SIZE = 15 * 1024 * 1024
const MAX_DOC_FILE_SIZE = 15 * 1024 * 1024
const MAX_VIDEO_FILE_SIZE = 100 * 1024 * 1024 // 100MB

const OFFICE_MIME_TYPES = new Set([
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-powerpoint',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroEnabled.12',
  'text/csv',
])
const OFFICE_EXTENSIONS = new Set(['doc', 'docx', 'ppt', 'pptx', 'xls', 'xlsx', 'csv'])
const BANNED_EXTENSIONS = new Set([
  'html',
  'htm',
  'xhtml',
  'svg',
  'exe',
  'js',
  'mjs',
  'ts',
  'php',
  'phtml',
  'sh',
  'bash',
  'bat',
  'cmd',
  'ps1',
  'vbs',
  'cgi',
  'pl',
  'py',
  'jsp',
  'asp',
  'aspx',
])

function isPrivateIpOrHost(urlString: string): boolean {
  try {
    const parsed = new URL(urlString)
    const host = parsed.hostname.toLowerCase()
    return (
      host === 'localhost' ||
      host === '127.0.0.1' ||
      host === '::1' ||
      host === '169.254.169.254' ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./.test(host)
    )
  } catch {
    return true
  }
}

async function requireUploadSession() {
  const session = await getServerSession()
  if (session?.user?.email || session?.user?.id) {
    return { success: true as const, session }
  }
  const maestroSession = await getMaestroServerSession()
  if (maestroSession?.user?.email || maestroSession?.user?.id) {
    return { success: true as const, session: maestroSession }
  }
  return { success: false as const, error: 'Unauthorized: Sesi login tidak ditemukan.' }
}

export async function uploadFile(formData: FormData) {
  try {
    const rawTarget = (formData.get('uploadTarget') as string | null) || (formData.get('folder') as string | null)
    const uploadTarget = rawTarget?.trim()
    const isPublicCareerCv = uploadTarget === 'public-career-cv'
    const isContractReviewAttachment = uploadTarget === 'contract-review-attachment'

    if (isContractReviewAttachment) {
      const approvalToken = (formData.get('approvalToken') as string | null)?.trim()
      const session = await getServerSession()
      if (!session?.user?.email) {
        if (!approvalToken) {
          return {
            success: false,
            error: 'Unauthorized: Token approval atau sesi login diperlukan.',
          }
        }
        const [approval] = await db
          .select({ id: hcContractReviewApprovals.id })
          .from(hcContractReviewApprovals)
          .where(eq(hcContractReviewApprovals.approvalToken, approvalToken))
          .limit(1)
        if (!approval) {
          return { success: false, error: 'Unauthorized: Token approval tidak valid.' }
        }
      }
    } else if (!isPublicCareerCv) {
      const access = await requireUploadSession()
      if (!access.success) return access
    }

    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }

    const fileExt = getCurhatFileExtension(file.name, file.type)
    if (BANNED_EXTENSIONS.has(fileExt) || file.type === 'image/svg+xml') {
      return { success: false, error: 'Tipe file ini dilarang demi alasan keamanan.' }
    }

    const isImage =
      (file.type.startsWith('image/') || /\.(jpe?g|png|webp|gif|bmp|heic|heif|jfif)$/i.test(file.name)) &&
      file.type !== 'image/svg+xml'
    const isPdf = file.type === 'application/pdf' || file.type === 'application/x-pdf' || fileExt === 'pdf'
    if (isPublicCareerCv && !isPdf) {
      return { success: false, error: 'CV harus berformat PDF.' }
    }
    const isVideo = file.type.startsWith('video/')
    const isOffice = OFFICE_MIME_TYPES.has(file.type) || OFFICE_EXTENSIONS.has(fileExt)

    if (!isImage && !isPdf && !isVideo && !isOffice) {
      return { success: false, error: 'Format berkas tidak didukung. Harap unggah PDF, Office (Word/Excel/PowerPoint), atau Gambar.' }
    }
    if (isImage && file.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: 'Ukuran foto maksimal 15MB.' }
    }
    if (isPdf && file.size > MAX_PDF_FILE_SIZE) {
      return { success: false, error: 'Ukuran berkas PDF maksimal 15MB.' }
    }
    if (isVideo && file.size > MAX_VIDEO_FILE_SIZE) {
      return { success: false, error: 'Video size max 100MB.' }
    }
    if (isOffice && file.size > MAX_DOC_FILE_SIZE) {
      return { success: false, error: 'Ukuran dokumen Office maksimal 15MB.' }
    }

    // Automatically optimize raster images to WebP with target-tuned dimensions
    const fileToUpload = isImage
      ? await optimizeUploadFile(file, {
          maxDimension: uploadTarget === 'hse-osm' ? 1400 : 1600,
          quality: 78,
        })
      : file
    const finalFileExt = getCurhatFileExtension(fileToUpload.name, fileToUpload.type)
    const isS3Ready = isS3UploadConfigured()

    if (isS3Ready) {
      try {
        const result =
          uploadTarget === 'attendance'
            ? await uploadAttendancePhotoToS3(fileToUpload)
            : uploadTarget
              ? await uploadAnyFileToS3(fileToUpload, uploadTarget)
              : await uploadAnyFileToS3(fileToUpload, undefined, AbortSignal.timeout(30_000))
        const proxyUrl = `/api/uploads/${result.key}`
        return {
          success: true,
          url: proxyUrl,
          readableUrl: proxyUrl,
          fileName: fileToUpload.name,
          fileSize: fileToUpload.size,
        }
      } catch (s3Error: any) {
        console.error('S3 Upload failed:', s3Error)
        return {
          success: false,
          error: `Gagal mengunggah berkas ke S3 Cloud Storage (${s3Error?.message || 'Koneksi S3 terputus'}). Berkas wajib disimpan ke S3 agar tidak hilang saat redeploy. Silakan coba lagi.`,
        }
      }
    }

    // Local fallback storage when S3 is not configured or failed
    const subFolder = uploadTarget ? uploadTarget : ''
    const uploadDir = subFolder
      ? join(process.cwd(), 'public', 'uploads', subFolder)
      : join(process.cwd(), 'public', 'uploads')
    await mkdir(uploadDir, { recursive: true })

    const ext = finalFileExt
    const safeName = sanitizeFileName(fileToUpload.name.replace(/\.[^/.]+$/, '')) || 'file'
    const uniqueName = `${safeName}-${randomUUID().slice(0, 8)}.${ext}`
    const filePath = join(uploadDir, uniqueName)
    const buffer = Buffer.from(await fileToUpload.arrayBuffer())

    await writeFile(filePath, buffer)

    // Also persist to persistent host bind mount if present (e.g. Dokploy /mnt/data/one-chitra/uploads)
    const customUploadsDir = process.env.UPLOADS_DIR || '/mnt/data/one-chitra/uploads'
    try {
      const { existsSync } = await import('fs')
      if (existsSync(customUploadsDir)) {
        const persistentDir = subFolder ? join(customUploadsDir, subFolder) : customUploadsDir
        await mkdir(persistentDir, { recursive: true })
        await writeFile(join(persistentDir, uniqueName), buffer)
      }
    } catch (e) {
      console.warn('Could not write to persistent bind mount fallback:', e)
    }

    const publicUrl = subFolder
      ? `/api/uploads/${subFolder}/${uniqueName}`
      : `/api/uploads/${uniqueName}`
    return {
      success: true,
      url: publicUrl,
      readableUrl: publicUrl,
      fileName: fileToUpload.name,
      fileSize: fileToUpload.size,
    }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error?.message || 'Failed to upload file to Object Storage' }
  }
}

export async function uploadImageFromUrl(imageUrl: string) {
  try {
    const access = await requireUploadSession()
    if (!access.success) return access

    if (isPrivateIpOrHost(imageUrl)) {
      return { success: false, error: 'Access to internal IP address is forbidden.' }
    }

    if (!isS3UploadConfigured()) {
      return { success: false, error: 'S3 Upload Driver is not properly configured.' }
    }

    const response = await fetch(imageUrl)
    if (!response.ok) {
      return { success: false, error: 'Failed to fetch image from URL.' }
    }

    const blob = await response.blob()
    if (!blob.type.startsWith('image/') || blob.type === 'image/svg+xml') {
      return { success: false, error: 'URL does not point to a valid image.' }
    }

    if (blob.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: 'Image from URL is too large (max 5MB).' }
    }

    const urlObj = new URL(imageUrl)
    let fileName = urlObj.pathname.split('/').pop() || 'image.jpg'
    if (!fileName.includes('.')) fileName += '.jpg'

    const file = new File([blob], fileName, { type: blob.type })
    const fileToUpload = await optimizeUploadFile(file)

    const result = await uploadAnyFileToS3(fileToUpload)
    const proxyUrl = `/api/uploads/${result.key}`

    return { success: true, url: proxyUrl, readableUrl: proxyUrl }
  } catch (error) {
    console.error('Upload from URL error:', error)
    return { success: false, error: 'Failed to fetch or upload image from URL.' }
  }
}

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
}

function getCurhatFileExtension(fileName: string, contentType: string) {
  const ext = fileName.split('.').pop()?.toLowerCase()
  if (ext && !BANNED_EXTENSIONS.has(ext) && /^[a-z0-9]{1,10}$/.test(ext)) return ext
  if (contentType === 'application/pdf') return 'pdf'
  if (contentType.startsWith('image/') && contentType !== 'image/svg+xml') {
    if (contentType === 'image/jpeg') return 'jpg'
    if (contentType === 'image/png') return 'png'
    if (contentType === 'image/webp') return 'webp'
    if (contentType === 'image/gif') return 'gif'
  }
  return 'bin'
}

export async function uploadCurhatAttachment(formData: FormData) {
  try {
    const access = await requireUploadSession()
    if (!access.success) return access

    const file = formData.get('file') as File
    if (!file) return { success: false, error: 'No file provided' }

    const fileExt = getCurhatFileExtension(file.name, file.type)
    if (BANNED_EXTENSIONS.has(fileExt) || file.type === 'image/svg+xml') {
      return { success: false, error: 'Tipe file ini dilarang demi alasan keamanan.' }
    }

    const isImage = file.type.startsWith('image/') && file.type !== 'image/svg+xml'
    const isPdf = file.type === 'application/pdf'
    const isDoc =
      file.type === 'application/msword' ||
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.type === 'application/vnd.ms-excel' ||
      file.type === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'

    if (!isImage && !isPdf && !isDoc) {
      return { success: false, error: 'File must be an image, PDF, or Office document.' }
    }

    if (isImage && file.size > MAX_IMAGE_FILE_SIZE) {
      return { success: false, error: 'Ukuran foto maksimal 15MB.' }
    }
    if (isPdf && file.size > MAX_PDF_FILE_SIZE) {
      return { success: false, error: 'PDF size max 10MB.' }
    }
    if (isDoc && file.size > MAX_DOC_FILE_SIZE) {
      return { success: false, error: 'Document size max 10MB.' }
    }

    const fileToUpload = isImage ? await optimizeUploadFile(file) : file
    const finalExt = getCurhatFileExtension(fileToUpload.name, fileToUpload.type)

    if (isS3UploadConfigured()) {
      const result = await uploadAnyFileToS3(fileToUpload, 'curhat-attachments')
      const proxyUrl = `/api/uploads/${result.key}`
      return { success: true, url: proxyUrl, readableUrl: proxyUrl, fileName: fileToUpload.name }
    }

    // Local fallback storage when S3 is not configured
    const uploadDir = join(process.cwd(), 'public', 'uploads', 'curhat')
    await mkdir(uploadDir, { recursive: true })

    const safeName = sanitizeFileName(fileToUpload.name.replace(/\.[^/.]+$/, '')) || 'attachment'
    const uniqueName = `${safeName}-${randomUUID().slice(0, 8)}.${finalExt}`
    const filePath = join(uploadDir, uniqueName)
    const buffer = Buffer.from(await fileToUpload.arrayBuffer())

    await writeFile(filePath, buffer)

    const publicUrl = `/api/uploads/curhat/${uniqueName}`
    return { success: true, url: publicUrl, readableUrl: publicUrl, fileName: fileToUpload.name }
  } catch (error) {
    console.error('Curhat upload error:', error)
    return { success: false, error: 'Failed to upload attachment.' }
  }
}
