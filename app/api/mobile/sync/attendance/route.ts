import { NextResponse } from "next/server";

import { submitAttendance } from "@/app/actions/attendance";
import {
  attendanceSyncPayloadSchema,
  parseOfflineSyncPayload,
  type AttendanceSyncPayload,
} from "@/lib/offline-sync";

export async function POST(request: Request) {
  try {
    const payload = parseOfflineSyncPayload<AttendanceSyncPayload>(
      attendanceSyncPayloadSchema,
      await request.json(),
    );
    const formData = new FormData();

    if (!payload.photo) {
      throw new Error("Foto attendance wajib ada.");
    }

    const matches = payload.photo.dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!matches) {
      throw new Error("Payload foto attendance tidak valid.");
    }

    const [, mimeType, base64] = matches;
    const buffer = Buffer.from(base64, "base64");
    const file = new File([buffer], payload.photo.name || `attendance-${Date.now()}.jpg`, {
      type: payload.photo.type || mimeType,
    });

    formData.append("file", file);
    formData.append("uploadTarget", "attendance");
    formData.append("clientRequestId", payload.clientRequestId ?? "");
    formData.append("type", payload.type);
    formData.append("latitude", payload.latitude);
    formData.append("longitude", payload.longitude);
    formData.append("locationName", payload.locationName);
    formData.append("shiftCode", payload.shiftCode);
    formData.append("workMode", payload.workMode);
    formData.append("attendanceContext", payload.attendanceContext);
    formData.append("overtimeMinutes", payload.overtimeMinutes);
    formData.append("operationalNote", payload.operationalNote);

    const result = await submitAttendance(formData);

    if (!result.success) {
      return NextResponse.json(
        {
          success: false,
          message: result.error || "Sync attendance gagal.",
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Attendance berhasil disinkronkan.",
      record: result.record ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync attendance gagal.";

    return NextResponse.json(
      {
        success: false,
        message,
      },
      { status: 400 },
    );
  }
}
