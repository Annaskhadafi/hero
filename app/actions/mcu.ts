"use server";

import { db } from "@/db";
import { hcCandidateMcu, hcCandidates, hcRecruitments } from "@/db/schema/hero";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getEmailSmtpSettingsData } from "@/lib/hero-admin";
import { sendEmailViaSmtp } from "@/lib/email-delivery";
import { format } from "date-fns";

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
}) {
  const [candidate] = await db.select().from(hcCandidates).where(eq(hcCandidates.id, candidateId)).limit(1);
  if (!candidate) throw new Error("Candidate not found");

  let vacancyTitle = "Position";
  if (candidate.recruitmentId) {
    const [recruitment] = await db.select().from(hcRecruitments).where(eq(hcRecruitments.id, candidate.recruitmentId)).limit(1);
    if (recruitment) vacancyTitle = recruitment.jobTitle;
  }

  // Insert MCU record
  const [mcuRecord] = await db.insert(hcCandidateMcu).values({
    candidateId,
    klinikName: data.klinikName,
    klinikEmail: data.klinikEmail,
    paketMcu: data.paketMcu,
    scheduledDate: format(data.scheduledDate, "yyyy-MM-dd"),
    status: "Scheduled",
  }).returning();

  // Update candidate stage
  if (candidate.currentStage !== "Hired" && candidate.currentStage !== "Offering") {
    await db.update(hcCandidates)
      .set({ currentStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, candidateId));
  }

  // Send Emails
  try {
    const smtpSettings = await getEmailSmtpSettingsData();
    if (smtpSettings.host && smtpSettings.fromEmail) {
      const scheduledDateStr = format(data.scheduledDate, "EEEE, dd MMMM yyyy");
      
      // 1. Send Email to Clinic (Surat Pengantar)
      const clinicSubject = `[HERO] Surat Pengantar Medical Check Up - ${candidate.fullName}`;
      const clinicHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #000; padding: 20px; border: 1px solid #ddd; max-width: 800px; margin: 0 auto;">
          <h2 style="text-align: center; margin-bottom: 30px; text-decoration: underline;">SURAT PENGANTAR MEDICAL CHECK UP</h2>
          
          <p>Kepada Yth.<br/>
          <strong>Pimpinan / Admin ${data.klinikName}</strong></p>
          
          <p>Dengan hormat,<br/>
          Mohon bantuannya untuk melakukan pemeriksaan kesehatan (Medical Check Up) bagi Calon Karyawan kami dengan data sebagai berikut:</p>
          
          <table style="width: 100%; margin: 20px 0; border-collapse: collapse;">
            <tr>
              <td style="width: 150px; padding: 5px 0;"><strong>Nama Lengkap</strong></td>
              <td style="width: 20px;">:</td>
              <td>${candidate.fullName}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Tanggal MCU</strong></td>
              <td>:</td>
              <td>${scheduledDateStr}</td>
            </tr>
            <tr>
              <td style="padding: 5px 0;"><strong>Paket MCU</strong></td>
              <td>:</td>
              <td>${data.paketMcu}</td>
            </tr>
          </table>
          
          <p>Biaya pemeriksaan medis tersebut mohon ditagihkan kepada perusahaan kami (PT Chitra Paratama). Hasil MCU dapat dikirimkan kembali melalui email ini atau diserahkan kepada kandidat dalam amplop tertutup.</p>
          
          <p>Atas perhatian dan kerja samanya, kami ucapkan terima kasih.</p>
          
          <div style="margin-top: 40px;">
            <p>Hormat kami,</p>
            <p style="margin-top: 60px;"><strong>Human Capital Department</strong><br/>PT Chitra Paratama</p>
          </div>
        </div>
      `;
      
      const clinicText = `SURAT PENGANTAR MEDICAL CHECK UP\n\nKepada Yth. Pimpinan/Admin ${data.klinikName}\n\nMohon dilakukan MCU untuk:\nNama: ${candidate.fullName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nBiaya ditagihkan ke perusahaan. Terima kasih.\n\nHuman Capital PT Chitra Paratama`;

      await sendEmailViaSmtp(smtpSettings, {
        to: data.klinikEmail,
        subject: clinicSubject,
        html: clinicHtml,
        text: clinicText,
        templateName: "Surat Pengantar MCU",
        templateCode: "mcu_pengantar",
      });

      // 2. Send Email to Candidate
      const candidateSubject = `[HERO] Medical Check Up Invitation - ${vacancyTitle}`;
      const candidateHtml = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <p>Dear <strong>${candidate.fullName}</strong>,</p>
          <p>Selamat! Anda telah lolos ke tahap Medical Check Up (MCU) untuk posisi <strong>${vacancyTitle}</strong>.</p>
          
          <div style="background-color: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0; border: 1px solid #e2e8f0;">
            <p style="margin: 5px 0;"><strong>Klinik:</strong> ${data.klinikName}</p>
            <p style="margin: 5px 0;"><strong>Tanggal:</strong> ${scheduledDateStr}</p>
            <p style="margin: 5px 0;"><strong>Paket:</strong> ${data.paketMcu}</p>
          </div>

          <p><strong>Persiapan MCU:</strong></p>
          <ul>
            <li>Harap berpuasa (tidak makan & minum manis) selama 10-12 jam sebelum MCU (boleh minum air putih).</li>
            <li>Bawa kartu identitas (KTP) asli.</li>
            <li>Beri tahu pihak klinik bahwa Anda dari PT Chitra Paratama.</li>
          </ul>
          
          <p>Semoga sukses untuk tahapan ini!</p>
          <p>Best regards,<br/>Human Capital Team</p>
        </div>
      `;

      const candidateText = `Dear ${candidate.fullName},\n\nSelamat, Anda lolos ke tahap MCU.\n\nKlinik: ${data.klinikName}\nTanggal: ${scheduledDateStr}\nPaket: ${data.paketMcu}\n\nHarap berpuasa 10-12 jam sebelum MCU. Bawa KTP asli.\n\nBest regards,\nHC Team`;

      await sendEmailViaSmtp(smtpSettings, {
        to: candidate.email,
        subject: candidateSubject,
        html: candidateHtml,
        text: candidateText,
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
    // Kita set stage jadi "Offering" dulu sebelum Onboarding (Form Karyawan)
    await db.update(hcCandidates)
      .set({ currentStage: "Offering", updatedAt: new Date() })
      .where(eq(hcCandidates.id, mcu.candidateId));
  } else if (status === "Unfit") {
     await db.update(hcCandidates)
      .set({ currentStage: "Failed", rejectionReason: "MCU Unfit", rejectedAtStage: "Medical Checkup", updatedAt: new Date() })
      .where(eq(hcCandidates.id, mcu.candidateId));
  }

  revalidatePath(`/dashboard/hc/recruitment/candidates/${mcu.candidateId}`);
  return mcu;
}
