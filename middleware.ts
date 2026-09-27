import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { isMaestroHost } from '@/lib/maestro-config'

const MAESTRO_SESSION_COOKIE = 'maestro_session_token'

export function middleware(request: NextRequest) {
  const url = request.nextUrl.clone()
  const pathname = decodeURIComponent(url.pathname)

  // Normalize spaces (%20 or space) and underscores in common dashboard paths
  let fixedPathname = pathname
    .replace(/scheduling[%20\s_]+timesheet/gi, 'scheduling-timesheet')
    .replace(/izin[%20\s_-]*kerja[%20\s_-]*ptw/gi, 'izin-kerja-ptw')
    .replace(/izin[%20\s_-]+kerja(?!\-ptw)/gi, 'izin-kerja-ptw')
    .replace(/activity[%20\s_]+hub/gi, 'activity-hub')
    .replace(/daily[%20\s_]+activity/gi, 'daily-activity')
    .replace(/my[%20\s_]+day/gi, 'my-day')
    .replace(/schedule[%20\s_]+v2/gi, 'schedule-v2')
    .replace(/field[%20\s_]+break/gi, 'field-break')

  if (fixedPathname !== pathname) {
    url.pathname = fixedPathname
    return NextResponse.redirect(url)
  }

  // Bypass static files, service workers, manifests, and icons
  if (
    pathname === '/sw.js' ||
    pathname.startsWith('/sw.') ||
    pathname === '/robots.txt' ||
    pathname === '/manifest.webmanifest' ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.ico')
  ) {
    return NextResponse.next()
  }

  const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
  const requestHost = forwardedHost || request.headers.get('host') || url.host
  const isMaestro = isMaestroHost(requestHost)

  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-hero-dashboard-path', `${pathname}${url.search}`)
  requestHeaders.set('x-maestro-request', isMaestro ? '1' : '0')

  // MAESTRO PORTAL ROUTING
  if (isMaestro) {
    const hasSession = Boolean(request.cookies.get(MAESTRO_SESSION_COOKIE)?.value)

    // Redirect /sign-in to /login on Maestro domain
    if (pathname === '/sign-in') {
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    // If visiting login while already authenticated -> redirect to dashboard
    if ((pathname === '/login' || pathname === '/maestro/login') && hasSession) {
      url.pathname = '/dashboard'
      return NextResponse.redirect(url)
    }

    // Root path handling
    if (pathname === '/') {
      if (hasSession) {
        url.pathname = '/maestro/dashboard'
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      } else {
        url.pathname = '/maestro/login'
        return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
      }
    }

    // If requesting login page
    if (pathname === '/login') {
      url.pathname = '/maestro/login'
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }

    // If requesting protected pages without session
    if (!hasSession && !pathname.startsWith('/login') && !pathname.startsWith('/maestro/login')) {
      const loginUrl = new URL('/login', request.url)
      if (pathname !== '/' && pathname !== '/dashboard') {
        loginUrl.searchParams.set('callbackUrl', `${pathname}${url.search}`)
      }
      return NextResponse.redirect(loginUrl)
    }

    // If pathname doesn't start with /maestro, rewrite to /maestro/...
    if (!pathname.startsWith('/maestro')) {
      url.pathname = `/maestro${pathname}`
      return NextResponse.rewrite(url, { request: { headers: requestHeaders } })
    }

    return NextResponse.next({ request: { headers: requestHeaders } })
  }

  // HERO (INTERNAL) DOMAIN
  // If user opens /maestro/* on hero.chitraparatama.com in production, redirect to maestro domain
  if (pathname.startsWith('/maestro') && process.env.NODE_ENV === 'production') {
    const maestroUrl = new URL(request.url)
    maestroUrl.host = 'maestro.chitraparatama.com'
    maestroUrl.pathname = pathname.replace(/^\/maestro/, '') || '/'
    return NextResponse.redirect(maestroUrl)
  }

  return NextResponse.next({ request: { headers: requestHeaders } })
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|sw\\.js|manifest\\.webmanifest|robots\\.txt).*)',
  ],
}
