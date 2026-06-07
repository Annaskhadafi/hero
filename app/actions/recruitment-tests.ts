"use server";

import { db } from "@/db";
import { hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAssignments, hcOnlineTestAnswers, hcCandidates, hcRecruitments } from "@/db/schema/hero";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { randomUUID } from "crypto";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";

export async function ensureScheduledAtColumn() {
  await db.execute(sql`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hero_hc_online_test_assignments'
        AND column_name = 'scheduled_at'
      ) THEN
        ALTER TABLE hero_hc_online_test_assignments ADD COLUMN scheduled_at timestamp;
      END IF;
    END $$;
  `);
}


export async function getRecruitmentTestCandidates() {
  return await db.select({
    id: hcCandidates.id,
    fullName: hcCandidates.fullName,
    email: hcCandidates.email,
    phone: hcCandidates.phone,
    currentStage: hcCandidates.currentStage,
  }).from(hcCandidates).orderBy(desc(hcCandidates.createdAt));
}

export async function assignTestToCandidate(testId: number, candidateId: number, expiresInDays = 7, scheduledAt?: Date | null) {
  await ensureScheduledAtColumn();
  const accessKey = randomUUID();
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + expiresInDays);

  const [assignment] = await db.insert(hcOnlineTestAssignments).values({
    testId,
    candidateId,
    accessKey,
    expiresAt,
    scheduledAt: scheduledAt || null,
    status: "Pending",
  }).returning();

  const [test] = await db.select({ title: hcOnlineTests.title }).from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
  const [candidate] = await db.select({
    fullName: hcCandidates.fullName,
    email: hcCandidates.email,
    jobTitle: hcRecruitments.jobTitle,
  }).from(hcCandidates).leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id)).where(eq(hcCandidates.id, candidateId)).limit(1);

  if (candidate?.email && test?.title) {
    try {
      const smtpSettings = await getEmailSmtpSettingsData();
      if (smtpSettings.host && smtpSettings.fromEmail) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const testLink = `${baseUrl}/test/${accessKey}`;
        const { format } = await import("date-fns");
        const scheduledDate = scheduledAt ? format(scheduledAt, "dd MMMM yyyy") : "";
        const scheduledTime = scheduledAt ? format(scheduledAt, "HH:mm") : "";
        const templateVars = {
          candidateName: candidate.fullName,
          jobTitle: candidate.jobTitle || "Position",
          companyName: "PT Chitra Paratama",
          date: scheduledDate,
          time: scheduledTime,
          location: scheduledDate ? `Online - available from ${scheduledDate} at ${scheduledTime}` : "",
          interviewer: "",
          duration: String(expiresInDays),
          testLink,
        };

        const template = await getHcEmailTemplateByType("test_assigned");
        let subject: string, html: string, text: string;

        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.body;
          text = rendered.body.replace(/<[^>]*>/g, "");
        } else {
          subject = `[HERO] Online Test - ${test.title}`;
          html = `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px">
  <h2 style="color:#0f172a;">Online Test Assignment</h2>
  <p>Dear <strong>${candidate.fullName}</strong>,</p>
  <p>You have been assigned the <strong>${test.title}</strong> test for <strong>${candidate.jobTitle || "the position"}</strong>.</p>
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;text-align:center;">
    <p style="margin-bottom:16px;">Click the button below to start your test:</p>
    <a href="${testLink}" target="_blank" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Start Test</a>
  </div>
  <p style="font-size:13px;color:#64748b;">This link expires in ${expiresInDays} days. Complete the test before the deadline.</p>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;
          text = `Dear ${candidate.fullName},\n\nYou have been assigned the ${test.title} test for ${candidate.jobTitle || "the position"}.\n\nStart your test here: ${testLink}\n\nThis link expires in ${expiresInDays} days.\n\nBest regards,\nHuman Capital Team`;
        }

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          subject,
          html,
          text,
          templateName: "Online Test Assigned",
          templateCode: "test_assigned",
        });
      }
    } catch (error) {
      console.error("Failed to send test assignment email:", error);
    }
  }

  revalidatePath(`/dashboard/hc/recruitment/tests/${testId}`);
  return assignment;
}

export async function bulkAssignTestToCandidates(testId: number, candidateIds: number[], expiresInDays = 7, scheduledAt?: Date | null) {
  await ensureScheduledAtColumn();
  const results: Array<{ candidateId: number; success: boolean; error?: string }> = [];

  const [test] = await db.select({ title: hcOnlineTests.title }).from(hcOnlineTests).where(eq(hcOnlineTests.id, testId)).limit(1);
  if (!test) return { results: [], testTitle: "" };

  const candidates = await db
    .select({
      id: hcCandidates.id,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      jobTitle: hcRecruitments.jobTitle,
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .where(inArray(hcCandidates.id, candidateIds));

  const smtpSettings = await getEmailSmtpSettingsData();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const { format } = await import("date-fns");
  const template = await getHcEmailTemplateByType("test_assigned");

  for (const candidate of candidates) {
    try {
      const accessKey = randomUUID();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      await db.insert(hcOnlineTestAssignments).values({
        testId,
        candidateId: candidate.id,
        accessKey,
        expiresAt,
        scheduledAt: scheduledAt || null,
        status: "Pending",
      });

      if (candidate.email && smtpSettings.host && smtpSettings.fromEmail) {
        const testLink = `${baseUrl}/test/${accessKey}`;
        const scheduledDate = scheduledAt ? format(scheduledAt, "dd MMMM yyyy") : "";
        const scheduledTime = scheduledAt ? format(scheduledAt, "HH:mm") : "";
        const templateVars = {
          candidateName: candidate.fullName,
          jobTitle: candidate.jobTitle || "Position",
          companyName: "PT Chitra Paratama",
          date: scheduledDate,
          time: scheduledTime,
          location: scheduledDate ? `Online - available from ${scheduledDate} at ${scheduledTime}` : "",
          interviewer: "",
          duration: String(expiresInDays),
          testLink,
        };

        let subject: string, html: string, text: string;
        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.body;
          text = rendered.body.replace(/<[^>]*>/g, "");
        } else {
          subject = `[HERO] Online Test - ${test.title}`;
          html = `<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px">
  <h2 style="color:#0f172a;">Online Test Assignment</h2>
  <p>Dear <strong>${candidate.fullName}</strong>,</p>
  <p>You have been assigned the <strong>${test.title}</strong> test for <strong>${candidate.jobTitle || "the position"}</strong>.</p>
  ${scheduledDate ? `<p style="color:#92400e;"><strong>Note:</strong> This test will only be accessible starting <strong>${scheduledDate} at ${scheduledTime}</strong>. Your unique access link is below.</p>` : ""}
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;text-align:center;">
    <p style="margin-bottom:16px;">Click the button below to start your test:</p>
    <a href="${testLink}" target="_blank" style="display:inline-block;background:#0f172a;color:#fff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;">Start Test</a>
  </div>
  <p style="font-size:13px;color:#64748b;">This link expires in ${expiresInDays} days. Complete the test before the deadline.</p>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;
          text = `Dear ${candidate.fullName},\n\nYou have been assigned the ${test.title} test for ${candidate.jobTitle || "the position"}.\n\nStart your test here: ${testLink}\n\nThis link expires in ${expiresInDays} days.\n\nBest regards,\nHuman Capital Team`;
        }

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          subject,
          html,
          text,
          templateName: "Online Test Assigned",
          templateCode: "test_assigned",
        });
      }
      results.push({ candidateId: candidate.id, success: true });
    } catch (error: any) {
      results.push({ candidateId: candidate.id, success: false, error: error.message });
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  return { results, testTitle: test.title };
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



