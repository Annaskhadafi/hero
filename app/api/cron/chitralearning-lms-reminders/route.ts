import { NextResponse } from "next/server";

import { runInternalLmsReminderTick } from "@/lib/chitralearning-lms";

function getCronSecret(request: Request) {
  const header = request.headers.get("x-cron-secret")?.trim();
  if (header) return header;

  const url = new URL(request.url);
  return url.searchParams.get("secret")?.trim() ?? "";
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const provided = getCronSecret(request);

  if (!expected || provided !== expected) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await runInternalLmsReminderTick();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "ChitraLearning reminder tick failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
