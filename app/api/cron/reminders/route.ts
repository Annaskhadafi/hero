import { NextResponse } from "next/server";
import { runApprovalAutomationTick } from "@/lib/approval-blueprint";
import { runApdReminders } from "@/lib/apd-reminder";

function isAuthorizedCronRequest(request: Request): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return false;
  }
  const authHeader = request.headers.get("authorization");
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }
  const headerSecret = request.headers.get("x-cron-secret");
  if (headerSecret === cronSecret) {
    return true;
  }
  const url = new URL(request.url);
  if (url.searchParams.get("secret") === cronSecret) {
    return true;
  }
  return false;
}

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json(
      { ok: false, error: "Unauthorized: Invalid or missing CRON_SECRET" },
      { status: 401 }
    );
  }

  try {
    const result = await runApprovalAutomationTick();
    const apdResult = await runApdReminders();
    return NextResponse.json({ ok: true, approval: result, apd: apdResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder tick failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}


