import { NextResponse } from "next/server";

import { submitEmergencyIncidentFromPayload } from "@/app/actions/hse";
import type { EmergencyIncidentSyncPayload } from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = (await request.json()) as EmergencyIncidentSyncPayload;
    const result = await submitEmergencyIncidentFromPayload(payload);

    return NextResponse.json({
      success: true,
      ...result,
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : "Sync emergency report gagal.",
      },
      { status: 400 },
    );
  }
}
