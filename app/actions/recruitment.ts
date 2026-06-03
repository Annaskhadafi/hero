"use server";

import { db } from "@/db";
import {
  hcRecruitments,
  hcCandidates,
  hcCandidateStages,
} from "@/db/schema/hero";
import { eq, desc, and, sql, count, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// ─── Types ────────────────────────────────────────────────────────────────

export type RecruitmentFilter = {
  status?: string;
};

export type RecruitmentData = {
  jobTitle: string;
  totalRequested: number;
  section: string;
  status?: string;
  dueDate: string;
  priority?: string;
};

export type CandidateData = {
  recruitmentId: number;
  fullName: string;
  email?: string;
  phone?: string;
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

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const rows = await db
    .select({
      id: hcRecruitments.id,
      jobTitle: hcRecruitments.jobTitle,
      totalRequested: hcRecruitments.totalRequested,
      section: hcRecruitments.section,
      status: hcRecruitments.status,
      requestDate: hcRecruitments.requestDate,
      dueDate: hcRecruitments.dueDate,
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
      hcRecruitments.totalRequested,
      hcRecruitments.section,
      hcRecruitments.status,
      hcRecruitments.requestDate,
      hcRecruitments.dueDate
    )
    .orderBy(desc(hcRecruitments.createdAt));

  return rows;
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

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
        sql`${hcRecruitments.dueDate} < now()`,
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
      totalRequested: data.totalRequested,
      section: data.section,
      status: data.status ?? "Draft",
      dueDate: new Date(data.dueDate),
    })
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

export async function updateRecruitment(id: number, data: Partial<RecruitmentData>) {
  const updatePayload: Record<string, unknown> = { updatedAt: new Date() };

  if (data.jobTitle !== undefined) updatePayload.jobTitle = data.jobTitle;
  if (data.totalRequested !== undefined) updatePayload.totalRequested = data.totalRequested;
  if (data.section !== undefined) updatePayload.section = data.section;
  if (data.status !== undefined) updatePayload.status = data.status;
  if (data.dueDate !== undefined) updatePayload.dueDate = new Date(data.dueDate);

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

// ─── Candidates ───────────────────────────────────────────────────────────

export async function getCandidates(recruitmentId?: number) {
  const conditions = [];

  if (recruitmentId) {
    conditions.push(eq(hcCandidates.recruitmentId, recruitmentId));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  return await db
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
      rejectionReason: hcCandidates.rejectionReason,
      createdAt: hcCandidates.createdAt,
    })
    .from(hcCandidates)
    .leftJoin(
      hcRecruitments,
      eq(hcCandidates.recruitmentId, hcRecruitments.id)
    )
    .where(whereClause)
    .orderBy(desc(hcCandidates.createdAt));
}

export async function getCandidateById(id: number) {
  const [candidate] = await db
    .select({
      id: hcCandidates.id,
      recruitmentId: hcCandidates.recruitmentId,
      jobTitle: hcRecruitments.jobTitle,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      source: hcCandidates.source,
      cvUrl: hcCandidates.cvUrl,
      currentStage: hcCandidates.currentStage,
      rating: hcCandidates.rating,
      notes: hcCandidates.notes,
      rejectionReason: hcCandidates.rejectionReason,
      rejectedAtStage: hcCandidates.rejectedAtStage,
      createdAt: hcCandidates.createdAt,
    })
    .from(hcCandidates)
    .leftJoin(
      hcRecruitments,
      eq(hcCandidates.recruitmentId, hcRecruitments.id)
    )
    .where(eq(hcCandidates.id, id))
    .limit(1);

  if (!candidate) return null;

  const stages = await db
    .select()
    .from(hcCandidateStages)
    .where(eq(hcCandidateStages.candidateId, id))
    .orderBy(hcCandidateStages.enteredAt);

  return { ...candidate, stages };
}

export async function createCandidate(data: CandidateData) {
  const [created] = await db
    .insert(hcCandidates)
    .values({
      recruitmentId: data.recruitmentId,
      fullName: data.fullName,
      email: data.email ?? "",
      phone: data.phone ?? "",
      source: data.source ?? "",
      notes: data.notes ?? "",
      currentStage: "Sourcing",
    })
    .returning();

  // Create initial stage record
  await db.insert(hcCandidateStages).values({
    candidateId: created.id,
    stage: "Sourcing",
    enteredAt: new Date(),
    notes: "Kandidat ditambahkan ke pipeline",
  });

  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

export async function updateCandidateStage(
  candidateId: number,
  newStage: string,
  data?: StageAdvanceData
) {
  const now = new Date();

  // Close the current stage
  const [currentCandidate] = await db
    .select({ currentStage: hcCandidates.currentStage })
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);

  if (currentCandidate) {
    // Mark current stage as exited
    const [currentStageRecord] = await db
      .select({ id: hcCandidateStages.id })
      .from(hcCandidateStages)
      .where(
        and(
          eq(hcCandidateStages.candidateId, candidateId),
          eq(hcCandidateStages.stage, currentCandidate.currentStage),
          isNull(hcCandidateStages.exitedAt)
        )
      )
      .limit(1);

    if (currentStageRecord) {
      await db
        .update(hcCandidateStages)
        .set({
          exitedAt: now,
          result: data?.result ?? "pass",
          evaluator: data?.evaluator ?? "",
          notes: data?.notes ?? "",
          score: data?.score ?? null,
        })
        .where(eq(hcCandidateStages.id, currentStageRecord.id));
    }
  }

  // Create new stage record
  await db.insert(hcCandidateStages).values({
    candidateId,
    stage: newStage,
    enteredAt: now,
    evaluator: data?.evaluator ?? "",
    notes: data?.notes ?? "",
    score: data?.score ?? null,
  });

  // Update candidate current stage
  const [updated] = await db
    .update(hcCandidates)
    .set({
      currentStage: newStage,
      updatedAt: now,
    })
    .where(eq(hcCandidates.id, candidateId))
    .returning();

  revalidatePath("/dashboard/hc/recruitment");
  return updated;
}

export async function rejectCandidate(
  candidateId: number,
  stage: string,
  reason: string
) {
  const now = new Date();

  // Close the current stage as failed
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
  data: Partial<{
    fullName: string;
    email: string;
    phone: string;
    source: string;
    notes: string;
    rating: number;
  }>
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
  // Stages cascade delete
  await db.delete(hcCandidates).where(eq(hcCandidates.id, id));

  revalidatePath("/dashboard/hc/recruitment");
  return { success: true };
}
