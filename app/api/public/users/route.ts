import { NextResponse } from 'next/server'
import { db } from '@/db'
import { employees, masterSections, sites } from '@/db/schema/hero'
import { eq, or, and } from 'drizzle-orm'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const data = await db
      .select({
        sn: employees.employeeSn,
        nama: employees.name,
        lokasi: sites.name,
        section: masterSections.name,
      })
      .from(employees)
      .leftJoin(sites, eq(employees.siteId, sites.id))
      .leftJoin(masterSections, eq(employees.sectionId, masterSections.id))
      .where(
        and(
          eq(employees.isActive, true),
          or(
            eq(masterSections.name, 'Repair / Retread Operation'),
            eq(masterSections.name, 'Repair/Retread Operation'),
            eq(masterSections.name, 'Repair & Retread')
          )
        )
      )

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
