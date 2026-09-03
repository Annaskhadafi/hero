import { db } from "@/db";
import { apdRequests, apdRequestItems, employees, masterDepartments, sites, approvals } from "@/db/schema/hero";
import { eq, desc, and, asc, sql } from "drizzle-orm";
import type { ApdRequestCategory } from "@/lib/apd-status";

let apdSchemaReady: Promise<void> | null = null;

export function ensureApdRequestSchema() {
  apdSchemaReady ??= db.execute(sql`
    ALTER TABLE hero_apd_requests
    ADD COLUMN IF NOT EXISTS request_category text NOT NULL DEFAULT 'APD'
  `).then(() => undefined).catch((error) => {
    apdSchemaReady = null;
    throw error;
  });
  return apdSchemaReady;
}

export async function fetchApdRequests(currentEmployeeId?: number) {
  await ensureApdRequestSchema();
  const query = db
    .select({
      id: apdRequests.id,
      requestNumber: apdRequests.requestNumber,
      requestDate: apdRequests.requestDate,
      requestCategory: apdRequests.requestCategory,
      status: apdRequests.status,
      notes: apdRequests.notes,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      siteName: sites.name,
      employeeId: apdRequests.employeeId,
      pendingWith: approvals.approverName,
    })
    .from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .leftJoin(
      approvals,
      and(
        eq(approvals.apdRequestId, apdRequests.id),
        eq(approvals.status, "pending")
      )
    );
    
  if (currentEmployeeId != null) {
    query.where(eq(apdRequests.employeeId, currentEmployeeId));
  }

  const rows = await query.orderBy(desc(apdRequests.createdAt));
  
  return rows;
}

export async function fetchApdRequestById(id: number) {
  await ensureApdRequestSchema();
  const [request] = await db
    .select({
      id: apdRequests.id,
      requestNumber: apdRequests.requestNumber,
      requestDate: apdRequests.requestDate,
      requestCategory: apdRequests.requestCategory,
      status: apdRequests.status,
      notes: apdRequests.notes,
      signatureUrl: apdRequests.signatureUrl,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      departmentName: masterDepartments.name,
      siteName: sites.name,
      employeeId: apdRequests.employeeId,
    })
    .from(apdRequests)
    .innerJoin(employees, eq(apdRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .innerJoin(sites, eq(apdRequests.siteId, sites.id))
    .where(eq(apdRequests.id, id));

  if (!request) return null;

  const items = await db
    .select()
    .from(apdRequestItems)
    .where(eq(apdRequestItems.requestId, id));

  const approvalHistory = await db
    .select({
      id: approvals.id,
      apdRequestId: approvals.apdRequestId,
      level: approvals.level,
      status: approvals.status,
      approverName: approvals.approverName,
      approverEmployeeId: approvals.approverEmployeeId,
      approverJobTitle: employees.jobTitle,
      approverSignatureDataUrl: employees.signatureDataUrl,
      decisionNote: approvals.decisionNote,
      signatureUrl: approvals.signatureUrl,
      reviewedAt: approvals.reviewedAt,
      createdAt: approvals.createdAt,
    })
    .from(approvals)
    .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
    .where(eq(approvals.apdRequestId, id))
    .orderBy(asc(approvals.level));

  const allEmployeesWithSig = await db
    .select({ id: employees.id, name: employees.name, sig: employees.signatureDataUrl, title: employees.jobTitle })
    .from(employees)
    .where(sql`${employees.signatureDataUrl} IS NOT NULL AND ${employees.signatureDataUrl} != ''`);

  const empSigMap = new Map(allEmployeesWithSig.map((e) => [e.name.trim().toLowerCase(), e.sig]));
  const empIdSigMap = new Map(allEmployeesWithSig.map((e) => [e.id, e.sig]));
  const empTitleMap = new Map(allEmployeesWithSig.map((e) => [e.name.trim().toLowerCase(), e.title]));

  const resolvedHistory = approvalHistory.map((step) => {
    const rawSig =
      step.signatureUrl ||
      step.approverSignatureDataUrl ||
      (step.approverEmployeeId ? empIdSigMap.get(step.approverEmployeeId) : null) ||
      (step.approverName ? empSigMap.get(step.approverName.trim().toLowerCase()) : null) ||
      null;

    const rawTitle =
      step.approverJobTitle ||
      (step.approverName ? empTitleMap.get(step.approverName.trim().toLowerCase()) : null) ||
      'Pemeriksa / Atasan';

    return {
      ...step,
      signatureUrl: rawSig,
      approverJobTitle: rawTitle,
    };
  });

  return { ...request, items, approvalHistory: resolvedHistory };
}

export async function fetchApdItemOptions(category: ApdRequestCategory) {
  await ensureApdRequestSchema();
  const rows = await db
    .select({ itemType: apdRequestItems.itemType })
    .from(apdRequestItems)
    .innerJoin(apdRequests, eq(apdRequestItems.requestId, apdRequests.id))
    .where(eq(apdRequests.requestCategory, category));

  return [...new Set(rows.map((row) => row.itemType.trim().toUpperCase()).filter(Boolean))].sort();
}
