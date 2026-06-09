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

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject,
        html,
        text,
        format: emailFormat,
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

        await sendEmailViaSmtp(smtpSettings, {
          to: candidate.email, subject, html, text,
          format: emailFormat,
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
