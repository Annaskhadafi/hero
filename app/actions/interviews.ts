"use server";

import { db } from "@/db";
import {
  employees,
  hcCandidateInterviews,
  hcCandidatePanelEvaluations,
  hcCandidates,
  hcInterviewSettings,
  hcRecruitments,
  notificationEvents,
  notificationDeliveries,
  hcOnlineTestAssignments,
  hcOnlineTests,
} from "@/db/schema/hero";
import { eq, desc, inArray, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";
import { getHumanCapitalPolicyCcRecipients } from "@/lib/human-capital-email";
import { resolveWorkflowTemplateContent } from "@/lib/workflow-email";

const FALLBACK_HTML = (vars: Record<string, string>) => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;letter-spacing:-0.5px;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, ${vars.candidateName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap Interview</strong> untuk posisi <strong>${vars.jobTitle}</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>🗓 Jadwal Interview:</strong></p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#92400e;">${vars.date} · ${vars.time}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#a16207;">${vars.interviewType}</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px;">📋 Detail Interview:</p>
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Lokasi/Link:</strong> ${vars.location}</p>
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Pewawancara:</strong> ${vars.interviewer}</p>
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Durasi:</strong> ${vars.duration} menit</p>
      </div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">Mohon hadir 10 menit sebelum jadwal.<br/>Jika ada kendala, hubungi Tim Human Capital.</p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">PT Chitra Paratama · Human Capital Division</p>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

const FALLBACK_TEXT = (vars: Record<string, string>) =>
`Halo ${vars.candidateName},

Selamat! Anda lolos ke tahap Interview untuk posisi ${vars.jobTitle}.

📅 Jadwal: ${vars.date} · ${vars.time}
📍 Lokasi: ${vars.location}
👤 Pewawancara: ${vars.interviewer}
⏱ Durasi: ${vars.duration} menit

Mohon hadir 10 menit sebelum jadwal.

Terima kasih,
Tim Human Capital
PT Chitra Paratama`;

export async function getAvailableInterviewers() {
  const empList = await db.select({
    id: employees.id,
    name: employees.name,
    email: employees.email,
    employeeSn: employees.employeeSn,
  })
  .from(employees)
  .where(eq(employees.employmentStatus, "ACTIVE"))
  .orderBy(employees.name);
  return empList;
}

export async function getInterviewSettings() {
  const [settings] = await db.select().from(hcInterviewSettings).limit(1);
  return settings || {
    id: 0,
    defaultInterviewerEmails: [] as string[],
    defaultInterviewerNames: [] as string[],
    defaultDurationMinutes: 60,
    defaultLocationOrLink: "",
    defaultInterviewType: "Online",
  };
}

export async function saveInterviewSettings(data: {
  defaultInterviewerEmails: string[];
  defaultInterviewerNames: string[];
  defaultDurationMinutes: number;
  defaultLocationOrLink: string;
  defaultInterviewType: string;
}) {
  const [existing] = await db.select().from(hcInterviewSettings).limit(1);
  if (existing) {
    const [updated] = await db.update(hcInterviewSettings)
      .set({
        defaultInterviewerEmails: data.defaultInterviewerEmails,
        defaultInterviewerNames: data.defaultInterviewerNames,
        defaultDurationMinutes: data.defaultDurationMinutes,
        defaultLocationOrLink: data.defaultLocationOrLink,
        defaultInterviewType: data.defaultInterviewType,
        updatedAt: new Date(),
      })
      .where(eq(hcInterviewSettings.id, existing.id))
      .returning();
    revalidatePath("/dashboard/hc/recruitment");
    return updated;
  } else {
    const [created] = await db.insert(hcInterviewSettings)
      .values({
        defaultInterviewerEmails: data.defaultInterviewerEmails,
        defaultInterviewerNames: data.defaultInterviewerNames,
        defaultDurationMinutes: data.defaultDurationMinutes,
        defaultLocationOrLink: data.defaultLocationOrLink,
        defaultInterviewType: data.defaultInterviewType,
      })
      .returning();
    revalidatePath("/dashboard/hc/recruitment");
    return created;
  }
}

export async function scheduleCandidateInterviewStage(candidateId: number, data: {
  scheduledAt: Date;
  durationMinutes: number;
  interviewType: string;
  locationOrLink: string;
  interviewerNames: string[];
  interviewerEmails: string[];
  stageName: string; // e.g. "Interview 1", "Interview 2", "User Interview"
  stageOrder?: number;
  notes: string;
  sendCandidateEmail?: boolean;
  sendInterviewerEmail?: boolean;
}) {
  const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, candidateId)).limit(1);
  if (!candidate) throw new Error("Candidate not found");

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [recruitment] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
    if (recruitment) vacancyTitle = recruitment.jobTitle;
  }

  const accessToken = crypto.randomUUID();
  const interviewerNamesStr = data.interviewerNames.join(", ");

  const [interview] = await db.insert(hcCandidateInterviews).values({
    candidateId,
    scheduledAt: data.scheduledAt,
    durationMinutes: data.durationMinutes,
    interviewType: data.interviewType,
    locationOrLink: data.locationOrLink,
    interviewerName: interviewerNamesStr,
    interviewerEmails: data.interviewerEmails,
    stageName: data.stageName || "Interview 1",
    stageOrder: data.stageOrder || 1,
    accessToken,
    notes: data.notes || "",
    status: "Scheduled",
  }).returning();

  // Update candidate current stage
  const nextStageText = `${data.stageName || "Interview 1"}`;
  await db.update(hcCandidates)
    .set({ currentStage: nextStageText, updatedAt: new Date() })
    .where(eq(hcCandidates.id, candidateId));

  const smtpSettings = await getEmailSmtpSettingsData();
  const interviewDate = format(data.scheduledAt, "EEEE, dd MMMM yyyy");
  const interviewTime = format(data.scheduledAt, "HH:mm");
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "http://localhost:3000";
  const evalFormUrl = `${baseUrl}/dashboard/hc/recruitment/wawancara?interviewId=${interview.id}`;

  // 1. Send Email to Candidate
  if (data.sendCandidateEmail !== false && smtpSettings.host && smtpSettings.fromEmail && candidate.email) {
    try {
      const templateVars = {
        candidateName: candidate.fullName,
        jobTitle: vacancyTitle,
        companyName: "PT Chitra Paratama",
        date: interviewDate,
        time: interviewTime,
        location: data.locationOrLink,
        interviewer: interviewerNamesStr,
        duration: String(data.durationMinutes),
        interviewType: data.interviewType,
        stageName: data.stageName || "Interview 1",
        testLink: "",
      };

      const template = await getHcEmailTemplateByType("interview_invitation");
      let subject: string, html: string | undefined, text: string;
      const emailFormat = template?.format || null;

      if (template) {
        const rendered = renderHcTemplate(template, templateVars);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
      } else {
        subject = `[HERO] Undangan Undangan ${data.stageName || "Interview"} — ${vacancyTitle}`;
        html = FALLBACK_HTML(templateVars);
        text = FALLBACK_TEXT(templateVars);
      }

      const hcPolicyCc = await getHumanCapitalPolicyCcRecipients();
      const resolvedTemplate = await resolveWorkflowTemplateContent({
        templateCode: "interview_invitation",
        cc: hcPolicyCc,
        variables: templateVars,
        fallbackSubject: subject,
        fallbackHtml: html,
        fallbackText: text,
      });

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        html: resolvedTemplate.html,
        text: resolvedTemplate.text,
        format: resolvedTemplate.template ? null : emailFormat,
        templateName: "Interview Invitation",
        templateCode: "interview_invitation",
      });
    } catch (err) {
      console.error("Failed sending candidate interview email:", err);
    }
  }

  // 2. Send Notification & Evaluation Form Link to Interviewers
  if (data.sendInterviewerEmail !== false && smtpSettings.host && smtpSettings.fromEmail && data.interviewerEmails.length > 0) {
    try {
      const interviewerSubject = `[HERO Notification] Jadwal ${data.stageName || "Interview"} Candidate: ${candidate.fullName} — ${vacancyTitle}`;
      const interviewerHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:30px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.08);">
    <tr><td style="background:#0f172a;padding:24px 32px;color:#ffffff;">
      <h2 style="margin:0;font-size:20px;font-weight:700;">Jadwal Interview & Form Penilaian</h2>
      <p style="margin:4px 0 0;color:#94a3b8;font-size:13px;">PT Chitra Paratama · Sistem Rekrutmen HERO</p>
    </td></tr>
    <tr><td style="padding:32px;">
      <p style="margin:0 0 16px;color:#334155;font-size:14px;line-height:1.6;">
        Anda dijadwalkan sebagai <strong>Pewawancara</strong> untuk kandidat berikut:
      </p>
      <div style="background:#f1f5f9;border-left:4px solid #0284c7;padding:16px;border-radius:6px;margin-bottom:20px;">
        <p style="margin:0;font-size:16px;font-weight:700;color:#0f172a;">👤 ${candidate.fullName}</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">Posisi Dilamar: <strong>${vacancyTitle}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">Tahap: <strong>${data.stageName || "Interview 1"}</strong></p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">🗓 <strong>${interviewDate}</strong> pukul <strong>${interviewTime} WITA</strong> (${data.durationMinutes} menit)</p>
        <p style="margin:4px 0 0;font-size:13px;color:#475569;">📍 ${data.locationOrLink}</p>
      </div>

      <div style="text-align:center;margin:28px 0;">
        <a href="${evalFormUrl}" style="background:#0284c7;color:#ffffff;text-decoration:none;padding:12px 28px;border-radius:8px;font-weight:600;font-size:14px;display:inline-block;">
          📝 Buka Form Penilaian Interview (F.HR.STD.010.00)
        </a>
      </div>

      <p style="margin:16px 0 0;color:#64748b;font-size:12px;line-height:1.5;">
        * Link di atas dapat Anda bagikan ke pewawancara lain yang hadir pada sesi interview.<br/>
        Form penilaian dapat diisi secara langsung dari HP maupun Laptop saat interview berlangsung.
      </p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

      const interviewerText = `Halo Pewawancara,

Jadwal ${data.stageName || "Interview"}:
Kandidat: ${candidate.fullName}
Posisi: ${vacancyTitle}
Waktu: ${interviewDate} · ${interviewTime}
Lokasi/Link: ${data.locationOrLink}

Buka & Isi Form Penilaian:
${evalFormUrl}

Terima kasih,
Tim Human Capital PT Chitra Paratama`;

      for (const email of data.interviewerEmails) {
        if (!email) continue;
        await sendEmailViaSmtp(smtpSettings, {
          to: email,
          subject: interviewerSubject,
          html: interviewerHtml,
          text: interviewerText,
          templateName: "Interviewer Notification",
          templateCode: "interview_interviewer_notification",
        });

        // Also create in-app notification for the notification bell & inbox
        try {
          const [event] = await db.insert(notificationEvents).values({
            recipient: email.trim().toLowerCase(),
            eventType: "interview_assignment",
            payloadSnapshot: JSON.stringify({
              title: `Tugas Wawancara: ${candidate.fullName}`,
              body: `Anda ditugaskan mewawancarai ${candidate.fullName} (${vacancyTitle}) pada ${interviewDate} pukul ${interviewTime} WITA.`,
              url: `/dashboard/hc/recruitment/wawancara?interviewId=${interview.id}`,
            }),
            deliveryStatus: "sent",
          }).returning();

          await db.insert(notificationDeliveries).values({
            notificationEventId: event.id,
            recipient: email.trim().toLowerCase(),
            deliveryChannel: "in_app",
            status: "delivered",
            sentAt: new Date(),
          });
        } catch (notifErr) {
          console.error("Failed creating in-app notification for interviewer:", notifErr);
        }
      }
    } catch (err) {
      console.error("Failed sending interviewer notification email:", err);
    }
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  revalidatePath("/dashboard/hc/recruitment");
  revalidatePath("/dashboard/hc/recruitment/wawancara");
  revalidatePath("/dashboard/wawancara");
  return interview;
}

export async function getInterviewEvaluationByToken(token: string) {
  const [interview] = await db.select()
    .from(hcCandidateInterviews)
    .where(eq(hcCandidateInterviews.accessToken, token))
    .limit(1);

  if (!interview) return null;

  const [candidate] = await db.select()
    .from(hcCandidates)
    .where(eq(hcCandidates.id, interview.candidateId))
    .limit(1);

  if (!candidate) return null;

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [recruitment] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
    if (recruitment) vacancyTitle = recruitment.jobTitle;
  }

  // Calculate age if dateOfBirth is present
  let ageStr = "-";
  if (candidate.dateOfBirth) {
    const birthYear = new Date(candidate.dateOfBirth).getFullYear();
    const currentYear = new Date().getFullYear();
    ageStr = `${currentYear - birthYear} Tahun`;
  }

  // Format education level
  let educationStr = "-";
  if (Array.isArray(candidate.education) && candidate.education.length > 0) {
    const lastEdu = candidate.education[candidate.education.length - 1];
    educationStr = `${lastEdu.level || ""} ${lastEdu.institution || ""} ${lastEdu.major ? `- ${lastEdu.major}` : ""}`.trim();
  }

  const existingEvaluations = await db.select()
    .from(hcCandidatePanelEvaluations)
    .where(eq(hcCandidatePanelEvaluations.interviewId, interview.id))
    .orderBy(desc(hcCandidatePanelEvaluations.submittedAt));

  return {
    interview,
    candidate: {
      ...candidate,
      ageStr,
      educationStr,
      vacancyTitle,
    },
    existingEvaluations,
  };
}

export async function submitInterviewEvaluation(data: {
  interviewId?: number | null;
  candidateId: number;
  stageName: string;
  panelistName: string;
  panelistRole: string;
  panelistEmail?: string;

  dayaTangkapScore: number;
  dayaTangkapComment: string;
  problemSolvingScore: number;
  problemSolvingComment: string;
  motivationalFitScore: number;
  motivationalFitComment: string;
  adaptabilityScore: number;
  adaptabilityComment: string;
  interpersonalSkillsScore: number;
  interpersonalSkillsComment: string;
  communicationSkillScore: number;
  communicationSkillComment: string;

  fundamentalUnderstandingScore: number;
  fundamentalUnderstandingComment: string;
  experienceRelatedScore: number;
  experienceRelatedComment: string;
  technicalSkillScore: number;
  technicalSkillComment: string;

  managerialSkillsScore: number;
  managerialSkillsComment: string;
  leadershipScore: number;
  leadershipComment: string;
  teamWorkScore: number;
  teamWorkComment: string;

  overallRecommendation: "RECOMMENDED" | "NOT_RECOMMENDED";
  jobMatchComment: string;
  recommendationOtherPosition: string;
}) {
  const [created] = await db.insert(hcCandidatePanelEvaluations).values({
    candidateId: data.candidateId,
    interviewId: data.interviewId || null,
    stageName: data.stageName || "Interview 1",
    panelistName: data.panelistName,
    panelistRole: data.panelistRole || "Interviewer",
    panelistEmail: data.panelistEmail || "",

    dayaTangkapScore: data.dayaTangkapScore || 0,
    dayaTangkapComment: data.dayaTangkapComment || "",
    problemSolvingScore: data.problemSolvingScore || 0,
    problemSolvingComment: data.problemSolvingComment || "",
    motivationalFitScore: data.motivationalFitScore || 0,
    motivationalFitComment: data.motivationalFitComment || "",
    adaptabilityScore: data.adaptabilityScore || 0,
    adaptabilityComment: data.adaptabilityComment || "",
    interpersonalSkillsScore: data.interpersonalSkillsScore || 0,
    interpersonalSkillsComment: data.interpersonalSkillsComment || "",
    communicationSkillScore: data.communicationSkillScore || 0,
    communicationSkillComment: data.communicationSkillComment || "",

    fundamentalUnderstandingScore: data.fundamentalUnderstandingScore || 0,
    fundamentalUnderstandingComment: data.fundamentalUnderstandingComment || "",
    experienceRelatedScore: data.experienceRelatedScore || 0,
    experienceRelatedComment: data.experienceRelatedComment || "",
    technicalSkillScore: data.technicalSkillScore || 0,
    technicalSkillComment: data.technicalSkillComment || "",

    managerialSkillsScore: data.managerialSkillsScore || 0,
    managerialSkillsComment: data.managerialSkillsComment || "",
    leadershipScore: data.leadershipScore || 0,
    leadershipComment: data.leadershipComment || "",
    teamWorkScore: data.teamWorkScore || 0,
    teamWorkComment: data.teamWorkComment || "",

    // legacy scores fallback for legacy UI table
    technicalScore: data.technicalSkillScore || 0,
    communicationScore: data.communicationSkillScore || 0,
    cultureScore: data.adaptabilityScore || 0,
    attitudeScore: data.interpersonalSkillsScore || 0,

    overallRecommendation: data.overallRecommendation || "RECOMMENDED",
    jobMatchComment: data.jobMatchComment || "",
    recommendationOtherPosition: data.recommendationOtherPosition || "",
    notes: data.jobMatchComment || "",
  }).returning();

  // If interviewId exists, update interview status to Completed if not already
  if (data.interviewId) {
    await db.update(hcCandidateInterviews)
      .set({ status: "Completed", result: data.overallRecommendation === "RECOMMENDED" ? "Pass" : "Fail", updatedAt: new Date() })
      .where(eq(hcCandidateInterviews.id, data.interviewId));
  }

  // Update candidate current stage status
  if (data.overallRecommendation === "RECOMMENDED") {
    await db.update(hcCandidates)
      .set({ currentStage: `Passed ${data.stageName || "Interview 1"}`, updatedAt: new Date() })
      .where(eq(hcCandidates.id, data.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${data.candidateId}`);
  revalidatePath("/dashboard/hc/recruitment");
  return created;
}

export async function getCandidateInterviews(candidateId: number) {
  return await db
    .select()
    .from(hcCandidateInterviews)
    .where(eq(hcCandidateInterviews.candidateId, candidateId))
    .orderBy(desc(hcCandidateInterviews.scheduledAt));
}

export async function getCandidatePanelEvaluations(candidateId: number) {
  return await db.select()
    .from(hcCandidatePanelEvaluations)
    .where(eq(hcCandidatePanelEvaluations.candidateId, candidateId))
    .orderBy(desc(hcCandidatePanelEvaluations.submittedAt));
}



export async function scheduleCandidateInterview(candidateId: number, data: {
  scheduledAt: Date;
  durationMinutes: number;
  interviewType: string;
  locationOrLink: string;
  interviewerName: string;
  notes: string;
}) {
  const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, candidateId)).limit(1);
  if (!candidate) throw new Error("Candidate not found");

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [recruitment] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
    if (recruitment) vacancyTitle = recruitment.jobTitle;
  }

  const [interview] = await db.insert(hcCandidateInterviews).values({
    candidateId,
    scheduledAt: data.scheduledAt,
    durationMinutes: data.durationMinutes,
    interviewType: data.interviewType,
    locationOrLink: data.locationOrLink,
    interviewerName: data.interviewerName,
    notes: data.notes,
    status: "Scheduled",
  }).returning();

  if (candidate.currentStage !== "Passed Interview" && candidate.currentStage !== "MCU") {
    await db.update(hcCandidates)
      .set({ currentStage: "Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, candidateId));
  }

  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings.host && smtpSettings.fromEmail && candidate.email) {
      const interviewDate = format(data.scheduledAt, "EEEE, dd MMMM yyyy");
      const interviewTime = format(data.scheduledAt, "HH:mm");
      const templateVars = {
        candidateName: candidate.fullName,
        jobTitle: vacancyTitle,
        companyName: "PT Chitra Paratama",
        date: interviewDate,
        time: interviewTime,
        location: data.locationOrLink,
        interviewer: data.interviewerName,
        duration: String(data.durationMinutes),
        testLink: "",
      };

      const template = await getHcEmailTemplateByType("interview_invitation");
      let subject: string, html: string | undefined, text: string;
      const emailFormat = template?.format || null;

      if (template) {
        const rendered = renderHcTemplate(template, templateVars);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
        if (emailFormat === "plain_text") {
          text = `🗓 Jadwal Interview: ${interviewDate} · ${interviewTime}\n\n` + text;
        } else {
          html = `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>🗓 Jadwal Interview:</strong> ${interviewDate} · ${interviewTime}
</div>` + (html || "");
        }
      } else {
        subject = `[HERO] Undangan Interview — ${vacancyTitle}`;
        html = FALLBACK_HTML(templateVars);
        text = FALLBACK_TEXT(templateVars);
      }
      const hcPolicyCc = await getHumanCapitalPolicyCcRecipients();
      const resolvedTemplate = await resolveWorkflowTemplateContent({
        templateCode: "interview_invitation",
        cc: hcPolicyCc,
        variables: templateVars,
        fallbackSubject: subject,
        fallbackHtml: html,
        fallbackText: text,
      });

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        cc: resolvedTemplate.ccList,
        subject: resolvedTemplate.subject,
        html: resolvedTemplate.html,
        text: resolvedTemplate.text,
        format: resolvedTemplate.template ? null : emailFormat,
        templateName: "Interview Invitation",
        templateCode: "interview_invitation",
      });
    }
  } catch (error) {
    console.error("Failed to send interview email:", error);
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return interview;
}

export async function previewInterviewEmail(data: {
  candidateName: string;
  jobTitle: string;
  scheduledDate: string;
  scheduledTime: string;
  interviewType: string;
  locationOrLink: string;
  interviewerName: string;
  durationMinutes: number;
}) {
  const templateVars = {
    candidateName: data.candidateName,
    jobTitle: data.jobTitle,
    companyName: "PT Chitra Paratama",
    date: data.scheduledDate,
    time: data.scheduledTime,
    location: data.locationOrLink,
    interviewer: data.interviewerName,
    duration: String(data.durationMinutes),
    testLink: "",
    interviewType: data.interviewType,
  };

  const template = await getHcEmailTemplateByType("interview_invitation");
  let subject: string, html: string | undefined, text: string;
  const emailFormat = template?.format || null;

  if (template) {
    const rendered = renderHcTemplate(template, templateVars);
    subject = rendered.subject;
    html = rendered.html;
    text = rendered.text;
    if (emailFormat === "plain_text") {
      text = `🗓 Jadwal Interview: ${data.scheduledDate} · ${data.scheduledTime}\n\n` + text;
    } else {
      html = `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>🗓 Jadwal Interview:</strong> ${data.scheduledDate} · ${data.scheduledTime}
</div>` + (html || "");
    }
  } else {
    subject = `[HERO] Undangan Interview — ${data.jobTitle}`;
    html = FALLBACK_HTML(templateVars);
    text = FALLBACK_TEXT(templateVars);
  }

  return { subject, html, text };
}

export async function bulkScheduleInterviews(candidateIds: number[], data: {
  scheduledAt: Date;
  durationMinutes: number;
  interviewType: string;
  locationOrLink: string;
  interviewerName: string;
  notes: string;
}) {
  const smtpSettings = await getEmailSmtpSettingsData();
  const { format } = await import("date-fns");
  const template = await getHcEmailTemplateByType("interview_invitation");
  const results: Array<{ candidateId: number; fullName: string; success: boolean; error?: string }> = [];

  for (const cid of candidateIds) {
    try {
      const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, cid)).limit(1);
      if (!candidate) { results.push({ candidateId: cid, fullName: "", success: false, error: "Not found" }); continue; }

      let vacancyTitle = "Posisi";
      if (candidate.recruitmentId) {
        const [rec] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
        if (rec) vacancyTitle = rec.jobTitle;
      }

      await db.insert(hcCandidateInterviews).values({
        candidateId: cid,
        scheduledAt: data.scheduledAt,
        durationMinutes: data.durationMinutes,
        interviewType: data.interviewType,
        locationOrLink: data.locationOrLink,
        interviewerName: data.interviewerName,
        notes: data.notes,
        status: "Scheduled",
      });

      if (candidate.email && smtpSettings.host && smtpSettings.fromEmail) {
        const interviewDate = format(data.scheduledAt, "EEEE, dd MMMM yyyy");
        const interviewTime = format(data.scheduledAt, "HH:mm");
        const templateVars = {
          candidateName: candidate.fullName,
          jobTitle: vacancyTitle,
          companyName: "PT Chitra Paratama",
          date: interviewDate,
          time: interviewTime,
          location: data.locationOrLink,
          interviewer: data.interviewerName,
          duration: String(data.durationMinutes),
          testLink: "",
          interviewType: data.interviewType,
        };

        let subject: string, html: string | undefined, text: string;
        const emailFormat = template?.format || null;
        if (template) {
          const rendered = renderHcTemplate(template, templateVars);
          subject = rendered.subject;
          html = rendered.html;
          text = rendered.text;
          if (emailFormat === "plain_text") {
            text = `🗓 Jadwal Interview: ${interviewDate} · ${interviewTime}\n\n` + text;
          } else {
            html = `<div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin-bottom:16px;color:#92400e;font-size:14px;">
  <strong>🗓 Jadwal Interview:</strong> ${interviewDate} · ${interviewTime}
</div>` + (html || "");
          }
        } else {
          subject = `[HERO] Undangan Interview — ${vacancyTitle}`;
          html = FALLBACK_HTML(templateVars);
          text = FALLBACK_TEXT(templateVars);
        }
        const hcPolicyCc = await getHumanCapitalPolicyCcRecipients();
        const resolvedTemplate = await resolveWorkflowTemplateContent({
          templateCode: "interview_invitation",
          cc: hcPolicyCc,
          variables: templateVars,
          fallbackSubject: subject,
          fallbackHtml: html,
          fallbackText: text,
        });

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email,
          cc: resolvedTemplate.ccList,
          subject: resolvedTemplate.subject,
          html: resolvedTemplate.html,
          text: resolvedTemplate.text,
          format: resolvedTemplate.template ? null : emailFormat,
          templateName: "Interview Invitation", templateCode: "interview_invitation",
        });
      }
      results.push({ candidateId: cid, fullName: candidate.fullName, success: true });
    } catch (error: any) {
      results.push({ candidateId: cid, fullName: "", success: false, error: error.message });
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  return { results };
}

export async function updateInterviewStatus(interviewId: number, status: string, result: string) {
  const [interview] = await db.update(hcCandidateInterviews)
    .set({ status, result, updatedAt: new Date() })
    .where(eq(hcCandidateInterviews.id, interviewId))
    .returning();

  if (status === "Completed" && result === "Pass") {
    await db.update(hcCandidates)
      .set({ currentStage: "Offering", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  } else if (status === "Completed" && result === "Fail") {
     await db.update(hcCandidates)
      .set({ currentStage: "Rejected", rejectionReason: "Failed at interview stage", rejectedAtStage: "Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${interview.candidateId}`);
  return interview;
}

export async function getAllScheduledInterviews() {
  return await db.select({
    id: hcCandidateInterviews.id,
    candidateId: hcCandidateInterviews.candidateId,
    scheduledAt: hcCandidateInterviews.scheduledAt,
    durationMinutes: hcCandidateInterviews.durationMinutes,
    interviewType: hcCandidateInterviews.interviewType,
    locationOrLink: hcCandidateInterviews.locationOrLink,
    interviewerName: hcCandidateInterviews.interviewerName,
    status: hcCandidateInterviews.status,
    candidateName: hcCandidates.fullName,
    jobTitle: hcRecruitments.jobTitle,
  })
  .from(hcCandidateInterviews)
  .innerJoin(hcCandidates, eq(hcCandidateInterviews.candidateId, hcCandidates.id))
  .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
  .where(eq(hcCandidateInterviews.status, "Scheduled"))
  .orderBy(hcCandidateInterviews.scheduledAt);
}

export async function getInterviewsWorkspaceData() {
  const rows = await db.select({
    interview: hcCandidateInterviews,
    candidate: hcCandidates,
    recruitment: hcRecruitments,
  })
  .from(hcCandidateInterviews)
  .innerJoin(hcCandidates, eq(hcCandidateInterviews.candidateId, hcCandidates.id))
  .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
  .orderBy(desc(hcCandidateInterviews.scheduledAt), desc(hcCandidateInterviews.id));

  const interviewIds = rows.map((r) => r.interview.id);
  const candidateIds = Array.from(new Set(rows.map((r) => r.candidate.id)));

  let evaluations: any[] = [];
  if (interviewIds.length > 0) {
    evaluations = await db.select()
      .from(hcCandidatePanelEvaluations)
      .where(inArray(hcCandidatePanelEvaluations.interviewId, interviewIds))
      .orderBy(desc(hcCandidatePanelEvaluations.submittedAt));
  }

  let testAssignments: any[] = [];
  if (candidateIds.length > 0) {
    testAssignments = await db.select({
      id: hcOnlineTestAssignments.id,
      candidateId: hcOnlineTestAssignments.candidateId,
      testId: hcOnlineTestAssignments.testId,
      score: hcOnlineTestAssignments.score,
      status: hcOnlineTestAssignments.status,
      testTitle: hcOnlineTests.title,
      isApplicationForm: hcOnlineTests.isApplicationForm,
    })
    .from(hcOnlineTestAssignments)
    .innerJoin(hcOnlineTests, eq(hcOnlineTestAssignments.testId, hcOnlineTests.id))
    .where(
      and(
        inArray(hcOnlineTestAssignments.candidateId, candidateIds),
        inArray(hcOnlineTestAssignments.status, ["Completed", "Graded"])
      )
    );
  }

  const evaluationsByInterviewId = new Map<number, any[]>();
  for (const ev of evaluations) {
    if (!ev.interviewId) continue;
    const list = evaluationsByInterviewId.get(ev.interviewId) ?? [];
    list.push(ev);
    evaluationsByInterviewId.set(ev.interviewId, list);
  }

  const testsByCandidateId = new Map<number, any[]>();
  for (const t of testAssignments) {
    const list = testsByCandidateId.get(t.candidateId) ?? [];
    list.push(t);
    testsByCandidateId.set(t.candidateId, list);
  }

  const enrichedSessions = rows.map((r) => {
    const interview = r.interview;
    const candidate = r.candidate;
    const recruitment = r.recruitment;
    const evals = evaluationsByInterviewId.get(interview.id) ?? [];
    const tests = testsByCandidateId.get(candidate.id) ?? [];

    const assignedEmails = Array.isArray(interview.interviewerEmails) ? interview.interviewerEmails : [];
    const assignedNames = (interview.interviewerName || "")
      .split(",")
      .map((s: string) => s.trim())
      .filter(Boolean);
    const totalPanelistsExpected = Math.max(assignedEmails.length, assignedNames.length, 1);
    const evaluatedCount = evals.length;
    const isFullyEvaluated = evaluatedCount >= totalPanelistsExpected && evaluatedCount > 0;

    let totalScoreSum = 0;
    let personalQualitiesSum = 0;
    let professionalSkillSum = 0;
    let managerialLeadershipSum = 0;
    let recommendedCount = 0;
    let notRecommendedCount = 0;

    evals.forEach((ev) => {
      const personal = (
        (ev.dayaTangkapScore || 0) +
        (ev.problemSolvingScore || 0) +
        (ev.motivationalFitScore || 0) +
        (ev.adaptabilityScore || 0) +
        (ev.interpersonalSkillsScore || 0) +
        (ev.communicationSkillScore || 0)
      ) / 6;

      const prof = (
        (ev.fundamentalUnderstandingScore || 0) +
        (ev.experienceRelatedScore || 0) +
        (ev.technicalSkillScore || 0)
      ) / 3;

      const mgmt = (
        (ev.managerialSkillsScore || 0) +
        (ev.leadershipScore || 0) +
        (ev.teamWorkScore || 0)
      ) / 3;

      personalQualitiesSum += personal;
      professionalSkillSum += prof;
      managerialLeadershipSum += mgmt;
      totalScoreSum += (personal + prof + mgmt) / 3;

      if (ev.overallRecommendation === "RECOMMENDED") recommendedCount++;
      if (ev.overallRecommendation === "NOT_RECOMMENDED") notRecommendedCount++;
    });

    const averageScore = evaluatedCount > 0 ? Number((totalScoreSum / evaluatedCount).toFixed(1)) : null;
    const personalQualitiesAvg = evaluatedCount > 0 ? Number((personalQualitiesSum / evaluatedCount).toFixed(1)) : null;
    const professionalSkillAvg = evaluatedCount > 0 ? Number((professionalSkillSum / evaluatedCount).toFixed(1)) : null;
    const managerialLeadershipAvg = evaluatedCount > 0 ? Number((managerialLeadershipSum / evaluatedCount).toFixed(1)) : null;

    let consensus = "PENDING";
    if (evaluatedCount > 0) {
      consensus = recommendedCount >= notRecommendedCount ? "RECOMMENDED" : "NOT_RECOMMENDED";
    }

    let ageStr = "-";
    if (candidate.dateOfBirth) {
      const birthYear = new Date(candidate.dateOfBirth).getFullYear();
      const currentYear = new Date().getFullYear();
      ageStr = `${currentYear - birthYear} Thn`;
    }

    let educationStr = "-";
    if (Array.isArray(candidate.education) && candidate.education.length > 0) {
      const lastEdu = candidate.education[candidate.education.length - 1];
      educationStr = `${lastEdu.level || ""} ${lastEdu.institution || ""}`.trim();
    }

    const apmTest = tests.find((t) => t.testId === 8);
    const amrTest = tests.find((t) => t.testId === 10);

    return {
      id: interview.id,
      candidateId: candidate.id,
      scheduledAt: interview.scheduledAt,
      durationMinutes: interview.durationMinutes,
      interviewType: interview.interviewType,
      locationOrLink: interview.locationOrLink,
      interviewerName: interview.interviewerName,
      interviewerEmails: assignedEmails,
      stageName: interview.stageName,
      status: interview.status,
      result: interview.result,
      notes: interview.notes,
      accessToken: interview.accessToken,
      createdAt: interview.createdAt,
      candidate: {
        ...candidate,
        ageStr,
        educationStr,
        vacancyTitle: recruitment?.jobTitle || "Posisi",
        departmentName: recruitment?.department || "-",
        tests,
        apmScore: apmTest ? apmTest.score : null,
        amrScore: amrTest ? amrTest.score : null,
      },
      evaluations: evals,
      assignedEmails,
      assignedNames,
      totalPanelistsExpected,
      evaluatedCount,
      isFullyEvaluated,
      averageScore,
      personalQualitiesAvg,
      professionalSkillAvg,
      managerialLeadershipAvg,
      recommendedCount,
      notRecommendedCount,
      consensus,
    };
  });

  return enrichedSessions;
}

export async function progressCandidateFromInterview(
  candidateId: number,
  targetStage: "mcu" | "offering" | "rejected",
  notes?: string
) {
  const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, candidateId)).limit(1);
  if (!candidate) throw new Error("Kandidat tidak ditemukan");

  let newStage = "Interview";
  if (targetStage === "mcu") {
    newStage = "Medical Checkup";
  } else if (targetStage === "offering") {
    newStage = "Offering";
  } else if (targetStage === "rejected") {
    newStage = "Rejected";
  }

  const updateData: any = {
    currentStage: newStage,
    updatedAt: new Date(),
  };

  if (targetStage === "rejected") {
    updateData.rejectionReason = notes || "Tidak lolos tahap wawancara";
    updateData.rejectedAtStage = "Interview";
  }

  await db.update(hcCandidates).set(updateData).where(eq(hcCandidates.id, candidateId));

  // If there's an active interview for this candidate, update its result
  const [latestInterview] = await db.select()
    .from(hcCandidateInterviews)
    .where(eq(hcCandidateInterviews.candidateId, candidateId))
    .orderBy(desc(hcCandidateInterviews.scheduledAt))
    .limit(1);

  if (latestInterview) {
    await db.update(hcCandidateInterviews)
      .set({
        result: targetStage === "rejected" ? "Fail" : "Pass",
        status: "Completed",
        updatedAt: new Date(),
      })
      .where(eq(hcCandidateInterviews.id, latestInterview.id));
  }

  revalidatePath("/dashboard/hc/recruitment");
  revalidatePath("/dashboard/hc/recruitment/wawancara");
  revalidatePath("/dashboard/wawancara");
  revalidatePath("/dashboard/hc/recruitment/interviews");
  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return { success: true, newStage };
}

export async function deleteInterviewSession(interviewId: number) {
  const [interview] = await db.select().from(hcCandidateInterviews).where(eq(hcCandidateInterviews.id, interviewId)).limit(1);
  if (!interview) throw new Error("Sesi interview tidak ditemukan");

  await db.delete(hcCandidatePanelEvaluations).where(eq(hcCandidatePanelEvaluations.interviewId, interviewId));
  await db.delete(hcCandidateInterviews).where(eq(hcCandidateInterviews.id, interviewId));

  revalidatePath("/dashboard/hc/recruitment");
  revalidatePath("/dashboard/hc/recruitment/wawancara");
  revalidatePath("/dashboard/wawancara");
  revalidatePath("/dashboard/hc/recruitment/interviews");
  revalidatePath(`/dashboard/hc/recruitment/candidates/${interview.candidateId}`);
  return { success: true };
}

export async function getCandidatesForInterviewScheduling() {
  const list = await db
    .select({
      id: hcCandidates.id,
      fullName: hcCandidates.fullName,
      email: hcCandidates.email,
      phone: hcCandidates.phone,
      currentStage: hcCandidates.currentStage,
      recruitmentId: hcCandidates.recruitmentId,
      jobTitle: hcRecruitments.jobTitle,
      department: hcRecruitments.department,
    })
    .from(hcCandidates)
    .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
    .where(
      sql`${hcCandidates.currentStage} NOT IN ('Rejected', 'Hired', 'Withdrawn')`
    )
    .orderBy(desc(hcCandidates.createdAt))
    .limit(100);

  return list;
}

