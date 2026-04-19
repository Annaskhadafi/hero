import { and, desc, eq, gte, lte, ne, or, sql } from "drizzle-orm";

import { db } from "@/db";
import {
  activities,
  approvals,
  attendanceRecords,
  dailyReports,
  employees,
  hseIncidents,
  hseObservations,
  notificationChannelSettings,
  notificationDeliveries,
  notificationEvents,
  notificationPushSubscriptions,
  notificationUserPreferences,
  pointEvents,
  sites,
  timesheetEntries,
  trainingRecords,
  wellnessRecords,
} from "@/db/schema/hero";
import { ensureHeroSeedData } from "@/lib/hero-admin";

function startOfMonth(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth(), 1);
}

function endOfMonth(reference = new Date()) {
  return new Date(reference.getFullYear(), reference.getMonth() + 1, 0, 23, 59, 59, 999);
}

function minutesToHours(minutes: number) {
  return Number((minutes / 60).toFixed(1));
}

function minutesToHoursLabel(minutes: number) {
  return `${(minutes / 60).toFixed(1)} jam`;
}

type MobileReadOptions = {
  ensureSeed?: boolean;
};

const DEFAULT_MOBILE_NOTIFICATION_PREFERENCES = {
  pushEnabled: true,
  inAppEnabled: true,
  emailEnabled: true,
  approvalRequestsEnabled: true,
  shiftRemindersEnabled: true,
  hseAlertsEnabled: true,
  pointsUpdatesEnabled: true,
};

export async function getMobileEmployeeContext(
  email?: string | null,
  options: MobileReadOptions = {},
) {
  if (options.ensureSeed !== false) {
    await ensureHeroSeedData();
  }

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

export async function getMobileNotificationCount(email?: string | null) {
  if (!email) {
    return 0;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const recentWindowStart = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(notificationDeliveries)
    .where(
      and(
        sql`lower(${notificationDeliveries.recipient}) = ${normalizedEmail}`,
        ne(notificationDeliveries.status, "failed"),
        gte(notificationDeliveries.createdAt, recentWindowStart),
      ),
    );

  return row?.count ?? 0;
}

export async function getMobileNotificationSettings(email?: string | null) {
  if (!email) {
    return {
      preferences: null,
      pushPublicKey: "",
      pushConfigured: false,
      activeSubscriptions: 0,
    };
  }

  const normalizedEmail = email.trim().toLowerCase();

  const [employee] = await db
    .select({
      id: employees.id,
    })
    .from(employees)
    .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!employee) {
    return {
      preferences: null,
      pushPublicKey: "",
      pushConfigured: false,
      activeSubscriptions: 0,
    };
  }

  const [existingPreferences] = await db
    .select()
    .from(notificationUserPreferences)
    .where(eq(notificationUserPreferences.employeeId, employee.id))
    .limit(1);

  const preferences =
    existingPreferences ??
    (
      await db
        .insert(notificationUserPreferences)
        .values({
          employeeId: employee.id,
          ...DEFAULT_MOBILE_NOTIFICATION_PREFERENCES,
        })
        .onConflictDoNothing({
          target: notificationUserPreferences.employeeId,
        })
        .returning()
    )[0] ??
    (
      await db
        .select()
        .from(notificationUserPreferences)
        .where(eq(notificationUserPreferences.employeeId, employee.id))
        .limit(1)
    )[0] ??
    null;

  const [pushConfig, subscriptionCount] = await Promise.all([
    db
      .select()
      .from(notificationChannelSettings)
      .where(eq(notificationChannelSettings.channel, "pwa_push"))
      .limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(notificationPushSubscriptions)
      .where(
        and(
          eq(notificationPushSubscriptions.employeeId, employee.id),
          eq(notificationPushSubscriptions.isActive, true),
        ),
      ),
  ]);

  const pushSettings = pushConfig[0] ?? null;

  return {
    preferences,
    pushPublicKey: pushSettings?.vapidPublicKey ?? "",
    pushConfigured: Boolean(
      pushSettings?.isEnabled &&
        pushSettings.vapidPublicKey &&
        pushSettings.vapidPrivateKey &&
        pushSettings.pushSubject,
    ),
    activeSubscriptions: subscriptionCount[0]?.count ?? 0,
  };
}

export async function getMobileTimesheet(email?: string | null) {
  const context = await getMobileEmployeeContext(email, { ensureSeed: false });
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
  const context = await getMobileEmployeeContext(email, { ensureSeed: false });
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
  const context = await getMobileEmployeeContext(email, { ensureSeed: false });
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
  const context = await getMobileEmployeeContext(email, { ensureSeed: false });
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
  const context = await getMobileEmployeeContext(email, { ensureSeed: false });
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
  const [
    siteRows,
    activitiesCount,
    pendingApprovals,
    overtimeMinutes,
    lastReportRows,
    openObservations,
    activeEmployees,
    topPerformer,
    activityTrend,
  ] = await Promise.all([
    db.select().from(sites).limit(1),
    db.select({ count: sql<number>`count(*)::int` }).from(activities),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(approvals)
      .where(eq(approvals.status, "pending")),
    db.select({ total: sql<number>`coalesce(sum(${timesheetEntries.overtimeMinutes}),0)::int` }).from(timesheetEntries),
    db.select().from(dailyReports).orderBy(desc(dailyReports.reportDate)).limit(1),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(hseObservations)
      .where(eq(hseObservations.status, "open")),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(eq(employees.isActive, true)),
    db
      .select({
        name: employees.name,
        role: employees.role,
        totalPoints: employees.totalPoints,
      })
      .from(employees)
      .orderBy(desc(employees.totalPoints))
      .limit(1),
    db
      .select({
        status: activities.status,
        count: sql<number>`count(*)::int`,
      })
      .from(activities)
      .groupBy(activities.status),
  ]);

  const site = siteRows[0];
  const lastReport = lastReportRows[0];
  const overview = {
    site,
    metrics: [
      {
        label: "Submitted activities",
        value: `${activitiesCount[0]?.count ?? 0}`,
        meta: "Aktivitas masuk hari ini",
      },
      {
        label: "Pending approvals",
        value: `${pendingApprovals[0]?.count ?? 0}`,
        meta: "Approval L1 dan L2",
      },
      {
        label: "Overtime tracked",
        value: minutesToHoursLabel(overtimeMinutes[0]?.total ?? 0),
        meta: "Dari timesheet aktif",
      },
      {
        label: "Open HSE items",
        value: `${openObservations[0]?.count ?? 0}`,
        meta: "Observation yang belum close",
      },
      {
        label: "Active workforce",
        value: `${activeEmployees[0]?.count ?? 0}`,
        meta: "Karyawan aktif di site",
      },
      {
        label: "Last report",
        value: lastReport ? `${lastReport.readySections}/${lastReport.totalSections} sections` : "Belum ada",
        meta: "Kesiapan daily report",
      },
    ],
  };
  const highlights = {
    site,
    report: lastReport,
    topPerformer: topPerformer[0],
  };

  return { overview, highlights, activityTrend };
}
