import { NextResponse } from "next/server";

import { submitHseObservationFromPayload } from "@/app/actions/hse";
import type { HseObservationSyncPayload } from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as HseObservationSyncPayload;
    const result = await submitHseObservationFromPayload(payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Sync observasi HSE gagal.",
      },
      { status: 400 },
    );
  }
}
