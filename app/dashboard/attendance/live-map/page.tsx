import { getLiveAttendanceMapData } from '@/app/actions/attendance'
import { LiveAttendanceMap } from '@/components/attendance/live-attendance-map'

export default async function LiveAttendanceMapPage() {
  const data = await getLiveAttendanceMapData()

  return <LiveAttendanceMap initialData={data} />
}
