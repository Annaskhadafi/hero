"use server";

import { db } from "@/db";
import { attendanceRecords, employees, sites } from "@/db/schema/hero";
import { uploadFile } from "@/app/actions/upload";
import { auth } from "@/lib/auth";
import { getActiveAttendanceShiftOptions } from "@/lib/master-data";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { headers } from "next/headers";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { endOfDay, startOfDay, subHours } from "date-fns";

async function getCurrentEmployee() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return null;
  }

  const [employee] = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      siteName: sites.name,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(
      session.user.id
        ? eq(employees.authUserId, session.user.id)
        : eq(employees.email, session.user.email),
    )
    .limit(1);

  if (employee) {
    return employee;
  }

  const [employeeByEmail] = await db
    .select({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
      siteName: sites.name,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.email, session.user.email))
    .limit(1);

  if (employeeByEmail) {
    if (!employeeByEmail.authUserId && session.user.id) {
      await db
        .update(employees)
        .set({ authUserId: session.user.id })
        .where(eq(employees.id, employeeByEmail.id));
    }

    return employeeByEmail;
  }

  const [defaultSite] = await db
    .select({
      id: sites.id,
      name: sites.name,
    })
    .from(sites)
    .limit(1);

  if (!defaultSite) {
    return null;
  }

  const [createdEmployee] = await db
    .insert(employees)
    .values({
      authUserId: session.user.id,
      siteId: defaultSite.id,
      name: session.user.name?.trim() || session.user.email.split("@")[0],
      email: session.user.email,
      role: "Site Team",
      department: "Operations",
      jobTitle: "Site Team",
      workLocation: defaultSite.name,
      accessRole: "Site Admin",
      employmentStatus: "active",
      isActive: true,
    })
    .returning({
      id: employees.id,
      authUserId: employees.authUserId,
      name: employees.name,
      email: employees.email,
      jobTitle: employees.jobTitle,
      workLocation: employees.workLocation,
      siteId: employees.siteId,
    });

  return createdEmployee
    ? {
        ...createdEmployee,
        siteName: defaultSite.name,
      }
    : null;
}

function buildLocationNote(
  locationName: string | null,
  latitude: string | null,
  longitude: string | null,
  fallbackLocation: string,
) {
  const resolvedLocationName = locationName?.trim();

  if (resolvedLocationName && resolvedLocationName !== "Lokasi GPS") {
    return resolvedLocationName;
  }

  if (latitude && longitude) {
    return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  }

  return locationName?.trim() || fallbackLocation || "Lokasi GPS";
}

function formatOvertimeLabel(minutes: number) {
  if (!Number.isFinite(minutes) || minutes <= 0) {
    return null;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  if (hours > 0 && remainingMinutes > 0) {
    return `${hours} jam ${remainingMinutes} menit`;
  }

  if (hours > 0) {
    return `${hours} jam`;
  }

  return `${remainingMinutes} menit`;
}

function getTrimmedFormValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function buildAttendanceNote(input: {
  locationNote: string;
  shiftLabel: string;
  shiftWindow: string;
  workMode: string;
  attendanceContext: string;
  overtimeMinutes: number;
  operationalNote: string;
}) {
  const details = [
    input.shiftLabel
      ? `Shift: ${input.shiftLabel}${input.shiftWindow ? ` (${input.shiftWindow})` : ""}`
      : null,
    input.workMode ? `Mode: ${input.workMode}` : null,
    input.attendanceContext ? `Kondisi: ${input.attendanceContext}` : null,
    formatOvertimeLabel(input.overtimeMinutes)
      ? `Lembur: ${formatOvertimeLabel(input.overtimeMinutes)}`
      : null,
    input.operationalNote ? `Catatan: ${input.operationalNote}` : null,
  ].filter(Boolean);

  return [input.locationNote, ...details].join(" | ");
}

function getAttendanceQueryWindow() {
  const now = new Date();

  return {
    start: subHours(startOfDay(now), 8),
    end: endOfDay(now),
  };
}

export async function getAttendancePageData() {
  const [employee, shiftOptions] = await Promise.all([
    getCurrentEmployee(),
    getActiveAttendanceShiftOptions(),
  ]);

  if (!employee) {
    return {
      success: false,
      employee: null,
      logs: [],
      shiftOptions,
    };
  }

  const attendanceWindow = getAttendanceQueryWindow();

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, attendanceWindow.start),
        lte(attendanceRecords.eventTime, attendanceWindow.end),
      ),
    )
    .orderBy(desc(attendanceRecords.eventTime));

  return {
    success: true,
    employee,
    logs,
    shiftOptions,
  };
}

export async function submitAttendance(formData: FormData) {
  try {
    const employee = await getCurrentEmployee();

    if (!employee) {
      return { success: false, error: "Unauthorized" };
    }

    const photoUrlResult = await uploadFile(formData);
    if (!photoUrlResult.success || !photoUrlResult.url) {
      return {
        success: false,
        error: photoUrlResult.error || "Upload foto ke Object Storage gagal.",
      };
    }
    const photoUrl = photoUrlResult.url;

    const eventType = formData.get("type") as string;
    if (eventType !== "checked-in" && eventType !== "checked-out") {
      return { success: false, error: "Tipe attendance tidak valid." };
    }

    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;
    const locationName = formData.get("locationName") as string | null;
    const baseLocationNote = buildLocationNote(locationName, latitude, longitude, employee.workLocation);
    const overtimeMinutes = Math.max(0, Number(getTrimmedFormValue(formData, "overtimeMinutes")) || 0);
    const shiftCode = getTrimmedFormValue(formData, "shiftCode");
    const activeShiftOptions = await getActiveAttendanceShiftOptions();
    const selectedShift = activeShiftOptions.find((shift) => shift.value === shiftCode);

    if (!selectedShift) {
      return { success: false, error: "Pilihan shift tidak tersedia. Hubungi admin Master Data." };
    }

    const locationNote = buildAttendanceNote({
      locationNote: baseLocationNote,
      shiftLabel: selectedShift.label,
      shiftWindow: selectedShift.window,
      workMode: getTrimmedFormValue(formData, "workMode"),
      attendanceContext: getTrimmedFormValue(formData, "attendanceContext"),
      overtimeMinutes,
      operationalNote: getTrimmedFormValue(formData, "operationalNote").slice(0, 160),
    });

    await db.insert(attendanceRecords).values({
      employeeId: employee.id,
      siteId: employee.siteId,
      eventType,
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
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to submit attendance",
    };
  }
}

export async function getTodayAttendanceLogs() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return { success: false, employee: null, logs: [] };
  }

  const attendanceWindow = getAttendanceQueryWindow();

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, attendanceWindow.start),
        lte(attendanceRecords.eventTime, attendanceWindow.end)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime));

  const logsWithPhotoPreview = await Promise.all(
    logs.map(async (log) => ({
      ...log,
      employeeName: employee.name,
      employeeEmail: employee.email,
      siteName: employee.siteName,
      workLocation: employee.workLocation,
      photoPreviewUrl: await getS3ObjectReadUrl(log.photoUrl),
    })),
  );

  return { success: true, employee, logs: logsWithPhotoPreview };
}
