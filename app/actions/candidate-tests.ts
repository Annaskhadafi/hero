"use server";

import { db } from "@/db";
import { hcOnlineTestAssignments, hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAnswers, hcCandidates } from "@/db/schema/hero";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { randomUUID } from "crypto";

export async function getTestByAccessKey(accessKey: string) {
  const [assignment] = await db.select().from(hcOnlineTestAssignments).where(eq(hcOnlineTestAssignments.accessKey, accessKey)).limit(1);
  if (!assignment) return null;

  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, assignment.testId)).limit(1);
  if (!test) return null;

  const questions = await db.select().from(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.testId, test.id)).orderBy(hcOnlineTestQuestions.sortOrder);
  
  // Exclude correct answers from the public payload for security
  const safeQuestions = await Promise.all(questions.map(async (q) => {
    let resolvedImageUrl = q.imageUrl;
    if (resolvedImageUrl) {
      resolvedImageUrl = await getS3ObjectReadUrl(resolvedImageUrl) || resolvedImageUrl;
    }

    let resolvedOptions = q.options;
    if (Array.isArray(resolvedOptions)) {
      resolvedOptions = await Promise.all(resolvedOptions.map(async (opt: any) => {
        if (opt.imageUrl) {
          return { ...opt, imageUrl: await getS3ObjectReadUrl(opt.imageUrl) || opt.imageUrl };
        }
        return opt;
      }));
    }

    return {
      id: q.id,
      questionType: q.questionType,
      questionText: q.questionText,
      imageUrl: resolvedImageUrl,
      options: resolvedOptions,
      points: q.points,
    };
  }));

  return { assignment, test, questions: safeQuestions };
}

export async function submitTestAnswer(assignmentId: number, questionId: number, answerText: string) {
  // Simple upsert logic could be used, or just insert
  await db.insert(hcOnlineTestAnswers).values({
    assignmentId,
    questionId,
    answerText,
    isCorrect: null, // Auto-grading can happen in a separate worker or process
    pointsAwarded: 0,
  });
}

export async function finishTestAssignment(assignmentId: number) {
  await db.update(hcOnlineTestAssignments)
    .set({ status: "Completed", completedAt: new Date() })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
  
  revalidatePath("/dashboard/hc/recruitment");
}

export async function startTestAssignment(assignmentId: number) {
  await db.update(hcOnlineTestAssignments)
    .set({ status: "In Progress", startedAt: new Date() })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
}

export async function registerForPublicTest(testId: number, data: { fullName: string; email: string; phone: string }) {
  try {
    const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
    if (!test) throw new Error("Test not found");

    // Create a candidate
    const [candidate] = await db.insert(hcCandidates).values({
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      source: "Public Test Link",
      currentStage: "Psikotes", // Start at psikotes/test stage
    }).returning();

    // Create assignment
    const accessKey = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7); // Expires in 7 days

    const [assignment] = await db.insert(hcOnlineTestAssignments).values({
      testId: test.id,
      candidateId: candidate.id,
      accessKey,
      expiresAt,
      status: "Pending",
    }).returning();

    return assignment.accessKey;
  } catch (error) {
    console.error("registerForPublicTest Error:", error);
    throw new Error("Failed to register for the test. Please try again.");
  }
}
