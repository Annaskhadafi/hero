import { randomUUID } from "crypto";
import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { serverEnv } from "@/lib/server-env";

const PROFILE_PHOTO_PREFIX = "profile-photos";
const ATTENDANCE_PHOTO_PREFIX = "attendance-photos";

let s3Client: S3Client | null = null;

function ensureLeadingProtocol(url: string) {
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return `https://${url}`;
}

function trimTrailingSlashes(value: string) {
  return value.replace(/\/+$/, "");
}

function encodeObjectKey(key: string) {
  return key
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");
}

function decodeObjectKey(pathname: string) {
  return pathname
    .replace(/^\/+/, "")
    .split("/")
    .filter(Boolean)
    .map((segment) => decodeURIComponent(segment))
    .join("/");
}

function getObjectKeyFromUrl(objectUrl: string) {
  try {
    const trimmed = objectUrl.trim();
    const cleanPath = trimmed.replace(/^\/+/, "");
    if (
      cleanPath.startsWith("upload/") ||
      cleanPath.startsWith("attendance-photos/") ||
      cleanPath.startsWith("activity-photos/") ||
      cleanPath.startsWith("profile-photos/") ||
      cleanPath.startsWith("curhat/") ||
      cleanPath.startsWith("mcu-wellness-results/")
    ) {
      return cleanPath;
    }

    const normalizedObjectUrl = ensureLeadingProtocol(trimmed);
    const targetUrl = new URL(normalizedObjectUrl);
    const bucketName = serverEnv.s3BucketName;
    const objectPath = decodeObjectKey(targetUrl.pathname);

    if (serverEnv.s3PublicBaseUrl) {
      const publicBaseUrl = new URL(
        `${trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3PublicBaseUrl))}/`,
      );

      if (
        targetUrl.origin === publicBaseUrl.origin &&
        targetUrl.pathname.startsWith(publicBaseUrl.pathname)
      ) {
        return decodeObjectKey(
          targetUrl.pathname.slice(publicBaseUrl.pathname.length),
        );
      }
    }

    if (serverEnv.s3Endpoint) {
      const endpointUrl = new URL(
        trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3Endpoint)),
      );

      if (targetUrl.host === endpointUrl.host) {
        return objectPath.startsWith(`${bucketName}/`)
          ? objectPath.slice(bucketName.length + 1)
          : objectPath;
      }

      if (targetUrl.host === `${bucketName}.${endpointUrl.host}`) {
        return objectPath;
      }
    }

    if (targetUrl.host === `${bucketName}.s3.${serverEnv.s3Region}.amazonaws.com`) {
      return objectPath;
    }

    const knownPrefixMatch = objectPath.match(
      /(?:^|\/)((?:activity-photos|attendance-photos|profile-photos|upload|curhat|mcu-wellness-results)\/.+)$/,
    );

    if (knownPrefixMatch) {
      return knownPrefixMatch[1];
    }

    return objectPath.startsWith(`${bucketName}/`)
      ? objectPath.slice(bucketName.length + 1)
      : null;
  } catch {
    return null;
  }
}

function getObjectExtension(contentType: string, fileName?: string) {
  // Preserve original extension when available so PDFs/documents keep their type.
  if (fileName) {
    const originalExt = fileName.split(".").pop()?.toLowerCase();
    if (originalExt && /^[a-z0-9]{1,10}$/.test(originalExt)) {
      return originalExt;
    }
  }

  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function getS3Client() {
  if (!serverEnv.s3BucketName) {
    throw new Error(
      "S3 bucket belum dikonfigurasi. Isi S3_BUCKET_NAME di environment aplikasi.",
    );
  }

  if (!serverEnv.s3Region) {
    throw new Error(
      "S3 region belum dikonfigurasi. Isi S3_REGION atau AWS_REGION di environment aplikasi.",
    );
  }

  if (!serverEnv.s3AccessKeyId || !serverEnv.s3SecretAccessKey) {
    throw new Error(
      "Credential S3 belum lengkap. Isi access key dan secret key di environment aplikasi.",
    );
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
    });
  }

  return s3Client;
}

function buildS3PublicUrl(key: string) {
  const encodedKey = encodeObjectKey(key);

  if (serverEnv.s3PublicBaseUrl) {
    return `${trimTrailingSlashes(ensureLeadingProtocol(serverEnv.s3PublicBaseUrl))}/${encodedKey}`;
  }

  if (serverEnv.s3Endpoint) {
    const normalizedEndpoint = trimTrailingSlashes(
      ensureLeadingProtocol(serverEnv.s3Endpoint),
    );

    if (serverEnv.s3ForcePathStyle) {
      return `${normalizedEndpoint}/${serverEnv.s3BucketName}/${encodedKey}`;
    }

    const endpointUrl = new URL(normalizedEndpoint);
    return `${endpointUrl.protocol}//${serverEnv.s3BucketName}.${endpointUrl.host}/${encodedKey}`;
  }

  return `https://${serverEnv.s3BucketName}.s3.${serverEnv.s3Region}.amazonaws.com/${encodedKey}`;
}

export async function uploadProfilePhotoToS3(file: File) {
  const contentType = file.type || "application/octet-stream";
  const extension = getObjectExtension(contentType, file.name);
  const key = `${PROFILE_PHOTO_PREFIX}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    }),
  );

  return {
    key,
    url: buildS3PublicUrl(key),
  };
}

export async function uploadAnyFileToS3(file: File, prefixOverride?: string) {
  const contentType = file.type || "application/octet-stream";
  const extension = getObjectExtension(contentType, file.name);
  const prefix = prefixOverride || serverEnv.s3UploadPrefix || "upload";
  const key = `${prefix}/${randomUUID()}.${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const client = getS3Client();

  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
      ACL: "public-read",
    }),
  );

  return {
    key,
    url: buildS3PublicUrl(key),
  };
}

export async function createDirectS3UploadUrl(
  fileName: string,
  contentType: string,
  prefixOverride?: string,
) {
  const extension = getObjectExtension(contentType, fileName);
  const prefix = prefixOverride || serverEnv.s3UploadPrefix || "upload";
  const key = `${prefix}/${randomUUID()}.${extension}`;
  const uploadUrl = await getSignedUrl(
    getS3Client(),
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      ContentType: contentType,
      ACL: "public-read",
    }),
    { expiresIn: 15 * 60 },
  );

  return { key, url: buildS3PublicUrl(key), uploadUrl };
}

export async function uploadAttendancePhotoToS3(file: File) {
  return uploadAnyFileToS3(file, ATTENDANCE_PHOTO_PREFIX);
}

export async function uploadBufferToS3(
  buffer: Buffer,
  key: string,
  contentType = "application/octet-stream"
) {
  const client = getS3Client();
  await client.send(
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "private, max-age=86400",
    }),
  );
  return { key, url: buildS3PublicUrl(key) };
}

export async function getS3ObjectReadUrl(objectUrl: string | null, expiresIn = 3600) {
  if (!objectUrl) {
    return null;
  }

  if (!isS3UploadConfigured()) {
    return objectUrl;
  }

  const key = getObjectKeyFromUrl(objectUrl);

  if (!key) {
    return objectUrl;
  }

  try {
    return await getSignedUrl(
      getS3Client(),
      new GetObjectCommand({
        Bucket: serverEnv.s3BucketName,
        Key: key,
      }),
      { expiresIn },
    );
  } catch (error) {
    console.error("Failed to create signed S3 read URL:", error);
    return objectUrl;
  }
}

export function resolveS3ObjectKey(objectUrl: string | null) {
  if (!objectUrl) {
    return null;
  }

  return getObjectKeyFromUrl(objectUrl);
}

export async function getS3ObjectForProxy(objectUrl: string | null) {
  if (!objectUrl || !isS3UploadConfigured()) {
    return null;
  }

  const primaryKey = resolveS3ObjectKey(objectUrl);
  if (!primaryKey) {
    return null;
  }

  const candidateKeys = Array.from(
    new Set([
      primaryKey,
      decodeURIComponent(primaryKey),
      primaryKey.replace(/^upload\//, ""),
      `upload/${primaryKey.replace(/^upload\//, "")}`,
    ])
  );

  const client = getS3Client();

  for (const candidateKey of candidateKeys) {
    try {
      const response = await client.send(
        new GetObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: candidateKey,
        }),
      );

      if (response.Body) {
        const byteArray = await response.Body.transformToByteArray();
        return {
          body: byteArray,
          contentType: response.ContentType ?? "application/octet-stream",
          contentLength: response.ContentLength ?? byteArray.byteLength,
        };
      }
    } catch {
      // Continue trying next candidate key
    }
  }

  return null;
}

export function isS3UploadConfigured() {
  return Boolean(
    serverEnv.s3BucketName &&
      serverEnv.s3Region &&
      serverEnv.s3AccessKeyId &&
      serverEnv.s3SecretAccessKey,
  );
}

export { resolveUploadUrl, replaceS3UrlsInHtml, extractS3ObjectKeyFromUrl } from "@/lib/resolve-upload-url";
