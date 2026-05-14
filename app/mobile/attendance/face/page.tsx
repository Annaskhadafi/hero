import type { Metadata } from 'next'
import { redirect } from 'next/navigation'

import { getAttendancePageData } from '@/app/actions/attendance'

import { FaceAttendanceClientPage } from './face-attendance-client'

export const metadata: Metadata = {
  title: 'Absensi Wajah | HERO',
  description: 'Face recognition attendance for HERO mobile.',
}

export default async function FaceAttendancePage() {
  const data = await getAttendancePageData()

  if (!data.employee) {
    redirect('/mobile/attendance')
  }

  return (
    <FaceAttendanceClientPage
      employeeId={data.employee.id}
      siteId={data.employee.siteId}
      employeeName={data.employee.name}
      faceRegisteredAt={
        data.employee.faceRegisteredAt?.toISOString?.() ??
        (data.employee.faceRegisteredAt as string | null)
      }
    />
  )
}
