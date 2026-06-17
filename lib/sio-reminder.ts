'use server'

import { and, gte, lte, eq } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { employees, sioCertifications, sioReminderConfig } from '@/db/schema/hero'
import { getEmailSmtpSettingsData } from '@/lib/hero-admin'
import { sendEmailViaSmtp } from '@/lib/email-delivery'

export interface ReminderResult {
  sent: number
  skipped: number
  errors: number
  details: string[]
}

export async function sendSioExpiryReminders(
  daysBefore: number
): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0, details: [] }

  try {
    const today = new Date()
    const targetDate = new Date(today.getTime() + daysBefore * 24 * 60 * 60 * 1000)

    const expiring = await db
      .select({
        id: sioCertifications.id,
        certName: sioCertifications.certName,
        certType: sioCertifications.certType,
        expiryDate: sioCertifications.expiryDate,
        employeeId: sioCertifications.employeeId,
        employeeName: employees.name,
        employeeEmail: employees.email,
        managerId: employees.directManagerId,
      })
      .from(sioCertifications)
      .innerJoin(employees, eq(sioCertifications.employeeId, employees.id))
      .where(
        and(
          gte(sioCertifications.expiryDate, today.toISOString().split('T')[0]),
          lte(sioCertifications.expiryDate, targetDate.toISOString().split('T')[0]),
          eq(sioCertifications.status, 'active'),
        )
      )

    if (expiring.length === 0) {
      result.details.push('Tidak ada sertifikat yang akan expired dalam waktu dekat.')
      return result
    }

    const smtpSettings = await getEmailSmtpSettingsData()
    if (!smtpSettings?.isActive) {
      result.details.push('SMTP email belum dikonfigurasi atau tidak aktif.')
      result.errors = expiring.length
      return result
    }

    const managerIds = [...new Set(expiring.map((e) => e.managerId).filter(Boolean))]
    const managers = managerIds.length > 0
      ? await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(and(eq(employees.isActive, true), ...managerIds.map((id) => eq(employees.id, id!))))
      : []

    const managerMap = new Map(managers.map((m) => [m.id, m]))

    for (const cert of expiring) {
      try {
        const recipientEmail = cert.managerId
          ? managerMap.get(cert.managerId)?.email
          : null

        if (!recipientEmail) {
          result.skipped++
          result.details.push(`Skip: ${cert.employeeName} — ${cert.certName} (no manager email)`)
          continue
        }

        const daysLeft = Math.ceil(
          (new Date(cert.expiryDate!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
        const managerName = managerMap.get(cert.managerId!)?.name || 'Bapak/Ibu'

        const subject = `[Reminder] Sertifikasi ${cert.certType} akan expired — ${cert.employeeName}`
        const text = `Yth. ${managerName},\n\nBerikut karyawan di bawah arahan Bapak/Ibu yang sertifikasinya akan segera berakhir:\n\nKaryawan: ${cert.employeeName}\nSertifikat: ${cert.certName}\nTipe: ${cert.certType}\nMasa Berlaku: ${cert.expiryDate}\nSisa Hari: ${daysLeft} hari\n\nHarap segera mengambil tindakan perpanjangan atau penggantian sertifikasi.\n\nEmail ini dikirim otomatis oleh sistem HERO.`
        const html = `
<div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #92400e;">Peringatan Expiry Sertifikasi</h2>
  <p>Yth. ${managerName},</p>
  <p>Berikut adalah karyawan di bawah arahan Bapak/Ibu yang sertifikasinya akan segera berakhir:</p>
  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Karyawan</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Sertifikat</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Tipe</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Masa Berlaku</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Sisa Hari</th>
    </tr>
    <tr>
      <td style="padding:8px; border:1px solid #e2e8f0;">${cert.employeeName}</td>
      <td style="padding:8px; border:1px solid #e2e8f0;">${cert.certName}</td>
      <td style="padding:8px; border:1px solid #e2e8f0;">${cert.certType}</td>
      <td style="padding:8px; border:1px solid #e2e8f0;">${cert.expiryDate}</td>
      <td style="padding:8px; border:1px solid #e2e8f0; font-weight:bold; color:${daysLeft <= 30 ? '#dc2626' : '#d97706'};">${daysLeft} hari</td>
    </tr>
  </table>
  <p style="color:#64748b; font-size:12px;">Harap segera mengambil tindakan perpanjangan atau penggantian sertifikasi karyawan bersangkutan.</p>
  <hr style="border:none; border-top:1px solid #e2e8f0; margin:16px 0;">
  <p style="color:#94a3b8; font-size:11px;">Email ini dikirim otomatis oleh sistem HERO. Mohon tidak membalas email ini.</p>
</div>`

        await sendEmailViaSmtp(
          {
            host: smtpSettings.host,
            port: smtpSettings.port,
            encryption: smtpSettings.encryption as 'tls' | 'ssl' | 'none',
            username: smtpSettings.username,
            passwordSecret: smtpSettings.passwordSecret,
            fromEmail: smtpSettings.fromEmail,
            fromName: smtpSettings.fromName,
            replyToEmail: smtpSettings.replyToEmail,
            timeoutSeconds: smtpSettings.timeoutSeconds,
          },
          {
            to: recipientEmail,
            subject,
            html,
            text,
          }
        )

        result.sent++
        result.details.push(`Sent: ${cert.employeeName} → ${recipientEmail} (${cert.certName}, ${daysLeft} hr)`)
      } catch (err) {
        result.errors++
        result.details.push(`Error: ${cert.employeeName} — ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.details.push(`Fatal: ${err instanceof Error ? err.message : 'unknown'}`)
    result.errors++
  }

  // Send to additional recipients (CC) from config
  const config = await getSioReminderConfig()
  const extraRecipients = config?.additionalRecipients
    ? config.additionalRecipients.split(',').map((e: string) => e.trim()).filter(Boolean)
    : []

  for (const extraEmail of extraRecipients) {
    try {
      await sendEmailViaSmtp(
        {
          host: smtpSettings.host,
          port: smtpSettings.port,
          encryption: smtpSettings.encryption as 'tls' | 'ssl' | 'none',
          username: smtpSettings.username,
          passwordSecret: smtpSettings.passwordSecret,
          fromEmail: smtpSettings.fromEmail,
          fromName: smtpSettings.fromName,
          replyToEmail: smtpSettings.replyToEmail,
          timeoutSeconds: smtpSettings.timeoutSeconds,
        },
        {
          to: extraEmail,
          subject: `[Reminder] ${result.sent + result.skipped} sertifikasi akan expired — Ringkasan SIO/POP`,
          html: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#92400e;">Ringkasan Reminder Expiry Sertifikasi</h2>
<p>Total <strong>${result.sent}</strong> reminder berhasil dikirim ke atasan langsung, <strong>${result.skipped}</strong> skip (tidak ada atasan).</p>
<p style="color:#64748b;font-size:12px;">Email ini dikirim otomatis oleh sistem HERO sebagai CC tambahan.</p>
</div>`,
          text: `Ringkasan Reminder Expiry Sertifikasi\n\nTotal ${result.sent} reminder terkirim ke atasan langsung, ${result.skipped} skip.\n\nEmail dikirim otomatis oleh HERO.`,
        }
      )
      result.sent++
      result.details.push(`CC: ${extraEmail}`)
    } catch (err) {
      result.errors++
      result.details.push(`CC Error ${extraEmail}: ${err instanceof Error ? err.message : 'unknown'}`)
    }
  }

  revalidatePath('/dashboard/training-records')
  return result
}

export async function getSioReminderConfig() {
  try {
    const [config] = await db.select().from(sioReminderConfig).limit(1)
    return config ?? null
  } catch {
    return null
  }
}

export async function saveSioReminderConfig(formData: FormData) {
  try {
    const additionalRecipients = (formData.get('additionalRecipients') as string) || ''
    const reminderDays = Number(formData.get('reminderDays')) || 30
    const isActive = formData.get('isActive') === 'true'

    const existing = await db.select({ id: sioReminderConfig.id }).from(sioReminderConfig).limit(1)
    if (existing.length > 0) {
      await db.update(sioReminderConfig).set({ additionalRecipients, reminderDays, isActive, updatedAt: new Date() }).where(eq(sioReminderConfig.id, existing[0].id))
    } else {
      await db.insert(sioReminderConfig).values({ additionalRecipients, reminderDays, isActive })
    }

    revalidatePath('/dashboard/training-records')
    return { status: 'success' as const, message: 'Pengaturan reminder disimpan.' }
  } catch (err) {
    return { status: 'error' as const, message: err instanceof Error ? err.message : 'Gagal menyimpan.' }
  }
}
