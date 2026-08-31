"use server";

import { and, asc, count, desc, eq, gte, ilike, inArray, or } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { db } from "@/db";
import {
  hcDisciplinaryActions,
  hcViolationCategories,
  masterDepartments,
  employees,
  hrPositions,
} from "@/db/schema/hero";
import { getHrEmployeeContactById } from "@/lib/workflow-email";
import { buildHumanCapitalEmail, sendHumanCapitalEmail } from "@/lib/human-capital-email";
import { getServerSession } from "@/lib/auth-session";

const DISCIPLINARY_PATH = "/dashboard/hc/disciplinary";

type IdInput = number | string;

export type DisciplinaryFilters = {
  spLevel?: string;
  status?: string;
  severity?: string;
  search?: string;
};

export type ViolationCategoryInput = {
  code: string;
  name: string;
  severity: string;
  defaultSpLevel: string;
  description?: string;
  isActive?: boolean;
};

export type DisciplinaryActionInput = {
  employeeId: IdInput;
  categoryId: IdInput;
  spLevel: string;
  letterNumber?: string;
  violationDate: string | Date;
  description?: string;
  actionTaken?: string;
  effectiveDate: string | Date;
  expiryDate?: string | Date | null;
  issuedBy?: string;
  notes?: string;
  status?: string;
};

function toId(value: IdInput) {
  const id = Number(value);
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID tidak valid.");
  return id;
}

function toDate(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");
  return date;
}

function toDateString(value: string | Date) {
  return toDate(value).toISOString().slice(0, 10);
}

function toOptionalDate(value?: string | Date | null) {
  if (!value) return null;
  return toDate(value);
}

function normalizeText(value?: string | null) {
  return value?.trim() ?? "";
}

function categoryValues(data: ViolationCategoryInput) {
  return {
    code: normalizeText(data.code).toUpperCase(),
    name: normalizeText(data.name),
    severity: normalizeText(data.severity) || "Medium",
    defaultSpLevel: Number(data.defaultSpLevel?.replace(/\D/g, "")) || 1,
    description: normalizeText(data.description),
    isActive: data.isActive ?? true,
    updatedAt: new Date(),
  };
}

function disciplinaryValues(data: DisciplinaryActionInput) {
  return {
    employeeId: toId(data.employeeId),
    violationCategoryId: toId(data.categoryId),
    spLevel: Number(String(data.spLevel).replace(/\D/g, "")) || 1,
    letterNumber: normalizeText(data.letterNumber),
    violationDate: toDateString(data.violationDate),
    violationDescription: normalizeText(data.description),
    actionTaken: normalizeText(data.actionTaken),
    effectiveDate: toDateString(data.effectiveDate),
    expiryDate: data.expiryDate ? toDateString(data.expiryDate) : null,
    issuedBy: normalizeText(data.issuedBy),
    notes: normalizeText(data.notes),
    status: normalizeText(data.status) || "active",
    updatedAt: new Date(),
  };
}

export async function getViolationCategories() {
  return db.select().from(hcViolationCategories).orderBy(asc(hcViolationCategories.code));
}

export async function createViolationCategory(data: ViolationCategoryInput) {
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized: Session required");
  const [created] = await db.insert(hcViolationCategories).values(categoryValues(data)).returning();
  revalidatePath(DISCIPLINARY_PATH);
  return normalizeCategory(created);
}

export async function updateViolationCategory(id: IdInput, data: ViolationCategoryInput) {
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized: Session required");
  const [updated] = await db
    .update(hcViolationCategories)
    .set(categoryValues(data))
    .where(eq(hcViolationCategories.id, toId(id)))
    .returning();
  revalidatePath(DISCIPLINARY_PATH);
  return normalizeCategory(updated);
}

export async function deleteViolationCategory(id: IdInput) {
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized: Session required");
  await db.delete(hcViolationCategories).where(eq(hcViolationCategories.id, toId(id)));
  revalidatePath(DISCIPLINARY_PATH);
  return { success: true };
}

function buildDisciplinaryWhere(filters?: DisciplinaryFilters) {
  const clauses = [];
  if (filters?.spLevel) clauses.push(eq(hcDisciplinaryActions.spLevel, Number(filters.spLevel.replace(/\D/g, "")) || 1));
  if (filters?.status) clauses.push(eq(hcDisciplinaryActions.status, filters.status));
  if (filters?.severity) clauses.push(eq(hcViolationCategories.severity, filters.severity));
  if (filters?.search) clauses.push(buildSearchClause(filters.search));
  return clauses.length ? and(...clauses) : undefined;
}

function buildSearchClause(search: string) {
  const term = `%${search.trim()}%`;
  return or(
    ilike(employees.name, term),
    ilike(hcDisciplinaryActions.letterNumber, term),
    ilike(hcViolationCategories.name, term),
  );
}

export async function getDisciplinaryActions(filters?: DisciplinaryFilters) {
  const rows = await db
    .select({
      id: hcDisciplinaryActions.id,
      employeeId: hcDisciplinaryActions.employeeId,
      categoryId: hcDisciplinaryActions.violationCategoryId,
      spLevel: hcDisciplinaryActions.spLevel,
      letterNumber: hcDisciplinaryActions.letterNumber,
      violationDate: hcDisciplinaryActions.violationDate,
      description: hcDisciplinaryActions.violationDescription,
      actionTaken: hcDisciplinaryActions.actionTaken,
      effectiveDate: hcDisciplinaryActions.effectiveDate,
      expiryDate: hcDisciplinaryActions.expiryDate,
      issuedBy: hcDisciplinaryActions.issuedBy,
      notes: hcDisciplinaryActions.notes,
      status: hcDisciplinaryActions.status,
      createdAt: hcDisciplinaryActions.createdAt,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      department: masterDepartments.name,
      position: hrPositions.rankName,
      categoryCode: hcViolationCategories.code,
      categoryName: hcViolationCategories.name,
      severity: hcViolationCategories.severity,
    })
    .from(hcDisciplinaryActions)
    .leftJoin(employees, eq(hcDisciplinaryActions.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .leftJoin(hcViolationCategories, eq(hcDisciplinaryActions.violationCategoryId, hcViolationCategories.id))
    .where(buildDisciplinaryWhere(filters))
    .orderBy(desc(hcDisciplinaryActions.violationDate));

  return rows.map((row) => ({ ...row, spLevel: `SP${row.spLevel}` }));
}

export async function getDisciplinaryById(id: IdInput) {
  const [record] = await db
    .select()
    .from(hcDisciplinaryActions)
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .limit(1);
  return record;
}

export async function createDisciplinaryAction(data: DisciplinaryActionInput) {
  const session = await getServerSession();
  if (!session?.user) throw new Error("Unauthorized: Session required");
  const [created] = await db.insert(hcDisciplinaryActions).values(disciplinaryValues(data)).returning();
  const employee = await getHrEmployeeContactById(created.employeeId);
  const [category] = created.violationCategoryId
    ? await db
        .select({ name: hcViolationCategories.name, severity: hcViolationCategories.severity })
        .from(hcViolationCategories)
        .where(eq(hcViolationCategories.id, created.violationCategoryId))
        .limit(1)
    : [];

  const emailContent = buildHumanCapitalEmail({
    title: "Tindakan disipliner baru",
    intro: "Tindakan disipliner baru telah dibuat di modul Human Capital.",
    details: [
      `Karyawan: ${employee.name}`,
      `Kategori: ${category?.name || "-"}`,
      `Severity: ${category?.severity || "-"}`,
      `SP Level: SP${created.spLevel}`,
      `Status: ${created.status}`,
      created.letterNumber ? `No surat: ${created.letterNumber}` : null,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_disciplinary_created",
    templateName: "HC Disciplinary Created",
    variables: {
      employeeName: employee.name,
      categoryName: category?.name || "-",
      severity: category?.severity || "-",
      spLevel: `SP${created.spLevel}`,
      status: created.status,
      letterNumber: created.letterNumber || "-",
    },
    extraTo: employee.email ? [employee.email] : [],
    fallbackSubject: `Tindakan disipliner baru: ${employee.name}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });

  revalidatePath(DISCIPLINARY_PATH);
  return normalizeAction(created);
}

export async function updateDisciplinaryAction(id: IdInput, data: DisciplinaryActionInput) {
  const [updated] = await db
    .update(hcDisciplinaryActions)
    .set(disciplinaryValues(data))
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .returning();
  revalidatePath(DISCIPLINARY_PATH);
  return normalizeAction(updated);
}

export async function updateDisciplinaryStatus(id: IdInput, status: string) {
  const [updated] = await db
    .update(hcDisciplinaryActions)
    .set({ status: normalizeText(status) || "active", updatedAt: new Date() })
    .where(eq(hcDisciplinaryActions.id, toId(id)))
    .returning();

  const employee = await getHrEmployeeContactById(updated.employeeId);
  const [category] = updated.violationCategoryId
    ? await db
        .select({ name: hcViolationCategories.name })
        .from(hcViolationCategories)
        .where(eq(hcViolationCategories.id, updated.violationCategoryId))
        .limit(1)
    : [];

  const emailContent = buildHumanCapitalEmail({
    title: "Update status tindakan disipliner",
    intro: "Status tindakan disipliner karyawan telah berubah.",
    details: [
      `Karyawan: ${employee.name}`,
      `Kategori: ${category?.name || "-"}`,
      `SP Level: SP${updated.spLevel}`,
      `Status baru: ${updated.status}`,
    ],
  });

  await sendHumanCapitalEmail({
    templateCode: "hc_disciplinary_status_update",
    templateName: "HC Disciplinary Status Update",
    variables: {
      employeeName: employee.name,
      categoryName: category?.name || "-",
      spLevel: `SP${updated.spLevel}`,
      status: updated.status,
    },
    extraTo: employee.email ? [employee.email] : [],
    fallbackSubject: `Update disipliner: ${employee.name}`,
    fallbackHtml: emailContent.html,
    fallbackText: emailContent.text,
  });

  revalidatePath(DISCIPLINARY_PATH);
  return normalizeAction(updated);
}

export async function deleteDisciplinaryAction(id: IdInput) {
  await db.delete(hcDisciplinaryActions).where(eq(hcDisciplinaryActions.id, toId(id)));
  revalidatePath(DISCIPLINARY_PATH);
  return { success: true };
}

export async function getDisciplinaryStats() {
  const records = await getDisciplinaryActions();
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  return {
    activeSp: records.filter((record) => isActiveRecord(record.status, record.expiryDate)).length,
    expired: records.filter((record) => isExpiredRecord(record.status, record.expiryDate)).length,
    thisMonth: records.filter((record) => new Date(record.violationDate) >= monthStart).length,
    byLevel: {
      SP1: records.filter((record) => record.spLevel === "SP1").length,
      SP2: records.filter((record) => record.spLevel === "SP2").length,
      SP3: records.filter((record) => record.spLevel === "SP3").length,
      Termination: records.filter((record) => record.spLevel === "Termination").length,
    },
  };
}

function isActiveRecord(status: string, expiryDate: string | Date | null) {
  return ["active", "Active"].includes(status) && (!expiryDate || new Date(expiryDate) >= new Date());
}

function isExpiredRecord(status: string, expiryDate: string | Date | null) {
  return ["expired", "Expired"].includes(status) || Boolean(expiryDate && new Date(expiryDate) < new Date());
}

export async function getActiveEmployees() {
  return db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      department: masterDepartments.name,
      position: hrPositions.rankName,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(hrPositions, eq(employees.positionId, hrPositions.id))
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name));
}

export async function getDisciplinaryCount() {
  const [result] = await db.select({ count: count() }).from(hcDisciplinaryActions);
  return result.count;
}

export async function getRecentDisciplinaryActions(days = 30) {
  const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
  return db
    .select()
    .from(hcDisciplinaryActions)
    .where(gte(hcDisciplinaryActions.createdAt, since));
}

function normalizeAction(record: typeof hcDisciplinaryActions.$inferSelect) {
  return {
    ...record,
    categoryId: record.violationCategoryId,
    spLevel: `SP${record.spLevel}`,
    description: record.violationDescription,
  };
}

function normalizeCategory(record: typeof hcViolationCategories.$inferSelect) {
  return {
    ...record,
    defaultSpLevel: `SP${record.defaultSpLevel}`,
  };
}
