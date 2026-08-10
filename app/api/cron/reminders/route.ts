import { NextResponse } from "next/server";
import { runApprovalAutomationTick } from "@/lib/approval-blueprint";
import { runApdReminders } from "@/lib/apd-reminder";

// ponytail: open cron endpoint for Dokploy / simple GET execution (CRON_SECRET optional)
export async function GET(_request: Request) {
  try {
    const result = await runApprovalAutomationTick();
    const apdResult = await runApdReminders();
    return NextResponse.json({ ok: true, approval: result, apd: apdResult });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder tick failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

