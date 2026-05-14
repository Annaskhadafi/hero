import type { Metadata } from 'next'
import { PermissionRequestForm } from '@/components/attendance/permission-request-form'

export const metadata: Metadata = {
  title: 'Izin Attendance | HERO Mobile',
}

export default function MobileAttendancePermissionPage() {
  return <PermissionRequestForm variant="mobile" />
}
