import {
  getLiveAttendanceLocationSettings,
  getLiveAttendanceMapData,
} from '@/app/actions/attendance'
import { LiveAttendanceMap } from '@/components/attendance/live-attendance-map'

export default async function LiveAttendanceMapPage() {
  const [data, locationSettings] = await Promise.all([
    getLiveAttendanceMapData(),
    getLiveAttendanceLocationSettings(),
  ])

  return <LiveAttendanceMap initialData={data} initialLocationSettings={locationSettings} />
}
