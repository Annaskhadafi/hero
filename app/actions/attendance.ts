"use server";

import { db } from "@/db";
import { attendanceRecords } from "@/db/schema/hero";
import { uploadFile } from "@/app/actions/upload";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

export async function submitAttendance(formData: FormData) {
  try {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" };
    }

    // In a real scenario we'd do a look up to hero_employees
    // For now we assume employeeId = 1 or something but we should get it properly
    // This is boilerplate, we can leave employeeId as placeholder 1 or fetch it
    const employeeId = 1; // TO-DO: get correct employee ID from users lookup
    const siteId = 1; // TO-DO: get correct site ID for user

    const photoUrlResult = await uploadFile(formData);
    let photoUrl = "";
    if (photoUrlResult.success) {
      photoUrl = photoUrlResult.url!;
    }

    const eventType = formData.get("type") as string;
    const latitude = formData.get("latitude") as string;
    const longitude = formData.get("longitude") as string;
    const locationNote = formData.get("locationName") as string || "Site Operation";

    await db.insert(attendanceRecords).values({
      employeeId,
      siteId,
      eventType, // "checked-in" or "checked-out"
      eventTime: new Date(),
      status: "pending",
      locationNote,
      photoUrl,
      latitude,
      longitude,
    });

    return { success: true };
  } catch (err) {
    console.error("Attendance submission error:", err);
    return { success: false, error: "Failed to submit attendance" };
  }
}

export async function getTodayAttendanceLogs() {
  const session = await auth.api.getSession({
    headers: await headers()
  });

  if (!session || !session.user) {
    return { success: false, logs: [] };
  }

  const employeeId = 1; 

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        gte(attendanceRecords.eventTime, todayStart),
        lte(attendanceRecords.eventTime, todayEnd)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime));

  return { success: true, logs };
}
