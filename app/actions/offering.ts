"use server";

import { db } from "@/db";
import { hcCandidateOfferings, hcCandidates, hcRecruitments, hcMcuClinics } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";
import { uploadBufferToS3 } from "@/lib/s3-storage";
import { generateOfferingLetterPdf } from "@/lib/offering-letter-pdf";
import { getNextLetterNumber } from "@/app/actions/surat";

export type OfferingData = {
  position: string;
  directSupervisor: string;
  salary: string;
  contractDurationMonths: number;
  startDate: string;
  outpatientBenefit: string;
  inpatientBenefit: string;
  maternityBenefit: string;
  accidentInsurance: string;
  bpjsEmployment: string;
  bpjsHealth: string;
  thr: string;
  otherTerms: string;
  signatoryName: string;
  signatoryTitle: string;
  signatureUrl: string;
  notes?: string;
};

export async function getOfferingByCandidate(candidateId: number) {
  const [offering] = await db
    .select()
    .from(hcCandidateOfferings)
    .where(eq(hcCandidateOfferings.candidateId, candidateId))
    .limit(1);
  return offering ?? null;
}

export async function saveOffering(candidateId: number, data: OfferingData) {
  const [existing] = await db
    .select({ id: hcCandidateOfferings.id })
    .from(hcCandidateOfferings)
    .where(eq(hcCandidateOfferings.candidateId, candidateId))
    .limit(1);

  if (existing) {
    await db
      .update(hcCandidateOfferings)
      .set({ ...data, notes: data.notes ?? "", updatedAt: new Date() })
      .where(eq(hcCandidateOfferings.candidateId, candidateId));
  } else {
    const letterNumber = await getNextLetterNumber("surat_penawaran_kerja");
    await db.insert(hcCandidateOfferings).values({
      candidateId,
      ...data,
      letterNumber,
      status: "Draft",
    });
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return { success: true };
}

export async function sendOfferingEmail(candidateId: number) {
  const [candidate] = await db
    .select()
    .from(hcCandidates)
    .where(eq(hcCandidates.id, candidateId))
    .limit(1);
  if (!candidate) throw new Error("Candidate not found");

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [rec] = await db
      .select()
      .from(hcRecruitments)
      .where(eq(hcRecruitments.id, candidate.recruitmentId))
      .limit(1);
    if (rec) vacancyTitle = rec.jobTitle;
  }

  const [offering] = await db
    .select()
    .from(hcCandidateOfferings)
    .where(eq(hcCandidateOfferings.candidateId, candidateId))
    .limit(1);
  if (!offering) throw new Error("Offering data not found. Save the offering form first.");

  const letterNumber = offering.letterNumber || (await getNextLetterNumber("surat_penawaran_kerja"));

  // Generate PDF
  let pdfUrl = offering.pdfUrl || "";
  let pdfBuffer: Buffer | null = null;

  try {
    const scheduledDateStr = format(offering.startDate || new Date(), "EEEE, dd MMMM yyyy");
    const pdfBytes = await generateOfferingLetterPdf({
      letterNumber,
      candidateName: candidate.fullName,
      position: offering.position,
      directSupervisor: offering.directSupervisor,
      salary: offering.salary,
      contractDurationMonths: offering.contractDurationMonths,
      startDate: scheduledDateStr,
      outpatientBenefit: offering.outpatientBenefit,
      inpatientBenefit: offering.inpatientBenefit,
      maternityBenefit: offering.maternityBenefit,
      accidentInsurance: offering.accidentInsurance,
      bpjsEmployment: offering.bpjsEmployment,
      bpjsHealth: offering.bpjsHealth,
      thr: offering.thr,
      otherTerms: offering.otherTerms,
      signatoryName: offering.signatoryName,
      signatoryTitle: offering.signatoryTitle,
      signatureUrl: offering.signatureUrl,
    });

    pdfBuffer = Buffer.from(pdfBytes);
    const s3Result = await uploadBufferToS3(
      pdfBuffer,
      `offering-letters/${candidate.id}-${Date.now()}.pdf`,
      "application/pdf"
    );
    pdfUrl = s3Result.url;
  } catch (pdfErr) {
    console.error("Failed to generate or upload offering PDF:", pdfErr);
  }

  // Send email
  let sentAt: Date | null = null;
  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings.host && smtpSettings.fromEmail && candidate.email) {
      const templateVars = {
        candidateName: candidate.fullName,
        jobTitle: vacancyTitle,
        companyName: "PT Chitra Paratama",
        date: format(new Date(), "EEEE, dd MMMM yyyy"),
        time: "",
        location: "",
        interviewer: "",
        clinicName: "",
        clinicAddress: "",
        clinicCity: "",
        paket: "",
        testLink: "",
        duration: "",
      };

      const template = await getHcEmailTemplateByType("offering_letter");
      let subject: string, html: string | undefined, text: string;
      const emailFormat = template?.format || null;

      if (template) {
        const rendered = renderHcTemplate(template, templateVars);
        subject = rendered.subject;
        html = rendered.html;
        text = rendered.text;
      } else {
        subject = `[HERO] Surat Penawaran Kerja — ${vacancyTitle}`;
        html = OFFERING_FALLBACK_HTML(templateVars);
        text = OFFERING_FALLBACK_TEXT(templateVars);
      }

      const pdfAttachment = pdfBuffer
        ? { filename: `Surat-Penawaran-Kerja-${candidate.fullName}.pdf`, content: pdfBuffer, contentType: "application/pdf" }
        : undefined;

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject,
        html,
        text,
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
        format: emailFormat,
        templateName: "Offering Letter",
        templateCode: "offering_letter",
      });
      sentAt = new Date();
    }
  } catch (emailErr) {
    console.error("Failed to send offering email:", emailErr);
  }

  // Update offering status
  await db
    .update(hcCandidateOfferings)
    .set({
      pdfUrl,
      letterNumber,
      status: "Sent",
      sentAt: sentAt || new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hcCandidateOfferings.candidateId, candidateId));

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return { success: true, pdfUrl };
}

export async function respondToOffering(candidateId: number, response: "Accepted" | "Rejected") {
  await db
    .update(hcCandidateOfferings)
    .set({
      status: response,
      respondedAt: new Date(),
      updatedAt: new Date(),
    })
    .where(eq(hcCandidateOfferings.candidateId, candidateId));

  if (response === "Rejected") {
    await db
      .update(hcCandidates)
      .set({
        currentStage: "Rejected",
        rejectionReason: "Candidate rejected the job offer",
        rejectedAtStage: "Offering",
        updatedAt: new Date(),
      })
      .where(eq(hcCandidates.id, candidateId));
  } else if (response === "Accepted") {
    await db
      .update(hcCandidates)
      .set({ currentStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return { success: true };
}

const OFFERING_FALLBACK_HTML = (vars: Record<string, string>) => `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#000;padding:20px;border:1px solid #ddd;max-width:800px;margin:0 auto;">
  <h2 style="text-align:center;margin-bottom:30px;text-decoration:underline;">SURAT PENAWARAN KERJA</h2>
  <p>Kepada Yth.<br/><strong>${vars.candidateName}</strong></p>
  <p>Dengan hormat,</p>
  <p>Bersama ini kami sampaikan penawaran kerja untuk saudara sebagai Calon Karyawan di <strong>PT Chitra Paratama</strong> untuk posisi <strong>${vars.jobTitle}</strong>.</p>
  <p>Surat lengkap terlampir dalam email ini. Mohon ditandatangani dan dikembalikan.</p>
  <p>Terima kasih.</p>
  <div style="margin-top:40px;"><p>Hormat kami,</p><p style="margin-top:60px;"><strong>Human Capital Department</strong><br/>PT Chitra Paratama</p></div>
</div>`;

const OFFERING_FALLBACK_TEXT = (vars: Record<string, string>) =>
`Kepada Yth. ${vars.candidateName}

Dengan hormat,

Bersama ini kami sampaikan penawaran kerja untuk saudara sebagai Calon Karyawan di PT Chitra Paratama untuk posisi ${vars.jobTitle}.

Surat lengkap terlampir dalam email ini.

Terima kasih,
Tim Human Capital
PT Chitra Paratama`;
