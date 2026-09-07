import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = decodeURIComponent(url.pathname)

  // Normalize spaces (%20 or space) and underscores in common dashboard paths
  if (
    pathname.includes('scheduling timesheet') ||
    pathname.includes('scheduling%20timesheet') ||
    pathname.includes('scheduling_timesheet') ||
    pathname.includes('izin-kerja ptw') ||
    pathname.includes('izin-kerja%20ptw') ||
    pathname.includes('izin_kerja_ptw') ||
    pathname.includes('schedule_v2') ||
    pathname.includes('field_break')
  ) {
    const fixedPathname = pathname
      .replace(/scheduling[%20\s_]+timesheet/g, 'scheduling-timesheet')
      .replace(/izin[-_%\s20]*kerja[%20\s_]*ptw/g, 'izin-kerja-ptw')
      .replace(/schedule_v2/g, 'schedule-v2')
      .replace(/field_break/g, 'field-break')

    url.pathname = fixedPathname
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
}
