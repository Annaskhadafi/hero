import { getAttendancePermissionApproverCandidates } from '@/app/actions/attendance'
import { PermissionRequestForm } from '@/components/attendance/permission-request-form'

export default async function SchedulingTimesheetPermissionPage() {
  const approverData = await getAttendancePermissionApproverCandidates()
  return <PermissionRequestForm variant="desktop" initialApproverData={approverData} />
}
