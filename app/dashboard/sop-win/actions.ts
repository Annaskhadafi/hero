"use server";

import { db } from "@/db";
import {
  sopWinDocuments,
  sopWinRevisions,
  sopWinDepartments,
  sopWinApprovals,
  sopWinDepartmentWorkflows,
  sopWinRequests,
  sopWinRequestApprovals,
  employees,
  masterDepartments,
  masterSections,
  notificationEvents,
  notificationDeliveries,
} from "@/db/schema/hero";
import { eq, desc, asc, sql, and, or, ilike, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail, withDbRetry } from "@/lib/hero-admin";
import { getCurrentMenuPermission } from "@/lib/hero-access";
import {
  ingestRagDocument,
  deleteRagDocument,
  sendRagChat,
} from "@/lib/hero-genius/client";
import path, { join } from "path";
import { mkdir, writeFile } from "fs/promises";
import {
  enqueueSopWinRag,
  getSopWinRagQueueStatus,
  retrySopWinRagItem,
  retryAllFailedSopWinRag,
  deleteSopWinRagQueueItem,
  clearAllCompletedOrFailedQueue,
  triggerSopWinRagWorker,
  syncAndAutoChunkAllSopWinDocuments,
} from "@/lib/sop-win-rag-queue";

import { sendWorkflowEmail, buildWorkflowEmailContent, buildSopWinWorkflowEmailContent, getAppUrl } from "@/lib/workflow-email";
import { randomUUID } from "crypto";
import { notifyWorkflowBellRecipients } from "@/lib/workflow-notification-center";
import { STANDARD_DEPARTMENTS } from "@/lib/sop-win-constants";
import { uploadAnyFileToS3, isS3UploadConfigured } from "@/lib/s3-storage";


function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch (_) {}
}

/**
 * Helper: Ensure sopWinDepartments is seeded
 */
async function ensureSopWinDepartmentsSeeded() {
  try {
    const existing = await db.select({ count: sql<number>`count(*)` }).from(sopWinDepartments);
    if (Number(existing[0]?.count || 0) === 0) {
      // 1. Seed from master departments
      const masterDepts = await db
        .select({
          code: masterDepartments.code,
          name: masterDepartments.name,
          description: masterDepartments.description,
          headEmployeeId: masterDepartments.headEmployeeId,
        })
        .from(masterDepartments)
        .where(eq(masterDepartments.isActive, true));

      for (const md of masterDepts) {
        if (!md.code) continue;
        const code = md.code.trim().toUpperCase();
        try {
          await db
            .insert(sopWinDepartments)
            .values({
              code,
              name: md.name || code,
              description: md.description || "",
              headEmployeeId: md.headEmployeeId || null,
              isActive: true,
            })
            .onConflictDoNothing();
        } catch (_) {}
      }

      // 2. Seed standard departments
      for (const sd of STANDARD_DEPARTMENTS) {
        try {
          await db
            .insert(sopWinDepartments)
            .values({
              code: sd.code.toUpperCase(),
              name: sd.name,
              description: "",
              isActive: true,
            })
            .onConflictDoNothing();
        } catch (_) {}
      }
    }
  } catch (err) {
    console.warn("[ensureSopWinDepartmentsSeeded] warn:", err);
  }
}

/**
 * 0. Get SOP / WIN Dedicated Departments (Isolated from Master Data)
 */
export async function getSopWinDepartmentsAction() {
  try {
    await ensureSopWinDepartmentsSeeded();

    const depts = await db
      .select({
        id: sopWinDepartments.id,
        code: sopWinDepartments.code,
        name: sopWinDepartments.name,
        description: sopWinDepartments.description,
        headEmployeeId: sopWinDepartments.headEmployeeId,
        isActive: sopWinDepartments.isActive,
        headName: employees.name,
        headEmployeeSn: employees.employeeSn,
      })
      .from(sopWinDepartments)
      .leftJoin(employees, eq(sopWinDepartments.headEmployeeId, employees.id))
      .where(eq(sopWinDepartments.isActive, true))
      .orderBy(sopWinDepartments.name);

    // Get document counts per department code
    const docDepts = await db
      .select({ departmentCode: sopWinDocuments.departmentCode })
      .from(sopWinDocuments);

    const docDeptCounts: Record<string, number> = {};
    for (const d of docDepts) {
      const c = (d.departmentCode || "").toUpperCase();
      docDeptCounts[c] = (docDeptCounts[c] || 0) + 1;
    }

    const list = depts.map((d) => ({
      ...d,
      docCount: docDeptCounts[(d.code || "").toUpperCase()] || 0,
    }));

    return { success: true, departments: list };
  } catch (error: any) {
    console.error("[getSopWinDepartmentsAction] error:", error);
    return { success: false, departments: [], error: error.message };
  }
}

/**
 * 0.1 Create New SOP / WIN Department Folder (Isolated from Master Data)
 */
export async function createSopWinDepartmentAction(data: {
  code: string;
  name: string;
  description?: string;
  headEmployeeId?: number | null;
}) {
  try {
    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canEdit) {
      return { success: false, error: "Anda tidak memiliki izin untuk mengelola departemen." };
    }

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    if (!code || !name) {
      return { success: false, error: "Kode dan Nama Departemen wajib diisi." };
    }

    // Check duplicate code in sopWinDepartments only
    const existing = await db
      .select({ id: sopWinDepartments.id, isActive: sopWinDepartments.isActive })
      .from(sopWinDepartments)
      .where(eq(sopWinDepartments.code, code))
      .limit(1);

    if (existing.length > 0) {
      if (!existing[0].isActive) {
        // Reactivate if previously archived/deleted
        await db
          .update(sopWinDepartments)
          .set({
            name,
            description: data.description?.trim() || "",
            headEmployeeId: data.headEmployeeId || null,
            isActive: true,
            updatedAt: new Date(),
          })
          .where(eq(sopWinDepartments.id, existing[0].id));

        safeRevalidatePath("/dashboard/sop-win");
        safeRevalidatePath("/mobile/sop-win");
        return {
          success: true,
          message: `Departemen ${name} (${code}) berhasil diaktifkan kembali!`,
        };
      }
      return { success: false, error: `Departemen dengan kode ${code} sudah ada.` };
    }

    const [inserted] = await db
      .insert(sopWinDepartments)
      .values({
        code,
        name,
        description: data.description?.trim() || "",
        headEmployeeId: data.headEmployeeId || null,
        isActive: true,
      })
      .returning();

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      department: inserted,
      message: `Departemen ${name} (${code}) berhasil ditambahkan!`,
    };
  } catch (error: any) {
    console.error("[createSopWinDepartmentAction] error:", error);
    return { success: false, error: error.message || "Gagal menambahkan departemen." };
  }
}

/**
 * 0.2 Update SOP / WIN Department Folder (Isolated from Master Data)
 */
export async function updateSopWinDepartmentAction(
  id: number,
  data: {
    code: string;
    name: string;
    description?: string;
    headEmployeeId?: number | null;
  }
) {
  try {
    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canEdit) {
      return { success: false, error: "Anda tidak memiliki izin untuk mengedit departemen." };
    }

    const code = data.code.trim().toUpperCase();
    const name = data.name.trim();
    if (!code || !name) {
      return { success: false, error: "Kode dan Nama Departemen wajib diisi." };
    }

    // Get old department data to check if code changed
    const current = await db
      .select({ code: sopWinDepartments.code })
      .from(sopWinDepartments)
      .where(eq(sopWinDepartments.id, id))
      .limit(1);

    const oldCode = current[0]?.code;

    // Check code uniqueness in sopWinDepartments
    const duplicate = await db
      .select({ id: sopWinDepartments.id })
      .from(sopWinDepartments)
      .where(and(eq(sopWinDepartments.code, code), sql`${sopWinDepartments.id} != ${id}`))
      .limit(1);

    if (duplicate.length > 0) {
      return {
        success: false,
        error: `Kode departemen ${code} sudah digunakan oleh folder lain di SOP/WIN.`,
      };
    }

    const [updated] = await db
      .update(sopWinDepartments)
      .set({
        code,
        name,
        description: data.description?.trim() || "",
        headEmployeeId: data.headEmployeeId || null,
        updatedAt: new Date(),
      })
      .where(eq(sopWinDepartments.id, id))
      .returning();

    // If code changed, sync associated documents' departmentCode
    if (oldCode && oldCode.toUpperCase() !== code) {
      await db
        .update(sopWinDocuments)
        .set({ departmentCode: code, updatedAt: new Date() })
        .where(eq(sopWinDocuments.departmentCode, oldCode));
    }

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      department: updated,
      message: `Departemen ${name} (${code}) berhasil diperbarui!`,
    };
  } catch (error: any) {
    console.error("[updateSopWinDepartmentAction] error:", error);
    return { success: false, error: error.message || "Gagal memperbarui departemen." };
  }
}

/**
 * 0.3 Delete SOP / WIN Department Folder (Isolated from Master Data)
 */
export async function deleteSopWinDepartmentAction(id: number) {
  try {
    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canDelete) {
      return { success: false, error: "Anda tidak memiliki izin untuk menghapus departemen." };
    }

    const deptRes = await db
      .select({ id: sopWinDepartments.id, code: sopWinDepartments.code, name: sopWinDepartments.name })
      .from(sopWinDepartments)
      .where(eq(sopWinDepartments.id, id))
      .limit(1);

    if (deptRes.length === 0) {
      return { success: false, error: "Departemen tidak ditemukan." };
    }

    const dept = deptRes[0];

    // Check if there are active documents in this department
    const docs = await db
      .select({ count: sql<number>`count(*)` })
      .from(sopWinDocuments)
      .where(eq(sopWinDocuments.departmentCode, dept.code));

    const docCount = Number(docs[0]?.count || 0);

    if (docCount > 0) {
      return {
        success: false,
        error: `Departemen ${dept.name} (${dept.code}) masih memiliki ${docCount} dokumen aktif. Silakan hapus atau pindahkan dokumen terlebih dahulu sebelum menghapus departemen ini.`,
      };
    }

    // Permanently delete or set isActive: false in sopWinDepartments
    await db.delete(sopWinDepartments).where(eq(sopWinDepartments.id, id));

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      message: `Departemen ${dept.name} (${dept.code}) berhasil dihapus dari SOP & WIN!`,
    };
  } catch (error: any) {
    console.error("[deleteSopWinDepartmentAction] error:", error);
    return { success: false, error: error.message || "Gagal menghapus departemen." };
  }
}


/**
 * 1. Get Dashboard Summary & Analytics
 */
export async function getSopWinDashboardAction() {
  try {
    const allDocs = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        documentType: sopWinDocuments.documentType,
        departmentCode: sopWinDocuments.departmentCode,
        currentRevision: sopWinDocuments.currentRevision,
        status: sopWinDocuments.status,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        createdAt: sopWinDocuments.createdAt,
        updatedAt: sopWinDocuments.updatedAt,
      })
      .from(sopWinDocuments)
      .orderBy(desc(sopWinDocuments.updatedAt));

    // Get departments dynamically
    const deptRes = await getSopWinDepartmentsAction();
    const deptsList = deptRes.success ? deptRes.departments : [];

    const deptCountMap: Record<string, number> = {};
    deptsList.forEach((d: any) => {
      deptCountMap[d.code.toUpperCase()] = 0;
    });

    let totalSop = 0;
    let totalWin = 0;
    let totalPol = 0;

    for (const doc of allDocs) {
      const dCode = (doc.departmentCode || "").toUpperCase();
      if (deptCountMap[dCode] !== undefined) {
        deptCountMap[dCode]++;
      } else {
        deptCountMap[dCode] = 1;
      }

      if (doc.documentType === "SOP") totalSop++;
      else if (doc.documentType === "WIN") totalWin++;
      else if (doc.documentType === "POL") totalPol++;
    }

    const departmentStats = deptsList.map((d: any) => ({
      code: d.code,
      name: d.name,
      count: deptCountMap[d.code.toUpperCase()] || 0,
    }));

    // Total revisions
    const revCountRes = await db
      .select({ count: sql<number>`count(*)` })
      .from(sopWinRevisions);
    const totalRevisions = Number(revCountRes[0]?.count || 0);

    // Latest revisions timeline
    const rawRevisions = await db
      .select({
        id: sopWinRevisions.id,
        documentId: sopWinRevisions.documentId,
        revisionNumber: sopWinRevisions.revisionNumber,
        effectiveDate: sopWinRevisions.effectiveDate,
        changeDescription: sopWinRevisions.changeDescription,
        pdfFileUrl: sopWinRevisions.pdfFileUrl,
        createdAt: sopWinRevisions.createdAt,
        documentTitle: sopWinDocuments.title,
        documentNumber: sopWinDocuments.documentNumber,
        documentType: sopWinDocuments.documentType,
        departmentCode: sopWinDocuments.departmentCode,
      })
      .from(sopWinRevisions)
      .innerJoin(
        sopWinDocuments,
        eq(sopWinRevisions.documentId, sopWinDocuments.id)
      )
      .orderBy(desc(sopWinRevisions.createdAt))
      .limit(6);

    const recentRevisions = rawRevisions.map((r) => ({
      ...r,
      effectiveDate: r.effectiveDate ? r.effectiveDate.toISOString() : null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));

    const recentDocuments = allDocs.slice(0, 5).map((doc) => ({
      ...doc,
      createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      totalDocuments: allDocs.length,
      totalSop,
      totalWin,
      totalPol,
      totalRevisions,
      departmentStats,
      recentRevisions,
      recentDocuments,
    };
  } catch (error: any) {
    console.error("[getSopWinDashboardAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil data dashboard SOP/WIN",
      totalDocuments: 0,
      totalSop: 0,
      totalWin: 0,
      totalPol: 0,
      totalRevisions: 0,
      departmentStats: [],
      recentRevisions: [],
      recentDocuments: [],
    };
  }
}

/**
 * 2. Get Documents List with Filters
 */
export async function getSopWinDocumentsAction(filters?: {
  department?: string;
  type?: string;
  query?: string;
}) {
  try {
    const conditions = [];

    if (filters?.department && filters.department !== "ALL") {
      conditions.push(
        eq(sopWinDocuments.departmentCode, filters.department.toUpperCase())
      );
    }

    if (filters?.type && filters.type !== "ALL") {
      conditions.push(
        eq(sopWinDocuments.documentType, filters.type.toUpperCase())
      );
    }

    if (filters?.query?.trim()) {
      const q = `%${filters.query.trim()}%`;
      conditions.push(
        or(
          ilike(sopWinDocuments.documentNumber, q),
          ilike(sopWinDocuments.title, q),
          ilike(sopWinDocuments.summary, q)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const docs = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        documentType: sopWinDocuments.documentType,
        departmentCode: sopWinDocuments.departmentCode,
        ownerEmployeeId: sopWinDocuments.ownerEmployeeId,
        currentRevision: sopWinDocuments.currentRevision,
        status: sopWinDocuments.status,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
        ragDocumentId: sopWinDocuments.ragDocumentId,
        ragChunksCount: sopWinDocuments.ragChunksCount,
        ragStatus: sopWinDocuments.ragStatus,
        ragErrorMessage: sopWinDocuments.ragErrorMessage,
        ragProcessedAt: sopWinDocuments.ragProcessedAt,
        summary: sopWinDocuments.summary,
        effectiveDate: sopWinDocuments.effectiveDate,
        createdAt: sopWinDocuments.createdAt,
        updatedAt: sopWinDocuments.updatedAt,
        ownerName: employees.name,
        ownerEmployeeSn: employees.employeeSn,
      })
      .from(sopWinDocuments)
      .leftJoin(employees, eq(sopWinDocuments.ownerEmployeeId, employees.id))
      .where(whereClause)
      .orderBy(desc(sopWinDocuments.updatedAt));

    // Also get department breakdown counts dynamically
    const deptRes = await getSopWinDepartmentsAction();
    const deptsList = deptRes.success ? deptRes.departments : [];

    const counts: Record<string, number> = {};
    deptsList.forEach((d: any) => {
      counts[d.code.toUpperCase()] = 0;
    });

    const allDocs = await db
      .select({
        departmentCode: sopWinDocuments.departmentCode,
      })
      .from(sopWinDocuments);

    allDocs.forEach((d) => {
      const c = (d.departmentCode || "").toUpperCase();
      counts[c] = (counts[c] || 0) + 1;
    });

    return {
      success: true,
      documents: docs.map((doc) => ({
        ...doc,
        effectiveDate: doc.effectiveDate ? doc.effectiveDate.toISOString() : null,
        ragProcessedAt: doc.ragProcessedAt ? doc.ragProcessedAt.toISOString() : null,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        updatedAt: doc.updatedAt ? doc.updatedAt.toISOString() : new Date().toISOString(),
      })),
      totalCount: docs.length,
      departmentCounts: counts,
    };
  } catch (error: any) {
    console.error("[getSopWinDocumentsAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil daftar dokumen",
      documents: [],
      totalCount: 0,
      departmentCounts: {},
    };
  }
}

/**
 * 3. Get Document Detail with Complete Revision History
 */
export async function getSopWinDocumentDetailAction(documentId: number) {
  try {
    const docRes = await db
      .select({
        id: sopWinDocuments.id,
        documentNumber: sopWinDocuments.documentNumber,
        title: sopWinDocuments.title,
        documentType: sopWinDocuments.documentType,
        departmentCode: sopWinDocuments.departmentCode,
        ownerEmployeeId: sopWinDocuments.ownerEmployeeId,
        currentRevision: sopWinDocuments.currentRevision,
        status: sopWinDocuments.status,
        pdfFileUrl: sopWinDocuments.pdfFileUrl,
        docxFileUrl: sopWinDocuments.docxFileUrl,
        ragDocumentId: sopWinDocuments.ragDocumentId,
        ragChunksCount: sopWinDocuments.ragChunksCount,
        ragStatus: sopWinDocuments.ragStatus,
        ragErrorMessage: sopWinDocuments.ragErrorMessage,
        ragProcessedAt: sopWinDocuments.ragProcessedAt,
        summary: sopWinDocuments.summary,
        effectiveDate: sopWinDocuments.effectiveDate,
        createdAt: sopWinDocuments.createdAt,
        updatedAt: sopWinDocuments.updatedAt,
        ownerName: employees.name,
        ownerEmployeeSn: employees.employeeSn,
      })
      .from(sopWinDocuments)
      .leftJoin(employees, eq(sopWinDocuments.ownerEmployeeId, employees.id))
      .where(eq(sopWinDocuments.id, documentId))
      .limit(1);

    if (docRes.length === 0) {
      return { success: false, error: "Dokumen tidak ditemukan", document: null, revisions: [] };
    }

    const rawDoc = docRes[0];
    const doc = {
      ...rawDoc,
      effectiveDate: rawDoc.effectiveDate ? rawDoc.effectiveDate.toISOString() : null,
      ragProcessedAt: rawDoc.ragProcessedAt ? rawDoc.ragProcessedAt.toISOString() : null,
      createdAt: rawDoc.createdAt ? rawDoc.createdAt.toISOString() : new Date().toISOString(),
      updatedAt: rawDoc.updatedAt ? rawDoc.updatedAt.toISOString() : new Date().toISOString(),
    };

    const revisions = await db
      .select({
        id: sopWinRevisions.id,
        documentId: sopWinRevisions.documentId,
        revisionNumber: sopWinRevisions.revisionNumber,
        effectiveDate: sopWinRevisions.effectiveDate,
        changeDescription: sopWinRevisions.changeDescription,
        pdfFileUrl: sopWinRevisions.pdfFileUrl,
        docxFileUrl: sopWinRevisions.docxFileUrl,
        ragDocumentId: sopWinRevisions.ragDocumentId,
        ragChunksCount: sopWinRevisions.ragChunksCount,
        ragStatus: sopWinRevisions.ragStatus,
        ragErrorMessage: sopWinRevisions.ragErrorMessage,
        createdAt: sopWinRevisions.createdAt,
        revisedByName: employees.name,
        revisedBySn: employees.employeeSn,
      })
      .from(sopWinRevisions)
      .leftJoin(employees, eq(sopWinRevisions.revisedByEmployeeId, employees.id))
      .where(eq(sopWinRevisions.documentId, documentId))
      .orderBy(desc(sopWinRevisions.createdAt));

    const serializedRevisions = revisions.map((r) => ({
      ...r,
      effectiveDate: r.effectiveDate ? r.effectiveDate.toISOString() : null,
      createdAt: r.createdAt ? r.createdAt.toISOString() : new Date().toISOString(),
    }));

    return {
      success: true,
      document: doc,
      revisions: serializedRevisions,
    };
  } catch (error: any) {
    console.error("[getSopWinDocumentDetailAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal mengambil detail dokumen",
      document: null,
      revisions: [],
    };
  }
}

/**
 * 4. Get Employee List for Owner Selector (Enriched with Head Departments and Head Sections)
 */
export async function getEmployeeOptionsForSopAction() {
  try {
    // Run queries concurrently in parallel using Promise.allSettled to eliminate sequential round-trips and prevent connection timeouts
    const [deptHeadsRes, directSecHeadsRes, sectionLeadersRes, allEmpsRes] = await Promise.allSettled([
      // 1. Query Head Departments
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          position: employees.jobTitle,
          unitName: masterDepartments.name,
          unitCode: masterDepartments.code,
        })
        .from(masterDepartments)
        .innerJoin(employees, eq(masterDepartments.headEmployeeId, employees.id))
        .where(eq(masterDepartments.isActive, true)),

      // 2. Query Head Sections from direct head_employee_id
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          position: employees.jobTitle,
          unitName: masterSections.name,
          unitCode: masterSections.code,
        })
        .from(masterSections)
        .innerJoin(employees, eq(masterSections.headEmployeeId, employees.id))
        .where(eq(masterSections.isActive, true)),

      // 3. Query Leaders / Supervisors assigned to Sections
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          position: employees.jobTitle,
          unitName: masterSections.name,
          unitCode: masterSections.code,
        })
        .from(employees)
        .innerJoin(masterSections, eq(employees.sectionId, masterSections.id))
        .where(
          and(
            eq(employees.employmentStatus, "active"),
            or(
              ilike(employees.jobTitle, "%lead%"),
              ilike(employees.jobTitle, "%head%"),
              ilike(employees.jobTitle, "%spv%"),
              ilike(employees.jobTitle, "%supervisor%"),
              ilike(employees.jobTitle, "%koordinator%"),
              ilike(employees.jobTitle, "%coord%")
            )
          )
        ),

      // 4. Query All Active Employees
      db
        .select({
          id: employees.id,
          name: employees.name,
          employeeSn: employees.employeeSn,
          position: employees.jobTitle,
          department: employees.department,
          section: employees.section,
        })
        .from(employees)
        .where(eq(employees.employmentStatus, "active"))
        .orderBy(employees.name)
        .limit(600),
    ]);

    const deptHeads = deptHeadsRes.status === "fulfilled" ? deptHeadsRes.value : [];
    const directSecHeads = directSecHeadsRes.status === "fulfilled" ? directSecHeadsRes.value : [];
    const sectionLeaders = sectionLeadersRes.status === "fulfilled" ? sectionLeadersRes.value : [];
    const allEmps = allEmpsRes.status === "fulfilled" ? allEmpsRes.value : [];

    // Merge Head Sections
    const secHeadsMap = new Map<number, any>();
    for (const sh of directSecHeads) {
      secHeadsMap.set(sh.id, {
        ...sh,
        position: sh.position || "Head Section",
      });
    }
    for (const sl of sectionLeaders) {
      if (!secHeadsMap.has(sl.id)) {
        secHeadsMap.set(sl.id, {
          ...sl,
          position: sl.position || "Section Leader",
        });
      }
    }
    const secHeads = Array.from(secHeadsMap.values()).sort((a, b) =>
      a.name.localeCompare(b.name)
    );

    // Build structured categorized list
    const picList: Array<{
      id: number;
      name: string;
      employeeSn: string | null;
      position: string | null;
      category: "HEAD_DEPT" | "HEAD_SECTION" | "EMPLOYEE";
      unitLabel: string;
    }> = [];

    const seenKey = new Set<string>();

    // 1. Add Head Sections (PRIORITY)
    for (const sh of secHeads) {
      const key = `HEAD_SECTION_${sh.id}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        picList.push({
          id: sh.id,
          name: sh.name,
          employeeSn: sh.employeeSn || null,
          position: sh.position || "Head of Section",
          category: "HEAD_SECTION",
          unitLabel: `Head Section: ${sh.unitName}`,
        });
      }
    }

    // 2. Add Head Departments
    for (const dh of deptHeads) {
      const key = `HEAD_DEPT_${dh.id}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        picList.push({
          id: dh.id,
          name: dh.name,
          employeeSn: dh.employeeSn || null,
          position: dh.position || "Head of Department",
          category: "HEAD_DEPT",
          unitLabel: `Head Dept: ${dh.unitName} (${dh.unitCode})`,
        });
      }
    }

    // 3. Add all active employees
    for (const emp of allEmps) {
      const key = `EMP_${emp.id}`;
      if (!seenKey.has(key)) {
        seenKey.add(key);
        picList.push({
          id: emp.id,
          name: emp.name,
          employeeSn: emp.employeeSn || null,
          position: emp.position || "Staff",
          category: "EMPLOYEE",
          unitLabel: emp.section || emp.department || "",
        });
      }
    }

    return {
      success: true,
      employees: allEmps,
      picOptions: picList,
      headDepartments: deptHeads,
      headSections: secHeads,
    };
  } catch (error: any) {
    console.error("[getEmployeeOptionsForSopAction] error:", error);
    return {
      success: false,
      employees: [],
      picOptions: [],
      headDepartments: [],
      headSections: [],
    };
  }
}

/**
 * 5. Create SOP / WIN / POL Document with Fast Background RAG Ingestion
 */
export async function createSopWinDocumentAction(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canEdit) {
      return { success: false, error: "Anda tidak memiliki izin (permission) untuk menambah dokumen." };
    }

    const currentEmp = await getEmployeeDisplayDataByEmail(session.user.email);


    const documentNumber = (formData.get("documentNumber") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const documentType = (formData.get("documentType") as string)?.trim() || "SOP";
    const departmentCode = (formData.get("departmentCode") as string)?.trim() || "SERVICE";
    const ownerEmployeeId = formData.get("ownerEmployeeId")
      ? Number(formData.get("ownerEmployeeId"))
      : currentEmp?.id || null;
    const summary = (formData.get("summary") as string)?.trim() || "";
    const revisionNumber = (formData.get("revisionNumber") as string)?.trim() || "00";
    const changeDescription = (formData.get("changeDescription") as string)?.trim() || "Rilis perdana dokumen.";
    const effectiveDateStr = formData.get("effectiveDate") as string;
    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();

    const pdfFile = formData.get("pdfFile") as File | null;
    const docxFile = formData.get("docxFile") as File | null;

    if (!documentNumber || !title) {
      return { success: false, error: "Nomor Dokumen dan Judul wajib diisi." };
    }

    if (!pdfFile || pdfFile.size === 0) {
      return { success: false, error: "File PDF wajib diunggah untuk pratinjau dokumen." };
    }

    // Save PDF to persistent uploads & S3
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfBytes);
    const pdfFilename = `${randomUUID().slice(0, 10)}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, pdfFilename), pdfBuffer);
    let pdfFileUrl = `/api/uploads/${pdfFilename}`;

    if (isS3UploadConfigured()) {
      try {
        const s3Res = await uploadAnyFileToS3(pdfFile, "upload");
        if (s3Res?.url) {
          pdfFileUrl = s3Res.url;
        }
      } catch (s3Err) {
        console.warn("[createSopWinDocumentAction] S3 upload error:", s3Err);
      }
    }

    let docxFileUrl: string | null = null;
    if (docxFile && docxFile.size > 0) {
      const docxBytes = await docxFile.arrayBuffer();
      const docxBuffer = Buffer.from(docxBytes);
      const docxFilename = `${randomUUID().slice(0, 10)}_${docxFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await writeFile(join(uploadDir, docxFilename), docxBuffer);
      docxFileUrl = `/api/uploads/${docxFilename}`;

      if (isS3UploadConfigured()) {
        try {
          const s3DocxRes = await uploadAnyFileToS3(docxFile, "upload");
          if (s3DocxRes?.url) {
            docxFileUrl = s3DocxRes.url;
          }
        } catch (s3Err) {
          console.warn("[createSopWinDocumentAction] S3 docx upload error:", s3Err);
        }
      }
    }


    // Save Document to Database (Initial status: pending RAG processing)
    const inserted = await db
      .insert(sopWinDocuments)
      .values({
        documentNumber,
        title,
        documentType,
        departmentCode: departmentCode.toUpperCase(),
        ownerEmployeeId,
        currentRevision: revisionNumber,
        status: "active",
        pdfFileUrl,
        docxFileUrl,
        ragDocumentId: null,
        ragStatus: "pending",
        ragErrorMessage: null,
        summary,
        effectiveDate,
        createdById: currentEmp?.id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning({ id: sopWinDocuments.id });

    const newDocId = inserted[0].id;

    // Save Initial Revision
    const [insertedRev] = await db
      .insert(sopWinRevisions)
      .values({
        documentId: newDocId,
        revisionNumber,
        effectiveDate,
        changeDescription,
        pdfFileUrl,
        docxFileUrl,
        ragDocumentId: null,
        ragStatus: "pending",
        revisedByEmployeeId: currentEmp?.id || null,
        createdAt: new Date(),
      })
      .returning({ id: sopWinRevisions.id });

    // Enqueue to Sequential Background Worker (Non-blocking)
    const activeFileUrl = docxFileUrl || pdfFileUrl;
    const activeFileType = docxFileUrl ? "docx" : "pdf";
    const activeFileName = docxFile ? docxFile.name : pdfFile.name;

    await enqueueSopWinRag({
      documentId: newDocId,
      revisionId: insertedRev.id,
      fileUrl: activeFileUrl,
      fileName: activeFileName,
      fileType: activeFileType,
    });

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      message: `Dokumen ${documentNumber} berhasil disimpan! OCR & sinkronisasi AI sedang diproses di background.`,
      documentId: newDocId,
    };
  } catch (error: any) {
    console.error("[createSopWinDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menyimpan dokumen SOP/WIN",
    };
  }
}

/**
 * 6. Update Document Metadata & Move Department
 */
export async function updateSopWinDocumentAction(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canEdit) {
      return { success: false, error: "Anda tidak memiliki izin (permission) untuk mengubah dokumen." };
    }

    const documentId = Number(formData.get("documentId"));

    const documentNumber = (formData.get("documentNumber") as string)?.trim();
    const title = (formData.get("title") as string)?.trim();
    const documentType = (formData.get("documentType") as string)?.trim() || "SOP";
    const departmentCode = (formData.get("departmentCode") as string)?.trim() || "SERVICE";
    const ownerEmployeeId = formData.get("ownerEmployeeId")
      ? Number(formData.get("ownerEmployeeId"))
      : null;
    const summary = (formData.get("summary") as string)?.trim() || "";
    const effectiveDateStr = formData.get("effectiveDate") as string;
    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : undefined;

    const pdfFile = formData.get("pdfFile") as File | null;
    const docxFile = formData.get("docxFile") as File | null;

    if (!documentId || !documentNumber || !title) {
      return { success: false, error: "Nomor Dokumen dan Judul wajib diisi." };
    }

    const updatePayload: any = {
      documentNumber,
      title,
      documentType,
      departmentCode: departmentCode.toUpperCase(),
      ownerEmployeeId,
      summary,
      updatedAt: new Date(),
    };

    if (effectiveDate) updatePayload.effectiveDate = effectiveDate;

    // Optional File Replacements
    const uploadDir = join(process.cwd(), "public", "uploads");
    let hasNewFile = false;
    let newFileUrl = "";
    let newFileName = "";
    let newFileType: "pdf" | "docx" = "pdf";

    if (pdfFile && pdfFile.size > 0) {
      const pdfBytes = await pdfFile.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfBytes);
      const pdfFilename = `${randomUUID().slice(0, 10)}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, pdfFilename), pdfBuffer);
      updatePayload.pdfFileUrl = `/api/uploads/${pdfFilename}`;

      if (isS3UploadConfigured()) {
        try {
          const s3Res = await uploadAnyFileToS3(pdfFile, "upload");
          if (s3Res?.url) {
            updatePayload.pdfFileUrl = s3Res.url;
          }
        } catch (s3Err) {
          console.warn("[updateSopWinDocumentAction] S3 upload error:", s3Err);
        }
      }

      hasNewFile = true;
      newFileUrl = updatePayload.pdfFileUrl;
      newFileName = pdfFile.name;
      newFileType = "pdf";
    }

    if (docxFile && docxFile.size > 0) {
      const docxBytes = await docxFile.arrayBuffer();
      const docxBuffer = Buffer.from(docxBytes);
      const docxFilename = `${randomUUID().slice(0, 10)}_${docxFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await mkdir(uploadDir, { recursive: true });
      await writeFile(join(uploadDir, docxFilename), docxBuffer);
      updatePayload.docxFileUrl = `/api/uploads/${docxFilename}`;

      if (isS3UploadConfigured()) {
        try {
          const s3DocxRes = await uploadAnyFileToS3(docxFile, "upload");
          if (s3DocxRes?.url) {
            updatePayload.docxFileUrl = s3DocxRes.url;
          }
        } catch (s3Err) {
          console.warn("[updateSopWinDocumentAction] S3 docx upload error:", s3Err);
        }
      }

      hasNewFile = true;
      newFileUrl = updatePayload.docxFileUrl;
      newFileName = docxFile.name;
      newFileType = "docx";
    }


    if (hasNewFile) {
      updatePayload.ragStatus = "pending";
    }

    await db
      .update(sopWinDocuments)
      .set(updatePayload)
      .where(eq(sopWinDocuments.id, documentId));

    if (hasNewFile) {
      await enqueueSopWinRag({
        documentId,
        fileUrl: newFileUrl,
        fileName: newFileName,
        fileType: newFileType,
      });
    }

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      message: `Dokumen ${documentNumber} berhasil diperbarui!`,
    };
  } catch (error: any) {
    console.error("[updateSopWinDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal memperbarui dokumen",
    };
  }
}

/**
 * 7. Add Revision to Existing Document with Fast Background RAG Ingestion
 */
export async function createSopWinRevisionAction(formData: FormData) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canEdit) {
      return { success: false, error: "Anda tidak memiliki izin (permission) untuk menerbitkan revisi." };
    }

    const currentEmp = await getEmployeeDisplayDataByEmail(session.user.email);
    const documentId = Number(formData.get("documentId"));
    const revisionNumber = (formData.get("revisionNumber") as string)?.trim();
    const changeDescription = (formData.get("changeDescription") as string)?.trim() || "";
    const effectiveDateStr = formData.get("effectiveDate") as string;
    const effectiveDate = effectiveDateStr ? new Date(effectiveDateStr) : new Date();

    const pdfFile = formData.get("pdfFile") as File | null;
    const docxFile = formData.get("docxFile") as File | null;

    if (!documentId || !revisionNumber) {
      return { success: false, error: "ID Dokumen dan Nomor Revisi wajib diisi." };
    }

    if (!pdfFile || pdfFile.size === 0) {
      return { success: false, error: "File PDF revisi baru wajib diunggah." };
    }

    // Save PDF
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfBytes);
    const pdfFilename = `${randomUUID().slice(0, 10)}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, pdfFilename), pdfBuffer);
    let pdfFileUrl = `/api/uploads/${pdfFilename}`;

    if (isS3UploadConfigured()) {
      try {
        const s3Res = await uploadAnyFileToS3(pdfFile, "upload");
        if (s3Res?.url) {
          pdfFileUrl = s3Res.url;
        }
      } catch (s3Err) {
        console.warn("[createSopWinRevisionAction] S3 upload error:", s3Err);
      }
    }

    let docxFileUrl: string | null = null;
    if (docxFile && docxFile.size > 0) {
      const docxBytes = await docxFile.arrayBuffer();
      const docxBuffer = Buffer.from(docxBytes);
      const docxFilename = `${randomUUID().slice(0, 10)}_${docxFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await writeFile(join(uploadDir, docxFilename), docxBuffer);
      docxFileUrl = `/api/uploads/${docxFilename}`;

      if (isS3UploadConfigured()) {
        try {
          const s3DocxRes = await uploadAnyFileToS3(docxFile, "upload");
          if (s3DocxRes?.url) {
            docxFileUrl = s3DocxRes.url;
          }
        } catch (s3Err) {
          console.warn("[createSopWinRevisionAction] S3 docx upload error:", s3Err);
        }
      }
    }


    // Insert Revision with pending RAG status
    const [insertedRev] = await db
      .insert(sopWinRevisions)
      .values({
        documentId,
        revisionNumber,
        effectiveDate,
        changeDescription,
        pdfFileUrl,
        docxFileUrl,
        ragDocumentId: null,
        ragStatus: "pending",
        revisedByEmployeeId: currentEmp?.id || null,
        createdAt: new Date(),
      })
      .returning({ id: sopWinRevisions.id });

    // Update Main Document
    await db
      .update(sopWinDocuments)
      .set({
        currentRevision: revisionNumber,
        pdfFileUrl,
        docxFileUrl: docxFileUrl || undefined,
        ragStatus: "pending",
        effectiveDate,
        updatedAt: new Date(),
      })
      .where(eq(sopWinDocuments.id, documentId));

    // Enqueue new revision to RAG
    const activeFileUrl = docxFileUrl || pdfFileUrl;
    const activeFileType = docxFileUrl ? "docx" : "pdf";
    const activeFileName = docxFile ? docxFile.name : pdfFile.name;

    await enqueueSopWinRag({
      documentId,
      revisionId: insertedRev.id,
      fileUrl: activeFileUrl,
      fileName: activeFileName,
      fileType: activeFileType,
    });

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      message: `Revisi ${revisionNumber} berhasil diterbitkan! OCR & sinkronisasi AI sedang diproses di background.`,
    };
  } catch (error: any) {
    console.error("[createSopWinRevisionAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menerbitkan revisi dokumen",
    };
  }
}

/**
 * 8. Delete SOP / WIN Document
 */
export async function deleteSopWinDocumentAction(documentId: number) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: "Silakan login terlebih dahulu." };
    }

    const perm = await getCurrentMenuPermission("sop-win");
    if (!perm.canDelete) {
      return { success: false, error: "Anda tidak memiliki izin (permission) untuk menghapus dokumen." };
    }

    // Get rag ID

    const doc = await db
      .select({ ragDocumentId: sopWinDocuments.ragDocumentId })
      .from(sopWinDocuments)
      .where(eq(sopWinDocuments.id, documentId))
      .limit(1);

    if (doc[0]?.ragDocumentId) {
      try {
        await deleteRagDocument(doc[0].ragDocumentId);
      } catch (err) {
        console.warn("[deleteSopWinDocumentAction] failed to delete from RAG:", err);
      }
    }

    await db.delete(sopWinDocuments).where(eq(sopWinDocuments.id, documentId));

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");

    return {
      success: true,
      message: "Dokumen berhasil dihapus dari sistem.",
    };
  } catch (error: any) {
    console.error("[deleteSopWinDocumentAction] error:", error);
    return {
      success: false,
      error: error.message || "Gagal menghapus dokumen",
    };
  }
}

/**
 * 9. Get Background RAG Queue Status Action
 */
export async function getSopWinRagQueueStatusAction() {
  return await getSopWinRagQueueStatus();
}

/**
 * 10. Retry Failed RAG Item Action
 */
export async function retrySopWinRagItemAction(documentId: number) {
  const res = await retrySopWinRagItem(documentId);
  if (res.success) {
    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
  }
  return res;
}

/**
 * 11. Retry All Failed RAG Items Action
 */
export async function retryAllFailedSopWinRagAction() {
  const res = await retryAllFailedSopWinRag();
  if (res.success) {
    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
  }
  return res;
}

/**
 * 12. Sync All Documents with RAG and Auto-Chunk unchunked items
 */
export async function syncAndAutoChunkSopWinAction() {
  const res = await syncAndAutoChunkAllSopWinDocuments();
  if (res.success) {
    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
  }
  return res;
}

/**
 * 13. Delete a specific RAG Queue Item Action
 */
export async function deleteSopWinRagQueueItemAction(queueId: number) {
  const res = await deleteSopWinRagQueueItem(queueId);
  if (res.success) {
    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
  }
  return res;
}

/**
 * 14. Clear All Completed or Failed Queue Items Action
 */
export async function clearAllCompletedOrFailedQueueAction() {
  const res = await clearAllCompletedOrFailedQueue();
  if (res.success) {
    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
  }
  return res;
}

// ─── SOP & WIN Approval Engine Actions ────────────────────────────────────────
const DEFAULT_SOP_WIN_STEPS = [
  { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
  { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Draftek / Pembuat Dokumen" },
  { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
];

const PRESET_DEPARTMENT_WORKFLOWS: Record<string, Array<{ stepOrder: number; stepLabel: string; approverRole: string; approverName?: string; approverEmail?: string }>> = {
  HSE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HSE Coordinator", approverName: "Andi Safari", approverEmail: "andi.safari@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "Management Representative HSE", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  CPI: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "CPI & IA Reps. Manager", approverName: "Bardinia Susi E", approverEmail: "bardynia.susi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Management Representative", approverRole: "General Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  HR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "HR-GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "muhammad.iqbal@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  GA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "GA Supervisor", approverName: "Muhammad Iqbal", approverEmail: "muhammad.iqbal@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan HC & GA Manager", approverRole: "HC Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  TECHNICAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "abian.husain@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  TECH: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Technical Leader", approverName: "M. Abian Husain", approverEmail: "abian.husain@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Review Central Service Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 5, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  FINANCE: [],
  LEGAL: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal Supervisor", approverName: "Septi Dian Rahmawati", approverEmail: "dian.rahmawati@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Head of Legal & ERM", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "stupa.gumilang@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  ERM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Legal & ERM Manager", approverName: "Paulus Stupa Gumilang", approverEmail: "stupa.gumilang@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  "SC LOG": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Supply Chain Management Manager", approverName: "Bekti Widyasmoro", approverEmail: "bekti.widyasmoro@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan PIC", approverRole: "PIC Supply Chain", approverName: "Ali Rahman", approverEmail: "ali.rahman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  SERVICE: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Service Operation SPV", approverName: "Apriyanto", approverEmail: "apriyanto.lastam@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Central Services Manager", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  REPAIR: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "ary.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  PA: [],
  CWS: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Wellness Corporate Specialist SPV", approverName: "Tirta Risdianto", approverEmail: "tirta.risdianto@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  RETREAD: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Leader Repair / Retread Operation", approverName: "Ary Maulana", approverEmail: "ary.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Director", approverRole: "Central Service Manager", approverName: "Romy Hidayat", approverEmail: "romy.hidayat@chitraparatama.co.id" },
  ],
  OSM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Office Strategic Management SPV", approverName: "Asep Firdaus", approverEmail: "asep.firdaus@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  MRI: [],
  CORCOM: [],
  FAM: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "didik.wahyudi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Support Facility Management Manager", approverName: "Susanto", approverEmail: "santo.susanto@chitraparatama.co.id" },
  ],
  BIMA: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Business Innovation & Marketing SPV", approverName: "Arif Maulana Gahfar", approverEmail: "arif.maulana@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Pengesahan Manager", approverRole: "Finance & Business Partner Manager", approverName: "Febrian Dani", approverEmail: "febrian.dani@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  "SC EXIM": [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Facility & Maintenance SPV", approverName: "Didik Wahyudi", approverEmail: "didik.wahyudi@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan General Operation Manager", approverRole: "General Operation Manager", approverName: "Parson Sihaloho", approverEmail: "person.sihaloho@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
  "SC PRO": [],
  TC: [
    { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.co.id" },
    { stepOrder: 2, stepLabel: "Penyusunan & Verifikasi Teknis", approverRole: "Training Centre Coordinator", approverName: "Ridho Akmal Sholeh", approverEmail: "ridho.akmalsaleh@chitraparatama.co.id" },
    { stepOrder: 3, stepLabel: "Persetujuan Human Capital Manager", approverRole: "Human Capital Manager", approverName: "Rendra Rachman", approverEmail: "rendra.rachman@chitraparatama.co.id" },
    { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.co.id" },
  ],
};

async function batchEnsureSopWinDocumentApprovalsSeeded(
  docs: Array<{ id: number; departmentCode?: string | null; employeeName?: string | null; employeeEmail?: string | null }>
) {
  if (!docs || docs.length === 0) return;
  try {
    const docIds = docs.map((d) => d.id).filter(Boolean);
    if (docIds.length === 0) return;

    // Fetch documents info (including departmentCode) if missing
    const fullDocs = await withDbRetry(() =>
      db
        .select({
          id: sopWinDocuments.id,
          departmentCode: sopWinDocuments.departmentCode,
          employeeName: employees.name,
          employeeEmail: employees.email,
        })
        .from(sopWinDocuments)
        .leftJoin(employees, eq(sopWinDocuments.ownerEmployeeId, employees.id))
        .where(inArray(sopWinDocuments.id, docIds))
    );

    const docMap = new Map(fullDocs.map((d) => [d.id, d]));

    const existingDocIdsRes = await withDbRetry(() =>
      db
        .select({ documentId: sopWinApprovals.documentId })
        .from(sopWinApprovals)
        .where(inArray(sopWinApprovals.documentId, docIds))
    );

    const seededDocIds = new Set(existingDocIdsRes.map((r) => r.documentId));
    const missingDocs = docs.filter((d) => !seededDocIds.has(d.id));

    if (missingDocs.length === 0) return;

    // Load department workflows from DB
    const deptWorkflowsRes = await withDbRetry(() => db.select().from(sopWinDepartmentWorkflows));
    const workflowMap = new Map(deptWorkflowsRes.map((w) => [w.departmentCode.toUpperCase(), w.steps]));

    const valuesToInsert: Array<typeof sopWinApprovals.$inferInsert> = [];

    for (const docRef of missingDocs) {
      const fullDoc = docMap.get(docRef.id) || docRef;
      const ownerName = fullDoc.employeeName || docRef.employeeName || "Draftek SOP/WIN";
      const ownerEmail = fullDoc.employeeEmail || docRef.employeeEmail || "draftek@chitraparatama.com";
      const deptCode = (fullDoc.departmentCode || docRef.departmentCode || "").toUpperCase();

      // Resolve steps for department
      let stepsToUse = workflowMap.get(deptCode);
      if (!stepsToUse || stepsToUse.length === 0) {
        stepsToUse = PRESET_DEPARTMENT_WORKFLOWS[deptCode] || DEFAULT_SOP_WIN_STEPS;
      }

      for (const step of stepsToUse) {
        const token = `token_sopwin_${docRef.id}_step_${step.stepOrder}_${randomUUID().slice(0, 8)}`;
        const status = "pending";

        const isDraftek = step.approverRole.toLowerCase().includes("draftek") || step.approverRole.toLowerCase().includes("pembuat");
        const approverName = step.approverName || (isDraftek ? ownerName : `${step.approverRole} Approver`);
        const approverEmail = step.approverEmail || (isDraftek ? ownerEmail : `${step.approverRole.toLowerCase().replace(/\s+/g, ".")}@chitraparatama.com`);

        valuesToInsert.push({
          documentId: docRef.id,
          stepOrder: step.stepOrder,
          stepLabel: step.stepLabel,
          approvalToken: token,
          approverName,
          approverEmail,
          approverRole: step.approverRole,
          status,
          remarks: "",
        });
      }
    }

    if (valuesToInsert.length > 0) {
      await db.insert(sopWinApprovals).values(valuesToInsert).onConflictDoNothing();
    }
  } catch (err) {
    console.warn("[batchEnsureSopWinDocumentApprovalsSeeded] warn:", err);
  }
}

export async function getSopWinApprovalsAction(params?: {
  search?: string;
  status?: string;
  departmentCode?: string;
}) {
  try {
    const session = await getServerSession();
    const userEmail = session?.user?.email || "";

    const allDocs = await withDbRetry(() =>
      db
        .select({
          id: sopWinDocuments.id,
          documentNumber: sopWinDocuments.documentNumber,
          title: sopWinDocuments.title,
          documentType: sopWinDocuments.documentType,
          departmentCode: sopWinDocuments.departmentCode,
          ownerEmployeeId: sopWinDocuments.ownerEmployeeId,
          currentRevision: sopWinDocuments.currentRevision,
          status: sopWinDocuments.status,
          pdfFileUrl: sopWinDocuments.pdfFileUrl,
          docxFileUrl: sopWinDocuments.docxFileUrl,
          summary: sopWinDocuments.summary,
          effectiveDate: sopWinDocuments.effectiveDate,
          createdAt: sopWinDocuments.createdAt,
          employeeName: employees.name,
          employeeEmail: employees.email,
          deptName: sopWinDepartments.name,
        })
        .from(sopWinDocuments)
        .leftJoin(employees, eq(sopWinDocuments.ownerEmployeeId, employees.id))
        .leftJoin(sopWinDepartments, eq(sopWinDocuments.departmentCode, sopWinDepartments.code))
        .orderBy(desc(sopWinDocuments.createdAt))
    );

    // Ensure approvals seeded for each document in batch
    await batchEnsureSopWinDocumentApprovalsSeeded(allDocs);

    const docIds = allDocs.map((d) => d.id);
    const steps = docIds.length > 0
      ? await withDbRetry(() =>
          db
            .select()
            .from(sopWinApprovals)
            .where(inArray(sopWinApprovals.documentId, docIds))
            .orderBy(asc(sopWinApprovals.stepOrder))
        )
      : [];

    const stepsByDocId: Record<number, typeof steps> = {};
    for (const st of steps) {
      if (!stepsByDocId[st.documentId]) stepsByDocId[st.documentId] = [];
      stepsByDocId[st.documentId].push(st);
    }

    let items = allDocs.map((doc) => {
      const rawDocSteps = stepsByDocId[doc.id] || [];
      const docSteps = rawDocSteps.map((s) => {
        if (s.signatureDataUrl && s.status === "pending") {
          return { ...s, status: "approved" };
        }
        return s;
      });

      const pendingStep = docSteps.find((s) => s.status === "pending") || docSteps[docSteps.length - 1];
      
      let overallStatus: "pending" | "approved" | "reverted" | "rejected" = "pending";
      if (docSteps.some((s) => s.status === "rejected")) {
        overallStatus = "rejected";
      } else if (docSteps.some((s) => s.status === "reverted")) {
        overallStatus = "reverted";
      } else if (doc.status === "active" || (docSteps.length > 0 && docSteps.every((s) => s.status === "approved" || !!s.signatureDataUrl))) {
        overallStatus = "approved";
      }

      const typeLabel = doc.documentType === "SOP"
        ? "SOP (Standard Operating Procedure)"
        : doc.documentType === "WIN"
        ? "WIN (Work Instruction)"
        : "POL (Policy & Regulation)";

      return {
        id: doc.id,
        documentNumber: doc.documentNumber,
        title: doc.title,
        documentType: doc.documentType,
        categoryLabel: typeLabel,
        departmentCode: doc.departmentCode,
        departmentName: doc.deptName || doc.departmentCode,
        currentRevision: doc.currentRevision || "00",
        pdfFileUrl: doc.pdfFileUrl,
        docxFileUrl: doc.docxFileUrl,
        summary: doc.summary || "",
        effectiveDate: doc.effectiveDate ? doc.effectiveDate.toISOString() : null,
        createdAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        submittedAt: doc.createdAt ? doc.createdAt.toISOString() : new Date().toISOString(),
        ownerEmployeeId: doc.ownerEmployeeId,
        employeeName: doc.employeeName || "Pengaju SOP",
        employeeEmail: doc.employeeEmail || "",
        status: overallStatus,
        stepOrder: pendingStep?.stepOrder || 1,
        stepLabel: pendingStep?.stepLabel || "Penyusunan",
        approverName: pendingStep?.approverName || "Approver SOP",
        approverEmail: pendingStep?.approverEmail || "",
        approverRole: pendingStep?.approverRole || "Reviewer",
        dueInHours: 24,
        isOverdue: false,
        approvals: docSteps.map((s) => ({
          id: s.id,
          stepOrder: s.stepOrder,
          stepLabel: s.stepLabel,
          approverName: s.approverName,
          approverEmail: s.approverEmail,
          approverRole: s.approverRole,
          status: s.status,
          signatureDataUrl: s.signatureDataUrl,
          remarks: s.remarks,
          signedAt: s.signedAt ? s.signedAt.toISOString() : null,
        })),
      };
    });

    // Client/Parameter Filters
    if (params?.search) {
      const q = params.search.toLowerCase().trim();
      items = items.filter(
        (it) =>
          it.documentNumber.toLowerCase().includes(q) ||
          it.title.toLowerCase().includes(q) ||
          it.employeeName.toLowerCase().includes(q) ||
          it.departmentName.toLowerCase().includes(q)
      );
    }

    if (params?.departmentCode && params.departmentCode !== "all") {
      items = items.filter((it) => it.departmentCode.toUpperCase() === params.departmentCode!.toUpperCase());
    }

    const pendingCount = items.filter((it) => it.status === "pending").length;
    const approvedCount = items.filter((it) => it.status === "approved").length;
    const revertedCount = items.filter((it) => it.status === "reverted").length;
    const rejectedCount = items.filter((it) => it.status === "rejected").length;

    if (params?.status && params.status !== "all") {
      items = items.filter((it) => it.status === params.status);
    }

    return {
      success: true,
      documents: items,
      stats: {
        pendingCount,
        approvedCount,
        revertedCount,
        rejectedCount,
        totalCount: items.length,
      },
    };
  } catch (error: any) {
    console.error("[getSopWinApprovalsAction] error:", error);
    return {
      success: false,
      documents: [],
      stats: { pendingCount: 0, approvedCount: 0, revertedCount: 0, rejectedCount: 0, totalCount: 0 },
      error: error.message,
    };
  }
}

export async function approveSopWinDocumentAction(data: {
  documentId: number;
  remarks?: string;
  signatureDataUrl?: string;
}) {
  try {
    const session = await getServerSession();
    const actorEmail = session?.user?.email || "approver@chitraparatama.com";
    const actorName = session?.user?.name || "Approver SOP/WIN";

    const docSteps = await db
      .select()
      .from(sopWinApprovals)
      .where(eq(sopWinApprovals.documentId, data.documentId))
      .orderBy(asc(sopWinApprovals.stepOrder));

    const pendingStep = docSteps.find((s) => s.status === "pending");
    if (!pendingStep) {
      return { success: false, error: "Dokumen ini tidak memiliki tahap approval aktif yang pending." };
    }

    let finalSignature = data.signatureDataUrl || null;
    if (!finalSignature && actorEmail) {
      const emp = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.email, actorEmail))
        .limit(1);
      if (emp.length > 0 && emp[0].signatureDataUrl) {
        finalSignature = emp[0].signatureDataUrl;
      }
    }

    // Update step
    await db
      .update(sopWinApprovals)
      .set({
        status: "approved",
        remarks: data.remarks || "Approved",
        signatureDataUrl: finalSignature,
        signedAt: new Date(),
        approverName: actorName,
        approverEmail: actorEmail,
      })
      .where(eq(sopWinApprovals.id, pendingStep.id));

    // Next step?
    const nextStep = docSteps.find((s) => s.stepOrder > pendingStep.stepOrder && s.status === "pending");
    if (!nextStep) {
      // All approved! Update document status to active
      await db
        .update(sopWinDocuments)
        .set({ status: "active", updatedAt: new Date() })
        .where(eq(sopWinDocuments.id, data.documentId));
    }

    // Insert notification event
    try {
      await db.insert(notificationEvents).values({
        eventType: "sop_win_approval_step_completed",
        payload: {
          documentId: data.documentId,
          stepOrder: pendingStep.stepOrder,
          stepLabel: pendingStep.stepLabel,
          actorName,
          remarks: data.remarks || "",
        },
      } as any);
    } catch (_) {}

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
    return { success: true, message: "Dokumen SOP/WIN berhasil disetujui (Approved)." };
  } catch (error: any) {
    console.error("[approveSopWinDocumentAction] error:", error);
    return { success: false, error: error.message };
  }
}

export async function revertSopWinDocumentAction(data: {
  documentId: number;
  remarks?: string;
}) {
  try {
    const session = await getServerSession();
    const actorName = session?.user?.name || "Approver SOP/WIN";

    const docSteps = await db
      .select()
      .from(sopWinApprovals)
      .where(eq(sopWinApprovals.documentId, data.documentId))
      .orderBy(asc(sopWinApprovals.stepOrder));

    const pendingStep = docSteps.find((s) => s.status === "pending");
    if (pendingStep) {
      await db
        .update(sopWinApprovals)
        .set({
          status: "reverted",
          remarks: data.remarks || "Reverted for revisions",
          signedAt: new Date(),
          approverName: actorName,
        })
        .where(eq(sopWinApprovals.id, pendingStep.id));
    }

    await db
      .update(sopWinDocuments)
      .set({ status: "draft", updatedAt: new Date() })
      .where(eq(sopWinDocuments.id, data.documentId));

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
    return { success: true, message: "Dokumen SOP/WIN dikembalikan (Reverted) untuk perbaikan." };
  } catch (error: any) {
    console.error("[revertSopWinDocumentAction] error:", error);
    return { success: false, error: error.message };
  }
}

export async function rejectSopWinDocumentAction(data: {
  documentId: number;
  remarks?: string;
}) {
  try {
    const session = await getServerSession();
    const actorName = session?.user?.name || "Approver SOP/WIN";

    const docSteps = await db
      .select()
      .from(sopWinApprovals)
      .where(eq(sopWinApprovals.documentId, data.documentId))
      .orderBy(asc(sopWinApprovals.stepOrder));

    const pendingStep = docSteps.find((s) => s.status === "pending");
    if (pendingStep) {
      await db
        .update(sopWinApprovals)
        .set({
          status: "rejected",
          remarks: data.remarks || "Rejected",
          signedAt: new Date(),
          approverName: actorName,
        })
        .where(eq(sopWinApprovals.id, pendingStep.id));
    }

    await db
      .update(sopWinDocuments)
      .set({ status: "archived", updatedAt: new Date() })
      .where(eq(sopWinDocuments.id, data.documentId));

    safeRevalidatePath("/dashboard/sop-win");
    safeRevalidatePath("/mobile/sop-win");
    return { success: true, message: "Dokumen SOP/WIN telah ditolak (Rejected)." };
  } catch (error: any) {
    console.error("[rejectSopWinDocumentAction] error:", error);
    return { success: false, error: error.message };
  }
}

export async function sendSopWinReminderAction(documentId: number) {
  try {
    const [doc] = await db
      .select({ documentNumber: sopWinDocuments.documentNumber, title: sopWinDocuments.title })
      .from(sopWinDocuments)
      .where(eq(sopWinDocuments.id, documentId));

    if (!doc) return { success: false, error: "Dokumen tidak ditemukan." };

    try {
      await db.insert(notificationEvents).values({
        eventType: "sop_win_approval_reminder",
        payload: {
          documentId,
          documentNumber: doc.documentNumber,
          title: doc.title,
          sentAt: new Date().toISOString(),
        },
      } as any);
    } catch (_) {}

    return { success: true, message: `Reminder pengingat approval untuk ${doc.documentNumber} berhasil dikirim.` };
  } catch (error: any) {
    console.error("[sendSopWinReminderAction] error:", error);
    return { success: false, error: error.message };
  }
}

export async function batchApproveSopWinDocumentsAction(data: {
  documentIds: number[];
  signatureDataUrl?: string;
  remarks?: string;
}) {
  let count = 0;
  for (const id of data.documentIds) {
    const res = await approveSopWinDocumentAction({
      documentId: id,
      remarks: data.remarks || "Batch approved",
      signatureDataUrl: data.signatureDataUrl,
    });
    if (res.success) count++;
  }
  return { success: true, count, message: `${count} dokumen SOP/WIN berhasil disetujui (Batch Approved).` };
}

export async function batchRevertSopWinDocumentsAction(data: {
  documentIds: number[];
  remarks?: string;
}) {
  let count = 0;
  for (const id of data.documentIds) {
    const res = await revertSopWinDocumentAction({
      documentId: id,
      remarks: data.remarks || "Batch reverted",
    });
    if (res.success) count++;
  }
  return { success: true, count, message: `${count} dokumen SOP/WIN telah dikembalikan (Batch Reverted).` };
}

export async function batchRejectSopWinDocumentsAction(data: {
  documentIds: number[];
  remarks?: string;
}) {
  let count = 0;
  for (const id of data.documentIds) {
    const res = await rejectSopWinDocumentAction({
      documentId: id,
      remarks: data.remarks || "Batch rejected",
    });
    if (res.success) count++;
  }
  return { success: true, count, message: `${count} dokumen SOP/WIN telah ditolak (Batch Rejected).` };
}

// ─── DEPARTMENT SIGNATORIES RESOLVER ──────────
export async function resolveSopWinDepartmentSignatories(
  departmentCodeRaw?: string | null,
  requesterNameRaw?: string | null,
  requesterDeptRaw?: string | null
) {
  const dept = (departmentCodeRaw || "").trim().toUpperCase();

  let verifierName = "Bardinia Susi E.";
  let verifierTitle = "Continuous Process Improvement & IA Reps. Manager";

  if (dept.includes("HSE") || dept.includes("SAFETY") || dept.includes("CPI")) {
    verifierName = "Rendra Rachman";
    verifierTitle = "Management Representative HSE";
  } else if (dept.includes("HR") || dept.includes("HC") || dept.includes("HUMAN")) {
    verifierName = "Manager Human Capital";
    verifierTitle = "Human Capital & Organizational Development Manager";
  } else if (dept.includes("FINANCE") || dept.includes("FAM") || dept.includes("ACC")) {
    verifierName = "Manager Finance";
    verifierTitle = "Finance, Accounting & Tax Manager";
  } else if (dept.includes("GA") || dept.includes("GENERAL")) {
    verifierName = "Manager General Affairs";
    verifierTitle = "General Affairs & Asset Manager";
  } else if (dept.includes("LEGAL")) {
    verifierName = "Manager Legal";
    verifierTitle = "Legal & Compliance Manager";
  } else if (dept.includes("EXIM") || dept.includes("LOG")) {
    verifierName = "Manager Exim & Logistics";
    verifierTitle = "Export Import & Supply Chain Manager";
  } else if (dept.includes("SERVICE") || dept.includes("REPAIR")) {
    verifierName = "Manager Technical Service";
    verifierTitle = "Technical Service & Repair Manager";
  } else if (dept.includes("CORCOM") || dept.includes("PA")) {
    verifierName = "Manager Corporate Communication";
    verifierTitle = "Public Affairs & Corporate Communication Manager";
  } else if (dept) {
    verifierName = `Manager ${dept}`;
    verifierTitle = `${dept} Department Manager`;
  }

  return {
    creatorName: requesterNameRaw || "Pembuat Dokumen / PIC",
    creatorTitle: requesterDeptRaw || "Pembuat Dokumen / PIC",
    compilerName: "Ria Annisa Putri",
    compilerTitle: "Quality Management Staff",
    verifierName,
    verifierTitle,
    acknowledgerName: "Parson Sihaloho",
    acknowledgerTitle: "General Manager",
    approverName: "Hidayat Rahman",
    approverTitle: "Director",
  };
}

export async function submitSopWinDocumentRequestAction(input: {
  requesterName: string;
  requesterDepartment?: string;
  requestedDocType?: "POL" | "SOP" | "WIN";
  procedureName?: string;
  ownDepartment?: string;
  isProcessOwner?: boolean;
  requestDate?: string;
  isExternal?: boolean;
  externalCompany?: string;
  externalName?: string;
  requestReason: string;
  requestedDocCount?: number;
  requestedDocTitleAndNumber: string;
  fileAttachmentUrl?: string;
  requestType: "softcopy" | "hardcopy";
}) {
  try {
    const session = await getServerSession();
    let requesterEmpId: number | null = null;

    if (session?.user?.email) {
      const empData = await getEmployeeDisplayDataByEmail(session.user.email);
      if (empData) {
        requesterEmpId = empData.id;
      }
    }

    const now = new Date();
    const reqNum = `REQ-DOC-${now.getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
    const accessToken = `token_${randomUUID().replace(/-/g, "")}`;

    // 1. Insert Master Request Record
    const [insertedReq] = await db
      .insert(sopWinRequests)
      .values({
        requestNumber: reqNum,
        requesterEmployeeId: requesterEmpId,
        requesterName: input.requesterName,
        requesterDepartment: input.requesterDepartment || "Internal HERO",
        requestedDocType: input.requestedDocType || "SOP",
        procedureName: input.procedureName || input.requestedDocTitleAndNumber,
        ownDepartment: input.ownDepartment || "",
        isProcessOwner: Boolean(input.isProcessOwner),
        requestDate: input.requestDate || now.toISOString().split("T")[0],
        isExternal: Boolean(input.isExternal),
        externalCompany: input.externalCompany || "",
        externalName: input.externalName || "",
        requestReason: input.requestReason,
        requestedDocCount: input.requestedDocCount || 1,
        requestedDocTitleAndNumber: input.requestedDocTitleAndNumber,
        fileAttachmentUrl: input.fileAttachmentUrl || null,
        requestType: input.requestType || "softcopy",
        expiryDays: 3, // Default 3 days link validity
        accessToken,
        status: "pending_ria",
      })
      .returning();

    // 2. Fetch Department Workflow Steps (from Database or Preset)
    const creatorEmail = session?.user?.email || (input as any).employeeEmail || "";

    const reqDept = (input.requesterDepartment || "").trim().toUpperCase();
    const ownDept = (input.ownDepartment || "").trim().toUpperCase();
    const textToScan = `${reqDept} ${ownDept} ${input.requestedDocTitleAndNumber || ""} ${input.procedureName || ""}`.toUpperCase();

    let detectedDept = "";
    if (/\b(SOP|WIN|POL)[\/._\s]?(CWS|WCS)[\/._\s]/i.test(textToScan) || textToScan.includes("CWS") || textToScan.includes("WELLNESS")) {
      detectedDept = "CWS";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?CPI[\/._\s]/i.test(textToScan) || textToScan.includes("/CPI") || textToScan.includes(".CPI.")) {
      detectedDept = "CPI";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?HSE[\/._\s]/i.test(textToScan) || textToScan.includes("/HSE.") || textToScan.includes(".HSE.") || textToScan.includes("HSE/") || textToScan.includes("SAFETY")) {
      detectedDept = "HSE";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?HR[\/._\s]/i.test(textToScan) || textToScan.includes("/HR.") || textToScan.includes(".HR.") || textToScan.includes("HUMAN CAPITAL")) {
      detectedDept = "HR";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?GA[\/._\s]/i.test(textToScan) || textToScan.includes("/GA.") || textToScan.includes(".GA.") || textToScan.includes("GENERAL AFFAIRS")) {
      detectedDept = "GA";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?TEC[\/._\s]/i.test(textToScan) || textToScan.includes("/TECH") || textToScan.includes(".TECH") || textToScan.includes("TECHNICAL")) {
      detectedDept = "TECHNICAL";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?LGL[\/._\s]/i.test(textToScan) || textToScan.includes("/LEGAL") || textToScan.includes(".LEGAL") || textToScan.includes("SOP.LGL")) {
      detectedDept = "LEGAL";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?ERM[\/._\s]/i.test(textToScan) || textToScan.includes("/ERM.") || textToScan.includes(".ERM.") || textToScan.includes("SOP.ERM") || textToScan.includes("SOP.DRM")) {
      detectedDept = "ERM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?BIM[\/._\s]/i.test(textToScan) || textToScan.includes("BIMA") || textToScan.includes("SOP.BIM") || textToScan.includes("BIM.")) {
      detectedDept = "BIMA";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?FAM[\/._\s]/i.test(textToScan) || textToScan.includes("/FAM.") || textToScan.includes(".FAM.") || textToScan.includes("WIN/FAM") || textToScan.includes("FACILITY") || textToScan.includes("ASSET MANAGEMENT")) {
      detectedDept = "FAM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?(TC|TRC)[\/._\s]/i.test(textToScan) || textToScan.includes("/TC.") || textToScan.includes(".TC.") || textToScan.includes("POL.TC") || textToScan.includes("SOP/TRC") || textToScan.includes("TRAINING")) {
      detectedDept = "TC";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?SCD[\/._\s]/i.test(textToScan) || textToScan.includes("SUPPLY CHAIN") || textToScan.includes("SC LOG")) {
      detectedDept = "SC LOG";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?EXI[\/._\s]/i.test(textToScan) || textToScan.includes("EXIM") || textToScan.includes("SC EXIM")) {
      detectedDept = "SC EXIM";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?SVC[\/._\s]/i.test(textToScan) || textToScan.includes("SERVICE")) {
      detectedDept = "SERVICE";
    } else if (/\b(SOP|WIN|POL)[\/._\s]?REP[\/._\s]/i.test(textToScan) || textToScan.includes("REPAIR")) {
      detectedDept = "REPAIR";
    } else {
      const explicit = (reqDept || ownDept || "").trim().toUpperCase();
      if (explicit.includes("CWS") || explicit.includes("WCS")) detectedDept = "CWS";
      else if (explicit.includes("REPAIR")) detectedDept = "REPAIR";
      else if (explicit.includes("SERVICE")) detectedDept = "SERVICE";
      else if (explicit.includes("CPI")) detectedDept = "CPI";
      else if (explicit.includes("HSE")) detectedDept = "HSE";
      else if (explicit.includes("HR")) detectedDept = "HR";
      else if (explicit.includes("GA")) detectedDept = "GA";
      else if (explicit.includes("LEGAL")) detectedDept = "LEGAL";
      else if (explicit.includes("ERM")) detectedDept = "ERM";
      else detectedDept = explicit || "CPI";
    }

    const deptCode = detectedDept;

    const [customWf] = await db
      .select()
      .from(sopWinDepartmentWorkflows)
      .where(or(eq(sopWinDepartmentWorkflows.departmentCode, deptCode), ilike(sopWinDepartmentWorkflows.departmentName, `%${deptCode}%`)))
      .limit(1);

    const defaultDeptWorkflow = [
      { stepOrder: 1, stepLabel: "Verifikasi Draftek & SOP Admin", approverRole: "Admin SOP", approverName: "Ria Annisa", approverEmail: "ria.annisa@chitraparatama.com" },
      { stepOrder: 2, stepLabel: `Penyusunan & Verifikasi Teknis (${deptCode} Manager)`, approverRole: `${deptCode} Manager`, approverName: `Manager DEPARTMENT ${deptCode}`, approverEmail: "" },
      { stepOrder: 3, stepLabel: "Persetujuan General Manager", approverRole: "General Manager", approverName: "Parson Sihaloho", approverEmail: "parson.sihaloho@chitraparatama.co.id" },
      { stepOrder: 4, stepLabel: "Pengesahan Director", approverRole: "Director", approverName: "Hidayat Rahman", approverEmail: "hidayat.rahman@chitraparatama.com" },
    ];

    const baseSteps: Array<{ stepOrder: number; stepLabel: string; approverRole: string; approverName?: string; approverEmail?: string }> =
      customWf?.steps && (customWf.steps as any[]).length > 0
        ? (customWf.steps as any[])
        : PRESET_DEPARTMENT_WORKFLOWS[deptCode] || defaultDeptWorkflow;

    // Build dynamic approval steps
    const approvalStepsToInsert: Array<{
      requestId: number;
      stepOrder: number;
      stepLabel: string;
      approvalToken: string;
      approverName: string;
      approverEmail: string;
      status: "pending" | "waiting" | "approved";
    }> = baseSteps.map((s, idx) => {
      const isFirst = idx === 0;
      const isCreatorStep =
        !s.approverName || s.approverName === "Pembuat Dokumen / PIC";

      const resolvedApproverName = isCreatorStep
        ? input.requesterName || "Pembuat Dokumen / PIC"
        : s.approverName || "Approver";

      const resolvedApproverEmail = isCreatorStep
        ? creatorEmail
        : s.approverEmail || "";

      return {
        requestId: insertedReq.id,
        stepOrder: idx + 1,
        stepLabel: s.stepLabel || `Tahap ${idx + 1}`,
        approvalToken: `step_${idx + 1}_${randomUUID().replace(/-/g, "")}`,
        approverName: resolvedApproverName,
        approverEmail: resolvedApproverEmail,
        status: (isFirst ? "pending" : "waiting") as "pending" | "waiting",
      };
    });

    // Ensure final Director step is present if not already included in custom workflow
    const hasDirectorStep = approvalStepsToInsert.some((step) =>
      step.approverName?.toLowerCase().includes("hidayat") ||
      step.stepLabel?.toLowerCase().includes("director") ||
      step.stepLabel?.toLowerCase().includes("direktur")
    );

    if (!hasDirectorStep) {
      approvalStepsToInsert.push({
        requestId: insertedReq.id,
        stepOrder: approvalStepsToInsert.length + 1,
        stepLabel: "Pengesahan Director",
        approvalToken: `director_${randomUUID().replace(/-/g, "")}`,
        approverName: "Hidayat Rahman",
        approverEmail: "hidayat.rahman@chitraparatama.com",
        status: "waiting" as "waiting",
      });
    }

    await db.insert(sopWinRequestApprovals).values(approvalStepsToInsert);

    // 3. Trigger Notification Bell & Email for Step 1
    try {
      const pendingApproverEmail = approvalStepsToInsert[0]?.approverEmail || "ria.annisa@chitraparatama.com";
      if (pendingApproverEmail) {
        await notifyWorkflowBellRecipients({
          recipientEmails: [pendingApproverEmail],
          eventType: "sop_win_request_pending",
          category: "approval_requests",
          title: `Permintaan Dokumen SOP/WIN: ${input.requestedDocTitleAndNumber}`,
          body: `${input.requesterName} mengajukan permohonan akses dokumen ${input.requestedDocType} (${input.requestType}). Mohon lakukan review & setujui.`,
          url: `/dashboard/approval`,
          tagPrefix: "sop-win-request",
          metadata: { requestId: insertedReq.id, token: approvalStepsToInsert[0]?.approvalToken || "" },
        });

        const { html, text } = buildSopWinWorkflowEmailContent({
          badgeText: "PERSETUJUAN TAHAP 1",
          title: `Permintaan Dokumen SOP/WIN (${reqNum})`,
          greeting: `Halo ${approvalStepsToInsert[0]?.approverName || 'Quality Management'},`,
          intro: `${input.requesterName} dari departemen ${input.requesterDepartment || 'Internal HERO'} telah mengajukan permohonan akses dokumen ${input.requestedDocType} (${input.requestType === 'softcopy' ? 'Soft Copy' : 'Hard Copy'}). Mohon lakukan review dan persetujuan.`,
          requestNumber: reqNum,
          requesterName: input.requesterName,
          requesterDepartment: input.requesterDepartment,
          requestedDocTitle: input.requestedDocTitleAndNumber,
          procedureName: input.procedureName,
          requestType: input.requestType,
          expiryDays: (input as any).expiryDays || 3,
          requestReason: input.requestReason,
          isExternal: input.isExternal,
          externalCompany: input.externalCompany,
          externalName: input.externalName,
          ctaLabel: "Review & Setujui di Inbox Approval",
          ctaUrl: getAppUrl("/dashboard/approval"),
        });

        await sendWorkflowEmail({
          to: pendingApproverEmail,
          templateCode: "sop_win_request_step1",
          templateName: "Persetujuan Permintaan Dokumen SOP/WIN (Tahap 1)",
          fallbackSubject: `[PERMINTAAN DOKUMEN SOP/WIN] ${reqNum} - ${input.requestedDocTitleAndNumber}`,
          fallbackHtml: html,
          fallbackText: text,
        });
      }
    } catch (bellErr) {
      console.error("[submitSopWinDocumentRequestAction] Email notification error:", bellErr);
    }

    try {
      revalidatePath("/dashboard/sop-win");
      revalidatePath("/dashboard/approval");
    } catch {}

    return {
      success: true,
      request: insertedReq,
      requestId: insertedReq.id,
      requestNumber: reqNum,
      message: `Permintaan dokumen ${reqNum} berhasil dikirim untuk persetujuan (Quality Management & BPI)!`,
    };
  } catch (error: any) {
    console.error("[submitSopWinDocumentRequestAction] error:", error);
    return { success: false, error: error.message || "Gagal mengajukan permintaan dokumen." };
  }
}

export async function reviewSopWinDocumentRequestAction(input: {
  requestId: number;
  action: "approve" | "revert" | "reject";
  remarks?: string;
  expiryDays?: number; // Configured by Ria Annisa in Step 1
  signatureDataUrl?: string;
}) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: errorUserNotLoggedIn() };
    }

    const [req] = await db
      .select()
      .from(sopWinRequests)
      .where(eq(sopWinRequests.id, input.requestId))
      .limit(1);

    if (!req) {
      return { success: false, error: "Permintaan dokumen tidak ditemukan." };
    }

    const steps = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, input.requestId))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    const activeStep = steps.find((s) => s.status === "pending" || s.status === "submitted") || steps.find((s) => s.status !== "approved" && s.status !== "cancelled");
    if (!activeStep) {
      return { success: false, error: "Tidak ada tahap approval aktif yang memerlukan tindakan saat ini." };
    }

    const now = new Date();

    let resolvedSignature = input.signatureDataUrl || null;
    if (!resolvedSignature && session?.user?.email) {
      const [emp] = await db
        .select({ signatureDataUrl: employees.signatureDataUrl })
        .from(employees)
        .where(eq(employees.email, session.user.email))
        .limit(1);
      resolvedSignature = emp?.signatureDataUrl || null;
    }

    // ── REJECT ACTION ──
    if (input.action === "reject") {
      await db
        .update(sopWinRequestApprovals)
        .set({
          status: "rejected",
          remarks: input.remarks || "Permintaan dokumen ditolak.",
          signedAt: null,
          signatureDataUrl: null,
        })
        .where(eq(sopWinRequestApprovals.id, activeStep.id));

      await db
        .update(sopWinRequestApprovals)
        .set({ status: "cancelled", remarks: "" })
        .where(
          and(
            eq(sopWinRequestApprovals.requestId, input.requestId),
            sql`${sopWinRequestApprovals.stepOrder} > ${activeStep.stepOrder}`
          )
        );

      await db
        .update(sopWinRequests)
        .set({ status: "rejected", updatedAt: now })
        .where(eq(sopWinRequests.id, input.requestId));

      try {
        const requesterRecipientEmail = (req as any).requesterEmail || (req as any).employeeEmail || "";

        const { html, text } = buildSopWinWorkflowEmailContent({
          badgeText: "PERMINTAAN DITOLAK",
          title: `Permintaan Dokumen Ditolak (${req.requestNumber})`,
          greeting: `Halo ${req.requesterName},`,
          intro: `Mohon maaf, permintaan dokumen Anda (${req.requestNumber}) telah DITOLAK oleh ${activeStep.approverName}.`,
          requestNumber: req.requestNumber,
          requesterName: req.requesterName,
          requesterDepartment: req.requesterDepartment,
          requestedDocTitle: req.requestedDocTitleAndNumber,
          procedureName: req.procedureName,
          requestType: req.requestType,
          requestReason: req.requestReason,
          isExternal: req.isExternal,
          externalCompany: req.externalCompany,
          externalName: req.externalName,
          statusLabel: "Ditolak",
          remarks: input.remarks || "Tidak disetujui",
          ctaLabel: "Lihat Detail di Dashboard",
          ctaUrl: getAppUrl("/dashboard/sop-win"),
        });

        if (requesterRecipientEmail) {
          await sendWorkflowEmail({
            to: requesterRecipientEmail,
            templateCode: "sop_win_request_rejected",
            templateName: "Penolakan Permintaan Dokumen SOP/WIN",
            fallbackSubject: `[PERMINTAAN DOKUMEN DITOLAK] ${req.requestNumber} - ${req.requestedDocTitleAndNumber}`,
            fallbackHtml: html,
            fallbackText: text,
          });

          await notifyWorkflowBellRecipients({
            recipientEmails: [requesterRecipientEmail],
            eventType: "sop_win_request_rejected",
            category: "approval_requests",
            title: `Permintaan Dokumen Ditolak: ${req.requestNumber}`,
            body: `Permintaan dokumen ${req.requestNumber} ditolak oleh ${activeStep.approverName}.${input.remarks ? ` Alasan: ${input.remarks}` : ''}`,
            url: `/dashboard/sop-win`,
            tagPrefix: `sop-win-request-rejected`,
            metadata: { requestId: req.id },
          }).catch((err) => console.error("Error notifying requester bell on rejected:", err));
        }
      } catch (mailErr) {
        console.error("[reviewSopWinDocumentRequestAction] Reject mail notify error:", mailErr);
      }

      try {
        revalidatePath("/dashboard/sop-win");
        revalidatePath("/dashboard/approval");
      } catch {}

      return { success: true, message: "Permintaan dokumen telah ditolak." };
    }

    // ── REVERT ACTION ──
    if (input.action === "revert") {
      await db
        .update(sopWinRequestApprovals)
        .set({
          status: "reverted",
          remarks: input.remarks || "Permintaan dokumen dikembalikan untuk revisi.",
          signedAt: null,
          signatureDataUrl: null,
        })
        .where(eq(sopWinRequestApprovals.id, activeStep.id));

      await db
        .update(sopWinRequests)
        .set({ status: "reverted", updatedAt: now })
        .where(eq(sopWinRequests.id, input.requestId));

      try {
        const requesterRecipientEmail = (req as any).requesterEmail || (req as any).employeeEmail || "";

        const { html, text } = buildSopWinWorkflowEmailContent({
          badgeText: "REVISI PERMINTAAN",
          title: `Permintaan Dokumen Dikembalikan (${req.requestNumber})`,
          greeting: `Halo ${req.requesterName},`,
          intro: `Permintaan dokumen Anda (${req.requestNumber}) telah DIKEMBALIKAN UNTUK REVISI oleh ${activeStep.approverName}. Silakan perbaiki permohonan Anda.`,
          requestNumber: req.requestNumber,
          requesterName: req.requesterName,
          requesterDepartment: req.requesterDepartment,
          requestedDocTitle: req.requestedDocTitleAndNumber,
          procedureName: req.procedureName,
          requestType: req.requestType,
          requestReason: req.requestReason,
          isExternal: req.isExternal,
          externalCompany: req.externalCompany,
          externalName: req.externalName,
          statusLabel: "Dikembalikan untuk Revisi",
          remarks: input.remarks || "Mohon lengkapi permohonan",
          ctaLabel: "Revisi & Pengajuan Ulang",
          ctaUrl: getAppUrl("/dashboard/sop-win"),
        });

        if (requesterRecipientEmail) {
          await sendWorkflowEmail({
            to: requesterRecipientEmail,
            templateCode: "sop_win_request_reverted",
            templateName: "Pengembalian Permintaan Dokumen SOP/WIN",
            fallbackSubject: `[PERMINTAAN DOKUMEN DIKEMBALIKAN] ${req.requestNumber} - ${req.requestedDocTitleAndNumber}`,
            fallbackHtml: html,
            fallbackText: text,
          });

          await notifyWorkflowBellRecipients({
            recipientEmails: [requesterRecipientEmail],
            eventType: "sop_win_request_reverted",
            category: "approval_requests",
            title: `Permintaan Dokumen Perlu Revisi: ${req.requestNumber}`,
            body: `Permintaan dokumen ${req.requestNumber} dikembalikan oleh ${activeStep.approverName} untuk revisi.${input.remarks ? ` Catatan: ${input.remarks}` : ''}`,
            url: `/dashboard/approval`,
            tagPrefix: `sop-win-request-reverted`,
            metadata: { requestId: req.id },
          }).catch((err) => console.error("Error notifying requester bell on reverted:", err));
        }
      } catch (mailErr) {
        console.error("[reviewSopWinDocumentRequestAction] Revert mail notify error:", mailErr);
      }

      try {
        revalidatePath("/dashboard/sop-win");
        revalidatePath("/dashboard/approval");
      } catch {}

      return { success: true, message: "Permintaan dokumen dikembalikan untuk revisi." };
    }

    // ── APPROVE ACTION ──
    if (input.action === "approve") {
      const nextStep = steps.find((s) => s.stepOrder === activeStep.stepOrder + 1 && s.status !== "cancelled");

      // If there is a next step, unlock it
      if (nextStep) {
        const configuredDays = input.expiryDays && input.expiryDays >= 1 ? input.expiryDays : (req.expiryDays || 3);

        await db
          .update(sopWinRequestApprovals)
          .set({
            status: "approved",
            remarks: input.remarks || `Disetujui Step ${activeStep.stepOrder}`,
            signedAt: now,
            signatureDataUrl: resolvedSignature,
          })
          .where(eq(sopWinRequestApprovals.id, activeStep.id));

        // Unlock Next Step
        await db
          .update(sopWinRequestApprovals)
          .set({ status: "pending" })
          .where(eq(sopWinRequestApprovals.id, nextStep.id));

        const nextStatusName = nextStep.stepOrder === 2 ? "pending_creator" : "pending_owner";
        await db
          .update(sopWinRequests)
          .set({
            expiryDays: configuredDays,
            status: nextStatusName as any,
            updatedAt: now,
          })
          .where(eq(sopWinRequests.id, input.requestId));

        // Notify Next Step Approver
        try {
          if (nextStep.approverEmail) {
            await notifyWorkflowBellRecipients({
              recipientEmails: [nextStep.approverEmail],
              eventType: "sop_win_request_approval_needed",
              category: "approval_requests",
              title: `Approval Permintaan Dokumen: ${req.requestedDocTitleAndNumber}`,
              body: `${activeStep.approverName} telah menyetujui. Memerlukan persetujuan dari ${nextStep.approverName}.`,
              url: `/dashboard/approval`,
              tagPrefix: `sop-win-request-step${nextStep.stepOrder}`,
              metadata: { requestId: req.id },
            });

            const { html, text } = buildSopWinWorkflowEmailContent({
              badgeText: `PERSETUJUAN TAHAP ${nextStep.stepOrder}`,
              title: `Permintaan Dokumen SOP/WIN (${req.requestNumber})`,
              greeting: `Halo ${nextStep.approverName},`,
              intro: `Permintaan dokumen ${req.requestNumber} dari ${req.requesterName} telah disetujui Tahap ${activeStep.stepOrder}. Memerlukan persetujuan Anda sebagai ${nextStep.stepLabel}.`,
              requestNumber: req.requestNumber,
              requesterName: req.requesterName,
              requesterDepartment: req.requesterDepartment,
              requestedDocTitle: req.requestedDocTitleAndNumber,
              procedureName: req.procedureName,
              requestType: req.requestType,
              expiryDays: configuredDays,
              requestReason: req.requestReason,
              isExternal: req.isExternal,
              externalCompany: req.externalCompany,
              externalName: req.externalName,
              statusLabel: `Disetujui Step ${activeStep.stepOrder}`,
              remarks: input.remarks || "Disetujui",
              ctaLabel: "Review & Setujui di Inbox Approval",
              ctaUrl: getAppUrl("/dashboard/approval"),
            });

            await sendWorkflowEmail({
              to: nextStep.approverEmail,
              templateCode: `sop_win_request_step${nextStep.stepOrder}`,
              templateName: `Persetujuan Permintaan Dokumen SOP/WIN (Tahap ${nextStep.stepOrder})`,
              fallbackSubject: `[PERMINTAAN DOKUMEN SOP/WIN] ${req.requestNumber} - Perlu Review Tahap ${nextStep.stepOrder}`,
              fallbackHtml: html,
              fallbackText: text,
            });
          }
        } catch (bellErr) {
          console.error("[reviewSopWinDocumentRequestAction] Next step notify error:", bellErr);
        }

        try {
          revalidatePath("/dashboard/sop-win");
          revalidatePath("/dashboard/approval");
        } catch {}

        return {
          success: true,
          message: `Tahap ${activeStep.stepOrder} disetujui. Diteruskan ke ${nextStep.approverName}.`,
        };
      } else {
        // FINAL STEP APPROVAL -> Complete Request!
        const days = req.expiryDays || 3;
        const expiresAt = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        await db
          .update(sopWinRequestApprovals)
          .set({
            status: "approved",
            remarks: input.remarks || "Disetujui akhir (Approved by All)",
            signedAt: now,
            ...(input.signatureDataUrl ? { signatureDataUrl: input.signatureDataUrl } : {}),
          })
          .where(eq(sopWinRequestApprovals.id, activeStep.id));

        await db
          .update(sopWinRequests)
          .set({
            status: "approved",
            accessExpiresAt: expiresAt,
            updatedAt: now,
          })
          .where(eq(sopWinRequests.id, input.requestId));

        const publicAccessUrl = getAppUrl(`/sop-win/request/${req.accessToken}`);
        const requesterRecipientEmail = (req as any).requesterEmail || (req as any).employeeEmail || "";

        // Send Email & Bell Notification based on Request Type
        try {
          if (req.requestType === "softcopy") {
            if (requesterRecipientEmail) {
              await notifyWorkflowBellRecipients({
                recipientEmails: [requesterRecipientEmail],
                eventType: "sop_win_request_approved_softcopy",
                category: "approval_requests",
                title: `Permintaan Dokumen Disetujui: ${req.requestedDocTitleAndNumber}`,
                body: `Permintaan dokumen Anda telah disetujui lengkap. Link akses dapat dibuka selama ${days} hari kedepan: ${publicAccessUrl}`,
                url: `/sop-win/request/${req.accessToken}`,
                tagPrefix: "sop-win-softcopy-approved",
                metadata: { requestId: req.id, publicAccessUrl, expiresAt },
              });

              const { html, text } = buildSopWinWorkflowEmailContent({
                badgeText: "PERMOHONAN DISETUJUI",
                title: `Akses Dokumen SOP/WIN Disetujui (${req.requestNumber})`,
                greeting: `Halo ${req.requesterName},`,
                intro: `Permintaan dokumen Anda (${req.requestNumber}) telah DISETUJUI LENGKAP. Silakan klik tombol di bawah untuk membuka dan mengunduh dokumen resmi ber-watermark.`,
                requestNumber: req.requestNumber,
                requesterName: req.requesterName,
                requesterDepartment: req.requesterDepartment,
                requestedDocTitle: req.requestedDocTitleAndNumber,
                procedureName: req.procedureName,
                requestType: req.requestType,
                expiryDays: days,
                requestReason: req.requestReason,
                isExternal: req.isExternal,
                externalCompany: req.externalCompany,
                externalName: req.externalName,
                statusLabel: "DISETUJUI LENGKAP",
                remarks: input.remarks || "Disetujui lengkap",
                ctaLabel: "Buka Portal Akses Dokumen",
                ctaUrl: publicAccessUrl,
              });

              await sendWorkflowEmail({
                to: requesterRecipientEmail,
                templateCode: "sop_win_request_approved_softcopy",
                templateName: "Persetujuan Akses Softcopy Dokumen SOP/WIN",
                fallbackSubject: `[PERMINTAAN DOKUMEN DISETUJUI] Link Akses Dokumen SOP/WIN: ${req.requestNumber}`,
                fallbackHtml: html,
                fallbackText: text,
              });
            }
          } else {
            const adminEmail = "ria.annisa@chitraparatama.com";
            await notifyWorkflowBellRecipients({
              recipientEmails: [adminEmail, requesterRecipientEmail].filter(Boolean),
              eventType: "sop_win_request_approved_hardcopy",
              category: "approval_requests",
              title: `Permohonan Cetak Hardcopy Dokumen: ${req.requestedDocTitleAndNumber}`,
              body: `Permohonan cetak hardcopy telah disetujui lengkap. Mohon cetakkan dokumen berikut untuk ${req.requesterName}: ${req.requestedDocTitleAndNumber} (${req.requestedDocCount} pcs).`,
              url: `/dashboard/sop-win`,
              tagPrefix: "sop-win-hardcopy-print",
              metadata: { requestId: req.id, printDocList: req.requestedDocTitleAndNumber },
            });

            const { html, text } = buildSopWinWorkflowEmailContent({
              badgeText: "PERMOHONAN CETAK FISIK",
              title: `Permohonan Cetak Hardcopy Dokumen (${req.requestNumber})`,
              greeting: `Halo Quality Management,`,
              intro: `Permohonan cetak fisik (hardcopy) dokumen berikut telah DISETUJUI LENGKAP. Mohon bantu cetakkan dokumen fisik sesuai permohonan di bawah:`,
              requestNumber: req.requestNumber,
              requesterName: req.requesterName,
              requesterDepartment: req.requesterDepartment,
              requestedDocTitle: req.requestedDocTitleAndNumber,
              procedureName: req.procedureName,
              requestType: req.requestType,
              requestReason: req.requestReason,
              isExternal: req.isExternal,
              externalCompany: req.externalCompany,
              externalName: req.externalName,
              statusLabel: "Disetujui Cetak Hardcopy",
              remarks: input.remarks,
              ctaLabel: "Buka Explorer Dokumen SOP/WIN",
              ctaUrl: getAppUrl("/dashboard/sop-win"),
            });

            await sendWorkflowEmail({
              to: adminEmail,
              templateCode: "sop_win_request_print_hardcopy",
              templateName: "Permohonan Cetak Hardcopy Dokumen SOP/WIN",
              fallbackSubject: `[PERMOHONAN CETAK HARDCOPY] Tolong Cetakkan Dokumen SOP/WIN: ${req.requestNumber}`,
              fallbackHtml: html,
              fallbackText: text,
            });
          }
        } catch (mailErr) {
          console.error("[reviewSopWinDocumentRequestAction] Final approval notify error:", mailErr);
        }

        try {
          revalidatePath("/dashboard/sop-win");
          revalidatePath("/dashboard/approval");
        } catch {}

        return {
          success: true,
          message: req.requestType === "softcopy"
            ? `Permintaan dokumen disetujui lengkap! Link akses dikirim ke pemohon (Berlaku ${days} hari).`
            : `Permintaan hardcopy disetujui! Notifikasi permohonan cetak dikirim ke Ria Annisa Putri.`,
        };
      }
    }

    return { success: false, error: "Aksi tidak dikenali." };
  } catch (error: any) {
    console.error("[reviewSopWinDocumentRequestAction] error:", error);
    return { success: false, error: error.message || "Gagal memproses persetujuan permohonan." };
  }
}

export async function updateSopWinAccessSettingsAction(input: {
  requestId: number;
  expiryDays: number;
  canDownload: boolean;
}) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, error: "Sesi login berakhir. Silakan login kembali." };
    }

    const [req] = await db
      .select()
      .from(sopWinRequests)
      .where(eq(sopWinRequests.id, input.requestId))
      .limit(1);

    if (!req) {
      return { success: false, error: "Permintaan dokumen tidak ditemukan." };
    }

    const days = Math.max(1, Math.min(365, Number(input.expiryDays) || 3));
    const createdTime = new Date(req.createdAt || Date.now()).getTime();
    const newExpiresAt = new Date(createdTime + days * 24 * 60 * 60 * 1000);

    await db
      .update(sopWinRequests)
      .set({
        expiryDays: days,
        accessExpiresAt: newExpiresAt,
        canDownload: Boolean(input.canDownload),
        updatedAt: new Date(),
      })
      .where(eq(sopWinRequests.id, input.requestId));

    revalidatePath("/dashboard/sop-win");
    revalidatePath("/dashboard/approval");

    return {
      success: true,
      message: `Pengaturan akses dokumen #${req.requestNumber} berhasil diperbarui (${days} hari, Download: ${input.canDownload ? 'Boleh Unduh' : 'View Only'}).`,
    };
  } catch (error: any) {
    console.error("[updateSopWinAccessSettingsAction] error:", error);
    return { success: false, error: error.message || "Gagal memperbarui pengaturan akses dokumen." };
  }
}

export async function updateSopWinRequestExpiryDaysAction(input: Parameters<typeof updateSopWinAccessSettingsAction>[0]) {
  return updateSopWinAccessSettingsAction(input);
}

function errorUserNotLoggedIn() {
  return "Sesi login Anda telah berakhir. Silakan login kembali.";
}

export async function getSopWinDocumentRequestsAction() {
  try {
    const list = await withDbRetry(() =>
      db
        .select()
        .from(sopWinRequests)
        .orderBy(desc(sopWinRequests.createdAt))
    );

    const requestIds = list.map((r) => r.id);
    let allApprovals: Array<typeof sopWinRequestApprovals.$inferSelect> = [];
    if (requestIds.length > 0) {
      allApprovals = await withDbRetry(() =>
        db
          .select()
          .from(sopWinRequestApprovals)
          .where(inArray(sopWinRequestApprovals.requestId, requestIds))
          .orderBy(asc(sopWinRequestApprovals.stepOrder))
      );
    }

    const requestsWithSteps = list.map((req) => ({
      ...req,
      approvals: allApprovals.filter((a) => a.requestId === req.id),
    }));

    return { success: true, requests: requestsWithSteps };
  } catch (error: any) {
    console.error("[getSopWinDocumentRequestsAction] error:", error);
    return { success: false, requests: [] };
  }
}

export async function getSopWinDocumentRequestDetailAction(accessToken: string) {
  try {
    const [req] = await db
      .select()
      .from(sopWinRequests)
      .where(eq(sopWinRequests.accessToken, accessToken))
      .limit(1);

    if (!req) {
      return { success: false, error: "Permintaan dokumen tidak ditemukan." };
    }

    const steps = await db
      .select()
      .from(sopWinRequestApprovals)
      .where(eq(sopWinRequestApprovals.requestId, req.id))
      .orderBy(asc(sopWinRequestApprovals.stepOrder));

    const allDbDocs = await db.select().from(sopWinDocuments);

    const rawLines = (req.requestedDocTitleAndNumber || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const documentItems = (rawLines.length > 0 ? rawLines : [req.requestedDocTitleAndNumber || "Dokumen SOP/WIN"]).map((line, idx) => {
      const codeMatch = line.match(/(?:SOP|WIN|POL)[\/._\s][\w.-]+/i);
      const codeStr = codeMatch ? codeMatch[0].replace(/[\/._\s]+/g, "") : "";

      const found = allDbDocs.find((d) => {
        const dbCodeStr = d.documentNumber.replace(/[\/._\s]+/g, "");
        if (codeStr && (dbCodeStr.toLowerCase().includes(codeStr.toLowerCase()) || codeStr.toLowerCase().includes(dbCodeStr.toLowerCase()))) {
          return true;
        }
        if (d.title && (line.toLowerCase().includes(d.title.toLowerCase()) || d.title.toLowerCase().includes(line.toLowerCase()))) {
          return true;
        }
        return false;
      });

      const fallbackPdf = allDbDocs.find((d) => Boolean(d.pdfFileUrl))?.pdfFileUrl || req.fileAttachmentUrl || null;
      const rawPdfUrl = found?.pdfFileUrl || fallbackPdf;
      const pdfUrl = rawPdfUrl ? (
        rawPdfUrl.startsWith("/api/uploads/") ? rawPdfUrl :
        rawPdfUrl.includes("is3.cloudhost.id/onechitra/") ? `/api/uploads/${rawPdfUrl.split("is3.cloudhost.id/onechitra/")[1]}` :
        rawPdfUrl.includes("vision.chitraparatama.com/api/v1/uploads/") ? `/api/uploads/upload/${rawPdfUrl.split("/").pop()}` :
        rawPdfUrl
      ) : null;

      return {
        id: idx + 1,
        title: line,
        documentType: req.requestedDocType || "SOP",
        pdfUrl,
      };
    });

    const now = new Date();
    const isExpired = req.accessExpiresAt ? now >= new Date(req.accessExpiresAt) : false;

    return {
      success: true,
      request: req,
      approvals: steps,
      documentItems,
      isExpired,
    };
  } catch (error: any) {
    console.error("[getSopWinDocumentRequestDetailAction] error:", error);
    return { success: false, error: error.message };
  }
}

export async function publicChatSopWinDocumentAction({
  docTitle,
  message,
  history = [],
}: {
  docTitle: string;
  message: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
}) {
  try {
    const queryWithContext = `Mengenai dokumen "${docTitle}": ${message}`;
    const ragRes: any = await sendRagChat({
      query: queryWithContext,
      messages: history,
      top_k: 4,
    }).catch(() => null);

    const answer = ragRes?.answer || ragRes?.reply || ragRes?.data?.answer || ragRes?.content;
    if (answer) {
      return { success: true, reply: answer, sources: ragRes?.sources || [] };
    }

    return {
      success: true,
      reply: `Dokumen "${docTitle}" mengatur tata cara dan standar pelaksanaan kerja resmi. Pastikan selalu mematuhi instruksi K3 dan urutan langkah yang telah ditetapkan.`,
      sources: [],
    };
  } catch (error: any) {
    console.error("[publicChatSopWinDocumentAction] error:", error);
    return {
      success: true,
      reply: `Dokumen "${docTitle}" mengatur tata cara dan standar pelaksanaan kerja resmi. Pastikan selalu mematuhi instruksi K3 dan urutan langkah yang telah ditetapkan.`,
      sources: [],
    };
  }
}

// ─── Department Workflow Matrix Server Actions ─────────────────────────────────────

// ─── Department Workflow Matrix Server Actions ─────────────────────────────────────

export async function getSopWinDepartmentWorkflowsAction() {
  try {
    const existingWorkflows = await db.select().from(sopWinDepartmentWorkflows);
    
    // Also fetch all departments from sopWinDepartments to ensure full list of 22 depts
    const depts = await db.select().from(sopWinDepartments).where(eq(sopWinDepartments.isActive, true));

    const workflowMap = new Map(existingWorkflows.map((w) => [w.departmentCode.toUpperCase(), w]));

    const result = depts.map((d) => {
      const codeUpper = d.code.toUpperCase();
      const existing = workflowMap.get(codeUpper);
      if (existing) {
        return existing;
      }
      // Fallback to preset or default steps if not yet customized
      const presetSteps = PRESET_DEPARTMENT_WORKFLOWS[codeUpper] || DEFAULT_SOP_WIN_STEPS;
      return {
        id: 0,
        departmentCode: d.code,
        departmentName: d.name,
        steps: presetSteps,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    });

    return { success: true, data: result };
  } catch (error: any) {
    console.error("[getSopWinDepartmentWorkflowsAction] error:", error);
    return { success: false, message: error.message || "Gagal mengambil alur workflow departemen." };
  }
}

export async function upsertSopWinDepartmentWorkflowAction(input: {
  departmentCode: string;
  departmentName: string;
  steps: Array<{
    stepOrder: number;
    stepLabel: string;
    approverRole: string;
    approverName?: string;
    approverEmail?: string;
    approverEmployeeId?: number | null;
  }>;
}) {
  try {
    const session = await getServerSession();
    if (!session?.user?.email) {
      return { success: false, message: "Sesi tidak valid." };
    }

    const { departmentCode, departmentName, steps } = input;
    // Ensure stepOrder is normalized 1..N
    const sortedSteps = steps
      .sort((a, b) => a.stepOrder - b.stepOrder)
      .map((s, idx) => ({ ...s, stepOrder: idx + 1 }));

    const existing = await db
      .select()
      .from(sopWinDepartmentWorkflows)
      .where(eq(sopWinDepartmentWorkflows.departmentCode, departmentCode))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(sopWinDepartmentWorkflows)
        .set({
          departmentName,
          steps: sortedSteps,
          updatedAt: new Date(),
        })
        .where(eq(sopWinDepartmentWorkflows.departmentCode, departmentCode));
    } else {
      await db.insert(sopWinDepartmentWorkflows).values({
        departmentCode,
        departmentName,
        steps: sortedSteps,
        isActive: true,
      });
    }

    try {
      revalidatePath("/dashboard/sop-win");
    } catch {}
    return { success: true, message: `Workflow approval untuk departemen ${departmentName} (${departmentCode}) berhasil diperbarui!` };
  } catch (error: any) {
    console.error("[upsertSopWinDepartmentWorkflowAction] error:", error);
    return { success: false, message: error.message || "Gagal menyimpan workflow departemen." };
  }
}

export async function seedDefaultSopWinDepartmentWorkflowsAction() {
  try {
    const depts = await db.select().from(sopWinDepartments);
    let seededCount = 0;

    for (const d of depts) {
      const codeUpper = d.code.toUpperCase();
      const steps = PRESET_DEPARTMENT_WORKFLOWS[codeUpper] || DEFAULT_SOP_WIN_STEPS;

      const existing = await db
        .select()
        .from(sopWinDepartmentWorkflows)
        .where(eq(sopWinDepartmentWorkflows.departmentCode, d.code))
        .limit(1);

      if (existing.length > 0) {
        await db
          .update(sopWinDepartmentWorkflows)
          .set({
            departmentName: d.name,
            steps,
            updatedAt: new Date(),
          })
          .where(eq(sopWinDepartmentWorkflows.departmentCode, d.code));
      } else {
        await db.insert(sopWinDepartmentWorkflows).values({
          departmentCode: d.code,
          departmentName: d.name,
          steps,
          isActive: true,
        });
      }
      seededCount++;
    }

    try {
      revalidatePath("/dashboard/sop-win");
    } catch {}
    return { success: true, message: `Seeding workflow default untuk ${seededCount} departemen berhasil!` };
  } catch (error: any) {
    console.error("[seedDefaultSopWinDepartmentWorkflowsAction] error:", error);
    return { success: false, message: error.message || "Gagal seeding default workflow departemen." };
  }
}

// HMR Cache Refresh Triggered: 2026-08-26T13:01:00Z
