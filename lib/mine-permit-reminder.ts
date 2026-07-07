'use server'

import { and, gte, lte, eq, asc, or, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import { employees, minePermitReminderConfig } from '@/db/schema/hero'
import { getEmailSmtpSettingsData } from '@/lib/hero-admin'
import { sendEmailViaSmtp } from '@/lib/email-delivery'

export interface ReminderResult {
  sent: number
  skipped: number
  errors: number
  details: string[]
}

export async function getMinePermitReminderConfig() {
  const [config] = await db
    .select()
    .from(minePermitReminderConfig)
    .limit(1)

  return (
    config ?? {
      id: 0,
      additionalRecipients: '',
      excludedManagerIds: '[]',
      reminderDays: 30,
      isActive: true,
      updatedAt: new Date(),
    }
  )
}

export async function sendMinePermitExpiryReminders(
  daysBefore: number
): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0, details: [] }

  try {
    const today = new Date()
    const targetDate = new Date(today.getTime() + daysBefore * 24 * 60 * 60 * 1000)

    const expiring = await db
      .select({
        employeeId: employees.id,
        employeeName: employees.name,
        employeeEmail: employees.email,
        managerId: employees.directManagerId,
        expMinePermit: employees.expMinePermit,
      })
      .from(employees)
      .where(
        and(
          eq(employees.isActive, true),
          gte(employees.expMinePermit, today.toISOString().split('T')[0]),
          lte(employees.expMinePermit, targetDate.toISOString().split('T')[0])
        )
      )

    if (expiring.length === 0) {
      result.details.push('Tidak ada Mine Permit yang akan expired dalam waktu dekat.')
      return result
    }

    const smtpSettings = await getEmailSmtpSettingsData()
    if (!smtpSettings?.isActive) {
      result.details.push('SMTP email belum dikonfigurasi atau tidak aktif.')
      result.errors = expiring.length
      return result
    }

    const reminderConfig = await getMinePermitReminderConfig()
    const excludedIds = new Set<number>(JSON.parse(reminderConfig.excludedManagerIds || '[]'))

    const managerIds = [...new Set(expiring.map((e) => e.managerId).filter(Boolean))]
    const managers = managerIds.length > 0
      ? await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(and(eq(employees.isActive, true), ...managerIds.map((id) => eq(employees.id, id!))))
      : []

    const managerMap = new Map(managers.map((m) => [m.id, m]))

    for (const emp of expiring) {
      try {
        const recipientEmail = emp.managerId
          ? managerMap.get(emp.managerId)?.email
          : null

        if (emp.managerId && excludedIds.has(emp.managerId)) {
          result.skipped++
          result.details.push(`Skip: ${emp.employeeName} — Mine Permit (manager dikecualikan)`)
          continue
        }

        if (!recipientEmail) {
          result.skipped++
          result.details.push(`Skip: ${emp.employeeName} — Mine Permit (no manager email)`)
          continue
        }

        const daysLeft = Math.ceil(
          (new Date(emp.expMinePermit!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
        )
        const managerName = managerMap.get(emp.managerId!)?.name || 'Bapak/Ibu'

        const subject = `[Reminder] Mine Permit akan expired — ${emp.employeeName}`
        const text = `Yth. ${managerName},\n\nBerikut karyawan di bawah arahan Bapak/Ibu yang Mine Permit-nya akan segera berakhir:\n\nKaryawan: ${emp.employeeName}\nMasa Berlaku: ${emp.expMinePermit}\nSisa Hari: ${daysLeft} hari\n\nHarap segera mengambil tindakan perpanjangan.\n\nEmail ini dikirim otomatis oleh sistem HERO.`
        const html = `
<div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #92400e;">Peringatan Expiry Mine Permit</h2>
  <p>Yth. ${managerName},</p>
  <p>Berikut adalah karyawan di bawah arahan Bapak/Ibu yang Mine Permit-nya akan segera berakhir:</p>
  <table style="width:100%; border-collapse:collapse; margin:16px 0;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Karyawan</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Masa Berlaku</th>
      <th style="padding:8px; text-align:left; border:1px solid #e2e8f0;">Sisa Hari</th>
    </tr>
    <tr>
      <td style="padding:8px; border:1px solid #e2e8f0;">${emp.employeeName}</td>
      <td style="padding:8px; border:1px solid #e2e8f0;">${emp.expMinePermit}</td>
      <td style="padding:8px; border:1px solid #e2e8f0; font-weight:bold; color:${daysLeft <= 30 ? '#dc2626' : '#d97706'};">${daysLeft} hari</td>
    </tr>
  </table>
  <p style="color:#64748b; font-size:12px;">Harap segera mengambil tindakan perpanjangan Mine Permit karyawan bersangkutan.</p>
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
        result.details.push(`Sent: ${emp.employeeName} → ${recipientEmail} (${daysLeft} hr)`)
      } catch (err) {
        result.errors++
        result.details.push(`Error: ${emp.employeeName} — ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }

    // Send to additional recipients (CC) from config
    const extraRecipients = reminderConfig.additionalRecipients
      ? reminderConfig.additionalRecipients.split(',').map((e: string) => e.trim()).filter(Boolean)
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
            subject: `[Reminder] ${result.sent + result.skipped} Mine Permit akan expired — Ringkasan`,
            html: `<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
<h2 style="color:#92400e;">Ringkasan Reminder Expiry Mine Permit</h2>
<p>Total <strong>${result.sent}</strong> reminder berhasil dikirim ke atasan langsung, <strong>${result.skipped}</strong> skip (tidak ada atasan).</p>
<p style="color:#64748b;font-size:12px;">Email ini dikirim otomatis oleh sistem HERO sebagai CC tambahan.</p>
</div>`,
            text: `Ringkasan Reminder Expiry Mine Permit\n\nTotal ${result.sent} reminder terkirim ke atasan langsung, ${result.skipped} skip.\n\nEmail dikirim otomatis oleh HERO.`,
          }
        )
        result.sent++
        result.details.push(`CC: ${extraEmail}`)
      } catch (err) {
        result.errors++
        result.details.push(`CC Error ${extraEmail}: ${err instanceof Error ? err.message : 'unknown'}`)
      }
    }
  } catch (err) {
    result.details.push(`Fatal: ${err instanceof Error ? err.message : 'unknown'}`)
    result.errors++
  }

  return result
}
