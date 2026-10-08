import { db } from "@/db";
import { maritalStatusRequests, employees, masterDepartments, masterSections, sites, approvals } from "@/db/schema";
import { eq, desc, and, asc, sql } from "drizzle-orm";

import { MARITAL_STATUS_OPTIONS, type MaritalStatusOption } from "./marital-status-constants";

export { MARITAL_STATUS_OPTIONS, type MaritalStatusOption };

let schemaInitPromise: Promise<void> | null = null;

export function ensureMaritalStatusRequestSchema() {
  schemaInitPromise ??= (async () => {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS hero_marital_status_requests (
          id SERIAL PRIMARY KEY,
          request_number TEXT NOT NULL UNIQUE,
          employee_id INTEGER NOT NULL REFERENCES hero_employees(id) ON DELETE CASCADE,
          site_id INTEGER REFERENCES hero_sites(id) ON DELETE SET NULL,
          request_date TIMESTAMP NOT NULL DEFAULT NOW(),
          current_marital_status TEXT NOT NULL,
          target_marital_status TEXT NOT NULL,
          reason TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending_approval',
          signature_url TEXT,
          notes TEXT NOT NULL DEFAULT '',
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
        );
      `);
      await db.execute(sql`
        ALTER TABLE hero_marital_status_requests
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW();
      `);
      await db.execute(sql`
        DO $$
        BEGIN
          IF EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'hero_marital_status_requests' AND column_name = 'updatedat'
          ) AND NOT EXISTS (
            SELECT 1 FROM information_schema.columns 
            WHERE table_name = 'hero_marital_status_requests' AND column_name = 'updated_at'
          ) THEN
            ALTER TABLE hero_marital_status_requests RENAME COLUMN updatedat TO updated_at;
          END IF;
        END $$;
      `);
      await db.execute(sql`
        ALTER TABLE hero_approvals
        ADD COLUMN IF NOT EXISTS marital_status_request_id INTEGER;
      `);
      await db.execute(sql`
        UPDATE hero_approvals
        SET status = 'pending'
        WHERE marital_status_request_id IS NOT NULL
          AND status = 'pending_approval';
      `);
      await db.execute(sql`
        UPDATE hero_approvals
        SET status = 'waiting'
        WHERE marital_status_request_id IS NOT NULL
          AND level = 2
          AND status = 'pending'
          AND EXISTS (
            SELECT 1 FROM hero_approvals a1
            WHERE a1.marital_status_request_id = hero_approvals.marital_status_request_id
              AND a1.level = 1
              AND a1.status IN ('pending', 'waiting')
          );
      `);
      await db.execute(sql`
        UPDATE hero_approvals
        SET route_snapshot = REPLACE(REPLACE(REPLACE(route_snapshot, 'Level 1: PJO / HSE / Leader', 'Step 1: PJO / HSE / Leader'), 'Mengetahui (Step 1: Pemeriksa)', 'Step 1: PJO / HSE / Leader'), 'Level 2: Section Head', 'Step 2: Section Head')
        WHERE marital_status_request_id IS NOT NULL;
      `);
    } catch (error) {
      console.warn('[marital-status] ensureMaritalStatusRequestSchema warning:', error);
    }
  })();
  return schemaInitPromise;
}

export async function fetchMaritalStatusRequests(currentEmployeeId?: number) {
  await ensureMaritalStatusRequestSchema();
  const query = db
    .select({
      id: maritalStatusRequests.id,
      requestNumber: maritalStatusRequests.requestNumber,
      requestDate: maritalStatusRequests.requestDate,
      currentMaritalStatus: maritalStatusRequests.currentMaritalStatus,
      targetMaritalStatus: maritalStatusRequests.targetMaritalStatus,
      reason: maritalStatusRequests.reason,
      status: maritalStatusRequests.status,
      notes: maritalStatusRequests.notes,
      signatureUrl: maritalStatusRequests.signatureUrl,
      employeeId: maritalStatusRequests.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      employeeJobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteName: sites.name,
      pendingWith: approvals.approverName,
    })
    .from(maritalStatusRequests)
    .innerJoin(employees, eq(maritalStatusRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(maritalStatusRequests.siteId, sites.id))
    .leftJoin(
      approvals,
      and(
        eq(approvals.maritalStatusRequestId, maritalStatusRequests.id),
        eq(approvals.status, "pending")
      )
    );

  if (currentEmployeeId != null) {
    query.where(eq(maritalStatusRequests.employeeId, currentEmployeeId));
  }

  const rows = await query.orderBy(desc(maritalStatusRequests.createdAt));
  return rows;
}

export async function fetchMaritalStatusRequestById(id: number) {
  await ensureMaritalStatusRequestSchema();
  const [request] = await db
    .select({
      id: maritalStatusRequests.id,
      requestNumber: maritalStatusRequests.requestNumber,
      requestDate: maritalStatusRequests.requestDate,
      currentMaritalStatus: maritalStatusRequests.currentMaritalStatus,
      targetMaritalStatus: maritalStatusRequests.targetMaritalStatus,
      reason: maritalStatusRequests.reason,
      status: maritalStatusRequests.status,
      notes: maritalStatusRequests.notes,
      signatureUrl: maritalStatusRequests.signatureUrl,
      employeeId: maritalStatusRequests.employeeId,
      employeeName: employees.name,
      employeeSn: employees.employeeSn,
      employeeJobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      sectionName: masterSections.name,
      siteName: sites.name,
    })
    .from(maritalStatusRequests)
    .innerJoin(employees, eq(maritalStatusRequests.employeeId, employees.id))
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(maritalStatusRequests.siteId, sites.id))
    .where(eq(maritalStatusRequests.id, id));

  if (!request) return null;

  const approvalHistory = await db
    .select({
      id: approvals.id,
      maritalStatusRequestId: approvals.maritalStatusRequestId,
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
      routeSnapshot: approvals.routeSnapshot,
    })
    .from(approvals)
    .leftJoin(employees, eq(approvals.approverEmployeeId, employees.id))
    .where(eq(approvals.maritalStatusRequestId, id))
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
      step.status === 'approved'
        ? step.signatureUrl ||
          step.approverSignatureDataUrl ||
          (step.approverEmployeeId ? empIdSigMap.get(step.approverEmployeeId) : null) ||
          (step.approverName ? empSigMap.get(step.approverName.trim().toLowerCase()) : null) ||
          null
        : null;

    const rawTitle =
      step.approverJobTitle ||
      (step.approverName ? empTitleMap.get(step.approverName.trim().toLowerCase()) : null) ||
      (step.level === 1 ? 'TE / Leader (Mengetahui)' : 'Atasan Langsung (Menyetujui)');

    return {
      ...step,
      signatureUrl: rawSig,
      approverJobTitle: rawTitle,
    };
  });

  return { ...request, approvalHistory: resolvedHistory };
}
