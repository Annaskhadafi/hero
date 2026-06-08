"use server";

import { db } from "@/db";
import {
  hcRecruitments,
  hcCandidates,
  hcCandidateStages,
  hrEmployees,
  masterDepartments,
  masterSections,
  emailDeliveryLogs,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count, isNull, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";

// ─── Types ────────────────────────────────────────────────────────────────

export type RecruitmentFilter = {
  status?: string;
};

export type RecruitmentData = {
  jobTitle: string;
  department: string;
  section: string;
  location: string;
  totalRequested: number;
  status?: string;
  startDate?: string | null;
  endDate?: string | null;
  isPublic?: boolean;
  jobDescription?: string;
  requirements?: string;
  qualifications?: string[];
  mandatoryFields?: string[];
  emailTemplateId?: number | null;
};

export type CandidateData = {
  recruitmentId: number;
  fullName: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string | null;
  address?: string;
  gender?: string;
  workExperience?: Array<{ company: string; role: string; yearIn: string; yearOut: string; description: string }>;
  education?: Array<{ level: string; institution: string; major: string; yearIn: string; yearOut: string }>;
  drivingLicenses?: string[];
  certificates?: Array<{ name: string; year: string; publisher: string }>;
  achievements?: string;
  cvUrl?: string;
  source?: string;
  notes?: string;
};

export type StageAdvanceData = {
  evaluator?: string;
  notes?: string;
  score?: number;
  result?: string;
};

// ─── Stage Pipeline ───────────────────────────────────────────────────────

const STAGE_PIPELINE = [
  "Sourcing",
  "Screening",
  "Psikotes",
  "Interview",
  "Medical Checkup",
  "Offering",
] as const;

export type StageName = (typeof STAGE_PIPELINE)[number] | "Hired" | "Rejected";

// ─── Recruitments ─────────────────────────────────────────────────────────

export async function getRecruitments(filters?: RecruitmentFilter) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcRecruitments.status, filters.status));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: hcRecruitments.id,
      jobTitle: hcRecruitments.jobTitle,
      department: hcRecruitments.department,
      section: hcRecruitments.section,
      location: hcRecruitments.location,
      totalRequested: hcRecruitments.totalRequested,
      status: hcRecruitments.status,
      startDate: hcRecruitments.startDate,
      endDate: hcRecruitments.endDate,
      isPublic: hcRecruitments.isPublic,
      jobDescription: hcRecruitments.jobDescription,
      requirements: hcRecruitments.requirements,
      qualifications: hcRecruitments.qualifications,
      mandatoryFields: hcRecruitments.mandatoryFields,
      emailTemplateId: hcRecruitments.emailTemplateId,
      candidateCount: sql<number>`cast(count(${hcCandidates.id}) as int)`,
    })
    .from(hcRecruitments)
    .leftJoin(
      hcCandidates,
      and(
        eq(hcCandidates.recruitmentId, hcRecruitments.id),
        sql`${hcCandidates.currentStage} != 'Rejected'`
      )
    )
    .where(whereClause)
    .groupBy(
      hcRecruitments.id,
      hcRecruitments.jobTitle,
      hcRecruitments.department,
      hcRecruitments.section,
      hcRecruitments.location,
      hcRecruitments.totalRequested,
      hcRecruitments.status,
      hcRecruitments.startDate,
      hcRecruitments.endDate,
      hcRecruitments.isPublic,
      hcRecruitments.jobDescription,
      hcRecruitments.requirements,
      hcRecruitments.qualifications,
      hcRecruitments.mandatoryFields,
      hcRecruitments.emailTemplateId
    )
    .orderBy(desc(hcRecruitments.createdAt));

  return rows;
}

export async function getRecruitmentFormOptions() {
  try {
    const [departments, sections] = await Promise.all([
      db.select({ id: masterDepartments.id, name: masterDepartments.name }).from(masterDepartments).where(eq(masterDepartments.isActive, true)),
      db.select({ id: masterSections.id, name: masterSections.name, departmentId: masterSections.departmentId }).from(masterSections).where(eq(masterSections.isActive, true)),
    ]);
    return { departments, sections };
  } catch (error) {
    console.error("Failed to fetch form options", error);
    return { departments: [], sections: [] };
  }
}



export async function getRecruitmentById(id: number) {
  const [data] = await db
    .select()
    .from(hcRecruitments)
    .where(eq(hcRecruitments.id, id))
    .limit(1);

  return data ?? null;
}

export async function getRecruitmentStats() {
  const now = new Date();

  const [activeResult] = await db
    .select({ value: count() })
    .from(hcRecruitments)
    .where(
      sql`${hcRecruitments.status} NOT IN ('Completed', 'Cancelled')`
    );

  const [totalCandidatesResult] = await db
    .select({ value: count() })
    .from(hcCandidates);

  const [hiredResult] = await db
    .select({ value: count() })
    .from(hcCandidates)
    .where(eq(hcCandidates.currentStage, "Hired"));

  const [overdueResult] = await db
    .select({ value: count() })
    .from(hcRecruitments)
    .where(
      and(
        sql`${hcRecruitments.endDate} < now()`,
        sql`${hcRecruitments.status} NOT IN ('Completed', 'Cancelled')`
      )
    );

  return {
    activeMPR: activeResult?.value ?? 0,
    totalCandidates: totalCandidatesResult?.value ?? 0,
    hired: hiredResult?.value ?? 0,
    overdue: overdueResult?.value ?? 0,
  };
}

export async function createRecruitment(data: RecruitmentData) {
  const [created] = await db
    .insert(hcRecruitments)
    .values({
      jobTitle: data.jobTitle,
      department: data.department || "",
      section: data.section || "",
      location: data.location || "",
      totalRequested: data.totalRequested || 1,
      status: data.status ?? "Draft",
      startDate: data.startDate ? new Date(data.startDate) : null,
      endDate: data.endDate ? new Date(data.endDate) : null,
      isPublic: data.isPublic ?? false,
      jobDescription: data.jobDescription || "",
      requirements: data.requirements || "",
      qualifications: data.qualifications || [],
      mandatoryFields: data.mandatoryFields || ["ktp", "cv"],
      emailTemplateId: data.emailTemplateId || null,
    })
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

export async function updateRecruitment(id: number, data: Partial<RecruitmentData>) {
  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

  if (data.jobTitle !== undefined) updatePayload.jobTitle = data.jobTitle;
  if (data.department !== undefined) updatePayload.department = data.department;
  if (data.section !== undefined) updatePayload.section = data.section;
  if (data.location !== undefined) updatePayload.location = data.location;
  if (data.totalRequested !== undefined) updatePayload.totalRequested = data.totalRequested;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.startDate !== undefined) updatePayload.startDate = data.startDate ? new Date(data.startDate) : null;
  if (data.endDate !== undefined) updatePayload.endDate = data.endDate ? new Date(data.endDate) : null;
  if (data.isPublic !== undefined) updatePayload.isPublic = data.isPublic;
  if (data.jobDescription !== undefined) updatePayload.jobDescription = data.jobDescription;
  if (data.requirements !== undefined) updatePayload.requirements = data.requirements;
  if (data.qualifications !== undefined) updatePayload.qualifications = data.qualifications;
  if (data.mandatoryFields !== undefined) updatePayload.mandatoryFields = data.mandatoryFields;
  if (data.emailTemplateId !== undefined) updatePayload.emailTemplateId = data.emailTemplateId;

  const [updated] = await db
    .update(hcRecruitments)
    .set(updatePayload)
    .where(eq(hcRecruitments.id, id))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function deleteRecruitment(id: number) {
  // Delete all candidates (and their stages via cascade) first
  await db
    .delete(hcCandidates)
    .where(eq(hcCandidates.recruitmentId, id));

  await db.delete(hcRecruitments).where(eq(hcRecruitments.id, id));

  revalidatePath("/dashboard/hc/recruitment");
  return { success: true };
}

export type CandidateFilter = {
  page?: number;
  pageSize?: number;
  search?: string;
  stage?: string;
  jobId?: number;
};

export type PaginatedResult<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export async function getCandidatesPaginated(filters: CandidateFilter = {}): Promise<PaginatedResult<CandidateRow>> {
  const { page = 1, pageSize = 25, search, stage, jobId } = filters;
  const conditions: ReturnType<typeof and>[] = [];

  if (search) {
    const s = `%${search}%`;
    conditions.push(
      or(
        sql`${hcCandidates.fullName} ILIKE ${s}`,
        sql`${hcCandidates.email} ILIKE ${s}`,
        sql`${hcCandidates.phone} ILIKE ${s}`,
      )
    );
  }
  if (stage) {
    conditions.push(eq(hcCandidates.currentStage, stage));
  }
  if (jobId) {
    conditions.push(eq(hcCandidates.recruitmentId, jobId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [{ count: total }] = await db
    .select({ count: count() })
    .from(hcCandidates)
    .where(whereClause);

  const offset = (page - 1) * pageSize;

  const rows = await db
    .select({
      id: hcCandidates.id,
      recruitmentId: hcCandidates.recruitmentId,
      jobTitle: hcRecruitments.jobTitle,
      location: hcRecruitments.location,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      source: hcCandidates.source,
      currentStage: hcCandidates.currentStage,
      rating: hcCandidates.rating,
      notes: hcCandidates.notes,
      cvUrl: hcCandidates.cvUrl,
      aiScore: hcCandidates.aiScore,
      aiSummary: hcCandidates.aiSummary,
      rejectionReason: hcCandidates.rejectionReason,
      createdAt: hcCandidates.createdAt,
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .where(whereClause)
    .orderBy(desc(hcCandidates.id))
    .limit(pageSize)
    .offset(offset);

  return {
    data: rows,
    total: total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  };
}

type CandidateRow = {
  id: number;
  recruitmentId: number | null;
  jobTitle: string | null;
  location: string | null;
  fullName: string;
  email: string;
  phone: string;
  source: string;
  currentStage: string;
  rating: number | null;
  notes: string;
  cvUrl: string;
  aiScore: number | null;
  aiSummary: string;
  rejectionReason: string;
  createdAt: Date;
};

export async function getNextEmployeeId(): Promise<string> {
  const [last] = await db
    .select({ id: hrEmployees.id })
    .from(hrEmployees)
    .orderBy(desc(hrEmployees.id))
    .limit(1);
  const nextNum = (last?.id ?? 0) + 1;
  return `EMP-${String(nextNum).padStart(4, "0")}`;
}

export async function hireAndCreateEmployee(candidateId: number) {
  const now = new Date();

  const [candidate] = await db
    .select({
      id: hcCandidates.id,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      dateOfBirth: hcCandidates.dateOfBirth,
      address: hcCandidates.address,
      gender: hcCandidates.gender,
      currentStage: hcCandidates.currentStage,
      recruitmentId: hcCandidates.recruitmentId,
      nikKtp: hcCandidates.nikKtp,
    })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (!candidate) throw new Error("Candidate not found");
  if (candidate.currentStage === "Hired") throw new Error("Candidate already hired");
  if (candidate.currentStage === "Rejected") throw new Error("Cannot hire rejected candidate");

  const employeeId = await getNextEmployeeId();

  const [employee] = await db.insert(hrEmployees).values({
    employeeId,
    fullName: candidate.fullName,
    email: candidate.email || null,
    birthDate: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split("T")[0] : null,
    genderCode: candidate.gender === "Laki-laki" ? "L" : candidate.gender === "Perempuan" ? "P" : null,
    accountStatus: "active",
    isActive: true,
    joinDate: now.toISOString().split("T")[0],
  }).returning();

  const [currentStageRecord] = await db
    .select({ id: hcCandidateStages.id })
    .from(hcCandidateStages)
    .where(
      and(
        eq(hcCandidateStages.candidateId, candidateId),
        eq(hcCandidateStages.stage, candidate.currentStage),
        isNull(hcCandidateStages.exitedAt)
      )
    )
    .limit(1);

  if (currentStageRecord) {
    await db.update(hcCandidateStages)
      .set({ exitedAt: now, result: "pass", notes: "Hired and converted to employee" })
      .where(eq(hcCandidateStages.id, currentStageRecord.id));
  }

  await db.insert(hcCandidateStages).values({
    candidateId,
    stage: "Hired",
    enteredAt: now,
    result: "pass",
    notes: `Converted to employee: ${employeeId}`,
  });

  await db.update(hcCandidates)
    .set({ currentStage: "Hired", updatedAt: now })
    .where(eq(hcCandidates.id, candidateId));

  revalidatePath("/dashboard/hc/recruitment");

  return { employee, employeeId };
}

// ─── Candidates ───────────────────────────────────────────────────────────

export async function getCandidates() {
  const rows = await db
    .select({
      id: hcCandidates.id,
      recruitmentId: hcCandidates.recruitmentId,
      jobTitle: hcRecruitments.jobTitle,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      source: hcCandidates.source,
      currentStage: hcCandidates.currentStage,
      rating: hcCandidates.rating,
      notes: hcCandidates.notes,
      cvUrl: hcCandidates.cvUrl,
      aiScore: hcCandidates.aiScore,
      aiSummary: hcCandidates.aiSummary,
      rejectionReason: hcCandidates.rejectionReason,
      createdAt: hcCandidates.createdAt,
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .orderBy(desc(hcCandidates.id));

  return rows;
}

export async function getCandidateById(id: number) {
  const [candidate] = await db
    .select({
      id: hcCandidates.id,
      recruitmentId: hcCandidates.recruitmentId,
      // Candidate fields
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      dateOfBirth: hcCandidates.dateOfBirth,
      address: hcCandidates.address,
      gender: hcCandidates.gender,
      workExperience: hcCandidates.workExperience,
      education: hcCandidates.education,
      drivingLicenses: hcCandidates.drivingLicenses,
      certificates: hcCandidates.certificates,
      achievements: hcCandidates.achievements,
      cvUrl: hcCandidates.cvUrl,
      source: hcCandidates.source,
      currentStage: hcCandidates.currentStage,
      rating: hcCandidates.rating,
      notes: hcCandidates.notes,
      rejectionReason: hcCandidates.rejectionReason,
      rejectedAtStage: hcCandidates.rejectedAtStage,
      aiScore: hcCandidates.aiScore,
      aiSummary: hcCandidates.aiSummary,
      aiAssessmentDate: hcCandidates.aiAssessmentDate,
      createdAt: hcCandidates.createdAt,
      updatedAt: hcCandidates.updatedAt,
      // Onboarding fields
      nikKtp: hcCandidates.nikKtp,
      npwpNumber: hcCandidates.npwpNumber,
      bpjsKesehatan: hcCandidates.bpjsKesehatan,
      bpjsKetenagakerjaan: hcCandidates.bpjsKetenagakerjaan,
      bankName: hcCandidates.bankName,
      bankAccountNumber: hcCandidates.bankAccountNumber,
      emergencyContactName: hcCandidates.emergencyContactName,
      emergencyContactPhone: hcCandidates.emergencyContactPhone,
      // Vacancy fields (from hcRecruitments via join)
      jobTitle: hcRecruitments.jobTitle,
      department: hcRecruitments.department,
      section: hcRecruitments.section,
      location: hcRecruitments.location,
      totalRequested: hcRecruitments.totalRequested,
      vacancyStatus: hcRecruitments.status,
      startDate: hcRecruitments.startDate,
      endDate: hcRecruitments.endDate,
      jobDescription: hcRecruitments.jobDescription,
      requirements: hcRecruitments.requirements,
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .where(eq(hcCandidates.id, id))
    .limit(1);

  if (!candidate) return null;

  // fetch stages history
  const stages = await db
    .select()
    .from(hcCandidateStages)
    .where(eq(hcCandidateStages.candidateId, id))
    .orderBy(hcCandidateStages.createdAt);

  return { ...candidate, stages };
}

export async function createCandidate(data: CandidateData) {
  const [created] = await db
    .insert(hcCandidates)
    .values({
      recruitmentId: data.recruitmentId,
      fullName: data.fullName,
      email: data.email || "",
      phone: data.phone || "",
      dateOfBirth: data.dateOfBirth ? new Date(data.dateOfBirth) : null,
      address: data.address || "",
      gender: data.gender || "",
      workExperience: data.workExperience || [],
      education: data.education || [],
      drivingLicenses: data.drivingLicenses || [],
      certificates: data.certificates || [],
      achievements: data.achievements || "",
      source: data.source || "Walk-in",
      notes: data.notes || "",
      cvUrl: data.cvUrl || "",
      currentStage: "Sourcing",
    })
    .returning();

  // Create initial stage record
  await db.insert(hcCandidateStages).values({
    candidateId: created.id,
    stage: "Sourcing",
    enteredAt: new Date(),
    notes: "Candidate applied/added",
  });

  try { revalidatePath("/dashboard/hc/recruitment") } catch {}
  return created;
}

export async function updateCandidateStage(
  candidateId: number,
  nextStage: StageName,
  advanceData?: StageAdvanceData
) {
  const now = new Date();

  // 1. Get candidate's current stage
  const [candidate] = await db
    .select({ currentStage: hcCandidates.currentStage })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (!candidate) throw new Error("Candidate not found");
  if (candidate.currentStage === nextStage) return; // No-op
  if (candidate.currentStage === "Rejected" || candidate.currentStage === "Hired") {
    throw new Error("Cannot change stage of a closed candidate");
  }

  // 2. Close current stage record
  const [currentStageRecord] = await db
    .select({ id: hcCandidateStages.id })
    .from(hcCandidateStages)
    .where(
      and(
        eq(hcCandidateStages.candidateId, candidateId),
        eq(hcCandidateStages.stage, candidate.currentStage),
        isNull(hcCandidateStages.exitedAt)
      )
    )
    .limit(1);

  if (currentStageRecord) {
    await db
      .update(hcCandidateStages)
      .set({
        exitedAt: now,
        result: advanceData?.result || "pass",
        evaluator: advanceData?.evaluator || "",
        notes: advanceData?.notes || "",
        score: advanceData?.score,
      })
      .where(eq(hcCandidateStages.id, currentStageRecord.id));
  }

  // 3. Open new stage record
  await db.insert(hcCandidateStages).values({
    candidateId,
    stage: nextStage,
    enteredAt: now,
  });

  // 4. Update candidate master record
  const [updated] = await db
    .update(hcCandidates)
    .set({
      currentStage: nextStage,
      updatedAt: now,
    })
    .where(eq(hcCandidates.id, candidateId))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function rejectCandidate(candidateId: number, reason: string) {
  const now = new Date();

  // Close current stage
  const [candidate] = await db
    .select({ currentStage: hcCandidates.currentStage })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (!candidate) throw new Error("Candidate not found");
  const stage = candidate.currentStage;

  const [currentStageRecord] = await db
    .select({ id: hcCandidateStages.id })
    .from(hcCandidateStages)
    .where(
      and(
        eq(hcCandidateStages.candidateId, candidateId),
        eq(hcCandidateStages.stage, stage),
        isNull(hcCandidateStages.exitedAt)
      )
    )
    .limit(1);

  if (currentStageRecord) {
    await db
      .update(hcCandidateStages)
      .set({
        exitedAt: now,
        result: "fail",
        notes: reason,
      })
      .where(eq(hcCandidateStages.id, currentStageRecord.id));
  }

  // Update candidate
  const [updated] = await db
    .update(hcCandidates)
    .set({
      currentStage: "Rejected",
      rejectionReason: reason,
      rejectedAtStage: stage,
      updatedAt: now,
    })
    .where(eq(hcCandidates.id, candidateId))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function hireCandidate(candidateId: number) {
  const now = new Date();

  // Close current stage
  const [candidate] = await db
    .select({ currentStage: hcCandidates.currentStage })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (candidate) {
    const [currentStageRecord] = await db
      .select({ id: hcCandidateStages.id })
      .from(hcCandidateStages)
      .where(
        and(
          eq(hcCandidateStages.candidateId, candidateId),
          eq(hcCandidateStages.stage, candidate.currentStage),
          isNull(hcCandidateStages.exitedAt)
        )
      )
      .limit(1);

    if (currentStageRecord) {
      await db
        .update(hcCandidateStages)
        .set({
          exitedAt: now,
          result: "pass",
          notes: "Lulus semua tahapan, siap di-hire",
        })
        .where(eq(hcCandidateStages.id, currentStageRecord.id));
    }
  }

  // Create Hired stage record
  await db.insert(hcCandidateStages).values({
    candidateId,
    stage: "Hired",
    enteredAt: now,
    result: "pass",
    notes: "Kandidat diterima",
  });

  // Update candidate
  const [updated] = await db
    .update(hcCandidates)
    .set({
      currentStage: "Hired",
      updatedAt: now,
    })
    .where(eq(hcCandidates.id, candidateId))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function updateCandidate(
  id: number,
  data: Partial<CandidateData & { rating: number }>
) {
  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

  if (data.fullName !== undefined) updatePayload.fullName = data.fullName;
  if (data.email !== undefined) updatePayload.email = data.email;
  if (data.phone !== undefined) updatePayload.phone = data.phone;
  if (data.source !== undefined) updatePayload.source = data.source;
  if (data.notes !== undefined) updatePayload.notes = data.notes;
  if (data.rating !== undefined) updatePayload.rating = data.rating;

  const [updated] = await db
    .update(hcCandidates)
    .set(updatePayload)
    .where(eq(hcCandidates.id, id))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function deleteCandidate(id: number) {
  await db.delete(hcCandidates).where(eq(hcCandidates.id, id));
  revalidatePath("/dashboard/hc/recruitment");
  return { success: true };
}

export async function deleteMultipleCandidates(ids: number[]) {
  if (ids.length === 0) return { success: true, count: 0 };
  await db.delete(hcCandidates).where(inArray(hcCandidates.id, ids));
  revalidatePath("/dashboard/hc/recruitment");
  return { success: true, count: ids.length };
}

export async function getCandidateEmailStatuses(candidateIds: number[]) {
  if (candidateIds.length === 0) return [];

  const rows = await db
    .select({ id: hcCandidates.id, email: hcCandidates.email })
    .from(hcCandidates)
    .where(inArray(hcCandidates.id, candidateIds));

  const emails = rows.map((r) => r.email).filter(Boolean) as string[];
  if (emails.length === 0) {
    return rows.map((r) => ({
      candidateId: r.id,
      status: "none" as const,
      lastSentAt: null as Date | null,
      templateName: null as string | null,
    }));
  }

  const logs = await db
    .select()
    .from(emailDeliveryLogs)
    .where(inArray(emailDeliveryLogs.toEmail, emails))
    .orderBy(desc(emailDeliveryLogs.createdAt));

  const latestByEmail = new Map<
    string,
    { status: string; sentAt: Date | null; templateName: string | null }
  >();
  for (const log of logs) {
    if (!latestByEmail.has(log.toEmail)) {
      latestByEmail.set(log.toEmail, {
        status: log.status,
        sentAt: log.sentAt,
        templateName: log.templateName,
      });
    }
  }

  return rows.map((r) => {
    const latest = r.email ? latestByEmail.get(r.email) : undefined;
    return {
      candidateId: r.id,
      status: latest ? latest.status : ("none" as const),
      lastSentAt: latest ? latest.sentAt : null,
      templateName: latest ? latest.templateName : null,
    };
  });
}

export async function getCandidateEmailLogs(candidateId: number) {
  const [candidate] = await db
    .select({ email: hcCandidates.email })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (!candidate?.email) return [];

  return db
    .select()
    .from(emailDeliveryLogs)
    .where(eq(emailDeliveryLogs.toEmail, candidate.email))
    .orderBy(desc(emailDeliveryLogs.createdAt));
}

export async function getCvDownloadUrl(cvUrl: string | null) {
  if (!cvUrl) return null;
  const { getS3ObjectReadUrl } = await import("@/lib/s3-storage");
  return getS3ObjectReadUrl(cvUrl, 3600);
}

// ─── AI Assessment ────────────────────────────────────────────────────────

export async function assessCandidateCv(candidateId: number) {
  // 1. Fetch Candidate & Job Vacancy
  const candidate = await getCandidateById(candidateId);
  if (!candidate) {
    return { success: false, error: "Candidate not found." };
  }

  const job = await getRecruitmentById(candidate.recruitmentId!);
  if (!job) {
    return { success: false, error: "Job vacancy not found." };
  }

  try {
    let cvText = "CV not provided or unreadable.";
    
    // Parse CV if exists
    if (candidate.cvUrl) {
      let fileBuffer: Buffer | null = null;
      try {
        if (candidate.cvUrl.startsWith("http")) {
          const fetchRes = await fetch(candidate.cvUrl);
          if (fetchRes.ok) {
            const arrayBuffer = await fetchRes.arrayBuffer();
            fileBuffer = Buffer.from(arrayBuffer);
          }
        } else {
          const filename = candidate.cvUrl.split("/").pop();
          if (filename) {
            const filePath = path.join(process.cwd(), "public", "uploads", filename);
            if (fs.existsSync(filePath)) {
              fileBuffer = fs.readFileSync(filePath);
            }
          }
        }

        if (fileBuffer) {
          const pdfParse = require("pdf-parse");
          const pdfData = await pdfParse(fileBuffer);
          cvText = pdfData.text;
        }
      } catch (e) {
        console.warn("Failed to parse CV for AI assessment", e);
      }
    }

    // Prepare JSON payload for AI Context
    const candidateProfile = {
      personalInfo: {
        dateOfBirth: candidate.dateOfBirth,
        address: candidate.address,
        gender: candidate.gender,
      },
      education: candidate.education,
      workExperience: candidate.workExperience,
      drivingLicenses: candidate.drivingLicenses,
      certificates: candidate.certificates,
      achievements: candidate.achievements,
      parsedCV: cvText.substring(0, 5000), // Trim to avoid token limits
    };

    const jobRequirements = {
      title: job.jobTitle,
      department: job.department,
      section: job.section,
      description: job.jobDescription,
      requirementsText: job.requirements,
      qualificationsChecklist: job.qualifications,
    };

    // 4. Call Ollama API
    const ollamaUrl = process.env.OLLAMA_URL || "https://ollama.com/api/chat";
    const ollamaModel = process.env.OLLAMA_MODEL || "qwen3.5:397b-cloud";
    const ollamaKey = process.env.OLLAMA_API_KEY;

    const promptSystem = `You are an expert HR Assessor. You will be provided with a Candidate Profile (JSON) and Job Requirements (JSON).
Your task is to critically analyze how well the candidate's structured data (Education, Experience, Licenses, CV) matches the Job Requirements and specific Qualifications Checklist.
Return a JSON object strictly following this format: {"score": 85, "summary": "Brief explanation here"}. The score should be an integer from 0 to 100 representing suitability.`;

    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(ollamaKey ? { "Authorization": `Bearer ${ollamaKey}` } : {}),
      },
      body: JSON.stringify({
        model: ollamaModel,
        messages: [
          { role: "system", content: promptSystem },
          {
            role: "user",
            content: `Job Requirements: ${JSON.stringify(jobRequirements)}\n\nCandidate Profile: ${JSON.stringify(candidateProfile)}`
          }
        ],
        stream: false,
        format: "json",
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const aiData = await response.json();
    const aiContent = JSON.parse(aiData.message.content);

    // 5. Update Candidate
    await db
      .update(hcCandidates)
      .set({
        aiScore: aiContent.score,
        aiSummary: aiContent.summary,
        aiAssessmentDate: new Date(),
      })
      .where(eq(hcCandidates.id, candidateId));

    revalidatePath("/dashboard/hc/recruitment");
    return { success: true, score: aiContent.score, summary: aiContent.summary };
  } catch (error: any) {
    console.error("AI Assessment Error:", error);
    return { success: false, error: error.message };
  }
}
