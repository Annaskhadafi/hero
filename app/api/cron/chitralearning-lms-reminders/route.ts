import { NextResponse } from "next/server";
import { runInternalLmsReminderTick } from "@/lib/chitralearning-lms";

// ponytail: open cron endpoint for Dokploy / simple GET execution (CRON_SECRET optional)
export async function GET(_request: Request) {
  try {
    const result = await runInternalLmsReminderTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ChitraLearning reminder tick failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
