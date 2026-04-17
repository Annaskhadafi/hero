"use server";

import { db } from "@/db";
import { attendanceRecords, employees, sites } from "@/db/schema/hero";
import { uploadFile } from "@/app/actions/upload";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { eq, and, gte, lte, desc } from "drizzle-orm";
import { startOfDay, endOfDay } from "date-fns";

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
  if (latitude && longitude) {
    return `${Number(latitude).toFixed(5)}, ${Number(longitude).toFixed(5)}`;
  }

  return locationName?.trim() || fallbackLocation || "Lokasi GPS";
}

export async function getAttendancePageData() {
  const employee = await getCurrentEmployee();

  if (!employee) {
    return {
      success: false,
      employee: null,
      logs: [],
    };
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, todayStart),
        lte(attendanceRecords.eventTime, todayEnd),
      ),
    )
    .orderBy(desc(attendanceRecords.eventTime));

  return {
    success: true,
    employee,
    logs,
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
    const latitude = formData.get("latitude") as string | null;
    const longitude = formData.get("longitude") as string | null;
    const locationName = formData.get("locationName") as string | null;
    const locationNote = buildLocationNote(locationName, latitude, longitude, employee.workLocation);

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
    return { success: false, logs: [] };
  }

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const logs = await db
    .select()
    .from(attendanceRecords)
    .where(
      and(
        eq(attendanceRecords.employeeId, employee.id),
        gte(attendanceRecords.eventTime, todayStart),
        lte(attendanceRecords.eventTime, todayEnd)
      )
    )
    .orderBy(desc(attendanceRecords.eventTime));

  return { success: true, logs };
}
