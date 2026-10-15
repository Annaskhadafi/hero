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
        ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
        ADD COLUMN IF NOT EXISTS marriage_date TIMESTAMP,
        ADD COLUMN IF NOT EXISTS spouse_name TEXT,
        ADD COLUMN IF NOT EXISTS residence_status TEXT,
        ADD COLUMN IF NOT EXISTS dependents_count INTEGER DEFAULT 0,
        ADD COLUMN IF NOT EXISTS attachment_url TEXT,
        ADD COLUMN IF NOT EXISTS attachment_name TEXT,
        ADD COLUMN IF NOT EXISTS submitted_by_employee_id INTEGER REFERENCES hero_employees(id) ON DELETE SET NULL;
      `);
      await db.execute(sql`
        ALTER TABLE hero_employees
        ADD COLUMN IF NOT EXISTS spouse_name TEXT,
        ADD COLUMN IF NOT EXISTS marriage_date DATE,
        ADD COLUMN IF NOT EXISTS residence_status TEXT;
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
      marriageDate: maritalStatusRequests.marriageDate,
      spouseName: maritalStatusRequests.spouseName,
      residenceStatus: maritalStatusRequests.residenceStatus,
      dependentsCount: maritalStatusRequests.dependentsCount,
      attachmentUrl: maritalStatusRequests.attachmentUrl,
      attachmentName: maritalStatusRequests.attachmentName,
      submittedByEmployeeId: maritalStatusRequests.submittedByEmployeeId,
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
      marriageDate: maritalStatusRequests.marriageDate,
      spouseName: maritalStatusRequests.spouseName,
      residenceStatus: maritalStatusRequests.residenceStatus,
      dependentsCount: maritalStatusRequests.dependentsCount,
      attachmentUrl: maritalStatusRequests.attachmentUrl,
      attachmentName: maritalStatusRequests.attachmentName,
      submittedByEmployeeId: maritalStatusRequests.submittedByEmployeeId,
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

export interface MarriedOnSiteEmployeeRow {
  id: number;
  employeeSn: string;
  name: string;
  jobTitle: string;
  departmentName: string;
  sectionName: string;
  siteId: number | null;
  siteName: string;
  maritalStatus: string;
  spouseName: string;
  marriageDate: string | null;
  residenceStatus: string;
  dependentsCount: number;
  attachmentUrl: string | null;
  attachmentName: string | null;
  phoneNumber: string;
  email: string;
  directManagerName: string | null;
}

export async function fetchMarriedOnSiteEmployees(): Promise<MarriedOnSiteEmployeeRow[]> {
  await ensureMaritalStatusRequestSchema();

  // Query active employees with Married On Site or Married status
  const rows = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      name: employees.name,
      jobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      deptFallback: employees.department,
      sectionName: masterSections.name,
      secFallback: employees.section,
      siteId: employees.siteId,
      siteName: sites.name,
      locFallback: employees.workLocation,
      maritalStatus: employees.maritalStatus,
      spouseName: employees.spouseName,
      marriageDate: employees.marriageDate,
      residenceStatus: employees.residenceStatus,
      phoneNumber: employees.phoneNumber,
      email: employees.email,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(
      and(
        eq(employees.isActive, true),
        sql`(
          LOWER(${employees.maritalStatus}) LIKE '%married%' 
          OR LOWER(${employees.maritalStatus}) LIKE '%menikah%'
          OR LOWER(${employees.maritalStatus}) LIKE 'k/%'
        )`
      )
    )
    .orderBy(asc(employees.name));

  // Also query latest approved requests to enrich spouse & attachment details if available
  const approvedReqs = await db
    .select({
      employeeId: maritalStatusRequests.employeeId,
      spouseName: maritalStatusRequests.spouseName,
      marriageDate: maritalStatusRequests.marriageDate,
      residenceStatus: maritalStatusRequests.residenceStatus,
      dependentsCount: maritalStatusRequests.dependentsCount,
      attachmentUrl: maritalStatusRequests.attachmentUrl,
      attachmentName: maritalStatusRequests.attachmentName,
    })
    .from(maritalStatusRequests)
    .where(eq(maritalStatusRequests.status, 'approved'))
    .orderBy(desc(maritalStatusRequests.id));

  const reqByEmpId = new Map(approvedReqs.map((r) => [r.employeeId, r]));

  // Managers lookup
  const managerIds = Array.from(new Set(rows.map((r) => r.directManagerId).filter(Boolean))) as number[];
  const managerMap = new Map<number, string>();
  if (managerIds.length > 0) {
    const mgrs = await db
      .select({ id: employees.id, name: employees.name })
      .from(employees)
      .where(sql`${employees.id} IN (${sql.join(managerIds.map((id) => sql`${id}`), sql`, `)})`);
    mgrs.forEach((m) => managerMap.set(m.id, m.name));
  }

  return rows.map((r) => {
    const req = reqByEmpId.get(r.id);
    return {
      id: r.id,
      employeeSn: r.employeeSn || '-',
      name: r.name || '-',
      jobTitle: r.jobTitle || '-',
      departmentName: r.departmentName || r.deptFallback || '-',
      sectionName: r.sectionName || r.secFallback || '-',
      siteId: r.siteId,
      siteName: r.siteName || r.locFallback || '-',
      maritalStatus: r.maritalStatus || 'Married On Site',
      spouseName: r.spouseName || req?.spouseName || '-',
      marriageDate: r.marriageDate ? String(r.marriageDate) : req?.marriageDate ? new Date(req.marriageDate).toISOString().split('T')[0] : null,
      residenceStatus: r.residenceStatus || req?.residenceStatus || 'Mess / Perumahan On Site',
      dependentsCount: req?.dependentsCount || 0,
      attachmentUrl: req?.attachmentUrl || null,
      attachmentName: req?.attachmentName || null,
      phoneNumber: r.phoneNumber || '-',
      email: r.email || '-',
      directManagerName: r.directManagerId ? managerMap.get(r.directManagerId) || null : null,
    };
  });
}

export interface MaritalStatusAnalyticsData {
  totalEmployees: number;
  totalMarriedOnSite: number;
  totalSingleOnSite: number;
  totalOtherMarital: number;
  pendingRequests: number;
  approvedRequests: number;
  rejectedRequests: number;
  siteDistribution: { siteName: string; count: number }[];
  departmentDistribution: { departmentName: string; count: number }[];
  residenceDistribution: { residenceStatus: string; count: number }[];
  recentRequestsCount: number;
}

export async function fetchMaritalStatusAnalytics(): Promise<MaritalStatusAnalyticsData> {
  await ensureMaritalStatusRequestSchema();

  const [allEmps, allRequests] = await Promise.all([
    db
      .select({
        id: employees.id,
        maritalStatus: employees.maritalStatus,
        siteName: sites.name,
        locFallback: employees.workLocation,
        departmentName: masterDepartments.name,
        deptFallback: employees.department,
        residenceStatus: employees.residenceStatus,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
      .where(eq(employees.isActive, true)),
    db
      .select({
        id: maritalStatusRequests.id,
        status: maritalStatusRequests.status,
        residenceStatus: maritalStatusRequests.residenceStatus,
        createdAt: maritalStatusRequests.createdAt,
      })
      .from(maritalStatusRequests),
  ]);

  let totalMarriedOnSite = 0;
  let totalSingleOnSite = 0;
  let totalOtherMarital = 0;
  const siteCounts = new Map<string, number>();
  const deptCounts = new Map<string, number>();
  const residenceCounts = new Map<string, number>();

  for (const emp of allEmps) {
    const raw = (emp.maritalStatus || '').trim().toLowerCase();
    const isMarried = raw.includes('married') || raw.includes('menikah') || raw.startsWith('k/');
    const isSingle = raw.includes('single') || raw.includes('belum') || raw === '' || raw === 'none';

    if (isMarried) {
      totalMarriedOnSite++;
      const site = emp.siteName || emp.locFallback || 'Unknown Site';
      siteCounts.set(site, (siteCounts.get(site) || 0) + 1);

      const dept = emp.departmentName || emp.deptFallback || 'Other';
      deptCounts.set(dept, (deptCounts.get(dept) || 0) + 1);

      const res = emp.residenceStatus || 'Mess On Site';
      residenceCounts.set(res, (residenceCounts.get(res) || 0) + 1);
    } else if (isSingle) {
      totalSingleOnSite++;
    } else {
      totalOtherMarital++;
    }
  }

  // Also include residence counts from approved requests if available
  for (const req of allRequests) {
    if (req.residenceStatus && req.status === 'approved') {
      residenceCounts.set(req.residenceStatus, (residenceCounts.get(req.residenceStatus) || 0) + 1);
    }
  }

  const pendingRequests = allRequests.filter((r) => r.status === 'pending_approval' || r.status === 'pending').length;
  const approvedRequests = allRequests.filter((r) => r.status === 'approved').length;
  const rejectedRequests = allRequests.filter((r) => r.status === 'rejected').length;

  const siteDistribution = Array.from(siteCounts.entries())
    .map(([siteName, count]) => ({ siteName, count }))
    .sort((a, b) => b.count - a.count);

  const departmentDistribution = Array.from(deptCounts.entries())
    .map(([departmentName, count]) => ({ departmentName, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 7);

  const residenceDistribution = Array.from(residenceCounts.entries())
    .map(([residenceStatus, count]) => ({ residenceStatus, count }))
    .sort((a, b) => b.count - a.count);

  return {
    totalEmployees: allEmps.length,
    totalMarriedOnSite,
    totalSingleOnSite,
    totalOtherMarital,
    pendingRequests,
    approvedRequests,
    rejectedRequests,
    siteDistribution,
    departmentDistribution,
    residenceDistribution,
    recentRequestsCount: allRequests.length,
  };
}

export interface MaritalPickerEmployee {
  id: number;
  employeeSn: string;
  name: string;
  jobTitle: string;
  departmentName: string;
  sectionName: string;
  siteId: number | null;
  siteName: string;
  maritalStatus: string;
  directManagerId: number | null;
  directManagerName: string | null;
  directManagerEmail: string | null;
}

export async function fetchEmployeesForMaritalPicker(): Promise<MaritalPickerEmployee[]> {
  const rows = await db
    .select({
      id: employees.id,
      employeeSn: employees.employeeSn,
      name: employees.name,
      jobTitle: employees.jobTitle,
      departmentName: masterDepartments.name,
      deptFallback: employees.department,
      sectionName: masterSections.name,
      secFallback: employees.section,
      siteId: employees.siteId,
      siteName: sites.name,
      locFallback: employees.workLocation,
      maritalStatus: employees.maritalStatus,
      directManagerId: employees.directManagerId,
    })
    .from(employees)
    .leftJoin(masterDepartments, eq(employees.departmentId, masterDepartments.id))
    .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
    .leftJoin(sites, eq(employees.siteId, sites.id))
    .where(eq(employees.isActive, true))
    .orderBy(asc(employees.name));

  // Find manager details
  const managerIds = Array.from(new Set(rows.map((r) => r.directManagerId).filter(Boolean))) as number[];
  const managerMap = new Map<number, { name: string; email: string }>();
  if (managerIds.length > 0) {
    const mgrs = await db
      .select({ id: employees.id, name: employees.name, email: employees.email })
      .from(employees)
      .where(sql`${employees.id} IN (${sql.join(managerIds.map((id) => sql`${id}`), sql`, `)})`);
    mgrs.forEach((m) => managerMap.set(m.id, { name: m.name, email: m.email }));
  }

  return rows.map((r) => {
    const mgr = r.directManagerId ? managerMap.get(r.directManagerId) : null;
    return {
      id: r.id,
      employeeSn: r.employeeSn || '',
      name: r.name || '',
      jobTitle: r.jobTitle || '',
      departmentName: r.departmentName || r.deptFallback || '',
      sectionName: r.sectionName || r.secFallback || '',
      siteId: r.siteId,
      siteName: r.siteName || r.locFallback || '',
      maritalStatus: r.maritalStatus || 'Single On Site',
      directManagerId: r.directManagerId,
      directManagerName: mgr?.name || null,
      directManagerEmail: mgr?.email || null,
    };
  });
}

