import { NextResponse } from "next/server";

import { submitDailyActivityAction } from "@/app/dashboard/activity-hub/actions";
import {
  activitySyncPayloadSchema,
  parseOfflineSyncPayload,
  type ActivitySyncPayload,
} from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = parseOfflineSyncPayload<ActivitySyncPayload>(
      activitySyncPayloadSchema,
      await request.json(),
    );
    const formData = new FormData();

    formData.append("employeeId", String(payload.employeeId));
    formData.append("sourceMode", payload.sourceMode);
    formData.append("assignmentId", payload.assignmentId);
    formData.append("libraryActivityId", payload.libraryActivityId);
    formData.append("routeTemplateId", payload.routeTemplateId);
    formData.append("overtimeCommandLetterId", payload.overtimeCommandLetterId);
    formData.append("routeShiftCode", payload.routeShiftCode);
    formData.append("routeSummaryRemark", payload.routeSummaryRemark);
    formData.append("routeSessionItemsJson", JSON.stringify(payload.routeSessionItems));
    formData.append("customActivityName", payload.customActivityName);
    formData.append("customActivityDescription", payload.customActivityDescription);
    formData.append("equipmentNo", payload.equipmentNo);
    formData.append("startTime", payload.startTime);
    formData.append("endTime", payload.endTime);
    formData.append("materialUsed", payload.materialUsed);

    const locationBlock = [
      payload.locationName ? `Lokasi: ${payload.locationName}` : null,
      payload.manualLocation ? `Fallback: ${payload.manualLocation}` : null,
      payload.boundaryMessage ? `Boundary: ${payload.boundaryMessage}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    formData.append(
      "notes",
      [locationBlock, payload.notes.trim()].filter(Boolean).join("\n"),
    );
    formData.append("gpsLat", payload.gpsLat);
    formData.append("gpsLng", payload.gpsLng);
    formData.append("gpsValid", String(payload.gpsValid));

    if (payload.photo) {
      const matches = payload.photo.dataUrl.match(/^data:(.+);base64,(.+)$/);
      if (!matches) {
        throw new Error("Activity photo payload is invalid.");
      }

      const [, mimeType, base64] = matches;
      const buffer = Buffer.from(base64, "base64");
      const file = new File([buffer], payload.photo.name || `activity-${Date.now()}.jpg`, {
        type: payload.photo.type || mimeType,
      });
      formData.append("photoFile", file);
    }

    await submitDailyActivityAction(formData);

    return NextResponse.json({
      success: true,
      message: "Activity synchronized successfully.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activity sync failed.";

    return NextResponse.json(
      {
        success: false,
        conflict:
          message.toLowerCase().includes("bertabrakan") ||
          message.toLowerCase().includes("sudah pernah"),
        message,
      },
      { status: 400 },
    );
  }
}
