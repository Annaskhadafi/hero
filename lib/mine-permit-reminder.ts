'use server'

import { and, gte, lte, eq, asc, or, inArray, sql } from 'drizzle-orm'
import { db } from '@/db'
import { employees, minePermitReminderConfig } from '@/db/schema/hero'
import { getEmailSmtpSettingsData } from '@/lib/hero-admin'
import { sendEmailViaSmtp } from '@/lib/email-delivery'
import { publishInAppApprovalNotification } from '@/lib/activity-overtime-workflow-email'

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
      reminderDays: 60,
      isActive: true,
      updatedAt: new Date(),
    }
  )
}

export async function sendMinePermitExpiryReminders(
  daysBefore: number = 60
): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, errors: 0, details: [] }

  try {
    const reminderConfig = await getMinePermitReminderConfig()
    const effectiveDays = daysBefore || reminderConfig.reminderDays || 60
    const today = new Date()
    const targetDate = new Date(today.getTime() + effectiveDays * 24 * 60 * 60 * 1000)

    const expiring = await db
      .select({
        employeeId: employees.id,
        employeeName: employees.name,
        employeeEmail: employees.email,
        managerId: employees.directManagerId,
        directManagerIds: employees.directManagerIds,
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
    const excludedIds = new Set<number>(JSON.parse(reminderConfig.excludedManagerIds || '[]'))

    // Collect all manager IDs from all expiring employees
    const allManagerIdsSet = new Set<number>()
    for (const emp of expiring) {
      if (emp.directManagerIds) {
        try {
          const parsed = JSON.parse(emp.directManagerIds)
          if (Array.isArray(parsed)) {
            for (const id of parsed) {
              const num = Number(id)
              if (!isNaN(num) && num > 0) allManagerIdsSet.add(num)
            }
          }
        } catch {}
      }
      if (emp.managerId && typeof emp.managerId === 'number' && emp.managerId > 0) {
        allManagerIdsSet.add(emp.managerId)
      }
    }

    const managerIds = Array.from(allManagerIdsSet)
    const managers = managerIds.length > 0
      ? await db
          .select({ id: employees.id, name: employees.name, email: employees.email })
          .from(employees)
          .where(and(eq(employees.isActive, true), inArray(employees.id, managerIds)))
      : []

    const managerMap = new Map(managers.map((m) => [m.id, m]))

    for (const emp of expiring) {
      const empManagerIds: number[] = []
      if (emp.directManagerIds) {
        try {
          const parsed = JSON.parse(emp.directManagerIds)
          if (Array.isArray(parsed)) {
            for (const id of parsed) {
              const num = Number(id)
              if (!isNaN(num) && num > 0 && !empManagerIds.includes(num)) {
                empManagerIds.push(num)
              }
            }
          }
        } catch {}
      }
      if (emp.managerId && !empManagerIds.includes(emp.managerId)) {
        empManagerIds.push(emp.managerId)
      }

      if (empManagerIds.length === 0) {
        result.skipped++
        result.details.push(`Skip: ${emp.employeeName} — Mine Permit (tidak ada PJO/Leader)`)
        continue
      }

      for (const mId of empManagerIds) {
        try {
          if (excludedIds.has(mId)) {
            result.skipped++
            result.details.push(`Skip: ${emp.employeeName} — Mine Permit (PJO/Leader ID ${mId} dikecualikan)`)
            continue
          }

          const manager = managerMap.get(mId)
          const recipientEmail = manager?.email

          if (!recipientEmail) {
            result.skipped++
            result.details.push(`Skip: ${emp.employeeName} — Mine Permit (PJO/Leader ${manager?.name || mId} tidak ada email)`)
            continue
          }

          const daysLeft = Math.ceil(
            (new Date(emp.expMinePermit!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
          )
          const managerName = manager?.name || 'Bapak/Ibu'

          // 1. In-app bell notification to PJO / Leader
          await publishInAppApprovalNotification({
            recipientEmail,
            title: `[Reminder] Mine Permit ${emp.employeeName} akan berakhir`,
            body: `Mine Permit ${emp.employeeName} berlaku s/d ${emp.expMinePermit} (${daysLeft} hari lagi). Harap segera lakukan perpanjangan.`,
            url: `/dashboard/hc/employee`,
            eventType: 'mine_permit_expiring',
          })

          // 2. Email notification via SMTP if active
          if (smtpSettings?.isActive) {
            const subject = `[Reminder] Mine Permit akan berakhir — ${emp.employeeName}`
            const text = `Yth. ${managerName},\n\nBerikut karyawan di bawah arahan Bapak/Ibu yang Mine Permit-nya akan segera berakhir (2 bulan sebelum berakhir):\n\nKaryawan: ${emp.employeeName}\nMasa Berlaku: ${emp.expMinePermit}\nSisa Hari: ${daysLeft} hari\n\nHarap segera mengambil tindakan perpanjangan.\n\nEmail ini dikirim otomatis oleh sistem HERO.`
            const html = `
<div style="font-family: Inter, Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <h2 style="color: #92400e;">Peringatan Expiry Mine Permit</h2>
  <p>Yth. ${managerName},</p>
  <p>Berikut adalah karyawan di bawah arahan Bapak/Ibu yang Mine Permit-nya akan segera berakhir (2 bulan sebelum berakhir):</p>
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
          }

          result.sent++
          result.details.push(`Sent: ${emp.employeeName} → ${managerName} (${recipientEmail}) [${daysLeft} hr]`)
        } catch (err) {
          result.errors++
          result.details.push(`Error: ${emp.employeeName} (mgr ${mId}) — ${err instanceof Error ? err.message : 'unknown'}`)
        }
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
