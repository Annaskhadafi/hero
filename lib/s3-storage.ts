import { randomUUID } from 'crypto'
import { GetObjectCommand, HeadObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { NodeHttpHandler } from '@smithy/node-http-handler'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { serverEnv } from '@/lib/server-env'

const PROFILE_PHOTO_PREFIX = 'profile-photos'
const ATTENDANCE_PHOTO_PREFIX = 'attendance-photos'

let s3Client: S3Client | null = null

function ensureLeadingProtocol(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url
  }

  return `https://${url}`
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, '')
}

function encodeObjectKey(key: string) {
  return key
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

function decodeObjectKey(pathname: string) {
  return pathname
    .replace(/^\/+/, '')
    .split('/')
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join('/')
}

function getObjectKeyFromUrl(objectUrl: string) {
  try {
    const trimmed = objectUrl.trim().split('?')[0].split('#')[0]
    let cleanPath = trimmed.replace(/^\/+/, '')
    if (cleanPath.startsWith('api/uploads/')) {
      cleanPath = cleanPath.slice('api/uploads/'.length)
    } else if (cleanPath.startsWith('api/')) {
      cleanPath = cleanPath.slice('api/'.length)
    }
    if (cleanPath.startsWith('uploads/upload/')) {
      cleanPath = cleanPath.slice('uploads/'.length)
    }
    if (
      cleanPath.startsWith('upload/') ||
      cleanPath.startsWith('uploads/') ||
      cleanPath.startsWith('attendance-photos/') ||
      cleanPath.startsWith('activity-photos/') ||
      cleanPath.startsWith('profile-photos/') ||
      cleanPath.startsWith('curhat/') ||
      cleanPath.startsWith('curhat-attachments/') ||
      cleanPath.startsWith('mcu-wellness-results/') ||
      cleanPath.startsWith('mcu-referral-letters/') ||
      cleanPath.startsWith('mcu-results/') ||
      cleanPath.startsWith('offering-letters/') ||
      cleanPath.startsWith('sop-win-requests/') ||
      cleanPath.startsWith('sop-win/') ||
      cleanPath.startsWith('lms-materials/') ||
      cleanPath.startsWith('lms-covers/') ||
      cleanPath.startsWith('chitralearning/') ||
      cleanPath.startsWith('emergency-reports/') ||
      cleanPath.startsWith('safety/') ||
      cleanPath.startsWith('face-attendance/') ||
      cleanPath.startsWith('face-attendance-v2/') ||
      cleanPath.startsWith('contract-review-attachment/') ||
      cleanPath.startsWith('hrga-kerjasama/') ||
      cleanPath.startsWith('ga-house-rental/') ||
      cleanPath.startsWith('public-career-cv/') ||
      cleanPath.startsWith('hse-osm/') ||
      cleanPath.startsWith('reward-store/') ||
      cleanPath.startsWith('training-requests/') ||
      cleanPath.startsWith('marital-status/') ||
      cleanPath.startsWith('rfr/') ||
      cleanPath.startsWith('road-hazard/') ||
      cleanPath.startsWith('twibbon-templates/')
    ) {
      return cleanPath
    }

    const normalizedObjectUrl = ensureLeadingProtocol(trimmed)
    const targetUrl = new URL(normalizedObjectUrl)
    const bucketName = serverEnv.s3BucketName
    const objectPath = decodeObjectKey(targetUrl.pathname)

    if (serverEnv.s3PublicBaseUrl) {
      const publicBaseUrl = new URL(
        `${trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3PublicBaseUrl))}/`
      )

      if (
        targetUrl.origin === publicBaseUrl.origin &&
        targetUrl.pathname.startsWith(publicBaseUrl.pathname)
      ) {
        return decodeObjectKey(targetUrl.pathname.slice(publicBaseUrl.pathname.length))
      }
    }

    if (serverEnv.s3Endpoint) {
      const endpointUrl = new URL(trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3Endpoint)))

      if (targetUrl.host === endpointUrl.host) {
        return objectPath.startsWith(`${bucketName}/`)
          ? objectPath.slice(bucketName.length + 1)
          : objectPath
      }

      if (targetUrl.host === `${bucketName}.${endpointUrl.host}`) {
        return objectPath
      }
    }

    if (targetUrl.host === `${bucketName}.s3.${serverEnv.s3Region}.amazonaws.com`) {
      return objectPath
    }

    const knownPrefixMatch = objectPath.match(
      /(?:^|\/)((?:activity-photos|attendance-photos|profile-photos|upload|uploads|curhat|curhat-attachments|mcu-wellness-results|mcu-referral-letters|mcu-results|offering-letters|sop-win-requests|sop-win|lms-materials|lms-covers|chitralearning|emergency-reports|safety|face-attendance|face-attendance-v2|contract-review-attachment|public-career-cv|hse-osm|reward-store|training-requests|marital-status|twibbon-templates)\/.+)$/i
    )

    if (knownPrefixMatch) {
      return knownPrefixMatch[1]
    }

    return objectPath.startsWith(`${bucketName}/`) ? objectPath.slice(bucketName.length + 1) : null
  } catch {
    return null
  }
}

function getObjectExtension(contentType: string, fileName?: string) {
  // Preserve original extension when available so PDFs/documents keep their type.
  if (fileName) {
    const originalExt = fileName.split('.').pop()?.toLowerCase()
    if (originalExt && /^[a-z0-9]{1,10}$/.test(originalExt)) {
      return originalExt
    }
  }

  switch (contentType) {
    case 'image/jpeg':
      return 'jpg'
    case 'image/png':
      return 'png'
    case 'image/webp':
      return 'webp'
    case 'image/gif':
      return 'gif'
    case 'application/pdf':
      return 'pdf'
    default:
      return 'bin'
  }
}

function getS3Client() {
  if (!serverEnv.s3BucketName) {
    throw new Error('S3 bucket belum dikonfigurasi. Isi S3_BUCKET_NAME di environment aplikasi.')
  }

  if (!serverEnv.s3Region) {
    throw new Error(
      'S3 region belum dikonfigurasi. Isi S3_REGION atau AWS_REGION di environment aplikasi.'
    )
  }

  if (!serverEnv.s3AccessKeyId || !serverEnv.s3SecretAccessKey) {
    throw new Error(
      'Credential S3 belum lengkap. Isi access key dan secret key di environment aplikasi.'
    )
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: serverEnv.s3Region,
      endpoint: serverEnv.s3Endpoint || undefined,
      forcePathStyle: serverEnv.s3ForcePathStyle,
      credentials: {
        accessKeyId: serverEnv.s3AccessKeyId,
        secretAccessKey: serverEnv.s3SecretAccessKey,
        sessionToken: serverEnv.s3SessionToken || undefined,
      },
      requestHandler: new NodeHttpHandler({
        connectionTimeout: 30_000,
        requestTimeout: 120_000,
      }),
      maxAttempts: 3,
    })
  }

  return s3Client
}

function buildS3PublicUrl(key: string) {
  const encodedKey = encodeObjectKey(key)

  if (serverEnv.s3PublicBaseUrl) {
    return `${trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3PublicBaseUrl))}/${encodedKey}`
  }

  // When s3PublicBaseUrl is not set (private S3 bucket without public CDN),
  // routing through internal proxy /api/uploads ensures persistent authenticated file serving.
  return `/api/uploads/${encodedKey}`
}

export async function uploadProfilePhotoToS3(file: File) {
  const { optimizeUploadFile } = await import('@/lib/server-image-optimization')
  const fileToUpload = await optimizeUploadFile(file, { maxDimension: 800, quality: 85 })
  const contentType = fileToUpload.type || 'application/octet-stream'
  const extension = getObjectExtension(contentType, fileToUpload.name)
  const key = `${PROFILE_PHOTO_PREFIX}/${randomUUID()}.${extension}`
  const buffer = Buffer.from(await fileToUpload.arrayBuffer())

  const client = getS3Client()

  try {
    await client.send(
      new PutObjectCommand({
        Bucket: serverEnv.s3BucketName,
        Key: key,
        Body: buffer,
        ContentLength: buffer.length,
        ContentType: contentType,
        CacheControl: 'public, max-age=31536000, immutable',
      })
    )
  } catch (aclError: any) {
    if (
      aclError?.name === 'AccessControlListNotSupported' ||
      String(aclError?.message || '').includes('ACL')
    ) {
      await client.send(
        new PutObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: key,
          Body: buffer,
          ContentLength: buffer.length,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      )
    } else {
      throw aclError
    }
  }

  return {
    key,
    url: buildS3PublicUrl(key),
  }
}

export async function uploadAnyFileToS3(
  file: File,
  prefixOverride?: string,
  abortSignal?: AbortSignal
) {
  const contentType = file.type || 'application/octet-stream'
  const extension = getObjectExtension(contentType, file.name)
  const prefix = prefixOverride || serverEnv.s3UploadPrefix || 'upload'
  const key = `${prefix}/${randomUUID()}.${extension}`
  const buffer = Buffer.from(await file.arrayBuffer())

  const client = getS3Client()
  const maxAttempts = 3
  let lastError: any = null

  // Generous timeout for large files and cross-region transmission (90s base, up to 240s)
  const timeoutMs = Math.max(90_000, Math.min(240_000, Math.ceil(buffer.length / (25 * 1024)) * 1000))

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const attemptTimeout = AbortSignal.timeout(timeoutMs)
      const putSignal = abortSignal
        ? (typeof AbortSignal.any === 'function' ? AbortSignal.any([abortSignal, attemptTimeout]) : abortSignal)
        : attemptTimeout

      await client.send(
        new PutObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: key,
          Body: buffer,
          ContentLength: buffer.length,
          ContentType: contentType,
          CacheControl: 'public, max-age=31536000, immutable',
        }),
        { abortSignal: putSignal }
      )
      return {
        key,
        url: buildS3PublicUrl(key),
      }
    } catch (putError: any) {
      lastError = putError
      const isAbortedByUser = abortSignal?.aborted
      if (isAbortedByUser || attempt === maxAttempts) {
        break
      }
      console.warn(
        `[uploadAnyFileToS3] Attempt ${attempt}/${maxAttempts} failed (${putError?.message || putError}), retrying in ${attempt * 500}ms...`
      )
      await new Promise((resolve) => setTimeout(resolve, attempt * 1000))
    }
  }

  throw lastError
}

export async function createDirectS3UploadUrl(
  fileName: string,
  contentType: string,
  prefixOverride?: string
) {
  const extension = getObjectExtension(contentType, fileName)
  const prefix = prefixOverride || serverEnv.s3UploadPrefix || 'upload'
  const key = `${prefix}/${randomUUID()}.${extension}`
  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 15 * 60 }
  )

  return { key, url: buildS3PublicUrl(key), uploadUrl }
}

export async function uploadAttendancePhotoToS3(file: File) {
  return uploadAnyFileToS3(file, ATTENDANCE_PHOTO_PREFIX)
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType = 'application/octet-stream'
) {
  const client = getS3Client()
  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      Body: buffer,
      ContentLength: buffer.length,
      ContentType: contentType,
      CacheControl: 'private, max-age=86400',
    })
  )
  return { key, url: buildS3PublicUrl(key) }
}

export async function getS3ObjectReadUrl(objectUrl: string | null, expiresIn = 3600) {
  if (!objectUrl) {
    return null
  }

  if (!isS3UploadConfigured()) {
    return objectUrl
  }

  const key = getObjectKeyFromUrl(objectUrl)

  if (!key) {
    return objectUrl
  }

  try {
    return await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: serverEnv.s3BucketName,
        Key: key,
      }),
      { expiresIn }
    )
  } catch (error) {
    console.error('Failed to create signed S3 read URL:', error)
    return objectUrl
  }
}

export function resolveS3ObjectKey(objectUrl: string | null) {
  if (!objectUrl) {
    return null
  }

  return getObjectKeyFromUrl(objectUrl)
}

function buildTargetedCandidateKeys(cleanKey: string, bareFilename: string): string[] {
  const list: string[] = [cleanKey]

  if (cleanKey.startsWith('upload/')) {
    list.push(cleanKey.replace(/^upload\//, 'uploads/'))
    list.push(`rfr/${bareFilename}`)
    list.push(bareFilename)
  } else if (cleanKey.startsWith('uploads/')) {
    list.push(cleanKey.replace(/^uploads\//, 'upload/'))
    list.push(`rfr/${bareFilename}`)
    list.push(bareFilename)
  } else if (cleanKey.startsWith('rfr/')) {
    list.push(`upload/${bareFilename}`)
    list.push(`uploads/${bareFilename}`)
    list.push(bareFilename)
  } else if (cleanKey.includes('/')) {
    list.push(`upload/${bareFilename}`)
    list.push(bareFilename)
  } else {
    list.push(`upload/${bareFilename}`)
    list.push(`uploads/${bareFilename}`)
    list.push(`rfr/${bareFilename}`)
  }

  return Array.from(new Set(list))
}

export async function getS3ObjectMetadataForProxy(objectUrl: string | null) {
  if (!objectUrl || !isS3UploadConfigured()) {
    return null
  }

  const primaryKey =
    resolveS3ObjectKey(objectUrl) ||
    (!objectUrl.includes('://')
      ? objectUrl
          .trim()
          .replace(/^\/+/, '')
          .replace(/^api\/uploads\//, '')
      : null)
  if (!primaryKey) {
    return null
  }

  const cleanKey = decodeURIComponent(primaryKey).replace(/^\/+/, '')
  const bareFilename = cleanKey.split('/').pop() || cleanKey
  const candidateKeys = buildTargetedCandidateKeys(cleanKey, bareFilename)
  const client = getS3Client()

  for (let i = 0; i < candidateKeys.length; i++) {
    const candidateKey = candidateKeys[i]
    const timeoutMs = i === 0 ? 5_000 : 2_000
    try {
      const response = await client.send(
        new HeadObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: candidateKey,
        }),
        { abortSignal: AbortSignal.timeout(timeoutMs) }
      )

      if (response) {
        return {
          key: candidateKey,
          contentType: response.ContentType ?? 'application/octet-stream',
          contentLength: response.ContentLength ?? 0,
        }
      }
    } catch {
      // Continue to next candidate
    }
  }

  return null
}

export async function getS3ObjectForProxy(objectUrl: string | null) {
  if (!objectUrl || !isS3UploadConfigured()) {
    return null
  }

  const primaryKey =
    resolveS3ObjectKey(objectUrl) ||
    (!objectUrl.includes('://')
      ? objectUrl
          .trim()
          .replace(/^\/+/, '')
          .replace(/^api\/uploads\//, '')
      : null)
  if (!primaryKey) {
    return null
  }

  const cleanKey = decodeURIComponent(primaryKey).replace(/^\/+/, '')
  const bareFilename = cleanKey.split('/').pop() || cleanKey

  // Distinct candidate keys - targeted lookups for S3
  const candidateKeys = buildTargetedCandidateKeys(cleanKey, bareFilename)

  const client = getS3Client()

  for (let i = 0; i < candidateKeys.length; i++) {
    const candidateKey = candidateKeys[i]
    // The first candidate (exact requested key) gets up to 12s for larger documents/PDFs.
    // Secondary fallbacks get 3.5s to quickly detect 404/NoSuchKey.
    const timeoutMs = i === 0 ? 30_000 : 5_000
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: candidateKey,
        }),
        { abortSignal: AbortSignal.timeout(timeoutMs) }
      )

      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray()
        return {
          body: byteArray,
          contentType: response.ContentType ?? 'application/octet-stream',
          contentLength: response.ContentLength ?? byteArray.byteLength,
        }
      }
    } catch (err: any) {
      if (err?.name !== 'NoSuchKey' && err?.name !== 'NotFound') {
        console.warn(
          `[getS3ObjectForProxy] Candidate key "${candidateKey}" error:`,
          err?.message || err
        )
      }
    }
  }

  return null
}

export async function checkS3ObjectExists(objectUrl: string | null): Promise<boolean> {
  const meta = await getS3ObjectMetadataForProxy(objectUrl)
  return Boolean(meta)
}

export function isS3UploadConfigured() {
  return Boolean(
    serverEnv.s3BucketName &&
    serverEnv.s3Region &&
    serverEnv.s3AccessKeyId &&
    serverEnv.s3SecretAccessKey
  )
}

export {
  resolveUploadUrl,
  replaceS3UrlsInHtml,
  extractS3ObjectKeyFromUrl,
} from '@/lib/resolve-upload-url'
