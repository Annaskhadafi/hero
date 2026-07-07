import { NextResponse } from 'next/server'
import { db } from '@/db'
import { employees } from '@/db/schema/hero'
import { and, gte, lte, eq } from 'drizzle-orm'

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url)
    const days = parseInt(searchParams.get('days') || '30', 10)
    
    const today = new Date()
    const targetDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000)

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

    return NextResponse.json({ count: expiring.length, samples: expiring.slice(0, 5) })
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch preview' }, { status: 500 })
  }
}
