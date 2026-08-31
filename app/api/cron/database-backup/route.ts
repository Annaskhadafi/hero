import { NextResponse } from "next/server";
import {
  cleanOldDatabaseBackups,
  createDatabaseBackup,
  listDatabaseBackups,
} from "@/lib/database-backup";

export const runtime = "nodejs";
export const maxDuration = 300;

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return false;

  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret === cronSecret) return true;

  const url = new URL(request.url);
  return url.searchParams.get("secret") === cronSecret;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 },
    );
  }

  try {
    const result = await createDatabaseBackup("daily-cron");
    const cleanup = await cleanOldDatabaseBackups();
    const latestBackups = await listDatabaseBackups(5);
    return NextResponse.json({ ok: true, result, cleanup, latestBackups });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Database backup failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
