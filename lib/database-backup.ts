import { execFileSync } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import { gunzipSync, gzipSync } from "zlib";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { loadEnvConfig } from "@next/env";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { settings } from "@/db/schema";
import { getDatabaseUrl, getDatabaseUrlErrorMessage } from "@/lib/database-url";
import { serverEnv } from "@/lib/server-env";

loadEnvConfig(process.cwd());

const BACKUP_PREFIX = process.env.DB_BACKUP_S3_PREFIX || "database-backups/hero";

function quoteSafeTimestamp(date = new Date()) {
  return date.toISOString().replace(/[:.]/g, "-");
}

function getBackupDir() {
  const primaryDir = path.join(process.cwd(), "backups");
  try {
    fs.mkdirSync(primaryDir, { recursive: true });
    const testFile = path.join(primaryDir, `.write-test-${Date.now()}`);
    fs.writeFileSync(testFile, "ok");
    fs.unlinkSync(testFile);
    return primaryDir;
  } catch {
    const fallbackDir = path.join(os.tmpdir(), "hero-backups");
    fs.mkdirSync(fallbackDir, { recursive: true });
    return fallbackDir;
  }
}

function getPgEnv(databaseUrl: string): Record<string, string> {
  const env: Record<string, string> = {};
  try {
    const parsed = new URL(databaseUrl);
    if (parsed.username) env.PGUSER = decodeURIComponent(parsed.username);
    if (parsed.password) env.PGPASSWORD = decodeURIComponent(parsed.password);
    if (parsed.hostname) env.PGHOST = parsed.hostname;
    if (parsed.port) env.PGPORT = parsed.port;
    if (parsed.pathname && parsed.pathname.length > 1) {
      env.PGDATABASE = decodeURIComponent(parsed.pathname.slice(1));
    }
    const sslmode = parsed.searchParams.get("sslmode");
    if (sslmode) env.PGSSLMODE = sslmode;
  } catch {
    // If URL parsing fails, ignore and let --dbname handle it
  }
  return env;
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

  const pgEnv = getPgEnv(databaseUrl);

  try {
    execFileSync(
      pgDump,
      ["--dbname", databaseUrl, "--clean", "--if-exists", "--no-owner", "--no-privileges", "--file", sqlFile],
      {
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, ...pgEnv },
        timeout: 300000,
        maxBuffer: 100 * 1024 * 1024,
      },
    );
  } catch (err: any) {
    const stderr = err.stderr?.toString("utf-8") || err.message;
    console.error("[database-backup] pg_dump failed:", stderr);
    throw new Error(`pg_dump gagal: ${stderr}`);
  }

  const uncompressedBytes = fs.readFileSync(sqlFile);
  fs.writeFileSync(gzFile, gzipSync(uncompressedBytes, { level: 9 }));
  try {
    fs.unlinkSync(sqlFile); // Remove uncompressed raw sql to save disk space
  } catch {
    // ignore
  }
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
  // Keep runtime backup files scoped; tracing the temp root scans unrelated system files.
  const downloadDir = path.join(os.tmpdir(), "hero-backups");
  fs.mkdirSync(downloadDir, { recursive: true });
  const file = path.join(downloadDir, path.basename(key));
  fs.writeFileSync(file, Buffer.from(bytes));
  return file;
}

function resolveLocalBackup(input: string) {
  if (path.isAbsolute(input)) return input;
  const backupPath = path.join(getBackupDir(), input);
  return fs.existsSync(backupPath) ? backupPath : input;
}

const BACKUP_RETENTION_SETTING_KEY = "backup_retention_months";
const DEFAULT_RETENTION_MONTHS = 3;

export async function getBackupRetentionMonths(): Promise<number> {
  try {
    const [row] = await db
      .select({ value: settings.value })
      .from(settings)
      .where(eq(settings.key, BACKUP_RETENTION_SETTING_KEY))
      .limit(1);

    if (row?.value !== undefined && row?.value !== null && row.value.trim() !== "") {
      const parsed = parseInt(row.value.trim(), 10);
      if (!isNaN(parsed) && parsed >= 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn("[database-backup] Failed to read backup_retention_months from DB:", error);
  }

  const envVal = process.env.DB_BACKUP_RETENTION_MONTHS?.trim();
  if (envVal) {
    const parsed = parseInt(envVal, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return DEFAULT_RETENTION_MONTHS;
}

export async function setBackupRetentionMonths(months: number): Promise<number> {
  const safeMonths = Math.max(0, Math.floor(months));
  await db
    .insert(settings)
    .values({
      key: BACKUP_RETENTION_SETTING_KEY,
      value: String(safeMonths),
      updatedAt: new Date(),
    })
    .onConflictDoUpdate({
      target: settings.key,
      set: {
        value: String(safeMonths),
        updatedAt: new Date(),
      },
    });

  return safeMonths;
}

export type BackupCleanupResult = {
  retentionMonths: number;
  cutoffDate: string;
  deletedCount: number;
  deletedKeys: string[];
  freedBytes: number;
  freedMb: string;
  remainingCount: number;
  localDeletedCount: number;
  message: string;
};

export async function cleanOldDatabaseBackups(customMonths?: number): Promise<BackupCleanupResult> {
  const retentionMonths = customMonths !== undefined ? customMonths : await getBackupRetentionMonths();

  if (retentionMonths <= 0) {
    return {
      retentionMonths: 0,
      cutoffDate: "",
      deletedCount: 0,
      deletedKeys: [],
      freedBytes: 0,
      freedMb: "0.00",
      remainingCount: 0,
      localDeletedCount: 0,
      message: "Kebijakan retensi dinonaktifkan (0 bulan: simpan semua backup).",
    };
  }

  const cutoffDate = new Date();
  cutoffDate.setMonth(cutoffDate.getMonth() - retentionMonths);
  const cutoffTime = cutoffDate.getTime();

  // 1. Fetch all backups from S3 under prefix
  const allContents: Array<{ Key: string; LastModified?: Date; Size?: number }> = [];
  let continuationToken: string | undefined;

  do {
    const response = await getS3Client().send(
      new ListObjectsV2Command({
        Bucket: serverEnv.s3BucketName,
        Prefix: `${BACKUP_PREFIX}/`,
        ContinuationToken: continuationToken,
      }),
    );

    if (response.Contents) {
      for (const item of response.Contents) {
        if (item.Key && (item.Key.endsWith(".sql.gz") || item.Key.endsWith(".sql"))) {
          allContents.push({
            Key: item.Key,
            LastModified: item.LastModified,
            Size: item.Size,
          });
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  // Sort descending by LastModified (newest first)
  allContents.sort((a, b) => (b.LastModified?.getTime() ?? 0) - (a.LastModified?.getTime() ?? 0));

  // SAFETY GUARD: Always preserve at least 1 newest backup no matter how old!
  const candidateOldItems = allContents.slice(1);

  const toDelete = candidateOldItems.filter((item) => {
    const itemTime = item.LastModified ? item.LastModified.getTime() : 0;
    return itemTime > 0 && itemTime < cutoffTime;
  });

  const deletedKeys: string[] = [];
  let freedBytes = 0;

  for (const item of toDelete) {
    try {
      await getS3Client().send(
        new DeleteObjectCommand({
          Bucket: serverEnv.s3BucketName,
          Key: item.Key,
        }),
      );
      deletedKeys.push(item.Key);
      freedBytes += item.Size ?? 0;
    } catch (err) {
      console.error(`[database-backup] Failed to delete S3 backup: ${item.Key}`, err);
    }
  }

  // 2. Clean local backup directory
  let localDeletedCount = 0;
  const candidateDirs = [path.join(process.cwd(), "backups"), path.join(os.tmpdir(), "hero-backups")];
  for (const localDir of candidateDirs) {
    try {
      if (fs.existsSync(localDir)) {
        const files = fs.readdirSync(localDir);
        for (const file of files) {
          if (file.startsWith("hero-") && (file.endsWith(".sql") || file.endsWith(".sql.gz"))) {
            const filePath = path.join(localDir, file);
            try {
              const stat = fs.statSync(filePath);
              if (stat.mtimeMs < cutoffTime) {
                fs.unlinkSync(filePath);
                localDeletedCount++;
              }
            } catch {
              // ignore cleanup failure for single file
            }
          }
        }
      }
    } catch (err) {
      console.error("[database-backup] Failed to clean local backup dir", err);
    }
  }

  const remainingCount = allContents.length - deletedKeys.length;
  const freedMb = (freedBytes / 1024 / 1024).toFixed(2);

  return {
    retentionMonths,
    cutoffDate: cutoffDate.toISOString(),
    deletedCount: deletedKeys.length,
    deletedKeys,
    freedBytes,
    freedMb,
    remainingCount,
    localDeletedCount,
    message:
      deletedKeys.length > 0
        ? `Berhasil membersihkan ${deletedKeys.length} file backup lama (> ${retentionMonths} bulan). Ruang dibebaskan: ${freedMb} MB.`
        : `Tidak ada file backup yang lebih lama dari ${retentionMonths} bulan untuk dihapus.`,
  };
}

export async function getDatabaseBackupEnvStatus() {
  const retentionMonths = await getBackupRetentionMonths();
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
    retentionMonths,
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

  const pgEnv = getPgEnv(databaseUrl);

  try {
    execFileSync(psql, [databaseUrl, "-v", "ON_ERROR_STOP=1", "-f", sqlFile], {
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env, ...pgEnv },
      timeout: 600000,
      maxBuffer: 100 * 1024 * 1024,
    });
  } catch (err: any) {
    const stderr = err.stderr?.toString("utf-8") || err.message;
    console.error("[database-backup] psql restore failed:", stderr);
    throw new Error(`psql restore gagal: ${stderr}`);
  }

  return { restoredFrom: input, sqlFile };
}


