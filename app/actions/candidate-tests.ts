"use server";

import { db } from "@/db";
import { hcOnlineTestAssignments, hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAnswers, hcCandidates } from "@/db/schema/hero";
import { eq, and, inArray, desc, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { randomUUID } from "crypto";
import {
  type CandidateApplicationIdentity,
  extractCandidateIdentityFromAnswer,
  hasCandidateApplicationIdentity,
  mergeCandidateApplicationIdentity,
} from "@/lib/hc-application-form-identity";

export async function getTestByAccessKey(accessKey: string) {
  const [assignment] = await db.select().from(hcOnlineTestAssignments).where(eq(hcOnlineTestAssignments.accessKey, accessKey)).limit(1);
  if (!assignment) return null;

  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, assignment.testId)).limit(1);
  if (!test) return null;

  const questions = await db.select().from(hcOnlineTestQuestions).where(eq(hcOnlineTestQuestions.testId, test.id)).orderBy(hcOnlineTestQuestions.sortOrder);
  
  const hasAutoScore = questions.some(q => q.correctAnswer && q.correctAnswer.trim() !== '');

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

  const scheduledAt = assignment.scheduledAt;
  const scheduledEndAt = assignment.scheduledEndAt;
  const now = new Date();

  // Block if before start or after end
  if ((scheduledAt && now < scheduledAt) || (scheduledEndAt && now > scheduledEndAt)) {
    return { assignment: { ...assignment, scheduledAt, scheduledEndAt }, test, questions: [], previousAnswers: null, hasAutoScore };
  }

  // Compute score breakdown for completed assignments
  let scoreBreakdown: { score: number | null; correctCount: number; totalQuestions: number; percentage: number; passingScore: number; passed: boolean | null; hasAutoScore: boolean } | null = null;
  if (assignment.status === "Completed") {
    const ansRows = await db.select({ isCorrect: hcOnlineTestAnswers.isCorrect, pointsAwarded: hcOnlineTestAnswers.pointsAwarded })
      .from(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, assignment.id));
    const correctCount = ansRows.filter((a) => a.isCorrect === true).length;
    const totalQuestions = ansRows.length;
    const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const passingScore = test.passingScore ?? 0;
    const passed = totalQuestions > 0 ? percentage >= passingScore : null;
    scoreBreakdown = { score: assignment.score, correctCount, totalQuestions, percentage, passingScore, passed, hasAutoScore };
  }

  return { assignment: { ...assignment, scheduledAt, scheduledEndAt }, test, questions: safeQuestions, previousAnswers, scoreBreakdown, hasAutoScore };
}

export async function submitTestAnswer(assignmentId: number, questionId: number, answerText: string) {
  await db.insert(hcOnlineTestAnswers).values({ assignmentId, questionId, answerText, isCorrect: null, pointsAwarded: 0 });
}

export async function finishTestAssignment(assignmentId: number, answers?: Record<number, string>, telemetry?: { tabLeaveCount?: number; refreshCount?: number }) {
  const [assignment] = await db.select().from(hcOnlineTestAssignments).where(eq(hcOnlineTestAssignments.id, assignmentId)).limit(1);
  if (!assignment) throw new Error("Assignment not found");

  const questionIds = answers ? Object.keys(answers || {}).map((id) => Number(id)).filter(Boolean) : [];
  const questions = questionIds.length
    ? await db.select().from(hcOnlineTestQuestions).where(inArray(hcOnlineTestQuestions.id, questionIds))
    : [];
  const questionById = new Map(questions.map((question) => [question.id, question]));

  if (answers) {
    await db.delete(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, assignmentId));
    const answerRows = Object.entries(answers || {}).map(([questionId, answerText]) => {
      const question = questionById.get(Number(questionId));
      const normalizedAnswer = answerText.trim().toLowerCase();
      const normalizedCorrect = (question?.correctAnswer || "").trim().toLowerCase();
      const optionBasedTypes = ["multiple_choice", "true_false", "checkbox", "dropdown", "rating", "matching", "ordering"];
      const isOptionBased = optionBasedTypes.includes(question?.questionType || "");
      const hasCorrectAnswer = normalizedCorrect.length > 0;
      const isCorrect = hasCorrectAnswer
        ? (isOptionBased ? normalizedAnswer === normalizedCorrect : normalizedAnswer.includes(normalizedCorrect))
        : null;
      return { assignmentId, questionId: Number(questionId), answerText, isCorrect, pointsAwarded: isCorrect ? question?.points || 0 : 0 };
    });
    if (answerRows.length) await db.insert(hcOnlineTestAnswers).values(answerRows);
  }

  const savedAnswers = await db.select({ pointsAwarded: hcOnlineTestAnswers.pointsAwarded, isCorrect: hcOnlineTestAnswers.isCorrect }).from(hcOnlineTestAnswers).where(eq(hcOnlineTestAnswers.assignmentId, assignmentId));
  const score = savedAnswers.reduce((total, answer) => total + answer.pointsAwarded, 0);
  const correctCount = savedAnswers.filter((a) => a.isCorrect === true).length;
  const totalQuestions = savedAnswers.length;
  const percentage = totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
  const completedAt = new Date();
  const durationSeconds = assignment.startedAt ? Math.max(0, Math.round((completedAt.getTime() - assignment.startedAt.getTime()) / 1000)) : null;

  const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, assignment.testId)).limit(1);

  // Check if any question in this test has a correctAnswer (auto-score capability)
  const testQuestions = await db.select({ correctAnswer: hcOnlineTestQuestions.correctAnswer })
    .from(hcOnlineTestQuestions)
    .where(eq(hcOnlineTestQuestions.testId, assignment.testId));
  const hasAutoScore = testQuestions.some(q => q.correctAnswer && q.correctAnswer.trim() !== '');

  if (test?.isApplicationForm && answers) {
    let identity: CandidateApplicationIdentity = {};
    
    for (const [qIdStr, text] of Object.entries(answers || {})) {
      const questionText = questionById.get(Number(qIdStr))?.questionText ?? "";
      identity = mergeCandidateApplicationIdentity(identity, extractCandidateIdentityFromAnswer(questionText, text));
    }
    
    if (hasCandidateApplicationIdentity(identity)) {
      const updateData: any = {};
      if (identity.fullName) updateData.fullName = identity.fullName;
      if (identity.email) updateData.email = identity.email;
      if (identity.phone) updateData.phone = identity.phone;
      
      await db.update(hcCandidates)
        .set(updateData)
        .where(eq(hcCandidates.id, assignment.candidateId));
    }
  }

  await db.update(hcOnlineTestAssignments)
    .set({ status: "Completed", score, completedAt, durationSeconds, tabLeaveCount: telemetry?.tabLeaveCount ?? 0, refreshCount: telemetry?.refreshCount ?? 0 })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
  
  revalidatePath("/dashboard/hc/recruitment");

  const passingScore = test?.passingScore ?? 0;
  const passed = totalQuestions > 0 ? percentage >= passingScore : null;
  return { score, correctCount, totalQuestions, percentage, passingScore, passed, hasAutoScore };
}

export async function startTestAssignment(assignmentId: number) {
  await db.update(hcOnlineTestAssignments)
    .set({ status: "In Progress", startedAt: new Date() })
    .where(eq(hcOnlineTestAssignments.id, assignmentId));
}

export async function registerForPublicTest(testId: number, data: { fullName: string; phone: string; email: string }) {
  try {
    const [test] = await db.select().from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
    if (!test) throw new Error("Test not found");

    const candidates = await db.select()
      .from(hcCandidates)
      .where(and(
        eq(hcCandidates.fullName, data.fullName),
        eq(hcCandidates.phone, data.phone)
      ))
      .orderBy(desc(hcCandidates.createdAt))
      .limit(1);
    let candidate = candidates[0];

    if (!candidate) {
      const [newCandidate] = await db.insert(hcCandidates).values({
        fullName: data.fullName,
        email: data.email || "",
        phone: data.phone,
        source: "Public Test Link",
        currentStage: "Psikotes",
      }).returning();
      candidate = newCandidate;
    } else if (data.email && !candidate.email) {
      await db.update(hcCandidates).set({ email: data.email }).where(eq(hcCandidates.id, candidate.id));
    }

    const accessKey = randomUUID();
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

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

export async function getCandidateTestResults(candidateId: number) {
  const assignments = await db
    .select({
      id: hcOnlineTestAssignments.id,
      testId: hcOnlineTestAssignments.testId,
      testTitle: hcOnlineTests.title,
      isApplicationForm: hcOnlineTests.isApplicationForm,
      status: hcOnlineTestAssignments.status,
      score: hcOnlineTestAssignments.score,
      passingScore: hcOnlineTests.passingScore,
      startedAt: hcOnlineTestAssignments.startedAt,
      completedAt: hcOnlineTestAssignments.completedAt,
      createdAt: hcOnlineTestAssignments.createdAt,
    })
    .from(hcOnlineTestAssignments)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestAssignments.testId, hcOnlineTests.id))
    .where(eq(hcOnlineTestAssignments.candidateId, candidateId))
    .orderBy(desc(hcOnlineTestAssignments.createdAt));

  // Check which tests have auto-scoring
  const testIds = [...new Set(assignments.map(a => a.testId))];
  const autoScoreTests = testIds.length > 0
    ? await db.select({ testId: hcOnlineTestQuestions.testId })
        .from(hcOnlineTestQuestions)
        .where(
          and(
            inArray(hcOnlineTestQuestions.testId, testIds),
            sql`trim(${hcOnlineTestQuestions.correctAnswer}) != ''`
          )
        )
    : [];
  const testIdsWithAutoScore = new Set(autoScoreTests.map(t => t.testId));

  const results = [];
  for (const a of assignments) {
    const answers = await db
      .select({
        id: hcOnlineTestAnswers.id,
        questionId: hcOnlineTestAnswers.questionId,
        answerText: hcOnlineTestAnswers.answerText,
        isCorrect: hcOnlineTestAnswers.isCorrect,
        pointsAwarded: hcOnlineTestAnswers.pointsAwarded,
        questionText: hcOnlineTestQuestions.questionText,
        questionType: hcOnlineTestQuestions.questionType,
        maxPoints: hcOnlineTestQuestions.points,
      })
      .from(hcOnlineTestAnswers)
      .innerJoin(hcOnlineTestQuestions, eq(hcOnlineTestAnswers.questionId, hcOnlineTestQuestions.id))
      .where(eq(hcOnlineTestAnswers.assignmentId, a.id))
      .orderBy(hcOnlineTestQuestions.sortOrder);

    const totalMax = answers.reduce((sum, ans) => sum + ans.maxPoints, 0);
    const totalEarned = answers.reduce((sum, ans) => sum + ans.pointsAwarded, 0);
    const correctCount = answers.filter((ans) => ans.isCorrect === true).length;
    const percentage = answers.length > 0 ? Math.round((correctCount / answers.length) * 100) : 0;
    const passingScore = a.passingScore ?? 0;
    const passed = answers.length > 0 ? percentage >= passingScore : null;
    const hasAutoScore = testIdsWithAutoScore.has(a.testId);

    results.push({
      ...a,
      answers,
      totalMaxPoints: totalMax,
      totalEarnedPoints: totalEarned,
      correctCount,
      totalQuestions: answers.length,
      percentage,
      passed,
      hasAutoScore,
    });
  }

  return results;
}
