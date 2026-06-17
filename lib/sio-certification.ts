import { and, asc, desc, eq, lte, sql } from 'drizzle-orm'
import { z } from 'zod'
import Fuse from 'fuse.js'

import { db } from '@/db'
import { employees, pointEvents, sioCertifications } from '@/db/schema/hero'
import { ensureHeroSeedData } from '@/lib/hero-admin'
import { revalidatePath } from 'next/cache'

const APP_TIME_ZONE = 'Asia/Makassar'

function todayDate() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: APP_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  const y = parts.find((p) => p.type === 'year')?.value ?? '1970'
  const m = parts.find((p) => p.type === 'month')?.value ?? '01'
  const d = parts.find((p) => p.type === 'day')?.value ?? '01'
  return new Date(`${y}-${m}-${d}T00:00:00+08:00`)
}

export function inferSioStatus(expiryDate: Date | string | null): string {
  if (!expiryDate) return 'active'
  const expiry = typeof expiryDate === 'string' ? new Date(expiryDate) : expiryDate
  const days = Math.ceil((expiry.getTime() - todayDate().getTime()) / (24 * 60 * 60 * 1000))
  if (days <= 0) return 'expired'
  if (days <= 30) return 'expiring_soon'
  return 'active'
}

function serializeDate(d: Date | string | null | undefined): string | null {
  if (!d) return null
  if (typeof d === 'string') return d
  return d.toISOString().split('T')[0]
}

function normalizeKey(value: string) {
  let s = value.trim().toLowerCase().replace(/[^a-z0-9\s]/g, '').replace(/\s+/g, ' ')
  const words = s.split(' ')
  if (words.length > 0) {
    const first = words[0]
    if (['m', 'muhammad', 'mohammad', 'muhamad', 'mochamad'].includes(first)) {
      words[0] = 'm'
    }
    s = words.join(' ')
  }
  return s
}

export const manageSioCertSchema = z.object({
  intent: z.enum(['create', 'update', 'update-status', 'delete']),
  id: z.string().optional(),
  employeeId: z.coerce.number().optional(),
  certType: z.string().optional(),
  certNumber: z.string().optional(),
  certName: z.string().optional(),
  issuingBody: z.string().optional(),
  certDate: z.string().optional(),
  expiryDate: z.string().optional(),
  status: z.string().optional(),
  notes: z.string().optional(),
  awardPoints: z.coerce.boolean().optional(),
})

export type AdminMutationState = { status: 'success' | 'error'; message: string }

export async function manageSioCertAction(
  formData: FormData
): Promise<AdminMutationState> {
  try {
    const payload = manageSioCertSchema.parse(Object.fromEntries(formData))
    await ensureHeroSeedData()

    if (payload.intent === 'create') {
      if (!payload.employeeId || !payload.certType || !payload.certName) {
        return { status: 'error', message: 'Karyawan, tipe sertifikat, dan nama wajib diisi.' }
      }
      const status = payload.status || inferSioStatus(payload.expiryDate ?? null)
      const [cert] = await db
        .insert(sioCertifications)
        .values({
          employeeId: payload.employeeId,
          certType: payload.certType,
          certNumber: payload.certNumber ?? null,
          certName: payload.certName,
          issuingBody: payload.issuingBody ?? null,
          certDate: payload.certDate ? new Date(payload.certDate) : null,
          expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
          status,
          notes: payload.notes ?? null,
          lastSyncFrom: 'manual',
        })
        .returning({ id: sioCertifications.id  })

      if (payload.awardPoints) {
        const pts = payload.certType === 'SIO' ? 50 : 25
        await db.insert(pointEvents).values({
          employeeId: payload.employeeId,
          transactionType: 'reward',
          sourceType: 'sio_certification',
          sourceId: cert[0].id,
          category: 'certification',
          label: `Sertifikasi ${payload.certName} — ${payload.certType}`,
          points: pts,
        })
        await db
          .update(employees)
          .set({ totalPoints: sql`${employees.totalPoints} + ${pts}` })
          .where(eq(employees.id, payload.employeeId))
      }

      revalidatePaths()
      return { status: 'success', message: 'Sertifikasi SIO berhasil ditambahkan.' }
    }

    const id = Number(payload.id)
    if (!id) return { status: 'error', message: 'ID tidak valid.' }

    if (payload.intent === 'update-status') {
      await db
        .update(sioCertifications)
        .set({ status: payload.status })
        .where(eq(sioCertifications.id, id))
      revalidatePaths()
      return { status: 'success', message: 'Status sertifikasi diperbarui.' }
    }

    if (payload.intent === 'update') {
      if (!payload.employeeId || !payload.certType || !payload.certName) {
        return { status: 'error', message: 'Karyawan, tipe sertifikat, dan nama wajib diisi.' }
      }
      const status = payload.status || inferSioStatus(payload.expiryDate ?? null)
      await db
        .update(sioCertifications)
        .set({
          employeeId: payload.employeeId,
          certType: payload.certType,
          certNumber: payload.certNumber ?? null,
          certName: payload.certName,
          issuingBody: payload.issuingBody ?? null,
          certDate: payload.certDate ? new Date(payload.certDate) : null,
          expiryDate: payload.expiryDate ? new Date(payload.expiryDate) : null,
          status,
          notes: payload.notes ?? null,
        })
        .where(eq(sioCertifications.id, id))
      revalidatePaths()
      return { status: 'success', message: 'Sertifikasi SIO diperbarui.' }
    }

    if (payload.intent === 'delete') {
      await db.delete(sioCertifications).where(eq(sioCertifications.id, id))
      revalidatePaths()
      return { status: 'success', message: 'Sertifikasi SIO dihapus.' }
    }

    return { status: 'error', message: 'Intent tidak dikenal.' }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Gagal memproses sertifikasi SIO.',
    }
  }
}

function revalidatePaths() {
  revalidatePath('/dashboard/training-records')
  revalidatePath('/dashboard')
  revalidatePath('/dashboard/analytics')
}

export interface SioCertRow {
  id: number
  employeeId: number
  employeeName: string | null
  employeeSn: string | null
  role: string | null
  department: string | null
  section: string | null
  certType: string
  certNumber: string | null
  certName: string
  issuingBody: string | null
  certDate: Date | string | null
  expiryDate: Date | string | null
  status: string
  notes: string | null
  lastSyncFrom: string | null
}

export interface EmployeeOption {
  id: number
  name: string
  employeeSn: string | null
  department: string | null
  section: string | null
}

export interface DashboardAggregate {
  totalRecords: number
  activeCount: number
  expiringCount: number
  expiredCount: number
  certTypeDistribution: { type: string; count: number }[]
  departmentCoverage: { name: string; count: number; employees: number }[]
  expiringSoonList: { employeeName: string; certName: string; certType: string; daysLeft: number }[]
  expiredList: { employeeName: string; certName: string; certType: string; daysOverdue: number }[]
}

export function computeAggregates(
  rows: SioCertRow[],
  referenceDate: Date
): DashboardAggregate {
  const active: SioCertRow[] = []
  const expiring: SioCertRow[] = []
  const expired: SioCertRow[] = []

  for (const r of rows) {
    const days = r.expiryDate
      ? Math.ceil(
          (new Date(r.expiryDate).getTime() - referenceDate.getTime()) /
            (24 * 60 * 60 * 1000)
        )
      : null
    if (days === null || days > 30) active.push(r)
    else if (days >= 0) expiring.push(r)
    else expired.push(r)
  }

  const typeMap: Record<string, number> = {}
  for (const r of rows) {
    typeMap[r.certType] = (typeMap[r.certType] || 0) + 1
  }
  const certTypeDistribution = Object.entries(typeMap)
    .map(([type, count]) => ({ type, count }))
    .sort((a, b) => b.count - a.count)

  const deptMap: Record<string, { count: number; employees: Set<number> }> = {}
  for (const r of rows) {
    const dept = r.department || 'Lainnya'
    if (!deptMap[dept]) deptMap[dept] = { count: 0, employees: new Set() }
    deptMap[dept].count++
    deptMap[dept].employees.add(r.employeeId)
  }
  const departmentCoverage = Object.entries(deptMap)
    .map(([name, d]) => ({ name, count: d.count, employees: d.employees.size }))
    .sort((a, b) => b.count - a.count)

  const expiringSoonList = expiring.map((r) => ({
    employeeName: r.employeeName || '',
    certName: r.certName,
    certType: r.certType,
    daysLeft: Math.ceil(
      (new Date(r.expiryDate!).getTime() - referenceDate.getTime()) /
        (24 * 60 * 60 * 1000)
    ),
  }))

  const expiredList = expired.map((r) => ({
    employeeName: r.employeeName || '',
    certName: r.certName,
    certType: r.certType,
    daysOverdue: Math.abs(
      Math.ceil(
        (new Date(r.expiryDate!).getTime() - referenceDate.getTime()) /
          (24 * 60 * 60 * 1000)
      )
    ),
  }))

  return {
    totalRecords: rows.length,
    activeCount: active.length,
    expiringCount: expiring.length,
    expiredCount: expired.length,
    certTypeDistribution,
    departmentCoverage,
    expiringSoonList,
    expiredList,
  }
}

export interface SioImportResult {
  status: 'success' | 'error'
  message: string
  importedCount: number
  updatedCount: number
  skippedCount: number
}

export async function importSioCertAction(
  _previousState: SioImportResult | null,
  formData: FormData
): Promise<SioImportResult> {
  try {
    await ensureHeroSeedData()
    const rawCsv = `${formData.get('rawCsv') ?? ''}`.trim()
    if (!rawCsv) {
      return { status: 'error', message: 'Data CSV kosong.', importedCount: 0, updatedCount: 0, skippedCount: 0 }
    }

    const { records } = parseSioCsv(rawCsv)
    if (records.length === 0) {
      return { status: 'error', message: 'Tidak ada record yang bisa diimpor.', importedCount: 0, updatedCount: 0, skippedCount: 0 }
    }

    const employeeRows = await db
      .select({ id: employees.id, name: employees.name, email: employees.email, employeeSn: employees.employeeSn })
      .from(employees)
      .where(eq(employees.isActive, true))

    const existingRows = await db
      .select({ id: sioCertifications.id, employeeId: sioCertifications.employeeId, certType: sioCertifications.certType, certName: sioCertifications.certName })
      .from(sioCertifications)

    const fuse = new Fuse(
      employeeRows.map((e) => ({ ...e, normalizedName: normalizeKey(e.name) })),
      { keys: ['normalizedName'], threshold: 0.35, includeScore: true }
    )
    const employeeBySn = new Map(employeeRows.filter((e) => e.employeeSn).map((e) => [normalizeKey(e.employeeSn), e]))
    const employeeByEmail = new Map(employeeRows.filter((e) => e.email).map((e) => [normalizeKey(e.email), e]))
    const employeesByName = employeeRows.reduce<Map<string, typeof employeeRows>>((m, e) => {
      const k = normalizeKey(e.name)
      ;(m.get(k) ?? m.set(k, []).get(k)!).push(e)
      return m
    }, new Map())

    const existingByKey = new Map(
      existingRows.map((r) => [`${r.employeeId}:${normalizeKey(r.certType)}:${normalizeKey(r.certName)}`, r])
    )

    let importedCount = 0
    let updatedCount = 0
    let skippedCount = 0

    for (const row of records) {
      const sn = normalizeKey(row.employeeSn || '')
      const name = row.employeeName ? normalizeKey(row.employeeName) : ''
      const email = row.email ? normalizeKey(row.email) : ''
      const certType = (row.certType || 'SIO').toUpperCase()
      const certName = (row.certName || '').trim()
      if (!certName) { skippedCount++; continue }

      let employee = employeeBySn.get(sn) ?? employeeByEmail.get(email) ?? undefined
      if (!employee && name) {
        const candidates = employeesByName.get(name)
        if (candidates?.length === 1) employee = candidates[0]
        else {
          const results = fuse.search(name)
          if (results.length > 0 && (results[0].score ?? 1) <= 0.35) employee = results[0].item
        }
      }
      if (!employee) { skippedCount++; continue }

      const certDate = row.certDate ? new Date(row.certDate) : null
      const expiryDate = row.expiryDate ? new Date(row.expiryDate) : null
      const status = row.status || inferSioStatus(expiryDate)
      const certNumber = (row.certNumber || '').trim() || null

      const key = `${employee.id}:${normalizeKey(certType)}:${normalizeKey(certName)}`
      const existing = existingByKey.get(key)

      if (existing) {
        await db
          .update(sioCertifications)
          .set({ certNumber, certDate, expiryDate, status, issuingBody: row.issuingBody || null, lastSyncFrom: 'excel' })
          .where(eq(sioCertifications.id, existing.id))
        updatedCount++
      } else {
        await db.insert(sioCertifications).values({
          employeeId: employee.id, certType, certNumber, certName, issuingBody: row.issuingBody || null,
          certDate, expiryDate, status, lastSyncFrom: 'excel',
        })
        importedCount++
      }
    }

    revalidatePath('/dashboard/training-records')
    revalidatePath('/dashboard')
    return { status: 'success', message: `Import selesai. ${importedCount} baru, ${updatedCount} update, ${skippedCount} skip.`, importedCount, updatedCount, skippedCount }
  } catch (error) {
    return { status: 'error', message: error instanceof Error ? error.message : 'Gagal import.', importedCount: 0, updatedCount: 0, skippedCount: 0 }
  }
}

export function parseSioCsv(rawCsv: string) {
  const lines = rawCsv.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
  if (lines.length < 2) return { headers: [], records: [] as any[] }

  const h = lines[0].split(',').map((c) => c.trim().toLowerCase())
  const idx = (name: string) => h.findIndex((c) => c.includes(name))

  const ni = idx('name') ?? -1
  const si = idx('sn') ?? idx('employee')
  const ci = idx('jenis') ?? idx('cert')
  const cti = idx('type') ?? idx('tipe')
  const cni = idx('number') ?? idx('nomor')
  const ibi = idx('note') ?? idx('body') ?? idx('penerbit')
  const cdi = idx('tanggal') ?? idx('cert_date') ?? idx('date')
  const edi = idx('masa') ?? idx('expir') ?? idx('berlaku')

  const records = lines.slice(1).map((line) => {
    const cols = line.split(',').map((c) => c.trim())
    return {
      employeeName: ni >= 0 ? cols[ni] : '',
      employeeSn: si >= 0 ? cols[si] : '',
      certType: cti >= 0 ? cols[cti] : (ci >= 0 ? 'SIO' : 'SIO'),
      certName: ci >= 0 ? cols[ci] : '',
      certNumber: cni >= 0 ? cols[cni] : '',
      issuingBody: ibi >= 0 ? cols[ibi] : '',
      certDate: cdi >= 0 ? parseExcelSerialOrDate(cols[cdi]) : null,
      expiryDate: edi >= 0 ? parseExcelSerialOrDate(cols[edi]) : null,
      status: '',
    }
  })

  return { headers: h, records }
}

function parseExcelSerialOrDate(value: string): string | null {
  if (!value || value === '-' || value === '') return null
  const num = Number(value)
  if (!isNaN(num) && num > 40000 && num < 60000) {
    const d = new Date((num - 25569) * 86400 * 1000)
    return d.toISOString().split('T')[0]
  }
  const d = new Date(value)
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0]
  return null
}
