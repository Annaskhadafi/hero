"use server";

import { revalidatePath } from "next/cache";
import { eq, and, inArray, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { z } from "zod";
import { db } from "@/db";
import {
  approvalMatrices,
  approvalMatrixSteps,
  employees,
  masterAttendanceShifts,
  masterSections,
  masterDepartments,
  masterPositions,
  navbarMenuItems,
  orgChartStructures,
  orgChartNodes,
  orgNodeAssignments,
  roleMenuPermissions,
  securityRoles,
  sites,
} from "@/db/schema/hero";
import { auth } from "@/lib/auth";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";
import { resolveApprovalRouteForActivity } from "@/lib/approval-engine";

const optionalPositiveIntField = z.preprocess(
  (value) => {
    if (value === "" || value == null || value === "0") {
      return undefined;
    }

    return value;
  },
  z.coerce.number().int().positive().optional(),
);

const formBooleanField = (defaultValue: boolean) =>
  z.preprocess((value) => {
    if (value === "" || value == null) {
      return defaultValue;
    }

    if (typeof value === "string") {
      return value === "true";
    }

    return Boolean(value);
  }, z.boolean());

// Validation Schemas
// Section is a child of Department
const sectionSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  departmentId: optionalPositiveIntField,
  description: z.string().trim().max(500).optional(),
  isActive: formBooleanField(true),
});

// Department is the parent entity
const departmentSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  isActive: formBooleanField(true),
});

const siteSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  name: z.string().trim().min(1).max(100),
  provinceId: z.string().trim().min(1).max(10),
  provinceName: z.string().trim().min(1).max(150),
  regencyId: z.string().trim().min(1).max(10),
  regencyName: z.string().trim().min(1).max(150),
  districtId: z.string().trim().min(1).max(10),
  districtName: z.string().trim().min(1).max(150),
  villageId: z.string().trim().min(1).max(10),
  villageName: z.string().trim().min(1).max(150),
  addressDetail: z.string().trim().max(300).optional(),
  customerName: z.string().trim().min(1).max(150),
  contractNumber: z.string().trim().min(1).max(100),
  isActive: formBooleanField(true),
});

const positionSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  departmentId: optionalPositiveIntField,
  sectionId: optionalPositiveIntField,
  siteLocation: z.string().trim().max(100).optional(),
  level: z.coerce.number().int().min(1).max(10).default(1),
  description: z.string().trim().max(500).optional(),
  isActive: formBooleanField(true),
});

const attendanceShiftSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  code: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(100),
  startTime: z.string().trim().max(20).optional(),
  endTime: z.string().trim().max(20).optional(),
  windowLabel: z.string().trim().max(100).optional(),
  helper: z.string().trim().max(240).optional(),
  sortOrder: z.coerce.number().int().min(0).max(999).default(0),
  isActive: formBooleanField(true),
});

const orgStructureSchema = z.object({
  intent: z.enum(["create", "update", "delete", "save-nodes"]),
  id: optionalPositiveIntField,
  name: z.string().trim().min(1).max(100),
  jobType: z.string().trim().min(1).max(50).default("custom"),
  version: z.coerce.number().int().min(1).max(999).default(1),
  effectiveFrom: z.string().trim().optional(),
  effectiveTo: z.string().trim().optional(),
  isDefault: formBooleanField(false),
  scopeValue: z.string().trim().max(100).optional(),
  description: z.string().trim().max(500).optional(),
  nodesJson: z.string().trim().optional(),
  isActive: formBooleanField(true),
});

const approvalMatrixSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: optionalPositiveIntField,
  name: z.string().trim().min(1).max(100),
  structureId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  transactionType: z.string().trim().min(1).max(50).default("activity"),
  siteId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  departmentId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  sectionId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  requesterPositionId: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().positive().optional(),
  ),
  activityType: z.string().trim().max(100).optional(),
  priority: z.string().trim().max(50).optional(),
  minOvertimeMinutes: z.coerce.number().int().min(0).max(1440).default(0),
  maxOvertimeMinutes: z.preprocess(
    (value) => (value === "" || value == null ? undefined : value),
    z.coerce.number().int().min(0).max(1440).optional(),
  ),
  description: z.string().trim().max(500).optional(),
  effectiveFrom: z.string().trim().optional(),
  effectiveTo: z.string().trim().optional(),
  stepsJson: z.string().trim().optional(),
  isActive: formBooleanField(true),
});

const simulateApprovalRouteSchema = z.object({
  employeeId: z.coerce.number().int().positive(),
  activityType: z.string().trim().min(1).max(100),
  priority: z.string().trim().min(1).max(50),
  overtimeMinutes: z.coerce.number().int().min(0).max(1440).default(0),
});

const deleteIntentSchema = z.object({
  intent: z.literal("delete"),
  id: z.coerce.number().int().positive(),
});

// Types
export type MasterDataActionState = {
  status: "idle" | "success" | "error";
  message: string;
  errors?: Record<string, string[]>;
};

// Helper function for timestamps
function now() {
  return new Date();
}

function parseOptionalTimestamp(value?: string | null) {
  if (!value?.trim()) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function buildSiteLocationLabel(input: {
  provinceName: string;
  regencyName: string;
  districtName: string;
  villageName: string;
  addressDetail?: string;
}) {
  return [
    input.addressDetail?.trim() || "",
    input.villageName.trim(),
    input.districtName.trim(),
    input.regencyName.trim(),
    input.provinceName.trim(),
    "Indonesia",
  ]
    .filter(Boolean)
    .join(", ");
}

async function getCurrentAccessRole() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user?.email) {
    return null;
  }

  if (session.user.id) {
    const [employeeByAuthId] = await db
      .select({ accessRole: employees.accessRole })
      .from(employees)
      .where(eq(employees.authUserId, session.user.id))
      .limit(1);

    if (employeeByAuthId?.accessRole) {
      return employeeByAuthId.accessRole;
    }
  }

  const [employeeByEmail] = await db
    .select({ accessRole: employees.accessRole })
    .from(employees)
    .where(eq(employees.email, session.user.email))
    .limit(1);

  return employeeByEmail?.accessRole ?? null;
}

async function canEditMasterData() {
  const accessRole = await getCurrentAccessRole();

  if (!accessRole) {
    return false;
  }

  const [permission] = await db
    .select({ canEdit: roleMenuPermissions.canEdit })
    .from(roleMenuPermissions)
    .innerJoin(securityRoles, eq(roleMenuPermissions.roleId, securityRoles.id))
    .innerJoin(navbarMenuItems, eq(roleMenuPermissions.menuItemId, navbarMenuItems.id))
    .where(and(eq(securityRoles.name, accessRole), eq(navbarMenuItems.resource, "master_data")))
    .limit(1);

  return permission?.canEdit ?? false;
}

export async function manageSiteAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = z
      .object({
        intent: z.literal("delete"),
        id: z.coerce.number().int().positive(),
      })
      .safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    try {
      await db.delete(sites).where(eq(sites.id, deletePayload.data.id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Site deleted successfully" };
    } catch (error) {
      console.error("Site action error:", error);
      return { status: "error", message: "An error occurred while deleting the site" };
    }
  }

  const parsed = siteSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    intent,
    id,
    name,
    provinceId,
    provinceName,
    regencyId,
    regencyName,
    districtId,
    districtName,
    villageId,
    villageName,
    addressDetail,
    customerName,
    contractNumber,
    isActive,
  } = parsed.data;

  const location = buildSiteLocationLabel({
    provinceName,
    regencyName,
    districtName,
    villageName,
    addressDetail,
  });

  try {
    if (intent === "create") {
      await db.insert(sites).values({
        name,
        location,
        provinceId,
        provinceName,
        regencyId,
        regencyName,
        districtId,
        districtName,
        villageId,
        villageName,
        addressDetail: addressDetail || "",
        customerName,
        contractNumber,
        isActive,
        createdAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Site created successfully" };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      await db
        .update(sites)
        .set({
          name,
          location,
          provinceId,
          provinceName,
          regencyId,
          regencyName,
          districtId,
          districtName,
          villageId,
          villageName,
          addressDetail: addressDetail || "",
          customerName,
          contractNumber,
          isActive,
        })
        .where(eq(sites.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Site updated successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Site action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

export async function manageAttendanceShiftAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  if (!(await canEditMasterData())) {
    return {
      status: "error",
      message: "Role Anda belum memiliki izin edit Master Data.",
    };
  }

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = z
      .object({
        intent: z.literal("delete"),
        id: z.coerce.number().int().positive(),
      })
      .safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    try {
      await db
        .delete(masterAttendanceShifts)
        .where(eq(masterAttendanceShifts.id, deletePayload.data.id));

      revalidatePath("/dashboard/master-data");
      revalidatePath("/dashboard/attendance");
      return { status: "success", message: "Shift attendance berhasil dihapus." };
    } catch (error) {
      console.error("Attendance shift action error:", error);
      return { status: "error", message: "Shift attendance masih belum bisa dihapus." };
    }
  }

  const parsed = attendanceShiftSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    intent,
    id,
    code,
    label,
    startTime,
    endTime,
    windowLabel,
    helper,
    sortOrder,
    isActive,
  } = parsed.data;

  try {
    const duplicate = await db
      .select({ id: masterAttendanceShifts.id })
      .from(masterAttendanceShifts)
      .where(
        id
          ? and(eq(masterAttendanceShifts.code, code), sql`${masterAttendanceShifts.id} != ${id}`)
          : eq(masterAttendanceShifts.code, code),
      )
      .limit(1);

    if (duplicate.length > 0) {
      return { status: "error", message: "Kode shift sudah dipakai." };
    }

    if (intent === "create") {
      await db.insert(masterAttendanceShifts).values({
        code,
        label,
        startTime: startTime || "",
        endTime: endTime || "",
        windowLabel: windowLabel || "",
        helper: helper || "",
        sortOrder,
        isActive,
        createdAt: now(),
        updatedAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      revalidatePath("/dashboard/attendance");
      return { status: "success", message: "Shift attendance berhasil ditambahkan." };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      await db
        .update(masterAttendanceShifts)
        .set({
          code,
          label,
          startTime: startTime || "",
          endTime: endTime || "",
          windowLabel: windowLabel || "",
          helper: helper || "",
          sortOrder,
          isActive,
          updatedAt: now(),
        })
        .where(eq(masterAttendanceShifts.id, id));

      revalidatePath("/dashboard/master-data");
      revalidatePath("/dashboard/attendance");
      return { status: "success", message: "Shift attendance berhasil diperbarui." };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Attendance shift action error:", error);
    return { status: "error", message: "Terjadi kendala saat menyimpan shift attendance." };
  }
}

// SECTION ACTIONS
export async function manageSectionAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = deleteIntentSchema.safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    try {
      await db.delete(masterSections).where(eq(masterSections.id, deletePayload.data.id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Section deleted successfully" };
    } catch (error) {
      console.error("Section action error:", error);
      return { status: "error", message: "An error occurred while deleting the section" };
    }
  }

  const parsed = sectionSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { intent, id, code, name, departmentId, description, isActive } = parsed.data;

  try {
    if (intent === "create") {
      // Check for duplicate code
      const existing = await db
        .select({ id: masterSections.id })
        .from(masterSections)
        .where(eq(masterSections.code, code))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Section code already exists",
        };
      }

      await db.insert(masterSections).values({
        code,
        name,
        departmentId: departmentId || null,
        description: description || "",
        isActive,
        createdAt: now(),
        updatedAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Section created successfully" };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      // Check for duplicate code (excluding current record)
      const existing = await db
        .select({ id: masterSections.id })
        .from(masterSections)
        .where(and(eq(masterSections.code, code), sql`${masterSections.id} != ${id}`))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Section code already exists",
        };
      }

      await db
        .update(masterSections)
        .set({
          code,
          name,
          departmentId: departmentId || null,
          description: description || "",
          isActive,
          updatedAt: now(),
        })
        .where(eq(masterSections.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Section updated successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Section action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

// DEPARTMENT ACTIONS
export async function manageDepartmentAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = deleteIntentSchema.safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    const { id } = deletePayload.data;

    try {
      // Check if department is used by sections
      const usedBySections = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(masterSections)
        .where(eq(masterSections.departmentId, id));

      if ((usedBySections[0]?.count ?? 0) > 0) {
        return {
          status: "error",
          message: "Cannot delete department that has sections assigned",
        };
      }

      // Check if department is used by positions
      const usedByPositions = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(masterPositions)
        .where(eq(masterPositions.departmentId, id));

      if ((usedByPositions[0]?.count ?? 0) > 0) {
        return {
          status: "error",
          message: "Cannot delete department that has positions assigned",
        };
      }

      await db.delete(masterDepartments).where(eq(masterDepartments.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Department deleted successfully" };
    } catch (error) {
      console.error("Department action error:", error);
      return { status: "error", message: "An error occurred while deleting the department" };
    }
  }

  const parsed = departmentSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { intent, id, code, name, description, isActive } = parsed.data;

  try {
    if (intent === "create") {
      const existing = await db
        .select({ id: masterDepartments.id })
        .from(masterDepartments)
        .where(eq(masterDepartments.code, code))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Department code already exists",
        };
      }

      await db.insert(masterDepartments).values({
        code,
        name,
        description: description || "",
        isActive,
        createdAt: now(),
        updatedAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Department created successfully" };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      const existing = await db
        .select({ id: masterDepartments.id })
        .from(masterDepartments)
        .where(and(eq(masterDepartments.code, code), sql`${masterDepartments.id} != ${id}`))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Department code already exists",
        };
      }

      await db
        .update(masterDepartments)
        .set({
          code,
          name,
          description: description || "",
          isActive,
          updatedAt: now(),
        })
        .where(eq(masterDepartments.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Department updated successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Department action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

// POSITION (JABATAN) ACTIONS
export async function managePositionAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = deleteIntentSchema.safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    const { id } = deletePayload.data;

    try {
      const [usedInNodes, usedInMatrices, usedByEmployees] = await Promise.all([
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(orgChartNodes)
          .where(eq(orgChartNodes.positionId, id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(approvalMatrices)
          .where(eq(approvalMatrices.requesterPositionId, id)),
        db
          .select({ count: sql<number>`count(*)::int` })
          .from(employees)
          .where(eq(employees.positionId, id)),
      ]);

      if (
        (usedInNodes[0]?.count ?? 0) > 0 ||
        (usedInMatrices[0]?.count ?? 0) > 0 ||
        (usedByEmployees[0]?.count ?? 0) > 0
      ) {
        return {
          status: "error",
          message:
            "Cannot delete position that is still used by employees, org nodes, or approval matrix",
        };
      }

      await db.delete(masterPositions).where(eq(masterPositions.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Position deleted successfully" };
    } catch (error) {
      console.error("Position action error:", error);
      return { status: "error", message: "An error occurred while deleting the position" };
    }
  }

  const parsed = positionSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { intent, id, code, name, departmentId, sectionId, siteLocation, level, description, isActive } = parsed.data;

  try {
    let resolvedDepartmentId = departmentId || null;

    if (sectionId) {
      const [sectionRecord] = await db
        .select({
          id: masterSections.id,
          departmentId: masterSections.departmentId,
        })
        .from(masterSections)
        .where(eq(masterSections.id, sectionId))
        .limit(1);

      if (!sectionRecord) {
        return {
          status: "error",
          message: "Section yang dipilih tidak ditemukan",
        };
      }

      if (
        resolvedDepartmentId != null &&
        sectionRecord.departmentId != null &&
        sectionRecord.departmentId !== resolvedDepartmentId
      ) {
        return {
          status: "error",
          message: "Section harus sesuai dengan department yang dipilih",
        };
      }

      resolvedDepartmentId = sectionRecord.departmentId ?? resolvedDepartmentId;
    }

    if (intent === "create") {
      const existing = await db
        .select({ id: masterPositions.id })
        .from(masterPositions)
        .where(eq(masterPositions.code, code))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Position code already exists",
        };
      }

      await db.insert(masterPositions).values({
        code,
        name,
        departmentId: resolvedDepartmentId,
        sectionId: sectionId || null,
        siteLocation: siteLocation || "",
        level,
        description: description || "",
        isActive,
        createdAt: now(),
        updatedAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Position created successfully" };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      const existing = await db
        .select({ id: masterPositions.id })
        .from(masterPositions)
        .where(and(eq(masterPositions.code, code), sql`${masterPositions.id} != ${id}`))
        .limit(1);

      if (existing.length > 0) {
        return {
          status: "error",
          message: "Position code already exists",
        };
      }

      await db
        .update(masterPositions)
        .set({
          code,
          name,
          departmentId: resolvedDepartmentId,
          sectionId: sectionId || null,
          siteLocation: siteLocation || "",
          level,
          description: description || "",
          isActive,
          updatedAt: now(),
        })
        .where(eq(masterPositions.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Position updated successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Position action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

// ORGANIZATIONAL STRUCTURE ACTIONS
export async function manageOrgStructureAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = deleteIntentSchema.safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    try {
      await db.delete(orgChartStructures).where(eq(orgChartStructures.id, deletePayload.data.id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational structure deleted successfully" };
    } catch (error) {
      console.error("Org structure action error:", error);
      return {
        status: "error",
        message: "An error occurred while deleting the organizational structure",
      };
    }
  }

  const parsed = orgStructureSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    intent,
    id,
    name,
    jobType,
    version,
    effectiveFrom,
    effectiveTo,
    isDefault,
    scopeValue,
    description,
    nodesJson,
    isActive,
  } = parsed.data;

  try {
    if (intent === "create") {
      if (isDefault) {
        await db.update(orgChartStructures).set({ isDefault: false });
      }

      await db.insert(orgChartStructures).values({
        name,
        scopeType: jobType,
        scopeValue: scopeValue || "",
        version,
        effectiveFrom: parseOptionalTimestamp(effectiveFrom) ?? now(),
        effectiveTo: parseOptionalTimestamp(effectiveTo),
        isDefault,
        description: description || "",
        isActive,
        createdAt: now(),
        updatedAt: now(),
      });

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational structure created successfully" };
    }

    if (intent === "update") {
      if (!id) {
        return { status: "error", message: "ID is required for update" };
      }

      if (isDefault) {
        await db
          .update(orgChartStructures)
          .set({ isDefault: false, updatedAt: now() })
          .where(sql`${orgChartStructures.id} != ${id}`);
      }

      await db
        .update(orgChartStructures)
        .set({
          name,
          scopeType: jobType,
          scopeValue: scopeValue || "",
          version,
          effectiveFrom: parseOptionalTimestamp(effectiveFrom) ?? now(),
          effectiveTo: parseOptionalTimestamp(effectiveTo),
          isDefault,
          description: description || "",
          isActive,
          updatedAt: now(),
        })
        .where(eq(orgChartStructures.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational structure updated successfully" };
    }

    if (intent === "save-nodes") {
      if (!id) {
        return { status: "error", message: "ID is required for save nodes" };
      }

      const parsedNodes = z.array(
        z.object({
          id: z.number().optional(),
          parentNodeId: z.number().nullable(),
          positionId: z.number().nullable(),
          employeeId: z.number().nullable().optional(),
          nodeCode: z.string().trim().max(50).default(""),
          nodeType: z.string().trim().max(50).default("position"),
          approvalRole: z.string().trim().max(100).default(""),
          canApprove: z.boolean().default(false),
          canDelegate: z.boolean().default(true),
          isEscalationTarget: z.boolean().default(false),
          slaHours: z.number().int().min(1).max(240).default(24),
          fallbackNodeId: z.number().nullable().optional(),
          label: z.string().trim().min(1).max(100),
          sortOrder: z.number().int().min(0),
          isActive: z.boolean().default(true),
          assignments: z
            .array(
              z.object({
                employeeId: z.number().nullable().optional(),
                assignmentType: z.string().trim().max(50).default("primary"),
                notes: z.string().trim().max(300).optional(),
                effectiveFrom: z.string().trim().optional(),
                effectiveTo: z.string().trim().optional(),
                isActive: z.boolean().default(true),
              }),
            )
            .default([]),
        })
      ).safeParse(JSON.parse(nodesJson || "[]"));

      if (!parsedNodes.success) {
        return { status: "error", message: "Nodes payload is invalid" };
      }

      const existingStructureNodeIds = (
        await db
          .select({ id: orgChartNodes.id })
          .from(orgChartNodes)
          .where(eq(orgChartNodes.structureId, id))
      ).map((row) => row.id);

      await db.transaction(async (tx) => {
        if (isDefault) {
          await tx
            .update(orgChartStructures)
            .set({ isDefault: false, updatedAt: now() })
            .where(sql`${orgChartStructures.id} != ${id}`);
        }

        await tx
          .update(orgChartStructures)
          .set({
            name,
            scopeType: jobType,
            scopeValue: scopeValue || "",
            version,
            effectiveFrom: parseOptionalTimestamp(effectiveFrom) ?? now(),
            effectiveTo: parseOptionalTimestamp(effectiveTo),
            isDefault,
            description: description || "",
            isActive,
            updatedAt: now(),
          })
          .where(eq(orgChartStructures.id, id));

        await tx.delete(orgChartNodes).where(eq(orgChartNodes.structureId, id));

        if (parsedNodes.data.length > 0) {
          const inserted = await tx
            .insert(orgChartNodes)
            .values(
              parsedNodes.data.map((node) => ({
                structureId: id,
                parentNodeId: null,
                positionId: node.positionId,
                employeeId: node.employeeId || null,
                nodeCode: node.nodeCode || "",
                nodeType: node.nodeType || "position",
                approvalRole: node.approvalRole || "",
                canApprove: node.canApprove,
                canDelegate: node.canDelegate,
                isEscalationTarget: node.isEscalationTarget,
                slaHours: node.slaHours,
                fallbackNodeId: null,
                label: node.label,
                sortOrder: node.sortOrder,
                isActive: node.isActive,
                createdAt: now(),
                updatedAt: now(),
              }))
            )
            .returning({
              id: orgChartNodes.id,
              employeeId: orgChartNodes.employeeId,
            });

          const oldToNewId = new Map<number, number>();
          parsedNodes.data.forEach((node, index) => {
            if (node.id != null) {
              oldToNewId.set(node.id, inserted[index]?.id ?? 0);
            }
          });

          for (let index = 0; index < parsedNodes.data.length; index += 1) {
            const node = parsedNodes.data[index];
            const insertedNode = inserted[index];
            if (!insertedNode) continue;

            const parentNodeId =
              node.parentNodeId == null ? null : oldToNewId.get(node.parentNodeId) ?? null;
            const fallbackNodeId =
              node.fallbackNodeId == null ? null : oldToNewId.get(node.fallbackNodeId) ?? null;

            await tx
              .update(orgChartNodes)
              .set({
                parentNodeId,
                fallbackNodeId,
                updatedAt: now(),
              })
              .where(eq(orgChartNodes.id, insertedNode.id));
          }

          const assignmentsToInsert = parsedNodes.data.flatMap((node, index) => {
            const insertedNode = inserted[index];
            if (!insertedNode) {
              return [];
            }

            const normalizedAssignments =
              node.assignments.length > 0
                ? node.assignments
                : node.employeeId != null
                  ? [
                      {
                        employeeId: node.employeeId,
                        assignmentType: "primary",
                        notes: "Primary assignee from org canvas",
                        effectiveFrom: effectiveFrom || "",
                        effectiveTo: effectiveTo || "",
                        isActive: true,
                      },
                    ]
                  : [];

            return normalizedAssignments
              .filter((assignment) => assignment.employeeId != null)
              .map((assignment) => ({
                nodeId: insertedNode.id,
                employeeId: assignment.employeeId ?? null,
                assignmentType: assignment.assignmentType || "primary",
                notes: assignment.notes || "",
                effectiveFrom:
                  parseOptionalTimestamp(assignment.effectiveFrom) ??
                  parseOptionalTimestamp(effectiveFrom) ??
                  now(),
                effectiveTo: parseOptionalTimestamp(assignment.effectiveTo),
                isActive: assignment.isActive,
                createdAt: now(),
                updatedAt: now(),
              }));
          });

          if (assignmentsToInsert.length > 0) {
            await tx.insert(orgNodeAssignments).values(assignmentsToInsert);
          }

          const assignedEmployeePairs = parsedNodes.data.flatMap((node, index) => {
            const insertedNode = inserted[index];
            if (!insertedNode) {
              return [];
            }

            const primaryAssignment =
              node.assignments.find((assignment) => assignment.assignmentType === "primary" && assignment.employeeId != null) ??
              (node.employeeId != null
                ? {
                    employeeId: node.employeeId,
                  }
                : null);

            if (!primaryAssignment?.employeeId) {
              return [];
            }

            return [
              {
                employeeId: primaryAssignment.employeeId,
                orgNodeId: insertedNode.id,
              },
            ];
          });

          if (assignedEmployeePairs.length > 0) {
            for (const pair of assignedEmployeePairs) {
              await tx
                .update(employees)
                .set({ orgNodeId: pair.orgNodeId })
                .where(eq(employees.id, pair.employeeId));
            }
          }
        }
      });

      if (existingStructureNodeIds.length > 0) {
        await db
          .update(employees)
          .set({ orgNodeId: null })
          .where(inArray(employees.orgNodeId, existingStructureNodeIds));
      }

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational canvas saved successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Org structure action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

export async function manageApprovalMatrixAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());

  if (raw.intent === "delete") {
    const deletePayload = z
      .object({
        intent: z.literal("delete"),
        id: z.coerce.number().int().positive(),
      })
      .safeParse(raw);

    if (!deletePayload.success) {
      return {
        status: "error",
        message: "Validation failed",
        errors: deletePayload.error.flatten().fieldErrors,
      };
    }

    try {
      await db.delete(approvalMatrices).where(eq(approvalMatrices.id, deletePayload.data.id));
      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Approval matrix deleted successfully" };
    } catch (error) {
      console.error("Approval matrix action error:", error);
      return { status: "error", message: "An error occurred while processing your request" };
    }
  }

  const parsed = approvalMatrixSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const {
    intent,
    id,
    name,
    structureId,
    transactionType,
    siteId,
    departmentId,
    sectionId,
    requesterPositionId,
    activityType,
    priority,
    minOvertimeMinutes,
    maxOvertimeMinutes,
    description,
    effectiveFrom,
    effectiveTo,
    stepsJson,
    isActive,
  } = parsed.data;

  try {
    const parsedSteps = z
      .array(
        z.object({
          stepOrder: z.number().int().min(1),
          label: z.string().trim().max(100).default(""),
          nodeId: z.number().nullable().optional(),
          fallbackNodeId: z.number().nullable().optional(),
          escalationNodeId: z.number().nullable().optional(),
          approvalMode: z.string().trim().max(50).default("sequential"),
          slaHours: z.number().int().min(1).max(240).default(24),
          canDelegate: z.boolean().default(true),
          isRequired: z.boolean().default(true),
        }),
      )
      .safeParse(JSON.parse(stepsJson || "[]"));

    if (!parsedSteps.success) {
      return { status: "error", message: "Approval step payload is invalid" };
    }

    if (intent === "create") {
      const [createdMatrix] = await db
        .insert(approvalMatrices)
        .values({
          name,
          structureId: structureId || null,
          transactionType,
          siteId: siteId || null,
          departmentId: departmentId || null,
          sectionId: sectionId || null,
          requesterPositionId: requesterPositionId || null,
          activityType: activityType || "",
          priority: priority || "any",
          minOvertimeMinutes,
          maxOvertimeMinutes: maxOvertimeMinutes ?? null,
          description: description || "",
          effectiveFrom: parseOptionalTimestamp(effectiveFrom) ?? now(),
          effectiveTo: parseOptionalTimestamp(effectiveTo),
          isActive,
          createdAt: now(),
          updatedAt: now(),
        })
        .returning({ id: approvalMatrices.id });

      if (parsedSteps.data.length > 0) {
        await db.insert(approvalMatrixSteps).values(
          parsedSteps.data.map((step) => ({
            matrixId: createdMatrix.id,
            stepOrder: step.stepOrder,
            label: step.label || `Step ${step.stepOrder}`,
            nodeId: step.nodeId ?? null,
            fallbackNodeId: step.fallbackNodeId ?? null,
            escalationNodeId: step.escalationNodeId ?? null,
            approvalMode: step.approvalMode,
            slaHours: step.slaHours,
            canDelegate: step.canDelegate,
            isRequired: step.isRequired,
            createdAt: now(),
            updatedAt: now(),
          })),
        );
      }

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Approval matrix created successfully" };
    }

    if (!id) {
      return { status: "error", message: "ID is required for update" };
    }

    await db.transaction(async (tx) => {
      await tx
        .update(approvalMatrices)
        .set({
          name,
          structureId: structureId || null,
          transactionType,
          siteId: siteId || null,
          departmentId: departmentId || null,
          sectionId: sectionId || null,
          requesterPositionId: requesterPositionId || null,
          activityType: activityType || "",
          priority: priority || "any",
          minOvertimeMinutes,
          maxOvertimeMinutes: maxOvertimeMinutes ?? null,
          description: description || "",
          effectiveFrom: parseOptionalTimestamp(effectiveFrom) ?? now(),
          effectiveTo: parseOptionalTimestamp(effectiveTo),
          isActive,
          updatedAt: now(),
        })
        .where(eq(approvalMatrices.id, id));

      await tx.delete(approvalMatrixSteps).where(eq(approvalMatrixSteps.matrixId, id));

      if (parsedSteps.data.length > 0) {
        await tx.insert(approvalMatrixSteps).values(
          parsedSteps.data.map((step) => ({
            matrixId: id,
            stepOrder: step.stepOrder,
            label: step.label || `Step ${step.stepOrder}`,
            nodeId: step.nodeId ?? null,
            fallbackNodeId: step.fallbackNodeId ?? null,
            escalationNodeId: step.escalationNodeId ?? null,
            approvalMode: step.approvalMode,
            slaHours: step.slaHours,
            canDelegate: step.canDelegate,
            isRequired: step.isRequired,
            createdAt: now(),
            updatedAt: now(),
          })),
        );
      }
    });

    revalidatePath("/dashboard/master-data");
    return { status: "success", message: "Approval matrix updated successfully" };
  } catch (error) {
    console.error("Approval matrix action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}

export async function simulateApprovalRouteAction(formData: FormData) {
  await ensureHeroGovernanceSeedData();

  const parsed = simulateApprovalRouteSchema.safeParse({
    employeeId: formData.get("employeeId"),
    activityType: formData.get("activityType"),
    priority: formData.get("priority"),
    overtimeMinutes: formData.get("overtimeMinutes"),
  });

  if (!parsed.success) {
    return {
      status: "error" as const,
      message: "Simulasi belum lengkap.",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  try {
    const route = await resolveApprovalRouteForActivity(parsed.data);

    return {
      status: "success" as const,
      message: route.matrixName
        ? `Route ditemukan dari matrix ${route.matrixName}.`
        : "Route fallback legacy dipakai.",
      route,
    };
  } catch (error) {
    console.error("Approval simulation error:", error);
    return {
      status: "error" as const,
      message: error instanceof Error ? error.message : "Gagal mensimulasikan approval route.",
    };
  }
}
