"use server";

import { db } from "@/db";
import { hcEmailTemplates, emailDeliveryLogs } from "@/db/schema/hero";
import { eq, desc, inArray, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { HC_TEMPLATE_CODES } from "@/lib/hc-email-utils";

export type HcEmailTemplateData = {
  name: string;
  type: string;
  subject: string;
  body: string;
  isActive?: boolean;
};

async function ensureHcEmailTemplatesTable() {
  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS hero_hc_email_templates (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        subject TEXT NOT NULL,
        body TEXT NOT NULL,
        is_active BOOLEAN NOT NULL DEFAULT true,
        created_at TIMESTAMP NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      )
    `);
  } catch {
    // table already exists or race condition, ignore
  }
}

export async function getHcEmailTemplates() {
  await ensureHcEmailTemplatesTable();
  return await db.select().from(hcEmailTemplates).orderBy(desc(hcEmailTemplates.createdAt));
}

export async function getHcEmailTemplateByType(type: string) {
  await ensureHcEmailTemplatesTable();
  const [tmpl] = await db
    .select()
    .from(hcEmailTemplates)
    .where(eq(hcEmailTemplates.type, type))
    .limit(1);
  return tmpl ?? null;
}

export async function ensureHcEmailTable() {
  await ensureHcEmailTemplatesTable();
}

export async function saveHcEmailTemplate(id: number | null, data: HcEmailTemplateData) {
  await ensureHcEmailTemplatesTable();
  if (id) {
    const [updated] = await db
      .update(hcEmailTemplates)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(hcEmailTemplates.id, id))
      .returning();
    revalidatePath("/dashboard/hc/settings/email-templates");
    return updated;
  }
  const [created] = await db.insert(hcEmailTemplates).values(data).returning();
  revalidatePath("/dashboard/hc/settings/email-templates");
  return created;
}

export async function deleteHcEmailTemplate(id: number) {
  await ensureHcEmailTemplatesTable();
  await db.delete(hcEmailTemplates).where(eq(hcEmailTemplates.id, id));
  revalidatePath("/dashboard/hc/settings/email-templates");
  return { success: true };
}

export async function getHcEmailDeliveryLogs(limit = 20) {
  const logs = await db
    .select({
      id: emailDeliveryLogs.id,
      toEmail: emailDeliveryLogs.toEmail,
      subject: emailDeliveryLogs.subject,
      templateCode: emailDeliveryLogs.templateCode,
      templateName: emailDeliveryLogs.templateName,
      status: emailDeliveryLogs.status,
      errorMessage: emailDeliveryLogs.errorMessage,
      sentAt: emailDeliveryLogs.sentAt,
      createdAt: emailDeliveryLogs.createdAt,
    })
    .from(emailDeliveryLogs)
    .where(inArray(emailDeliveryLogs.templateCode, HC_TEMPLATE_CODES))
    .orderBy(desc(emailDeliveryLogs.createdAt))
    .limit(limit);

  return logs;
}

export async function ensureDefaultTemplates() {
  await ensureHcEmailTemplatesTable();

  const defaults: Array<{ type: string; name: string; subject: string; body: string }> = [
    {
      type: "test_assigned",
      name: "Undangan Tes Online",
      subject: `[HERO] Undangan Tes Online — {jobTitle}`,
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, {candidateName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap selanjutnya</strong> dan diundang untuk mengikuti <strong>{jobTitle}</strong>.
      </p>
      <p style="margin:4px 0;color:#475569;font-size:14px;line-height:1.7;">
        Silakan klik tombol di bawah untuk memulai tes Anda:
      </p>
      <div style="text-align:center;margin:28px 0;">
        <a href="{testLink}" target="_blank" style="display:inline-block;background:linear-gradient(135deg,#0f172a,#334155);color:#ffffff;padding:14px 40px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px;">🔗 Mulai Tes Sekarang</a>
      </div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">
        Link berlaku selama <strong>{duration} hari</strong>. Mohon diselesaikan sebelum batas waktu.<br/>
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
</body></html>`,
    },
    {
      type: "interview_invitation",
      name: "Undangan Interview",
      subject: `[HERO] Undangan Interview — {jobTitle}`,
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, {candidateName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap Interview</strong> untuk posisi <strong>{jobTitle}</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#fef3c7,#fde68a);border:1px solid #f59e0b;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#92400e;"><strong>🗓 Jadwal Interview:</strong></p>
        <p style="margin:4px 0 0;font-size:15px;font-weight:700;color:#92400e;">{date} · {time}</p>
      </div>
      <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin:20px 0;">
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Lokasi/Link:</strong> {location}</p>
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Pewawancara:</strong> {interviewer}</p>
        <p style="margin:4px 0;color:#475569;font-size:13px;"><strong>Durasi:</strong> {duration} menit</p>
      </div>
      <p style="margin:16px 0 0;color:#94a3b8;font-size:12px;">Mohon hadir 10 menit sebelum jadwal.</p>
    </td></tr>
    <tr><td style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e2e8f0;">
      <p style="margin:0;color:#94a3b8;font-size:11px;">PT Chitra Paratama · Human Capital Division</p>
      <p style="margin:4px 0 0;color:#cbd5e1;font-size:11px;">Email ini dikirim otomatis. Mohon tidak membalas email ini.</p>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
    },
    {
      type: "mcu_invitation",
      name: "Undangan Medical Check Up",
      subject: `[HERO] Undangan Medical Check Up — {jobTitle}`,
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Sistem Rekrutmen & Assessment Online</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <h2 style="margin:0;color:#0f172a;font-size:18px;">Selamat, {candidateName}! 🎉</h2>
      <p style="margin:12px 0;color:#475569;font-size:14px;line-height:1.7;">
        Selamat! Anda <strong>lolos ke tahap Medical Check Up (MCU)</strong> untuk posisi <strong>{jobTitle}</strong>.
      </p>
      <div style="background:linear-gradient(135deg,#dbeafe,#bfdbfe);border:1px solid #3b82f6;border-radius:12px;padding:16px 20px;margin:20px 0;">
        <p style="margin:0;font-size:14px;color:#1e40af;"><strong>🏥 Detail MCU:</strong></p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Klinik:</strong> {clinicName}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Tanggal:</strong> {date}</p>
        <p style="margin:4px 0 0;font-size:14px;color:#1e40af;"><strong>Paket:</strong> {paket}</p>
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
</body></html>`,
    },
    {
      type: "mcu_pengantar",
      name: "Surat Pengantar MCU ke Klinik",
      subject: `[HERO] Surat Pengantar Medical Check Up - {candidateName}`,
      body: `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body style="margin:0;padding:0;font-family:'Segoe UI',Arial,sans-serif;background:#f1f5f9;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
  <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
    <tr><td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">PT Chitra Paratama</h1>
      <p style="margin:8px 0 0;color:#94a3b8;font-size:13px;">Surat Pengantar Medical Check Up</p>
    </td></tr>
    <tr><td style="padding:32px 40px;">
      <p>Kepada Yth.<br/><strong>Pimpinan / Admin {clinicName}</strong></p>
      <p>Dengan hormat,<br/>Mohon bantuannya untuk melakukan pemeriksaan kesehatan (Medical Check Up) bagi Calon Karyawan kami:</p>
      <table style="width:100%;margin:20px 0;border-collapse:collapse;">
        <tr><td style="width:150px;padding:5px 0;"><strong>Nama</strong></td><td>:</td><td>{candidateName}</td></tr>
        <tr><td style="padding:5px 0;"><strong>Tanggal MCU</strong></td><td>:</td><td>{date}</td></tr>
        <tr><td style="padding:5px 0;"><strong>Paket MCU</strong></td><td>:</td><td>{paket}</td></tr>
      </table>
      <p>Biaya ditagihkan ke PT Chitra Paratama. Hasil MCU dikirim via email ini atau amplop tertutup.</p>
      <p>Terima kasih.</p>
      <div style="margin-top:40px;"><p>Hormat kami,</p><p style="margin-top:60px;"><strong>Human Capital Department</strong><br/>PT Chitra Paratama</p></div>
    </td></tr>
  </table>
</td></tr>
</table>
</body></html>`,
    },
  ];

  for (const def of defaults) {
    const existing = await db
      .select({ id: hcEmailTemplates.id })
      .from(hcEmailTemplates)
      .where(eq(hcEmailTemplates.type, def.type))
      .limit(1);

    if (existing.length === 0) {
      await db.insert(hcEmailTemplates).values({
        name: def.name,
        type: def.type,
        subject: def.subject,
        body: def.body,
        isActive: true,
      });
    }
  }

  return { success: true };
}
