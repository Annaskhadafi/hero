"use server";

import { and, desc, eq, gte, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import {
  activities,
  activityLibraries,
  activityModifiers,
  activityPhotos,
  approvals,
  dailyActivityConfigs,
  employees,
  jobAssignments,
  penaltyEvents,
  pointDisputes,
  pointEvents,
  streakRecords,
} from "@/db/schema/hero";
import {
  DAILY_ACTIVITY_REVALIDATE_PATHS,
  ensureDailyActivitySeedData,
  getDailyActivityConfigMap,
} from "@/lib/daily-activity";

const optionalPositiveInt = z.preprocess(
  (value) => {
    if (value === "" || value == null || value === "0") {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().positive().optional(),
);

const formBoolean = (defaultValue = false) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return defaultValue;
    }

    if (typeof value === "string") {
      return value === "true" || value === "on";
    }

    return Boolean(value);
  }, z.boolean());

const manageLibrarySchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  activityCode: z.string().trim().min(2).max(24).optional().default(""),
  activityName: z.string().trim().min(3).max(160).optional().default(""),
  category: z.string().trim().min(3).max(50).optional().default("Technical"),
  departmentId: optionalPositiveInt,
  sectionId: optionalPositiveInt,
  basePoints: z.coerce.number().int().min(0).max(500).optional().default(5),
  complexityLevel: z.coerce.number().int().min(1).max(5).optional().default(1),
  maxDailyCount: z.coerce.number().int().min(1).max(20).optional().default(3),
  maxPointsPerDay: z.coerce.number().int().min(1).max(1000).optional().default(50),
  slaHours: z.coerce.number().int().min(1).max(240).optional().default(24),
  requiresPhoto: formBoolean(false),
  requiresEquipmentNo: formBoolean(false),
  requiresDuration: formBoolean(true),
  requiresLocationGps: formBoolean(false),
  requiresMaterialUsed: formBoolean(false),
  isAssignable: formBoolean(true),
  isSelfInput: formBoolean(true),
  approvalRequired: formBoolean(true),
  autoApproveIfGpsValid: formBoolean(false),
  isActive: formBoolean(true),
  createdByEmployeeId: optionalPositiveInt,
});

const manageAssignmentSchema = z.object({
  intent: z.enum(["create", "update-status", "delete"]),
  id: optionalPositiveInt,
  assignedByEmployeeId: z.coerce.number().int().positive().optional(),
  assignedToEmployeeId: z.coerce.number().int().positive().optional(),
  siteId: z.coerce.number().int().positive().optional(),
  libraryActivityId: optionalPositiveInt,
  customJobName: z.string().trim().max(160).optional().default(""),
  priority: z.string().trim().min(3).max(40).optional().default("Normal"),
  estimatedDuration: z.coerce.number().int().min(5).max(720).optional().default(60),
  notes: z.string().trim().max(1000).optional().default(""),
  assignmentType: z.string().trim().min(3).max(40).optional().default("individual"),
  assignedDate: z.string().trim().optional().default(""),
  deadline: z.string().trim().optional().default(""),
  status: z.string().trim().min(3).max(40).optional().default("NOT_STARTED"),
  isMandatory: formBoolean(false),
  isRecurring: formBoolean(false),
  recurrenceRule: z.string().trim().max(160).optional().default(""),
});

const submitActivitySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  assignmentId: optionalPositiveInt,
  libraryActivityId: optionalPositiveInt,
  sourceMode: z.enum(["assigned", "self_input", "custom"]).optional().default("self_input"),
  customActivityName: z.string().trim().max(160).optional().default(""),
  customActivityDescription: z.string().trim().max(1200).optional().default(""),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  equipmentNo: z.string().trim().max(80).optional().default(""),
  materialUsed: z.string().trim().max(500).optional().default(""),
  notes: z.string().trim().max(1200).optional().default(""),
  gpsLat: z.string().trim().max(80).optional().default(""),
  gpsLng: z.string().trim().max(80).optional().default(""),
  gpsValid: formBoolean(false),
  photoUrl: z.string().trim().max(1000).optional().default(""),
});

const updateConfigSchema = z.object({
  id: z.coerce.number().int().positive(),
  configValue: z.string().trim().min(1).max(160),
  isActive: formBoolean(true),
});

const manageModifierSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveInt,
  siteId: optionalPositiveInt,
  createdByEmployeeId: optionalPositiveInt,
  eventName: z.string().trim().min(3).max(160).optional().default(""),
  description: z.string().trim().max(600).optional().default(""),
  multiplier: z.coerce.number().int().min(100).max(500).optional().default(100),
  startDate: z.string().trim().optional().default(""),
  endDate: z.string().trim().optional().default(""),
  isActive: formBoolean(true),
});

const submitDisputeSchema = z.object({
  penaltyEventId: z.coerce.number().int().positive(),
  employeeId: z.coerce.number().int().positive(),
  reason: z.string().trim().min(20).max(1200),
  evidenceUrls: z.string().trim().max(4000).optional().default(""),
});

const resolveDisputeSchema = z.object({
  disputeId: z.coerce.number().int().positive(),
  resolvedByEmployeeId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "rejected"]),
  resolutionNotes: z.string().trim().min(5).max(1200),
});

function revalidateDailyActivitySurfaces() {
  for (const path of DAILY_ACTIVITY_REVALIDATE_PATHS) {
    revalidatePath(path);
  }
}

function normalizeEvidenceUrls(value: string) {
  if (value.trim().length === 0) {
    return JSON.stringify([]);
  }

  const urls = value
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 5);

  return JSON.stringify(urls);
}

function parseDateTime(value: string, label: string) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error(`${label} tidak valid.`);
  }

  return parsed;
}

function startOfDay(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
}

function endOfDay(reference: Date) {
  return new Date(reference.getFullYear(), reference.getMonth(), reference.getDate(), 23, 59, 59, 999);
}

function getSubmissionCategory(submissionTime: Date, activityEndTime: Date) {
  const sameDay =
    submissionTime.getFullYear() === activityEndTime.getFullYear() &&
    submissionTime.getMonth() === activityEndTime.getMonth() &&
    submissionTime.getDate() === activityEndTime.getDate();

  if (!sameDay) {
    return "backdated";
  }

  const minutes = submissionTime.getHours() * 60 + submissionTime.getMinutes();
  if (minutes <= 12 * 60) {
    return "on_time_morning";
  }
  if (minutes <= 17 * 60) {
    return "on_time";
  }
  if (minutes <= 20 * 60) {
    return "late_minor";
  }

  return "late_major";
}

function getPenaltyPoints(category: string, configMap: Map<string, number>) {
  switch (category) {
    case "late_minor":
      return Math.abs(configMap.get("penalty_pen_02") ?? -2);
    case "late_major":
      return Math.abs(configMap.get("penalty_pen_03") ?? -5);
    case "backdated":
      return 10;
    default:
      return 0;
  }
}

async function resolveApprover(employeeId: number, assignmentId?: number) {
  if (assignmentId) {
    const [assignment] = await db
      .select({
        assignedByEmployeeId: jobAssignments.assignedByEmployeeId,
      })
      .from(jobAssignments)
      .where(eq(jobAssignments.id, assignmentId))
      .limit(1);

    if (assignment?.assignedByEmployeeId) {
      const [approver] = await db
        .select({
          id: employees.id,
          name: employees.name,
        })
        .from(employees)
        .where(eq(employees.id, assignment.assignedByEmployeeId))
        .limit(1);

      if (approver) {
        return approver;
      }
    }
  }

  const [employee] = await db
    .select({
      directManagerId: employees.directManagerId,
      siteId: employees.siteId,
      department: employees.department,
    })
    .from(employees)
    .where(eq(employees.id, employeeId))
    .limit(1);

  if (!employee) {
    return null;
  }

  if (employee.directManagerId) {
    const [directManager] = await db
      .select({
        id: employees.id,
        name: employees.name,
      })
      .from(employees)
      .where(eq(employees.id, employee.directManagerId))
      .limit(1);

    if (directManager) {
      return directManager;
    }
  }

  const [fallbackApprover] = await db
    .select({
      id: employees.id,
      name: employees.name,
    })
    .from(employees)
    .where(
      and(
        eq(employees.siteId, employee.siteId),
        eq(employees.isActive, true),
        or(
          sql`lower(${employees.role}) like '%foreman%'`,
          sql`lower(${employees.role}) like '%leader%'`,
          sql`lower(${employees.accessRole}) like '%admin%'`,
        ),
      ),
    )
    .orderBy(desc(employees.id))
    .limit(1);

  return fallbackApprover ?? null;
}

async function updateStreakForEmployee(employeeId: number, activityDate: Date) {
  const [existing] = await db
    .select()
    .from(streakRecords)
    .where(eq(streakRecords.employeeId, employeeId))
    .limit(1);

  if (!existing) {
    await db.insert(streakRecords).values({
      employeeId,
      streakStartDate: activityDate,
      currentStreakDays: 1,
      longestStreakDays: 1,
      lastActivityDate: activityDate,
      streakBonusActive: false,
      updatedAt: new Date(),
    });

    return;
  }

  const lastDate = existing.lastActivityDate ? startOfDay(existing.lastActivityDate) : null;
  const currentDate = startOfDay(activityDate);
  const diffDays =
    lastDate == null ? 0 : Math.round((currentDate.getTime() - lastDate.getTime()) / (24 * 60 * 60 * 1000));
  const currentStreak =
    diffDays <= 0 ? existing.currentStreakDays : diffDays === 1 ? existing.currentStreakDays + 1 : 1;
  const longestStreak = Math.max(existing.longestStreakDays, currentStreak);

  await db
    .update(streakRecords)
    .set({
      currentStreakDays: currentStreak,
      longestStreakDays: longestStreak,
      lastActivityDate: activityDate,
      streakBonusActive: currentStreak >= 5,
      updatedAt: new Date(),
    })
    .where(eq(streakRecords.id, existing.id));
}

export async function manageActivityLibraryAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageLibrarySchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Library activity tidak valid.");
    }

    await db.delete(activityLibraries).where(eq(activityLibraries.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  const values = {
    activityCode: payload.activityCode,
    activityName: payload.activityName,
    category: payload.category,
    departmentId: payload.departmentId ?? null,
    sectionId: payload.sectionId ?? null,
    basePoints: payload.basePoints,
    complexityLevel: payload.complexityLevel,
    requiresPhoto: payload.requiresPhoto,
    requiresEquipmentNo: payload.requiresEquipmentNo,
    requiresDuration: payload.requiresDuration,
    requiresLocationGps: payload.requiresLocationGps,
    requiresMaterialUsed: payload.requiresMaterialUsed,
    maxDailyCount: payload.maxDailyCount,
    maxPointsPerDay: payload.maxPointsPerDay,
    isAssignable: payload.isAssignable,
    isSelfInput: payload.isSelfInput,
    approvalRequired: payload.approvalRequired,
    autoApproveIfGpsValid: payload.autoApproveIfGpsValid,
    slaHours: payload.slaHours,
    isActive: payload.isActive,
    createdByEmployeeId: payload.createdByEmployeeId ?? null,
    updatedAt: new Date(),
  };

  if (payload.intent === "create") {
    await db.insert(activityLibraries).values({
      ...values,
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Library activity tidak valid.");
    }

    await db.update(activityLibraries).set(values).where(eq(activityLibraries.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function manageJobAssignmentAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageAssignmentSchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Assignment tidak valid.");
    }

    await db.delete(jobAssignments).where(eq(jobAssignments.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  if (payload.intent === "update-status") {
    if (!payload.id) {
      throw new Error("Assignment tidak valid.");
    }

    await db
      .update(jobAssignments)
      .set({
        status: payload.status,
        updatedAt: new Date(),
      })
      .where(eq(jobAssignments.id, payload.id));

    revalidateDailyActivitySurfaces();
    return;
  }

  if (!payload.assignedByEmployeeId || !payload.assignedToEmployeeId || !payload.siteId) {
    throw new Error("Assignment harus memiliki assigner, assignee, dan site.");
  }

  await db.insert(jobAssignments).values({
    assignedByEmployeeId: payload.assignedByEmployeeId,
    assignedToEmployeeId: payload.assignedToEmployeeId,
    siteId: payload.siteId,
    libraryActivityId: payload.libraryActivityId ?? null,
    customJobName: payload.customJobName,
    priority: payload.priority,
    estimatedDuration: payload.estimatedDuration,
    notes: payload.notes,
    assignmentType: payload.assignmentType,
    assignedDate: payload.assignedDate
      ? parseDateTime(payload.assignedDate, "Tanggal assignment")
      : new Date(),
    deadline: payload.deadline ? parseDateTime(payload.deadline, "Deadline") : null,
    status: payload.status,
    isMandatory: payload.isMandatory,
    isRecurring: payload.isRecurring,
    recurrenceRule: payload.recurrenceRule,
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  revalidateDailyActivitySurfaces();
}

export async function submitDailyActivityAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = submitActivitySchema.parse(Object.fromEntries(formData));
  const [employee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      totalPoints: employees.totalPoints,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .where(eq(employees.id, payload.employeeId))
    .limit(1);

  if (!employee) {
    throw new Error("Karyawan tidak ditemukan.");
  }

  const startTime = parseDateTime(payload.startTime, "Waktu mulai");
  const endTime = parseDateTime(payload.endTime, "Waktu selesai");
  if (endTime <= startTime) {
    throw new Error("Waktu selesai harus setelah waktu mulai.");
  }

  const [existingOverlap] = await db
    .select({
      id: activities.id,
      title: activities.title,
    })
    .from(activities)
    .where(
      and(
        eq(activities.employeeId, payload.employeeId),
        sql`${activities.startTime} < ${endTime} and ${activities.endTime} > ${startTime}`,
      ),
    )
    .orderBy(desc(activities.startTime))
    .limit(1);

  if (existingOverlap) {
    throw new Error(`Waktu bertabrakan dengan aktivitas ${existingOverlap.title}.`);
  }

  if (payload.assignmentId) {
    const [assignmentActivity] = await db
      .select({ id: activities.id })
      .from(activities)
      .where(eq(activities.assignmentId, payload.assignmentId))
      .limit(1);

    if (assignmentActivity) {
      throw new Error("Assignment ini sudah pernah disubmit.");
    }
  }

  const [selectedAssignment] =
    payload.assignmentId == null
      ? [null]
      : await db
          .select({
            id: jobAssignments.id,
            priority: jobAssignments.priority,
          })
          .from(jobAssignments)
          .where(eq(jobAssignments.id, payload.assignmentId))
          .limit(1);

  const [library] =
    payload.libraryActivityId == null
      ? [null]
      : await db
          .select()
          .from(activityLibraries)
          .where(eq(activityLibraries.id, payload.libraryActivityId))
          .limit(1);

  if (payload.sourceMode !== "custom" && !library) {
    throw new Error("Aktivitas library belum dipilih.");
  }

  if (payload.sourceMode === "custom" && payload.customActivityDescription.trim().length < 80) {
    throw new Error("Deskripsi custom activity minimal 80 karakter.");
  }

  const dayStart = startOfDay(startTime);
  const dayEnd = endOfDay(startTime);
  const configMap = await getDailyActivityConfigMap();

  if (payload.sourceMode === "custom") {
    const [customCount] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(activities)
      .where(
        and(
          eq(activities.employeeId, payload.employeeId),
          eq(activities.sourceMode, "custom"),
          gte(activities.startTime, dayStart),
          lte(activities.startTime, dayEnd),
        ),
      );

    const customLimit = configMap.get("custom_activity_daily_limit") || 3;
    if ((customCount?.count ?? 0) >= customLimit) {
      throw new Error(`Batas custom activity per hari adalah ${customLimit}.`);
    }
  }

  const submissionTime = new Date();
  const submissionCategory = getSubmissionCategory(submissionTime, endTime);
  const penaltyPoints = getPenaltyPoints(submissionCategory, configMap);

  const [activeModifier] = await db
    .select()
    .from(activityModifiers)
    .where(
      and(
        eq(activityModifiers.isActive, true),
        lte(activityModifiers.startDate, submissionTime),
        or(gte(activityModifiers.endDate, submissionTime), sql`${activityModifiers.endDate} is null`),
      ),
    )
    .orderBy(desc(activityModifiers.multiplier))
    .limit(1);

  const basePoints =
    payload.sourceMode === "custom"
      ? 0
      : library?.basePoints ?? 0;
  const modifierMultiplier = activeModifier?.multiplier ?? 100;
  const multiplierBonus = Math.round((basePoints * Math.max(0, modifierMultiplier - 100)) / 100);
  const morningBonus = submissionCategory === "on_time_morning" ? 5 : 0;
  const projectedReward = submissionCategory === "backdated" ? 0 : basePoints + multiplierBonus + morningBonus;
  const projectedNet = projectedReward - penaltyPoints;
  const autoApprove =
    Boolean(library?.autoApproveIfGpsValid) &&
    payload.gpsValid &&
    payload.sourceMode !== "custom";
  const needsApproval = payload.sourceMode === "custom" || library?.approvalRequired !== false;
  const activityStatus = autoApprove ? "Approved" : needsApproval ? "Pending L1" : "Approved";
  const pointsAwarded = Math.max(projectedReward, 0);

  let createdActivityId: number | null = null;

  await db.transaction(async (tx) => {
    const [createdActivity] = await tx
      .insert(activities)
      .values({
        siteId: employee.siteId,
        employeeId: payload.employeeId,
        activityCode: library?.activityCode ?? "CUS-001",
        activityType: library?.category ?? "Custom",
        title: library?.activityName ?? payload.customActivityName,
        unitNumber: payload.equipmentNo || "-",
        libraryActivityId: payload.libraryActivityId ?? null,
        assignmentId: payload.assignmentId ?? null,
        sourceMode: payload.sourceMode,
        customActivityName: payload.customActivityName,
        customActivityDescription: payload.customActivityDescription,
        startTime,
        endTime,
        status: activityStatus,
        priority: selectedAssignment?.priority ?? (payload.sourceMode === "assigned" ? "High" : "Normal"),
        submissionTime,
        submissionCategory,
        equipmentNo: payload.equipmentNo,
        materialUsed: payload.materialUsed,
        gpsLat: payload.gpsLat,
        gpsLng: payload.gpsLng,
        gpsValid: payload.gpsValid,
        photoCount: payload.photoUrl ? 1 : 0,
        remarks: payload.notes,
        pointsAwarded,
        penaltyDeducted: penaltyPoints,
        createdAt: startTime,
      })
      .returning({ id: activities.id });

    createdActivityId = createdActivity.id;

    if (payload.photoUrl) {
      await tx.insert(activityPhotos).values({
        activityId: createdActivity.id,
        fileUrl: payload.photoUrl,
        caption: "Upload dokumentasi lapangan",
        uploadedAt: submissionTime,
      });
    }

    if (payload.assignmentId) {
      await tx
        .update(jobAssignments)
        .set({
          status: autoApprove ? "APPROVED" : "SUBMITTED",
          updatedAt: new Date(),
        })
        .where(eq(jobAssignments.id, payload.assignmentId));
    }

    if (penaltyPoints > 0) {
      await tx.insert(penaltyEvents).values({
        employeeId: payload.employeeId,
        siteId: employee.siteId,
        activityId: createdActivity.id,
        penaltyCode:
          submissionCategory === "late_minor"
            ? "PEN-02"
            : submissionCategory === "late_major"
              ? "PEN-03"
              : "PEN-01",
        penaltyType: submissionCategory,
        referenceDate: submissionTime,
        pointsDeducted: penaltyPoints,
        description: `Penalty otomatis karena submission ${submissionCategory}.`,
        isDisputed: false,
        disputeStatus: "none",
        createdAt: submissionTime,
      });
    }

    if (autoApprove || !needsApproval) {
      const updatedBalance = Math.max(0, employee.totalPoints + projectedNet);

      await tx.insert(pointEvents).values({
        employeeId: payload.employeeId,
        transactionType: projectedNet >= 0 ? "reward" : "penalty",
        sourceType: "activity",
        sourceId: createdActivity.id,
        category: "Daily Activity",
        label: `${library?.activityName ?? payload.customActivityName} • Auto approved`,
        points: projectedNet,
        balanceAfter: updatedBalance,
        metadata: JSON.stringify({
          submissionCategory,
          modifierMultiplier,
          morningBonus,
          penaltyPoints,
        }),
        createdAt: submissionTime,
      });

      await tx
        .update(employees)
        .set({
          totalPoints: updatedBalance,
        })
        .where(eq(employees.id, payload.employeeId));
    } else {
      const approver = await resolveApprover(payload.employeeId, payload.assignmentId);

      if (approver) {
        await tx.insert(approvals).values({
          activityId: createdActivity.id,
          level: 1,
          approverName: approver.name,
          approverEmployeeId: approver.id,
          status: "pending",
          submittedAt: submissionTime,
          reviewedAt: null,
          overtimeMinutes: 0,
          resolutionSource: "daily_activity",
          routeSnapshot: "",
          decisionNote: "",
          createdAt: submissionTime,
        });
      }
    }
  });

  await updateStreakForEmployee(payload.employeeId, endTime);
  revalidateDailyActivitySurfaces();

  if (createdActivityId == null) {
    throw new Error("Aktivitas gagal dibuat.");
  }
}

export async function updateDailyActivityConfigAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = updateConfigSchema.parse(Object.fromEntries(formData));

  await db
    .update(dailyActivityConfigs)
    .set({
      configValue: payload.configValue,
      isActive: payload.isActive,
      updatedAt: new Date(),
    })
    .where(eq(dailyActivityConfigs.id, payload.id));

  revalidateDailyActivitySurfaces();
}

export async function manageActivityModifierAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = manageModifierSchema.parse(Object.fromEntries(formData));

  if (payload.intent === "delete") {
    if (!payload.id) {
      throw new Error("Modifier tidak valid.");
    }

    await db.delete(activityModifiers).where(eq(activityModifiers.id, payload.id));
    revalidateDailyActivitySurfaces();
    return;
  }

  const values = {
    siteId: payload.siteId ?? null,
    eventName: payload.eventName,
    description: payload.description,
    multiplier: payload.multiplier,
    startDate: payload.startDate ? parseDateTime(payload.startDate, "Tanggal mulai") : new Date(),
    endDate: payload.endDate ? parseDateTime(payload.endDate, "Tanggal selesai") : null,
    isActive: payload.isActive,
    createdByEmployeeId: payload.createdByEmployeeId ?? null,
  };

  if (payload.intent === "create") {
    await db.insert(activityModifiers).values({
      ...values,
      createdAt: new Date(),
    });
  } else {
    if (!payload.id) {
      throw new Error("Modifier tidak valid.");
    }

    await db.update(activityModifiers).set(values).where(eq(activityModifiers.id, payload.id));
  }

  revalidateDailyActivitySurfaces();
}

export async function submitPointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = submitDisputeSchema.parse(Object.fromEntries(formData));

  const [penalty] = await db
    .select({
      id: penaltyEvents.id,
      employeeId: penaltyEvents.employeeId,
      disputeStatus: penaltyEvents.disputeStatus,
    })
    .from(penaltyEvents)
    .where(eq(penaltyEvents.id, payload.penaltyEventId))
    .limit(1);

  if (!penalty || penalty.employeeId !== payload.employeeId) {
    throw new Error("Penalty event tidak ditemukan.");
  }

  const [existingDispute] = await db
    .select({
      id: pointDisputes.id,
      status: pointDisputes.status,
    })
    .from(pointDisputes)
    .where(eq(pointDisputes.penaltyEventId, payload.penaltyEventId))
    .orderBy(desc(pointDisputes.createdAt))
    .limit(1);

  if (existingDispute?.status === "pending" || penalty.disputeStatus === "pending") {
    throw new Error("Penalty ini sudah memiliki dispute yang masih diproses.");
  }

  await db.transaction(async (tx) => {
    await tx.insert(pointDisputes).values({
      penaltyEventId: payload.penaltyEventId,
      employeeId: payload.employeeId,
      reason: payload.reason,
      evidenceUrls: normalizeEvidenceUrls(payload.evidenceUrls),
      status: "pending",
      resolutionNotes: "",
      resolvedByEmployeeId: null,
      resolvedAt: null,
      createdAt: new Date(),
    });

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: "pending",
        resolvedAt: null,
      })
      .where(eq(penaltyEvents.id, payload.penaltyEventId));
  });

  revalidateDailyActivitySurfaces();
}

export async function resolvePointDisputeAction(formData: FormData) {
  await ensureDailyActivitySeedData();

  const payload = resolveDisputeSchema.parse(Object.fromEntries(formData));

  const [dispute] = await db
    .select({
      id: pointDisputes.id,
      status: pointDisputes.status,
      penaltyEventId: pointDisputes.penaltyEventId,
      employeeId: pointDisputes.employeeId,
      penaltyCode: penaltyEvents.penaltyCode,
      pointsDeducted: penaltyEvents.pointsDeducted,
    })
    .from(pointDisputes)
    .innerJoin(penaltyEvents, eq(pointDisputes.penaltyEventId, penaltyEvents.id))
    .where(eq(pointDisputes.id, payload.disputeId))
    .limit(1);

  if (!dispute) {
    throw new Error("Dispute tidak ditemukan.");
  }

  if (dispute.status !== "pending") {
    throw new Error("Dispute ini sudah pernah diproses.");
  }

  await db.transaction(async (tx) => {
    const resolvedAt = new Date();

    await tx
      .update(pointDisputes)
      .set({
        status: payload.decision,
        resolvedByEmployeeId: payload.resolvedByEmployeeId,
        resolutionNotes: payload.resolutionNotes,
        resolvedAt,
      })
      .where(eq(pointDisputes.id, payload.disputeId));

    await tx
      .update(penaltyEvents)
      .set({
        isDisputed: true,
        disputeStatus: payload.decision,
        resolvedAt,
      })
      .where(eq(penaltyEvents.id, dispute.penaltyEventId));

    if (payload.decision === "approved" && dispute.pointsDeducted > 0) {
      const [existingRestoreEvent] = await tx
        .select({ id: pointEvents.id })
        .from(pointEvents)
        .where(
          and(
            eq(pointEvents.sourceType, "point_dispute"),
            eq(pointEvents.sourceId, payload.disputeId),
          ),
        )
        .limit(1);

      if (!existingRestoreEvent) {
        const [employee] = await tx
          .select({
            id: employees.id,
            totalPoints: employees.totalPoints,
          })
          .from(employees)
          .where(eq(employees.id, dispute.employeeId))
          .limit(1);

        if (employee) {
          const updatedBalance = employee.totalPoints + dispute.pointsDeducted;

          await tx.insert(pointEvents).values({
            employeeId: dispute.employeeId,
            transactionType: "reward",
            sourceType: "point_dispute",
            sourceId: payload.disputeId,
            category: "Dispute Adjustment",
            label: `Restorasi ${dispute.penaltyCode} setelah dispute disetujui`,
            points: dispute.pointsDeducted,
            balanceAfter: updatedBalance,
            metadata: JSON.stringify({
              penaltyEventId: dispute.penaltyEventId,
              decision: payload.decision,
            }),
            createdAt: resolvedAt,
          });

          await tx
            .update(employees)
            .set({ totalPoints: updatedBalance })
            .where(eq(employees.id, dispute.employeeId));
        }
      }
    }
  });

  revalidateDailyActivitySurfaces();
}
