import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  dailyActivitySessionItems,
  dailyActivitySessionSignoffs,
  dailyActivitySessions,
  employees,
  overtimeCommandLetters,
  sites,
} from "@/db/schema/hero";

function minutesBetween(start?: Date | null, end?: Date | null) {
  if (!start || !end || end <= start) {
    return 0;
  }

  return Math.round((end.getTime() - start.getTime()) / 60000);
}

function formatDurationLabel(totalMinutes: number) {
  if (totalMinutes <= 0) {
    return "-";
  }

  if (totalMinutes < 60) {
    return `${totalMinutes} menit`;
  }

  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes > 0 ? `${hours}j ${minutes}m` : `${hours} jam`;
}

export async function getDailyActivitySessionDocumentData(sessionId: number, email?: string | null) {
  if (!email) {
    return null;
  }

  const normalizedEmail = email.trim().toLowerCase();
  const [currentEmployee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
    })
    .from(employees)
    .where(sql`lower(${employees.email}) = ${normalizedEmail}`)
    .limit(1);

  if (!currentEmployee) {
    return null;
  }

  const [header] = await db
    .select({
      sessionId: dailyActivitySessions.id,
      sessionCode: dailyActivitySessions.sessionCode,
      workDate: dailyActivitySessions.workDate,
      shiftCode: dailyActivitySessions.shiftCode,
      status: dailyActivitySessions.status,
      summaryRemark: dailyActivitySessions.summaryRemark,
      submittedAt: dailyActivitySessions.submittedAt,
      employeeId: employees.id,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      employeeDepartment: employees.department,
      employeeSection: employees.section,
      employeeJobTitle: employees.jobTitle,
      siteId: sites.id,
      siteName: sites.name,
      customerName: sites.customerName,
      contractNumber: sites.contractNumber,
      splId: overtimeCommandLetters.id,
      splNumber: overtimeCommandLetters.splNumber,
      splTitle: overtimeCommandLetters.title,
      splPlannedStartAt: overtimeCommandLetters.plannedStartAt,
      splPlannedEndAt: overtimeCommandLetters.plannedEndAt,
    })
    .from(dailyActivitySessions)
    .innerJoin(employees, eq(dailyActivitySessions.employeeId, employees.id))
    .innerJoin(sites, eq(dailyActivitySessions.siteId, sites.id))
    .leftJoin(
      overtimeCommandLetters,
      eq(dailyActivitySessions.overtimeCommandLetterId, overtimeCommandLetters.id),
    )
    .where(eq(dailyActivitySessions.id, sessionId))
    .limit(1);

  if (!header) {
    return null;
  }

  if (header.employeeId !== currentEmployee.id || header.siteId !== currentEmployee.siteId) {
    return null;
  }

  const [itemRows, signoff] = await Promise.all([
    db
      .select({
        id: dailyActivitySessionItems.id,
        snapshotLabel: dailyActivitySessionItems.snapshotLabel,
        snapshotGroupName: dailyActivitySessionItems.snapshotGroupName,
        unitNumber: dailyActivitySessionItems.unitNumber,
        remark: dailyActivitySessionItems.remark,
        startedAt: dailyActivitySessionItems.startedAt,
        endedAt: dailyActivitySessionItems.endedAt,
        checkedAt: dailyActivitySessionItems.checkedAt,
        actualPoints: dailyActivitySessionItems.actualPoints,
        isChecked: dailyActivitySessionItems.isChecked,
        sortOrder: dailyActivitySessionItems.sortOrder,
      })
      .from(dailyActivitySessionItems)
      .where(eq(dailyActivitySessionItems.sessionId, sessionId))
      .orderBy(asc(dailyActivitySessionItems.sortOrder), asc(dailyActivitySessionItems.id)),
    db
      .select()
      .from(dailyActivitySessionSignoffs)
      .where(eq(dailyActivitySessionSignoffs.sessionId, sessionId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
  ]);

  const checkedItems = itemRows
    .filter((item) => item.isChecked)
    .map((item) => {
      const durationMinutes = minutesBetween(item.startedAt, item.endedAt);
      return {
        ...item,
        durationMinutes,
        durationLabel: formatDurationLabel(durationMinutes),
        dayLabel: header.workDate.toLocaleDateString("id-ID", { weekday: "long" }),
        dateLabel: header.workDate.toLocaleDateString("id-ID", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        }),
        startLabel: item.startedAt
          ? item.startedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "-",
        endLabel: item.endedAt
          ? item.endedAt.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
          : "-",
        workSummary: [item.snapshotLabel, item.unitNumber, item.remark].filter(Boolean).join(" - "),
      };
    });

  const totalDurationMinutes = checkedItems.reduce((total, item) => total + item.durationMinutes, 0);

  return {
    sessionId: header.sessionId,
    sessionCode: header.sessionCode,
    workDate: header.workDate,
    shiftCode: header.shiftCode,
    status: header.status,
    summaryRemark: header.summaryRemark,
    submittedAt: header.submittedAt,
    monthLabel: header.workDate.toLocaleDateString("id-ID", {
      month: "long",
      year: "numeric",
    }),
    employee: {
      id: header.employeeId,
      name: header.employeeName,
      employeeSn: header.employeeSn,
      department: header.employeeDepartment,
      section: header.employeeSection,
      jobTitle: header.employeeJobTitle,
    },
    site: {
      name: header.siteName,
      customerName: header.customerName,
      contractNumber: header.contractNumber,
    },
    spl:
      header.splId == null
        ? null
        : {
            id: header.splId,
            splNumber: header.splNumber,
            title: header.splTitle,
            plannedStartAt: header.splPlannedStartAt,
            plannedEndAt: header.splPlannedEndAt,
          },
    items: checkedItems,
    totals: {
      itemCount: checkedItems.length,
      totalPoints: checkedItems.reduce((total, item) => total + item.actualPoints, 0),
      totalDurationMinutes,
      totalDurationLabel: formatDurationLabel(totalDurationMinutes),
    },
    signoff: {
      employeeSignerName: signoff?.employeeSignerName ?? "",
      employeeSignatureUrl: signoff?.employeeSignatureUrl ?? "",
      employeeSignedAt: signoff?.employeeSignedAt ?? null,
      customerSignerName: signoff?.customerSignerName ?? "",
      customerSignatureUrl: signoff?.customerSignatureUrl ?? "",
      customerSignedAt: signoff?.customerSignedAt ?? null,
      hrCheckerName: signoff?.hrCheckerName ?? "",
      hrChecklistStatus: signoff?.hrChecklistStatus ?? "pending",
      hrChecklistNote: signoff?.hrChecklistNote ?? "",
      hrSignatureUrl: signoff?.hrSignatureUrl ?? "",
      hrCheckedAt: signoff?.hrCheckedAt ?? null,
    },
  };
}
