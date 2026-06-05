"use server";

import { db } from "@/db";
import { hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAssignments, hcOnlineTestAnswers, hcCandidates } from "@/db/schema/hero";
import { eq, desc, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { randomUUID } from "crypto";


export async function getRecruitmentTestCandidates() {
  return await db.select({
    id: hcCandidates.id,
    fullName: hcCandidates.fullName,
    email: hcCandidates.email,
    phone: hcCandidates.phone,
    currentStage: hcCandidates.currentStage,
  }).from(hcCandidates).orderBy(desc(hcCandidates.createdAt));
}

export async function assignTestToCandidate(testId: number, candidateId: number, expiresInDays = 7) {
  const accessKey = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [assignment] = await db.insert(hcOnlineTestAssignments).values({
    testId,
    candidateId,
    accessKey,
    expiresAt,
    status: "Pending",
  }).returning();

  revalidatePath(`/dashboard/hc/recruitment/tests/${testId}`);
  return assignment;
}

export async function importTestQuestions(testId: number, rows: Array<{ questionType: string; questionText: string; options?: any; correctAnswer: string; points: number; sortOrder: number }>) {
  if (rows.length === 0) return [];
  const created = await db.insert(hcOnlineTestQuestions).values(rows.map((row) => ({
    testId,
    questionType: row.questionType,
    questionText: row.questionText,
    imageUrl: "",
    options: row.options || null,
    correctAnswer: row.correctAnswer,
    points: row.points,
    sortOrder: row.sortOrder,
  }))).returning();

  revalidatePath(`/dashboard/hc/recruitment/tests/${testId}`);
  return created;
}

export async function updateTestQuestion(questionId: number, data: { questionType: string; questionText: string; imageUrl?: string; options?: any; correctAnswer: string; points: number; sortOrder: number }) {
  const [updated] = await db.update(hcOnlineTestQuestions).set({
    questionType: data.questionType,
    questionText: data.questionText,
    imageUrl: data.imageUrl || "",
    options: ["multiple_choice", "true_false", "checkbox", "dropdown", "rating", "matching", "ordering", "psychometric_scale", "personality", "interest_aptitude", "situational_judgement"].includes(data.questionType) ? data.options || null : null,
    correctAnswer: data.correctAnswer,
    points: data.points,
    sortOrder: data.sortOrder,
  }).where(eq(hcOnlineTestQuestions.id, questionId)).returning();

  revalidatePath("/dashboard/hc/recruitment/tests");
  return updated;
}

export async function gradeTestAnswer(answerId: number, pointsAwarded: number, isCorrect: boolean | null) {
  const [answer] = await db.update(hcOnlineTestAnswers)
    .set({ pointsAwarded, isCorrect })
    .where(eq(hcOnlineTestAnswers.id, answerId))
    .returning();

  if (answer) {
    const answers = await db.select({ pointsAwarded: hcOnlineTestAnswers.pointsAwarded })
      .from(hcOnlineTestAnswers)
      .where(eq(hcOnlineTestAnswers.assignmentId, answer.assignmentId));
    const totalScore = answers.reduce((total, item) => total + item.pointsAwarded, 0);
    await db.update(hcOnlineTestAssignments)
      .set({ score: totalScore, status: "Graded" })
      .where(eq(hcOnlineTestAssignments.id, answer.assignmentId));
  }

  revalidatePath("/dashboard/hc/recruitment/tests");
  return answer;
}

export async function getOnlineTests() {
  return await db.select().from(hcOnlineTests).orderBy(desc(hcOnlineTests.createdAt));
}

export async function getTestWithQuestions(testId: number) {
  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
  if (!test) return null;

  const questions = await db.select().from(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.testId, testId)).orderBy(hcOnlineTestQuestions.sortOrder);
  
  const resolvedQuestions = await Promise.all(questions.map(async (q) => {
    let readableImageUrl = q.imageUrl;
    if (readableImageUrl) {
      readableImageUrl = await getS3ObjectReadUrl(readableImageUrl) || readableImageUrl;
    }
    
    let resolvedOptions = q.options;
    if (Array.isArray(resolvedOptions)) {
      resolvedOptions = await Promise.all(resolvedOptions.map(async (opt: any) => {
        if (opt.imageUrl) {
          return { ...opt, readableImageUrl: await getS3ObjectReadUrl(opt.imageUrl) || opt.imageUrl };
        }
        return opt;
      }));
    }
    
    return { ...q, readableImageUrl, options: resolvedOptions };
  }));

  return { test, questions: resolvedQuestions };
}

export async function getTestEntries(testId: number) {
  const entries = await db.select({
    id: hcOnlineTestAssignments.id,
    accessKey: hcOnlineTestAssignments.accessKey,
    status: hcOnlineTestAssignments.status,
    score: hcOnlineTestAssignments.score,
    startedAt: hcOnlineTestAssignments.startedAt,
    completedAt: hcOnlineTestAssignments.completedAt,
    expiresAt: hcOnlineTestAssignments.expiresAt,
    candidate: {
      id: hcCandidates.id,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
    }
  })
  .from(hcOnlineTestAssignments)
  .innerJoin(hcCandidates, eq(hcOnlineTestAssignments.candidateId, hcCandidates.id))
  .where(eq(hcOnlineTestAssignments.testId, testId))
  .orderBy(desc(hcOnlineTestAssignments.createdAt));

  if (entries.length === 0) return entries;

  const assignmentIds = entries.map((entry) => entry.id);
  const answers = await db.select({
    id: hcOnlineTestAnswers.id,
    assignmentId: hcOnlineTestAnswers.assignmentId,
    questionId: hcOnlineTestAnswers.questionId,
    answerText: hcOnlineTestAnswers.answerText,
    isCorrect: hcOnlineTestAnswers.isCorrect,
    pointsAwarded: hcOnlineTestAnswers.pointsAwarded,
    questionText: hcOnlineTestQuestions.questionText,
    questionType: hcOnlineTestQuestions.questionType,
    correctAnswer: hcOnlineTestQuestions.correctAnswer,
    points: hcOnlineTestQuestions.points,
    sortOrder: hcOnlineTestQuestions.sortOrder,
  })
  .from(hcOnlineTestAnswers)
  .innerJoin(hcOnlineTestQuestions, eq(hcOnlineTestAnswers.questionId, hcOnlineTestQuestions.id))
  .where(inArray(hcOnlineTestAnswers.assignmentId, assignmentIds))
  .orderBy(hcOnlineTestQuestions.sortOrder);

  const answersByAssignment = new Map<number, typeof answers>();
  for (const answer of answers) {
    const existing = answersByAssignment.get(answer.assignmentId) ?? [];
    existing.push(answer);
    answersByAssignment.set(answer.assignmentId, existing);
  }

  return entries.map((entry) => ({ ...entry, answers: answersByAssignment.get(entry.id) ?? [] }));
}

export async function updateTestEntry(entryId: number, data: { status: string; score: number | null }) {
  const [updated] = await db.update(hcOnlineTestAssignments)
    .set({ status: data.status, score: data.score })
    .where(eq(hcOnlineTestAssignments.id, entryId))
    .returning();

  revalidatePath("/dashboard/hc/recruitment/tests");
  return updated;
}

export async function deleteTestEntry(entryId: number) {
  await db.delete(hcOnlineTestAssignments).where(eq(hcOnlineTestAssignments.id, entryId));
  revalidatePath("/dashboard/hc/recruitment/tests");
}

export async function createOnlineTest(data: { title: string; description: string; timeLimitMinutes: number; passingScore: number }) {
  const [created] = await db.insert(hcOnlineTests).values({
    title: data.title,
    description: data.description,
    timeLimitMinutes: data.timeLimitMinutes,
    passingScore: data.passingScore,
  }).returning();
  
  revalidatePath("/dashboard/hc/recruitment/tests");
  return created;
}

export async function updateOnlineTest(id: number, data: any) {
  const [updated] = await db.update(hcOnlineTests).set({ ...data, updatedAt: new Date() }).where(eq(hcOnlineTests.id, id)).returning();
  revalidatePath("/dashboard/hc/recruitment/tests");
  return updated;
}

export async function addTestQuestion(testId: number, data: { questionType: string; questionText: string; imageUrl?: string; options?: any; correctAnswer: string; points: number; sortOrder: number }) {
  const [created] = await db.insert(hcOnlineTestQuestions).values({
    testId,
    questionType: data.questionType,
    questionText: data.questionText,
    imageUrl: data.imageUrl || '',
    options: data.options || null,
    correctAnswer: data.correctAnswer,
    points: data.points,
    sortOrder: data.sortOrder,
  }).returning();

  revalidatePath("/dashboard/hc/recruitment/tests");
  return created;
}

export async function deleteTestQuestion(questionId: number) {
  await db.delete(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.id, questionId));
  revalidatePath("/dashboard/hc/recruitment/tests");
}

export async function deleteOnlineTest(id: number) {
  await db.delete(hcOnlineTests).where(eq(hcOnlineTests.id, id));
  revalidatePath("/dashboard/hc/recruitment/tests");
}



