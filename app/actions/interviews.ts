"use server";

import { db } from "@/db";
import { hcCandidateInterviews, hcCandidates, hcRecruitments } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";

const FALLBACK_HTML = (vars: Record<string, string>) => `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;max-width:600px;margin:0 auto;border:1px solid #e2e8f0;padding:24px;border-radius:12px">
  <h2 style="color:#0f172a;">Interview Invitation</h2>
  <p>Dear <strong>${vars.candidateName}</strong>,</p>
  <p>You are invited for an interview for <strong>${vars.jobTitle}</strong>.</p>
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;">
    <p><strong>Date:</strong> ${vars.date}</p>
    <p><strong>Time:</strong> ${vars.time}</p>
    <p><strong>Location:</strong> ${vars.location}</p>
    <p><strong>Interviewer:</strong> ${vars.interviewer}</p>
  </div>
  <p>Please be ready 10 minutes before the scheduled time.</p>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;

const FALLBACK_TEXT = (vars: Record<string, string>) =>
`Dear ${vars.candidateName},

You are invited for an interview for ${vars.jobTitle}.

Date: ${vars.date}
Time: ${vars.time}
Location: ${vars.location}
Interviewer: ${vars.interviewer}

Please be ready 10 minutes before the scheduled time.

Best regards,
Human Capital Team`;

export async function getCandidateInterviews(candidateId: number) {
  return await db.select()
    .from(hcCandidateInterviews)
    .where(eq(hcCandidateInterviews.candidateId, candidateId))
    .orderBy(desc(hcCandidateInterviews.scheduledAt));
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
      let subject: string, html: string, text: string;

      if (template) {
        const rendered = renderHcTemplate(template, templateVars);
        subject = rendered.subject;
        html = rendered.body;
        text = rendered.body.replace(/<[^>]*>/g, "");
      } else {
        subject = `[HERO] Interview Invitation - ${vacancyTitle}`;
        html = FALLBACK_HTML(templateVars);
        text = FALLBACK_TEXT(templateVars);
      }

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject,
        html,
        text,
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

export async function updateInterviewStatus(interviewId: number, status: string, result: string) {
  const [interview] = await db.update(hcCandidateInterviews)
    .set({ status, result, updatedAt: new Date() })
    .where(eq(hcCandidateInterviews.id, interviewId))
    .returning();

  if (status === "Completed" && result === "Pass") {
    await db.update(hcCandidates)
      .set({ currentStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  } else if (status === "Completed" && result === "Fail") {
     await db.update(hcCandidates)
      .set({ currentStage: "Rejected", rejectionReason: "Failed at interview stage", rejectedAtStage: "Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${interview.candidateId}`);
  return interview;
}
