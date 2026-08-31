import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { getAttendancePageData } from '@/app/actions/attendance'
import { FaceAttendanceV2Client } from './face-v2/face-v2-client'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Mobile Attendance | HERO',
  description: 'Mobile biometric attendance check-in for HERO field operations.',
}

export default async function MobileAttendancePage() {
  const data = await getAttendancePageData()

  if (!data?.employee) {
    redirect('/mobile/login')
  }

  const logs = data.logs || []
  const lastRecord = logs[0]
  const lastEventType = lastRecord?.eventType ?? null
  const lastEventTime = lastRecord?.eventTime ? new Date(lastRecord.eventTime).toISOString() : null

  const suggestedEventType: 'checked-in' | 'checked-out' =
    lastEventType === 'checked-in' ? 'checked-out' : 'checked-in'

  return (
    <FaceAttendanceV2Client
      employeeId={data.employee.id}
      employeeName={data.employee.name}
      employeeSn={(data.employee as any).employeeSn ?? String(data.employee.id)}
      siteId={data.employee.siteId ?? 1}
      siteName={data.employee.siteName ?? 'Default Site'}
      faceRarayId={(data.employee as any).faceRarayId ?? null}
      faceRarayRegisteredAt={
        (data.employee as any).faceRarayRegisteredAt
          ? new Date((data.employee as any).faceRarayRegisteredAt).toISOString()
          : null
      }
      suggestedEventType={suggestedEventType}
      lastEventType={lastEventType}
      lastEventTime={lastEventTime}
      shiftOptions={data.shiftOptions || []}
      todayLogs={logs}
    />
  )
}
