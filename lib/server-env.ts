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
  databaseUrl: getRequiredEnv("DATABASE_URL"),
  s3BucketName: getFirstEnvValue([
    "S3_BUCKET_NAME",
    "AWS_S3_BUCKET",
    "AWS_BUCKET_NAME",
  ]),
  s3Region: getFirstEnvValue([
    "S3_REGION",
    "AWS_REGION",
    "AWS_DEFAULT_REGION",
  ]),
  s3Endpoint: getFirstEnvValue([
    "S3_ENDPOINT",
    "AWS_ENDPOINT_URL_S3",
    "AWS_ENDPOINT_URL",
  ]),
  s3AccessKeyId: getFirstEnvValue([
    "S3_ACCESS_KEY_ID",
    "AWS_ACCESS_KEY_ID",
  ]),
  s3SecretAccessKey: getFirstEnvValue([
    "S3_SECRET_ACCESS_KEY",
    "AWS_SECRET_ACCESS_KEY",
  ]),
  s3SessionToken: getFirstEnvValue([
    "S3_SESSION_TOKEN",
    "AWS_SESSION_TOKEN",
  ]),
  s3PublicBaseUrl: getFirstEnvValue([
    "S3_PUBLIC_URL_BASE",
    "NEXT_PUBLIC_S3_PUBLIC_URL_BASE",
  ]),
  s3ForcePathStyle: getBooleanEnv(["S3_FORCE_PATH_STYLE"]),
  s3UploadPrefix: getFirstEnvValue(["S3_UPLOAD_PREFIX", "OBJECT_STORAGE_PREFIX"]),
};
