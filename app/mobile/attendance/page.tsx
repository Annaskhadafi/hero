import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getServerSession } from '@/lib/auth-session'
import { db } from '@/db'
import { employees, attendanceRecords } from '@/db/schema/hero'
import { eq, desc } from 'drizzle-orm'
import { FaceAttendanceV2Client } from './face-v2/face-v2-client'

export const metadata: Metadata = {
  title: 'Mobile Attendance | HERO',
  description: 'Mobile biometric attendance check-in for HERO field operations.',
}

export default async function MobileAttendancePage() {
  const session = await getServerSession()
  if (!session?.user?.email) redirect('/mobile/login')

  const empResults = await db
    .select({
      id: employees.id,
      name: employees.name,
      siteId: employees.siteId,
      faceRegisteredAt: employees.faceRegisteredAt,
      faceRarayId: employees.faceRarayId,
      faceRarayRegisteredAt: employees.faceRarayRegisteredAt,
    })
    .from(employees)
    .where(eq(employees.authUserId, session.user.id ?? ''))
    .limit(1)

  if (empResults.length === 0) {
    redirect('/mobile/login')
  }

  const employee = empResults[0]

  const lastRecord = await db
    .select({
      eventType: attendanceRecords.eventType,
      eventTime: attendanceRecords.eventTime,
    })
    .from(attendanceRecords)
    .where(eq(attendanceRecords.employeeId, employee.id))
    .orderBy(desc(attendanceRecords.eventTime))
    .limit(1)

  const lastEventType = lastRecord[0]?.eventType ?? null
  const lastEventTime = lastRecord[0]?.eventTime?.toISOString() ?? null

  const suggestedEventType: 'checked-in' | 'checked-out' =
    lastEventType === 'checked-in' ? 'checked-out' : 'checked-in'

  return (
    <FaceAttendanceV2Client
      employeeId={employee.id}
      employeeName={employee.name}
      siteId={employee.siteId ?? 1}
      faceRarayId={employee.faceRarayId ?? null}
      faceRarayRegisteredAt={
        employee.faceRarayRegisteredAt ? employee.faceRarayRegisteredAt.toISOString() : null
      }
      suggestedEventType={suggestedEventType}
      lastEventType={lastEventType}
      lastEventTime={lastEventTime}
    />
  )
}
