"use server";

import { db } from "@/db";
import { hcCandidateInterviews, hcCandidates, hcRecruitments } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";

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
    if (recruitment) vacancyTitle = recruitment.title;
  }

  // Insert interview
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

  // Update candidate stage if not already passed interview
  if (candidate.currentStage !== "Passed Interview" && candidate.currentStage !== "MCU") {
    await db.update(hcCandidates)
      .set({ currentStage: "Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, candidateId));
  }

  // Send Email
  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings.host && smtpSettings.fromEmail) {
      const subject = `[HERO] Interview Invitation - ${vacancyTitle}`;
      const interviewDate = format(data.scheduledAt, "EEEE, dd MMMM yyyy");
      const interviewTime = format(data.scheduledAt, "HH:mm");
      
      const html = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-w-xl mx-auto border p-6 rounded-lg">
          <h2 style="color: #0f172a;">Interview Invitation</h2>
          <p>Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Congratulations! You have successfully passed the online test phase. We would like to invite you for an interview for the <strong>${vacancyTitle}</strong> position.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 5px 0;"><strong>Date:</strong> ${interviewDate}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${interviewTime}</p>
            <p style="margin: 5px 0;"><strong>Type:</strong> ${data.interviewType}</p>
            <p style="margin: 5px 0;"><strong>Location/Link:</strong> <br/>
              ${data.interviewType.toLowerCase() === 'online' && data.locationOrLink.startsWith('http') 
                ? `<a href="${data.locationOrLink}" target="_blank" style="color: #2563eb;">${data.locationOrLink}</a>`
                : data.locationOrLink}
            </p>
            <p style="margin: 5px 0;"><strong>Interviewer:</strong> ${data.interviewerName}</p>
          </div>

          <p><strong>Preparation Notes:</strong><br/>
          ${data.notes ? data.notes.replace(/\n/g, '<br/>') : "Please be ready 10 minutes before the scheduled time."}</p>
          
          <p style="margin-top: 30px;">Best regards,<br/>Human Capital Team</p>
        </div>
      `;

      const text = `
Dear ${candidate.fullName},
Congratulations! You are invited to an interview for ${vacancyTitle}.

Date: ${interviewDate}
Time: ${interviewTime}
Type: ${data.interviewType}
Location/Link: ${data.locationOrLink}
Interviewer: ${data.interviewerName}

Notes:
${data.notes || "Please be ready 10 minutes before the scheduled time."}

Best regards,
Human Capital Team
      `;

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
    // We don't fail the schedule operation if email fails, but we might want to log it
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
      .set({ currentStage: "Passed Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  } else if (status === "Completed" && result === "Fail") {
     await db.update(hcCandidates)
      .set({ currentStage: "Failed", rejectionReason: "Failed at interview stage", rejectedAtStage: "Interview", updatedAt: new Date() })
      .where(eq(hcCandidates.id, interview.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${interview.candidateId}`);
  return interview;
}
