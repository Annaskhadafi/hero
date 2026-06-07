"use server";

import { db } from "@/db";
import { hcCandidateMcu, hcCandidates, hcRecruitments, hcMcuClinics } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";
import { getHcEmailTemplateByType } from "@/app/actions/hc-email-templates";
import { renderHcTemplate } from "@/lib/hc-email-utils";

const MCU_CLINIC_FALLBACK_HTML = (vars: Record<string, string>) => `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#000;padding:20px;border:1px solid #ddd;max-width:800px;margin:0 auto;">
  <h2 style="text-align:center;margin-bottom:30px;text-decoration:underline;">SURAT PENGANTAR MEDICAL CHECK UP</h2>
  <p>Kepada Yth.<br/><strong>Pimpinan / Admin ${vars.clinicName}</strong></p>
  <p>Dengan hormat,<br/>Mohon bantuannya untuk melakukan pemeriksaan kesehatan (Medical Check Up) bagi Calon Karyawan kami:</p>
  <table style="width:100%;margin:20px 0;border-collapse:collapse;">
    <tr><td style="width:150px;padding:5px 0;"><strong>Nama</strong></td><td>:</td><td>${vars.candidateName}</td></tr>
    <tr><td style="padding:5px 0;"><strong>Tanggal MCU</strong></td><td>:</td><td>${vars.date}</td></tr>
    <tr><td style="padding:5px 0;"><strong>Paket MCU</strong></td><td>:</td><td>${vars.paket}</td></tr>
  </table>
  <p>Biaya ditagihkan ke PT Chitra Paratama. Hasil MCU dikirim via email ini atau amplop tertutup.</p>
  <p>Terima kasih.</p>
  <div style="margin-top:40px;"><p>Hormat kami,</p><p style="margin-top:60px;"><strong>Human Capital Department</strong><br/>PT Chitra Paratama</p></div>
</div>`;

const MCU_CANDIDATE_FALLBACK_HTML = (vars: Record<string, string>) => `
<div style="font-family:Arial,sans-serif;line-height:1.6;color:#333;">
  <p>Dear <strong>${vars.candidateName}</strong>,</p>
  <p>Selamat! Anda lolos ke tahap Medical Check Up (MCU) untuk <strong>${vars.jobTitle}</strong>.</p>
  <div style="background:#f8fafc;padding:15px;border-radius:8px;margin:20px 0;border:1px solid #e2e8f0;">
    <p><strong>Klinik:</strong> ${vars.clinicName}</p>
    <p><strong>Tanggal:</strong> ${vars.date}</p>
    <p><strong>Paket:</strong> ${vars.paket}</p>
  </div>
  <p><strong>Persiapan:</strong></p>
  <ul>
    <li>Puasa 10-12 jam sebelum MCU (boleh air putih).</li>
    <li>Bawa KTP asli.</li>
    <li>Sebut Anda dari PT Chitra Paratama.</li>
  </ul>
  <p>Best regards,<br/>Human Capital Team</p>
</div>`;

export async function getCandidateMcu(candidateId: number) {
  return await db.select()
    .from(hcCandidateMcu)
    .where(eq(hcCandidateMcu.candidateId, candidateId))
    .orderBy(desc(hcCandidateMcu.scheduledDate));
}

export async function scheduleCandidateMcu(candidateId: number, data: {
  klinikName: string;
  klinikEmail: string;
  paketMcu: string;
  scheduledDate: Date;
  clinicId?: number | null;
}) {
  const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, candidateId)).limit(1);
  if (!candidate) throw new Error("Candidate not found");

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [recruitment] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
    if (recruitment) vacancyTitle = recruitment.jobTitle;
  }

  let clinicAddress = "";
  let clinicCity = "";
  if (data.clinicId) {
    const clinic = await db.select().from(hcMcuClinics).where(eq(hcMcuClinics.id, data.clinicId)).limit(1);
    if (clinic.length > 0) {
      clinicAddress = clinic[0].address;
      clinicCity = clinic[0].city;
    }
  }

  const [mcuRecord] = await db.insert(hcCandidateMcu).values({
    candidateId,
    klinikName: data.klinikName,
    klinikEmail: data.klinikEmail,
    paketMcu: data.paketMcu,
    scheduledDate: format(data.scheduledDate, "yyyy-MM-dd"),
    status: "Scheduled",
  }).returning();

  if (candidate.currentStage !== "Hired" && candidate.currentStage !== "Offering") {
    await db.update(hcCandidates)
      .set({ currentStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, candidateId));
  }

  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings.host && smtpSettings.fromEmail) {
      const scheduledDateStr = format(data.scheduledDate, "EEEE, dd MMMM yyyy");

      const templateVars = {
        candidateName: candidate.fullName,
        jobTitle: vacancyTitle,
        companyName: "PT Chitra Paratama",
        date: scheduledDateStr,
        time: "",
        location: `${data.klinikName}${clinicAddress ? ", " + clinicAddress : ""}${clinicCity ? ", " + clinicCity : ""}`,
        clinicName: data.klinikName,
        clinicAddress,
        clinicCity,
        paket: data.paketMcu,
        interviewer: "",
        testLink: "",
        duration: "",
      };

      // 1. Email ke Klinik — Surat Pengantar MCU
      const clinicTmpl = await getHcEmailTemplateByType("mcu_pengantar");
      let clinicSubject: string, clinicHtml: string, clinicText: string;
      if (clinicTmpl) {
        const r = renderHcTemplate(clinicTmpl, templateVars);
        clinicSubject = r.subject;
        clinicHtml = r.body;
        clinicText = r.body.replace(/<[^>]*>/g, "");
      } else {
        clinicSubject = `[HERO] Surat Pengantar Medical Check Up - ${candidate.fullName}`;
        clinicHtml = MCU_CLINIC_FALLBACK_HTML(templateVars);
        clinicText = `SURAT PENGANTAR MCU\n\nKepada Yth. Pimpinan/Admin ${data.klinikName}\n\nNama: ${candidate.fullName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nBiaya ditagihkan ke perusahaan.\n\nHC PT Chitra Paratama`;
      }
      await sendEmailViaSmtp(smtpSettings, {
        to: data.klinikEmail,
        subject: clinicSubject,
        html: clinicHtml,
        text: clinicText,
        templateName: "Surat Pengantar MCU",
        templateCode: "mcu_pengantar",
      });

      // 2. Email ke Kandidat — MCU Invitation
      const candTmpl = await getHcEmailTemplateByType("mcu_invitation");
      let candSubject: string, candHtml: string, candText: string;
      if (candTmpl) {
        const r = renderHcTemplate(candTmpl, templateVars);
        candSubject = r.subject;
        candHtml = r.body;
        candText = r.body.replace(/<[^>]*>/g, "");
      } else {
        candSubject = `[HERO] Medical Check Up Invitation - ${vacancyTitle}`;
        candHtml = MCU_CANDIDATE_FALLBACK_HTML(templateVars);
        candText = `Dear ${candidate.fullName},\n\nMCU untuk ${vacancyTitle}\nKlinik: ${data.klinikName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nPuasa 10-12 jam. Bawa KTP.\n\nHC Team`;
      }
      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject: candSubject,
        html: candHtml,
        text: candText,
        templateName: "MCU Invitation",
        templateCode: "mcu_invitation",
      });
    }
  } catch (error) {
    console.error("Failed to send MCU emails:", error);
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${candidateId}`);
  return mcuRecord;
}

export async function updateMcuResult(mcuId: number, status: string, notes: string) {
  const [mcu] = await db.update(hcCandidateMcu)
    .set({ status, resultNotes: notes, updatedAt: new Date() })
    .where(eq(hcCandidateMcu.id, mcuId))
    .returning();

  if (status === "Fit") {
    await db.update(hcCandidates)
      .set({ currentStage: "Offering", updatedAt: new Date() })
      .where(eq(hcCandidates.id, mcu.candidateId));
  } else if (status === "Unfit") {
     await db.update(hcCandidates)
      .set({ currentStage: "Rejected", rejectionReason: "MCU Unfit", rejectedAtStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, mcu.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${mcu.candidateId}`);
  return mcu;
}
