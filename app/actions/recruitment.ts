"use server";

import { db } from "@/db";
import {
  hcRecruitments,
  hcCandidates,
  hcCandidateStages,
  hcCandidatePanelEvaluations,
  hrEmployees,
  hrDepartments,
  hrSections,
  masterDepartments,
  masterSections,
  emailDeliveryLogs,
  recruitmentSectionTemplates,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count, isNull, or, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import fs from "fs";
import path from "path";
import { getCandidateTestResults } from "@/app/actions/candidate-tests";
import { getCandidateInterviews } from "@/app/actions/interviews";
import { getCandidateMcu } from "@/app/actions/mcu";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";
import crypto from "crypto";

// ─── Types ────────────────────────────────────────────────────────────────

export type RecruitmentFilter = {
  status?: string;
  isPublic?: boolean;
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
  scoringCriteria?: Array<{ id: string; label: string; weight: number; description?: string }>;
  knockoutCriteria?: Array<{ id: string; label: string; enabled: boolean; description?: string }>;
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
  "Offering",
  "Medical Checkup",
] as const;

export type StageName = (typeof STAGE_PIPELINE)[number] | "Hired" | "Rejected";

// ─── Recruitments ─────────────────────────────────────────────────────────

export async function getRecruitments(filters?: RecruitmentFilter) {
  const conditions = [];

  if (filters?.status) {
    conditions.push(eq(hcRecruitments.status, filters.status));
  }
  if (filters?.isPublic !== undefined) {
    conditions.push(eq(hcRecruitments.isPublic, filters.isPublic));
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
      scoringCriteria: hcRecruitments.scoringCriteria,
      knockoutCriteria: hcRecruitments.knockoutCriteria,
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
      hcRecruitments.scoringCriteria,
      hcRecruitments.knockoutCriteria,
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
      mandatoryFields: data.mandatoryFields || ["dateOfBirth", "address", "gender", "cv"],
      scoringCriteria: data.scoringCriteria || [],
      knockoutCriteria: data.knockoutCriteria || [],
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
  if (data.scoringCriteria !== undefined) updatePayload.scoringCriteria = data.scoringCriteria;
  if (data.knockoutCriteria !== undefined) updatePayload.knockoutCriteria = data.knockoutCriteria;
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
      aiDetails: hcCandidates.aiDetails,
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
  aiDetails?: { breakdown?: Array<{ criterion: string; score: number; weight: number; reason: string }>; knockout?: Array<{ criterion: string; passed: boolean; reason: string }>; recommendation?: string } | null;
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

export async function hireAndCreateEmployee(candidateId: number, startDate?: string) {
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
      onboardingToken: hcCandidates.onboardingToken,
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

  let onboardingToken = candidate.onboardingToken;
  if (!onboardingToken) {
    onboardingToken = crypto.randomBytes(32).toString("hex");
  }

  await db.update(hcCandidates)
    .set({ currentStage: "Hired", updatedAt: now, startDate: startDate || null, onboardingToken })
    .where(eq(hcCandidates.id, candidateId));

  // Send hired email
  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings && smtpSettings.host && candidate.email) {
      let jobTitle = "Posisi";
      if (candidate.recruitmentId) {
        const [rec] = await db.select({ jobTitle: hcRecruitments.jobTitle }).from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
        if (rec) jobTitle = rec.jobTitle;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hero.chitraparatama.com";
      const onboardingUrl = `${baseUrl}/onboarding/${onboardingToken}`;
      const startDateLabel = startDate ? new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" }) : "Akan diinformasikan";

      const html = `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#0f172a;">Selamat! Anda Diterima</h2>
          <p>Halo <strong>${candidate.fullName}</strong>,</p>
          <p>Kami dengan senang hati menginformasikan bahwa Anda telah diterima untuk bergabung dengan <strong>PT Chitra Paratama</strong>.</p>
          <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px;">
            <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">Posisi</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${jobTitle}</td></tr>
            <tr><td style="padding:8px 12px;font-weight:600;">Tanggal Mulai Kerja</td><td style="padding:8px 12px;">${startDateLabel}</td></tr>
          </table>
          <p>Sebelum mulai kerja, mohon lengkapi dokumen administrasi melalui link berikut:</p>
          <p style="text-align:center;margin:24px 0;">
            <a href="${onboardingUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Lengkapi Data Onboarding</a>
          </p>
          <p>Dokumen yang perlu diupload:</p>
          <ul>
            <li>Kartu Keluarga (KK)</li>
            <li>Kartu Tanda Penduduk (KTP)</li>
            <li>Scan Buku Tabungan</li>
          </ul>
          <p>Pastikan data diisi sebelum tanggal mulai kerja.</p>
          <p>Salam,<br/>HR Team PT Chitra Paratama</p>
        </div>
      `;

      const text = `Selamat! Anda Diterima\n\nHalo ${candidate.fullName},\n\nKami dengan senang hati menginformasikan bahwa Anda telah diterima untuk bergabung dengan PT Chitra Paratama.\n\nPosisi: ${jobTitle}\nTanggal Mulai Kerja: ${startDateLabel}\n\nSebelum mulai kerja, mohon lengkapi dokumen administrasi melalui link berikut:\n${onboardingUrl}\n\nDokumen yang perlu diupload:\n- Kartu Keluarga (KK)\n- Kartu Tanda Penduduk (KTP)\n- Scan Buku Tabungan\n\nPastikan data diisi sebelum tanggal mulai kerja.\n\nSalam,\nHR Team PT Chitra Paratama`;

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject: "Selamat! Anda Diterima — PT Chitra Paratama",
        html,
        text,
        templateName: "Hired Email",
        templateCode: "hired_email",
      });
    }
  } catch (emailErr) {
    console.error("Failed to send hired email:", emailErr);
  }

  revalidatePath("/dashboard/hc/recruitment");
  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);

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
      aiDetails: hcCandidates.aiDetails,
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
      aiDetails: hcCandidates.aiDetails,
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
      onboardingToken: hcCandidates.onboardingToken,
      kkUrl: hcCandidates.kkUrl,
      ktpUrl: hcCandidates.ktpUrl,
      bankBookUrl: hcCandidates.bankBookUrl,
      onboardingCompletedAt: hcCandidates.onboardingCompletedAt,
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

export type PanelEvaluationData = {
  interviewId?: number | null;
  panelistName: string;
  panelistRole?: string;
  technicalScore: number;
  communicationScore: number;
  cultureScore: number;
  problemSolvingScore: number;
  attitudeScore: number;
  overallRecommendation: string;
  strengths?: string;
  concerns?: string;
  notes?: string;
};

function clampPanelScore(value: number) {
  return Math.max(1, Math.min(5, Math.round(Number(value) || 0)));
}

export async function getCandidatePanelEvaluations(candidateId: number) {
  return db
    .select()
    .from(hcCandidatePanelEvaluations)
    .where(eq(hcCandidatePanelEvaluations.candidateId, candidateId))
    .orderBy(desc(hcCandidatePanelEvaluations.submittedAt));
}

export async function createCandidatePanelEvaluation(candidateId: number, data: PanelEvaluationData) {
  const [candidate] = await db
    .select({ id: hcCandidates.id })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (!candidate) throw new Error("Candidate not found");
  if (!data.panelistName?.trim()) throw new Error("Nama panelis wajib diisi.");

  const [created] = await db
    .insert(hcCandidatePanelEvaluations)
    .values({
      candidateId,
      interviewId: data.interviewId || null,
      panelistName: data.panelistName.trim(),
      panelistRole: data.panelistRole?.trim() || "",
      technicalScore: clampPanelScore(data.technicalScore),
      communicationScore: clampPanelScore(data.communicationScore),
      cultureScore: clampPanelScore(data.cultureScore),
      problemSolvingScore: clampPanelScore(data.problemSolvingScore),
      attitudeScore: clampPanelScore(data.attitudeScore),
      overallRecommendation: data.overallRecommendation || "Review",
      strengths: data.strengths?.trim() || "",
      concerns: data.concerns?.trim() || "",
      notes: data.notes?.trim() || "",
      submittedAt: new Date(),
    })
    .returning();

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

function summarizePanelEvaluations(evaluations: Awaited<ReturnType<typeof getCandidatePanelEvaluations>>) {
  if (!evaluations.length) {
    return { count: 0, averageScore: null as number | null, recommendation: "-" };
  }

  const total = evaluations.reduce((sum, item) => {
    return sum + item.technicalScore + item.communicationScore + item.cultureScore + item.problemSolvingScore + item.attitudeScore;
  }, 0);
  const averageScore = Number((total / (evaluations.length * 5)).toFixed(1));
  const recommendationCounts = evaluations.reduce<Record<string, number>>((acc, item) => {
    acc[item.overallRecommendation] = (acc[item.overallRecommendation] || 0) + 1;
    return acc;
  }, {});
  const recommendation = Object.entries(recommendationCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "Review";

  return { count: evaluations.length, averageScore, recommendation };
}

export async function getCandidateComparisonData(candidateIds: number[]) {
  const ids = Array.from(new Set(candidateIds.map(Number).filter(Boolean))).slice(0, 5);
  if (ids.length < 2) throw new Error("Pilih minimal 2 kandidat untuk compare.");
  if (ids.length > 5) throw new Error("Maksimal 5 kandidat untuk compare.");

  const rows = await Promise.all(
    ids.map(async (id) => {
      const [candidate, testResults, interviews, mcuRecords, panelEvaluations] = await Promise.all([
        getCandidateById(id),
        getCandidateTestResults(id),
        getCandidateInterviews(id),
        getCandidateMcu(id),
        getCandidatePanelEvaluations(id),
      ]);

      if (!candidate) return null;

      return {
        candidate,
        testResults,
        interviews,
        mcuRecords,
        panelEvaluations,
        panelSummary: summarizePanelEvaluations(panelEvaluations),
      };
    })
  );

  return rows.filter(Boolean);
}

export async function createCandidate(data: CandidateData) {
  if (!data.fullName || !data.email || !data.phone) {
    throw new Error("Mohon lengkapi nama, email, dan nomor telepon.");
  }

  const recruitment = await getRecruitmentById(data.recruitmentId);
  if (!recruitment || !recruitment.isPublic) {
    throw new Error("Lowongan tidak aktif atau tidak tersedia.");
  }

  const mandatoryFields = new Set(recruitment.mandatoryFields || ["dateOfBirth", "address", "gender", "cv"]);
  const missingFields = [];
  if (mandatoryFields.has("dateOfBirth") && !data.dateOfBirth) missingFields.push("Tanggal lahir");
  if (mandatoryFields.has("address") && !data.address) missingFields.push("Alamat");
  if (mandatoryFields.has("gender") && !data.gender) missingFields.push("Jenis kelamin");
  if (mandatoryFields.has("drivingLicenses") && (!data.drivingLicenses || data.drivingLicenses.length === 0)) missingFields.push("SIM");
  if (mandatoryFields.has("certificates") && (!data.certificates || data.certificates.length === 0)) missingFields.push("Sertifikat");
  if (mandatoryFields.has("workExperience") && (!data.workExperience || data.workExperience.length === 0)) missingFields.push("Pengalaman kerja");
  if (mandatoryFields.has("education") && (!data.education || data.education.length === 0)) missingFields.push("Riwayat pendidikan");
  if (mandatoryFields.has("cv") && !data.cvUrl) missingFields.push("CV");
  if (missingFields.length > 0) {
    throw new Error(`Mohon lengkapi field wajib: ${missingFields.join(", ")}.`);
  }

  // Validate dateOfBirth
  let parsedDateOfBirth: Date | null = null;
  if (data.dateOfBirth) {
    parsedDateOfBirth = new Date(data.dateOfBirth);
    if (isNaN(parsedDateOfBirth.getTime())) {
      throw new Error("Format tanggal lahir tidak valid.");
    }
  }

  // Check for duplicate candidate (same email + same recruitment)
  const existingCandidate = await db
    .select({ id: hcCandidates.id })
    .from(hcCandidates)
    .where(
      and(
        eq(hcCandidates.email, data.email),
        eq(hcCandidates.recruitmentId, data.recruitmentId)
      )
    )
    .limit(1);

  if (existingCandidate.length > 0) {
    throw new Error("Anda sudah melamar untuk lowongan ini sebelumnya.");
  }

  const [created] = await db
    .insert(hcCandidates)
    .values({
      recruitmentId: data.recruitmentId,
      fullName: data.fullName,
      email: data.email || "",
      phone: data.phone || "",
      dateOfBirth: parsedDateOfBirth,
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

  // 5. Auto-create employee master when hired
  if (nextStage === "Hired") {
    try {
      const existing = await db.select().from(hrEmployees).where(eq(hrEmployees.email, updated.email)).limit(1);
      if (existing.length === 0) {
        // Find department & section IDs by name
        let departmentId: number | null = null;
        let sectionId: number | null = null;
        if (updated.recruitmentId) {
          const [rec] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, updated.recruitmentId)).limit(1);
          if (rec) {
            if (rec.department) {
              const d = await db.select().from(hrDepartments).where(eq(hrDepartments.name, rec.department)).limit(1);
              if (d.length > 0) departmentId = d[0].id;
            }
            if (rec.section) {
              const s = await db.select().from(hrSections).where(eq(hrSections.name, rec.section)).limit(1);
              if (s.length > 0) sectionId = s[0].id;
            }
          }
        }
        // Generate next employee ID
        const maxRow = await db.select({ maxId: sql<number>`MAX(CAST(${hrEmployees.employeeId} AS INTEGER))` }).from(hrEmployees);
        const nextId = (maxRow[0]?.maxId ?? 0) + 1;
        const genderMap: Record<string, string> = { "Laki-laki": "1", "Perempuan": "2", Male: "1", Female: "2", M: "1", F: "2" };
        const { format } = await import("date-fns");
        await db.insert(hrEmployees).values({
          employeeId: nextId.toString(),
          fullName: updated.fullName,
          email: updated.email || null,
          departmentId,
          sectionId,
          joinDate: format(now, "yyyy-MM-dd"),
          contractStart: format(now, "yyyy-MM-dd"),
          birthDate: updated.dateOfBirth ? format(updated.dateOfBirth, "yyyy-MM-dd") : null,
          genderCode: genderMap[updated.gender] || null,
          accountStatus: "active",
          isActive: true,
        });
        revalidatePath("/dashboard/hc/employee");
      }
    } catch (empErr) {
      console.error("Auto-create employee failed:", empErr);
    }
  }

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

  let job = null;
  if (candidate.recruitmentId) {
    job = await getRecruitmentById(candidate.recruitmentId);
  }
  if (!job) {
    return { success: false, error: "Kandidat belum dilink ke lowongan (recruitmentId kosong). Hubungkan kandidat ke lowongan terlebih dahulu." };
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
      scoringCriteria: job.scoringCriteria || [],
      knockoutCriteria: (job.knockoutCriteria || []).filter((criterion) => criterion.enabled),
    };

    // 4. Call AI API (OpenRouter fallback)
    const ollamaUrl = process.env.OLLAMA_URL || "https://openrouter.ai/api/v1/chat/completions";
    const ollamaModel = process.env.OLLAMA_MODEL || "openai/gpt-4o-mini";
    const ollamaKey = process.env.OLLAMA_API_KEY;

    if (!ollamaKey) {
      return { success: false, error: "AI API key belum dikonfigurasi. Set OLLAMA_API_KEY di .env.local (OpenRouter API key)" };
    }

    const promptSystem = `You are an expert HR Assessor. You will be provided with a Candidate Profile (JSON) and Job Requirements (JSON).
Your task is to critically analyze how well the candidate's structured data (Education, Experience, Licenses, CV) matches the Job Requirements, Qualifications Checklist, Scoring Criteria, and enabled Knockout Criteria.
Return a JSON object strictly following this format: {"score": 85, "summary": "Brief explanation here", "breakdown": [{"criterion": "Experience", "score": 80, "weight": 30, "reason": "Reason"}], "knockout": [{"criterion": "SIM A", "passed": true, "reason": "Reason"}], "recommendation": "Shortlist"}.
The final score must be 0-100. If any knockout criterion fails, keep score realistic and set recommendation to "Reject" or "Manual Review".`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 90_000);
    const response = await fetch(ollamaUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${ollamaKey}`,
        "HTTP-Referer": "https://hero.chitraparatama.com",
        "X-Title": "HERO HC Assessment",
      },
      signal: controller.signal,
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
      })
    }).finally(() => clearTimeout(timeout));

    if (!response.ok) {
      throw new Error(`Ollama API returned ${response.status}`);
    }

    const aiData = await response.json();
    const rawContent = aiData.choices?.[0]?.message?.content || aiData.message?.content || "{}";
    const cleanedContent = rawContent.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const aiContent = JSON.parse(cleanedContent);
    const normalizedScore = Math.max(0, Math.min(100, Number(aiContent.score) || 0));
    const aiDetails = {
      breakdown: Array.isArray(aiContent.breakdown) ? aiContent.breakdown : [],
      knockout: Array.isArray(aiContent.knockout) ? aiContent.knockout : [],
      recommendation: typeof aiContent.recommendation === "string" ? aiContent.recommendation : "Manual Review",
    };

    // 5. Update Candidate
    await db
      .update(hcCandidates)
      .set({
        aiScore: normalizedScore,
        aiSummary: typeof aiContent.summary === "string" ? aiContent.summary : "AI assessment completed.",
        aiDetails,
        aiAssessmentDate: new Date(),
      })
      .where(eq(hcCandidates.id, candidateId));

    revalidatePath("/dashboard/hc/recruitment");
    return { success: true, score: normalizedScore, summary: aiContent.summary, details: aiDetails };
  } catch (error: any) {
    console.error("AI Assessment Error:", error);
    if (error?.name === "AbortError") {
      return { success: false, error: "AI assessment timed out after 90 seconds. Check OLLAMA_URL / model availability." };
    }
    return { success: false, error: error.message };
  }
}

export async function previewStartDateEmail(data: {
  candidateName: string;
  jobTitle: string;
  startDate: string;
  onboardingUrl: string;
}) {
  const templateVars = {
    candidateName: data.candidateName,
    jobTitle: data.jobTitle,
    companyName: "PT Chitra Paratama",
    date: data.startDate,
    time: "",
    location: "",
    interviewer: "",
    clinicName: "",
    clinicAddress: "",
    clinicCity: "",
    paket: "",
    testLink: data.onboardingUrl,
    duration: "",
  };

  const template = await getHcEmailTemplateByType("start_date");
  let subject: string, html: string | undefined, text: string;

  if (template) {
    const rendered = renderHcTemplate(template, templateVars);
    subject = rendered.subject;
    html = rendered.html;
    text = rendered.text;
  } else {
    subject = "Selamat Datang — PT Chitra Paratama";
    html = `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <h2 style="color:#0f172a;">Secara Resmi Kami Menyambut Anda</h2>
      <p>Halo <strong>${data.candidateName}</strong>,</p>
      <p>Kami dengan bangga mengumumkan bahwa Anda secara resmi diterima sebagai <strong>Karyawan PT Chitra Paratama</strong>.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;background:#f8fafc;border-radius:8px;">
        <tr><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;">Posisi</td><td style="padding:8px 12px;border-bottom:1px solid #e2e8f0;">${data.jobTitle}</td></tr>
        <tr><td style="padding:8px 12px;font-weight:600;">Tanggal Mulai Kerja</td><td style="padding:8px 12px;">${data.startDate}</td></tr>
      </table>
      <p>Sebelum hari pertama kerja, mohon lengkapi data administrasi dan upload dokumen melalui link onboarding berikut:</p>
      <p style="text-align:center;margin:24px 0;">
        <a href="${data.onboardingUrl}" style="background:#0f172a;color:#fff;padding:12px 24px;text-decoration:none;border-radius:6px;display:inline-block;">Lengkapi Data Onboarding</a>
      </p>
      <p>Dokumen yang perlu diupload:</p>
      <ul>
        <li>Kartu Keluarga (KK)</li>
        <li>Kartu Tanda Penduduk (KTP)</li>
        <li>Scan Buku Tabungan</li>
      </ul>
      <p>Pastikan data diisi sebelum tanggal mulai kerja.</p>
      <p>Salam hangat,<br/>HR Team PT Chitra Paratama</p>
    </div>`;
    text = `Secara Resmi Kami Menyambut Anda\n\nHalo ${data.candidateName},\n\nKami dengan bangga mengumumkan bahwa Anda secara resmi diterima sebagai Karyawan PT Chitra Paratama.\n\nPosisi: ${data.jobTitle}\nTanggal Mulai Kerja: ${data.startDate}\n\nSebelum hari pertama kerja, mohon lengkapi data administrasi dan upload dokumen melalui link onboarding berikut:\n${data.onboardingUrl}\n\nDokumen yang perlu diupload:\n- Kartu Keluarga (KK)\n- Kartu Tanda Penduduk (KTP)\n- Scan Buku Tabungan\n\nPastikan data diisi sebelum tanggal mulai kerja.\n\nSalam hangat,\nHR Team PT Chitra Paratama`;
  }

  return { subject, html, text };
}

export async function sendStartDateEmails(candidateIds: number[], startDate: string) {
  const smtpSettings = await getEmailSmtpSettingsData();
  const results: Array<{ candidateId: number; success: boolean; error?: string }> = [];

  for (const cid of candidateIds) {
    try {
      const [candidate] = await db
        .select({ id: hcCandidates.id, fullName: hcCandidates.fullName, email: hcCandidates.email, onboardingToken: hcCandidates.onboardingToken, recruitmentId: hcCandidates.recruitmentId })
        .from(hcCandidates)
        .where(eq(hcCandidates.id, cid))
        .limit(1);

      if (!candidate) {
        results.push({ candidateId: cid, success: false, error: "Candidate not found" });
        continue;
      }
      if (!candidate.email) {
        results.push({ candidateId: cid, success: false, error: "Candidate has no email" });
        continue;
      }

      let token = candidate.onboardingToken;
      if (!token) {
        token = crypto.randomBytes(32).toString("hex");
        await db.update(hcCandidates).set({ onboardingToken: token }).where(eq(hcCandidates.id, cid));
      }

      await db.update(hcCandidates).set({ startDate }).where(eq(hcCandidates.id, cid));

      let jobTitle = "Posisi";
      if (candidate.recruitmentId) {
        const [rec] = await db.select({ jobTitle: hcRecruitments.jobTitle }).from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
        if (rec) jobTitle = rec.jobTitle;
      }

      const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "https://hero.chitraparatama.com";
      const onboardingUrl = `${baseUrl}/onboarding/${token}`;
      const startDateLabel = new Date(startDate).toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });

      const preview = await previewStartDateEmail({
        candidateName: candidate.fullName,
        jobTitle,
        startDate: startDateLabel,
        onboardingUrl,
      });

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject: preview.subject,
        html: preview.html,
        text: preview.text,
        templateName: "Start Date Email",
        templateCode: "start_date_email",
      });

      results.push({ candidateId: cid, success: true });
    } catch (e: any) {
      console.error(`Failed to send start date email for candidate ${cid}:`, e);
      results.push({ candidateId: cid, success: false, error: e.message });
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  return { results };
}

export async function getRecruitmentSectionTemplates() {
  const templates = await db
    .select({
      id: recruitmentSectionTemplates.id,
      sectionId: recruitmentSectionTemplates.sectionId,
      sectionName: masterSections.name,
      requirements: recruitmentSectionTemplates.requirements,
      qualifications: recruitmentSectionTemplates.qualifications,
      mandatoryFields: recruitmentSectionTemplates.mandatoryFields,
    })
    .from(recruitmentSectionTemplates)
    .leftJoin(masterSections, eq(masterSections.id, recruitmentSectionTemplates.sectionId))
    .where(eq(recruitmentSectionTemplates.isActive, true));

  return templates
    .filter((t) => t.sectionId !== null)
    .map((t) => ({
      id: t.id,
      sectionId: t.sectionId,
      sectionName: t.sectionName || `Section ${t.sectionId}`,
      requirements: t.requirements || "",
      qualifications: (t.qualifications as string[]) || [],
      mandatoryFields: (t.mandatoryFields as string[]) || [],
    }));
}
