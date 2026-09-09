'use server'

import { and, gte, lte, eq, asc, inArray, sql } from 'drizzle-orm'
import { revalidatePath } from 'next/cache'
import { db } from '@/db'
import {
  employees,
  sites,
  minePermitReminderConfig,
  notificationEvents,
  notificationDeliveries,
} from '@/db/schema/hero'
import { sendWorkflowEmail } from '@/lib/workflow-email'
import { getPublicAppUrl } from '@/lib/auth-config'

export interface SiteReminderConfigData {
  id?: number
  siteId: number
  siteName?: string
  intervalDays: number
  reminderDays: number
  recipientEmployeeIds: number[]
  recipientEmails?: string[]
  ccEmployeeIds: number[]
  ccEmails?: string[]
  additionalCcEmails: string
  isActive: boolean
  isConfigured?: boolean
  lastSentAt: Date | null
  updatedAt?: Date | null
}

export interface ReminderResult {
  sent: boolean
  skipped?: boolean
  siteId?: number
  siteName?: string
  count: number
  toCount: number
  ccCount: number
  reason?: string
  errors?: number
  details?: string[]
}

export async function getMinePermitSiteOptions() {
  const [siteRows, empRows] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
        location: sites.location,
        isActive: sites.isActive,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
    db
      .select({
        id: employees.id,
        name: employees.name,
        employeeSn: employees.employeeSn,
        email: employees.email,
        jobTitle: employees.jobTitle,
        siteId: employees.siteId,
      })
      .from(employees)
      .where(and(eq(employees.isActive, true), sql`${employees.email} IS NOT NULL AND ${employees.email} != ''`))
      .orderBy(asc(employees.name)),
  ])

  return { sites: siteRows, employees: empRows }
}

export async function getMinePermitSiteConfig(siteId: number): Promise<SiteReminderConfigData> {
  const [config] = await db
    .select()
    .from(minePermitReminderConfig)
    .where(eq(minePermitReminderConfig.siteId, siteId))
    .limit(1)

  const [site] = await db
    .select({ name: sites.name })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1)

  if (!config) {
    return {
      siteId,
      siteName: site?.name ?? '',
      intervalDays: 1,
      reminderDays: 30,
      recipientEmployeeIds: [],
      recipientEmails: [],
      ccEmployeeIds: [],
      ccEmails: [],
      additionalCcEmails: '',
      isActive: true,
      isConfigured: false,
      lastSentAt: null,
    }
  }

  let recipientIds: number[] = []
  let ccIds: number[] = []
  try {
    recipientIds = JSON.parse(config.recipientEmployeeIds || '[]')
  } catch {}
  try {
    ccIds = JSON.parse(config.ccEmployeeIds || '[]')
  } catch {}

  const allIds = [...new Set([...recipientIds, ...ccIds])]
  let emailMap = new Map<number, string>()
  if (allIds.length > 0) {
    const emps = await db
      .select({ id: employees.id, email: employees.email })
      .from(employees)
      .where(inArray(employees.id, allIds))
    for (const e of emps) {
      if (e.email) emailMap.set(e.id, e.email)
    }
  }

  const recipientEmails = recipientIds.map((id) => emailMap.get(id)).filter(Boolean) as string[]
  const ccEmails = ccIds.map((id) => emailMap.get(id)).filter(Boolean) as string[]

  return {
    id: config.id,
    siteId: config.siteId ?? siteId,
    siteName: site?.name ?? '',
    intervalDays: config.intervalDays ?? 1,
    reminderDays: config.reminderDays ?? 30,
    recipientEmployeeIds: Array.isArray(recipientIds) ? recipientIds : [],
    recipientEmails,
    ccEmployeeIds: Array.isArray(ccIds) ? ccIds : [],
    ccEmails,
    additionalCcEmails: config.additionalCcEmails ?? '',
    isActive: config.isActive ?? true,
    isConfigured: true,
    lastSentAt: config.lastSentAt ? new Date(config.lastSentAt) : null,
    updatedAt: config.updatedAt ? new Date(config.updatedAt) : null,
  }
}

export async function getAllMinePermitSiteConfigs(): Promise<SiteReminderConfigData[]> {
  const [allSites, configs] = await Promise.all([
    db
      .select({
        id: sites.id,
        name: sites.name,
      })
      .from(sites)
      .where(eq(sites.isActive, true))
      .orderBy(asc(sites.name)),
    db.select().from(minePermitReminderConfig),
  ])

  // Collect all employee IDs for batch email lookup
  const allEmployeeIds = new Set<number>()
  for (const c of configs) {
    try {
      const rIds = JSON.parse(c.recipientEmployeeIds || '[]')
      if (Array.isArray(rIds)) rIds.forEach((id) => allEmployeeIds.add(id))
    } catch {}
    try {
      const cIds = JSON.parse(c.ccEmployeeIds || '[]')
      if (Array.isArray(cIds)) cIds.forEach((id) => allEmployeeIds.add(id))
    } catch {}
  }

  let emailMap = new Map<number, string>()
  if (allEmployeeIds.size > 0) {
    const emps = await db
      .select({ id: employees.id, email: employees.email })
      .from(employees)
      .where(inArray(employees.id, Array.from(allEmployeeIds)))
    for (const e of emps) {
      if (e.email) emailMap.set(e.id, e.email)
    }
  }

  const configMap = new Map<number, typeof configs[0]>()
  for (const c of configs) {
    if (c.siteId) {
      configMap.set(c.siteId, c)
    }
  }

  return allSites.map((site) => {
    const c = configMap.get(site.id)
    let recipientIds: number[] = []
    let ccIds: number[] = []
    if (c) {
      try {
        recipientIds = JSON.parse(c.recipientEmployeeIds || '[]')
      } catch {}
      try {
        ccIds = JSON.parse(c.ccEmployeeIds || '[]')
      } catch {}
    }

    const recipientEmails = recipientIds.map((id) => emailMap.get(id)).filter(Boolean) as string[]
    const ccEmails = ccIds.map((id) => emailMap.get(id)).filter(Boolean) as string[]

    return {
      id: c?.id,
      siteId: site.id,
      siteName: site.name,
      intervalDays: c?.intervalDays ?? 1,
      reminderDays: c?.reminderDays ?? 30,
      recipientEmployeeIds: recipientIds,
      recipientEmails,
      ccEmployeeIds: ccIds,
      ccEmails,
      additionalCcEmails: c?.additionalCcEmails ?? '',
      isActive: c ? Boolean(c.isActive) : true,
      isConfigured: Boolean(c?.id),
      lastSentAt: c?.lastSentAt ? new Date(c.lastSentAt) : null,
      updatedAt: c?.updatedAt ? new Date(c.updatedAt) : null,
    }
  })
}

export async function saveMinePermitSiteConfig(input: {
  siteId: number
  intervalDays: number
  reminderDays: number
  recipientEmployeeIds?: number[]
  recipientEmails?: string[]
  ccEmployeeIds?: number[]
  ccEmails?: string[]
  additionalCcEmails: string
  isActive: boolean
  updatedBy?: string
}) {
  let recipientIds = input.recipientEmployeeIds || []
  let ccIds = input.ccEmployeeIds || []

  // If emails are passed, resolve them to employee IDs
  if (input.recipientEmails !== undefined) {
    const cleanEmails = input.recipientEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (cleanEmails.length > 0) {
      const emps = await db
        .select({ id: employees.id, email: employees.email })
        .from(employees)
        .where(inArray(sql`lower(${employees.email})`, cleanEmails))
      recipientIds = emps.map((e) => e.id)
    } else {
      recipientIds = []
    }
  }

  if (input.ccEmails !== undefined) {
    const cleanCcEmails = input.ccEmails.map((e) => e.trim().toLowerCase()).filter(Boolean)
    if (cleanCcEmails.length > 0) {
      const emps = await db
        .select({ id: employees.id, email: employees.email })
        .from(employees)
        .where(inArray(sql`lower(${employees.email})`, cleanCcEmails))
      ccIds = emps.map((e) => e.id)
    } else {
      ccIds = []
    }
  }

  const existing = await db
    .select({ id: minePermitReminderConfig.id })
    .from(minePermitReminderConfig)
    .where(eq(minePermitReminderConfig.siteId, input.siteId))
    .limit(1)

  const values = {
    siteId: input.siteId,
    intervalDays: Math.max(1, input.intervalDays || 1),
    reminderDays: Math.max(1, input.reminderDays || 30),
    recipientEmployeeIds: JSON.stringify(recipientIds),
    ccEmployeeIds: JSON.stringify(ccIds),
    additionalCcEmails: (input.additionalCcEmails || '').trim(),
    isActive: Boolean(input.isActive),
    updatedAt: new Date(),
    updatedBy: input.updatedBy ?? null,
  }

  if (existing.length > 0) {
    await db
      .update(minePermitReminderConfig)
      .set(values)
      .where(eq(minePermitReminderConfig.id, existing[0].id))
  } else {
    await db.insert(minePermitReminderConfig).values(values)
  }

  try {
    revalidatePath('/dashboard/hc/employee')
  } catch {}
  return { success: true }
}

export async function sendSiteMinePermitExpiryReminder(
  siteId: number,
  isManualTrigger = false
): Promise<ReminderResult> {
  const [site] = await db
    .select({ id: sites.id, name: sites.name, headEmployeeId: sites.headEmployeeId })
    .from(sites)
    .where(eq(sites.id, siteId))
    .limit(1)

  if (!site) {
    return { sent: false, skipped: true, count: 0, toCount: 0, ccCount: 0, reason: 'Site tidak ditemukan' }
  }

  const config = await getMinePermitSiteConfig(siteId)

  if (!config.isActive && !isManualTrigger) {
    return {
      sent: false,
      skipped: true,
      siteId,
      siteName: site.name,
      count: 0,
      toCount: 0,
      ccCount: 0,
      reason: `Konfigurasi reminder Site ${site.name} sedang dinonaktifkan.`,
    }
  }

  // Check interval if not manual trigger
  if (!isManualTrigger && config.lastSentAt) {
    const hoursPassed = (Date.now() - config.lastSentAt.getTime()) / (1000 * 60 * 60)
    const requiredHours = config.intervalDays * 24 - 1 // allow 1h margin
    if (hoursPassed < requiredHours) {
      return {
        sent: false,
        skipped: true,
        siteId,
        siteName: site.name,
        count: 0,
        toCount: 0,
        ccCount: 0,
        reason: `Belum mencapai interval kirim ${config.intervalDays} hari (terakhir dikirim ${config.lastSentAt.toLocaleString('id-ID')}).`,
      }
    }
  }

  const todayStr = new Date().toISOString().split('T')[0]
  const targetDate = new Date(Date.now() + config.reminderDays * 24 * 60 * 60 * 1000)
  const targetDateStr = targetDate.toISOString().split('T')[0]

  // Query employees expiring at this site
  const expiringEmployees = await db
    .select({
      id: employees.id,
      name: employees.name,
      employeeSn: employees.employeeSn,
      email: employees.email,
      jobTitle: employees.jobTitle,
      department: employees.department,
      expMinePermit: employees.expMinePermit,
    })
    .from(employees)
    .where(
      and(
        eq(employees.isActive, true),
        eq(employees.siteId, siteId),
        sql`${employees.expMinePermit} IS NOT NULL`,
        lte(employees.expMinePermit, targetDateStr)
      )
    )
    .orderBy(asc(employees.expMinePermit))

  if (expiringEmployees.length === 0) {
    return {
      sent: false,
      skipped: true,
      siteId,
      siteName: site.name,
      count: 0,
      toCount: 0,
      ccCount: 0,
      reason: `Tidak ada Mine Permit yang akan expired dalam kurun waktu ${config.reminderDays} hari ke depan di Site ${site.name}.`,
    }
  }

  // Resolve recipient emails
  let toEmails: string[] = []
  if (config.recipientEmployeeIds.length > 0) {
    const toUsers = await db
      .select({ email: employees.email })
      .from(employees)
      .where(
        and(
          inArray(employees.id, config.recipientEmployeeIds),
          eq(employees.isActive, true),
          sql`${employees.email} IS NOT NULL AND ${employees.email} != ''`
        )
      )
    toEmails = toUsers.map((u) => u.email!.trim().toLowerCase()).filter(Boolean)
  }

  if (toEmails.length === 0) {
    return {
      sent: false,
      skipped: true,
      siteId,
      siteName: site.name,
      count: expiringEmployees.length,
      toCount: 0,
      ccCount: 0,
      reason: `Penerima utama (To) belum diatur untuk Site ${site.name}. Silakan pilih minimal 1 karyawan penerima di Setting Reminder.`,
    }
  }

  // Resolve CC emails
  let ccEmails: string[] = []
  if (config.ccEmployeeIds.length > 0) {
    const ccUsers = await db
      .select({ email: employees.email })
      .from(employees)
      .where(
        and(
          inArray(employees.id, config.ccEmployeeIds),
          eq(employees.isActive, true),
          sql`${employees.email} IS NOT NULL AND ${employees.email} != ''`
        )
      )
    ccEmails.push(...ccUsers.map((u) => u.email!.trim().toLowerCase()).filter(Boolean))
  }

  if (config.additionalCcEmails && config.additionalCcEmails.trim()) {
    const manualCcs = config.additionalCcEmails
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.includes('@'))
    ccEmails.push(...manualCcs)
  }
  // Deduplicate and remove any that are in To
  ccEmails = Array.from(new Set(ccEmails)).filter((e) => !toEmails.includes(e))

  // Build Table HTML
  const tableRowsHtml = expiringEmployees
    .map((emp, idx) => {
      const expDate = emp.expMinePermit || '-'
      const daysLeft = Math.ceil(
        (new Date(emp.expMinePermit!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
      const isExpired = daysLeft < 0
      const daysText = isExpired ? `Expired (${Math.abs(daysLeft)} hari lalu)` : `${daysLeft} hari lagi`
      const badgeBg = isExpired ? '#fee2e2' : daysLeft <= 14 ? '#ffedd5' : '#fef3c7'
      const badgeColor = isExpired ? '#b91c1c' : daysLeft <= 14 ? '#c2410c' : '#b45309'
      const rowBg = idx % 2 === 0 ? '#ffffff' : '#f8fafc'

      return `<tr style="background-color:${rowBg};">
        <td style="padding:10px 12px;border:1px solid #e2e8f0;text-align:center;color:#64748b;font-size:12px;">${idx + 1}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-family:monospace;font-size:12px;font-weight:600;color:#0f172a;">${emp.employeeSn || '-'}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-weight:700;color:#0f172a;">${emp.name}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#475569;font-size:12px;">${emp.jobTitle || emp.department || '-'}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;color:#0f172a;font-size:12px;font-weight:600;">${expDate}</td>
        <td style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;">
          <span style="display:inline-block;padding:3px 8px;border-radius:999px;background-color:${badgeBg};color:${badgeColor};font-weight:700;font-size:11px;">${daysText}</span>
        </td>
      </tr>`
    })
    .join('')

  const tableContentHtml = `
    <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="width:100%;border-collapse:collapse;margin:18px 0;font-size:13px;background-color:#ffffff;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
      <thead>
        <tr style="background-color:#fef3c7;color:#92400e;text-align:left;">
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;width:36px;text-align:center;">No</th>
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;width:90px;">NIK</th>
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;">Nama Karyawan</th>
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;">Jabatan / Dept</th>
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;width:100px;">Tgl Expired</th>
          <th style="padding:10px 12px;border:1px solid #e2e8f0;font-size:12px;font-weight:700;width:130px;">Sisa Waktu</th>
        </tr>
      </thead>
      <tbody>
        ${tableRowsHtml}
      </tbody>
    </table>
  `

  const tableContentText = expiringEmployees
    .map((emp, idx) => {
      const expDate = emp.expMinePermit || '-'
      const daysLeft = Math.ceil(
        (new Date(emp.expMinePermit!).getTime() - Date.now()) / (24 * 60 * 60 * 1000)
      )
      const isExpired = daysLeft < 0
      const daysText = isExpired ? `Expired (${Math.abs(daysLeft)} hari lalu)` : `${daysLeft} hari lagi`
      return `${idx + 1}. ${emp.name} (NIK: ${emp.employeeSn || '-'}) | Posisi: ${emp.jobTitle || emp.department || '-'} | Exp: ${expDate} (${daysText})`
    })
    .join('\n')

  const appUrl = getPublicAppUrl()
  const viewLink = `${appUrl}/dashboard/hc/employee`

  // Send Email via Centralized sendWorkflowEmail
  await sendWorkflowEmail({
    to: toEmails,
    cc: ccEmails.length > 0 ? ccEmails : [],
    exactCc: true,
    templateCode: 'hc_employee_mine_permit_reminder',
    templateName: 'HC Mine Permit Expiry Reminder',
    fallbackSubject: `[Reminder] Mine Permit Karyawan Segera Berakhir — Site ${site.name} (${expiringEmployees.length} Karyawan)`,
    fallbackHtml: `
      <div style="font-family:Inter,Arial,sans-serif;max-width:640px;margin:0 auto;background:#f8fafc;padding:24px;">
        <div style="background:linear-gradient(135deg,#92400e,#b45309);padding:24px;border-radius:12px 12px 0 0;">
          <p style="color:#fde68a;font-size:12px;margin:0 0 4px;text-transform:uppercase;letter-spacing:1px;font-weight:700;">PT CHITRA PARATAMA • HERO HC</p>
          <h1 style="color:#ffffff;font-size:20px;margin:0;font-weight:800;">Peringatan Expiry Mine Permit</h1>
        </div>
        <div style="background:#ffffff;padding:28px 24px;border-radius:0 0 12px 12px;border:1px solid #e2e8f0;border-top:0;">
          <p style="color:#1e293b;font-size:15px;margin:0 0 12px;font-weight:600;">Yth. Tim Manajemen & PIC Site <strong>${site.name}</strong>,</p>
          <p style="color:#475569;font-size:14px;line-height:1.6;margin:0 0 16px;">
            Berikut rekapitulasi Mine Permit karyawan di Site <strong>${site.name}</strong> yang akan berakhir dalam kurun waktu <strong>${config.reminderDays} hari</strong> ke depan (Total: <strong>${expiringEmployees.length} orang</strong>):
          </p>
          ${tableContentHtml}
          <div style="text-align:center;margin:28px 0;">
            <a href="${viewLink}" style="display:inline-block;background:#b45309;color:#ffffff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:700;font-size:13px;">Buka Data Karyawan HERO</a>
          </div>
          <p style="color:#64748b;font-size:12px;line-height:1.5;margin:16px 0 0;">
            Mohon segera melakukan tindak lanjut koordinasi perpanjangan Mine Permit agar tidak mengganggu aktivitas operasional di site.
          </p>
          <p style="color:#94a3b8;font-size:11px;border-top:1px solid #f1f5f9;padding-top:16px;margin:24px 0 0;">
            Email ini dikirim otomatis oleh Sistem HERO PT Chitra Paratama.
          </p>
        </div>
      </div>
    `,
    fallbackText: `Peringatan Expiry Mine Permit — Site ${site.name}\n\nTotal ${expiringEmployees.length} karyawan Mine Permit-nya akan berakhir dalam ${config.reminderDays} hari ke depan:\n\n${tableContentText}\n\nSilakan cek data selengkapnya di: ${viewLink}\n\nSistem HERO PT Chitra Paratama`,
    variables: {
      siteName: site.name,
      totalExpiring: String(expiringEmployees.length),
      reminderDays: String(config.reminderDays),
      tableContentHtml,
      tableContentText,
      employeeListText: tableContentText,
      viewLink,
    },
  })

  // In-App Notification Bell for all To recipients
  const notificationTitle = `[Reminder] Expiry Mine Permit Site ${site.name}`
  const notificationBody = `${expiringEmployees.length} karyawan Mine Permit-nya mendekati batas expired (${config.reminderDays} hari). Segera tindak lanjuti.`

  for (const recipientEmail of toEmails) {
    try {
      const [notifEvent] = await db
        .insert(notificationEvents)
        .values({
          channel: 'in_app',
          eventType: 'mine_permit_expiring',
          recipient: recipientEmail,
          payloadSnapshot: JSON.stringify({
            title: notificationTitle,
            body: notificationBody,
            url: '/dashboard/hc/employee',
          }),
          deliveryStatus: 'delivered',
          deliveredAt: new Date(),
        })
        .returning({ id: notificationEvents.id })

      if (notifEvent?.id) {
        await db.insert(notificationDeliveries).values({
          notificationEventId: notifEvent.id,
          deliveryChannel: 'in_app',
          recipient: recipientEmail,
          status: 'sent',
          sentAt: new Date(),
        })
      }
    } catch (notifErr) {
      console.error('Failed creating in-app notification bell entry:', notifErr)
    }
  }

  // Update lastSentAt in database
  await db
    .update(minePermitReminderConfig)
    .set({ lastSentAt: new Date() })
    .where(eq(minePermitReminderConfig.siteId, siteId))

  return {
    sent: true,
    siteId,
    siteName: site.name,
    count: expiringEmployees.length,
    toCount: toEmails.length,
    ccCount: ccEmails.length,
    reason: `Berhasil mengirim email rekapitulasi ke ${toEmails.length} penerima To dan ${ccEmails.length} CC.`,
  }
}

export async function runAllMinePermitReminders(): Promise<ReminderResult[]> {
  const activeConfigs = await db
    .select({ siteId: minePermitReminderConfig.siteId })
    .from(minePermitReminderConfig)
    .where(and(eq(minePermitReminderConfig.isActive, true), sql`${minePermitReminderConfig.siteId} IS NOT NULL`))

  const results: ReminderResult[] = []

  for (const cfg of activeConfigs) {
    if (!cfg.siteId) continue
    try {
      const res = await sendSiteMinePermitExpiryReminder(cfg.siteId, false)
      results.push(res)
    } catch (err: any) {
      results.push({
        sent: false,
        skipped: true,
        siteId: cfg.siteId,
        count: 0,
        toCount: 0,
        ccCount: 0,
        reason: err?.message || 'Gagal memproses reminder site.',
      })
    }
  }

  return results
}

// Backward compatibility helper
export async function getMinePermitReminderConfig() {
  const [config] = await db.select().from(minePermitReminderConfig).limit(1)
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

// Backward compatibility helper
export async function sendMinePermitExpiryReminders(daysBefore: number = 30) {
  const results = await runAllMinePermitReminders()
  const sent = results.filter((r) => r.sent).length
  const skipped = results.filter((r) => r.skipped).length
  const errors = results.filter((r) => !r.sent && !r.skipped).length
  return {
    sent,
    skipped,
    errors,
    details: results.map((r) => `${r.siteName || r.siteId}: ${r.reason}`),
  }
}
