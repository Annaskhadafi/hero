import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activities,
  attendanceRecords,
  dailyReports,
  employees,
  hseIncidents,
  hseObservations,
  notificationDeliveries,
  notificationEvents,
  pointEvents,
  sites,
  timesheetEntries,
  trainingRecords,
  wellnessRecords,
} from "@/db/schema/hero";
import { getDashboardOverview, getExecutiveHighlights, ensureHeroSeedData } from "@/lib/hero-admin";

function startOfMonth(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function endOfMonth(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
}

function minutesToHours(minutes: number) {
  return Number((minutes / 60).toFixed(1));
}

export async function getMobileEmployeeContext(email?: string | null) {
  await ensureHeroSeedData();

  if (!email) {
    return null;
  }

  const [row] = await db
    .select({
      employee: employees,
      site: sites,
    })
    .from(employees)
    .innerJoin(sites, eq(employees.siteId, sites.id))
    .where(sql`lower(${employees.email}) = ${email.trim().toLowerCase()}`)
    .limit(1);

  return row ?? null;
}

export async function getMobileNotifications(email?: string | null) {
  await ensureHeroSeedData();

  if (!email) {
    return [];
  }

  const normalizedEmail = email.trim().toLowerCase();

  return db
    .select({
      id: notificationDeliveries.id,
      channel: notificationDeliveries.deliveryChannel,
      recipient: notificationDeliveries.recipient,
      status: notificationDeliveries.status,
      eventType: notificationEvents.eventType,
      deliveryStatus: notificationEvents.deliveryStatus,
      payloadSnapshot: notificationEvents.payloadSnapshot,
      createdAt: notificationDeliveries.createdAt,
      sentAt: notificationDeliveries.sentAt,
      errorMessage: notificationDeliveries.errorMessage,
    })
    .from(notificationDeliveries)
    .leftJoin(notificationEvents, eq(notificationDeliveries.notificationEventId, notificationEvents.id))
    .where(sql`lower(${notificationDeliveries.recipient}) = ${normalizedEmail}`)
    .orderBy(desc(notificationDeliveries.createdAt))
    .limit(30);
}

export async function getMobileTimesheet(email?: string | null) {
  const context = await getMobileEmployeeContext(email);
  if (!context) {
    return null;
  }

  const rows = await db
    .select()
    .from(timesheetEntries)
    .where(eq(timesheetEntries.employeeId, context.employee.id))
    .orderBy(desc(timesheetEntries.updatedAt))
    .limit(12);

  const totals = rows.reduce(
    (acc, row) => ({
      regularMinutes: acc.regularMinutes + row.regularMinutes,
      overtimeMinutes: acc.overtimeMinutes + row.overtimeMinutes,
      overtimeAmount: acc.overtimeAmount + row.overtimeAmount,
    }),
    { regularMinutes: 0, overtimeMinutes: 0, overtimeAmount: 0 },
  );

  return {
    context,
    rows: rows.map((row) => ({
      ...row,
      regularHours: minutesToHours(row.regularMinutes),
      overtimeHours: minutesToHours(row.overtimeMinutes),
    })),
    totals: {
      regularHours: minutesToHours(totals.regularMinutes),
      overtimeHours: minutesToHours(totals.overtimeMinutes),
      overtimeAmount: totals.overtimeAmount,
    },
  };
}

export async function getMobileReports(email?: string | null) {
  const context = await getMobileEmployeeContext(email);
  if (!context) {
    return null;
  }

  const reports = await db
    .select()
    .from(dailyReports)
    .where(eq(dailyReports.siteId, context.employee.siteId))
    .orderBy(desc(dailyReports.reportDate))
    .limit(12);

  const chartSeries = [...reports]
    .reverse()
    .map((report) => ({
      label: report.reportDate.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      readiness: Math.round((report.readySections / Math.max(1, report.totalSections)) * 100),
      jobsCompleted: report.jobsCompleted,
      manpowerPresent: report.manpowerPresent,
    }));

  return { context, reports, chartSeries };
}

export async function getMobileHse(email?: string | null) {
  const context = await getMobileEmployeeContext(email);
  if (!context) {
    return null;
  }

  const [observations, incidents] = await Promise.all([
    db
      .select()
      .from(hseObservations)
      .where(
        or(
          eq(hseObservations.employeeId, context.employee.id),
          eq(hseObservations.siteId, context.employee.siteId),
        ),
      )
      .orderBy(desc(hseObservations.observedAt))
      .limit(12),
    db
      .select()
      .from(hseIncidents)
      .where(eq(hseIncidents.siteId, context.employee.siteId))
      .orderBy(desc(hseIncidents.reportedAt))
      .limit(12),
  ]);

  return { context, observations, incidents };
}

export async function getMobileHc(email?: string | null) {
  const context = await getMobileEmployeeContext(email);
  if (!context) {
    return null;
  }

  const monthStart = startOfMonth();
  const monthEnd = endOfMonth();

  const [attendance, trainings, wellness] = await Promise.all([
    db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, context.employee.id),
          gte(attendanceRecords.eventTime, monthStart),
          lte(attendanceRecords.eventTime, monthEnd),
        ),
      )
      .orderBy(desc(attendanceRecords.eventTime))
      .limit(20),
    db
      .select()
      .from(trainingRecords)
      .where(eq(trainingRecords.employeeId, context.employee.id))
      .orderBy(trainingRecords.expiresAt)
      .limit(12),
    db
      .select()
      .from(wellnessRecords)
      .where(eq(wellnessRecords.employeeId, context.employee.id))
      .orderBy(desc(wellnessRecords.recordedAt))
      .limit(12),
  ]);

  const presentDays = new Set(
    attendance
      .filter((record) => record.status.toLowerCase().includes("present") || record.status.toLowerCase().includes("valid"))
      .map((record) => record.eventTime.toISOString().slice(0, 10)),
  ).size;

  return {
    context,
    attendance,
    trainings,
    wellness,
    reliability: Math.min(100, Math.round((presentDays / Math.max(1, new Date().getDate())) * 100)),
  };
}

export async function getMobileGamification(email?: string | null) {
  const context = await getMobileEmployeeContext(email);
  if (!context) {
    return null;
  }

  const [leaderboard, events] = await Promise.all([
    db
      .select({
        id: employees.id,
        name: employees.name,
        role: employees.role,
        department: employees.department,
        levelName: employees.levelName,
        totalPoints: employees.totalPoints,
      })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(desc(employees.totalPoints))
      .limit(20),
    db
      .select()
      .from(pointEvents)
      .where(eq(pointEvents.employeeId, context.employee.id))
      .orderBy(desc(pointEvents.createdAt))
      .limit(20),
  ]);

  const rank = leaderboard.findIndex((employee) => employee.id === context.employee.id) + 1;
  const weeklyPoints = [...events]
    .reverse()
    .slice(-7)
    .map((event) => ({
      label: event.createdAt.toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
      }),
      points: event.points,
    }));
  const pointsDelta = events.slice(0, 5).reduce((sum, event) => sum + event.points, 0);

  return {
    context,
    leaderboard,
    events,
    rank: rank > 0 ? rank : null,
    weeklyPoints,
    pointsDelta,
  };
}

export async function getMobileExecutive() {
  const [overview, highlights, activityTrend] = await Promise.all([
    getDashboardOverview(),
    getExecutiveHighlights(),
    db
      .select({
        status: activities.status,
        count: sql<number>`count(*)::int`,
      })
      .from(activities)
      .groupBy(activities.status),
  ]);

  return { overview, highlights, activityTrend };
}
