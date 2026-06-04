"use server";

import { db } from "@/db";
import { hcCertificates, hrDepartments, hrEmployees } from "@/db/schema/hero";
import { and, asc, eq, gte, lte, or, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

const CERTIFICATE_PATH = "/dashboard/hc/certificate";
const DAY_MS = 1000 * 60 * 60 * 24;

export type CertificateStatus = "Active" | "Expiring" | "Expired";

export type CertificateInput = {
  employeeId: string | number;
  employeeName?: string;
  certificateType: string;
  licenseNumber: string;
  issuedDate: string | Date;
  expiryDate: string | Date;
  documentUrl?: string;
};

export async function getCertificates() {
  const rows = await db
    .select({
      id: hcCertificates.id,
      employeeId: sql<number | null>`coalesce(${hcCertificates.employeeId}, ${hrEmployees.id})`,
      employeeName: hcCertificates.employeeName,
      certificateType: hcCertificates.certificateType,
      licenseNumber: hcCertificates.licenseNumber,
      issuedDate: hcCertificates.issuedDate,
      expiryDate: hcCertificates.expiryDate,
      documentUrl: hcCertificates.documentUrl,
      status: hcCertificates.status,
      createdAt: hcCertificates.createdAt,
      updatedAt: hcCertificates.updatedAt,
      employeeCode: hrEmployees.employeeId,
      employeeFullName: hrEmployees.fullName,
      departmentId: hrDepartments.id,
      departmentName: hrDepartments.name,
    })
    .from(hcCertificates)
    .leftJoin(
      hrEmployees,
      or(
        eq(hcCertificates.employeeId, hrEmployees.id),
        eq(hcCertificates.employeeName, hrEmployees.employeeId)
      )
    )
    .leftJoin(hrDepartments, eq(hrEmployees.departmentId, hrDepartments.id))
    .orderBy(asc(hcCertificates.expiryDate));

  return rows.filter(isUsableCertificateRow).map((row) => enrichCertificate(row));
}

export async function getCertificateStats() {
  const certificates = await getCertificates();
  const active = certificates.filter((item) => item.expiryStatus === "Active").length;
  const expiring30 = certificates.filter((item) => item.expiryStatus === "Expiring").length;
  const expired = certificates.filter((item) => item.expiryStatus === "Expired").length;
  const compliant = active + expiring30;
  const complianceRate = certificates.length === 0 ? 100 : Math.round((compliant / certificates.length) * 100);

  return { active, expiring30, expired, complianceRate };
}

export async function createCertificate(data: CertificateInput) {
  const payload = await toCertificatePayload(data);
  const [created] = await db.insert(hcCertificates).values(payload).returning();

  revalidatePath(CERTIFICATE_PATH);
  return enrichCertificate(created);
}

export async function updateCertificate(id: number, data: CertificateInput) {
  assertValidId(id);

  const payload = await toCertificatePayload(data);
  const [updated] = await db
    .update(hcCertificates)
    .set({ ...payload, updatedAt: new Date() })
    .where(eq(hcCertificates.id, id))
    .returning();

  revalidatePath(CERTIFICATE_PATH);
  return enrichCertificate(updated);
}

export async function deleteCertificate(id: number) {
  assertValidId(id);
  await db.delete(hcCertificates).where(eq(hcCertificates.id, id));

  revalidatePath(CERTIFICATE_PATH);
  return { success: true };
}

export async function getCertificateTypes() {
  return ["SIO", "POP", "K3 Umum", "K3 Listrik", "First Aid", "BNSP"];
}

export async function getExpiringCertificates(days = 30) {
  const today = startOfToday();
  const targetDate = addDays(today, Math.max(0, days));
  const rows = await db
    .select()
    .from(hcCertificates)
    .where(and(gte(hcCertificates.expiryDate, today), lte(hcCertificates.expiryDate, targetDate)))
    .orderBy(asc(hcCertificates.expiryDate));

  return rows.filter(isUsableCertificateRow).map((row) => enrichCertificate(row));
}

export async function updateDocumentUrl(id: number, documentUrl: string) {
  assertValidId(id);

  const [updated] = await db
    .update(hcCertificates)
    .set({ documentUrl: documentUrl.trim(), updatedAt: new Date() })
    .where(eq(hcCertificates.id, id))
    .returning();

  revalidatePath(CERTIFICATE_PATH);
  return enrichCertificate(updated);
}

function enrichCertificate<T extends { expiryDate: Date; employeeName: string; employeeFullName?: string | null; employeeCode?: string | null }>(row: T) {
  const daysLeft = getDaysLeft(row.expiryDate);
  const expiryStatus = getExpiryStatus(daysLeft);
  const fallbackEmployeeCode = row.employeeCode ?? (isEmployeeSn(row.employeeName) ? row.employeeName : null);
  const fallbackEmployeeName = isEmployeeSn(row.employeeName) ? `SN ${row.employeeName}` : row.employeeName;

  return {
    ...row,
    employeeCode: fallbackEmployeeCode,
    employeeName: row.employeeFullName ?? fallbackEmployeeName,
    daysLeft,
    expiryStatus,
    status: expiryStatus,
  };
}

function isUsableCertificateRow(row: { employeeName: string; licenseNumber: string; certificateType: string }) {
  return ![row.employeeName, row.licenseNumber, row.certificateType].some(isImportHeaderToken);
}

function isImportHeaderToken(value: string | null | undefined) {
  const trimmed = value?.trim() ?? "";
  return trimmed.startsWith("`") && trimmed.endsWith("`");
}

function isEmployeeSn(value: string | null | undefined) {
  return /^\d{4,}$/.test(value?.trim() ?? "");
}

async function toCertificatePayload(data: CertificateInput) {
  const employeeId = parseRequiredId(data.employeeId, "employeeId");
  const employee = await getEmployeeContext(employeeId);
  const expiryDate = parseRequiredDate(data.expiryDate, "expiryDate");

  return {
    employeeId,
    employeeName: data.employeeName?.trim() || employee?.fullName || "Unknown",
    certificateType: requireText(data.certificateType, "certificateType"),
    licenseNumber: requireText(data.licenseNumber, "licenseNumber"),
    issuedDate: parseRequiredDate(data.issuedDate, "issuedDate"),
    expiryDate,
    documentUrl: data.documentUrl?.trim() ?? "",
    status: getExpiryStatus(getDaysLeft(expiryDate)),
  };
}

async function getEmployeeContext(employeeId: number) {
  const [employee] = await db.select({ fullName: hrEmployees.fullName }).from(hrEmployees).where(eq(hrEmployees.id, employeeId)).limit(1);
  return employee;
}

function getExpiryStatus(daysLeft: number): CertificateStatus {
  if (daysLeft < 0) return "Expired";
  if (daysLeft <= 30) return "Expiring";
  return "Active";
}

function getDaysLeft(expiryDate: Date) {
  return Math.ceil((startOfDay(expiryDate).getTime() - startOfToday().getTime()) / DAY_MS);
}

function startOfToday() {
  return startOfDay(new Date());
}

function addDays(date: Date, days: number) {
  const nextDate = new Date(date);
  nextDate.setDate(nextDate.getDate() + days);
  return nextDate;
}

function startOfDay(date: Date) {
  const nextDate = new Date(date);
  nextDate.setHours(0, 0, 0, 0);
  return nextDate;
}

function parseRequiredDate(value: string | Date, field: string) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error(`${field} tidak valid`);
  return date;
}

function parseRequiredId(value: string | number, field: string) {
  const parsed = typeof value === "number" ? value : Number.parseInt(value, 10);
  if (!Number.isInteger(parsed) || parsed <= 0) throw new Error(`${field} tidak valid`);
  return parsed;
}

function requireText(value: string, field: string) {
  const text = value.trim();
  if (!text) throw new Error(`${field} wajib diisi`);
  return text;
}

function assertValidId(id: number) {
  if (!Number.isInteger(id) || id <= 0) throw new Error("ID sertifikat tidak valid");
}
