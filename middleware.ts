import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = decodeURIComponent(url.pathname)

  // Normalize spaces (%20 or space) and underscores in common dashboard paths
  let fixedPathname = pathname
    .replace(/scheduling[%20\s_]+timesheet/gi, 'scheduling-timesheet')
    .replace(/izin[%20\s_-]*kerja[%20\s_-]*ptw/gi, 'izin-kerja-ptw')
    .replace(/izin[%20\s_-]+kerja(?!\-ptw)/gi, 'izin-kerja-ptw')
    .replace(/activity[%20\s_]+hub/gi, 'activity-hub')
    .replace(/daily[-_%20\s]*activity/gi, 'activity-hub')
    .replace(/my[%20\s_]+day/gi, 'my-day')
    .replace(/schedule[%20\s_]+v2/gi, 'schedule-v2')
    .replace(/field[%20\s_]+break/gi, 'field-break')

  if (fixedPathname !== pathname) {
    url.pathname = fixedPathname
    return NextResponse.redirect(url)
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
