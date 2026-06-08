"use server";

import { db } from "@/db";
import { hcOnlineTests, hcOnlineTestQuestions, hcOnlineTestAssignments, hcOnlineTestAnswers, hcCandidates, hcRecruitments } from "@/db/schema/hero";
import { eq, desc, inArray, sql, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getS3ObjectReadUrl } from "@/lib/s3-storage";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { randomUUID } from "crypto";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";
import { getPublicAppUrl } from "@/lib/auth-config";
import { formatInTimeZone } from "date-fns-tz";
const WITA_TZ = "Asia/Makassar";
import {
  type CandidateApplicationIdentity,
  extractCandidateIdentityFromAnswer,
  mergeCandidateApplicationIdentity,
} from "@/lib/hc-application-form-identity";

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
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'hero_hc_online_test_assignments'
        AND column_name = 'scheduled_end_at'
      ) THEN
        ALTER TABLE hero_hc_online_test_assignments ADD COLUMN scheduled_end_at timestamp;
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
        const baseUrl = getPublicAppUrl();
        const testLink = `${baseUrl}/test/${accessKey}`;
        const { formatInTimeZone } = await import("date-fns-tz");
        const WITA_TZ = "Asia/Makassar";
        const scheduledDate = scheduledAt ? formatInTimeZone(scheduledAt, WITA_TZ, "dd MMMM yyyy") : "";
        const scheduledTime = scheduledAt ? formatInTimeZone(scheduledAt, WITA_TZ, "HH:mm") + " WITA" : "";
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
        let subject: string, html: string | undefined, text: string;
        let emailFormat: string | null = null;

        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          emailFormat = template.format || null;
          const scheduledDateA = scheduledDate; const scheduledTimeA = scheduledTime;
          if (scheduledDateA) {
            if (emailFormat === "plain_text") {
              text = `🗓 Jadwal Tes: ${scheduledDateA} · ${scheduledTimeA}\n\n` + text;
            } else {
              html = `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>🗓 Jadwal Tes:</strong> ${scheduledDateA} · ${scheduledTimeA}
</div>` + (html || "");
            }
          }
        } else {
          subject = `[HERO] Undangan Tes Online — ${test.title}`;
          html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, ${candidate.fullName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap selanjutnya</strong> dan diundang untuk mengikuti tes <strong>${test.title}</strong> untuk posisi <strong>${candidate.jobTitle || "yang dilamar"}</strong>.
      </p>
      ${scheduledDate ? `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>🗓 Jadwal Tes:</strong></p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#92400e;">${scheduledDate} · ${scheduledTime}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#a16207;">Link tes hanya dapat diakses pada waktu di atas.</p>
      </div>` : ""}
      <div style="text-align:center;margin:24px 0;">
        <a href="${testLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">🔗 Mulai Tes Sekarang</a>
      </div>
      <p style="margin:16px 0;color:#94a3b8;font-size:12px;">
        Link berlaku selama <strong>${expiresInDays} hari</strong>. Mohon diselesaikan sebelum batas waktu.<br/>
        Jika mengalami kendala, silakan hubungi Tim Human Capital.
      </p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">PT Chitra Paratama · Human Capital Division</p>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
          text = `Halo ${candidate.fullName},\n\nSelamat! Anda lolos ke tahap selanjutnya dan diundang untuk mengikuti tes ${test.title} untuk posisi ${candidate.jobTitle || "yang dilamar"}.\n\nMulai tes: ${testLink}\n\nLink berlaku ${expiresInDays} hari.\n\nTerima kasih,\nTim Human Capital\nPT Chitra Paratama`;
        }

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          subject,
          html,
          text,
          format: emailFormat,
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
  const baseUrl = getPublicAppUrl();
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
        const { formatInTimeZone } = await import("date-fns-tz");
        const WITA_TZ = "Asia/Makassar";
        const scheduledDate = scheduledAt ? formatInTimeZone(scheduledAt, WITA_TZ, "dd MMMM yyyy") : "";
        const scheduledTime = scheduledAt ? formatInTimeZone(scheduledAt, WITA_TZ, "HH:mm") + " WITA" : "";
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

        let subject: string, html: string | undefined, text: string;
        let emailFormat: string | null = null;
        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          emailFormat = template.format || null;
          if (scheduledDate) {
            if (emailFormat === "plain_text") {
              text = `🗓 Jadwal Tes: ${scheduledDate} · ${scheduledTime}\n\n` + text;
            } else {
              html = `<div style="font-family:Arial,sans-serif;background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>🗓 Jadwal Tes:</strong> ${scheduledDate} · ${scheduledTime}
</div>` + (html || "");
            }
          }
        } else {
          subject = `[HERO] Undangan Tes Online — ${test.title}`;
          html = `<!DOCTYPE html>...`;
          html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, ${candidate.fullName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap selanjutnya</strong> dan diundang untuk mengikuti tes <strong>${test.title}</strong> untuk posisi <strong>${candidate.jobTitle || "yang dilamar"}</strong>.
      </p>
      ${scheduledDate ? `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>🗓 Jadwal Tes:</strong></p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#92400e;">${scheduledDate} · ${scheduledTime}</p>
        <p style="margin:4px 0 0;font-size:12px;color:#a16207;">Link tes hanya dapat diakses pada waktu di atas.</p>
      </div>` : ""}
      <div style="text-align:center;margin:24px 0;">
        <a href="${testLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;letter-spacing:0.3px;">🔗 Mulai Tes Sekarang</a>
      </div>
      <p style="margin:16px 0;color:#94a3b8;font-size:12px;">
        Link berlaku selama <strong>${expiresInDays} hari</strong>. Mohon diselesaikan sebelum batas waktu.<br/>
        Jika mengalami kendala, silakan hubungi Tim Human Capital.
      </p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">PT Chitra Paratama · Human Capital Division</p>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;
          text = `Halo ${candidate.fullName},\n\nSelamat! Anda lolos ke tahap selanjutnya dan diundang untuk mengikuti tes ${test.title} untuk posisi ${candidate.jobTitle || "yang dilamar"}.\n\nMulai tes: ${testLink}\n\nLink berlaku ${expiresInDays} hari.\n\nTerima kasih,\nTim Human Capital\nPT Chitra Paratama`;
        }

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          subject,
          html,
          text,
          format: emailFormat,
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

  // Resolve real names from application form answers for anonymous test-group candidates
  const anonymousCandidateIds = Array.from(new Set(entries
    .filter((entry) => (entry.candidate?.fullName ?? "").startsWith("Peserta Test Group") || (entry.candidate?.email ?? "").includes("@test.local"))
    .map((entry) => entry.candidate.id)));

  if (anonymousCandidateIds.length > 0) {
    const appFormAnswers = await db.select({
      candidateId: hcOnlineTestAssignments.candidateId,
      questionText: hcOnlineTestQuestions.questionText,
      answerText: hcOnlineTestAnswers.answerText,
    })
    .from(hcOnlineTestAnswers)
    .innerJoin(hcOnlineTestAssignments, eq(hcOnlineTestAnswers.assignmentId, hcOnlineTestAssignments.id))
    .innerJoin(hcOnlineTests, eq(hcOnlineTestAssignments.testId, hcOnlineTests.id))
    .innerJoin(hcOnlineTestQuestions, eq(hcOnlineTestAnswers.questionId, hcOnlineTestQuestions.id))
    .where(
      and(
        inArray(hcOnlineTestAssignments.candidateId, anonymousCandidateIds),
        eq(hcOnlineTestAssignments.status, "Completed"),
        eq(hcOnlineTests.isApplicationForm, true)
      )
    );

    const resolvedNames = new Map<number, CandidateApplicationIdentity>();
    for (const row of appFormAnswers) {
      const current = resolvedNames.get(row.candidateId) ?? {};
      const next = extractCandidateIdentityFromAnswer(row.questionText ?? "", row.answerText ?? "");
      resolvedNames.set(row.candidateId, mergeCandidateApplicationIdentity(current, next));
    }

    for (const entry of entries) {
      const resolved = resolvedNames.get(entry.candidate.id);
      if (!resolved) continue;
      if (resolved.fullName) entry.candidate.fullName = resolved.fullName;
      if (resolved.email) entry.candidate.email = resolved.email;
    }
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



