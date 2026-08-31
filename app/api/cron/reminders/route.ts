import { NextResponse } from "next/server";
import { runApprovalAutomationTick } from "@/lib/approval-blueprint";
import { runApdReminders } from "@/lib/apd-reminder";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const headerSecret = request.headers.get("x-cron-secret");
  if (secret && headerSecret && headerSecret !== secret) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
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

