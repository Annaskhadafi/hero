"use server";

import { db } from "@/db";
import {
  sopWinDocuments,
  sopWinRevisions,
  sopWinDepartments,
  employees,
  masterDepartments,
  masterSections,
} from "@/db/schema/hero";
import { eq, desc, sql, and, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getServerSession } from "@/lib/auth-session";
import { getEmployeeDisplayDataByEmail } from "@/lib/hero-admin";
import {
  ingestRagDocument,
  deleteRagDocument,
} from "@/lib/hero-genius/client";
import {
  enqueueSopWinRag,
  getSopWinRagQueueStatus,
  retrySopWinRagItem,
  retryAllFailedSopWinRag,
  triggerSopWinRagWorker,
  syncAndAutoChunkAllSopWinDocuments,
} from "@/lib/sop-win-rag-queue";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { randomUUID } from "crypto";
import { STANDARD_DEPARTMENTS } from "@/lib/sop-win-constants";

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
    // 1. Query Head Departments
    const deptHeads = await db
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
      .where(eq(masterDepartments.isActive, true));

    // 2. Query Head Sections from direct head_employee_id
    const directSecHeads = await db
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
      .where(eq(masterSections.isActive, true));

    // Also query Leaders / Supervisors assigned to Sections
    const sectionLeaders = await db
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
      );

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

    // 3. Query All Active Employees
    const allEmps = await db
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
      .limit(600);

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

    // Save PDF to persistent uploads
    const pdfBytes = await pdfFile.arrayBuffer();
    const pdfBuffer = Buffer.from(pdfBytes);
    const pdfFilename = `${randomUUID().slice(0, 10)}_${pdfFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
    const uploadDir = join(process.cwd(), "public", "uploads");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(join(uploadDir, pdfFilename), pdfBuffer);
    const pdfFileUrl = `/api/uploads/${pdfFilename}`;

    let docxFileUrl: string | null = null;
    if (docxFile && docxFile.size > 0) {
      const docxBytes = await docxFile.arrayBuffer();
      const docxBuffer = Buffer.from(docxBytes);
      const docxFilename = `${randomUUID().slice(0, 10)}_${docxFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await writeFile(join(uploadDir, docxFilename), docxBuffer);
      docxFileUrl = `/api/uploads/${docxFilename}`;
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
    const pdfFileUrl = `/api/uploads/${pdfFilename}`;

    let docxFileUrl: string | null = null;
    if (docxFile && docxFile.size > 0) {
      const docxBytes = await docxFile.arrayBuffer();
      const docxBuffer = Buffer.from(docxBytes);
      const docxFilename = `${randomUUID().slice(0, 10)}_${docxFile.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
      await writeFile(join(uploadDir, docxFilename), docxBuffer);
      docxFileUrl = `/api/uploads/${docxFilename}`;
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

