"use server";

import { randomUUID } from "crypto";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { hashPassword } from "better-auth/crypto";
import { db } from "@/db";
import { account, session, user } from "@/db/schema/auth";
import {
  activities,
  approvals,
  employees,
  navbarMenuItems,
  pointEvents,
  roleMenuPermissions,
  securityRolePermissions,
  securityRoles,
  sites,
  timesheetEntries,
} from "@/db/schema/hero";
import {
  ensureHeroGovernanceSeedData,
  ensureHeroSeedData,
} from "@/lib/hero-admin";
import {
  getMappedValue,
  parseCsv,
  type UserImportMapping,
} from "@/lib/security-user-import";
import { normalizeBirthDateValue } from "@/lib/birth-date";

const createActivitySchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  activityCode: z.string().trim().min(2).max(4),
  activityType: z.string().trim().min(3),
  title: z.string().trim().min(5),
  unitNumber: z.string().trim().min(2),
  startTime: z.string().trim().min(1),
  endTime: z.string().trim().min(1),
  priority: z.string().trim().min(3),
  overtimeMinutes: z.coerce.number().int().min(0).max(720),
  remarks: z.string().trim().min(3),
});

const reviewApprovalSchema = z.object({
  approvalId: z.coerce.number().int().positive(),
  decision: z.enum(["approved", "needs_correction"]),
});

const importUsersSchema = z.object({
  rawCsv: z.string().trim().min(1, "File CSV wajib diisi."),
  mappingJson: z.string().trim().min(2, "Mapping import belum lengkap."),
});

export type ImportUsersActionState = {
  status: "idle" | "success" | "error";
  message: string;
  importedCount?: number;
  updatedCount?: number;
  skippedCount?: number;
};

export type AdminMutationState = {
  status: "idle" | "success" | "error";
  message: string;
};

const manageSecurityUserSchema = z.object({
  intent: z.enum([
    "create-user",
    "update-profile",
    "ban-user",
    "delete-user",
    "change-role",
    "change-password",
  ]),
  employeeId: z.preprocess(
    (value) => (value === "" || value === null || value === undefined ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  fullName: z.string().trim().optional(),
  employeeSn: z.string().trim().optional(),
  profileImage: z.string().trim().optional(),
  joinYear: z.string().trim().optional(),
  birthPlaceDate: z.string().trim().optional(),
  domicile: z.string().trim().optional(),
  directManagerId: z.string().trim().optional(),
  section: z.string().trim().optional(),
  department: z.string().trim().optional(),
  jobTitle: z.string().trim().optional(),
  workLocation: z.string().trim().optional(),
  phoneNumber: z.string().trim().optional(),
  email: z.string().trim().optional(),
  employmentStatus: z.string().trim().optional(),
  accessRole: z.string().trim().optional(),
  password: z.string().trim().optional(),
  newPassword: z.string().trim().optional(),
});

const manageSecurityRoleSchema = z.object({
  intent: z.enum([
    "create-role",
    "duplicate-role",
    "delete-role",
    "save-menu-permissions",
  ]),
  roleId: z.string().trim().optional(),
  roleName: z.string().trim().optional(),
  description: z.string().trim().optional(),
  scope: z.string().trim().optional(),
  sourceRoleId: z.string().trim().optional(),
  permissionsJson: z.string().trim().optional(),
});

function parseDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    throw new Error("Tanggal aktivitas tidak valid.");
  }

  return date;
}

function getPointsForPriority(priority: string) {
  switch (priority.toLowerCase()) {
    case "emergency":
      return 20;
    case "safety":
      return 10;
    default:
      return 5;
  }
}

function getPeriodLabel(date: Date) {
  const month = date.toLocaleString("en-US", { month: "long" });
  const week = Math.max(1, Math.ceil(date.getDate() / 7));
  return `${month} ${date.getFullYear()} • Week ${week}`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function parseJoinYear(value: string) {
  const digits = value.replace(/\D/g, "");
  const parsed = Number.parseInt(digits, 10);

  if (Number.isNaN(parsed) || parsed < 1980 || parsed > 2100) {
    return new Date().getFullYear();
  }

  return parsed;
}

function normalizeEmploymentStatus(value: string) {
  const normalized = value.trim().toLowerCase();

  if (!normalized) {
    return { status: "active", isActive: true };
  }

  if (
    normalized.includes("inactive") ||
    normalized.includes("nonaktif") ||
    normalized.includes("suspend") ||
    normalized.includes("resign")
  ) {
    return {
      status: normalized.includes("resign") ? "resigned" : "inactive",
      isActive: false,
    };
  }

  if (normalized.includes("probation")) {
    return { status: "probation", isActive: true };
  }

  if (normalized.includes("cuti") || normalized.includes("leave")) {
    return { status: "on_leave", isActive: true };
  }

  if (normalized.includes("contract") || normalized.includes("kontrak")) {
    return { status: "contract", isActive: true };
  }

  return { status: normalized.replace(/\s+/g, "_"), isActive: true };
}

function parseOptionalManagerId(value: string | undefined) {
  if (!value || value === "none") {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseRoleId(value: string | undefined) {
  if (!value) {
    return null;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function normalizeProfileImageValue(value: string | undefined) {
  const trimmedValue = value?.trim() ?? "";

  if (!trimmedValue) {
    return "";
  }

  if (trimmedValue.startsWith("data:image/")) {
    if (trimmedValue.length > 3_000_000) {
      throw new Error("Foto profile terlalu besar. Maksimal 2MB.");
    }

    return trimmedValue;
  }

  try {
    const parsedUrl = new URL(trimmedValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("Protocol URL tidak didukung.");
    }

    return parsedUrl.toString();
  } catch {
    throw new Error("Format foto profile tidak valid.");
  }
}

async function ensureAuthUserForEmployee(employee: {
  id: number;
  authUserId: string | null;
  name: string;
  email: string;
}) {
  if (employee.authUserId) {
    await db
      .update(user)
      .set({
        name: employee.name,
        email: employee.email,
        updatedAt: new Date(),
      })
      .where(eq(user.id, employee.authUserId));

    return employee.authUserId;
  }

  const [existingUser] = await db
    .select({ id: user.id })
    .from(user)
    .where(eq(user.email, employee.email))
    .limit(1);

  if (existingUser) {
    await db
      .update(user)
      .set({
        name: employee.name,
        updatedAt: new Date(),
      })
      .where(eq(user.id, existingUser.id));

    await db
      .update(employees)
      .set({ authUserId: existingUser.id })
      .where(eq(employees.id, employee.id));

    return existingUser.id;
  }

  const authUserId = randomUUID();
  const now = new Date();

  await db.insert(user).values({
    id: authUserId,
    name: employee.name,
    email: employee.email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  await db
    .update(employees)
    .set({ authUserId })
    .where(eq(employees.id, employee.id));

  return authUserId;
}

function revalidateAdminSurfaces() {
  const paths = [
    "/dashboard/analytics",
    "/dashboard/activity-hub/my-day",
    "/dashboard/activity-hub/team-board",
    "/dashboard/approval",
    "/dashboard/timesheet",
    "/dashboard/reports",
    "/dashboard/leaderboard",
    "/dashboard/security",
    "/dashboard/security/users",
  ];

  for (const path of paths) {
    revalidatePath(path);
  }
}

export async function createActivityAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = createActivitySchema.parse({
    employeeId: formData.get("employeeId"),
    activityCode: formData.get("activityCode"),
    activityType: formData.get("activityType"),
    title: formData.get("title"),
    unitNumber: formData.get("unitNumber"),
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime"),
    priority: formData.get("priority"),
    overtimeMinutes: formData.get("overtimeMinutes"),
    remarks: formData.get("remarks"),
  });

  const startTime = parseDateTime(payload.startTime);
  const endTime = parseDateTime(payload.endTime);

  if (endTime <= startTime) {
    throw new Error("Waktu selesai harus lebih besar dari waktu mulai.");
  }

  const [employee] = await db
    .select({
      id: employees.id,
      siteId: employees.siteId,
      name: employees.name,
      totalPoints: employees.totalPoints,
    })
    .from(employees)
    .where(eq(employees.id, payload.employeeId))
    .limit(1);

  if (!employee) {
    throw new Error("Karyawan tidak ditemukan.");
  }

  const [foreman] = await db
    .select({
      name: employees.name,
    })
    .from(employees)
    .where(and(eq(employees.siteId, employee.siteId), eq(employees.role, "Foreman")))
    .limit(1);

  const points = getPointsForPriority(payload.priority);

  await db.transaction(async (tx) => {
    const [activity] = await tx
      .insert(activities)
      .values({
        siteId: employee.siteId,
        employeeId: employee.id,
        activityCode: payload.activityCode.toUpperCase(),
        activityType: payload.activityType,
        title: payload.title,
        unitNumber: payload.unitNumber,
        startTime,
        endTime,
        status: "Submitted",
        priority: payload.priority,
        remarks: payload.remarks,
        pointsAwarded: points,
      })
      .returning({ id: activities.id });

    await tx.insert(approvals).values({
      activityId: activity.id,
      level: 1,
      approverName: foreman?.name ?? "Foreman Site",
      status: "pending",
      submittedAt: endTime,
      overtimeMinutes: payload.overtimeMinutes,
    });

    await tx.insert(pointEvents).values({
      employeeId: employee.id,
      category: "Activity Input",
      label: `${payload.activityType} • ${payload.unitNumber}`,
      points,
    });

    await tx
      .update(employees)
      .set({
        totalPoints: employee.totalPoints + points,
      })
      .where(eq(employees.id, employee.id));
  });

  revalidateAdminSurfaces();
}

export async function reviewApprovalAction(formData: FormData) {
  await ensureHeroSeedData();

  const payload = reviewApprovalSchema.parse({
    approvalId: formData.get("approvalId"),
    decision: formData.get("decision"),
  });

  const [approval] = await db
    .select({
      approvalId: approvals.id,
      level: approvals.level,
      status: approvals.status,
      overtimeMinutes: approvals.overtimeMinutes,
      activityId: activities.id,
      activityTitle: activities.title,
      startTime: activities.startTime,
      endTime: activities.endTime,
      employeeId: activities.employeeId,
      siteId: activities.siteId,
    })
    .from(approvals)
    .innerJoin(activities, eq(approvals.activityId, activities.id))
    .where(eq(approvals.id, payload.approvalId))
    .limit(1);

  if (!approval) {
    throw new Error("Approval tidak ditemukan.");
  }

  if (approval.status !== "pending") {
    revalidateAdminSurfaces();
    return;
  }

  const now = new Date();

  await db.transaction(async (tx) => {
    await tx
      .update(approvals)
      .set({
        status: payload.decision,
        reviewedAt: now,
      })
      .where(eq(approvals.id, approval.approvalId));

    if (payload.decision === "needs_correction") {
      await tx
        .update(activities)
        .set({
          status: "Needs Correction",
        })
        .where(eq(activities.id, approval.activityId));

      return;
    }

    if (approval.level === 1) {
      const [existingLevelTwo] = await tx
        .select({ id: approvals.id })
        .from(approvals)
        .where(and(eq(approvals.activityId, approval.activityId), eq(approvals.level, 2)))
        .limit(1);

      if (!existingLevelTwo) {
        await tx.insert(approvals).values({
          activityId: approval.activityId,
          level: 2,
          approverName: "PJO Site",
          status: "pending",
          submittedAt: now,
          overtimeMinutes: approval.overtimeMinutes,
        });
      }

      await tx
        .update(activities)
        .set({
          status: "Pending L2",
        })
        .where(eq(activities.id, approval.activityId));

      return;
    }

    const durationMinutes = Math.max(
      0,
      Math.round((approval.endTime.getTime() - approval.startTime.getTime()) / 60000),
    );
    const regularMinutes = Math.max(0, durationMinutes - approval.overtimeMinutes);
    const overtimeRate = 70000;
    const periodLabel = getPeriodLabel(approval.endTime);

    const [existingTimesheet] = await tx
      .select({
        id: timesheetEntries.id,
        regularMinutes: timesheetEntries.regularMinutes,
        overtimeMinutes: timesheetEntries.overtimeMinutes,
        overtimeAmount: timesheetEntries.overtimeAmount,
      })
      .from(timesheetEntries)
      .where(
        and(
          eq(timesheetEntries.employeeId, approval.employeeId),
          eq(timesheetEntries.siteId, approval.siteId),
          eq(timesheetEntries.periodLabel, periodLabel),
        ),
      )
      .limit(1);

    if (existingTimesheet) {
      await tx
        .update(timesheetEntries)
        .set({
          regularMinutes: existingTimesheet.regularMinutes + regularMinutes,
          overtimeMinutes: existingTimesheet.overtimeMinutes + approval.overtimeMinutes,
          overtimeAmount:
            existingTimesheet.overtimeAmount +
            Math.round((approval.overtimeMinutes / 60) * overtimeRate),
          status: "ready_for_payroll",
          updatedAt: now,
        })
        .where(eq(timesheetEntries.id, existingTimesheet.id));
    } else {
      await tx.insert(timesheetEntries).values({
        employeeId: approval.employeeId,
        siteId: approval.siteId,
        periodLabel,
        regularMinutes,
        overtimeMinutes: approval.overtimeMinutes,
        overtimeAmount: Math.round((approval.overtimeMinutes / 60) * overtimeRate),
        status: "ready_for_payroll",
        updatedAt: now,
      });
    }

    await tx
      .update(activities)
      .set({
        status: "Approved",
      })
      .where(eq(activities.id, approval.activityId));
  });

  revalidateAdminSurfaces();
}

export async function importSecurityUsersAction(
  _previousState: ImportUsersActionState,
  formData: FormData,
): Promise<ImportUsersActionState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = importUsersSchema.parse({
      rawCsv: formData.get("rawCsv"),
      mappingJson: formData.get("mappingJson"),
    });

    const mapping = JSON.parse(payload.mappingJson) as UserImportMapping;
    const { records } = parseCsv(payload.rawCsv);

    if (records.length === 0) {
      return {
        status: "error",
        message: "CSV tidak memiliki baris data yang bisa diimport.",
      };
    }

    const [defaultSite] = await db.select().from(sites).limit(1);

    if (!defaultSite) {
      return {
        status: "error",
        message: "Site default belum tersedia untuk import user.",
      };
    }

    const existingEmployees = await db
      .select({
        id: employees.id,
        name: employees.name,
        email: employees.email,
        totalPoints: employees.totalPoints,
        levelName: employees.levelName,
        fitStatus: employees.fitStatus,
      })
      .from(employees);

    const employeeByEmail = new Map(
      existingEmployees.map((employee) => [normalizeEmail(employee.email), employee]),
    );
    let importedCount = 0;
    let updatedCount = 0;
    let skippedCount = 0;
    const managerAssignments: { employeeId: number; managerLabel: string }[] = [];

    for (const record of records) {
      const fullName = getMappedValue(record, mapping, "fullName");
      const email = normalizeEmail(getMappedValue(record, mapping, "email"));

      if (!fullName || !email) {
        skippedCount += 1;
        continue;
      }

      const managerLabel = getMappedValue(record, mapping, "directManager");
      const department = getMappedValue(record, mapping, "department") || "General";
      const jobTitle = getMappedValue(record, mapping, "jobTitle") || "Staff";
      const normalizedStatus = normalizeEmploymentStatus(
        getMappedValue(record, mapping, "status"),
      );
      const existing = employeeByEmail.get(email);

      const values = {
        siteId: defaultSite.id,
        name: fullName,
        email,
        employeeSn: getMappedValue(record, mapping, "employeeSn"),
        joinYear: parseJoinYear(getMappedValue(record, mapping, "joinYear")),
        birthPlaceDate: normalizeBirthDateValue(getMappedValue(record, mapping, "ttl")),
        domicile: getMappedValue(record, mapping, "domicile") || "Belum diisi",
        section: getMappedValue(record, mapping, "section") || department,
        department,
        role: jobTitle,
        jobTitle,
        workLocation:
          getMappedValue(record, mapping, "workLocation") || defaultSite.name,
        phoneNumber: getMappedValue(record, mapping, "phoneNumber"),
        employmentStatus: normalizedStatus.status,
        isActive: normalizedStatus.isActive,
      };

      if (existing) {
        await db
          .update(employees)
          .set(values)
          .where(eq(employees.id, existing.id));

        updatedCount += 1;

        if (managerLabel) {
          managerAssignments.push({ employeeId: existing.id, managerLabel });
        }

        employeeByEmail.set(email, existing);
        continue;
      }

      const [inserted] = await db
        .insert(employees)
        .values({
          ...values,
          totalPoints: 0,
          levelName: "Rookie",
          fitStatus: "fit",
        })
        .returning({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        });

      importedCount += 1;

      if (managerLabel) {
        managerAssignments.push({ employeeId: inserted.id, managerLabel });
      }

      employeeByEmail.set(email, {
        ...inserted,
        totalPoints: 0,
        levelName: "Rookie",
        fitStatus: "fit",
      });
    }

    if (managerAssignments.length > 0) {
      const refreshedEmployees = await db
        .select({
          id: employees.id,
          name: employees.name,
          email: employees.email,
        })
        .from(employees);

      const managerByEmail = new Map(
        refreshedEmployees.map((employee) => [normalizeEmail(employee.email), employee]),
      );
      const managerByName = new Map(
        refreshedEmployees.map((employee) => [employee.name.trim().toLowerCase(), employee]),
      );

      for (const assignment of managerAssignments) {
        const manager =
          managerByEmail.get(normalizeEmail(assignment.managerLabel)) ??
          managerByName.get(assignment.managerLabel.trim().toLowerCase());

        if (!manager || manager.id === assignment.employeeId) {
          continue;
        }

        await db
          .update(employees)
          .set({ directManagerId: manager.id })
          .where(eq(employees.id, assignment.employeeId));
      }
    }

    revalidateAdminSurfaces();

    return {
      status: "success",
      message: "Import user berhasil diproses.",
      importedCount,
      updatedCount,
      skippedCount,
    };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat import user.",
    };
  }
}

export async function manageSecurityUserAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = manageSecurityUserSchema.parse({
      intent: formData.get("intent"),
      employeeId: formData.get("employeeId"),
      fullName: formData.get("fullName"),
      employeeSn: formData.get("employeeSn"),
      profileImage: formData.get("profileImage"),
      joinYear: formData.get("joinYear"),
      birthPlaceDate: formData.get("birthPlaceDate"),
      domicile: formData.get("domicile"),
      directManagerId: formData.get("directManagerId"),
      section: formData.get("section"),
      department: formData.get("department"),
      jobTitle: formData.get("jobTitle"),
      workLocation: formData.get("workLocation"),
      phoneNumber: formData.get("phoneNumber"),
      email: formData.get("email"),
      employmentStatus: formData.get("employmentStatus"),
      accessRole: formData.get("accessRole"),
      password: formData.get("password"),
      newPassword: formData.get("newPassword"),
    });

    if (payload.intent === "create-user") {
      const fullName = payload.fullName?.trim() ?? "";
      const email = normalizeEmail(payload.email ?? "");
      const password = payload.password ?? "";
      const department = payload.department?.trim() || "General";
      const jobTitle = payload.jobTitle?.trim() || "Staff";
      const directManagerId = parseOptionalManagerId(payload.directManagerId);
      const normalizedStatus = normalizeEmploymentStatus(
        payload.employmentStatus ?? "active",
      );
      const profileImage = normalizeProfileImageValue(payload.profileImage);

      if (!fullName || !email || !payload.accessRole) {
        return {
          status: "error",
          message: "Nama lengkap, email, dan role wajib diisi.",
        };
      }

      if (password.length < 8) {
        return {
          status: "error",
          message: "Password awal minimal 8 karakter.",
        };
      }

      const [[defaultSite], [existingEmployee], [existingAuthUser], [role]] =
        await Promise.all([
          db.select().from(sites).limit(1),
          db
            .select({ id: employees.id })
            .from(employees)
            .where(eq(employees.email, email))
            .limit(1),
          db
            .select({ id: user.id })
            .from(user)
            .where(eq(user.email, email))
            .limit(1),
          db
            .select()
            .from(securityRoles)
            .where(eq(securityRoles.name, payload.accessRole))
            .limit(1),
        ]);

      if (!defaultSite) {
        return {
          status: "error",
          message: "Site default belum tersedia untuk membuat user manual.",
        };
      }

      if (existingEmployee || existingAuthUser) {
        return {
          status: "error",
          message: "Email sudah dipakai oleh user lain.",
        };
      }

      if (!role) {
        return {
          status: "error",
          message: "Role yang dipilih tidak valid.",
        };
      }

      const authUserId = randomUUID();
      const now = new Date();
      const passwordHash = await hashPassword(password);

      await db.insert(user).values({
        id: authUserId,
        name: fullName,
        email,
        emailVerified: true,
        image: profileImage || null,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(account).values({
        id: randomUUID(),
        accountId: authUserId,
        providerId: "credential",
        userId: authUserId,
        password: passwordHash,
        createdAt: now,
        updatedAt: now,
      });

      await db.insert(employees).values({
        authUserId,
        siteId: defaultSite.id,
        name: fullName,
        email,
        employeeSn: payload.employeeSn?.trim() || "",
        joinYear: parseJoinYear(payload.joinYear ?? ""),
        birthPlaceDate: normalizeBirthDateValue(payload.birthPlaceDate?.trim() || ""),
        domicile: payload.domicile?.trim() || "Belum diisi",
        directManagerId,
        section: payload.section?.trim() || department,
        department,
        role: jobTitle,
        jobTitle,
        workLocation: payload.workLocation?.trim() || defaultSite.name,
        phoneNumber: payload.phoneNumber?.trim() || "",
        employmentStatus: normalizedStatus.status,
        accessRole: role.name,
        levelName: "Rookie",
        totalPoints: 0,
        fitStatus: "fit",
        isActive: normalizedStatus.isActive,
      });

      revalidateAdminSurfaces();
      return { status: "success", message: "User baru berhasil dibuat." };
    }

    if (!payload.employeeId) {
      return { status: "error", message: "User tidak valid." };
    }

    const [employee] = await db
      .select({
        id: employees.id,
        authUserId: employees.authUserId,
        name: employees.name,
        email: employees.email,
      })
      .from(employees)
      .where(eq(employees.id, payload.employeeId))
      .limit(1);

    if (!employee) {
      return { status: "error", message: "User tidak ditemukan." };
    }

    if (payload.intent === "update-profile") {
      const email = payload.email?.toLowerCase() ?? employee.email;
      const normalizedStatus = normalizeEmploymentStatus(
        payload.employmentStatus ?? "active",
      );
      const joinYear = parseJoinYear(payload.joinYear ?? "");
      const directManagerId = parseOptionalManagerId(payload.directManagerId);
      const profileImage = normalizeProfileImageValue(payload.profileImage);

      if (directManagerId === employee.id) {
        return {
          status: "error",
          message: "Atasan langsung tidak boleh diri sendiri.",
        };
      }

      await db
        .update(employees)
        .set({
          name: payload.fullName || employee.name,
          employeeSn: payload.employeeSn || "",
          joinYear,
          birthPlaceDate: normalizeBirthDateValue(payload.birthPlaceDate || ""),
          domicile: payload.domicile || "Belum diisi",
          directManagerId,
          section: payload.section || payload.department || "General",
          department: payload.department || "General",
          role: payload.jobTitle || "Staff",
          jobTitle: payload.jobTitle || "Staff",
          workLocation: payload.workLocation || "",
          phoneNumber: payload.phoneNumber || "",
          email,
          employmentStatus: normalizedStatus.status,
          isActive: normalizedStatus.isActive,
        })
        .where(eq(employees.id, employee.id));

      if (employee.authUserId) {
        await db
          .update(user)
          .set({
            name: payload.fullName || employee.name,
            email,
            image: profileImage || null,
            updatedAt: new Date(),
          })
          .where(eq(user.id, employee.authUserId));
      } else if (profileImage) {
        const authUserId = await ensureAuthUserForEmployee({
          id: employee.id,
          authUserId: employee.authUserId,
          name: payload.fullName || employee.name,
          email,
        });

        await db
          .update(user)
          .set({
            image: profileImage,
            updatedAt: new Date(),
          })
          .where(eq(user.id, authUserId));
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Profil user berhasil diperbarui." };
    }

    if (payload.intent === "ban-user") {
      await db
        .update(employees)
        .set({
          isActive: false,
          employmentStatus: "inactive",
        })
        .where(eq(employees.id, employee.id));

      if (employee.authUserId) {
        await db.delete(session).where(eq(session.userId, employee.authUserId));
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "User berhasil diban." };
    }

    if (payload.intent === "delete-user") {
      if (employee.authUserId) {
        await db.delete(user).where(eq(user.id, employee.authUserId));
      }

      await db.delete(employees).where(eq(employees.id, employee.id));

      revalidateAdminSurfaces();
      return { status: "success", message: "User berhasil dihapus." };
    }

    if (payload.intent === "change-role") {
      if (!payload.accessRole) {
        return { status: "error", message: "Role baru wajib dipilih." };
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, payload.accessRole))
        .limit(1);

      if (!role) {
        return { status: "error", message: "Role yang dipilih tidak valid." };
      }

      await db
        .update(employees)
        .set({ accessRole: role.name })
        .where(eq(employees.id, employee.id));

      revalidateAdminSurfaces();
      return { status: "success", message: "Role user berhasil diganti." };
    }

    if (payload.intent === "change-password") {
      const newPassword = payload.newPassword ?? "";

      if (newPassword.length < 8) {
        return {
          status: "error",
          message: "Password baru minimal 8 karakter.",
        };
      }

      const latestEmployee = {
        ...employee,
        name: payload.fullName || employee.name,
        email: (payload.email ?? employee.email).toLowerCase(),
      };
      const authUserId = await ensureAuthUserForEmployee(latestEmployee);
      const now = new Date();
      const passwordHash = await hashPassword(newPassword);

      const [existingCredential] = await db
        .select({ id: account.id })
        .from(account)
        .where(and(eq(account.userId, authUserId), eq(account.providerId, "credential")))
        .limit(1);

      if (existingCredential) {
        await db
          .update(account)
          .set({
            password: passwordHash,
            updatedAt: now,
          })
          .where(eq(account.id, existingCredential.id));
      } else {
        await db.insert(account).values({
          id: randomUUID(),
          accountId: authUserId,
          providerId: "credential",
          userId: authUserId,
          password: passwordHash,
          createdAt: now,
          updatedAt: now,
        });
      }

      await db.delete(session).where(eq(session.userId, authUserId));

      revalidateAdminSurfaces();
      return { status: "success", message: "Password user berhasil diganti." };
    }

    return { status: "error", message: "Intent user action tidak dikenali." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat memproses user.",
    };
  }
}

export async function manageSecurityRoleAction(
  _previousState: AdminMutationState,
  formData: FormData,
): Promise<AdminMutationState> {
  try {
    await ensureHeroGovernanceSeedData();

    const payload = manageSecurityRoleSchema.parse({
      intent: formData.get("intent"),
      roleId: formData.get("roleId"),
      roleName: formData.get("roleName"),
      description: formData.get("description"),
      scope: formData.get("scope"),
      sourceRoleId: formData.get("sourceRoleId"),
      permissionsJson: formData.get("permissionsJson"),
    });

    if (payload.intent === "create-role") {
      const roleName = payload.roleName?.trim() ?? "";

      if (!roleName) {
        return { status: "error", message: "Nama role wajib diisi." };
      }

      const [existingRole] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.name, roleName))
        .limit(1);

      if (existingRole) {
        return { status: "error", message: "Nama role sudah dipakai." };
      }

      const [createdRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description:
            payload.description?.trim() || "Role baru dari halaman role management.",
          scope: payload.scope?.trim() || "site",
        })
        .returning();

      const menuItems = await db.select().from(navbarMenuItems);
      if (menuItems.length > 0) {
        await db.insert(roleMenuPermissions).values(
          menuItems.map((menuItem) => ({
            roleId: createdRole.id,
            menuItemId: menuItem.id,
            canView: false,
            canEdit: false,
            canDelete: false,
            canSelectAll: false,
          })),
        );
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Role baru berhasil dibuat." };
    }

    if (payload.intent === "duplicate-role") {
      const sourceRoleId = parseRoleId(payload.sourceRoleId);
      const roleName = payload.roleName?.trim() ?? "";

      if (!sourceRoleId || !roleName) {
        return {
          status: "error",
          message: "Role sumber dan nama role duplikat wajib diisi.",
        };
      }

      const [sourceRole, existingRole] = await Promise.all([
        db
          .select()
          .from(securityRoles)
          .where(eq(securityRoles.id, sourceRoleId))
          .limit(1),
        db
          .select()
          .from(securityRoles)
          .where(eq(securityRoles.name, roleName))
          .limit(1),
      ]);

      if (!sourceRole[0]) {
        return { status: "error", message: "Role sumber tidak ditemukan." };
      }

      if (existingRole[0]) {
        return { status: "error", message: "Nama role duplikat sudah dipakai." };
      }

      const [duplicatedRole] = await db
        .insert(securityRoles)
        .values({
          name: roleName,
          description:
            payload.description?.trim() || `${sourceRole[0].description} (Copy)`,
          scope: payload.scope?.trim() || sourceRole[0].scope,
        })
        .returning();

      const [sourceMenuPermissions, sourceRolePermissions] = await Promise.all([
        db
          .select()
          .from(roleMenuPermissions)
          .where(eq(roleMenuPermissions.roleId, sourceRoleId)),
        db
          .select()
          .from(securityRolePermissions)
          .where(eq(securityRolePermissions.roleId, sourceRoleId)),
      ]);

      if (sourceMenuPermissions.length > 0) {
        await db.insert(roleMenuPermissions).values(
          sourceMenuPermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            menuItemId: permission.menuItemId,
            canView: permission.canView,
            canEdit: permission.canEdit,
            canDelete: permission.canDelete,
            canSelectAll: permission.canSelectAll,
          })),
        );
      }

      if (sourceRolePermissions.length > 0) {
        await db.insert(securityRolePermissions).values(
          sourceRolePermissions.map((permission) => ({
            roleId: duplicatedRole.id,
            permissionId: permission.permissionId,
          })),
        );
      }

      revalidateAdminSurfaces();
      return { status: "success", message: "Role berhasil diduplikasi." };
    }

    if (payload.intent === "delete-role") {
      const roleId = parseRoleId(payload.roleId);

      if (!roleId) {
        return { status: "error", message: "Role tidak valid." };
      }

      const roles = await db.select().from(securityRoles);
      if (roles.length <= 1) {
        return {
          status: "error",
          message: "Minimal harus ada satu role aktif.",
        };
      }

      const [role] = await db
        .select()
        .from(securityRoles)
        .where(eq(securityRoles.id, roleId))
        .limit(1);

      if (!role) {
        return { status: "error", message: "Role tidak ditemukan." };
      }

      const fallbackRole = roles.find((item) => item.id !== role.id);
      if (!fallbackRole) {
        return {
          status: "error",
          message: "Role pengganti tidak tersedia.",
        };
      }

      await db
        .update(employees)
        .set({ accessRole: fallbackRole.name })
        .where(eq(employees.accessRole, role.name));

      await db.delete(securityRoles).where(eq(securityRoles.id, role.id));

      revalidateAdminSurfaces();
      return {
        status: "success",
        message: `Role berhasil dihapus. User lama dipindah ke ${fallbackRole.name}.`,
      };
    }

    if (payload.intent === "save-menu-permissions") {
      const roleId = parseRoleId(payload.roleId);

      if (!roleId || !payload.permissionsJson) {
        return {
          status: "error",
          message: "Data permission role belum lengkap.",
        };
      }

      const matrix = JSON.parse(payload.permissionsJson) as Array<{
        menuItemId: number;
        canView: boolean;
        canEdit: boolean;
        canDelete: boolean;
        canSelectAll: boolean;
      }>;

      for (const item of matrix) {
        const [existingPermission] = await db
          .select({ id: roleMenuPermissions.id })
          .from(roleMenuPermissions)
          .where(
            and(
              eq(roleMenuPermissions.roleId, roleId),
              eq(roleMenuPermissions.menuItemId, item.menuItemId),
            ),
          )
          .limit(1);

        if (existingPermission) {
          await db
            .update(roleMenuPermissions)
            .set({
              canView: item.canView,
              canEdit: item.canEdit,
              canDelete: item.canDelete,
              canSelectAll: item.canSelectAll,
            })
            .where(eq(roleMenuPermissions.id, existingPermission.id));
        } else {
          await db.insert(roleMenuPermissions).values({
            roleId,
            menuItemId: item.menuItemId,
            canView: item.canView,
            canEdit: item.canEdit,
            canDelete: item.canDelete,
            canSelectAll: item.canSelectAll,
          });
        }
      }

      revalidateAdminSurfaces();
      return {
        status: "success",
        message: "Checklist RBAC role berhasil disimpan.",
      };
    }

    return { status: "error", message: "Intent role action tidak dikenali." };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error
          ? error.message
          : "Terjadi kendala saat memproses role.",
    };
  }
}
