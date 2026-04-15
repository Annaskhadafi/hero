"use server";

import { revalidatePath } from "next/cache";
import { eq, and, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  masterSections,
  masterDepartments,
  masterPositions,
  orgStructures,
} from "@/db/schema/hero";
import { ensureHeroGovernanceSeedData } from "@/lib/hero-admin";

// Validation Schemas
// Section is a child of Department
const sectionSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  departmentId: z.coerce.number().int().positive().optional(),
  description: z.string().trim().max(500).optional(),
  isActive: z.coerce.boolean().default(true),
});

// Department is the parent entity
const departmentSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  description: z.string().trim().max(500).optional(),
  isActive: z.coerce.boolean().default(true),
});

const positionSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: z.coerce.number().int().positive().optional(),
  code: z.string().trim().min(1).max(20),
  name: z.string().trim().min(1).max(100),
  departmentId: z.coerce.number().int().positive().optional(),
  level: z.coerce.number().int().min(1).max(10).default(1),
  description: z.string().trim().max(500).optional(),
  isActive: z.coerce.boolean().default(true),
});

const orgStructureSchema = z.object({
  intent: z.enum(["create", "update", "delete"]),
  id: z.coerce.number().int().positive().optional(),
  name: z.string().trim().min(1).max(100),
  jobType: z.string().trim().min(1).max(50).default("default"),
  positionId: z.coerce.number().int().positive(),
  managerPositionId: z.coerce.number().int().positive().optional(),
  approvalLevel: z.coerce.number().int().min(1).max(5).default(1),
  isActive: z.coerce.boolean().default(true),
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

// SECTION ACTIONS
export async function manageSectionAction(
  _state: MasterDataActionState,
  formData: FormData
): Promise<MasterDataActionState> {
  await ensureHeroGovernanceSeedData();

  const raw = Object.fromEntries(formData.entries());
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

    if (intent === "delete") {
      if (!id) {
        return { status: "error", message: "ID is required for delete" };
      }

      await db.delete(masterSections).where(eq(masterSections.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Section deleted successfully" };
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

    if (intent === "delete") {
      if (!id) {
        return { status: "error", message: "ID is required for delete" };
      }

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
  const parsed = positionSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { intent, id, code, name, departmentId, level, description, isActive } = parsed.data;

  try {
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
        departmentId: departmentId || null,
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
          departmentId: departmentId || null,
          level,
          description: description || "",
          isActive,
          updatedAt: now(),
        })
        .where(eq(masterPositions.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Position updated successfully" };
    }

    if (intent === "delete") {
      if (!id) {
        return { status: "error", message: "ID is required for delete" };
      }

      // Check if position is used in org structure
      const usedInOrg = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(orgStructures)
        .where(eq(orgStructures.positionId, id));

      if ((usedInOrg[0]?.count ?? 0) > 0) {
        return {
          status: "error",
          message: "Cannot delete position that is used in organizational structure",
        };
      }

      await db.delete(masterPositions).where(eq(masterPositions.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Position deleted successfully" };
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
  const parsed = orgStructureSchema.safeParse(raw);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Validation failed",
      errors: parsed.error.flatten().fieldErrors,
    };
  }

  const { intent, id, name, jobType, positionId, managerPositionId, approvalLevel, isActive } = parsed.data;

  try {
    if (intent === "create") {
      await db.insert(orgStructures).values({
        name,
        jobType,
        positionId,
        managerPositionId: managerPositionId || null,
        approvalLevel,
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

      await db
        .update(orgStructures)
        .set({
          name,
          jobType,
          positionId,
          managerPositionId: managerPositionId || null,
          approvalLevel,
          isActive,
          updatedAt: now(),
        })
        .where(eq(orgStructures.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational structure updated successfully" };
    }

    if (intent === "delete") {
      if (!id) {
        return { status: "error", message: "ID is required for delete" };
      }

      await db.delete(orgStructures).where(eq(orgStructures.id, id));

      revalidatePath("/dashboard/master-data");
      return { status: "success", message: "Organizational structure deleted successfully" };
    }

    return { status: "error", message: "Invalid intent" };
  } catch (error) {
    console.error("Org structure action error:", error);
    return { status: "error", message: "An error occurred while processing your request" };
  }
}
