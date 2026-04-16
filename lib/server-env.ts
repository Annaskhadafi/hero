import { loadEnvConfig } from "@next/env";

loadEnvConfig(process.cwd());

function getFirstEnvValue(names: string[]) {
  for (const name of names) {
    const value = process.env[name]?.trim();

    if (value) {
      return value;
    }
  }

  return "";
}

function getRequiredEnv(name: string) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `Environment variable ${name} is required. Add it to .env.local or the active shell session.`,
    );
  }

  return value;
}

function getBooleanEnv(names: string[]) {
  const value = getFirstEnvValue(names).toLowerCase();
  return value === "true" || value === "1" || value === "yes";
}

export const serverEnv = {
  get databaseUrl() {
    return getRequiredEnv("DATABASE_URL");
  },
  get s3BucketName() {
    return getFirstEnvValue([
      "S3_BUCKET_NAME",
      "AWS_S3_BUCKET",
      "AWS_BUCKET_NAME",
      "OBJECT_STORAGE_BUCKET"
    ]);
  },
  get s3Region() {
    return getFirstEnvValue([
      "S3_REGION",
      "AWS_REGION",
      "AWS_DEFAULT_REGION",
      "OBJECT_STORAGE_REGION"
    ]);
  },
  get s3Endpoint() {
    return getFirstEnvValue([
      "S3_ENDPOINT",
      "AWS_ENDPOINT_URL_S3",
      "AWS_ENDPOINT_URL",
      "OBJECT_STORAGE_ENDPOINT"
    ]);
  },
  get s3AccessKeyId() {
    return getFirstEnvValue([
      "S3_ACCESS_KEY_ID",
      "AWS_ACCESS_KEY_ID",
      "OBJECT_STORAGE_ACCESS_KEY_ID",
    ]);
  },
  get s3SecretAccessKey() {
    return getFirstEnvValue([
      "S3_SECRET_ACCESS_KEY",
      "AWS_SECRET_ACCESS_KEY",
      "OBJECT_STORAGE_SECRET_ACCESS_KEY"
    ]);
  },
  get s3SessionToken() {
    return getFirstEnvValue([
      "S3_SESSION_TOKEN",
      "AWS_SESSION_TOKEN",
    ]);
  },
  get s3PublicBaseUrl() {
    return getFirstEnvValue([
      "S3_PUBLIC_URL_BASE",
      "NEXT_PUBLIC_S3_PUBLIC_URL_BASE",
    ]);
  },
  get s3ForcePathStyle() {
    return getBooleanEnv(["S3_FORCE_PATH_STYLE", "OBJECT_STORAGE_FORCE_PATH_STYLE"]);
  },
  get s3UploadPrefix() {
    return getFirstEnvValue(["S3_UPLOAD_PREFIX", "OBJECT_STORAGE_PREFIX"]);
  },
};
