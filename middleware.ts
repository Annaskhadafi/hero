import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = decodeURIComponent(url.pathname)

  // Normalize spaces (%20 or space) and underscores in common dashboard paths
  let fixedPathname = pathname
  if (
    pathname.includes('scheduling timesheet') ||
    pathname.includes('scheduling%20timesheet') ||
    pathname.includes('scheduling_timesheet') ||
    pathname.includes('izin-kerja ptw') ||
    pathname.includes('izin-kerja%20ptw') ||
    pathname.includes('izin_kerja_ptw') ||
    pathname.includes('schedule_v2') ||
    pathname.includes('schedule v2') ||
    pathname.includes('schedule%20v2') ||
    pathname.includes('field_break') ||
    pathname.includes('field break') ||
    pathname.includes('field%20break') ||
    pathname.includes('activity hub') ||
    pathname.includes('activity%20hub') ||
    pathname.includes('activity_hub') ||
    pathname.includes('my day') ||
    pathname.includes('my%20day') ||
    pathname.includes('my_day') ||
    pathname.includes('daily activity') ||
    pathname.includes('daily%20activity') ||
    pathname.includes('daily_activity') ||
    pathname.includes('daily-activity')
  ) {
    fixedPathname = pathname
      .replace(/scheduling[%20\s_]+timesheet/gi, 'scheduling-timesheet')
      .replace(/izin[-_%\s20]*kerja[%20\s_]*ptw/gi, 'izin-kerja-ptw')
      .replace(/activity[%20\s_]+hub/gi, 'activity-hub')
      .replace(/daily[-_%20\s]*activity/gi, 'activity-hub')
      .replace(/my[%20\s_]+day/gi, 'my-day')
      .replace(/schedule_v2/gi, 'schedule-v2')
      .replace(/schedule[%20\s]+v2/gi, 'schedule-v2')
      .replace(/field_break/gi, 'field-break')
      .replace(/field[%20\s]+break/gi, 'field-break')

    if (fixedPathname !== pathname) {
      url.pathname = fixedPathname
      return NextResponse.redirect(url)
    }
  }

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-hero-dashboard-path', `${pathname}${url.search}`)
  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
