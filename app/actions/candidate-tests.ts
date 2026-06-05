"use server";

import { db } from "@/db";
import { hcOnlineTestAssignments, hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAnswers, hcCandidates } from "@/db/schema/hero";
import { eq, and, inArray, desc } from "drizzle-orm";
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

  let previousAnswers: Record<number, string> | null = null;
  if (test.isApplicationForm) {
    // Find the last completed application form assignment for this candidate
    const previousAssignments = await db.select({
      id: hcOnlineTestAssignments.id
    })
    .from(hcOnlineTestAssignments)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestAssignments.testId, hcOnlineTests.id))
    .where(
      and(
        eq(hcOnlineTestAssignments.candidateId, assignment.candidateId),
        eq(hcOnlineTestAssignments.status, 'Completed'),
        eq(hcOnlineTests.isApplicationForm, true)
      )
    )
    .orderBy(desc(hcOnlineTestAssignments.createdAt))
    .limit(1);

    if (previousAssignments.length > 0) {
      const answersList = await db.select().from(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, previousAssignments[0].id));
      if (answersList.length > 0) {
        previousAnswers = {};
        for (const ans of answersList) {
          // We need to map it to the NEW questionId for the current test.
          // Since it's an Application Form, there's usually only 1 question.
          if (questions.length > 0) {
            previousAnswers[questions[0].id] = ans.answerText;
          }
        }
      }
    }
  }

  return { assignment, test, questions: safeQuestions, previousAnswers };
}

export async function submitTestAnswer(assignmentId: number, questionId: number, answerText: string) {
  await db.insert(hcOnlineTestAnswers).values({ assignmentId, questionId, answerText, isCorrect: null, pointsAwarded: 0 });
}

export async function finishTestAssignment(assignmentId: number, answers?: Record<number, string>, telemetry?: { tabLeaveCount?: number; refreshCount?: number }) {
  const [assignment] = await db.select().from(hcOnlineTestAssignments).where(eq(hcOnlineTestAssignments.id, assignmentId)).limit(1);
  if (!assignment) throw new Error("Assignment not found");

  const questionIds = answers ? Object.keys(answers).map((id) => Number(id)).filter(Boolean) : [];
  const questions = questionIds.length
    ? await db.select().from(hcOnlineTestQuestions).where(inArray(hcOnlineTestQuestions.id, questionIds))
    : [];
  const questionById = new Map(questions.map((question) => [question.id, question]));

  if (answers) {
    await db.delete(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, assignmentId));
    const answerRows = Object.entries(answers).map(([questionId, answerText]) => {
      const question = questionById.get(Number(questionId));
      const normalizedAnswer = answerText.trim().toLowerCase();
      const normalizedCorrect = (question?.correctAnswer || "").trim().toLowerCase();
      const optionBasedTypes = ["multiple_choice", "true_false", "checkbox", "dropdown", "rating", "matching", "ordering", "psychometric_scale", "personality", "interest_aptitude", "situational_judgement"];
      const isOptionBased = optionBasedTypes.includes(question?.questionType || "");
      const isCorrect = isOptionBased ? normalizedAnswer === normalizedCorrect : (normalizedCorrect ? normalizedAnswer.includes(normalizedCorrect) : null);
      return { assignmentId, questionId: Number(questionId), answerText, isCorrect, pointsAwarded: isCorrect ? question?.points || 0 : 0 };
    });
    if (answerRows.length) await db.insert(hcOnlineTestAnswers).values(answerRows);
  }

  const savedAnswers = await db.select({ pointsAwarded: hcOnlineTestAnswers.pointsAwarded }).from(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, assignmentId));
  const score = savedAnswers.reduce((total, answer) => total + answer.pointsAwarded, 0);
  const completedAt = new Date();
  const durationSeconds = assignment.startedAt ? Math.max(0, Math.round((completedAt.getTime() - assignment.startedAt.getTime()) / 1000)) : null;

  await db.update(hcOnlineTestAssignments)
    .set({ status: "Completed", score, completedAt, durationSeconds, tabLeaveCount: telemetry?.tabLeaveCount ?? 0, refreshCount: telemetry?.refreshCount ?? 0 })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
  
  revalidatePath("/dashboard/hc/recruitment");
}

export async function startTestAssignment(assignmentId: number) {
  await db.update(hcOnlineTestAssignments)
    .set({ status: "In Progress", startedAt: new Date() })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
}

export async function registerForPublicTest(testId: number) {
  try {
    const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
    if (!test) throw new Error("Test not found");

    const publicIdentity = randomUUID();

    // Create an anonymous candidate for public links.
    const [candidate] = await db.insert(hcCandidates).values({
      fullName: `Peserta Public Test ${publicIdentity.slice(0, 8)}`,
      email: `public-${publicIdentity}@test.local`,
      phone: "",
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
