import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { gunzipSync, gzipSync } from "zlib";
import {
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { getDatabaseUrl, getDatabaseUrlErrorMessage } from "@/lib/database-url";
import { serverEnv } from "@/lib/server-env";

loadEnvConfig(process.cwd());

const BACKUP_PREFIX = process.env.DB_BACKUP_S3_PREFIX || "database-backups/hero";

function quoteSafeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function getBackupDir() {
  const dir = path.join(process.cwd(), "backups");
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function findExecutable(envName: string, command: string, knownPaths: string[]) {
  const configured = process.env[envName]?.trim();
  if (configured && fs.existsSync(configured)) return configured;

  try {
    execFileSync(command, ["--version"], { stdio: "ignore" });
    return command;
  } catch {
    for (const candidate of knownPaths) {
      if (fs.existsSync(candidate)) return candidate;
    }
  }

  return "";
}

function findPgDump() {
  return findExecutable("PG_DUMP_BIN", "pg_dump", [
    "/usr/bin/pg_dump",
    "/usr/local/bin/pg_dump",
    "/bin/pg_dump",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\16\\pgAdmin 4\\runtime\\pg_dump.exe",
    "C:\\Program Files\\PostgreSQL\\17\\pgAdmin 4\\runtime\\pg_dump.exe",
  ]);
}

function findPsql() {
  return findExecutable("PSQL_BIN", "psql", [
    "/usr/bin/psql",
    "/usr/local/bin/psql",
    "/bin/psql",
    "C:\\Program Files\\PostgreSQL\\17\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\15\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\14\\bin\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\16\\pgAdmin 4\\runtime\\psql.exe",
    "C:\\Program Files\\PostgreSQL\\17\\pgAdmin 4\\runtime\\psql.exe",
  ]);
}

function requireDatabaseUrl() {
  const databaseUrl = getDatabaseUrl();
  if (!databaseUrl) {
    throw new Error(getDatabaseUrlErrorMessage("run database backup"));
  }
  return databaseUrl;
}

function getS3Client() {
  if (!serverEnv.s3BucketName || !serverEnv.s3Region) {
    throw new Error("S3 backup belum siap. Isi S3_BUCKET_NAME dan S3_REGION/AWS_REGION.");
  }
  if (!serverEnv.s3AccessKeyId || !serverEnv.s3SecretAccessKey) {
    throw new Error("Credential S3 backup belum lengkap.");
  }

  return new S3Client({
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

function makeBackupKey(fileName: string) {
  const now = new Date();
  const yyyy = now.getUTCFullYear();
  const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${BACKUP_PREFIX}/${yyyy}/${mm}/${fileName}`;
}

export async function createDatabaseBackup(reason = "manual") {
  const databaseUrl = requireDatabaseUrl();
  const pgDump = findPgDump();
  if (!pgDump) {
    throw new Error("pg_dump tidak ditemukan. Set PG_DUMP_BIN ke lokasi pg_dump di server backup.");
  }

  const timestamp = quoteSafeTimestamp();
  const sqlFile = path.join(getBackupDir(), `hero-${timestamp}.sql`);
  const gzFile = `${sqlFile}.gz`;
  const fileName = path.basename(gzFile);
  const key = makeBackupKey(fileName);

  execFileSync(
    pgDump,
    ["--dbname", databaseUrl, "--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", sqlFile],
    { stdio: "inherit", env: process.env },
  );

  fs.writeFileSync(gzFile, gzipSync(fs.readFileSync(sqlFile), { level: 9 }));
  const buffer = fs.readFileSync(gzFile);

  await getS3Client().send(
    new PutObjectCommand({
      Bucket: serverEnv.s3BucketName,
      Key: key,
      Body: buffer,
      ContentType: "application/gzip",
      Metadata: {
        database: "hero",
        reason,
        created_at: new Date().toISOString(),
      },
    }),
  );

  const sizeMb = (buffer.length / 1024 / 1024).toFixed(2);
  return { key, localFile: gzFile, sizeBytes: buffer.length, sizeMb };
}

export async function listDatabaseBackups(limit = 30) {
  const response = await getS3Client().send(
    new ListObjectsV2Command({
      Bucket: serverEnv.s3BucketName,
      Prefix: `${BACKUP_PREFIX}/`,
    }),
  );

  return (response.Contents ?? [])
    .filter((item) => item.Key?.endsWith(".sql.gz"))
    .sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0))
    .slice(0, limit)
    .map((item) => ({
      key: item.Key!,
      lastModified: item.LastModified?.toISOString() ?? null,
      sizeBytes: item.Size ?? 0,
    }));
}

async function downloadBackupFromS3(key: string) {
  const response = await getS3Client().send(
    new GetObjectCommand({ Bucket: serverEnv.s3BucketName, Key: key }),
  );
  if (!response.Body) throw new Error(`Backup S3 kosong: ${key}`);

  const bytes = await response.Body.transformToByteArray();
  const file = path.join(os.tmpdir(), path.basename(key));
  fs.writeFileSync(file, Buffer.from(bytes));
  return file;
}

function resolveLocalBackup(input: string) {
  if (path.isAbsolute(input)) return input;
  const backupPath = path.join(getBackupDir(), input);
  return fs.existsSync(backupPath) ? backupPath : input;
}

export function getDatabaseBackupEnvStatus() {
  return {
    s3BucketConfigured: Boolean(serverEnv.s3BucketName),
    s3RegionConfigured: Boolean(serverEnv.s3Region),
    s3EndpointConfigured: Boolean(serverEnv.s3Endpoint),
    s3CredentialsConfigured: Boolean(serverEnv.s3AccessKeyId && serverEnv.s3SecretAccessKey),
    databaseUrlConfigured: Boolean(getDatabaseUrl()),
    pgDumpConfigured: Boolean(findPgDump()),
    psqlConfigured: Boolean(findPsql()),
    prefix: BACKUP_PREFIX,
    cronPath: "/api/cron/database-backup",
  };
}

export async function restoreDatabaseBackup(input: string, options: { confirmed?: boolean } = {}) {
  if (!options.confirmed && process.env.CONFIRM_DB_RESTORE !== "YES") {
    throw new Error("Restore ditolak. Jalankan dengan CONFIRM_DB_RESTORE=YES setelah memilih backup yang benar.");
  }

  const databaseUrl = requireDatabaseUrl();
  const psql = findPsql();
  if (!psql) {
    throw new Error("psql tidak ditemukan. Set PSQL_BIN ke lokasi psql di server restore.");
  }

  await createDatabaseBackup("pre-restore");

  const source = input.startsWith(BACKUP_PREFIX) ? await downloadBackupFromS3(input) : resolveLocalBackup(input);
  if (!fs.existsSync(source)) throw new Error(`Backup tidak ditemukan: ${input}`);

  const sqlFile = source.endsWith(".gz") ? source.replace(/\.gz$/, "") : source;
  if (source.endsWith(".gz")) {
    fs.writeFileSync(sqlFile, gunzipSync(fs.readFileSync(source)));
  }

  execFileSync(psql, [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
    stdio: "inherit",
    env: process.env,
  });

  return { restoredFrom: input, sqlFile };
}


