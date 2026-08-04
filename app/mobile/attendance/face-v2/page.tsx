import { redirect } from 'next/navigation'
import { getAttendancePageData } from '@/app/actions/attendance'
import { FaceAttendanceV2Client } from './face-v2-client'

export const dynamic = 'force-dynamic'

export default async function FaceAttendanceV2Page() {
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
      employeeSn={data.employee.employeeSn ?? String(data.employee.id)}
      siteId={data.employee.siteId ?? 1}
      siteName={data.employee.siteName ?? 'Default Site'}
      faceRarayId={data.employee.faceRarayId ?? null}
      faceRarayRegisteredAt={
        data.employee.faceRarayRegisteredAt
          ? new Date(data.employee.faceRarayRegisteredAt).toISOString()
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
