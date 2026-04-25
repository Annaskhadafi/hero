import { NextResponse } from "next/server";

import { submitEmergencyIncidentFromPayload } from "@/app/actions/hse";
import {
  emergencyIncidentSyncPayloadSchema,
  parseOfflineSyncPayload,
  type EmergencyIncidentSyncPayload,
} from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = parseOfflineSyncPayload<EmergencyIncidentSyncPayload>(
      emergencyIncidentSyncPayloadSchema,
      await request.json(),
    );
    const result = await submitEmergencyIncidentFromPayload(payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync emergency report gagal.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 },
    );
  }
}
