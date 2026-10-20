'use server'

import { revalidatePath } from 'next/cache'
import { and, eq, gte, lte, sql } from 'drizzle-orm'
import { db } from '@/db'
import {
  employees as heroEmployees,
  hcLeaveRequests,
  hcLeaveTypes,
  safetyIncidentReports,
  safetyMonthlyManHours,
  safetyPerformanceMetrics,
  safetySiteMonthlySummary,
  sites,
} from '@/db/schema/hero'
import { getCurrentEmployeeAccessRole, getCurrentMenuPermission } from '@/lib/hero-access'

async function checkSafetyEditAccess() {
  const role = await getCurrentEmployeeAccessRole()
  if (role === 'HSE' || role === 'Super Admin') return true
  const perm = await getCurrentMenuPermission('safety_data_management')
  return Boolean(perm.canEdit)
}

async function checkSafetyDeleteAccess() {
  const role = await getCurrentEmployeeAccessRole()
  if (role === 'HSE' || role === 'Super Admin') return true
  const perm = await getCurrentMenuPermission('safety_data_management')
  return Boolean(perm.canDelete)
}

/**
 * Otomatis mengambil data estimasi & real time dari sistem untuk Form Input Lagging Health
 */
export async function getSiteMonthlyHealthAutoFillData(siteId: number, monthStr: string) {
  try {
    // 1. Dapatkan info site
    const siteRows = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1)
    if (!siteRows.length) {
      return { ok: false, error: 'Site tidak ditemukan' }
    }
    const site = siteRows[0]

    // 2. Normalisasi tanggal bulan (YYYY-MM-01)
    const [yearPart, monthPart] = monthStr.split('-')
    const formattedMonth = `${yearPart}-${monthPart.padStart(2, '0')}-01`
    const yearNum = parseInt(yearPart, 10)
    const monthNum = parseInt(monthPart, 10)

    // Hitung awal dan akhir bulan
    const startDate = `${yearPart}-${monthPart.padStart(2, '0')}-01`
    const lastDay = new Date(yearNum, monthNum, 0).getDate()
    const endDate = `${yearPart}-${monthPart.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

    // 3. Ambil data Safety Man Hours dari hero_safety_monthly_man_hours
    const manHoursRows = await db
      .select()
      .from(safetyMonthlyManHours)
      .where(
        and(
          eq(safetyMonthlyManHours.workLocation, site.name),
          eq(safetyMonthlyManHours.month, formattedMonth)
        )
      )
      .limit(1)

    const safetyManHoursVal = manHoursRows.length > 0 ? Number(manHoursRows[0].safetyManHours) : 0

    // 4. Hitung total tenaga kerja aktif di site ini (hero_employees)
    const empCountRows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(heroEmployees)
      .where(and(eq(heroEmployees.siteId, siteId), eq(heroEmployees.isActive, true)))

    const totalManpowerVal = empCountRows[0]?.count || (manHoursRows[0]?.employeeCount ?? 0)

    // 5. Hitung data Cuti Sakit dari hero_hc_leave_requests (leave_type: SAKIT)
    // Ambil seluruh karyawan siteId
    const siteEmployeeRows = await db
      .select({ id: heroEmployees.id })
      .from(heroEmployees)
      .where(eq(heroEmployees.siteId, siteId))

    const siteEmpIds = siteEmployeeRows.map((e) => e.id)

    let sickEmployeesCount = 0
    let lostDaysCount = 0
    let sickLettersCount = 0

    if (siteEmpIds.length > 0) {
      const sickLeaves = await db
        .select({
          id: hcLeaveRequests.id,
          employeeId: hcLeaveRequests.employeeId,
          totalDays: hcLeaveRequests.totalDays,
          attachmentUrl: hcLeaveRequests.attachmentUrl,
          startDate: hcLeaveRequests.startDate,
          endDate: hcLeaveRequests.endDate,
        })
        .from(hcLeaveRequests)
        .innerJoin(hcLeaveTypes, eq(hcLeaveRequests.leaveTypeId, hcLeaveTypes.id))
        .where(
          and(
            eq(hcLeaveTypes.code, 'SAKIT'),
            sql`${hcLeaveRequests.employeeId} = ANY(${siteEmpIds})`,
            sql`${hcLeaveRequests.startDate} <= ${endDate} AND ${hcLeaveRequests.endDate} >= ${startDate}`,
            sql`${hcLeaveRequests.status} NOT IN ('rejected', 'cancelled')`
          )
        )

      const uniqueSickEmpIds = new Set(sickLeaves.map((l) => l.employeeId))
      sickEmployeesCount = uniqueSickEmpIds.size
      lostDaysCount = sickLeaves.reduce((acc, curr) => acc + (curr.totalDays || 1), 0)
      sickLettersCount = sickLeaves.filter((l) => Boolean(l.attachmentUrl && l.attachmentUrl.trim().length > 0)).length
    }

    return {
      ok: true,
      data: {
        safetyManHours: safetyManHoursVal,
        totalManpower: totalManpowerVal,
        sickEmployeesCount,
        lostDaysCount,
        sickLettersCount,
        siteName: site.name,
      },
    }
  } catch (error: any) {
    console.error('Error getSiteMonthlyHealthAutoFillData:', error)
    return { ok: false, error: error?.message || 'Gagal mengambil data sistem' }
  }
}

/**
 * Sinkronisasi data agregasi bulanan (YTD) per site ke hero_safety_performance_metrics
 */
export async function syncSiteMonthlyToPerformanceMetric(siteId: number, yearNum: number) {
  try {
    const siteRows = await db.select().from(sites).where(eq(sites.id, siteId)).limit(1)
    if (!siteRows.length) return { ok: false, error: 'Site tidak ditemukan' }
    const siteName = siteRows[0].name

    const startDate = `${yearNum}-01-01`
    const endDate = `${yearNum}-12-31`

    // 1. Ambil seluruh rangkuman bulanan site ini pada tahun berjalan
    const siteSummaries = await db
      .select()
      .from(safetySiteMonthlySummary)
      .where(
        and(
          eq(safetySiteMonthlySummary.siteId, siteId),
          gte(safetySiteMonthlySummary.month, startDate),
          lte(safetySiteMonthlySummary.month, endDate)
        )
      )

    const totalFatality = siteSummaries.reduce((sum, s) => sum + (s.fatality || 0), 0)
    const totalLti = siteSummaries.reduce((sum, s) => sum + (s.majorInjury || 0), 0)
    const totalPropertyDamage = siteSummaries.reduce((sum, s) => sum + (s.propertyDamage || 0), 0)
    const totalSafeManHours = siteSummaries.reduce(
      (sum, s) => sum + (parseFloat(String(s.safetyManHours || 0)) || 0),
      0
    )

    // Tenaga kerja: ambil nilai totalManpower terbaru di tahun tersebut, atau fallback jumlah karyawan aktif
    let latestManpower = 0
    if (siteSummaries.length > 0) {
      const sorted = [...siteSummaries].sort((a, b) => String(b.month).localeCompare(String(a.month)))
      latestManpower = sorted.find((s) => s.totalManpower > 0)?.totalManpower || sorted[0].totalManpower || 0
    }
    if (latestManpower === 0) {
      const empCount = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(heroEmployees)
        .where(and(eq(heroEmployees.siteId, siteId), eq(heroEmployees.isActive, true)))
      latestManpower = empCount[0]?.count || 0
    }

    // 2. Cek apakah baris metric untuk site ini sudah ada di safetyPerformanceMetrics
    const existingMetric = await db
      .select()
      .from(safetyPerformanceMetrics)
      .where(
        and(
          eq(safetyPerformanceMetrics.year, yearNum),
          eq(safetyPerformanceMetrics.periodLabel, siteName)
        )
      )
      .limit(1)

    if (existingMetric.length > 0) {
      await db
        .update(safetyPerformanceMetrics)
        .set({
          employeeCount: latestManpower,
          safeManHoursUpToYear: totalSafeManHours.toFixed(2),
          fatalityActual: totalFatality.toFixed(2),
          ltiActual: totalLti.toFixed(2),
          propertyDamageActual: totalPropertyDamage.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(safetyPerformanceMetrics.id, existingMetric[0].id))
    } else {
      await db.insert(safetyPerformanceMetrics).values({
        year: yearNum,
        periodLabel: siteName,
        employeeCount: latestManpower,
        safeManHoursUpToYear: totalSafeManHours.toFixed(2),
        fatalityThreshold: '0',
        fatalityActual: totalFatality.toFixed(2),
        ltiThreshold: '0',
        ltiActual: totalLti.toFixed(2),
        propertyDamageThreshold: '0',
        propertyDamageActual: totalPropertyDamage.toFixed(2),
        sourceSheet: 'sync-monthly',
      })
    }

    // 3. Update juga baris agregat seluruh site perusahaan ("All Sites / PT Chitra Paratama")
    await syncCompanyWidePerformanceMetric(yearNum)

    return { ok: true }
  } catch (err: any) {
    console.error('Error in syncSiteMonthlyToPerformanceMetric:', err)
    return { ok: false, error: err?.message || 'Gagal sinkronisasi performa' }
  }
}

/**
 * Update atau insert baris agregasi total perusahaan
 */
export async function syncCompanyWidePerformanceMetric(yearNum: number) {
  try {
    const startDate = `${yearNum}-01-01`
    const endDate = `${yearNum}-12-31`
    const allSummaries = await db
      .select()
      .from(safetySiteMonthlySummary)
      .where(
        and(
          gte(safetySiteMonthlySummary.month, startDate),
          lte(safetySiteMonthlySummary.month, endDate)
        )
      )

    const totalFatality = allSummaries.reduce((sum, s) => sum + (s.fatality || 0), 0)
    const totalLti = allSummaries.reduce((sum, s) => sum + (s.majorInjury || 0), 0)
    const totalPropertyDamage = allSummaries.reduce((sum, s) => sum + (s.propertyDamage || 0), 0)
    const totalSafeManHours = allSummaries.reduce(
      (sum, s) => sum + (parseFloat(String(s.safetyManHours || 0)) || 0),
      0
    )

    // Total manpower: jumlahkan latest manpower per unique site
    const siteLatestMap = new Map<number, number>()
    const sorted = [...allSummaries].sort((a, b) => String(b.month).localeCompare(String(a.month)))
    for (const s of sorted) {
      if (!siteLatestMap.has(s.siteId)) {
        siteLatestMap.set(s.siteId, s.totalManpower || 0)
      }
    }
    const totalCompanyManpower = Array.from(siteLatestMap.values()).reduce((a, b) => a + b, 0)

    const companyLabel = 'All Sites / PT Chitra Paratama'
    const existingCompanyMetric = await db
      .select()
      .from(safetyPerformanceMetrics)
      .where(
        and(
          eq(safetyPerformanceMetrics.year, yearNum),
          eq(safetyPerformanceMetrics.periodLabel, companyLabel)
        )
      )
      .limit(1)

    if (existingCompanyMetric.length > 0) {
      await db
        .update(safetyPerformanceMetrics)
        .set({
          employeeCount: totalCompanyManpower,
          safeManHoursUpToYear: totalSafeManHours.toFixed(2),
          fatalityActual: totalFatality.toFixed(2),
          ltiActual: totalLti.toFixed(2),
          propertyDamageActual: totalPropertyDamage.toFixed(2),
          updatedAt: new Date(),
        })
        .where(eq(safetyPerformanceMetrics.id, existingCompanyMetric[0].id))
    } else {
      await db.insert(safetyPerformanceMetrics).values({
        year: yearNum,
        periodLabel: companyLabel,
        employeeCount: totalCompanyManpower,
        safeManHoursUpToYear: totalSafeManHours.toFixed(2),
        fatalityThreshold: '0',
        fatalityActual: totalFatality.toFixed(2),
        ltiThreshold: '0',
        ltiActual: totalLti.toFixed(2),
        propertyDamageThreshold: '0',
        propertyDamageActual: totalPropertyDamage.toFixed(2),
        sourceSheet: 'sync-monthly-company',
      })
    }
    return { ok: true }
  } catch (err: any) {
    console.error('Error in syncCompanyWidePerformanceMetric:', err)
    return { ok: false, error: err?.message }
  }
}

/**
 * Server Action: Sinkronkan seluruh data historis dari safetySiteMonthlySummary ke safetyPerformanceMetrics
 */
export async function syncAllLaggingToPerformanceAction() {
  try {
    const hasAccess = await checkSafetyEditAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk menyinkronkan data ini' }
    }

    const allSummaries = await db
      .select({
        siteId: safetySiteMonthlySummary.siteId,
        month: safetySiteMonthlySummary.month,
      })
      .from(safetySiteMonthlySummary)

    // Kumpulkan pasangan unik (siteId, year)
    const pairs = new Set<string>()
    for (const s of allSummaries) {
      const year = new Date(s.month).getFullYear()
      if (year && !isNaN(year)) {
        pairs.add(`${s.siteId}:${year}`)
      }
    }

    for (const pair of pairs) {
      const [siteIdStr, yearStr] = pair.split(':')
      await syncSiteMonthlyToPerformanceMetric(parseInt(siteIdStr, 10), parseInt(yearStr, 10))
    }

    revalidatePath('/dashboard/safety/data')
    revalidatePath('/dashboard/safety')
    revalidatePath('/dashboard/hse')
    return { ok: true, message: `Berhasil menyinkronkan data performa untuk ${pairs.size} site-periode` }
  } catch (err: any) {
    console.error('Error in syncAllLaggingToPerformanceAction:', err)
    return { ok: false, error: err?.message || 'Gagal sinkronisasi data performa' }
  }
}

/**
 * Upsert Form Input Lagging K3
 */
export async function upsertLaggingK3Action(formData: FormData) {
  try {
    const hasAccess = await checkSafetyEditAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk mengubah data ini' }
    }

    const siteId = parseInt(formData.get('siteId') as string, 10)
    const monthRaw = (formData.get('month') as string)?.trim() // YYYY-MM or YYYY-MM-DD
    if (!siteId || !monthRaw) {
      return { ok: false, error: 'Site dan Bulan wajib dipilih' }
    }

    const [year, month] = monthRaw.split('-')
    const formattedMonth = `${year}-${month.padStart(2, '0')}-01`
    const yearNum = parseInt(year, 10)

    const nearmiss = Math.max(0, parseInt((formData.get('nearmiss') as string) || '0', 10))
    const propertyDamage = Math.max(0, parseInt((formData.get('propertyDamage') as string) || '0', 10))
    const firstAid = Math.max(0, parseInt((formData.get('firstAid') as string) || '0', 10))
    const medicalTreatment = Math.max(0, parseInt((formData.get('medicalTreatment') as string) || '0', 10))
    const environmental = Math.max(0, parseInt((formData.get('environmental') as string) || '0', 10))
    const majorInjury = Math.max(0, parseInt((formData.get('majorInjury') as string) || '0', 10))
    const fatality = Math.max(0, parseInt((formData.get('fatality') as string) || '0', 10))
    const incidentNotes = (formData.get('incidentNotes') as string)?.trim() || 'Nihil'

    // Periksa apakah baris sudah ada
    const existing = await db
      .select()
      .from(safetySiteMonthlySummary)
      .where(
        and(
          eq(safetySiteMonthlySummary.siteId, siteId),
          eq(safetySiteMonthlySummary.month, formattedMonth)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(safetySiteMonthlySummary)
        .set({
          nearmiss,
          propertyDamage,
          firstAid,
          medicalTreatment,
          environmental,
          majorInjury,
          fatality,
          incidentNotes,
          updatedAt: new Date(),
        })
        .where(eq(safetySiteMonthlySummary.id, existing[0].id))
    } else {
      await db.insert(safetySiteMonthlySummary).values({
        siteId,
        month: formattedMonth,
        nearmiss,
        propertyDamage,
        firstAid,
        medicalTreatment,
        environmental,
        majorInjury,
        fatality,
        incidentNotes,
      })
    }

    // Sinkronisasi otomatis ke Performance
    await syncSiteMonthlyToPerformanceMetric(siteId, yearNum)

    revalidatePath('/dashboard/safety/data')
    revalidatePath('/dashboard/safety')
    revalidatePath('/dashboard/hse')
    return { ok: true, message: 'Data Lagging K3 berhasil disimpan dan disinkronkan ke HSE Performance' }
  } catch (error: any) {
    console.error('Error upsertLaggingK3Action:', error)
    return { ok: false, error: error?.message || 'Gagal menyimpan data Lagging K3' }
  }
}

/**
 * Upsert Form Input Lagging Health
 */
export async function upsertLaggingHealthAction(formData: FormData) {
  try {
    const hasAccess = await checkSafetyEditAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk mengubah data ini' }
    }

    const siteId = parseInt(formData.get('siteId') as string, 10)
    const monthRaw = (formData.get('month') as string)?.trim()
    if (!siteId || !monthRaw) {
      return { ok: false, error: 'Site dan Bulan wajib dipilih' }
    }

    const [year, month] = monthRaw.split('-')
    const formattedMonth = `${year}-${month.padStart(2, '0')}-01`
    const yearNum = parseInt(year, 10)

    const safetyManHoursStr = (formData.get('safetyManHours') as string) || '0'
    const safetyManHours = parseFloat(safetyManHoursStr.replace(/,/g, '')) || 0
    const totalManpower = Math.max(0, parseInt((formData.get('totalManpower') as string) || '0', 10))
    const sickEmployeesCount = Math.max(0, parseInt((formData.get('sickEmployeesCount') as string) || '0', 10))
    const lostDaysCount = Math.max(0, parseInt((formData.get('lostDaysCount') as string) || '0', 10))
    const sickLettersCount = Math.max(0, parseInt((formData.get('sickLettersCount') as string) || '0', 10))
    const occupationalDiseasesCount = Math.max(
      0,
      parseInt((formData.get('occupationalDiseasesCount') as string) || '0', 10)
    )

    const existing = await db
      .select()
      .from(safetySiteMonthlySummary)
      .where(
        and(
          eq(safetySiteMonthlySummary.siteId, siteId),
          eq(safetySiteMonthlySummary.month, formattedMonth)
        )
      )
      .limit(1)

    if (existing.length > 0) {
      await db
        .update(safetySiteMonthlySummary)
        .set({
          safetyManHours: safetyManHours.toString(),
          totalManpower,
          sickEmployeesCount,
          lostDaysCount,
          sickLettersCount,
          occupationalDiseasesCount,
          updatedAt: new Date(),
        })
        .where(eq(safetySiteMonthlySummary.id, existing[0].id))
    } else {
      await db.insert(safetySiteMonthlySummary).values({
        siteId,
        month: formattedMonth,
        safetyManHours: safetyManHours.toString(),
        totalManpower,
        sickEmployeesCount,
        lostDaysCount,
        sickLettersCount,
        occupationalDiseasesCount,
      })
    }

    // Sinkronisasi otomatis ke Performance
    await syncSiteMonthlyToPerformanceMetric(siteId, yearNum)

    revalidatePath('/dashboard/safety/data')
    revalidatePath('/dashboard/safety')
    revalidatePath('/dashboard/hse')
    return { ok: true, message: 'Data Lagging Health berhasil disimpan dan disinkronkan ke HSE Performance' }
  } catch (error: any) {
    console.error('Error upsertLaggingHealthAction:', error)
    return { ok: false, error: error?.message || 'Gagal menyimpan data Lagging Health' }
  }
}

/**
 * Delete record summary per site & bulan
 */
export async function deleteSiteMonthlySummaryAction(id: number) {
  try {
    const hasAccess = await checkSafetyDeleteAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk menghapus data ini' }
    }

    const row = await db
      .select()
      .from(safetySiteMonthlySummary)
      .where(eq(safetySiteMonthlySummary.id, id))
      .limit(1)

    await db.delete(safetySiteMonthlySummary).where(eq(safetySiteMonthlySummary.id, id))

    if (row.length > 0) {
      const yearNum = new Date(row[0].month).getFullYear()
      if (yearNum && !isNaN(yearNum)) {
        await syncSiteMonthlyToPerformanceMetric(row[0].siteId, yearNum)
      }
    }

    revalidatePath('/dashboard/safety/data')
    revalidatePath('/dashboard/safety')
    revalidatePath('/dashboard/hse')
    return { ok: true, message: 'Data berhasil dihapus dan performa disinkronkan ulang' }
  } catch (error: any) {
    console.error('Error deleteSiteMonthlySummaryAction:', error)
    return { ok: false, error: error?.message || 'Gagal menghapus data' }
  }
}

const SITE_GEO_COORDINATES_PRESET: Record<string, { lat: string; lng: string }> = {
  'PKA Musi Rawas': { lat: '-3.2000', lng: '103.0500' },
  'CDE - Bengkulu': { lat: '-3.4500', lng: '102.5200' },
  'Sebamban': { lat: '-3.6000', lng: '115.6300' },
  'Balikpapan': { lat: '-1.179166', lng: '116.853649' },
  'Makassar': { lat: '-5.1477', lng: '119.4327' },
  'PPA TJ-Enim': { lat: '-3.7380', lng: '103.7840' },
  'PT SMJ - Berau': { lat: '2.1550', lng: '117.4950' },
  'Palembang': { lat: '-2.9761', lng: '104.7754' },
  'MTN - ME': { lat: '-3.7100', lng: '103.7500' },
  'Pekanbaru': { lat: '0.5071', lng: '101.4478' },
  'Petrosea SDA': { lat: '-3.3500', lng: '127.1000' },
  'CK MIFA': { lat: '4.1800', lng: '96.1800' },
  'BSI - Banyuwangi': { lat: '-8.6250', lng: '114.0500' },
  'CK MHU': { lat: '-0.674612', lng: '116.874275' },
  'Tj. Redeb - Berau': { lat: '2.1600', lng: '117.4800' },
  'Vale - Sorowako': { lat: '-2.5323', lng: '121.3533' },
  'CK BIB': { lat: '-3.6128', lng: '115.6022' },
  'Tj. Adaro': { lat: '-2.1812', lng: '115.5186' },
  'CK BMB': { lat: '-3.0033', lng: '115.1583' },
  'Jakarta': { lat: '-6.2088', lng: '106.8456' },
  'MTN - Berau': { lat: '2.1400', lng: '117.5100' },
  'TU Gresik': { lat: '-7.1566', lng: '112.6555' },
  'CK KIM': { lat: '-1.411259', lng: '101.712370' },
  'Madhani Talatah - ME': { lat: '2.1300', lng: '117.4700' },
  'AMM Mifa Hauling': { lat: '4.211650', lng: '96.246285' },
  'TU Batu Hijau': { lat: '-8.9667', lng: '116.8667' },
  'Sangatta KABO': { lat: '0.4930', lng: '117.5890' },
  'CK NCN': { lat: '4.1500', lng: '96.1600' },
  'PPA BIB': { lat: '-3.6200', lng: '115.6100' },
  'KPUC - Malinau': { lat: '3.5833', lng: '116.6333' },
  'Balikpapan External': { lat: '-1.2100', lng: '116.8900' },
  'Sangatta KPC': { lat: '0.5200', lng: '117.5500' },
  'BUMA Tanjung': { lat: '-2.1900', lng: '115.5300' },
  'AMM Tabang': { lat: '0.5500', lng: '115.9800' },
}

export async function updateSiteCoordinatesAction(siteId: number, lat: string, lng: string) {
  try {
    const hasAccess = await checkSafetyEditAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk mengubah lokasi site' }
    }

    await db
      .update(sites)
      .set({
        geoLatitude: lat.trim(),
        geoLongitude: lng.trim(),
      })
      .where(eq(sites.id, siteId))

    revalidatePath('/dashboard/safety/data')
    return { ok: true, message: 'Koordinat site berhasil disimpan' }
  } catch (error: any) {
    console.error('Error updateSiteCoordinatesAction:', error)
    return { ok: false, error: error?.message || 'Gagal menyimpan koordinat' }
  }
}

export async function resetSiteCoordinatesToDefaultAction() {
  try {
    const hasAccess = await checkSafetyEditAccess()
    if (!hasAccess) {
      return { ok: false, error: 'Anda tidak memiliki hak akses untuk mengatur lokasi site' }
    }

    const allSites = await db.select().from(sites)
    let count = 0
    for (const s of allSites) {
      const preset = SITE_GEO_COORDINATES_PRESET[s.name]
      if (preset) {
        await db
          .update(sites)
          .set({
            geoLatitude: preset.lat,
            geoLongitude: preset.lng,
          })
          .where(eq(sites.id, s.id))
        count++
      }
    }

    revalidatePath('/dashboard/safety/data')
    return { ok: true, message: `Berhasil mengatur koordinat default untuk ${count} site` }
  } catch (error: any) {
    console.error('Error resetSiteCoordinatesToDefaultAction:', error)
    return { ok: false, error: error?.message || 'Gagal mengatur koordinat' }
  }
}

