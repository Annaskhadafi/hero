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
import { generateMcuReferralPdf } from "@/lib/mcu-referral-pdf";
import { uploadBufferToS3 } from "@/lib/s3-storage";

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

const MCU_CANDIDATE_FALLBACK_HTML = (vars: Record<string, string>) => `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
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
        Selamat! Anda <strong>lolos ke tahap Medical Check Up (MCU)</strong> untuk posisi <strong>${vars.jobTitle}</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border:1px solid #3b82f6;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#1e40af;"><strong>🏥 Detail MCU:</strong></p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Klinik:</strong> ${vars.clinicName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Tanggal:</strong> ${vars.date}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Paket:</strong> ${vars.paket}</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:0 0 8px;font-weight:700;color:#0f172a;font-size:14px;">📋 Persiapan:</p>
        <ul style="margin:0;padding-left:20px;color:#475569;font-size:13px;line-height:1.8;">
          <li>Puasa 10-12 jam sebelum MCU (boleh air putih).</li>
          <li>Bawa KTP asli.</li>
          <li>Sebut Anda dari PT Chitra Paratama.</li>
        </ul>
      </div>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">PT Chitra Paratama · Human Capital Division</p>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`;

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

  let pdfUrl: string | null = null;

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

      // Generate Surat Pengantar PDF
      let pdfBuffer: Buffer | null = null;
      try {
        const pdfBytes = await generateMcuReferralPdf({
          clinicName: data.klinikName,
          clinicAddress,
          clinicCity,
          candidateName: candidate.fullName,
          candidatePhone: candidate.phone,
          scheduledDate: scheduledDateStr,
          packageName: data.paketMcu,
          companyName: "PT Chitra Paratama",
          letterNumber: `MCU/${candidate.id}/${Date.now()}`,
          signatoryName: "Muhammad Iqbal",
          signatoryTitle: "HR-GA Admin",
        });
        pdfBuffer = Buffer.from(pdfBytes);
        const s3Result = await uploadBufferToS3(
          pdfBuffer,
          `mcu-referral-letters/${candidate.id}-${Date.now()}.pdf`,
          "application/pdf"
        );
        pdfUrl = s3Result.url;
      } catch (pdfErr) {
        console.error("Failed to generate or upload MCU PDF:", pdfErr);
      }

      const pdfAttachment = pdfBuffer
        ? { filename: `Surat-Pengantar-MCU-${candidate.fullName}.pdf`, content: pdfBuffer, contentType: "application/pdf" }
        : undefined;

      // 1. Email ke Klinik — Surat Pengantar MCU
      const clinicTmpl = await getHcEmailTemplateByType("mcu_pengantar");
      let clinicSubject: string, clinicHtml: string | undefined, clinicText: string;
      const clinicEmailFormat = clinicTmpl?.format || null;
      if (clinicTmpl) {
        const r = renderHcTemplate(clinicTmpl, templateVars);
        clinicSubject = r.subject;
        clinicHtml = r.html;
        clinicText = r.text;
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
        format: clinicEmailFormat,
        templateName: "Surat Pengantar MCU",
        templateCode: "mcu_pengantar",
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
      });

      // 2. Email ke Kandidat — MCU Invitation
      const candTmpl = await getHcEmailTemplateByType("mcu_invitation");
      let candSubject: string, candHtml: string | undefined, candText: string;
      const candEmailFormat = candTmpl?.format || null;
      if (candTmpl) {
        const r = renderHcTemplate(candTmpl, templateVars);
        candSubject = r.subject;
        candHtml = r.html;
        candText = r.text;
      } else {
        candSubject = `[HERO] Undangan Medical Check Up — ${vacancyTitle}`;
        candHtml = MCU_CANDIDATE_FALLBACK_HTML(templateVars);
        candText = `Dear ${candidate.fullName},\n\nMCU untuk ${vacancyTitle}\nKlinik: ${data.klinikName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nPuasa 10-12 jam. Bawa KTP.\n\nHC Team`;
      }
      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject: candSubject,
        html: candHtml,
        text: candText,
        format: candEmailFormat,
        templateName: "MCU Invitation",
        templateCode: "mcu_invitation",
        attachments: pdfAttachment ? [pdfAttachment] : undefined,
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

export async function previewMcuEmail(data: {
  candidateName: string;
  jobTitle: string;
  klinikName: string;
  paketMcu: string;
  scheduledDate: string;
}) {
  const templateVars = {
    candidateName: data.candidateName,
    jobTitle: data.jobTitle,
    companyName: "PT Chitra Paratama",
    date: data.scheduledDate,
    time: "",
    location: "",
    interviewer: "",
    clinicName: data.klinikName,
    clinicAddress: "",
    clinicCity: "",
    paket: data.paketMcu,
    testLink: "",
    duration: "",
  };

  const template = await getHcEmailTemplateByType("mcu_invitation");
  let subject: string, html: string | undefined, text: string;
  const emailFormat = template?.format || null;

  if (template) {
    const rendered = renderHcTemplate(template, templateVars);
    subject = rendered.subject;
    html = rendered.html;
    text = rendered.text;
  } else {
    subject = `[HERO] Undangan Medical Check Up — ${data.jobTitle}`;
    html = MCU_CANDIDATE_FALLBACK_HTML(templateVars);
    text = `Halo ${data.candidateName},

Selamat! Anda lolos ke tahap Medical Check Up (MCU) untuk posisi ${data.jobTitle}.

🏥 Detail MCU:
Klinik: ${data.klinikName}
Tanggal: ${data.scheduledDate}
Paket: ${data.paketMcu}

Persiapan:
- Puasa 10-12 jam sebelum MCU (boleh air putih).
- Bawa KTP asli.
- Sebut Anda dari PT Chitra Paratama.

Terima kasih,
Tim Human Capital
PT Chitra Paratama`;
  }

  return { subject, html, text };
}

export async function bulkScheduleMcus(candidateIds: number[], data: {
  klinikName: string;
  klinikEmail: string;
  paketMcu: string;
  scheduledDate: Date;
  clinicId?: number | null;
}) {
  const smtpSettings = await getEmailSmtpSettingsData();
  const { format } = await import("date-fns");
  const results: Array<{ candidateId: number; fullName: string; success: boolean; error?: string; pdfUrl?: string | null }> = [];

  let clinicAddress = "";
  let clinicCity = "";
  if (data.clinicId) {
    const clinic = await db.select().from(hcMcuClinics).where(eq(hcMcuClinics.id, data.clinicId)).limit(1);
    if (clinic.length > 0) {
      clinicAddress = clinic[0].address;
      clinicCity = clinic[0].city;
    }
  }

  for (const cid of candidateIds) {
    try {
      const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, cid)).limit(1);
      if (!candidate) { results.push({ candidateId: cid, fullName: "", success: false, error: "Not found" }); continue; }

      let vacancyTitle = "Posisi";
      if (candidate.recruitmentId) {
        const [rec] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
        if (rec) vacancyTitle = rec.jobTitle;
      }

      await db.insert(hcCandidateMcu).values({
        candidateId: cid,
        klinikName: data.klinikName,
        klinikEmail: data.klinikEmail,
        paketMcu: data.paketMcu,
        scheduledDate: format(data.scheduledDate, "yyyy-MM-dd"),
        status: "Scheduled",
      });

      if (candidate.currentStage !== "Hired" && candidate.currentStage !== "Offering") {
        await db.update(hcCandidates)
          .set({ currentStage: "Medical Checkup", updatedAt: new Date() })
          .where(eq(hcCandidates.id, cid));
      }

      let pdfUrl: string | null = null;

      if (smtpSettings.host && smtpSettings.fromEmail) {
        const scheduledDateStr = format(data.scheduledDate, "EEEE, dd MMMM yyyy");

        const templateVars = {
          candidateName: candidate.fullName,
          jobTitle: vacancyTitle,
          companyName: "PT Chitra Paratama",
          date: scheduledDateStr,
          time: "",
          location: `${data.klinikName}${clinicAddress ? ", " + clinicAddress : ""}${clinicCity ? ", " + clinicCity : ""}`,
          interviewer: "",
          clinicName: data.klinikName,
          clinicAddress,
          clinicCity,
          paket: data.paketMcu,
          testLink: "",
          duration: "",
        };

        // Generate Surat Pengantar PDF
        let pdfBuffer: Buffer | null = null;
        try {
          const pdfBytes = await generateMcuReferralPdf({
            clinicName: data.klinikName,
            clinicAddress,
            clinicCity,
            candidateName: candidate.fullName,
            candidatePhone: candidate.phone,
            scheduledDate: scheduledDateStr,
            packageName: data.paketMcu,
            companyName: "PT Chitra Paratama",
            letterNumber: `MCU/${candidate.id}/${Date.now()}`,
            signatoryName: "Muhammad Iqbal",
            signatoryTitle: "HR-GA Admin",
          });
          pdfBuffer = Buffer.from(pdfBytes);
          const s3Result = await uploadBufferToS3(
            pdfBuffer,
            `mcu-referral-letters/${candidate.id}-${Date.now()}.pdf`,
            "application/pdf"
          );
          pdfUrl = s3Result.url;
        } catch (pdfErr) {
          console.error("Failed to generate or upload MCU PDF:", pdfErr);
        }

        const pdfAttachment = pdfBuffer
          ? { filename: `Surat-Pengantar-MCU-${candidate.fullName}.pdf`, content: pdfBuffer, contentType: "application/pdf" }
          : undefined;

        // 1. Email ke Klinik — Surat Pengantar MCU
        const clinicTmpl = await getHcEmailTemplateByType("mcu_pengantar");
        let clinicSubject: string, clinicHtml: string | undefined, clinicText: string;
        const clinicEmailFormat = clinicTmpl?.format || null;
        if (clinicTmpl) {
          const r = renderHcTemplate(clinicTmpl, templateVars);
          clinicSubject = r.subject;
          clinicHtml = r.html;
          clinicText = r.text;
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
          attachments: pdfAttachment ? [pdfAttachment] : undefined,
          format: clinicEmailFormat,
          templateName: "MCU Referral Letter",
          templateCode: "mcu_pengantar",
        });

        // 2. Email ke Kandidat — Undangan MCU
        if (candidate.email) {
          const candTmpl = await getHcEmailTemplateByType("mcu_invitation");
          let subject: string, html: string | undefined, text: string;
          const emailFormat = candTmpl?.format || null;
          if (candTmpl) {
            const r = renderHcTemplate(candTmpl, templateVars);
            subject = r.subject; html = r.html; text = r.text;
          } else {
            subject = `[HERO] Undangan Medical Check Up — ${vacancyTitle}`;
            html = MCU_CANDIDATE_FALLBACK_HTML(templateVars);
            text = `Halo ${candidate.fullName},\n\nMCU untuk ${vacancyTitle}\nKlinik: ${data.klinikName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nPuasa 10-12 jam. Bawa KTP.\n\nHC Team`;
          }

          await sendEmailViaSmtp(smtpSettings, {
            to: candidate.email, subject, html, text,
            format: emailFormat,
            templateName: "MCU Invitation", templateCode: "mcu_invitation",
          });
        }
      }
      results.push({ candidateId: cid, fullName: candidate.fullName, success: true, pdfUrl });
    } catch (error: any) {
      results.push({ candidateId: cid, fullName: "", success: false, error: error.message });
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  return { results };
}

export async function recordMcuResult(
  candidateMcuId: number,
  data: {
    result: "Fit" | "Unfit";
    notes?: string;
    resultBy?: string;
    resultFileUrl?: string;
  }
) {
  const [mcuRecord] = await db
    .select()
    .from(hcCandidateMcu)
    .where(eq(hcCandidateMcu.id, candidateMcuId))
    .limit(1);
  if (!mcuRecord) throw new Error("MCU record not found");

  const { format } = await import("date-fns");
  const today = format(new Date(), "yyyy-MM-dd");

  await db
    .update(hcCandidateMcu)
    .set({
      status: data.result,
      resultNotes: data.notes ?? "",
      resultDate: today,
      resultBy: data.resultBy ?? "",
      resultFileUrl: data.resultFileUrl ?? mcuRecord.resultFileUrl,
      updatedAt: new Date(),
    })
    .where(eq(hcCandidateMcu.id, candidateMcuId));

  // Update candidate stage based on result
  const candidate = await db
    .select()
    .from(hcCandidates)
    .where(eq(hcCandidates.id, mcuRecord.candidateId))
    .limit(1);
  if (candidate.length > 0) {
    if (data.result === "Fit") {
      if (candidate[0].currentStage !== "Hired" && candidate[0].currentStage !== "Offering") {
        await db
          .update(hcCandidates)
          .set({ currentStage: "Offering", updatedAt: new Date() })
          .where(eq(hcCandidates.id, mcuRecord.candidateId));
      }
    } else if (data.result === "Unfit") {
      await db
        .update(hcCandidates)
        .set({
          currentStage: "Rejected",
          rejectionReason: `MCU Unfit: ${data.notes ?? ""}`,
          updatedAt: new Date(),
        })
        .where(eq(hcCandidates.id, mcuRecord.candidateId));
    }
  }

  revalidatePath("/dashboard/hc/recruitment");
  revalidatePath(`/dashboard/hc/recruitment/candidates/${mcuRecord.candidateId}`);
  return { success: true };
}

export async function uploadMcuResultFile(candidateMcuId: number, base64File: string, fileName: string) {
  const { uploadBufferToS3 } = await import("@/lib/s3-storage");
  const buffer = Buffer.from(base64File.split(",")[1] ?? base64File, "base64");
  const key = `mcu-results/${candidateMcuId}-${Date.now()}-${fileName}`;
  const result = await uploadBufferToS3(buffer, key, "application/pdf");
  return result.url;
}

export async function getAllScheduledMcus() {
  return await db.select({
    id: hcCandidateMcu.id,
    candidateId: hcCandidateMcu.candidateId,
    scheduledDate: hcCandidateMcu.scheduledDate,
    klinikName: hcCandidateMcu.klinikName,
    paketMcu: hcCandidateMcu.paketMcu,
    status: hcCandidateMcu.status,
    candidateName: hcCandidates.fullName,
    jobTitle: hcRecruitments.jobTitle,
  })
  .from(hcCandidateMcu)
  .innerJoin(hcCandidates, eq(hcCandidateMcu.candidateId, hcCandidates.id))
  .leftJoin(hcRecruitments, eq(hcCandidates.recruitmentId, hcRecruitments.id))
  .where(eq(hcCandidateMcu.status, "Scheduled"))
  .orderBy(hcCandidateMcu.scheduledDate);
}
