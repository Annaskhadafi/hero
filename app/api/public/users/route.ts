import { NextResponse } from 'next/server'
import { db } from '@/db'
import { employees, hrEmployees, hrSections, hrSites, sites } from '@/db/schema/hero'
import { eq, or, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    // 1. Fetch from employees (legacy)
    const legacyRows = await db
      .select({
        sn: employees.employeeSn,
        nama: employees.name,
        lokasiSite: sites.name,
        section: employees.section,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .where(
        and(
          eq(employees.isActive, true),
          or(
            eq(employees.section, 'Repair / Retread Operation'),
            eq(employees.section, 'Repair/Retread Operation'),
            eq(employees.section, 'Repair & Retread')
          )
        )
      )

    // 2. Fetch from hrEmployees
    const hrRows = await db
      .select({
        sn: hrEmployees.employeeId,
        nama: hrEmployees.fullName,
        lokasiSite: hrSites.name,
        section: hrSections.name,
      })
      .from(hrEmployees)
      .leftJoin(hrSites, eq(hrEmployees.siteId, hrSites.id))
      .leftJoin(hrSections, eq(hrEmployees.sectionId, hrSections.id))
      .where(
        and(
          eq(hrEmployees.isActive, true),
          or(
            eq(hrSections.name, 'Repair / Retread Operation'),
            eq(hrSections.name, 'Repair/Retread Operation'),
            eq(hrSections.name, 'Repair & Retread')
          )
        )
      )

    // Merge by SN to avoid duplicates, prefer hrEmployees
    const merged = new Map<string, { sn: string; nama: string; lokasiSite: string; section: string }>()

    for (const row of legacyRows) {
      if (row.sn) {
        merged.set(row.sn.trim().toUpperCase(), {
          sn: row.sn,
          nama: row.nama,
          lokasiSite: row.lokasiSite || '',
          section: row.section,
        })
      }
    }

    for (const row of hrRows) {
      if (row.sn) {
        merged.set(row.sn.trim().toUpperCase(), {
          sn: row.sn,
          nama: row.nama,
          lokasiSite: row.lokasiSite || '',
          section: row.section || '',
        })
      }
    }

    const data = Array.from(merged.values())

    return NextResponse.json({
      success: true,
      count: data.length,
      data,
    })
  } catch (error: any) {
    console.error('Error fetching public users:', error)
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Internal Server Error',
      },
      { status: 500 }
    )
  }
}
