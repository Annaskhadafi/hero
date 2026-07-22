import { NextResponse } from "next/server";
import { runApprovalAutomationTick } from "@/lib/approval-blueprint";

// ponytail: open cron endpoint for Dokploy / simple GET execution (CRON_SECRET optional)
export async function GET(_request: Request) {
  try {
    const result = await runApprovalAutomationTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Reminder tick failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
