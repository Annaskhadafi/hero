import { NextResponse } from "next/server";

import { submitHseObservationFromPayload } from "@/app/actions/hse";
import {
  hseObservationSyncPayloadSchema,
  parseOfflineSyncPayload,
  type HseObservationSyncPayload,
} from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = parseOfflineSyncPayload<HseObservationSyncPayload>(
      hseObservationSyncPayloadSchema,
      await request.json(),
    );
    const result = await submitHseObservationFromPayload(payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync observasi HSE gagal.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 },
    );
  }
}
