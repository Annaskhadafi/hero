import { randomUUID } from "crypto";
import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { serverEnv } from "@/lib/server-env";

const PROFILE_PHOTO_PREFIX = "profile-photos";

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

function getObjectExtension(contentType: string) {
  switch (contentType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "image/gif":
      return "gif";
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
  const extension = getObjectExtension(contentType);
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
    }),
  );

  return {
    key,
    url: buildS3PublicUrl(key),
  };
}

export function isS3UploadConfigured() {
  return Boolean(
    serverEnv.s3BucketName &&
      serverEnv.s3Region &&
      serverEnv.s3AccessKeyId &&
      serverEnv.s3SecretAccessKey,
  );
}
