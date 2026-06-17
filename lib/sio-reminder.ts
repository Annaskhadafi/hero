'use server'

import { and, gte, lte, eq, asc, or, inArray, sql } from 'drizzle-orm'
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

    const reminderConfig = await getSioReminderConfig()
    const excludedIds = new Set<number>(JSON.parse(reminderConfig?.excludedManagerIds || '[]'))

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

        if (cert.managerId && excludedIds.has(cert.managerId)) {
          result.skipped++
          result.details.push(`Skip: ${cert.employeeName} — ${cert.certName} (manager dikecualikan)`)
          continue
        }

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
  } catch (err) {
    result.details.push(`Fatal: ${err instanceof Error ? err.message : 'unknown'}`)
    result.errors++
  }

  revalidatePath('/dashboard/training-records')
  return result
}

export interface SectionHead {
  id: number
  name: string
  email: string | null
  department: string | null
  section: string | null
  jobTitle: string | null
  employeeCount: number
  hasExpiringCerts: boolean
  excluded: boolean
}

export async function getAllSectionHeads(): Promise<SectionHead[]> {
  const config = await getSioReminderConfig()
  const excludedIds = new Set<number>(JSON.parse(config?.excludedManagerIds || '[]'))
  const allManagers = await db
    .select({
      id: employees.id,
      name: employees.name,
      email: employees.email,
      department: employees.department,
      section: employees.section,
      jobTitle: employees.jobTitle,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        or(
          sql`LOWER(${employees.jobTitle}) LIKE '%manager%'`,
          sql`LOWER(${employees.jobTitle}) LIKE '%head%'`,
          sql`LOWER(${employees.jobTitle}) LIKE '%supervisor%'`,
          sql`LOWER(${employees.jobTitle}) LIKE '%coordinator%'`,
          sql`LOWER(${employees.role}) LIKE '%manager%'`,
          sql`LOWER(${employees.role}) LIKE '%head%'`,
          sql`LOWER(${employees.role}) LIKE '%supervisor%'`,
          sql`LOWER(${employees.role}) LIKE '%coordinator%'`,
        )
      )
    )
    .orderBy(asc(employees.department), asc(employees.section), asc(employees.name))

  const managerIds = allManagers.filter((m) => m.id).map((m) => m.id)
  const subordinates = managerIds.length > 0
    ? await db
        .select({ managerId: employees.directManagerId, count: sql<number>`count(*)` })
        .from(employees)
        .where(and(eq(employees.isActive, true), inArray(employees.directManagerId, managerIds)))
        .groupBy(employees.directManagerId)
    : []
  const subordinateMap = new Map(subordinates.map((s) => [s.managerId, s.count]))

  const expiringManagerIds = await db
    .select({ managerId: employees.directManagerId })
    .from(sioCertifications)
    .innerJoin(employees, eq(sioCertifications.employeeId, employees.id))
    .where(
      and(
        sql`${employees.directManagerId} IS NOT NULL`,
        or(
          sql`${sioCertifications.status} = 'expired'`,
          sql`${sioCertifications.status} = 'expiring_soon'`,
          sql`${sioCertifications.expiryDate} <= CURRENT_DATE + INTERVAL '30 days'`,
        )
      )
    )
  const expiringSet = new Set(expiringManagerIds.map((e) => e.managerId))

  return allManagers.map((m) => ({
    ...m,
    employeeCount: subordinateMap.get(m.id) ?? 0,
    hasExpiringCerts: expiringSet.has(m.id),
    excluded: excludedIds.has(m.id),
  }))
}

export async function getSioReminderConfig() {
  try {
    const [config] = await db.select().from(sioReminderConfig).limit(1)
    return config ?? null
  } catch {
    return null
  }
}

export async function toggleSectionHeadExclusion(
  employeeId: number,
  exclude: boolean
): Promise<{ status: string; message: string }> {
  try {
    const config = await getSioReminderConfig()
    const excluded: number[] = JSON.parse(config?.excludedManagerIds || '[]')
    const newExcluded = exclude
      ? [...new Set([...excluded, employeeId])]
      : excluded.filter((id) => id !== employeeId)

    const existing = config?.id
    if (existing) {
      await db.update(sioReminderConfig).set({ excludedManagerIds: JSON.stringify(newExcluded), updatedAt: new Date() }).where(eq(sioReminderConfig.id, existing))
    } else {
      await db.insert(sioReminderConfig).values({ excludedManagerIds: JSON.stringify(newExcluded) })
    }
    return { status: 'success', message: exclude ? 'Dikecualikan dari reminder.' : 'Dimasukkan kembali.' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Gagal.' }
  }
}

export async function updateSectionHeadEmail(
  employeeId: number,
  newEmail: string
): Promise<{ status: string; message: string }> {
  try {
    await db
      .update(employees)
      .set({ email: newEmail })
      .where(eq(employees.id, employeeId))
    return { status: 'success', message: 'Email berhasil diperbarui.' }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Gagal update email.' }
  }
}

export interface SingleReminderPayload {
  employeeName: string
  certName: string
  certType: string
  expiryDate: string | null
  toEmail: string
  ccEmail: string
}

export async function sendSingleSioReminder(
  payload: SingleReminderPayload
): Promise<{ status: string; message: string }> {
  try {
    const smtpSettings = await getEmailSmtpSettingsData()
    if (!smtpSettings?.isActive || !smtpSettings.host) {
      return { status: 'error', message: 'SMTP email belum dikonfigurasi. Settings > Email.' }
    }

    const daysLeft = payload.expiryDate
      ? Math.ceil((new Date(payload.expiryDate).getTime() - Date.now()) / 86400000)
      : 0

    const subject = `[Reminder] Sertifikasi ${payload.certType} akan expired — ${payload.employeeName}`
    const text = `Yth. Section Head,\n\nSertifikasi berikut akan segera berakhir:\n\nKaryawan: ${payload.employeeName}\nSertifikat: ${payload.certName}\nTipe: ${payload.certType}\nMasa Berlaku: ${payload.expiryDate || '-'}\nSisa Hari: ${daysLeft} hari\n\nHarap segera mengambil tindakan perpanjangan.\n\nEmail dikirim otomatis oleh HERO.`
    const html = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#92400e;">Peringatan Expiry Sertifikasi</h2>
  <p>Yth. Section Head,</p>
  <p>Berikut sertifikasi yang akan segera berakhir:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Karyawan</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sertifikat</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Tipe</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Masa Berlaku</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sisa Hari</th>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;">${payload.employeeName}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${payload.certName}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${payload.certType}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${payload.expiryDate || '-'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:${daysLeft <= 0 ? '#dc2626' : daysLeft <= 30 ? '#d97706' : '#16a34a'};">${daysLeft} hari</td>
    </tr>
  </table>
  <p style="color:#64748b;font-size:12px;">Harap segera mengambil tindakan perpanjangan atau penggantian.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
  <p style="color:#94a3b8;font-size:11px;">Email ini dikirim otomatis oleh sistem HERO.</p>
</div>`

    // Send to Section Head
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
      { to: payload.toEmail, subject, html, text }
    )

    // Send CC if provided
    const ccList = payload.ccEmail
      ? payload.ccEmail.split(',').map((e) => e.trim()).filter(Boolean)
      : []
    for (const cc of ccList) {
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
          { to: cc, subject: `CC: ${subject}`, html, text }
        )
      } catch {}
    }

    return { status: 'success', message: `Reminder terkirim ke ${payload.toEmail}${ccList.length > 0 ? ` + ${ccList.length} CC` : ''}.` }
  } catch (err) {
    return { status: 'error', message: err instanceof Error ? err.message : 'Gagal kirim email.' }
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

export interface RecipientPreview {
  managerName: string
  managerEmail: string
  employees: { name: string; certName: string; certType: string; expiryDate: string | null; daysLeft: number }[]
}

export interface ReminderPreview {
  recipients: RecipientPreview[]
  totalCerts: number
  totalManagers: number
  skippedEmployees: { name: string; certName: string; reason: string }[]
  emailTemplateHtml: string
  additionalRecipients: string
}

export async function getReminderPreview(daysBefore: number): Promise<ReminderPreview> {
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

  const managerIds = [...new Set(expiring.map((e) => e.managerId).filter(Boolean))]
  const managers = managerIds.length > 0
    ? await db.select({ id: employees.id, name: employees.name, email: employees.email }).from(employees).where(and(eq(employees.isActive, true), ...managerIds.map((id) => eq(employees.id, id!))))
    : []
  const managerMap = new Map(managers.map((m) => [m.id, m]))
  const config = await getSioReminderConfig()
  const additionalRecipients = config?.additionalRecipients || ''

  const recipientMap = new Map<string, RecipientPreview>()
  const skippedEmployees: ReminderPreview['skippedEmployees'] = []

  for (const cert of expiring) {
    const daysLeft = Math.ceil((new Date(cert.expiryDate!).getTime() - Date.now()) / 86400000)
    if (!cert.managerId || !managerMap.get(cert.managerId)?.email) {
      skippedEmployees.push({ name: cert.employeeName, certName: cert.certName, reason: 'Tidak ada atasan / email atasan' })
      continue
    }
    const mgr = managerMap.get(cert.managerId)!
    if (!recipientMap.has(mgr.email)) {
      recipientMap.set(mgr.email, { managerName: mgr.name, managerEmail: mgr.email, employees: [] })
    }
    recipientMap.get(mgr.email)!.employees.push({
      name: cert.employeeName,
      certName: cert.certName,
      certType: cert.certType,
      expiryDate: cert.expiryDate,
      daysLeft,
    })
  }

  const sampleCert = expiring[0]
  const sampleDays = sampleCert ? Math.ceil((new Date(sampleCert.expiryDate!).getTime() - Date.now()) / 86400000) : 30
  const sampleMgr = sampleCert?.managerId ? managerMap.get(sampleCert.managerId) : null

  const emailTemplateHtml = `
<div style="font-family:Inter,Arial,sans-serif;max-width:600px;margin:0 auto;">
  <h2 style="color:#92400e;">Peringatan Expiry Sertifikasi</h2>
  <p>Yth. ${sampleMgr?.name || '[Nama Section Head]'},</p>
  <p>Berikut karyawan di bawah arahan Bapak/Ibu yang sertifikasinya akan segera berakhir:</p>
  <table style="width:100%;border-collapse:collapse;margin:16px 0;">
    <tr style="background:#fef3c7;">
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Karyawan</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sertifikat</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Tipe</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Masa Berlaku</th>
      <th style="padding:8px;text-align:left;border:1px solid #e2e8f0;">Sisa Hari</th>
    </tr>
    <tr>
      <td style="padding:8px;border:1px solid #e2e8f0;">${sampleCert?.employeeName || '[Nama Karyawan]'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${sampleCert?.certName || '[Nama Sertifikat]'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${sampleCert?.certType || '[Tipe]'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;">${sampleCert?.expiryDate || '[Tanggal Expiry]'}</td>
      <td style="padding:8px;border:1px solid #e2e8f0;font-weight:bold;color:${sampleDays <= 30 ? '#dc2626' : '#d97706'};">${sampleDays} hari</td>
    </tr>
  </table>
  <p style="color:#64748b;font-size:12px;">Harap segera mengambil tindakan perpanjangan atau penggantian sertifikasi karyawan bersangkutan.</p>
  <hr style="border:none;border-top:1px solid #e2e8f0;margin:16px 0;">
  <p style="color:#94a3b8;font-size:11px;">Email ini dikirim otomatis oleh sistem HERO. Mohon tidak membalas email ini.</p>
</div>`

  return {
    recipients: [...recipientMap.values()],
    totalCerts: expiring.length,
    totalManagers: recipientMap.size,
    skippedEmployees,
    emailTemplateHtml,
    additionalRecipients,
  }
}
